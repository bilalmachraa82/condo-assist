-- Fix quotation data inconsistencies
-- Update assistances with quotation-related statuses but missing quotation flags

UPDATE public.assistances 
SET 
  requires_quotation = true,
  quotation_requested_at = COALESCE(quotation_requested_at, updated_at, created_at),
  quotation_deadline = CASE 
    WHEN quotation_deadline IS NULL THEN
      CASE 
        WHEN priority = 'critical' THEN COALESCE(quotation_requested_at, updated_at, created_at) + interval '2 days'
        WHEN priority = 'urgent' THEN COALESCE(quotation_requested_at, updated_at, created_at) + interval '3 days'
        ELSE COALESCE(quotation_requested_at, updated_at, created_at) + interval '5 days'
      END
    ELSE quotation_deadline
  END,
  updated_at = now()
WHERE status IN ('awaiting_quotation', 'quotation_received')
  AND (requires_quotation = false OR quotation_requested_at IS NULL);

-- Create validation trigger to ensure data consistency
CREATE OR REPLACE FUNCTION public.validate_quotation_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- If status indicates quotation is needed, ensure quotation fields are set
  IF NEW.status IN ('awaiting_quotation', 'quotation_received') THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for quotation consistency validation
DROP TRIGGER IF EXISTS validate_quotation_consistency_trigger ON public.assistances;
CREATE TRIGGER validate_quotation_consistency_trigger
  BEFORE INSERT OR UPDATE ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_quotation_consistency();