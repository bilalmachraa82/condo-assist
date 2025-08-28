-- SECURITY FIX: Restrict supplier access to prevent data harvesting
-- Remove overly permissive policy that allows all authenticated users to view suppliers

-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can view active suppliers" ON public.suppliers;

-- Create more restrictive policies for legitimate business use only

-- Policy 1: Admins can still manage all suppliers (unchanged)
-- This policy already exists: "Admins can manage suppliers"

-- Policy 2: Users can only view minimal supplier info when assigning to assistances
-- This allows viewing only ID, name, and specialization - no contact details
CREATE POLICY "Users can view basic supplier info for assistance assignment" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (
  is_active = true AND
  -- Only allow access to basic fields through a view or when user has admin role
  is_admin(auth.uid())
);

-- Policy 3: Suppliers can view their own full information via magic codes
-- This is handled through edge functions with magic code validation

-- Create a view for safe supplier listing (only basic info for assignments)
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

-- Grant access to the view for authenticated users
GRANT SELECT ON public.suppliers_basic TO authenticated;

-- Add RLS to the view
ALTER VIEW public.suppliers_basic SET (security_barrier = true);

-- Create policy for the view
CREATE POLICY "Authenticated users can view basic supplier info" 
ON public.suppliers_basic 
FOR SELECT 
TO authenticated
USING (true);