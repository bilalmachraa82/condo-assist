-- Create a simplified validation function without security logging for supplier portal access
CREATE OR REPLACE FUNCTION public.validate_supplier_session_simple(p_magic_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code_record RECORD;
  supplier_record RECORD;
  assistance_record RECORD;
  is_recently_expired BOOLEAN := false;
  is_active_assistance BOOLEAN := false;
  valid_days INTEGER := public.magic_code_valid_days();
BEGIN
  -- Find the magic code
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid magic code');
  END IF;

  -- Check if assistance is still active
  IF code_record.assistance_id IS NOT NULL THEN
    SELECT a.* INTO assistance_record FROM public.assistances a WHERE a.id = code_record.assistance_id;
    IF FOUND AND assistance_record.status NOT IN ('completed','cancelled') THEN
      is_active_assistance := true;
    END IF;
  END IF;

  -- Handle expiry logic
  IF code_record.expires_at <= now() THEN
    IF is_active_assistance THEN
      -- Auto-renew for active assistances
      UPDATE public.supplier_magic_codes
      SET expires_at = now() + (valid_days || ' days')::interval
      WHERE id = code_record.id;
    ELSE
      -- Grace period for recently expired codes
      IF code_record.expires_at > (now() - interval '24 hours') THEN
        is_recently_expired := true;
        UPDATE public.supplier_magic_codes
        SET expires_at = now() + interval '24 hours'
        WHERE id = code_record.id;
      ELSE
        RETURN jsonb_build_object('valid', false, 'error', 'Magic code has expired');
      END IF;
    END IF;
  END IF;

  -- Get supplier info (must be active)
  SELECT * INTO supplier_record
  FROM public.suppliers
  WHERE id = code_record.supplier_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Supplier not found or inactive');
  END IF;

  -- Update last used and access count
  UPDATE public.supplier_magic_codes
  SET last_used_at = now(), access_count = COALESCE(access_count, 0) + 1
  WHERE id = code_record.id;

  RETURN jsonb_build_object(
    'valid', true,
    'recently_expired_extended', is_recently_expired,
    'supplier', jsonb_build_object(
      'id', supplier_record.id,
      'name', supplier_record.name,
      'email', supplier_record.email,
      'phone', supplier_record.phone,
      'address', supplier_record.address,
      'specialization', supplier_record.specialization
    ),
    'assistance_id', code_record.assistance_id,
    'last_used_at', code_record.last_used_at,
    'access_count', COALESCE(code_record.access_count, 0) + 1
  );
END;
$function$;