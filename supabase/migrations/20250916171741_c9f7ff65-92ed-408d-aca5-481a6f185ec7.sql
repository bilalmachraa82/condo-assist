-- CRITICAL SECURITY FIX: Add missing RLS policies

-- Enable RLS on suppliers table (CRITICAL - currently exposed)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Only admins can manage suppliers
CREATE POLICY "Only admins can manage suppliers" ON public.suppliers
FOR ALL USING (public.is_admin(auth.uid()));

-- Enable RLS on supplier_magic_codes table (CRITICAL - currently exposed)
ALTER TABLE public.supplier_magic_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage magic codes
CREATE POLICY "Only admins can manage magic codes" ON public.supplier_magic_codes
FOR ALL USING (public.is_admin(auth.uid()));

-- Enable RLS on email_logs table (CRITICAL - currently exposed)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view email logs
CREATE POLICY "Only admins can view email logs" ON public.email_logs
FOR SELECT USING (public.is_admin(auth.uid()));

-- System can insert email logs (for edge functions)
CREATE POLICY "System can insert email logs" ON public.email_logs
FOR INSERT WITH CHECK (true);

-- Security enhancement: Add rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System only rate limits" ON public.rate_limits
FOR ALL USING (false);

-- Security enhancement: Add security events logging
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'low',
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on security_events table
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Only admins can view security events" ON public.security_events
FOR SELECT USING (public.is_admin(auth.uid()));

-- System can insert security events
CREATE POLICY "System can insert security events" ON public.security_events
FOR INSERT WITH CHECK (true);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text DEFAULT 'medium',
  p_details jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type,
    severity,
    user_id,
    ip_address,
    user_agent,
    details
  ) VALUES (
    p_event_type,
    p_severity,
    auth.uid(),
    p_ip_address,
    p_user_agent,
    p_details
  );
END;
$$;

-- Enhanced magic code validation with security logging
CREATE OR REPLACE FUNCTION public.validate_supplier_session_secure(p_magic_code text, p_ip_address inet DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  PERFORM public.log_security_event(
    'magic_code_access_attempt',
    'low',
    jsonb_build_object('magic_code_prefix', left(p_magic_code, 4) || '***'),
    p_ip_address,
    p_user_agent
  );

  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    PERFORM public.log_security_event(
      'invalid_magic_code_attempt',
      'high',
      jsonb_build_object('attempted_code', left(p_magic_code, 4) || '***'),
      p_ip_address,
      p_user_agent
    );
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid magic code');
  END IF;

  -- Check for suspicious access patterns
  IF code_record.access_count > 100 THEN
    PERFORM public.log_security_event(
      'excessive_magic_code_usage',
      'medium',
      jsonb_build_object('access_count', code_record.access_count, 'supplier_id', code_record.supplier_id),
      p_ip_address,
      p_user_agent
    );
  END IF;

  -- Continue with existing validation logic...
  IF code_record.assistance_id IS NOT NULL THEN
    SELECT a.* INTO assistance_record FROM public.assistances a WHERE a.id = code_record.assistance_id;
    IF FOUND AND assistance_record.status NOT IN ('completed','cancelled') THEN
      is_active_assistance := true;
    END IF;
  END IF;

  -- Expiry logic with security logging
  IF code_record.expires_at <= now() THEN
    IF is_active_assistance THEN
      UPDATE public.supplier_magic_codes
      SET expires_at = now() + (valid_days || ' days')::interval
      WHERE id = code_record.id;
      
      PERFORM public.log_security_event(
        'magic_code_auto_renewed',
        'low',
        jsonb_build_object('supplier_id', code_record.supplier_id),
        p_ip_address,
        p_user_agent
      );
    ELSE
      IF code_record.expires_at > (now() - interval '24 hours') THEN
        is_recently_expired := true;
        UPDATE public.supplier_magic_codes
        SET expires_at = now() + interval '24 hours'
        WHERE id = code_record.id;
        
        PERFORM public.log_security_event(
          'expired_magic_code_grace_period',
          'medium',
          jsonb_build_object('supplier_id', code_record.supplier_id),
          p_ip_address,
          p_user_agent
        );
      ELSE
        PERFORM public.log_security_event(
          'expired_magic_code_rejected',
          'high',
          jsonb_build_object('supplier_id', code_record.supplier_id, 'expired_at', code_record.expires_at),
          p_ip_address,
          p_user_agent
        );
        RETURN jsonb_build_object('valid', false, 'error', 'Magic code has expired');
      END IF;
    END IF;
  END IF;

  -- Get supplier info (must be active)
  SELECT * INTO supplier_record
  FROM public.suppliers
  WHERE id = code_record.supplier_id AND is_active = true;

  IF NOT FOUND THEN
    PERFORM public.log_security_event(
      'inactive_supplier_access_attempt',
      'high',
      jsonb_build_object('supplier_id', code_record.supplier_id),
      p_ip_address,
      p_user_agent
    );
    RETURN jsonb_build_object('valid', false, 'error', 'Supplier not found or inactive');
  END IF;

  -- Update last used and access count
  UPDATE public.supplier_magic_codes
  SET last_used_at = now(), access_count = COALESCE(access_count, 0) + 1
  WHERE id = code_record.id;

  -- Log successful access
  PERFORM public.log_security_event(
    'magic_code_access_success',
    'low',
    jsonb_build_object('supplier_id', code_record.supplier_id, 'assistance_id', code_record.assistance_id),
    p_ip_address,
    p_user_agent
  );

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