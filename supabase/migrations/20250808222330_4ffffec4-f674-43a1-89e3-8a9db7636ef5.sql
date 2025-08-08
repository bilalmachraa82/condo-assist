-- Fix function signature ordering for create_quotation_via_code
CREATE OR REPLACE FUNCTION public.create_quotation_via_code(
  p_magic_code text,
  p_amount numeric,
  p_description text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_validity_days integer DEFAULT 30,
  p_assistance_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_record RECORD;
  target_assistance_id uuid;
  new_row public.quotations%rowtype;
BEGIN
  -- Get magic code (allow 24h grace like other RPCs)
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_magic_code');
  END IF;

  IF code_record.expires_at <= now() THEN
    IF code_record.expires_at > (now() - interval '24 hours') THEN
      UPDATE public.supplier_magic_codes SET expires_at = now() + interval '24 hours' WHERE id = code_record.id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'expired_magic_code');
    END IF;
  END IF;

  target_assistance_id := COALESCE(p_assistance_id, code_record.assistance_id);

  -- Ensure assistance belongs to supplier (assigned or linked)
  IF NOT EXISTS (
    SELECT 1 FROM public.assistances a
    WHERE a.id = target_assistance_id
      AND (a.assigned_supplier_id = code_record.supplier_id OR a.id = code_record.assistance_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;

  -- Insert quotation (status default 'pending')
  INSERT INTO public.quotations (
    assistance_id, supplier_id, amount, description, notes, validity_days, submitted_at
  ) VALUES (
    target_assistance_id, code_record.supplier_id, p_amount, p_description, p_notes, COALESCE(p_validity_days, 30), now()
  ) RETURNING * INTO new_row;

  -- Activity log
  INSERT INTO public.activity_log (assistance_id, supplier_id, action, details, metadata)
  VALUES (
    target_assistance_id,
    code_record.supplier_id,
    'quotation_submitted',
    'Orçamento submetido pelo fornecedor',
    jsonb_build_object('amount', p_amount, 'validity_days', p_validity_days)
  );

  RETURN jsonb_build_object('success', true, 'quotation', to_jsonb(new_row));
END;
$$;