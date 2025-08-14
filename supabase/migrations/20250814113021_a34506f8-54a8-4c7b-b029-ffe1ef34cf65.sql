-- Remove anonymous read access to suppliers table to prevent data harvesting
DROP POLICY IF EXISTS "Allow anonymous read of active suppliers" ON public.suppliers;