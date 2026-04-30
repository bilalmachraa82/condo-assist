-- Schedule daily insurance alerts digest (08:30 Lisbon = 07:30 UTC)
SELECT cron.unschedule('insurance-alerts-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'insurance-alerts-daily'
);

SELECT cron.schedule(
  'insurance-alerts-daily',
  '30 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/insurance-alerts-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw'
    ),
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);