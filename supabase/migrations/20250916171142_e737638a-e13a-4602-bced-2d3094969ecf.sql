-- Create cron job to process follow-ups every hour
-- Enable pg_cron extension first
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job to process follow-ups every hour
SELECT cron.schedule(
  'process-followups-hourly', 
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/process-followups',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Enable automatic trigger for follow-up creation when assistance status changes
DROP TRIGGER IF EXISTS schedule_automatic_followups_trigger ON public.assistances;
CREATE TRIGGER schedule_automatic_followups_trigger
  AFTER INSERT OR UPDATE ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_automatic_followups();

-- Create function to update status timestamps  
CREATE OR REPLACE FUNCTION public.update_assistance_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Update timestamps when status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.updated_at := now();
    
    -- Set specific timestamps based on status
    CASE NEW.status
      WHEN 'completed' THEN
        NEW.completed_date := COALESCE(NEW.completed_date, now());
      WHEN 'in_progress' THEN
        NEW.actual_start_date := COALESCE(NEW.actual_start_date, now());
      WHEN 'awaiting_quotation' THEN
        NEW.quotation_requested_at := COALESCE(NEW.quotation_requested_at, now());
        -- Set deadline based on priority if not set
        IF NEW.quotation_deadline IS NULL THEN
          NEW.quotation_deadline := CASE 
            WHEN NEW.priority = 'critical' THEN now() + interval '2 days'
            WHEN NEW.priority = 'urgent' THEN now() + interval '3 days'
            ELSE now() + interval '5 days'
          END;
        END IF;
      ELSE
        -- No specific action needed for other statuses
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for assistance timestamps
DROP TRIGGER IF EXISTS update_assistance_timestamps_trigger ON public.assistances;
CREATE TRIGGER update_assistance_timestamps_trigger
  BEFORE UPDATE ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_assistance_timestamps();