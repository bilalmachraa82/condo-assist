-- Schedule pendency reminders processing every 30 minutes
SELECT cron.unschedule('pendency-reminders-every-30min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pendency-reminders-every-30min');

SELECT cron.schedule(
  'pendency-reminders-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/pendency-reminders-cron',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw"}'::jsonb,
    body := jsonb_build_object('trigger', 'cron', 'time', now())
  );
  $$
);