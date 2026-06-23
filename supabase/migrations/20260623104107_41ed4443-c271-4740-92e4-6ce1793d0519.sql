
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'directeur', 'enseignant', 'parent', 'eleve');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profils visibles par tous les authentifiés" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modifier son propre profil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Créer son propre profil" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Voir son propre rôle" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','directeur'))
$$;

-- Allow staff to view all roles
CREATE POLICY "Staff voit tous les rôles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff gère les rôles" ON public.user_roles FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Trigger pour créer profil & rôle élève par défaut à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'phone'
  );
  -- Par défaut chaque nouvel utilisateur reçoit le rôle 'parent' ; un admin pourra changer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'parent'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT NOT NULL, -- Primaire, Collège, Lycée, Formation
  annual_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  teacher_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Classes lecture authentifiés" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff gère classes" ON public.classes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER classes_touch BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coefficient NUMERIC(4,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subjects lecture" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff gère matières" ON public.subjects FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Teachers
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  matricule TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  subjects TEXT[] DEFAULT '{}',
  monthly_salary NUMERIC(12,2) DEFAULT 0,
  hire_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers lecture" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff gère enseignants" ON public.teachers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER teachers_touch BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M','F')),
  birth_date DATE,
  birth_place TEXT,
  address TEXT,
  photo_url TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_name TEXT,
  parent_phone TEXT,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'actif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff voit tous les élèves" ON public.students FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'enseignant') OR auth.uid() = parent_user_id);
CREATE POLICY "Staff gère élèves" ON public.students FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER students_touch BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Grades
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- T1, T2, T3
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 20),
  max_score NUMERIC(5,2) NOT NULL DEFAULT 20,
  evaluation_type TEXT DEFAULT 'composition',
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notes visibles par staff/enseignants/parent" ON public.grades FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid())
  OR public.has_role(auth.uid(),'enseignant')
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.parent_user_id = auth.uid())
);
CREATE POLICY "Staff/enseignant saisit notes" ON public.grades FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'enseignant'));
CREATE POLICY "Staff/enseignant modifie notes" ON public.grades FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'enseignant'));
CREATE POLICY "Staff supprime notes" ON public.grades FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_type TEXT NOT NULL, -- inscription, scolarite, autre
  period TEXT, -- ex 'Octobre 2025'
  payment_method TEXT DEFAULT 'espèces',
  receipt_number TEXT UNIQUE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'payé',
  recorded_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Paiements visibles" ON public.payments FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.parent_user_id = auth.uid())
);
CREATE POLICY "Staff gère paiements" ON public.payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all', -- all, parents, enseignants, eleves
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Annonces visibles authentifiés" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff publie annonces" ON public.announcements FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Seed: matières & classes de base
INSERT INTO public.subjects (name, coefficient) VALUES
  ('Français', 4), ('Mathématiques', 4), ('Anglais', 3), ('Histoire-Géographie', 2),
  ('Sciences Physiques', 3), ('Sciences Naturelles', 2), ('EPS', 1), ('Éducation Civique', 1);

INSERT INTO public.classes (name, level, annual_fee) VALUES
  ('CP1', 'Primaire', 1500000),
  ('CP2', 'Primaire', 1500000),
  ('CE1', 'Primaire', 1500000),
  ('CE2', 'Primaire', 1500000),
  ('CM1', 'Primaire', 1800000),
  ('CM2', 'Primaire', 1800000),
  ('7e', 'Collège', 2200000),
  ('6e', 'Collège', 2200000),
  ('5e', 'Collège', 2400000),
  ('4e', 'Collège', 2400000),
  ('3e', 'Collège', 2600000),
  ('2nde', 'Lycée', 3000000),
  ('1ère', 'Lycée', 3200000),
  ('Tle', 'Lycée', 3500000);
