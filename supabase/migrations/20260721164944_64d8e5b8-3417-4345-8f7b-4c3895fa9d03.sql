
-- 1. Extend payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'validé',
  ADD COLUMN IF NOT EXISTS transaction_reference text,
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Backfill existing rows as validated
UPDATE public.payments SET validation_status = 'validé', validated_at = COALESCE(validated_at, paid_at) WHERE validation_status IS NULL OR validation_status = '';

-- 2. Per-school receipt counter
CREATE TABLE IF NOT EXISTS public.receipt_counters (
  school_id uuid NOT NULL,
  year int NOT NULL,
  last_seq int NOT NULL DEFAULT 0,
  PRIMARY KEY (school_id, year)
);
GRANT SELECT, INSERT, UPDATE ON public.receipt_counters TO authenticated;
GRANT ALL ON public.receipt_counters TO service_role;
ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc_finance" ON public.receipt_counters FOR ALL TO authenticated
  USING (is_finance(auth.uid()) AND school_id = current_school_id())
  WITH CHECK (is_finance(auth.uid()) AND school_id = current_school_id());

CREATE OR REPLACE FUNCTION public.next_receipt_number(_school_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year int := EXTRACT(YEAR FROM now());
  _seq int;
BEGIN
  INSERT INTO public.receipt_counters (school_id, year, last_seq)
  VALUES (_school_id, _year, 1)
  ON CONFLICT (school_id, year) DO UPDATE SET last_seq = receipt_counters.last_seq + 1
  RETURNING last_seq INTO _seq;
  RETURN 'REC-' || _year || '-' || LPAD(_seq::text, 6, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.next_receipt_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_receipt_number(uuid) TO authenticated;

-- 3. Public receipt verification (limited fields, no auth needed)
CREATE OR REPLACE FUNCTION public.verify_receipt(_receipt_number text)
RETURNS TABLE (
  receipt_number text,
  amount numeric,
  payment_type text,
  period text,
  payment_method text,
  paid_at timestamptz,
  validation_status text,
  student_name text,
  class_name text,
  school_name text,
  school_address text,
  school_logo_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.receipt_number,
    p.amount,
    p.payment_type,
    p.period,
    p.payment_method,
    p.paid_at,
    p.validation_status,
    st.full_name,
    c.name,
    s.name,
    s.address,
    s.logo_url
  FROM public.payments p
  LEFT JOIN public.students st ON st.id = p.student_id
  LEFT JOIN public.classes c ON c.id = st.class_id
  LEFT JOIN public.schools s ON s.id = p.school_id
  WHERE p.receipt_number = _receipt_number
    AND p.validation_status = 'validé'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_receipt(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_receipt(text) TO anon, authenticated;
