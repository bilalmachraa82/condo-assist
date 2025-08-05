-- Atualizar função para ler configurações dinâmicas da tabela app_settings
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