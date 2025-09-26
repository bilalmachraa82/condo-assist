-- Fix database functions that still reference quotation_received status

-- Update the quotation trigger to not change status when quotation is submitted
CREATE OR REPLACE FUNCTION public.update_assistance_quotation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When quotation is submitted, keep status as awaiting_quotation
  -- We don't need to change the status when a quotation is received
  
  -- When quotation status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- If the quotation was approved, mark assistance as accepted
    IF NEW.status = 'approved'::quotation_status THEN
      UPDATE assistances
      SET status = 'accepted'::assistance_status,
          updated_at = now()
      WHERE id = NEW.assistance_id
        AND status IN ('awaiting_quotation'::assistance_status, 'pending'::assistance_status);
    END IF;

    -- Log activity
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

-- Update the quotation validation function to remove quotation_received reference
CREATE OR REPLACE FUNCTION public.validate_quotation_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If status indicates quotation is needed, ensure quotation fields are set
  IF NEW.status = 'awaiting_quotation' THEN
    -- Ensure requires_quotation is true
    IF NOT NEW.requires_quotation THEN
      NEW.requires_quotation := true;
    END IF;
    
    -- Ensure quotation_requested_at is set
    IF NEW.quotation_requested_at IS NULL THEN
      NEW.quotation_requested_at := now();
    END IF;
    
    -- Ensure quotation_deadline is set
    IF NEW.quotation_deadline IS NULL THEN
      NEW.quotation_deadline := CASE 
        WHEN NEW.priority = 'critical' THEN NEW.quotation_requested_at + interval '2 days'
        WHEN NEW.priority = 'urgent' THEN NEW.quotation_requested_at + interval '3 days'
        ELSE NEW.quotation_requested_at + interval '5 days'
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;