CREATE OR REPLACE FUNCTION public.is_direction(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','directeur','directeur_etudes','proviseur')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_direction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_direction(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "La direction gère les événements de son école (insert)" ON public.school_events;
DROP POLICY IF EXISTS "La direction gère les événements de son école (update)" ON public.school_events;
DROP POLICY IF EXISTS "La direction gère les événements de son école (delete)" ON public.school_events;

CREATE POLICY "La direction gère les événements de son école (insert)"
  ON public.school_events FOR INSERT TO authenticated
  WITH CHECK (public.same_school(school_id) AND (public.is_super_admin(auth.uid()) OR public.is_direction(auth.uid())));

CREATE POLICY "La direction gère les événements de son école (update)"
  ON public.school_events FOR UPDATE TO authenticated
  USING (public.same_school(school_id) AND (public.is_super_admin(auth.uid()) OR public.is_direction(auth.uid())))
  WITH CHECK (public.same_school(school_id));

CREATE POLICY "La direction gère les événements de son école (delete)"
  ON public.school_events FOR DELETE TO authenticated
  USING (public.same_school(school_id) AND (public.is_super_admin(auth.uid()) OR public.is_direction(auth.uid())));

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','directeur','directeur_etudes','proviseur'))
$$;