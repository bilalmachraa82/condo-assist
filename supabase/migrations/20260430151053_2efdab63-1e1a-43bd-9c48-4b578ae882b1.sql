-- =====================================================================
-- INSURANCES — schema, view, settings, seed from knowledge_articles
-- =====================================================================

-- 1) Tabela principal
CREATE TABLE IF NOT EXISTS public.building_insurances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  policy_number text,
  insurer text,
  broker text,
  contact text,
  coverage_type text NOT NULL DEFAULT 'multirisco' CHECK (coverage_type IN ('multirisco','partes_comuns','outro')),
  fractions_included text,
  observations text,
  renewal_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_building_insurances_building ON public.building_insurances(building_id);
CREATE INDEX IF NOT EXISTS idx_building_insurances_renewal  ON public.building_insurances(renewal_date);

-- updated_at trigger (reusa função existente)
DROP TRIGGER IF EXISTS trg_building_insurances_updated ON public.building_insurances;
CREATE TRIGGER trg_building_insurances_updated
BEFORE UPDATE ON public.building_insurances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.building_insurances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage building insurances"
  ON public.building_insurances FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated can view building insurances"
  ON public.building_insurances FOR SELECT TO authenticated
  USING (true);

-- 2) Tabela de log de alertas (idempotência)
CREATE TABLE IF NOT EXISTS public.insurance_alerts_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_id uuid,
  building_id uuid,
  alert_type text NOT NULL,
  alert_date date NOT NULL DEFAULT CURRENT_DATE,
  recipient_email text NOT NULL,
  metadata jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_alerts_lookup
  ON public.insurance_alerts_log(building_id, alert_type, alert_date);

ALTER TABLE public.insurance_alerts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view insurance alerts log"
  ON public.insurance_alerts_log FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service can insert insurance alerts log"
  ON public.insurance_alerts_log FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- 3) View de status (LEFT JOIN — mostra também prédios sem seguro)
CREATE OR REPLACE VIEW public.building_insurance_status
WITH (security_invoker=on) AS
WITH latest AS (
  SELECT DISTINCT ON (building_id)
    id, building_id, policy_number, insurer, broker, contact,
    coverage_type, fractions_included, observations, renewal_date,
    created_at, updated_at
  FROM public.building_insurances
  ORDER BY building_id, renewal_date DESC NULLS LAST, created_at DESC
)
SELECT
  b.id   AS building_id,
  b.code AS building_code,
  b.name AS building_name,
  l.id   AS insurance_id,
  l.policy_number,
  l.insurer,
  l.broker,
  l.contact,
  l.coverage_type,
  l.fractions_included,
  l.observations,
  l.renewal_date,
  CASE
    WHEN l.renewal_date IS NULL THEN NULL
    ELSE (l.renewal_date - CURRENT_DATE)
  END AS days_until_renewal,
  CASE
    WHEN l.id IS NULL THEN 'missing'
    WHEN l.renewal_date IS NULL THEN 'missing'
    WHEN l.renewal_date < CURRENT_DATE THEN 'overdue'
    WHEN (l.renewal_date - CURRENT_DATE) <= 30 THEN 'due_soon_30'
    ELSE 'ok'
  END AS status
FROM public.buildings b
LEFT JOIN latest l ON l.building_id = b.id
WHERE b.is_active = true;

-- 4) App settings (idempotente)
INSERT INTO public.app_settings (key, value, category, description)
VALUES
  ('insurance_alerts_enabled', 'true'::jsonb, 'insurances', 'Activa o digest diário de alertas de seguros'),
  ('insurance_alerts_recipients', '["geral@luvimg.com"]'::jsonb, 'insurances', 'Destinatários do digest de alertas de seguros'),
  ('insurance_overdue_repeat_days', '7'::jsonb, 'insurances', 'De quantos em quantos dias o alerta de seguro vencido é repetido')
ON CONFLICT (key) DO NOTHING;

-- 5) Seed a partir de knowledge_articles (categoria 'seguros')
DELETE FROM public.building_insurances WHERE notes LIKE '[KB-IMPORT]%';

INSERT INTO public.building_insurances
  (building_id, policy_number, insurer, broker, contact, coverage_type,
   fractions_included, observations, renewal_date, notes)
SELECT
  ka.building_id,
  NULLIF(trim((regexp_match(ka.content, 'N[ºo°]?\s*Apólice:\*?\*?\s*([^\n]+)'))[1]), '-'),
  NULLIF(trim((regexp_match(ka.content, 'Companhia:\*?\*?\s*([^\n]+)'))[1]), '-'),
  NULLIF(trim((regexp_match(ka.content, 'Mediador:\*?\*?\s*([^\n]+)'))[1]), '-'),
  NULLIF(trim((regexp_match(ka.content, 'Contacto:\*?\*?\s*([^\n]+)'))[1]), '-'),
  CASE
    WHEN ka.content ~* 'Multirrisco:\s*\*?\*?\s*X' THEN 'multirisco'
    WHEN ka.content ~* 'Partes Comuns:\s*\*?\*?\s*X' THEN 'partes_comuns'
    ELSE 'outro'
  END,
  NULLIF(trim((regexp_match(ka.content, 'Fracções Incluídas:\*?\*?\s*([^\n]+)'))[1]), '-'),
  NULLIF(trim((regexp_match(ka.content, '### Observações\s*\n+([\s\S]+?)(?:\n##|$)'))[1]), ''),
  CASE
    WHEN (regexp_match(ka.content, 'Data Renovação:\*?\*?\s*(\d{2}/\d{2}/\d{4})')) IS NOT NULL
    THEN to_date((regexp_match(ka.content, 'Data Renovação:\*?\*?\s*(\d{2}/\d{2}/\d{4})'))[1], 'DD/MM/YYYY')
    ELSE NULL
  END,
  '[KB-IMPORT] Seguro'
FROM public.knowledge_articles ka
WHERE ka.category = 'seguros'
  AND ka.building_id IS NOT NULL;