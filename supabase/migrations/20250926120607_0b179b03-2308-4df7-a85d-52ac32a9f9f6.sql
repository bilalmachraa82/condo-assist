-- Recreate essential functions that were dropped during enum CASCADE

-- Function to get assistances for supplier magic code
CREATE OR REPLACE FUNCTION public.get_assistances_for_code(p_magic_code text)
RETURNS TABLE(
  id uuid, 
  title text, 
  description text, 
  status assistance_status, 
  supplier_notes text, 
  created_at timestamp with time zone, 
  scheduled_start_date timestamp with time zone, 
  scheduled_end_date timestamp with time zone, 
  actual_start_date timestamp with time zone, 
  actual_end_date timestamp with time zone, 
  completion_photos_required boolean, 
  requires_validation boolean, 
  requires_quotation boolean, 
  quotation_requested_at timestamp with time zone, 
  quotation_deadline timestamp with time zone, 
  building_id uuid, 
  intervention_type_id uuid, 
  building_name text, 
  building_address text, 
  intervention_type_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code_record RECORD;
  assistance_active BOOLEAN := false;
  valid_days INTEGER := public.magic_code_valid_days();
BEGIN
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_magic_code';
  END IF;

  IF code_record.assistance_id IS NOT NULL THEN
    SELECT a.status NOT IN ('completed','cancelled') INTO assistance_active
    FROM public.assistances a WHERE a.id = code_record.assistance_id;
  END IF;

  IF code_record.expires_at <= now() THEN
    IF assistance_active THEN
      UPDATE public.supplier_magic_codes
      SET expires_at = now() + (valid_days || ' days')::interval
      WHERE id = code_record.id;
    ELSE
      IF code_record.expires_at > (now() - interval '24 hours') THEN
        UPDATE public.supplier_magic_codes
        SET expires_at = now() + interval '24 hours'
        WHERE id = code_record.id;
      ELSE
        RAISE EXCEPTION 'expired_magic_code';
      END IF;
    END IF;
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
    AND a.status IN ('pending','awaiting_quotation','quotation_rejected','in_progress')
  ORDER BY a.created_at DESC;
END;
$function$;