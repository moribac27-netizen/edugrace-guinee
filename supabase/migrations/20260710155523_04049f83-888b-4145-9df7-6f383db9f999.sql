
-- =========================================================================
-- 1. TABLE schools
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  address text,
  phone text,
  email text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_schools_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- École par défaut pour rétro-compatibilité
INSERT INTO public.schools (id, name, code)
VALUES ('00000000-0000-0000-0000-000000000001', 'École Principale', 'MAIN')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 2. TABLE super_admins (on ne peut pas ALTER TYPE enum dans la même txn)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Marie Curie devient super_admin
INSERT INTO public.super_admins (user_id)
VALUES ('e638b94d-6024-4cd9-acda-687f6299060f')
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================================
-- 3. Ajout de school_id sur toutes les tables + backfill
-- =========================================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles','students','teachers','classes','subjects','rooms',
    'schedule_slots','exams','grades','student_attendance','teacher_attendance',
    'announcements','financial_accounts','revenues','expenses','payments',
    'payslips','employee_contracts','employee_leaves',
    'library_books','library_categories','library_loans'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE RESTRICT',
      t
    );
    EXECUTE format(
      'UPDATE public.%I SET school_id = ''00000000-0000-0000-0000-000000000001'' WHERE school_id IS NULL',
      t
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN school_id SET NOT NULL',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I(school_id)',
      t, t
    );
  END LOOP;
END $$;

-- Ajout d'un lien user_id sur students pour l'accès élève
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- =========================================================================
-- 4. TABLE teacher_class_assignments
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_class_assignments TO authenticated;
GRANT ALL ON public.teacher_class_assignments TO service_role;
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tca_teacher ON public.teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tca_class ON public.teacher_class_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_tca_school ON public.teacher_class_assignments(school_id);
CREATE TRIGGER trg_tca_updated_at BEFORE UPDATE ON public.teacher_class_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================================
-- 5. Fonctions d'aide (SECURITY DEFINER)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.same_school(_school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(auth.uid())
      OR _school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.teacher_teaches_class(_uid uuid, _class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_class_assignments tca
    JOIN public.teachers t ON t.id = tca.teacher_id
    WHERE t.user_id = _uid AND tca.class_id = _class_id
  )
$$;

CREATE OR REPLACE FUNCTION public.teacher_teaches_student(_uid uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.teacher_class_assignments tca ON tca.class_id = s.class_id
    JOIN public.teachers t ON t.id = tca.teacher_id
    WHERE t.user_id = _uid AND s.id = _student_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.same_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_teaches_class(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_teaches_student(uuid, uuid) TO authenticated;

-- =========================================================================
-- 6. Mise à jour de handle_new_user pour prendre en compte school_id
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _school_id uuid;
BEGIN
  _school_id := COALESCE(
    (NEW.raw_user_meta_data->>'school_id')::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid
  );
  INSERT INTO public.profiles (id, full_name, phone, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    _school_id
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'parent'));
  RETURN NEW;
END;
$$;

-- =========================================================================
-- 7. SUPPRESSION de toutes les policies existantes sur les tables concernées
-- =========================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'schools','super_admins','profiles','students','teachers',
        'classes','subjects','rooms','schedule_slots','exams','grades',
        'student_attendance','teacher_attendance','announcements',
        'financial_accounts','revenues','expenses','payments','payslips',
        'employee_contracts','employee_leaves',
        'library_books','library_categories','library_loans',
        'teacher_class_assignments'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- =========================================================================
-- 8. Nouvelles POLICIES
-- =========================================================================

-- ---------- schools ----------
CREATE POLICY "schools_super_admin_all" ON public.schools FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "schools_read_own" ON public.schools FOR SELECT TO authenticated
  USING (id = public.current_school_id() OR public.is_super_admin(auth.uid()));

-- ---------- super_admins ----------
CREATE POLICY "super_admins_self_read" ON public.super_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "super_admins_manage" ON public.super_admins FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- ---------- profiles ----------
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "profiles_staff_manage" ON public.profiles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

-- ---------- students ----------
CREATE POLICY "students_staff_manage" ON public.students FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "students_teacher_read" ON public.students FOR SELECT TO authenticated
  USING (public.teacher_teaches_student(auth.uid(), id));
CREATE POLICY "students_parent_read" ON public.students FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());
CREATE POLICY "students_self_read" ON public.students FOR SELECT TO authenticated
  USING (student_user_id = auth.uid());

