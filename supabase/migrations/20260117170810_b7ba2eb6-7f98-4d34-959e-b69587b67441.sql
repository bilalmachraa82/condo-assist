-- Fix 1: Add policies to deny anonymous access to profiles table
CREATE POLICY "deny_anon_profiles_select" 
ON public.profiles 
FOR SELECT 
USING (auth.role() != 'anon');

-- Fix 2: Add policies to deny anonymous access to security_events table  
CREATE POLICY "deny_anon_security_events_select" 
ON public.security_events 
FOR SELECT 
USING (auth.role() != 'anon');

-- Fix 3: Create rate limiting function for magic code validation
CREATE OR REPLACE FUNCTION public.check_magic_code_rate_limit(
  p_ip_address inet,
  p_magic_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip_attempts integer;
  v_code_attempts integer;
  v_last_attempt timestamp with time zone;
  v_block_until timestamp with time zone;
  v_window_start timestamp with time zone := now() - interval '1 hour';
BEGIN
  -- Count recent failed attempts from this IP
  SELECT count(*), max(attempt_time)
  INTO v_ip_attempts, v_last_attempt
  FROM magic_code_attempts
  WHERE ip_address = p_ip_address
    AND attempt_time > v_window_start
    AND success = false;

  -- Count recent failed attempts for this specific code
  SELECT count(*)
  INTO v_code_attempts
  FROM magic_code_attempts
  WHERE magic_code = p_magic_code
    AND attempt_time > v_window_start
    AND success = false;

  -- Block if too many IP attempts (max 10 per hour)
  IF v_ip_attempts >= 10 THEN
    -- Calculate exponential backoff
    v_block_until := v_last_attempt + (power(2, least(v_ip_attempts - 10, 6)) * interval '1 minute');
    
    IF now() < v_block_until THEN
      -- Log security event
      INSERT INTO security_events (event_type, severity, ip_address, details)
      VALUES ('rate_limit_exceeded', 'high', p_ip_address, 
        jsonb_build_object(
          'type', 'ip_blocked',
          'attempts', v_ip_attempts,
          'blocked_until', v_block_until
        ));
      
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'ip_rate_limited',
        'retry_after', extract(epoch from (v_block_until - now()))::integer
      );
    END IF;
  END IF;

  -- Block if too many code attempts (max 5 per hour per code)
  IF v_code_attempts >= 5 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'code_rate_limited',
      'retry_after', 3600 - extract(epoch from (now() - v_window_start))::integer
    );
  END IF;

  -- Auto-disable codes after 50 consecutive failed attempts
  IF v_code_attempts >= 50 THEN
    UPDATE supplier_magic_codes
    SET expires_at = now() - interval '1 second'
    WHERE magic_code = p_magic_code;
    
    INSERT INTO security_events (event_type, severity, ip_address, details)
    VALUES ('magic_code_disabled', 'critical', p_ip_address,
      jsonb_build_object(
        'magic_code', left(p_magic_code, 3) || '****',
        'reason', 'excessive_failed_attempts',
        'total_attempts', v_code_attempts
      ));
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'ip_attempts', v_ip_attempts,
    'code_attempts', v_code_attempts
  );
END;
$$;

-- Fix 4: Create function for secure magic code validation with rate limiting
CREATE OR REPLACE FUNCTION public.validate_magic_code_secure(
  p_magic_code text,
  p_ip_address inet DEFAULT '0.0.0.0'::inet,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_check jsonb;
  v_validation_result jsonb;
BEGIN
  -- First check rate limit
  v_rate_check := check_magic_code_rate_limit(p_ip_address, p_magic_code);
  
  IF NOT (v_rate_check->>'allowed')::boolean THEN
    -- Log the blocked attempt
    INSERT INTO magic_code_attempts (magic_code, ip_address, success)
    VALUES (p_magic_code, p_ip_address, false);
    
    RETURN jsonb_build_object(
      'valid', false,
      'error', v_rate_check->>'reason',
      'retry_after', v_rate_check->'retry_after'
    );
  END IF;

  -- Proceed with actual validation
  v_validation_result := validate_supplier_session_readonly(p_magic_code);
  
  -- Log the attempt
  INSERT INTO magic_code_attempts (magic_code, ip_address, success)
  VALUES (p_magic_code, p_ip_address, (v_validation_result->>'valid')::boolean);
  
  RETURN v_validation_result;
END;
$$;

-- Grant execute permission to anonymous users (for supplier portal)
GRANT EXECUTE ON FUNCTION public.check_magic_code_rate_limit(inet, text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_magic_code_secure(text, inet, text) TO anon;