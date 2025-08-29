-- Remove duplicate policy
DROP POLICY IF EXISTS "Only admins can view supplier details" ON public.suppliers;

-- Create the secure suppliers_basic view (without SECURITY DEFINER)
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