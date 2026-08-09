CREATE TABLE public.subscription_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GNF',
  provider text NOT NULL DEFAULT 'orange_money',
  payer_phone text,
  payer_name text,
  transaction_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','rejected')),
  rejection_reason text,
  requested_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_spr_school ON public.subscription_payment_requests(school_id);
CREATE INDEX idx_spr_status ON public.subscription_payment_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.subscription_payment_requests TO authenticated;
GRANT ALL ON public.subscription_payment_requests TO service_role;

ALTER TABLE public.subscription_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff view their requests"
ON public.subscription_payment_requests FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (public.same_school(school_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'directeur') OR public.has_role(auth.uid(),'comptable')))
);

CREATE POLICY "School staff create requests"
ON public.subscription_payment_requests FOR INSERT TO authenticated
WITH CHECK (
  public.same_school(school_id)
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'directeur') OR public.has_role(auth.uid(),'comptable'))
  AND requested_by = auth.uid()
  AND status = 'pending'
);

CREATE POLICY "Super admins manage requests"
ON public.subscription_payment_requests FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_spr_updated
BEFORE UPDATE ON public.subscription_payment_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.review_subscription_payment_request(
  p_request_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL
)
RETURNS public.subscription_payment_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.subscription_payment_requests;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : Super Admin uniquement';
  END IF;

  SELECT * INTO v_req FROM public.subscription_payment_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Cette demande a déjà été traitée';
  END IF;

  IF p_approve THEN
    PERFORM public.renew_or_change_subscription(v_req.school_id, v_req.plan_id, v_req.billing_cycle);
    UPDATE public.subscription_payment_requests
       SET status = 'validated', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
     WHERE id = p_request_id
    RETURNING * INTO v_req;
  ELSE
    UPDATE public.subscription_payment_requests
       SET status = 'rejected', rejection_reason = p_reason,
           reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
     WHERE id = p_request_id
    RETURNING * INTO v_req;
  END IF;

  RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public.review_subscription_payment_request(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_subscription_payment_request(uuid, boolean, text) TO authenticated;