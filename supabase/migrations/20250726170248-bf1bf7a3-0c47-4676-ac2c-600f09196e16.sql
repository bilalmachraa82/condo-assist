-- Create app_settings table for storing global application settings
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view app settings" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings
INSERT INTO public.app_settings (key, value, category, description) VALUES
('company_name', '"Nome da Empresa"', 'company', 'Nome da empresa'),
('company_nif', '""', 'company', 'NIF da empresa'),
('company_address', '""', 'company', 'Endereço da empresa'),
('company_phone', '""', 'company', 'Telefone da empresa'),
('company_email', '""', 'company', 'Email da empresa'),
('default_response_deadline_hours', '24', 'system', 'Prazo padrão de resposta em horas'),
('quotation_validity_days', '30', 'system', 'Validade das cotações em dias'),
('auto_approve_quotations', 'false', 'system', 'Aprovação automática de cotações'),
('maintenance_mode', 'false', 'system', 'Modo de manutenção'),
('email_notifications_enabled', 'true', 'notifications', 'Notificações por email habilitadas'),
('auto_notify_suppliers', 'true', 'notifications', 'Notificar fornecedores automaticamente'),
('deadline_reminders_enabled', 'true', 'notifications', 'Lembretes de prazo habilitados');