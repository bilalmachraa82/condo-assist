
-- Phase 1: Safe Privacy Fixes (No Breaking Changes)
-- These changes only restrict access that shouldn't have been available anyway

-- 1. Fix profiles table - Users should only see their own profile
-- This is safe because the UI already only shows user's own profile
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
USING (user_id = auth.uid());

-- Keep the existing update policy as it's already correct
-- CREATE POLICY "Users can update their own profile" already exists

-- 2. Secure app_settings table - Only admins should see configuration
-- This is safe because regular users don't need access to system settings
DROP POLICY IF EXISTS "Authenticated users can view app settings" ON public.app_settings;

CREATE POLICY "Admins can view app settings" ON public.app_settings
FOR SELECT 
USING (is_admin(auth.uid()));

-- 3. Add audit logging function for sensitive operations
-- This doesn't change any existing functionality, just adds monitoring
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_details text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_log (
    user_id,
    action,
    details,
    metadata
  ) VALUES (
    auth.uid(),
    'security_event',
    p_details,
    jsonb_build_object(
      'event_type', p_event_type,
      'timestamp', now(),
      'user_id', auth.uid()
    ) || COALESCE(p_metadata, '{}'::jsonb)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail operations if logging fails
    NULL;
END;
$$;

-- 4. Improve magic code validation with better security
-- This enhances existing functionality without breaking it
CREATE OR REPLACE FUNCTION public.validate_supplier_session_secure(p_magic_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_record RECORD;
  supplier_record RECORD;
  assistance_record RECORD;
  is_recently_expired BOOLEAN := false;
  is_active_assistance BOOLEAN := false;
  valid_days INTEGER := public.magic_code_valid_days();
  result jsonb;
BEGIN
  -- Log access attempt
  PERFORM public.log_security_event('magic_code_validation', 'Magic code validation attempt');

  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    PERFORM public.log_security_event('magic_code_invalid', 'Invalid magic code attempted');
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid magic code');
  END IF;

  -- Check if linked assistance is still active
  IF code_record.assistance_id IS NOT NULL THEN
    SELECT a.* INTO assistance_record FROM public.assistances a WHERE a.id = code_record.assistance_id;
    IF FOUND AND assistance_record.status NOT IN ('completed','cancelled') THEN
      is_active_assistance := true;
    END IF;
  END IF;

  -- Handle expiry with grace period for active assistances
  IF code_record.expires_at <= now() THEN
    IF is_active_assistance THEN
      -- Extend for active assistances
      UPDATE public.supplier_magic_codes
      SET expires_at = now() + (valid_days || ' days')::interval
      WHERE id = code_record.id;
      PERFORM public.log_security_event('magic_code_extended', 'Code extended for active assistance');
    ELSE
      -- 24h grace period for recently expired codes
      IF code_record.expires_at > (now() - interval '24 hours') THEN
        is_recently_expired := true;
        UPDATE public.supplier_magic_codes
        SET expires_at = now() + interval '24 hours'
        WHERE id = code_record.id;
        PERFORM public.log_security_event('magic_code_grace', 'Grace period applied to expired code');
      ELSE
        PERFORM public.log_security_event('magic_code_expired', 'Expired magic code rejected');
        RETURN jsonb_build_object('valid', false, 'error', 'Magic code has expired');
      END IF;
    END IF;
  END IF;

  -- Get supplier info (must be active)
  SELECT * INTO supplier_record
  FROM public.suppliers
  WHERE id = code_record.supplier_id AND is_active = true;

  IF NOT FOUND THEN
    PERFORM public.log_security_event('supplier_inactive', 'Attempt to use code for inactive supplier');
    RETURN jsonb_build_object('valid', false, 'error', 'Supplier not found or inactive');
  END IF;

  -- Update usage tracking
  UPDATE public.supplier_magic_codes
  SET last_used_at = now(), access_count = COALESCE(access_count, 0) + 1
  WHERE id = code_record.id;

  -- Log successful validation
  PERFORM public.log_security_event('magic_code_valid', 'Magic code successfully validated', 
    jsonb_build_object('supplier_id', supplier_record.id, 'assistance_id', code_record.assistance_id));

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
$$;
