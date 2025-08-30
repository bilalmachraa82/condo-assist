-- Fix Function Search Path Security Issue
-- Update security audit logging function with proper search path
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  details TEXT DEFAULT NULL,
  metadata JSONB DEFAULT NULL
) RETURNS VOID 
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
    'security_event_' || event_type,
    COALESCE(details, 'Security event: ' || event_type),
    COALESCE(metadata, jsonb_build_object('timestamp', now(), 'user_id', auth.uid()))
  );
END;
$$;

-- Review and fix other functions that might need search_path
-- Update existing functions to have proper search_path settings where missing

-- Fix any other functions that don't have search_path set
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;