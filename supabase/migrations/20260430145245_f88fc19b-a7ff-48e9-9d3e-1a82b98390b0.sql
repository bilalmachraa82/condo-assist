
-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove any previous version
DO $$ BEGIN
  PERFORM cron.unschedule('inspection-alerts-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'inspection-alerts-daily',
  '0 7 * * *', -- 07:00 UTC = 08:00 Lisboa (07:00 in summer; close enough for daily digest)
  $$
  SELECT net.http_post(
    url := 'https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/inspection-alerts-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw'
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
