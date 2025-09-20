-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a scheduled job to process follow-ups every 15 minutes
SELECT cron.schedule(
  'process-followups-job',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/process-followups',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw"}'::jsonb,
    body := '{"mode": "due"}'::jsonb
  ) as request_id;
  $$
);