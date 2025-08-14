-- Remove the insecure public SELECT policy on supplier_magic_codes
-- This policy allows anyone to read active magic codes, which is a major security vulnerability

DROP POLICY IF EXISTS "Allow verification of valid magic codes" ON public.supplier_magic_codes;

-- The admin-only policy remains intact, ensuring only admins can manage magic codes
-- All existing functions that validate magic codes use SECURITY DEFINER, so they will continue to work