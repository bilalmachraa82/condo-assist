-- Insert test assistances with different statuses and priorities
INSERT INTO assistances (
  title, 
  description, 
  building_id, 
  intervention_type_id, 
  assigned_supplier_id,
  status, 
  priority,
  created_by,
  requires_quotation
) VALUES 
-- Pending assistance with critical priority
(
  'Falha no elevador principal - URGENTE',
  'Elevador parou de funcionar entre o 3º e 4º andar. Pessoas presas no interior.',
  '5bc55175-28d7-494c-8c69-0472732081b8',
  '6b644fe2-1841-4f67-a638-86da0da02140',
  '78429fef-0897-4597-93fd-539c852c67e5',
  'pending',
  'critical',
  NULL,
  true
),
-- In progress assistance 
(
  'Manutenção de sistema AVAC',
  'Verificação e limpeza dos filtros do sistema de ventilação.',
  '01a1228f-0a05-418a-a51d-7ad51558d508',
  'e8e2bbaa-2d6b-4587-97c9-1ff54cc73006',
  '99a75b73-2736-4c3f-ab9d-63279e753f32',
  'in_progress',
  'normal',
  NULL,
  false
),
-- Awaiting quotation
(
  'Inspeção elétrica anual',
  'Inspeção obrigatória das instalações elétricas do edifício.',
  'f8ed7be2-ec22-485f-80f9-60c09509641e',
  'f862a5ab-9da9-4726-a18b-35d3d4285099',
  '0908abe7-9f14-48cd-a5bc-1ad179d2ad59',
  'awaiting_quotation',
  'urgent',
  NULL,
  true
),
-- Completed assistance
(
  'Limpeza de escadas',
  'Limpeza semanal das escadas e áreas comuns.',
  'e9a08075-a80c-4c02-b243-186c056e657c',
  'b1c13865-b08b-477a-aaab-9c9b0ae314a0',
  '99a75b73-2736-4c3f-ab9d-63279e753f32',
  'completed',
  'normal',
  NULL,
  false
),
-- Another pending with different priority
(
  'Verificação de sistema de segurança',
  'Teste dos alarmes e câmaras de segurança.',
  'd8d5e9f6-c27c-4fbc-a893-298daec62648',
  '92ccd435-d6d7-4274-ade0-c388a6d3ccf1',
  '78429fef-0897-4597-93fd-539c852c67e5',
  'pending',
  'urgent',
  NULL,
  false
),
-- Sent to suppliers
(
  'Reparação de canalizações',
  'Fuga de água na cave do edifício.',
  '5bc55175-28d7-494c-8c69-0472732081b8',
  'b1c13865-b08b-477a-aaab-9c9b0ae314a0',
  '0908abe7-9f14-48cd-a5bc-1ad179d2ad59',
  'sent_to_suppliers',
  'urgent',
  NULL,
  true
),
-- Accepted assistance
(
  'Manutenção preventiva',
  'Verificação geral dos sistemas.',
  '01a1228f-0a05-418a-a51d-7ad51558d508',
  'b1c13865-b08b-477a-aaab-9c9b0ae314a0',
  '78429fef-0897-4597-93fd-539c852c67e5',
  'accepted',
  'normal',
  NULL,
  false
);