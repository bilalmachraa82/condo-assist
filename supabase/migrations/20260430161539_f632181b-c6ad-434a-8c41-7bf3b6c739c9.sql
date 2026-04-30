-- Enum for pendency status
CREATE TYPE public.pendency_status AS ENUM (
  'aberto',
  'aguarda_resposta',
  'resposta_recebida',
  'precisa_decisao',
  'escalado',
  'resolvido',
  'cancelado'
);

-- Main pendencies table
CREATE TABLE public.email_pendencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  building_id UUID NOT NULL,
  assistance_id UUID,
  supplier_id UUID,
  status public.pendency_status NOT NULL DEFAULT 'aberto',
  priority public.assistance_priority NOT NULL DEFAULT 'normal',
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_pendencies_building ON public.email_pendencies(building_id);
CREATE INDEX idx_email_pendencies_assistance ON public.email_pendencies(assistance_id);
CREATE INDEX idx_email_pendencies_supplier ON public.email_pendencies(supplier_id);
CREATE INDEX idx_email_pendencies_status ON public.email_pendencies(status);
CREATE INDEX idx_email_pendencies_assigned ON public.email_pendencies(assigned_to);
CREATE INDEX idx_email_pendencies_last_activity ON public.email_pendencies(last_activity_at DESC);

ALTER TABLE public.email_pendencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email pendencies"
  ON public.email_pendencies FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Notes table (append-only feed: manual notes + status changes)
CREATE TABLE public.email_pendency_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pendency_id UUID NOT NULL REFERENCES public.email_pendencies(id) ON DELETE CASCADE,
  author_id UUID,
  body TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'manual',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pendency_notes_pendency ON public.email_pendency_notes(pendency_id, created_at DESC);

ALTER TABLE public.email_pendency_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pendency notes"
  ON public.email_pendency_notes FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Attachments table
CREATE TABLE public.email_pendency_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pendency_id UUID NOT NULL REFERENCES public.email_pendencies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  kind TEXT NOT NULL DEFAULT 'email_pdf',
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pendency_attachments_pendency ON public.email_pendency_attachments(pendency_id, created_at DESC);

ALTER TABLE public.email_pendency_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pendency attachments"
  ON public.email_pendency_attachments FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger: update updated_at on pendencies
CREATE TRIGGER update_email_pendencies_updated_at
  BEFORE UPDATE ON public.email_pendencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function: bump last_activity_at when a note or attachment is added
CREATE OR REPLACE FUNCTION public.bump_pendency_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_pendencies
  SET last_activity_at = now()
  WHERE id = NEW.pendency_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bump_activity_on_note
  AFTER INSERT ON public.email_pendency_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_pendency_activity();

CREATE TRIGGER bump_activity_on_attachment
  AFTER INSERT ON public.email_pendency_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_pendency_activity();

-- Function: log status changes as system notes + bump activity
CREATE OR REPLACE FUNCTION public.log_pendency_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.last_activity_at := now();
    INSERT INTO public.email_pendency_notes (pendency_id, author_id, body, note_type, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'Estado alterado: ' || OLD.status::text || ' → ' || NEW.status::text,
      'status_change',
      jsonb_build_object('from', OLD.status::text, 'to', NEW.status::text)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_status_change
  BEFORE UPDATE ON public.email_pendencies
  FOR EACH ROW
  EXECUTE FUNCTION public.log_pendency_status_change();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-pendencies', 'email-pendencies', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admin only
CREATE POLICY "Admins read pendency files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'email-pendencies' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins upload pendency files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'email-pendencies' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update pendency files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'email-pendencies' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete pendency files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'email-pendencies' AND public.is_admin(auth.uid()));