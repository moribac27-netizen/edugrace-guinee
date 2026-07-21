DROP POLICY IF EXISTS "Plans visible to everyone" ON public.subscription_plans;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO anon, authenticated;