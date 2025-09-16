-- Add missing 'awaiting_validation' status to assistance_status enum
ALTER TYPE assistance_status ADD VALUE IF NOT EXISTS 'awaiting_validation';

-- Update STATUS_TRANSLATIONS to include all missing statuses
-- This will ensure consistency between database states and UI translations

-- Create trigger to automatically activate follow-up system
CREATE OR REPLACE FUNCTION public.schedule_automatic_followups()
RETURNS TRIGGER AS $$
DECLARE
  followup_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Agendar follow-up de orçamento quando solicitado
  IF TG_OP = 'UPDATE' AND OLD.requires_quotation IS DISTINCT FROM NEW.requires_quotation 
     AND NEW.requires_quotation = true AND NEW.assigned_supplier_id IS NOT NULL THEN
    
    followup_date := public.calculate_next_followup(
      'quotation_reminder', 
      NEW.priority, 
      0, 
      COALESCE(NEW.quotation_requested_at, now())
    );
    
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
  
  -- Agendar confirmação de data quando aceite
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status = 'accepted' AND NEW.scheduled_start_date IS NULL THEN
    
    INSERT INTO public.follow_up_schedules (
      assistance_id, supplier_id, follow_up_type, priority,
      scheduled_for, metadata
    ) VALUES (
      NEW.id, NEW.assigned_supplier_id, 'date_confirmation', NEW.priority,
      now() + interval '24 hours',
      jsonb_build_object('accepted_at', now())
    );
  END IF;
  
  -- Agendar lembrete véspera quando data definida
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
    
    -- Definir data esperada de conclusão (se não definida)
    IF NEW.expected_completion_date IS NULL THEN
      UPDATE public.assistances 
      SET expected_completion_date = NEW.scheduled_start_date + 
        COALESCE(NEW.estimated_duration_hours || ' hours', '8 hours')::INTERVAL
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  -- Agendar lembretes de conclusão
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Activate the trigger on the assistances table
DROP TRIGGER IF EXISTS trigger_schedule_automatic_followups ON public.assistances;
CREATE TRIGGER trigger_schedule_automatic_followups
AFTER UPDATE ON public.assistances
FOR EACH ROW
EXECUTE FUNCTION public.schedule_automatic_followups();

-- Create cron job for processing follow-ups every 15 minutes
SELECT cron.schedule(
  'process-followups-every-15min',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/process-followups',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw"}'::jsonb,
        body:=concat('{"scheduled_run": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);