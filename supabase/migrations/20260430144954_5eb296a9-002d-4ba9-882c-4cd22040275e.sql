
-- ============ INSPECTION CATEGORIES ============
CREATE TABLE public.inspection_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  validity_years integer NOT NULL DEFAULT 1,
  alert_days integer[] NOT NULL DEFAULT ARRAY[30, 15],
  legal_reference text,
  color text NOT NULL DEFAULT '#3b82f6',
  icon text NOT NULL DEFAULT 'ShieldCheck',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inspection categories"
  ON public.inspection_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage inspection categories"
  ON public.inspection_categories FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_inspection_categories_updated_at
  BEFORE UPDATE ON public.inspection_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed
INSERT INTO public.inspection_categories (key, label, description, validity_years, legal_reference, color, icon, display_order) VALUES
  ('coluna_electrica', 'Coluna Eléctrica', 'Inspeção/reaperto da coluna eléctrica do edifício', 3, 'DL 226/2005', '#f59e0b', 'Zap', 1),
  ('gas', 'Gás', 'Inspeção da instalação de gás', 3, 'Portaria 362/2000', '#ef4444', 'Flame', 2),
  ('elevador', 'Elevador', 'Inspeção periódica de elevadores', 2, 'DL 320/2002', '#3b82f6', 'ArrowUpDown', 3),
  ('extintor', 'Extintores', 'Manutenção e inspeção de extintores', 1, 'NP 4413', '#dc2626', 'Flame', 4),
  ('avac', 'AVAC', 'Aquecimento, ventilação e ar condicionado', 2, 'DL 118/2013', '#06b6d4', 'Wind', 5),
  ('para_raios', 'Pára-raios', 'Inspeção do sistema de pára-raios', 3, 'NP 4426', '#8b5cf6', 'Cloud', 6),
  ('ite', 'ITE - Inspeção Técnica', 'Inspeção técnica do edifício', 8, 'Lei 31/2012', '#10b981', 'Building2', 7);

-- ============ BUILDING INSPECTIONS ============
CREATE TABLE public.building_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.inspection_categories(id) ON DELETE RESTRICT,
  inspection_date date NOT NULL,
  result text NOT NULL DEFAULT 'ok' CHECK (result IN ('ok','nok_minor','nok_major','pending_works')),
  next_due_date date NOT NULL,
  company_name text,
  company_contact text,
  certificate_url text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_building_inspections_lookup
  ON public.building_inspections (building_id, category_id, inspection_date DESC);
CREATE INDEX idx_building_inspections_next_due
  ON public.building_inspections (next_due_date);

ALTER TABLE public.building_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage building inspections"
  ON public.building_inspections FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_building_inspections_updated_at
  BEFORE UPDATE ON public.building_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-calc next_due_date
CREATE OR REPLACE FUNCTION public.set_inspection_next_due()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_years integer;
BEGIN
  SELECT validity_years INTO v_years FROM public.inspection_categories WHERE id = NEW.category_id;
  IF v_years IS NULL THEN v_years := 1; END IF;
  IF NEW.next_due_date IS NULL OR TG_OP = 'INSERT' OR NEW.inspection_date <> OLD.inspection_date OR NEW.category_id <> OLD.category_id THEN
    NEW.next_due_date := NEW.inspection_date + (v_years || ' years')::interval;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_building_inspections_set_next_due
  BEFORE INSERT OR UPDATE ON public.building_inspections
  FOR EACH ROW EXECUTE FUNCTION public.set_inspection_next_due();

-- ============ ALERTS LOG ============
CREATE TABLE public.inspection_alerts_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES public.building_inspections(id) ON DELETE CASCADE,
  building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.inspection_categories(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('30d','15d','overdue','missing')),
  alert_date date NOT NULL DEFAULT CURRENT_DATE,
  recipient_email text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  UNIQUE (inspection_id, alert_type, alert_date),
  UNIQUE (building_id, category_id, alert_type, alert_date)
);

ALTER TABLE public.inspection_alerts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts log"
  ON public.inspection_alerts_log FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Service can insert alerts log"
  ON public.inspection_alerts_log FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

-- ============ STATUS VIEW ============
CREATE OR REPLACE VIEW public.building_inspection_status AS
WITH active_buildings AS (
  SELECT id, code, name FROM public.buildings WHERE is_active = true
),
latest AS (
  SELECT DISTINCT ON (bi.building_id, bi.category_id)
    bi.building_id, bi.category_id, bi.id AS inspection_id, bi.inspection_date,
    bi.next_due_date, bi.result, bi.company_name, bi.company_contact, bi.notes
  FROM public.building_inspections bi
  ORDER BY bi.building_id, bi.category_id, bi.inspection_date DESC
)
SELECT
  b.id AS building_id, b.code AS building_code, b.name AS building_name,
  c.id AS category_id, c.key AS category_key, c.label AS category_label,
  c.color AS category_color, c.icon AS category_icon, c.validity_years,
  l.inspection_id, l.inspection_date, l.next_due_date, l.result,
  l.company_name, l.company_contact, l.notes,
  CASE
    WHEN l.next_due_date IS NULL THEN NULL
    ELSE (l.next_due_date - CURRENT_DATE)
  END AS days_until_due,
  CASE
    WHEN l.inspection_id IS NULL THEN 'missing'
    WHEN l.next_due_date < CURRENT_DATE THEN 'overdue'
    WHEN l.next_due_date <= CURRENT_DATE + INTERVAL '15 days' THEN 'due_soon_15'
    WHEN l.next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon_30'
    ELSE 'ok'
  END AS status
FROM active_buildings b
CROSS JOIN public.inspection_categories c
LEFT JOIN latest l ON l.building_id = b.id AND l.category_id = c.id
WHERE c.is_active = true;

GRANT SELECT ON public.building_inspection_status TO authenticated;

-- ============ APP SETTINGS DEFAULTS ============
INSERT INTO public.app_settings (key, value, category, description) VALUES
  ('inspection_alerts_enabled', 'true'::jsonb, 'inspections', 'Alertas de inspeção activos'),
  ('inspection_alerts_recipients', '["geral@luvimg.com"]'::jsonb, 'inspections', 'Destinatários dos emails de alerta'),
  ('inspection_alerts_days', '[30, 15]'::jsonb, 'inspections', 'Dias antes do vencimento para enviar alerta'),
  ('inspection_overdue_repeat_days', '7'::jsonb, 'inspections', 'Repetir alerta de vencido a cada N dias')
ON CONFLICT (key) DO NOTHING;
