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
  quotation_requested_at,
  quotation_deadline
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
    WHEN row_number() OVER () % 3 = 0 THEN true
    ELSE false
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