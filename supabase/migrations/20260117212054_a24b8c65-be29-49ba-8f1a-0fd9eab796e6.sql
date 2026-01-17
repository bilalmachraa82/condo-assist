-- Fix 1: Profiles - Add explicit block for anonymous users
-- First, drop existing policies and recreate with proper protection
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create policy that blocks anonymous AND allows authenticated users to see own profile
CREATE POLICY "Authenticated users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- Fix 2: Suppliers - Ensure anonymous users are blocked
-- Drop any existing policies and recreate
DROP POLICY IF EXISTS "Only admins can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Only authenticated admins can manage suppliers" ON public.suppliers;

-- Create explicit admin-only policy for ALL operations
CREATE POLICY "Only authenticated admins can manage suppliers" 
ON public.suppliers 
FOR ALL 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Fix 3: Buildings - Ensure anonymous users are blocked
DROP POLICY IF EXISTS "Only admins can view buildings" ON public.buildings;
DROP POLICY IF EXISTS "Only admins can manage buildings" ON public.buildings;

-- Create explicit admin-only policy for ALL operations
CREATE POLICY "Only authenticated admins can manage buildings" 
ON public.buildings 
FOR ALL 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));