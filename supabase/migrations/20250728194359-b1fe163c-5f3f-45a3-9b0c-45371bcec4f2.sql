-- Create some test data for assistances and quotations
-- First, create some test assistances that require quotations
INSERT INTO assistances (
  title, 
  description, 
  building_id, 
  intervention_type_id, 
  assigned_supplier_id, 
  priority, 
  status, 
  requires_quotation,
  quotation_requested_at
) 
SELECT 
  'Reparação de ' || it.name,
  'Necessita reparação urgente de ' || it.name || ' no edifício ' || b.name,
  b.id,
  it.id,
  s.id,
  CASE 
    WHEN it.urgency_level = 'critical' THEN 'critical'::assistance_priority
    WHEN it.urgency_level = 'urgent' THEN 'urgent'::assistance_priority
    ELSE 'normal'::assistance_priority
  END,
  CASE 
    WHEN row_number() OVER () % 3 = 0 THEN 'awaiting_quotation'::assistance_status
    WHEN row_number() OVER () % 3 = 1 THEN 'quotation_received'::assistance_status
    ELSE 'pending'::assistance_status
  END,
  CASE 
    WHEN row_number() OVER () % 3 = 0 THEN now() - interval '2 days'
    ELSE NULL
  END,
  CASE 
    WHEN row_number() OVER () % 3 = 0 THEN now() + interval '7 days'
    ELSE NULL
  END
FROM 
  (SELECT * FROM buildings WHERE is_active = true LIMIT 5) b
CROSS JOIN 
  (SELECT * FROM intervention_types LIMIT 4) it
JOIN
  (SELECT * FROM suppliers WHERE is_active = true) s ON s.specialization ILIKE '%' || it.category || '%' OR s.specialization IS NULL
LIMIT 15;

-- Create some test quotations for the assistances
INSERT INTO quotations (
  assistance_id,
  supplier_id,
  amount,
  description,
  validity_days,
  status,
  submitted_at,
  is_requested
)
SELECT 
  a.id,
  a.assigned_supplier_id,
  ROUND((RANDOM() * 2000 + 500)::numeric, 2) as amount,
  'Orçamento para ' || a.title || '. Inclui material e mão de obra.',
  30,
  CASE 
    WHEN RANDOM() < 0.3 THEN 'approved'::quotation_status
    WHEN RANDOM() < 0.6 THEN 'pending'::quotation_status
    ELSE 'submitted'::quotation_status
  END,
  now() - (RANDOM() * interval '5 days'),
  true
FROM assistances a
WHERE a.assigned_supplier_id IS NOT NULL
AND a.requires_quotation = true
LIMIT 10;

-- Update some assistance statuses based on quotation approvals
UPDATE assistances 
SET status = 'quotation_approved'::assistance_status
WHERE id IN (
  SELECT a.id 
  FROM assistances a
  JOIN quotations q ON q.assistance_id = a.id
  WHERE q.status = 'approved'
  LIMIT 3
);

-- Create some additional quotations for comparison (multiple suppliers for same assistance)
INSERT INTO quotations (
  assistance_id,
  supplier_id,
  amount,
  description,
  validity_days,
  status,
  submitted_at,
  is_requested
)
SELECT 
  a.id,
  s.id,
  ROUND((RANDOM() * 1500 + 800)::numeric, 2) as amount,
  'Proposta alternativa para ' || a.title || '. Orçamento competitivo.',
  30,
  'pending'::quotation_status,
  now() - (RANDOM() * interval '3 days'),
  true
FROM assistances a
CROSS JOIN suppliers s
WHERE a.requires_quotation = true
AND s.is_active = true
AND s.id != a.assigned_supplier_id
AND RANDOM() < 0.3
LIMIT 5;