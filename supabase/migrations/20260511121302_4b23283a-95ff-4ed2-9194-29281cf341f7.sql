-- 1) Remover constraint antigo PRIMEIRO para permitir o UPDATE
ALTER TABLE public.building_inspections
  DROP CONSTRAINT IF EXISTS building_inspections_result_check;

-- 2) Migrar valores antigos
UPDATE public.building_inspections
SET result = CASE result
  WHEN 'ok' THEN 'aprovado'
  WHEN 'nok_minor' THEN 'aprovado_clausulas'
  WHEN 'nok_major' THEN 'chumbou'
  WHEN 'pending_works' THEN 'chumbou'
  WHEN 'pending' THEN 'pendente_relatorio'
  ELSE result
END
WHERE result IN ('ok','nok_minor','nok_major','pending_works','pending');

-- 3) Aplicar novo constraint
ALTER TABLE public.building_inspections
  ADD CONSTRAINT building_inspections_result_check
  CHECK (result IN ('aprovado','aprovado_clausulas','pendente_relatorio','chumbou'));

ALTER TABLE public.building_inspections
  ALTER COLUMN result SET DEFAULT 'aprovado';

-- 4) View
DROP VIEW IF EXISTS public.building_inspection_status;
CREATE VIEW public.building_inspection_status AS
WITH latest AS (
  SELECT DISTINCT ON (bi.building_id, bi.category_id)
    bi.id, bi.building_id, bi.category_id, bi.inspection_date, bi.result,
    bi.next_due_date, bi.company_name, bi.company_contact, bi.certificate_url,
    bi.notes, bi.created_by, bi.created_at, bi.updated_at
  FROM public.building_inspections bi
  ORDER BY bi.building_id, bi.category_id, bi.inspection_date DESC
)
SELECT
  b.id AS building_id, b.code AS building_code, b.name AS building_name,
  b.elevator_count,
  c.id AS category_id, c.key AS category_key, c.label AS category_label,
  c.color AS category_color, c.icon AS category_icon, c.validity_years,
  l.id AS inspection_id, l.inspection_date, l.next_due_date, l.result,
  l.certificate_url, l.company_name, l.company_contact, l.notes,
  CASE WHEN l.next_due_date IS NULL THEN NULL::int
       ELSE l.next_due_date - CURRENT_DATE END AS days_until_due,
  CASE
    WHEN l.id IS NULL THEN 'missing'
    WHEN l.result = 'pendente_relatorio' THEN 'pending'
    WHEN l.result = 'chumbou' THEN 'overdue'
    WHEN l.next_due_date < CURRENT_DATE THEN 'overdue'
    WHEN l.next_due_date <= (CURRENT_DATE + 15) THEN 'due_soon_15'
    WHEN l.next_due_date <= (CURRENT_DATE + 30) THEN 'due_soon_30'
    ELSE 'ok'
  END AS status
FROM public.buildings b
CROSS JOIN public.inspection_categories c
LEFT JOIN latest l ON l.building_id = b.id AND l.category_id = c.id
WHERE b.is_active = true AND c.is_active = true;

-- 5) Apólice em building_insurances
ALTER TABLE public.building_insurances
  ADD COLUMN IF NOT EXISTS policy_path text;

-- 6) key_handovers
ALTER TABLE public.key_handovers
  ADD COLUMN IF NOT EXISTS picked_up_collaborator text,
  ADD COLUMN IF NOT EXISTS returned_collaborator text,
  ADD COLUMN IF NOT EXISTS company_name text;

-- 7) Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-documents', 'inspection-documents', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance-documents', 'insurance-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read inspection docs" ON storage.objects;
CREATE POLICY "Admins read inspection docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'inspection-documents' AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins write inspection docs" ON storage.objects;
CREATE POLICY "Admins write inspection docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspection-documents' AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete inspection docs" ON storage.objects;
CREATE POLICY "Admins delete inspection docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'inspection-documents' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read insurance docs" ON storage.objects;
CREATE POLICY "Admins read insurance docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'insurance-documents' AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins write insurance docs" ON storage.objects;
CREATE POLICY "Admins write insurance docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'insurance-documents' AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete insurance docs" ON storage.objects;
CREATE POLICY "Admins delete insurance docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'insurance-documents' AND public.is_admin(auth.uid()));