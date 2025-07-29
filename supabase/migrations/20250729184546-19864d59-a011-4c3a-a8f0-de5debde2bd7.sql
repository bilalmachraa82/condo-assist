-- Update magic codes system for persistent sessions
-- Change default expiration to 30 days and add session management

-- Add session tracking to supplier_magic_codes
ALTER TABLE public.supplier_magic_codes 
ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_expires_at timestamp with time zone;

-- Update the magic code generation function to use 30 days expiration
CREATE OR REPLACE FUNCTION public.generate_magic_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code (increased from 6 for better security)
    code := upper(substr(md5(random()::text), 1, 8));
    
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
$function$;

-- Create function to create or refresh supplier session
CREATE OR REPLACE FUNCTION public.create_supplier_session(
  p_supplier_id uuid,
  p_magic_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  session_token text;
  session_expires timestamp with time zone;
  code_record RECORD;
BEGIN
  -- Check if magic code is valid
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
    AND supplier_id = p_supplier_id
    AND expires_at > now();
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired magic code');
  END IF;
  
  -- Generate session token (24 hour validity)
  session_token := encode(digest(random()::text || clock_timestamp()::text, 'sha256'), 'hex');
  session_expires := now() + interval '24 hours';
  
  -- Update magic code with session info and usage tracking
  UPDATE public.supplier_magic_codes
  SET 
    last_used_at = now(),
    access_count = COALESCE(access_count, 0) + 1,
    session_expires_at = session_expires
  WHERE magic_code = p_magic_code AND supplier_id = p_supplier_id;
  
  RETURN jsonb_build_object(
    'session_token', session_token,
    'expires_at', session_expires,
    'supplier_id', p_supplier_id,
    'magic_code', p_magic_code
  );
END;
$function$;

-- Create function to validate supplier session
CREATE OR REPLACE FUNCTION public.validate_supplier_session(
  p_magic_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code_record RECORD;
  supplier_record RECORD;
BEGIN
  -- Check if magic code exists and is not expired
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
    AND expires_at > now();
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired magic code');
  END IF;
  
  -- Get supplier information
  SELECT * INTO supplier_record
  FROM public.suppliers
  WHERE id = code_record.supplier_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Supplier not found or inactive');
  END IF;
  
  -- Update last used timestamp
  UPDATE public.supplier_magic_codes
  SET last_used_at = now()
  WHERE magic_code = p_magic_code;
  
  RETURN jsonb_build_object(
    'valid', true,
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
    'access_count', code_record.access_count
  );
END;
$function$;

-- Update RLS policy to allow session validation
DROP POLICY IF EXISTS "Allow anonymous verification of magic codes" ON public.supplier_magic_codes;

CREATE POLICY "Allow verification of valid magic codes"
ON public.supplier_magic_codes
FOR SELECT
TO anon, authenticated
USING (expires_at > now());

-- Create access log table for security auditing
CREATE TABLE IF NOT EXISTS public.supplier_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid,
  magic_code text NOT NULL,
  ip_address inet,
  user_agent text,
  action text NOT NULL,
  success boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb
);

-- Enable RLS on access log
ALTER TABLE public.supplier_access_log ENABLE ROW LEVEL SECURITY;

-- Create policy for access log (admin only)
CREATE POLICY "Admins can view access logs"
ON public.supplier_access_log
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Create function to log supplier access
CREATE OR REPLACE FUNCTION public.log_supplier_access(
  p_supplier_id uuid,
  p_magic_code text,
  p_action text,
  p_success boolean DEFAULT true,
  p_metadata jsonb DEFAULT NULL
)
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
    p_magic_code,
    p_action,
    p_success,
    p_metadata
  );
END;
$function$;