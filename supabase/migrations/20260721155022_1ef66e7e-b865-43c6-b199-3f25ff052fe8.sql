
-- Enum for subscription status
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('trial','active','past_due','canceled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========== subscription_plans ===========
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GNF',
  student_limit integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans visible to everyone"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Only super admin can insert plans"
  ON public.subscription_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super admin can update plans"
  ON public.subscription_plans FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super admin can delete plans"
  ON public.subscription_plans FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_subscription_plans_updated
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========== school_subscriptions ===========
CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trial',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  trial_ends_at timestamptz,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_payment_at timestamptz,
  last_payment_amount numeric,
  payment_provider text,
  external_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id)
);

CREATE INDEX IF NOT EXISTS idx_school_subs_school ON public.school_subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_school_subs_status ON public.school_subscriptions(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_subscriptions TO authenticated;
GRANT ALL ON public.school_subscriptions TO service_role;

ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own school subscription"
  ON public.school_subscriptions FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.same_school(school_id));

CREATE POLICY "Staff can insert own school subscription"
  ON public.school_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (public.same_school(school_id) AND public.is_staff(auth.uid()))
  );

CREATE POLICY "Staff can update own school subscription"
  ON public.school_subscriptions FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (public.same_school(school_id) AND public.is_staff(auth.uid()))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (public.same_school(school_id) AND public.is_staff(auth.uid()))
  );

CREATE POLICY "Only super admin can delete subscriptions"
  ON public.school_subscriptions FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_school_subscriptions_updated
  BEFORE UPDATE ON public.school_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========== Seed default plans ===========
INSERT INTO public.subscription_plans (code, name, description, price_monthly, price_yearly, currency, student_limit, features, is_popular, display_order)
VALUES
  ('basic','Basic','Idéal pour les petites écoles qui débutent leur digitalisation.',100000,1000000,'GNF',200,
    '["Jusqu''à 200 élèves","Gestion élèves & classes","Notes & bulletins","Support email"]'::jsonb,false,1),
  ('standard','Standard','La solution complète pour la majorité des établissements.',150000,1500000,'GNF',600,
    '["Jusqu''à 600 élèves","Tout Basic","Paiements & comptabilité","Espace parent","Support prioritaire"]'::jsonb,true,2),
  ('premium','Premium','Pour les grands établissements et réseaux multi-écoles.',200000,2000000,'GNF',NULL,
    '["Élèves illimités","Tout Standard","Rapports avancés","Multi-établissements","Support dédié"]'::jsonb,false,3)
ON CONFLICT (code) DO NOTHING;

-- =========== Trial trigger on schools ===========
CREATE OR REPLACE FUNCTION public.create_trial_subscription_for_school()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_id uuid;
BEGIN
  SELECT id INTO _plan_id FROM public.subscription_plans WHERE code = 'standard' LIMIT 1;
  IF _plan_id IS NULL THEN
    SELECT id INTO _plan_id FROM public.subscription_plans ORDER BY display_order LIMIT 1;
  END IF;
  IF _plan_id IS NOT NULL THEN
    INSERT INTO public.school_subscriptions (school_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
    VALUES (NEW.id, _plan_id, 'trial', now() + interval '30 days', now(), now() + interval '30 days')
    ON CONFLICT (school_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schools_create_trial ON public.schools;
CREATE TRIGGER trg_schools_create_trial
  AFTER INSERT ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.create_trial_subscription_for_school();

-- Backfill: any existing school without subscription gets a trial
INSERT INTO public.school_subscriptions (school_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
SELECT s.id,
       (SELECT id FROM public.subscription_plans WHERE code = 'standard' LIMIT 1),
       'trial',
       now() + interval '30 days',
       now(),
       now() + interval '30 days'
FROM public.schools s
LEFT JOIN public.school_subscriptions ss ON ss.school_id = s.id
WHERE ss.id IS NULL
  AND EXISTS (SELECT 1 FROM public.subscription_plans WHERE code = 'standard');
