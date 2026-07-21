
CREATE TABLE public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL DEFAULT public.current_school_id() REFERENCES public.schools(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'manual',
  scope text NOT NULL DEFAULT 'full',
  status text NOT NULL DEFAULT 'success',
  tables text[] NOT NULL DEFAULT '{}',
  row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_rows integer NOT NULL DEFAULT 0,
  size_bytes bigint NOT NULL DEFAULT 0,
  storage_path text,
  error_message text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_backups_school_created ON public.backups(school_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backups TO authenticated;
GRANT ALL ON public.backups TO service_role;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all backups"
ON public.backups FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.backup_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL DEFAULT public.current_school_id() REFERENCES public.schools(id) ON DELETE CASCADE,
  frequency text NOT NULL DEFAULT 'daily',
  hour_of_day integer NOT NULL DEFAULT 2,
  day_of_week integer,
  day_of_month integer,
  retention_days integer NOT NULL DEFAULT 30,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);
CREATE TRIGGER trg_backup_schedules_updated
BEFORE UPDATE ON public.backup_schedules
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_schedules TO authenticated;
GRANT ALL ON public.backup_schedules TO service_role;
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage backup schedules"
ON public.backup_schedules FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins read backup files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'school-backups' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins write backup files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'school-backups' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins update backup files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'school-backups' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins delete backup files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'school-backups' AND public.is_super_admin(auth.uid()));
