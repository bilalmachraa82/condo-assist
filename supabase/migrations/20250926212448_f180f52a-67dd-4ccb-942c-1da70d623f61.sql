-- Configure cron jobs for automated notifications and follow-ups
-- This ensures the complete pipeline runs automatically

-- First enable the required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- 1. Setup cron job for processing follow-ups (every 10 minutes)
SELECT cron.schedule(
  'process-followups-automated',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/process-followups',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw"}'::jsonb,
    body := '{"mode": "due"}'::jsonb
  ) as request_id;
  $$
);

-- 2. Setup cron job for processing escalation notifications (every 15 minutes)
SELECT cron.schedule(
  'process-notifications-automated',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/process-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 3. Setup cron job for generating notifications from overdue assistances (every 20 minutes)
SELECT cron.schedule(
  'schedule-assistance-reminders-automated',
  '*/20 * * * *',
  $$
  SELECT public.schedule_assistance_reminders();
  $$
);

-- 4. Create logging function for cron job monitoring
CREATE OR REPLACE FUNCTION public.log_cron_execution(job_name text, success boolean, details text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.activity_log (
    action,
    details,
    metadata
  ) VALUES (
    'cron_job_execution',
    format('Cron job "%s" %s', job_name, CASE WHEN success THEN 'succeeded' ELSE 'failed' END),
    jsonb_build_object(
      'job_name', job_name,
      'success', success,
      'details', details,
      'executed_at', now()
    )
  );
END;
$function$;