-- FASE A: Fix database functions and triggers with proper CASCADE handling

-- 1. Drop all dependent triggers and function with CASCADE
DROP TRIGGER IF EXISTS trigger_schedule_followups ON assistances;
DROP TRIGGER IF EXISTS trigger_schedule_automatic_followups ON assistances;
DROP FUNCTION IF EXISTS schedule_automatic_followups() CASCADE;

-- 2. Recreate the fixed function
CREATE OR REPLACE FUNCTION public.schedule_automatic_followups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  followup_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Schedule quotation reminder when quotation is requested
  IF TG_OP = 'UPDATE' AND OLD.requires_quotation IS DISTINCT FROM NEW.requires_quotation 
     AND NEW.requires_quotation = true AND NEW.assigned_supplier_id IS NOT NULL THEN
    
    followup_date := now() + CASE 
      WHEN NEW.priority = 'critical' THEN interval '12 hours'
      WHEN NEW.priority = 'urgent' THEN interval '24 hours'
      ELSE interval '48 hours'
    END;
    
    INSERT INTO public.follow_up_schedules (
      assistance_id, supplier_id, follow_up_type, priority, 
      scheduled_for, metadata
    ) VALUES (
      NEW.id, NEW.assigned_supplier_id, 'quotation_reminder', NEW.priority,
      followup_date, 
      jsonb_build_object(
        'quotation_deadline', NEW.quotation_deadline,
        'attempt_number', 1
      )
    );
  END IF;
  
  -- Schedule work reminder when scheduled_start_date is defined
  IF TG_OP = 'UPDATE' AND OLD.scheduled_start_date IS DISTINCT FROM NEW.scheduled_start_date 
     AND NEW.scheduled_start_date IS NOT NULL THEN
    
    INSERT INTO public.follow_up_schedules (
      assistance_id, supplier_id, follow_up_type, priority,
      scheduled_for, metadata
    ) VALUES (
      NEW.id, NEW.assigned_supplier_id, 'work_reminder', NEW.priority,
      NEW.scheduled_start_date - interval '24 hours',
      jsonb_build_object('work_date', NEW.scheduled_start_date)
    );
    
    -- Calculate expected completion date if not set
    IF NEW.expected_completion_date IS NULL THEN
      UPDATE public.assistances 
      SET expected_completion_date = NEW.scheduled_start_date + 
        COALESCE(NEW.estimated_duration_hours || ' hours', '8 hours')::INTERVAL
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  -- Schedule completion reminders when status changes to in_progress and has expected completion
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status = 'in_progress' AND NEW.expected_completion_date IS NOT NULL THEN
    
    INSERT INTO public.follow_up_schedules (
      assistance_id, supplier_id, follow_up_type, priority,
      scheduled_for, metadata
    ) VALUES (
      NEW.id, NEW.assigned_supplier_id, 'completion_reminder', NEW.priority,
      NEW.expected_completion_date + interval '24 hours',
      jsonb_build_object('expected_completion', NEW.expected_completion_date)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Recreate the trigger
CREATE TRIGGER schedule_automatic_followups_trigger
  AFTER UPDATE ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_automatic_followups();

-- 4. Create trigger for date confirmation based on supplier responses
CREATE OR REPLACE FUNCTION public.schedule_date_confirmation_on_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assistance_record RECORD;
BEGIN
  -- When supplier accepts and assistance doesn't have scheduled_start_date yet
  IF NEW.response_type = 'accepted' THEN
    SELECT * INTO assistance_record 
    FROM public.assistances 
    WHERE id = NEW.assistance_id AND scheduled_start_date IS NULL;
    
    IF FOUND THEN
      INSERT INTO public.follow_up_schedules (
        assistance_id, supplier_id, follow_up_type, priority,
        scheduled_for, metadata
      ) VALUES (
        NEW.assistance_id, NEW.supplier_id, 'date_confirmation', 'normal',
        now() + interval '24 hours',
        jsonb_build_object('accepted_at', NEW.response_date)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER schedule_date_confirmation_trigger
  AFTER INSERT ON public.supplier_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_date_confirmation_on_response();

-- 5. Fix partial index that might reference removed states
DROP INDEX IF EXISTS idx_assistances_dates;
CREATE INDEX idx_assistances_dates ON public.assistances(scheduled_start_date, status) 
WHERE scheduled_start_date IS NOT NULL OR status = 'in_progress';