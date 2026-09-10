-- 1) Colonnes additives sur le catalogue (aucune modification de Basic/Standard)
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS billing_model text NOT NULL DEFAULT 'fixed_monthly',
  ADD COLUMN IF NOT EXISTS price_per_student numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS school_share_per_student numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS access_threshold_students integer NOT NULL DEFAULT 0;

-- 2) Suivi des cotisations annuelles par élève
CREATE TABLE IF NOT EXISTS public.student_plan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  amount numeric NOT NULL DEFAULT 100000,
  school_share numeric NOT NULL DEFAULT 15000,
  status text NOT NULL DEFAULT 'paye',
  payment_mode text NOT NULL DEFAULT 'individuel',
  payment_method text,
  reference text,
  receipt_number text,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plan_payments TO authenticated;
GRANT ALL ON public.student_plan_payments TO service_role;

ALTER TABLE public.student_plan_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spp_select ON public.student_plan_payments;
CREATE POLICY spp_select ON public.student_plan_payments
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.same_school(school_id)
    OR public.is_parent_of_student(auth.uid(), student_id)
  );

DROP POLICY IF EXISTS spp_write ON public.student_plan_payments;
CREATE POLICY spp_write ON public.student_plan_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.is_finance(auth.uid())))
    OR public.is_parent_of_student(auth.uid(), student_id)
  );

DROP POLICY IF EXISTS spp_update ON public.student_plan_payments;
CREATE POLICY spp_update ON public.student_plan_payments
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.same_school(school_id) AND public.is_direction(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.same_school(school_id) AND public.is_direction(auth.uid())));

DROP POLICY IF EXISTS spp_delete ON public.student_plan_payments;
CREATE POLICY spp_delete ON public.student_plan_payments
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS spp_school_year_idx ON public.student_plan_payments (school_id, academic_year, status);
CREATE INDEX IF NOT EXISTS spp_student_idx ON public.student_plan_payments (student_id);

DROP TRIGGER IF EXISTS spp_touch ON public.student_plan_payments;
CREATE TRIGGER spp_touch BEFORE UPDATE ON public.student_plan_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Fonctions utilitaires
CREATE OR REPLACE FUNCTION public.school_academic_year(_school_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(s.academic_year, ''), to_char(now(), 'YYYY')) FROM public.schools s WHERE s.id = _school_id
$$;

CREATE OR REPLACE FUNCTION public.school_billing_model(_school_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(p.billing_model, 'fixed_monthly')
  FROM public.school_subscriptions ss
  LEFT JOIN public.subscription_plans p ON p.id = ss.plan_id
  WHERE ss.school_id = _school_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.school_paid_students_count(_school_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.student_plan_payments sp
  WHERE sp.school_id = _school_id
    AND sp.status = 'paye'
    AND sp.academic_year = public.school_academic_year(_school_id)
$$;

CREATE OR REPLACE FUNCTION public.school_per_student_threshold(_school_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(p.access_threshold_students, 20)
  FROM public.school_subscriptions ss
  LEFT JOIN public.subscription_plans p ON p.id = ss.plan_id
  WHERE ss.school_id = _school_id
  LIMIT 1
$$;

-- true quand les données pédagogiques de l'élève sont accessibles
CREATE OR REPLACE FUNCTION public.student_plan_paid(_student_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _school uuid;
BEGIN
  IF _student_id IS NULL THEN RETURN true; END IF;
  SELECT school_id INTO _school FROM public.students WHERE id = _student_id;
  IF _school IS NULL THEN RETURN true; END IF;
  IF public.school_billing_model(_school) <> 'per_student' THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.student_plan_payments sp
    WHERE sp.student_id = _student_id
      AND sp.status = 'paye'
      AND sp.academic_year = public.school_academic_year(_school)
  );
END;
$$;

-- 4) Blocage serveur des données pédagogiques des élèves non payés (plan par élève uniquement)
DROP POLICY IF EXISTS grades_require_student_payment ON public.grades;
CREATE POLICY grades_require_student_payment ON public.grades
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.student_plan_paid(student_id));

DROP POLICY IF EXISTS attendance_require_student_payment ON public.student_attendance;
CREATE POLICY attendance_require_student_payment ON public.student_attendance
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.student_plan_paid(student_id));

DROP POLICY IF EXISTS nursery_logs_require_student_payment ON public.nursery_daily_logs;
CREATE POLICY nursery_logs_require_student_payment ON public.nursery_daily_logs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.student_plan_paid(student_id));

DROP POLICY IF EXISTS nursery_eval_require_student_payment ON public.nursery_evaluations
;
CREATE POLICY nursery_eval_require_student_payment ON public.nursery_evaluations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.student_plan_paid(student_id));
