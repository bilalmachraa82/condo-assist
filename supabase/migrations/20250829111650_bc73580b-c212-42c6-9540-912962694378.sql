-- Drop the problematic view and create a function instead
DROP VIEW IF EXISTS public.suppliers_basic;

-- Create a function to get basic supplier data (safer than view)
CREATE OR REPLACE FUNCTION public.get_basic_suppliers()
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
GRANT EXECUTE ON FUNCTION public.get_basic_suppliers() TO authenticated;