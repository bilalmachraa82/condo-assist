-- Etapa 1: criar suppliers em falta a partir da KB
WITH parsed_all AS (
  SELECT
    NULLIF(TRIM((regexp_match(content, '\*\*Empresa:\*\*\s*([^\n\r]+)', 'i'))[1]), '') AS empresa,
    NULLIF(TRIM(SPLIT_PART(SPLIT_PART((regexp_match(content, '\*\*Email:\*\*\s*([^\n\r]+)', 'i'))[1], '//', 1), ',', 1)), '') AS email,
    NULLIF(TRIM((regexp_match(content, '\*\*Telefone:\*\*\s*([^\n\r]+)', 'i'))[1]), '') AS telefone
  FROM knowledge_articles
  WHERE category = 'elevadores' AND building_id IS NOT NULL
),
unique_companies AS (
  SELECT DISTINCT ON (LOWER(TRIM(empresa)))
    empresa, email, telefone
  FROM parsed_all
  WHERE empresa IS NOT NULL AND email IS NOT NULL
)
INSERT INTO suppliers (name, email, phone, specialization, is_active)
SELECT uc.empresa, uc.email, uc.telefone, 'Elevadores', true
FROM unique_companies uc
WHERE NOT EXISTS (
  SELECT 1 FROM suppliers s
  WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(uc.empresa))
     OR (s.email IS NOT NULL AND LOWER(TRIM(s.email)) = LOWER(TRIM(uc.email)))
);

-- Etapa 2: associar buildings.elevator_supplier_id
WITH parsed_per_building AS (
  SELECT
    ka.building_id,
    NULLIF(TRIM((regexp_match(ka.content, '\*\*Empresa:\*\*\s*([^\n\r]+)', 'i'))[1]), '') AS empresa,
    NULLIF(TRIM(SPLIT_PART(SPLIT_PART((regexp_match(ka.content, '\*\*Email:\*\*\s*([^\n\r]+)', 'i'))[1], '//', 1), ',', 1)), '') AS email
  FROM knowledge_articles ka
  WHERE ka.category = 'elevadores' AND ka.building_id IS NOT NULL
),
matched AS (
  SELECT DISTINCT ON (p.building_id)
    p.building_id,
    s.id AS supplier_id
  FROM parsed_per_building p
  JOIN suppliers s ON
    (p.empresa IS NOT NULL AND LOWER(TRIM(s.name)) = LOWER(TRIM(p.empresa)))
    OR (p.email IS NOT NULL AND s.email IS NOT NULL AND LOWER(TRIM(s.email)) = LOWER(TRIM(p.email)))
  ORDER BY p.building_id,
    CASE WHEN s.specialization ILIKE '%elevad%' THEN 0 ELSE 1 END,
    s.created_at ASC
)
UPDATE buildings b
SET elevator_supplier_id = m.supplier_id,
    updated_at = now()
FROM matched m
WHERE b.id = m.building_id
  AND (b.elevator_supplier_id IS NULL OR b.elevator_supplier_id <> m.supplier_id);