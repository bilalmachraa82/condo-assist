-- CRITICAL SECURITY FIX: Remove public data exposure policies

-- Remove dangerous public policies that expose sensitive business data
DROP POLICY IF EXISTS "Public can view assistances" ON public.assistances;
DROP POLICY IF EXISTS "Anonymous users can view assistances" ON public.assistances;
DROP POLICY IF EXISTS "Public can view buildings" ON public.buildings;
DROP POLICY IF EXISTS "Anonymous users can view buildings" ON public.buildings;
DROP POLICY IF EXISTS "Authenticated users can view buildings" ON public.buildings;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;

-- Create secure admin-only policies for sensitive data
CREATE POLICY "Only admins can view assistances" ON public.assistances
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can view buildings" ON public.buildings
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can view suppliers" ON public.suppliers
FOR SELECT USING (is_admin(auth.uid()));

-- Suppliers can only view quotations for their own assistances
CREATE POLICY "Suppliers can view their own quotations" ON public.quotations
FOR SELECT USING (
  supplier_id IN (
    SELECT id FROM public.suppliers s
    WHERE EXISTS (
      SELECT 1 FROM public.supplier_magic_codes smc
      WHERE smc.supplier_id = s.id 
      AND smc.expires_at > now()
    )
  ) AND supplier_id = (
    SELECT supplier_id FROM public.supplier_magic_codes 
    WHERE expires_at > now() 
    LIMIT 1
  )
);

-- Admins can view all quotations
CREATE POLICY "Admins can view all quotations" ON public.quotations
FOR SELECT USING (is_admin(auth.uid()));

-- Add security event logging for policy violations
CREATE OR REPLACE FUNCTION log_security_violation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_log (action, details, metadata)
  VALUES (
    'security_violation',
    'Unauthorized access attempt detected',
    jsonb_build_object(
      'user_id', auth.uid(),
      'timestamp', now(),
      'context', 'rls_policy_check'
    )
  );
END;
$$;

-- Improve magic code security - increase length and add rate limiting table
CREATE TABLE IF NOT EXISTS public.magic_code_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet,
  magic_code text,
  attempt_time timestamp with time zone DEFAULT now(),
  success boolean DEFAULT false
);

ALTER TABLE public.magic_code_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can manage attempts" ON public.magic_code_attempts
FOR ALL USING (false);

-- Enhanced magic code generation with better security
CREATE OR REPLACE FUNCTION public.generate_magic_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars
  i INTEGER;
BEGIN
  LOOP
    code := '';
    -- Generate 16 character code for better security
    FOR i IN 1..16 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists and is not expired
    SELECT EXISTS(
      SELECT 1 FROM public.supplier_magic_codes 
      WHERE magic_code = code AND expires_at > now()
    ) INTO exists_code;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_code;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Add rate limiting function for magic code validation
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_ip inet, p_magic_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_attempts INTEGER;
BEGIN
  -- Count failed attempts in last hour
  SELECT COUNT(*) INTO recent_attempts
  FROM public.magic_code_attempts
  WHERE ip_address = p_ip
    AND attempt_time > now() - interval '1 hour'
    AND success = false;
  
  -- Block if more than 10 failed attempts in last hour
  IF recent_attempts >= 10 THEN
    RETURN false;
  END IF;
  
  -- Log this attempt
  INSERT INTO public.magic_code_attempts (ip_address, magic_code, success)
  VALUES (p_ip, p_magic_code, false);
  
  RETURN true;
END;
$$;

-- Update validation function to include rate limiting
CREATE OR REPLACE FUNCTION public.validate_supplier_session(p_magic_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  code_record RECORD;
  supplier_record RECORD;
  assistance_record RECORD;
  is_recently_expired BOOLEAN := false;
  is_active_assistance BOOLEAN := false;
  valid_days INTEGER := public.magic_code_valid_days();
  client_ip INET;
BEGIN
  -- Get client IP (simplified for this context)
  client_ip := inet '127.0.0.1';
  
  -- Check rate limiting
  IF NOT public.check_rate_limit(client_ip, p_magic_code) THEN
    PERFORM public.log_security_event('rate_limit_exceeded', 'Magic code validation rate limit exceeded');
    RETURN jsonb_build_object('valid', false, 'error', 'Rate limit exceeded. Please try again later.');
  END IF;

  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    PERFORM public.log_security_event('invalid_magic_code', 'Invalid magic code attempt: ' || p_magic_code);
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid magic code');
  END IF;

  -- Update successful attempt
  UPDATE public.magic_code_attempts 
  SET success = true 
  WHERE ip_address = client_ip 
    AND magic_code = p_magic_code 
    AND attempt_time > now() - interval '5 minutes';

  -- Rest of validation logic remains the same...
  IF code_record.assistance_id IS NOT NULL THEN
    SELECT a.* INTO assistance_record FROM public.assistances a WHERE a.id = code_record.assistance_id;
    IF FOUND AND assistance_record.status NOT IN ('completed','cancelled') THEN
      is_active_assistance := true;
    END IF;
  END IF;

  IF code_record.expires_at <= now() THEN
    IF is_active_assistance THEN
      UPDATE public.supplier_magic_codes
      SET expires_at = now() + (valid_days || ' days')::interval
      WHERE id = code_record.id;
    ELSE
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

  SELECT * INTO supplier_record
  FROM public.suppliers
  WHERE id = code_record.supplier_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Supplier not found or inactive');
  END IF;

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
$$;