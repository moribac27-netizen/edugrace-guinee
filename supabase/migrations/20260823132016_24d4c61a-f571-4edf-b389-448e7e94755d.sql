ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_etudes';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'proviseur';

CREATE TABLE IF NOT EXISTS public.school_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'autre',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text,
  image_url text,
  contact text,
  published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_events_starts_at_idx ON public.school_events (starts_at DESC);
CREATE INDEX IF NOT EXISTS school_events_school_idx ON public.school_events (school_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_events TO authenticated;
GRANT ALL ON public.school_events TO service_role;

ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Événements publiés visibles par tous les comptes"
  ON public.school_events FOR SELECT TO authenticated
  USING (published = true OR public.same_school(school_id));

CREATE POLICY "La direction gère les événements de son école (insert)"
  ON public.school_events FOR INSERT TO authenticated
  WITH CHECK (
    public.same_school(school_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'directeur')
    )
  );

CREATE POLICY "La direction gère les événements de son école (update)"
  ON public.school_events FOR UPDATE TO authenticated
  USING (
    public.same_school(school_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'directeur')
    )
  )
  WITH CHECK (public.same_school(school_id));

CREATE POLICY "La direction gère les événements de son école (delete)"
  ON public.school_events FOR DELETE TO authenticated
  USING (
    public.same_school(school_id)
    AND (
      public.is_super_admin(auth.uid())
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'directeur')
    )
  );

CREATE TRIGGER t_school_events_u BEFORE UPDATE ON public.school_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();