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