-- First, create the new intervention types alongside existing ones
INSERT INTO public.intervention_types (name, category, description, urgency_level) VALUES
('Inspeções Técnicas Obrigatórias', 'Manutenção Preventiva', 'Inspeções periódicas obrigatórias por lei (elevadores, sistemas de segurança, instalações)', 'normal'),
('Manutenção de Sistemas AVAC', 'Manutenção Preventiva', 'Manutenção preventiva de aquecimento, ventilação e ar condicionado', 'normal'),
('Verificação de Instalações Elétricas', 'Manutenção Preventiva', 'Verificação e teste de instalações elétricas e quadros', 'normal'),
('Limpeza e Manutenção de Elevadores', 'Manutenção Preventiva', 'Limpeza, lubrificação e verificação de elevadores', 'normal'),
('Manutenção de Sistemas de Segurança', 'Manutenção Preventiva', 'Teste e manutenção de alarmes, câmaras e controlo de acessos', 'normal'),
('Pintura e Conservação de Fachadas', 'Manutenção Preventiva', 'Pintura e conservação exterior do edifício', 'normal'),
('Reparações de Canalização', 'Manutenção Corretiva', 'Reparação de fugas, entupimentos e avarias na canalização', 'urgent'),
('Reparações Elétricas de Emergência', 'Manutenção Corretiva', 'Reparação urgente de falhas elétricas', 'critical'),
('Reparação de Equipamentos', 'Manutenção Corretiva', 'Reparação de equipamentos avariados (elevadores, portões, etc.)', 'urgent'),
('Substituição de Materiais Danificados', 'Manutenção Corretiva', 'Substituição de materiais deteriorados ou danificados', 'normal'),
('Diagnóstico de Patologias Estruturais', 'Manutenção Preditiva', 'Avaliação e diagnóstico de problemas estruturais', 'normal'),
('Análise de Desempenho Energético', 'Manutenção Preditiva', 'Auditoria energética e análise de consumos', 'normal'),
('Avaliação do Estado de Conservação', 'Manutenção Preditiva', 'Avaliação geral do estado de conservação do edifício', 'normal'),
('Impermeabilizações', 'Serviços Especializados', 'Impermeabilização de coberturas, terraços e caves', 'urgent'),
('Reabilitação de Coberturas', 'Serviços Especializados', 'Reparação e reabilitação de telhados e coberturas', 'urgent'),
('Sistemas de Drenagem', 'Serviços Especializados', 'Instalação e manutenção de sistemas de drenagem', 'urgent'),
('Acessibilidades e Mobilidade', 'Serviços Especializados', 'Instalação de rampas, elevadores e melhorias de acessibilidade', 'normal');

-- Get the first new intervention type ID to update existing assistances
DO $$
DECLARE
    new_type_id UUID;
BEGIN
    -- Get ID of first new intervention type
    SELECT id INTO new_type_id FROM public.intervention_types WHERE name = 'Inspeções Técnicas Obrigatórias' LIMIT 1;
    
    -- Update any existing assistances to use a valid intervention type
    UPDATE public.assistances 
    SET intervention_type_id = new_type_id 
    WHERE intervention_type_id NOT IN (
        SELECT id FROM public.intervention_types WHERE name IN (
            'Inspeções Técnicas Obrigatórias', 'Manutenção de Sistemas AVAC', 'Verificação de Instalações Elétricas',
            'Limpeza e Manutenção de Elevadores', 'Manutenção de Sistemas de Segurança', 'Pintura e Conservação de Fachadas',
            'Reparações de Canalização', 'Reparações Elétricas de Emergência', 'Reparação de Equipamentos',
            'Substituição de Materiais Danificados', 'Diagnóstico de Patologias Estruturais', 'Análise de Desempenho Energético',
            'Avaliação do Estado de Conservação', 'Impermeabilizações', 'Reabilitação de Coberturas',
            'Sistemas de Drenagem', 'Acessibilidades e Mobilidade'
        )
    );
    
    -- Now remove old intervention types that are not the new ones
    DELETE FROM public.intervention_types 
    WHERE name NOT IN (
        'Inspeções Técnicas Obrigatórias', 'Manutenção de Sistemas AVAC', 'Verificação de Instalações Elétricas',
        'Limpeza e Manutenção de Elevadores', 'Manutenção de Sistemas de Segurança', 'Pintura e Conservação de Fachadas',
        'Reparações de Canalização', 'Reparações Elétricas de Emergência', 'Reparação de Equipamentos',
        'Substituição de Materiais Danificados', 'Diagnóstico de Patologias Estruturais', 'Análise de Desempenho Energético',
        'Avaliação do Estado de Conservação', 'Impermeabilizações', 'Reabilitação de Coberturas',
        'Sistemas de Drenagem', 'Acessibilidades e Mobilidade'
    );
END $$;