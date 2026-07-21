
-- 1) Nouveaux champs sur schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending')),
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_schools_status ON public.schools(status);
CREATE INDEX IF NOT EXISTS idx_schools_city ON public.schools(city);

-- 2) Politiques super admin sur schools (UPDATE + DELETE)
DROP POLICY IF EXISTS "super_admin_manage_schools" ON public.schools;
CREATE POLICY "super_admin_manage_schools"
  ON public.schools
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 3) Suspension auto des abonnements expirés
CREATE OR REPLACE FUNCTION public.auto_suspend_expired_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH updated AS (
    UPDATE public.school_subscriptions
       SET status = 'expired', updated_at = now()
     WHERE status IN ('active','trial','past_due')
       AND current_period_end < now()
    RETURNING school_id
  )
  UPDATE public.schools s
     SET status = 'suspended', updated_at = now()
    FROM updated u
   WHERE s.id = u.school_id;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_suspend_expired_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_suspend_expired_subscriptions() TO authenticated;

-- 4) Vue stockage par école (via storage.objects)
CREATE OR REPLACE FUNCTION public.school_storage_usage()
RETURNS TABLE(school_id uuid, bytes bigint, files bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT
    (split_part(name, '/', 1))::uuid AS school_id,
    COALESCE(SUM((metadata->>'size')::bigint), 0) AS bytes,
    COUNT(*)::bigint AS files
  FROM storage.objects
  WHERE bucket_id IN ('school-assets','school-backups')
    AND split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$'
    AND public.is_super_admin(auth.uid())
  GROUP BY 1;
$$;

REVOKE ALL ON FUNCTION public.school_storage_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.school_storage_usage() TO authenticated;
