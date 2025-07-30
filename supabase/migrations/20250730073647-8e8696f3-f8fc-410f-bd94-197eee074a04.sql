-- Create default app settings with Portuguese keys and proper structure
INSERT INTO public.app_settings (key, category, value, description) VALUES
-- Empresa settings
('empresa_nome', 'empresa', '"Sua Empresa Lda."', 'Nome da empresa'),
('empresa_nif', 'empresa', '"123456789"', 'NIF da empresa'),
('empresa_morada', 'empresa', '"Rua Principal, 123\n1000-001 Lisboa"', 'Morada da empresa'),
('empresa_telefone', 'empresa', '"+351 210 000 000"', 'Telefone da empresa'),
('empresa_email', 'empresa', '"geral@suaempresa.pt"', 'Email da empresa'),
('empresa_website', 'empresa', '"https://www.suaempresa.pt"', 'Website da empresa'),

-- Sistema settings
('sistema_idioma', 'sistema', '"pt"', 'Idioma do sistema'),
('sistema_timezone', 'sistema', '"Europe/Lisbon"', 'Fuso horário'),
('sistema_formato_data', 'sistema', '"DD/MM/YYYY"', 'Formato de data'),
('sistema_moeda', 'sistema', '"EUR"', 'Moeda padrão'),
('sistema_backup_automatico', 'sistema', 'true', 'Backup automático ativo'),
('sistema_manutencao', 'sistema', 'false', 'Modo de manutenção'),

-- Notificações settings
('notificacoes_email_ativo', 'notificacoes', 'true', 'Notificações por email ativas'),
('notificacoes_sms_ativo', 'notificacoes', 'false', 'Notificações por SMS ativas'),
('notificacoes_nova_assistencia', 'notificacoes', 'true', 'Notificar nova assistência'),
('notificacoes_mudanca_estado', 'notificacoes', 'true', 'Notificar mudança de estado'),
('notificacoes_lembretes_prazo', 'notificacoes', 'true', 'Lembretes de prazo'),

-- Integração settings
('integracao_api_key', 'integracao', '""', 'Chave API externa'),
('integracao_webhook_url', 'integracao', '""', 'URL do webhook'),
('integracao_sync_automatico', 'integracao', 'false', 'Sincronização automática')

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();