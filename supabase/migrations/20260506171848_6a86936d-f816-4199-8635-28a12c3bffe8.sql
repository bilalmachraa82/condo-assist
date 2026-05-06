
-- 1) Inspeção de Gás: 5 anos + recálculo retroativo
UPDATE public.inspection_categories SET validity_years = 5 WHERE key = 'gas';
UPDATE public.building_inspections
SET next_due_date = (inspection_date + INTERVAL '5 years')::date
WHERE category_id = (SELECT id FROM public.inspection_categories WHERE key = 'gas');

-- 2) Pendências email: migrar estados intermédios para aguarda_resposta + alterar default
UPDATE public.email_pendencies
SET status = 'aguarda_resposta'
WHERE status IN ('aberto','escalado','resposta_recebida','precisa_decisao');

ALTER TABLE public.email_pendencies ALTER COLUMN status SET DEFAULT 'aguarda_resposta'::pendency_status;

-- 3) Knowledge: rename categoria geral -> empresas_limpeza
UPDATE public.knowledge_articles SET category = 'empresas_limpeza' WHERE category = 'geral';

-- 4) Frações por edifício + inclusão/exclusão por apólice
CREATE TABLE IF NOT EXISTS public.building_fractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  label text NOT NULL,
  permillage numeric,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, label)
);

ALTER TABLE public.building_fractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage building fractions"
ON public.building_fractions FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_building_fractions_building ON public.building_fractions(building_id);

CREATE TRIGGER update_building_fractions_updated_at
BEFORE UPDATE ON public.building_fractions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.insurance_fraction_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_id uuid NOT NULL REFERENCES public.building_insurances(id) ON DELETE CASCADE,
  fraction_id uuid NOT NULL REFERENCES public.building_fractions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'included' CHECK (status IN ('included','excluded')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (insurance_id, fraction_id)
);

ALTER TABLE public.insurance_fraction_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage insurance fraction status"
ON public.insurance_fraction_status FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ifs_insurance ON public.insurance_fraction_status(insurance_id);

-- 5) Cobertura "acidentes_trabalho": tabela já é text livre, não há enum a alterar.
