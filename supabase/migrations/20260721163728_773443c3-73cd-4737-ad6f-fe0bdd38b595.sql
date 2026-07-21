
-- Trigger function; only invoked by the trigger system, never by clients
REVOKE EXECUTE ON FUNCTION public.create_trial_subscription_for_school() FROM PUBLIC, anon, authenticated;

-- is_super_admin no longer needs anon access (public plans policy uses is_active)
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;

-- handle_new_user is a trigger; ensure locked down
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