-- ---------- teachers ----------
CREATE POLICY "teachers_staff_manage" ON public.teachers FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "teachers_self_read" ON public.teachers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------- classes ----------
CREATE POLICY "classes_same_school_read" ON public.classes FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "classes_staff_write" ON public.classes FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

-- ---------- subjects ----------
CREATE POLICY "subjects_same_school_read" ON public.subjects FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "subjects_staff_write" ON public.subjects FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

-- ---------- rooms ----------
CREATE POLICY "rooms_same_school_read" ON public.rooms FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "rooms_staff_write" ON public.rooms FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

-- ---------- schedule_slots ----------
CREATE POLICY "schedule_same_school_read" ON public.schedule_slots FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "schedule_staff_write" ON public.schedule_slots FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

-- ---------- exams ----------
CREATE POLICY "exams_same_school_read" ON public.exams FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "exams_staff_write" ON public.exams FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

-- ---------- grades ----------
CREATE POLICY "grades_staff_manage" ON public.grades FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "grades_teacher_manage" ON public.grades FOR ALL TO authenticated
  USING (public.teacher_teaches_student(auth.uid(), student_id))
  WITH CHECK (public.teacher_teaches_student(auth.uid(), student_id)
              AND school_id = public.current_school_id());
CREATE POLICY "grades_parent_read" ON public.grades FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = grades.student_id AND s.parent_user_id = auth.uid()));
CREATE POLICY "grades_self_read" ON public.grades FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = grades.student_id AND s.student_user_id = auth.uid()));

-- ---------- student_attendance ----------
CREATE POLICY "sa_staff_manage" ON public.student_attendance FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "sa_teacher_manage" ON public.student_attendance FOR ALL TO authenticated
  USING (public.teacher_teaches_class(auth.uid(), class_id))
  WITH CHECK (public.teacher_teaches_class(auth.uid(), class_id)
              AND school_id = public.current_school_id());
CREATE POLICY "sa_parent_read" ON public.student_attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_attendance.student_id AND s.parent_user_id = auth.uid()));
CREATE POLICY "sa_self_read" ON public.student_attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_attendance.student_id AND s.student_user_id = auth.uid()));

-- ---------- teacher_attendance ----------
CREATE POLICY "ta_staff_manage" ON public.teacher_attendance FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "ta_self_read" ON public.teacher_attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_attendance.teacher_id AND t.user_id = auth.uid()));

-- ---------- announcements ----------
CREATE POLICY "annonces_same_school_read" ON public.announcements FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "annonces_staff_write" ON public.announcements FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

-- ---------- financial_accounts / revenues / expenses ----------
CREATE POLICY "fa_finance" ON public.financial_accounts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()));

CREATE POLICY "rev_finance" ON public.revenues FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()));

CREATE POLICY "exp_finance" ON public.expenses FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()));

-- ---------- payments ----------
CREATE POLICY "pay_finance" ON public.payments FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "pay_parent_read" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = payments.student_id AND s.parent_user_id = auth.uid()));

-- ---------- payslips ----------
CREATE POLICY "payslips_finance" ON public.payslips FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "payslips_self_read" ON public.payslips FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employee_contracts c
    JOIN public.teachers t ON t.id = c.teacher_id
    WHERE c.id = payslips.contract_id AND t.user_id = auth.uid()
  ));

-- ---------- employee_contracts ----------
CREATE POLICY "ec_finance" ON public.employee_contracts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "ec_self_read" ON public.employee_contracts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = employee_contracts.teacher_id AND t.user_id = auth.uid()));

-- ---------- employee_leaves ----------
CREATE POLICY "el_finance" ON public.employee_leaves FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_finance(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "el_self_read" ON public.employee_leaves FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employee_contracts c
    JOIN public.teachers t ON t.id = c.teacher_id
    WHERE c.id = employee_leaves.contract_id AND t.user_id = auth.uid()
  ));

-- ---------- library_categories / library_books / library_loans ----------
CREATE POLICY "libcat_same_school_read" ON public.library_categories FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "libcat_staff_write" ON public.library_categories FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

CREATE POLICY "libbook_same_school_read" ON public.library_books FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "libbook_staff_write" ON public.library_books FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

CREATE POLICY "libloan_staff_manage" ON public.library_loans FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));

-- ---------- teacher_class_assignments ----------
CREATE POLICY "tca_staff_manage" ON public.teacher_class_assignments FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid())
      OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()));
CREATE POLICY "tca_teacher_read" ON public.teacher_class_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_class_assignments.teacher_id AND t.user_id = auth.uid()));
