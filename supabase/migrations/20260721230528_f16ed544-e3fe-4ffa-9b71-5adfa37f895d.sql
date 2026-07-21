
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS receipt_title text DEFAULT 'REÇU DE PAIEMENT',
  ADD COLUMN IF NOT EXISTS receipt_header text,
  ADD COLUMN IF NOT EXISTS receipt_legal_notice text,
  ADD COLUMN IF NOT EXISTS receipt_footer_note text,
  ADD COLUMN IF NOT EXISTS receipt_prefix text DEFAULT 'REC',
  ADD COLUMN IF NOT EXISTS receipt_accent_color text DEFAULT '#2a5a3e';

CREATE OR REPLACE FUNCTION public.next_receipt_number(_school_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _year int := EXTRACT(YEAR FROM now());
  _seq int;
  _prefix text;
BEGIN
  SELECT COALESCE(NULLIF(receipt_prefix, ''), 'REC') INTO _prefix FROM public.schools WHERE id = _school_id;
  INSERT INTO public.receipt_counters (school_id, year, last_seq)
  VALUES (_school_id, _year, 1)
  ON CONFLICT (school_id, year) DO UPDATE SET last_seq = receipt_counters.last_seq + 1
  RETURNING last_seq INTO _seq;
  RETURN COALESCE(_prefix,'REC') || '-' || _year || '-' || LPAD(_seq::text, 6, '0');
END;
$function$;
