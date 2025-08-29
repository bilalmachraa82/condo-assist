-- Drop the overly permissive supplier view policy
DROP POLICY IF EXISTS "Only admins can view supplier details" ON public.suppliers;

-- Create a more restrictive policy for suppliers table - only admins can access full supplier data
CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL USING (is_admin(auth.uid()));

-- Create a secure view for basic supplier information (no sensitive contact details)
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

-- Enable RLS on the view is not needed as it inherits from the base table

-- Create a security definer function to get suppliers for assignment (admin-only operation)
CREATE OR REPLACE FUNCTION public.get_suppliers_for_assignment()
RETURNS TABLE (
  id uuid,
  name text,
  specialization text,
  is_active boolean,
  rating numeric,
  total_jobs integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.specialization, s.is_active, s.rating, s.total_jobs
  FROM public.suppliers s
  WHERE s.is_active = true
  AND is_admin(auth.uid());
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_suppliers_for_assignment() TO authenticated;