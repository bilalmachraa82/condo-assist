-- Update function to also set assistance status when a quotation is approved
CREATE OR REPLACE FUNCTION public.update_assistance_quotation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When quotation is submitted, update assistance status if waiting for quotation
  IF TG_OP = 'INSERT' THEN
    UPDATE assistances 
    SET status = 'quotation_received'::assistance_status
    WHERE id = NEW.assistance_id 
      AND status = 'awaiting_quotation'::assistance_status;
  END IF;
  
  -- When quotation status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- If the quotation was approved, mark assistance as accepted
    IF NEW.status = 'approved'::quotation_status THEN
      UPDATE assistances
      SET status = 'accepted'::assistance_status,
          updated_at = now()
      WHERE id = NEW.assistance_id
        AND status IN ('awaiting_quotation'::assistance_status, 'quotation_received'::assistance_status, 'pending'::assistance_status);
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

-- Create trigger to run the function on quotations insert/update
DROP TRIGGER IF EXISTS trg_update_assistance_quotation_status ON public.quotations;
CREATE TRIGGER trg_update_assistance_quotation_status
AFTER INSERT OR UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_assistance_quotation_status();