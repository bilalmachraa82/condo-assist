
-- 1. Buildings: elevator_count
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS elevator_count INTEGER NOT NULL DEFAULT 0;

-- 2. Building administrators (up to 5 enforced in UI)
CREATE TABLE IF NOT EXISTS public.building_administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  floor TEXT,
  role TEXT,
  notes TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_building_admins_building ON public.building_administrators(building_id);
ALTER TABLE public.building_administrators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage building administrators" ON public.building_administrators
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_bld_admins_updated BEFORE UPDATE ON public.building_administrators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Key handovers
CREATE TABLE IF NOT EXISTS public.key_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  picked_up_by_name TEXT NOT NULL,
  picked_up_by_phone TEXT,
  picked_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_by_name TEXT,
  returned_at TIMESTAMPTZ,
  purpose TEXT,
  notes TEXT,
  assistance_id UUID,
  supplier_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_keys_building ON public.key_handovers(building_id);
CREATE INDEX IF NOT EXISTS idx_keys_returned_at ON public.key_handovers(returned_at);
ALTER TABLE public.key_handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage key handovers" ON public.key_handovers
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_keys_updated BEFORE UPDATE ON public.key_handovers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Building documents + bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('building-documents', 'building-documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.building_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'outros',
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  document_date DATE,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bld_docs_building ON public.building_documents(building_id);
CREATE INDEX IF NOT EXISTS idx_bld_docs_category ON public.building_documents(category);
ALTER TABLE public.building_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage building documents" ON public.building_documents
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_bld_docs_updated BEFORE UPDATE ON public.building_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for building-documents (admins only)
CREATE POLICY "Admins read building documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'building-documents' AND is_admin(auth.uid()));
CREATE POLICY "Admins write building documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'building-documents' AND is_admin(auth.uid()));
CREATE POLICY "Admins update building documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'building-documents' AND is_admin(auth.uid()));
CREATE POLICY "Admins delete building documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'building-documents' AND is_admin(auth.uid()));

-- 5. Insurance claims
DO $$ BEGIN
  CREATE TYPE public.insurance_claim_status AS ENUM (
    'aberto','em_analise','aguarda_peritagem','peritagem_realizada',
    'aguarda_pagamento','pago','recusado','arquivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SEQUENCE IF NOT EXISTS public.insurance_claim_number_seq;

CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT NOT NULL UNIQUE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  insurance_id UUID REFERENCES public.building_insurances(id) ON DELETE SET NULL,
  assistance_id UUID,
  occurrence_date DATE,
  reported_date DATE,
  description TEXT NOT NULL,
  damage_location TEXT,
  estimated_amount NUMERIC(12,2),
  final_amount NUMERIC(12,2),
  status public.insurance_claim_status NOT NULL DEFAULT 'aberto',
  insurer_contact TEXT,
  insurer_claim_ref TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claims_building ON public.insurance_claims(building_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.insurance_claims(status);
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage insurance claims" ON public.insurance_claims
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto claim_number: YYYY-NNN
CREATE OR REPLACE FUNCTION public.set_insurance_claim_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.claim_number IS NULL OR NEW.claim_number = '' THEN
    next_num := nextval('public.insurance_claim_number_seq');
    NEW.claim_number := to_char(now(), 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_claims_set_number BEFORE INSERT ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_insurance_claim_number();

CREATE TABLE IF NOT EXISTS public.insurance_claim_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  kind TEXT NOT NULL DEFAULT 'outros',
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_att_claim ON public.insurance_claim_attachments(claim_id);
ALTER TABLE public.insurance_claim_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage claim attachments" ON public.insurance_claim_attachments
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.insurance_claim_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_notes_claim ON public.insurance_claim_notes(claim_id);
ALTER TABLE public.insurance_claim_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage claim notes" ON public.insurance_claim_notes
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Reuse building-documents bucket for claim attachments under claims/<claim_id>/
