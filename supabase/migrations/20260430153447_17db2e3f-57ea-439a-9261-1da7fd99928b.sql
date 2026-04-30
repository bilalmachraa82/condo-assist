UPDATE inspection_categories SET color = '#a855f7' WHERE key = 'gas';
UPDATE inspection_categories SET icon = 'FireExtinguisher' WHERE key = 'extintor';

DROP VIEW IF EXISTS public.building_inspection_status;
CREATE VIEW public.building_inspection_status AS
WITH latest AS (
  SELECT DISTINCT ON (building_id, category_id) *
  FROM public.building_inspections
  ORDER BY building_id, category_id, inspection_date DESC
)
SELECT
  b.id   AS building_id,
  b.code AS building_code,
  b.name AS building_name,
  c.id   AS category_id,
  c.key  AS category_key,
  c.label AS category_label,
  c.color AS category_color,
  c.icon  AS category_icon,
  c.validity_years,
  l.id   AS inspection_id,
  l.inspection_date,
  l.next_due_date,
  l.result,
  l.company_name,
  l.company_contact,
  l.notes,
  CASE WHEN l.next_due_date IS NULL THEN NULL
       ELSE (l.next_due_date - CURRENT_DATE) END AS days_until_due,
  CASE
    WHEN l.id IS NULL                          THEN 'missing'
    WHEN l.result = 'pending'                  THEN 'pending'
    WHEN l.next_due_date < CURRENT_DATE        THEN 'overdue'
    WHEN l.next_due_date <= CURRENT_DATE + 15  THEN 'due_soon_15'
    WHEN l.next_due_date <= CURRENT_DATE + 30  THEN 'due_soon_30'
    ELSE 'ok'
  END AS status
FROM public.buildings b
CROSS JOIN public.inspection_categories c
LEFT JOIN latest l ON l.building_id = b.id AND l.category_id = c.id
WHERE b.is_active = true AND c.is_active = true;