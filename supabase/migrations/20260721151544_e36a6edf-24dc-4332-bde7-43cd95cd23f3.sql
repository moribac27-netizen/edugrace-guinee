
-- Add signature and stamp columns + settings fields to schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS director_signature_url text,
  ADD COLUMN IF NOT EXISTS school_stamp_url text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GNF',
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS director_name text,
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS period_system text NOT NULL DEFAULT 'trimester',
  ADD COLUMN IF NOT EXISTS theme_primary text,
  ADD COLUMN IF NOT EXISTS theme_secondary text,
  ADD COLUMN IF NOT EXISTS bulletin_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS receipt_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Allow school admins/directors to update their own school
DROP POLICY IF EXISTS "schools_admin_update_own" ON public.schools;
CREATE POLICY "schools_admin_update_own" ON public.schools
  FOR UPDATE TO authenticated
  USING (
    (id = public.current_school_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'directeur')))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    (id = public.current_school_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'directeur')))
    OR public.is_super_admin(auth.uid())
  );

-- Storage policies for school-assets bucket
-- Files are stored under "{school_id}/{kind}.{ext}"
DROP POLICY IF EXISTS "school_assets_read_own" ON storage.objects;
CREATE POLICY "school_assets_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND (
      public.is_super_admin(auth.uid())
      OR (split_part(name, '/', 1))::uuid = public.current_school_id()
    )
  );

DROP POLICY IF EXISTS "school_assets_admin_insert" ON storage.objects;
CREATE POLICY "school_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-assets'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (split_part(name, '/', 1))::uuid = public.current_school_id()
        AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'directeur'))
      )
    )
  );

DROP POLICY IF EXISTS "school_assets_admin_update" ON storage.objects;
CREATE POLICY "school_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (split_part(name, '/', 1))::uuid = public.current_school_id()
        AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'directeur'))
      )
    )
  );

DROP POLICY IF EXISTS "school_assets_admin_delete" ON storage.objects;
CREATE POLICY "school_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (split_part(name, '/', 1))::uuid = public.current_school_id()
        AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'directeur'))
      )
    )
  );
