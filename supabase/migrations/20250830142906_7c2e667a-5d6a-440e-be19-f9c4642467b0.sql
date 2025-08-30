-- CRITICAL SECURITY FIXES
-- Phase 1: Fix Public Data Exposure

-- 1. Remove public access from suppliers table (CRITICAL)
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;

-- Only admins can access suppliers data
CREATE POLICY "Only admins can view suppliers" 
ON public.suppliers 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 2. Remove public access from assistances table 
DROP POLICY IF EXISTS "Authenticated users can view assistances" ON public.assistances;

-- Only admins can view assistances (suppliers access through magic codes via functions)
CREATE POLICY "Only admins can view assistances" 
ON public.assistances 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 3. Remove public access from quotations table
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;

-- Only admins can view quotations
CREATE POLICY "Only admins can view quotations" 
ON public.quotations 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 4. Remove public access from notifications table
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.notifications;

-- Only admins can view notifications
CREATE POLICY "Only admins can view notifications" 
ON public.notifications 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 5. Remove public access from supplier_responses table
DROP POLICY IF EXISTS "Authenticated users can view supplier responses" ON public.supplier_responses;

-- Only admins can view supplier responses
CREATE POLICY "Only admins can view supplier responses" 
ON public.supplier_responses 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 6. Restrict app_settings to admin-only access (CRITICAL)
DROP POLICY IF EXISTS "Authenticated users can view app settings" ON public.app_settings;

-- Only admins can view app settings
CREATE POLICY "Only admins can view app settings" 
ON public.app_settings 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 7. Remove public access from follow_up_schedules
DROP POLICY IF EXISTS "Authenticated users can view follow-up schedules" ON public.follow_up_schedules;

-- Only admins can view follow-up schedules
CREATE POLICY "Only admins can view follow-up schedules" 
ON public.follow_up_schedules 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 8. Remove public access from assistance_progress
DROP POLICY IF EXISTS "Authenticated users can view assistance progress" ON public.assistance_progress;

-- Only admins can view assistance progress
CREATE POLICY "Only admins can view assistance progress" 
ON public.assistance_progress 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 9. Remove public access from assistance_photos
DROP POLICY IF EXISTS "Authenticated users can view assistance photos" ON public.assistance_photos;

-- Only admins can view assistance photos
CREATE POLICY "Only admins can view assistance photos" 
ON public.assistance_photos 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Keep intervention_types and buildings accessible to authenticated users (needed for dropdowns)
-- These policies are already correctly restrictive

-- Add security audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  details TEXT DEFAULT NULL,
  metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;