-- Inserir dados reais baseados no site da Luvimg (sem ON CONFLICT)
INSERT INTO intervention_types (name, category, urgency_level, description) VALUES
('Administração Completa', 'Administrativa', 'normal', 'Administração completa do condomínio incluindo gestão logística e administrativa'),
('Gestão e Apoio Administrativo', 'Administrativa', 'normal', 'Apoio na parte burocrática para administradores de condomínio'),
('Manutenção Preventiva', 'Manutenção', 'normal', 'Serviços preventivos de manutenção de edifícios'),
('Manutenção Corretiva', 'Manutenção', 'urgent', 'Reparações urgentes em sistemas do edifício'),
('Canalizador', 'Manutenção', 'urgent', 'Serviços de canalização e sistemas hidráulicos'),
('Eletricista', 'Manutenção', 'urgent', 'Serviços elétricos e instalações elétricas'),
('Pintor', 'Manutenção', 'normal', 'Serviços de pintura interior e exterior'),
('Elevadores', 'Manutenção', 'critical', 'Manutenção e reparação de elevadores'),
('Limpeza Comum', 'Limpeza', 'normal', 'Limpeza das áreas comuns do condomínio'),
('Limpeza Profunda', 'Limpeza', 'normal', 'Limpeza profunda e especializada'),
('Jardins e Espaços Verdes', 'Limpeza', 'normal', 'Manutenção de jardins e espaços exteriores'),
('Apoio Jurídico', 'Jurídico', 'normal', 'Assessoria legal e acompanhamento de processos'),
('Inspeções Obrigatórias', 'Técnica', 'critical', 'Inspeções técnicas obrigatórias (seguros, elevadores, extintores, gás)'),
('Gestão de Seguros', 'Administrativa', 'normal', 'Gestão e acompanhamento de apólices de seguro');