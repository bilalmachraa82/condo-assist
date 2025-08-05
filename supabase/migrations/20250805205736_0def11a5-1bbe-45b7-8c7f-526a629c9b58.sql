-- Inserir configurações de escalação na tabela app_settings
INSERT INTO app_settings (key, value, category, description) VALUES
  ('escalation_hours_critical', '24', 'notifications', 'Horas para escalação de assistências críticas'),
  ('escalation_hours_urgent', '72', 'notifications', 'Horas para escalação de assistências urgentes'),
  ('escalation_hours_normal', '120', 'notifications', 'Horas para escalação de assistências normais'),
  ('escalation_enabled_critical', 'true', 'notifications', 'Escalação habilitada para prioridade crítica'),
  ('escalation_enabled_urgent', 'true', 'notifications', 'Escalação habilitada para prioridade urgente'),
  ('escalation_enabled_normal', 'true', 'notifications', 'Escalação habilitada para prioridade normal')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();