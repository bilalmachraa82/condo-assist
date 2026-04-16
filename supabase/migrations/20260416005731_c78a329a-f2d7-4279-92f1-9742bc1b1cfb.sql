-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Cleanup rate limit entries older than 24 hours (daily at 3 AM UTC)
SELECT cron.schedule(
  'cleanup-rate-limit',
  '0 3 * * *',
  $$DELETE FROM public.agent_api_rate_limit WHERE request_at < now() - interval '24 hours'$$
);

-- Cleanup expired idempotency keys (daily at 4 AM UTC)
SELECT cron.schedule(
  'cleanup-idempotency',
  '0 4 * * *',
  $$UPDATE public.assistances SET idempotency_key = NULL, idempotency_key_expires_at = NULL WHERE idempotency_key_expires_at < now();
UPDATE public.email_logs SET idempotency_key = NULL, idempotency_key_expires_at = NULL WHERE idempotency_key_expires_at < now();$$
);