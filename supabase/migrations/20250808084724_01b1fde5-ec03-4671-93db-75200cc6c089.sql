-- Link magic code to latest assistance for that supplier
CREATE OR REPLACE FUNCTION public.link_code_to_latest_assistance(p_magic_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_record RECORD;
  latest_assistance RECORD;
BEGIN
  -- Get magic code record (latest if duplicates)
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_magic_code');
  END IF;

  -- Find most recent assistance assigned to this supplier
  SELECT * INTO latest_assistance
  FROM public.assistances
  WHERE assigned_supplier_id = code_record.supplier_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_assistance_found');
  END IF;

  -- Link the code to that assistance
  UPDATE public.supplier_magic_codes
  SET assistance_id = latest_assistance.id
  WHERE magic_code = p_magic_code;

  RETURN jsonb_build_object('success', true, 'assistance_id', latest_assistance.id);
END;
$$;

-- Securely fetch assistances for a magic code (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_assistances_for_code(p_magic_code text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status assistance_status,
  supplier_notes text,
  created_at timestamptz,
  scheduled_start_date timestamptz,
  scheduled_end_date timestamptz,
  actual_start_date timestamptz,
  actual_end_date timestamptz,
  completion_photos_required boolean,
  requires_validation boolean,
  requires_quotation boolean,
  quotation_requested_at timestamptz,
  quotation_deadline timestamptz,
  building_id uuid,
  intervention_type_id uuid,
  building_name text,
  building_address text,
  intervention_type_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_record RECORD;
BEGIN
  -- Get magic code record (latest if duplicates)
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_magic_code';
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.description,
    a.status,
    a.supplier_notes,
    a.created_at,
    a.scheduled_start_date,
    a.scheduled_end_date,
    a.actual_start_date,
    a.actual_end_date,
    a.completion_photos_required,
    a.requires_validation,
    a.requires_quotation,
    a.quotation_requested_at,
    a.quotation_deadline,
    a.building_id,
    a.intervention_type_id,
    b.name AS building_name,
    b.address AS building_address,
    it.name AS intervention_type_name
  FROM public.assistances a
  LEFT JOIN public.buildings b ON b.id = a.building_id
  LEFT JOIN public.intervention_types it ON it.id = a.intervention_type_id
  WHERE (a.assigned_supplier_id = code_record.supplier_id OR a.id = code_record.assistance_id)
    AND a.status IN ('pending','awaiting_quotation','quotation_received','accepted','scheduled','in_progress','awaiting_validation')
  ORDER BY a.created_at DESC;
END;
$$;