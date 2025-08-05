-- Fix function search path security issues
CREATE OR REPLACE FUNCTION generate_assistance_number()
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(assistance_number), 0) + 1 
  INTO next_number 
  FROM public.assistances;
  
  RETURN next_number;
END;
$$;

CREATE OR REPLACE FUNCTION set_assistance_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assistance_number IS NULL THEN
    NEW.assistance_number := generate_assistance_number();
  END IF;
  RETURN NEW;
END;
$$;