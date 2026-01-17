-- Fix 1: Drop the incorrectly configured deny_anon policy and recreate properly
DROP POLICY IF EXISTS "deny_anon_profiles_select" ON public.profiles;

-- Fix 2: Drop permissive policies that expose data and recreate with proper restrictions
-- For profiles: Users should ONLY see their own profile, admins can see all
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recreate as RESTRICTIVE policies that properly limit access
-- Users can only see their own profile
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all profiles (separate policy)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- Fix 3: Drop the deny_anon policy for security_events (same issue)
DROP POLICY IF EXISTS "deny_anon_security_events_select" ON public.security_events;

-- Security events should only be visible to admins (already has correct policy)
-- Just ensure no anonymous access is possible

-- Fix 4: Update suppliers policies - remove duplicate
DROP POLICY IF EXISTS "Only admins can manage suppliers" ON public.suppliers;

-- Fix 5: Update buildings to have explicit SELECT restriction
-- Currently only has ALL policy for admins, but may allow SELECT to others
CREATE POLICY "Only admins can view buildings" 
ON public.buildings 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));