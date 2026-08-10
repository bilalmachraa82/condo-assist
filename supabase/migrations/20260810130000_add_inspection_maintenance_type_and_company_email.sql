-- Add the two inspection fields requested by Luvimg:
-- a dedicated company email and the elevator maintenance type.

ALTER TABLE public.building_inspections
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS maintenance_type text;

ALTER TABLE public.building_inspections
  DROP CONSTRAINT IF EXISTS building_inspections_maintenance_type_check,
  ADD CONSTRAINT building_inspections_maintenance_type_check
    CHECK (maintenance_type IS NULL OR maintenance_type IN ('simples', 'completa'));

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
    bi.updated_at,
    bi.company_email,
    bi.maintenance_type
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
  END AS status,
  l.company_email,
  l.maintenance_type
FROM public.buildings b
CROSS JOIN public.inspection_categories c
LEFT JOIN latest l ON l.building_id = b.id AND l.category_id = c.id
WHERE b.is_active = true AND c.is_active = true;
