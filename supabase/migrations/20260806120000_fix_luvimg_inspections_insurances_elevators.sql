-- LUVIMG operational fixes:
-- 1) expose every independent insurance policy instead of only the latest per building;
-- 2) allow elevator records without a historical date and pending elevators without a next date;
-- 3) make per-policy insurance alert lookups efficient and concurrency-safe per day.

ALTER TABLE public.building_inspections
  ALTER COLUMN inspection_date DROP NOT NULL,
  ALTER COLUMN next_due_date DROP NOT NULL;

-- Previous alert logs were stored once per recipient. Keep a single daily claim per
-- policy/alert so overlapping cron executions cannot send the same policy twice.
DELETE FROM public.insurance_alerts_log older
USING public.insurance_alerts_log newer
WHERE older.insurance_id IS NOT NULL
  AND older.insurance_id = newer.insurance_id
  AND older.alert_type = newer.alert_type
  AND older.alert_date = newer.alert_date
  AND older.ctid > newer.ctid;

CREATE INDEX IF NOT EXISTS idx_insurance_alerts_policy_lookup
  ON public.insurance_alerts_log (insurance_id, alert_type, alert_date DESC)
  WHERE insurance_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_insurance_alerts_policy_daily
  ON public.insurance_alerts_log (insurance_id, alert_type, alert_date)
  WHERE insurance_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_inspection_next_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_years integer;
  v_category_key text;
BEGIN
  SELECT validity_years, key
    INTO v_years, v_category_key
  FROM public.inspection_categories
  WHERE id = NEW.category_id;

  IF v_category_key = 'elevador' THEN
    NEW.inspection_date := NULL;
    IF NEW.result <> 'pendente_relatorio' AND NEW.next_due_date IS NULL THEN
      RAISE EXCEPTION 'A próxima data é obrigatória para elevadores não pendentes';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.inspection_date IS NULL THEN
    RAISE EXCEPTION 'A data de inspeção é obrigatória para esta categoria';
  END IF;

  IF v_years IS NULL THEN
    v_years := 1;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.next_due_date := NEW.inspection_date + (v_years || ' years')::interval;
  ELSIF NEW.next_due_date IS NULL
     OR NEW.inspection_date IS DISTINCT FROM OLD.inspection_date
     OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    NEW.next_due_date := NEW.inspection_date + (v_years || ' years')::interval;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE VIEW public.building_inspection_status
WITH (security_invoker = true) AS
WITH latest AS (
  SELECT DISTINCT ON (bi.building_id, bi.category_id)
    bi.id,
    bi.building_id,
    bi.category_id,
    bi.inspection_date,
    bi.result,
    bi.next_due_date,
    bi.company_name,
    bi.company_contact,
    bi.certificate_url,
    bi.notes,
    bi.created_by,
    bi.created_at,
    bi.updated_at
  FROM public.building_inspections bi
  ORDER BY
    bi.building_id,
    bi.category_id,
    bi.inspection_date DESC NULLS FIRST,
    bi.created_at DESC
)
SELECT
  b.id AS building_id,
  b.code AS building_code,
  b.name AS building_name,
  b.elevator_count,
  c.id AS category_id,
  c.key AS category_key,
  c.label AS category_label,
  c.color AS category_color,
  c.icon AS category_icon,
  c.validity_years,
  l.id AS inspection_id,
  l.inspection_date,
  l.next_due_date,
  l.result,
  l.certificate_url,
  l.company_name,
  l.company_contact,
  l.notes,
  CASE
    WHEN l.next_due_date IS NULL THEN NULL::integer
    ELSE l.next_due_date - CURRENT_DATE
  END AS days_until_due,
  CASE
    WHEN l.id IS NULL THEN 'missing'
    WHEN l.result = 'pendente_relatorio' THEN 'pending'
    WHEN l.result = 'chumbou' THEN 'overdue'
    WHEN l.next_due_date < CURRENT_DATE THEN 'overdue'
    WHEN l.next_due_date <= CURRENT_DATE + 15 THEN 'due_soon_15'
    WHEN l.next_due_date <= CURRENT_DATE + 30 THEN 'due_soon_30'
    ELSE 'ok'
  END AS status
FROM public.buildings b
CROSS JOIN public.inspection_categories c
LEFT JOIN latest l ON l.building_id = b.id AND l.category_id = c.id
WHERE b.is_active = true AND c.is_active = true;

CREATE OR REPLACE VIEW public.building_insurance_status
WITH (security_invoker = true) AS
SELECT
  b.id AS building_id,
  b.code AS building_code,
  b.name AS building_name,
  i.id AS insurance_id,
  i.policy_number,
  i.insurer,
  i.broker,
  i.contact,
  i.coverage_type,
  i.fractions_included,
  i.observations,
  i.renewal_date,
  CASE
    WHEN i.renewal_date IS NULL THEN NULL
    ELSE i.renewal_date - CURRENT_DATE
  END AS days_until_renewal,
  CASE
    WHEN i.id IS NULL THEN 'missing'
    WHEN i.renewal_date IS NULL THEN 'missing'
    WHEN i.renewal_date < CURRENT_DATE THEN 'overdue'
    WHEN i.renewal_date - CURRENT_DATE <= 30 THEN 'due_soon_30'
    ELSE 'ok'
  END AS status,
  i.policy_path
FROM public.buildings b
LEFT JOIN public.building_insurances i ON i.building_id = b.id
WHERE b.is_active = true;

COMMENT ON VIEW public.building_insurance_status IS
  'One row per insurance policy, plus one missing row for active buildings without insurance.';

-- The original insurance schedule sent only the apikey header. Edge Functions verify
-- the bearer token before invoking the handler, so refresh the existing job with the
-- same anon JWT in the Authorization header as well.
DO $$ BEGIN
  PERFORM cron.unschedule('insurance-alerts-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'insurance-alerts-daily',
  '30 7 * * *',
  $schedule$
  SELECT net.http_post(
    url := 'https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/insurance-alerts-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcGl0bnBtcGxlbWZvenZ0YmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1Mjg2MjIsImV4cCI6MjA2OTEwNDYyMn0.6p3kLNxA9DysjcySJL4bwYdfepg-MKP-1K-B2GNyjvw'
    ),
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $schedule$
);
