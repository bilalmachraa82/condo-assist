-- Add email_mode setting for admin-first PDF workflow
INSERT INTO app_settings (key, category, value, description)
VALUES (
  'email_mode',
  'notifications',
  '"direct"',
  'Modo de envio de emails: "direct" (direto para fornecedores) ou "admin_first" (PDF para administração)'
)
ON CONFLICT (key) DO NOTHING;

-- Add admin_email setting for where to send PDFs
INSERT INTO app_settings (key, category, value, description)
VALUES (
  'admin_email',
  'notifications',
  '"arquivo@luvimg.com"',
  'Email do administrador para receber PDFs de assistências'
)
ON CONFLICT (key) DO NOTHING;