-- Add assistance_number field to assistances table
ALTER TABLE public.assistances 
ADD COLUMN assistance_number INTEGER;

-- Create a function to generate next assistance number
CREATE OR REPLACE FUNCTION generate_assistance_number()
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(assistance_number), 0) + 1 
  INTO next_number 
  FROM public.assistances;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-generate assistance numbers for new records
CREATE OR REPLACE FUNCTION set_assistance_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assistance_number IS NULL THEN
    NEW.assistance_number := generate_assistance_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new assistances
CREATE TRIGGER trigger_set_assistance_number
  BEFORE INSERT ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION set_assistance_number();

-- Update existing records with sequential numbers
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM public.assistances ORDER BY created_at LOOP
    UPDATE public.assistances 
    SET assistance_number = counter 
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Make assistance_number NOT NULL and add unique constraint
ALTER TABLE public.assistances 
ALTER COLUMN assistance_number SET NOT NULL;

ALTER TABLE public.assistances 
ADD CONSTRAINT unique_assistance_number UNIQUE (assistance_number);