-- Recreate remaining essential functions

-- Function to update assistance status via magic code
CREATE OR REPLACE FUNCTION public.atualizar_estado_assistencia_por_codigo(
  p_magic_code text, 
  p_new_status assistance_status, 
  p_supplier_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code_record RECORD;
  assistance_record RECORD;
  assistance_active boolean := false;
  valid_days integer := public.magic_code_valid_days();
BEGIN
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    PERFORM public.log_supplier_access(NULL, p_magic_code, 'update_assistance_status', false, jsonb_build_object('error', 'invalid_magic_code'));
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido');
  END IF;

  SELECT a.status NOT IN ('completed','cancelled') INTO assistance_active
  FROM public.assistances a WHERE a.id = code_record.assistance_id;

  IF code_record.expires_at <= now() THEN
    IF assistance_active THEN
      UPDATE public.supplier_magic_codes SET expires_at = now() + (valid_days || ' days')::interval WHERE id = code_record.id;
    ELSE
      IF code_record.expires_at > (now() - interval '24 hours') THEN
        UPDATE public.supplier_magic_codes SET expires_at = now() + interval '24 hours' WHERE id = code_record.id;
      ELSE
        PERFORM public.log_supplier_access(code_record.supplier_id, p_magic_code, 'update_assistance_status', false, jsonb_build_object('error', 'expired_magic_code'));
        RETURN jsonb_build_object('success', false, 'error', 'Código expirado');
      END IF;
    END IF;
  END IF;

  UPDATE public.assistances a
  SET 
    status = p_new_status,
    supplier_notes = CASE WHEN p_supplier_notes IS NOT NULL THEN COALESCE(a.supplier_notes, '') || CASE WHEN a.supplier_notes IS NULL OR a.supplier_notes = '' THEN '' ELSE E'\n' END || p_supplier_notes ELSE a.supplier_notes END,
    updated_at = now()
  WHERE a.id = code_record.assistance_id
  RETURNING * INTO assistance_record;

  PERFORM public.log_supplier_access(code_record.supplier_id, p_magic_code, 'update_assistance_status', true, jsonb_build_object('assistance_id', code_record.assistance_id, 'new_status', p_new_status));

  RETURN jsonb_build_object('success', true, 'assistance', to_jsonb(assistance_record));
END;
$function$;

-- Function to calculate reminder schedule  
CREATE OR REPLACE FUNCTION public.calculate_reminder_schedule(assistance_priority assistance_priority)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  escalation_hours INT;
  escalation_enabled BOOLEAN;
BEGIN
  -- Buscar configurações dinâmicas da tabela app_settings
  SELECT 
    COALESCE((value::text)::int, 
      CASE assistance_priority
        WHEN 'critical' THEN 24
        WHEN 'urgent' THEN 72
        ELSE 120
      END
    ) INTO escalation_hours
  FROM app_settings 
  WHERE key = 'escalation_hours_' || assistance_priority::text;
  
  -- Verificar se escalação está habilitada
  SELECT 
    COALESCE((value::text)::boolean, true) INTO escalation_enabled
  FROM app_settings 
  WHERE key = 'escalation_enabled_' || assistance_priority::text;
  
  -- Se escalação não estiver habilitada, retornar null
  IF NOT escalation_enabled THEN
    RETURN jsonb_build_object('escalation', null);
  END IF;
  
  -- Retornar configuração de escalação
  RETURN jsonb_build_object('escalation', escalation_hours);
END;
$function$;