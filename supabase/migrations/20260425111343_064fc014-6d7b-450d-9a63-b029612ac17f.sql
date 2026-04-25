
-- Tabela para gerir pedidos de unsubscribe (RFC 8058 one-click)
CREATE TABLE public.email_unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_unsubscribes_email ON public.email_unsubscribes (email);
CREATE INDEX idx_email_unsubscribes_token ON public.email_unsubscribes (token);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler/gerir via UI; service role (edge functions) faz o resto
CREATE POLICY "Admins can view email_unsubscribes"
  ON public.email_unsubscribes
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete email_unsubscribes"
  ON public.email_unsubscribes
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- INSERT/UPDATE são feitos pela edge function com service role (bypassa RLS).
-- Não criamos políticas para isso para evitar inserts arbitrários a partir do cliente.

-- Trigger para updated_at
CREATE TRIGGER update_email_unsubscribes_updated_at
  BEFORE UPDATE ON public.email_unsubscribes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
