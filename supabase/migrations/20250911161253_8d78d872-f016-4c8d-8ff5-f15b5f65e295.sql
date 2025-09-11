-- Remove test quotations created in previous migration
DELETE FROM quotations WHERE id IN (
  SELECT id FROM quotations 
  WHERE submitted_at >= NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC 
  LIMIT 5
);

-- Drop existing restrictive RLS policies on quotations
DROP POLICY IF EXISTS "Admins can manage quotations" ON quotations;
DROP POLICY IF EXISTS "Only admins can view quotations" ON quotations;

-- Create new RLS policies for quotations - allow authenticated users to view
CREATE POLICY "Authenticated users can view quotations" 
ON quotations FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage quotations" 
ON quotations FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Drop existing restrictive RLS policies on suppliers
DROP POLICY IF EXISTS "Admins can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Only admins can view suppliers" ON suppliers;

-- Create new RLS policies for suppliers - allow authenticated users to view basic info
CREATE POLICY "Authenticated users can view suppliers" 
ON suppliers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage suppliers" 
ON suppliers FOR ALL 
TO authenticated 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));