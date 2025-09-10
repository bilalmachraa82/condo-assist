-- Create test quotations to demonstrate functionality
INSERT INTO quotations (assistance_id, supplier_id, amount, description, notes, status, submitted_at, validity_days) 
SELECT 
  a.id as assistance_id,
  a.assigned_supplier_id as supplier_id,
  CASE 
    WHEN a.title ILIKE '%chaves%' THEN 150.00
    WHEN a.title ILIKE '%video%' OR a.title ILIKE '%vigilância%' THEN 2500.00
    WHEN a.title ILIKE '%porta%' THEN 800.00
    WHEN a.title ILIKE '%orçamento%' THEN 1200.00
    WHEN a.title ILIKE '%infiltr%' THEN 350.00
    ELSE 500.00
  END as amount,
  CASE 
    WHEN a.title ILIKE '%chaves%' THEN 'Serviço de cópia de chaves'
    WHEN a.title ILIKE '%video%' OR a.title ILIKE '%vigilância%' THEN 'Sistema de videovigilância completo'
    WHEN a.title ILIKE '%porta%' THEN 'Reparação de portas corta-fogo'
    WHEN a.title ILIKE '%orçamento%' THEN 'Trabalhos de manutenção geral'
    WHEN a.title ILIKE '%infiltr%' THEN 'Reparação de infiltrações'
    ELSE 'Serviços de manutenção'
  END as description,
  CASE 
    WHEN a.title ILIKE '%chaves%' THEN 'Incluindo deslocação ao local'
    WHEN a.title ILIKE '%video%' OR a.title ILIKE '%vigilância%' THEN 'Instalação e configuração incluídas'
    WHEN a.title ILIKE '%porta%' THEN 'Substituição de componentes danificados'
    WHEN a.title ILIKE '%orçamento%' THEN 'Conforme orçamento previamente aprovado'
    WHEN a.title ILIKE '%infiltr%' THEN 'Incluindo materiais e mão de obra'
    ELSE 'Trabalhos incluem materiais e mão de obra'
  END as notes,
  CASE 
    WHEN a.title ILIKE '%video%' OR a.title ILIKE '%orçamento%' THEN 'approved'::quotation_status
    WHEN a.title ILIKE '%infiltr%' THEN 'rejected'::quotation_status
    ELSE 'pending'::quotation_status
  END as status,
  CASE 
    WHEN a.title ILIKE '%video%' THEN NOW() - INTERVAL '2 days'
    WHEN a.title ILIKE '%porta%' THEN NOW() - INTERVAL '1 day'
    WHEN a.title ILIKE '%orçamento%' THEN NOW() - INTERVAL '3 days'
    WHEN a.title ILIKE '%infiltr%' THEN NOW() - INTERVAL '5 days'
    ELSE NOW()
  END as submitted_at,
  CASE 
    WHEN a.title ILIKE '%video%' THEN 45
    WHEN a.title ILIKE '%orçamento%' THEN 60
    ELSE 30
  END as validity_days
FROM assistances a
WHERE a.assigned_supplier_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM quotations q WHERE q.assistance_id = a.id)
LIMIT 5;