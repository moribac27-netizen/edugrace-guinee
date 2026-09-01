-- A1: monitrice responsable sur les compétences
ALTER TABLE public.nursery_competencies ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;

-- A2: suivi quotidien complet
ALTER TABLE public.nursery_daily_logs ADD COLUMN IF NOT EXISTS attendance text;
ALTER TABLE public.nursery_daily_logs ADD COLUMN IF NOT EXISTS hygiene text;

-- A3: emploi du temps maternelle par activités
CREATE TABLE IF NOT EXISTS public.nursery_schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  section_id uuid REFERENCES public.nursery_sections(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  day_of_week integer NOT NULL DEFAULT 1,
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '09:00',
  activity text NOT NULL DEFAULT 'accueil',
  label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nursery_schedule_slots TO authenticated;
GRANT ALL ON public.nursery_schedule_slots TO service_role;

ALTER TABLE public.nursery_schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nursery_slots_read" ON public.nursery_schedule_slots
  FOR SELECT TO authenticated USING (public.same_school(school_id));

CREATE POLICY "nursery_slots_write" ON public.nursery_schedule_slots
  FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'enseignant') OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'enseignant') OR public.is_super_admin(auth.uid())));

CREATE TRIGGER t_nursery_slots_u BEFORE UPDATE ON public.nursery_schedule_slots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- B3: blocage des écritures pour les écoles expirées (défense en profondeur)
CREATE OR REPLACE FUNCTION public.school_write_blocked(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN public.is_super_admin(auth.uid()) THEN false
    WHEN _school_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.school_subscriptions s
      WHERE s.school_id = _school_id AND s.status = 'expired'
    )
  END
$$;

REVOKE ALL ON FUNCTION public.school_write_blocked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.school_write_blocked(uuid) TO authenticated;

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students','grades','payments','classes','subjects','teachers','student_attendance',
    'teacher_attendance','schedule_slots','exams','expenses','revenues','payslips',
    'nursery_sections','nursery_children','nursery_daily_logs','nursery_competencies',
    'nursery_evaluations','nursery_schedule_slots'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "block_insert_when_expired" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.school_write_blocked(school_id))', t);
    EXECUTE format(
      'CREATE POLICY "block_update_when_expired" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.school_write_blocked(school_id))', t);
  END LOOP;
END
$do$;