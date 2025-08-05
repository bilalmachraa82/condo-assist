-- Add assistance_number field to assistances table with auto-increment
ALTER TABLE public.assistances 
ADD COLUMN assistance_number SERIAL;

-- Create unique constraint on assistance_number
ALTER TABLE public.assistances 
ADD CONSTRAINT unique_assistance_number UNIQUE (assistance_number);

-- Update existing records to have sequential numbers
UPDATE public.assistances 
SET assistance_number = row_number() OVER (ORDER BY created_at)
WHERE assistance_number IS NULL;

-- Make assistance_number NOT NULL after setting values
ALTER TABLE public.assistances 
ALTER COLUMN assistance_number SET NOT NULL;