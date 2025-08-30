-- Create trigger to automatically create quotation records when assistance status changes to approved
CREATE OR REPLACE FUNCTION public.create_quotation_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Create trigger on quotations table
DROP TRIGGER IF EXISTS quotation_approval_trigger ON public.quotations;
CREATE TRIGGER quotation_approval_trigger
  AFTER UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_quotation_on_approval();

-- Improve the automatic follow-up scheduling for quotations
CREATE OR REPLACE FUNCTION public.schedule_quotation_followups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Schedule quotation reminder when quotation is requested
  IF TG_OP = 'UPDATE' AND OLD.requires_quotation IS DISTINCT FROM NEW.requires_quotation 
     AND NEW.requires_quotation = true AND NEW.assigned_supplier_id IS NOT NULL THEN
    
    -- Schedule first reminder in 24 hours for urgent, 48 hours for normal
    INSERT INTO public.follow_up_schedules (
      assistance_id, supplier_id, follow_up_type, priority,
      scheduled_for, max_attempts, metadata
    ) VALUES (
      NEW.id, NEW.assigned_supplier_id, 'quotation_reminder', NEW.priority,
      now() + CASE 
        WHEN NEW.priority = 'urgent' THEN interval '24 hours'
        WHEN NEW.priority = 'critical' THEN interval '12 hours'
        ELSE interval '48 hours'
      END,
      3,
      jsonb_build_object(
        'quotation_deadline', NEW.quotation_deadline,
        'attempt_number', 1
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the trigger for better follow-up scheduling
DROP TRIGGER IF EXISTS schedule_automatic_followups ON public.assistances;
CREATE TRIGGER schedule_automatic_followups
  AFTER UPDATE ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_quotation_followups();