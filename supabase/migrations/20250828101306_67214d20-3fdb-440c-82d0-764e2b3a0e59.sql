-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule automatic follow-up processing every 15 minutes
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

-- Schedule daily cleanup of old follow-up schedules (older than 30 days and completed/failed)
SELECT cron.schedule(
  'cleanup-old-followups',
  '0 2 * * *', -- Daily at 2 AM
  $$
  DELETE FROM public.follow_up_schedules 
  WHERE created_at < (now() - interval '30 days') 
    AND status IN ('sent', 'failed', 'cancelled');
  $$
);

-- Add indexes for better performance on follow-up queries
CREATE INDEX IF NOT EXISTS idx_follow_up_schedules_status_scheduled 
ON public.follow_up_schedules (status, scheduled_for) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_follow_up_schedules_assistance_supplier 
ON public.follow_up_schedules (assistance_id, supplier_id);