-- Enable pg_cron and pg_net extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to process follow-ups every 30 minutes
SELECT cron.schedule(
    'process-followups-job',
    '*/30 * * * *', -- every 30 minutes
    $$
    SELECT
        net.http_post(
            url:='https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/process-followups',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw"}'::jsonb,
            body:='{"scheduled": true}'::jsonb
        ) as request_id;
    $$
);

-- Create function to handle quotation deadlines and reminders
CREATE OR REPLACE FUNCTION public.handle_quotation_deadlines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Handle status changes to quotation_approved
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status = 'quotation_approved' THEN
    
    -- Change status to accepted for workflow continuity
    NEW.status := 'accepted';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS handle_quotation_deadlines_trigger ON public.assistances;
CREATE TRIGGER handle_quotation_deadlines_trigger
  BEFORE UPDATE ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_quotation_deadlines();