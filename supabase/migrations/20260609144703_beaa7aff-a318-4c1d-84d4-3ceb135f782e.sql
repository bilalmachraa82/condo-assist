
CREATE OR REPLACE FUNCTION public.mask_magic_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_code IS NULL OR length(p_code) = 0 THEN NULL
    WHEN length(p_code) <= 3 THEN repeat('*', length(p_code))
    ELSE substr(p_code, 1, 3) || '***'
  END;
$$;

CREATE OR REPLACE FUNCTION public.log_supplier_access(p_supplier_id uuid, p_magic_code text, p_action text, p_success boolean DEFAULT true, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.supplier_access_log (
    supplier_id,
    magic_code,
    action,
    success,
    metadata
  ) VALUES (
    p_supplier_id,
    public.mask_magic_code(p_magic_code),
    p_action,
    p_success,
    p_metadata
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_magic_code_secure(p_magic_code text, p_ip_address inet DEFAULT '0.0.0.0'::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rate_check jsonb;
  v_validation_result jsonb;
BEGIN
  v_rate_check := check_magic_code_rate_limit(p_ip_address, p_magic_code);

  IF NOT (v_rate_check->>'allowed')::boolean THEN
    INSERT INTO magic_code_attempts (magic_code, ip_address, success)
    VALUES (public.mask_magic_code(p_magic_code), p_ip_address, false);

    RETURN jsonb_build_object(
      'valid', false,
      'error', v_rate_check->>'reason',
      'retry_after', v_rate_check->'retry_after'
    );
  END IF;

  v_validation_result := validate_supplier_session_readonly(p_magic_code);

  INSERT INTO magic_code_attempts (magic_code, ip_address, success)
  VALUES (public.mask_magic_code(p_magic_code), p_ip_address, (v_validation_result->>'valid')::boolean);

  RETURN v_validation_result;
END;
$function$;

-- Mask any historical cleartext magic codes in logs (keep first 3 chars + ***)
UPDATE public.supplier_access_log
SET magic_code = public.mask_magic_code(magic_code)
WHERE magic_code IS NOT NULL AND magic_code NOT LIKE '%***';

UPDATE public.magic_code_attempts
SET magic_code = public.mask_magic_code(magic_code)
WHERE magic_code IS NOT NULL AND magic_code NOT LIKE '%***';
