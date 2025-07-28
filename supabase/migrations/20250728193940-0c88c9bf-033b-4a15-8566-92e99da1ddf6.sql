-- Add new status values for quotation workflow
ALTER TYPE assistance_status ADD VALUE IF NOT EXISTS 'awaiting_quotation';
ALTER TYPE assistance_status ADD VALUE IF NOT EXISTS 'quotation_received';
ALTER TYPE assistance_status ADD VALUE IF NOT EXISTS 'quotation_approved';
ALTER TYPE assistance_status ADD VALUE IF NOT EXISTS 'quotation_rejected';

-- Add quotation request functionality to assistances
ALTER TABLE assistances 
ADD COLUMN IF NOT EXISTS requires_quotation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quotation_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS quotation_deadline timestamp with time zone;

-- Update existing quotations table to better link with assistances
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS is_requested boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requested_at timestamp with time zone;

-- Create activity log entries for quotation workflow
INSERT INTO public.activity_log (assistance_id, action, details) 
SELECT id, 'migration', 'Sistema de orçamentos integrado às assistências' 
FROM assistances LIMIT 1;

-- Create function to automatically set quotation status
CREATE OR REPLACE FUNCTION public.update_assistance_quotation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When quotation is submitted, update assistance status
  IF TG_OP = 'INSERT' THEN
    UPDATE assistances 
    SET status = 'quotation_received'::assistance_status
    WHERE id = NEW.assistance_id 
    AND status = 'awaiting_quotation'::assistance_status;
  END IF;
  
  -- When quotation status changes, log activity
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO activity_log (assistance_id, supplier_id, action, details, metadata)
    VALUES (
      NEW.assistance_id,
      NEW.supplier_id,
      'quotation_status_changed',
      'Status do orçamento alterado para ' || NEW.status::text,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'amount', NEW.amount)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for quotation status updates
DROP TRIGGER IF EXISTS quotation_status_trigger ON quotations;
CREATE TRIGGER quotation_status_trigger
  AFTER INSERT OR UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_assistance_quotation_status();