GRANT SELECT ON public.subscription_plans TO anon;
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Public can view active plans"
ON public.subscription_plans
FOR SELECT
TO anon, authenticated
USING (is_active = true);