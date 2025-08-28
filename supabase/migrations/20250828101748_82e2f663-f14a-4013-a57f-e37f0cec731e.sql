-- Move extensions from public schema to extensions schema for better security
-- First, drop the extensions from public and recreate them in the proper schema

-- Drop existing cron jobs first
SELECT cron.unschedule('process-followups-automation');
SELECT cron.unschedule('cleanup-old-followups');

-- Drop extensions from public schema
DROP EXTENSION IF EXISTS pg_cron;
DROP EXTENSION IF EXISTS pg_net;

-- Create extensions in the extensions schema (proper location)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate the cron jobs with proper schema references
SELECT cron.schedule(
  'process-followups-automation',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/process-followups',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Recreate daily cleanup job
SELECT cron.schedule(
  'cleanup-old-followups',
  '0 2 * * *', -- Daily at 2 AM
  $$
  DELETE FROM public.follow_up_schedules 
  WHERE created_at < (now() - interval '30 days') 
    AND status IN ('sent', 'failed', 'cancelled');
  $$
);