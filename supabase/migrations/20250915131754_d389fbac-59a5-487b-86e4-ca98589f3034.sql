-- CRITICAL SECURITY FIX: Clean slate RLS policies

-- First drop ALL existing policies to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on assistances
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'assistances' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.assistances';
    END LOOP;
    
    -- Drop all policies on buildings
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'buildings' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.buildings';
    END LOOP;
    
    -- Drop all policies on suppliers
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'suppliers' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.suppliers';
    END LOOP;
    
    -- Drop all policies on quotations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'quotations' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.quotations';
    END LOOP;
END $$;

-- Create secure admin-only policies
CREATE POLICY "Admins can manage assistances" ON public.assistances
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage buildings" ON public.buildings  
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage quotations" ON public.quotations
FOR ALL USING (is_admin(auth.uid()));

-- Add rate limiting table for magic codes
CREATE TABLE IF NOT EXISTS public.magic_code_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet,
  magic_code text,
  attempt_time timestamp with time zone DEFAULT now(),
  success boolean DEFAULT false
);

ALTER TABLE public.magic_code_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System only access to attempts" ON public.magic_code_attempts
FOR ALL USING (false);

-- Enhanced magic code generation with better security
CREATE OR REPLACE FUNCTION public.generate_magic_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INTEGER;
BEGIN
  LOOP
    code := '';
    -- Generate 16 character code for better security
    FOR i IN 1..16 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(
      SELECT 1 FROM public.supplier_magic_codes 
      WHERE magic_code = code AND expires_at > now()
    ) INTO exists_code;
    
    EXIT WHEN NOT exists_code;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Add rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_ip inet, p_magic_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_attempts INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_attempts
  FROM public.magic_code_attempts
  WHERE ip_address = p_ip
    AND attempt_time > now() - interval '1 hour'
    AND success = false;
  
  IF recent_attempts >= 10 THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.magic_code_attempts (ip_address, magic_code, success)
  VALUES (p_ip, p_magic_code, false);
  
  RETURN true;
END;
$$;