-- Fix database functions that use quotation_approved

-- Update the quotation approval function
CREATE OR REPLACE FUNCTION public.handle_quotation_deadlines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When quotation is requested, set deadline and schedule reminders
  IF TG_OP = 'UPDATE' AND OLD.requires_quotation IS DISTINCT FROM NEW.requires_quotation 
     AND NEW.requires_quotation = true THEN
    
    -- Set quotation deadline based on priority if not set
    IF NEW.quotation_deadline IS NULL THEN
      NEW.quotation_deadline := CASE 
        WHEN NEW.priority = 'critical' THEN now() + interval '2 days'
        WHEN NEW.priority = 'urgent' THEN now() + interval '3 days'
        ELSE now() + interval '5 days'
      END;
    END IF;
    
    -- Set quotation_requested_at timestamp
    NEW.quotation_requested_at := now();
    
    -- Update status to awaiting_quotation
    NEW.status := 'awaiting_quotation';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the quotation approval trigger
CREATE OR REPLACE FUNCTION public.create_quotation_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When quotation status changes to approved, ensure it's properly reflected
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
    -- Update the assistance status to accepted if quotation approved
    UPDATE public.assistances 
    SET status = 'accepted', updated_at = now()
    WHERE id = NEW.assistance_id;
    
    -- Log the approval
    INSERT INTO public.activity_log (
      assistance_id, supplier_id, action, details, metadata
    ) VALUES (
      NEW.assistance_id, NEW.supplier_id, 'quotation_approved', 
      'Orçamento aprovado e assistência aceite', 
      jsonb_build_object('quotation_id', NEW.id, 'amount', NEW.amount)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;