-- Remove existing intervention types
DELETE FROM public.intervention_types;

-- Insert Portuguese intervention types based on best practices

-- Manutenção Preventiva
INSERT INTO public.intervention_types (name, category, description, urgency_level) VALUES
('Inspeções Técnicas Obrigatórias', 'Manutenção Preventiva', 'Inspeções periódicas obrigatórias por lei (elevadores, sistemas de segurança, instalações)', 'normal'),
('Manutenção de Sistemas AVAC', 'Manutenção Preventiva', 'Manutenção preventiva de aquecimento, ventilação e ar condicionado', 'normal'),
('Verificação de Instalações Elétricas', 'Manutenção Preventiva', 'Verificação e teste de instalações elétricas e quadros', 'normal'),
('Limpeza e Manutenção de Elevadores', 'Manutenção Preventiva', 'Limpeza, lubrificação e verificação de elevadores', 'normal'),
('Manutenção de Sistemas de Segurança', 'Manutenção Preventiva', 'Teste e manutenção de alarmes, câmaras e controlo de acessos', 'normal'),
('Pintura e Conservação de Fachadas', 'Manutenção Preventiva', 'Pintura e conservação exterior do edifício', 'normal'),

-- Manutenção Corretiva
('Reparações de Canalização', 'Manutenção Corretiva', 'Reparação de fugas, entupimentos e avarias na canalização', 'urgent'),
('Reparações Elétricas de Emergência', 'Manutenção Corretiva', 'Reparação urgente de falhas elétricas', 'critical'),
('Reparação de Equipamentos', 'Manutenção Corretiva', 'Reparação de equipamentos avariados (elevadores, portões, etc.)', 'urgent'),
('Substituição de Materiais Danificados', 'Manutenção Corretiva', 'Substituição de materiais deteriorados ou danificados', 'normal'),

-- Manutenção Preditiva
('Diagnóstico de Patologias Estruturais', 'Manutenção Preditiva', 'Avaliação e diagnóstico de problemas estruturais', 'normal'),
('Análise de Desempenho Energético', 'Manutenção Preditiva', 'Auditoria energética e análise de consumos', 'normal'),
('Avaliação do Estado de Conservação', 'Manutenção Preditiva', 'Avaliação geral do estado de conservação do edifício', 'normal'),

-- Serviços Especializados
('Impermeabilizações', 'Serviços Especializados', 'Impermeabilização de coberturas, terraços e caves', 'urgent'),
('Reabilitação de Coberturas', 'Serviços Especializados', 'Reparação e reabilitação de telhados e coberturas', 'urgent'),
('Sistemas de Drenagem', 'Serviços Especializados', 'Instalação e manutenção de sistemas de drenagem', 'urgent'),
('Acessibilidades e Mobilidade', 'Serviços Especializados', 'Instalação de rampas, elevadores e melhorias de acessibilidade', 'normal');