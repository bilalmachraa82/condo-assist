-- Phase 1: Fix RLS policies for communications_log to support supplier communication

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view communications" ON public.communications_log;

-- Create comprehensive policies for communications_log
CREATE POLICY "Anyone can view communications" 
ON public.communications_log 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert communications" 
ON public.communications_log 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Suppliers can insert communications via magic code" 
ON public.communications_log 
FOR INSERT 
WITH CHECK (
  sender_type = 'supplier' AND 
  sender_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.supplier_magic_codes 
    WHERE supplier_id = sender_id::uuid 
    AND expires_at > now()
  )
);

CREATE POLICY "Admins can update communications" 
ON public.communications_log 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete communications" 
ON public.communications_log 
FOR DELETE 
USING (is_admin(auth.uid()));