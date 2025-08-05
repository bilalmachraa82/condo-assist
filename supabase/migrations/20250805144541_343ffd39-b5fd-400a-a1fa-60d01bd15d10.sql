-- Extend magic code validation to allow 24h grace period for recently expired codes
-- and improve the validation function to be more robust

-- Update the validate_supplier_session function to handle recently expired codes better
CREATE OR REPLACE FUNCTION public.validate_supplier_session(p_magic_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  code_record RECORD;
  supplier_record RECORD;
  is_recently_expired BOOLEAN := false;
BEGIN
  -- Check if magic code exists
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid magic code');
  END IF;
  
  -- Check if code is expired
  IF code_record.expires_at <= now() THEN
    -- Allow grace period of 24 hours for recently expired codes
    IF code_record.expires_at > (now() - interval '24 hours') THEN
      is_recently_expired := true;
      -- Extend the expiration by 24 hours for grace period usage
      UPDATE public.supplier_magic_codes
      SET expires_at = now() + interval '24 hours'
      WHERE magic_code = p_magic_code;
    ELSE
      RETURN jsonb_build_object('valid', false, 'error', 'Magic code has expired');
    END IF;
  END IF;
  
  -- Get supplier information
  SELECT * INTO supplier_record
  FROM public.suppliers
  WHERE id = code_record.supplier_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Supplier not found or inactive');
  END IF;
  
  -- Update last used timestamp and access count
  UPDATE public.supplier_magic_codes
  SET 
    last_used_at = now(),
    access_count = COALESCE(access_count, 0) + 1
  WHERE magic_code = p_magic_code;
  
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
$function$