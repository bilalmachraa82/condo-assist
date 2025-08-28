-- SECURITY FIX: Restrict supplier access to prevent data harvesting
-- Remove overly permissive policy and create restrictive ones

-- Drop the problematic policy that allowed all authenticated users to view suppliers
DROP POLICY IF EXISTS "Authenticated users can view active suppliers" ON public.suppliers;

-- Create restrictive policy: Only admins can view full supplier details
CREATE POLICY "Only admins can view supplier details" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- Create a secure view for basic supplier info (no contact details)
CREATE OR REPLACE VIEW public.suppliers_basic AS
SELECT 
  id,
  name,
  specialization,
  is_active,
  rating,
  total_jobs
FROM public.suppliers
WHERE is_active = true;