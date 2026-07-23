
-- 1. student_parents m2m
CREATE TABLE IF NOT EXISTS public.student_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relation text NOT NULL DEFAULT 'parent',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, parent_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_parents TO authenticated;
GRANT ALL ON public.student_parents TO service_role;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

-- Helper fn
CREATE OR REPLACE FUNCTION public.is_parent_of_student(_uid uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_parents
    WHERE parent_user_id = _uid AND student_id = _student_id
  ) OR EXISTS (
    SELECT 1 FROM public.students
    WHERE id = _student_id AND parent_user_id = _uid
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_parent_of_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parent_of_student(uuid, uuid) TO authenticated;

-- Policies for student_parents
CREATE POLICY sp_parent_read ON public.student_parents FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());
CREATE POLICY sp_staff_manage ON public.student_parents FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_staff(auth.uid()) AND school_id = current_school_id()))
  WITH CHECK (is_super_admin(auth.uid()) OR (is_staff(auth.uid()) AND school_id = current_school_id()));

-- Backfill from students.parent_user_id
INSERT INTO public.student_parents (school_id, student_id, parent_user_id, is_primary)
SELECT school_id, id, parent_user_id, true
FROM public.students
WHERE parent_user_id IS NOT NULL
ON CONFLICT (student_id, parent_user_id) DO NOTHING;

-- Extend existing SELECT policies via new function (add companion policies)
CREATE POLICY students_parent_multi_read ON public.students FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), id));

CREATE POLICY grades_parent_multi_read ON public.grades FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE POLICY pay_parent_multi_read ON public.payments FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE POLICY sa_parent_multi_read ON public.student_attendance FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));
