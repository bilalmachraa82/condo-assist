
-- 1. Seed das configurações de follow-up (não sobrepõe se já existirem)
INSERT INTO public.app_settings (key, value, category, description) VALUES
  ('quotation_first_critical_hours', '12'::jsonb, 'followups', 'Horas até ao primeiro lembrete de orçamento (prioridade Crítica)'),
  ('quotation_first_urgent_hours',   '24'::jsonb, 'followups', 'Horas até ao primeiro lembrete de orçamento (prioridade Urgente)'),
  ('quotation_first_normal_hours',   '48'::jsonb, 'followups', 'Horas até ao primeiro lembrete de orçamento (prioridade Normal)'),
  ('quotation_second_attempt_hours', '24'::jsonb, 'followups', 'Horas até ao 2º lembrete de orçamento (escalação)'),
  ('quotation_third_attempt_hours',  '48'::jsonb, 'followups', 'Horas até ao 3º lembrete de orçamento'),
  ('date_confirmation_hours',        '24'::jsonb, 'followups', 'Horas após aceitação para pedir confirmação de data'),
  ('work_reminder_hours_before',     '24'::jsonb, 'followups', 'Horas antes do trabalho para enviar lembrete de véspera'),
  ('completion_reminder_hours_after','24'::jsonb, 'followups', 'Horas após a data esperada para enviar lembrete de conclusão'),
  ('retry_after_failure_hours',      '4'::jsonb,  'followups', 'Horas até nova tentativa após uma falha de envio'),
  ('pendency_sla_cadence_days',      '2'::jsonb,  'followups', 'Dias entre tentativas de lembrete SLA de pendências email'),
  ('pendency_sla_max_attempts',      '3'::jsonb,  'followups', 'Número máximo de tentativas para lembretes SLA de pendências email')
ON CONFLICT (key) DO NOTHING;

-- Helper: lê um inteiro de app_settings com fallback
CREATE OR REPLACE FUNCTION public.get_setting_int(p_key text, p_default integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v jsonb;
  result integer;
BEGIN
  SELECT value INTO v FROM public.app_settings WHERE key = p_key LIMIT 1;
  IF v IS NULL THEN
    RETURN p_default;
  END IF;
  -- Aceita formato número directo ou string numérica
  BEGIN
    result := (v#>>'{}')::integer;
  EXCEPTION WHEN others THEN
    result := p_default;
  END;
  RETURN COALESCE(result, p_default);
END;
$$;

-- 2. Reescreve calculate_next_followup para ler do app_settings
CREATE OR REPLACE FUNCTION public.calculate_next_followup(
  p_follow_up_type text,
  p_priority assistance_priority,
  p_attempt_count integer,
  p_base_date timestamp with time zone DEFAULT now()
) RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  hours_to_add integer;
BEGIN
  CASE p_follow_up_type
    WHEN 'quotation_reminder' THEN
      IF p_attempt_count = 0 THEN
        CASE p_priority
          WHEN 'critical' THEN hours_to_add := public.get_setting_int('quotation_first_critical_hours', 12);
          WHEN 'urgent'   THEN hours_to_add := public.get_setting_int('quotation_first_urgent_hours', 24);
          ELSE                 hours_to_add := public.get_setting_int('quotation_first_normal_hours', 48);
        END CASE;
      ELSIF p_attempt_count = 1 THEN
        hours_to_add := public.get_setting_int('quotation_second_attempt_hours', 24);
      ELSE
        hours_to_add := public.get_setting_int('quotation_third_attempt_hours', 48);
      END IF;

    WHEN 'date_confirmation' THEN
      hours_to_add := public.get_setting_int('date_confirmation_hours', 24);

    WHEN 'work_reminder' THEN
      hours_to_add := public.get_setting_int('work_reminder_hours_before', 24);

    WHEN 'completion_reminder' THEN
      hours_to_add := public.get_setting_int('completion_reminder_hours_after', 24);

    ELSE
      hours_to_add := 24;
  END CASE;

  RETURN p_base_date + (hours_to_add || ' hours')::interval;
END;
$function$;

-- 3. Actualiza o trigger auto_schedule_followups para usar configurações
CREATE OR REPLACE FUNCTION public.auto_schedule_followups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  followup_date timestamp with time zone;
  date_conf_hours integer;
  work_hours_before integer;
  completion_hours_after integer;
BEGIN
  date_conf_hours := public.get_setting_int('date_confirmation_hours', 24);
  work_hours_before := public.get_setting_int('work_reminder_hours_before', 24);
  completion_hours_after := public.get_setting_int('completion_reminder_hours_after', 24);

  -- Agendar follow-up de orçamento quando solicitado
  IF TG_OP = 'UPDATE' AND OLD.requires_quotation IS DISTINCT FROM NEW.requires_quotation
     AND NEW.requires_quotation = true AND NEW.assigned_supplier_id IS NOT NULL THEN

    followup_date := public.calculate_next_followup(
      'quotation_reminder',
      NEW.priority,
      0,
      COALESCE(NEW.quotation_requested_at, now())
    );

    INSERT INTO public.follow_up_schedules (
      assistance_id, supplier_id, follow_up_type, priority,
      scheduled_for, metadata
    ) VALUES (
      NEW.id, NEW.assigned_supplier_id, 'quotation_reminder', NEW.priority,
      followup_date,
      jsonb_build_object(
        'quotation_deadline', NEW.quotation_deadline,
        'attempt_number', 1
      )
    );
  END IF;

  -- Agendar confirmação de data quando aceite
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'accepted' AND NEW.scheduled_start_date IS NULL THEN

    INSERT INTO public.follow_up_schedules (
      assistance_id, supplier_id, follow_up_type, priority,
      scheduled_for, metadata
    ) VALUES (
      NEW.id, NEW.assigned_supplier_id, 'date_confirmation', NEW.priority,
      now() + (date_conf_hours || ' hours')::interval,
      jsonb_build_object('accepted_at', now())
    );
  END IF;

  -- Agendar lembrete véspera quando data definida
  IF TG_OP = 'UPDATE' AND OLD.scheduled_start_date IS DISTINCT FROM NEW.scheduled_start_date
     AND NEW.scheduled_start_date IS NOT NULL THEN

    INSERT INTO public.follow_up_schedules (
      assistance_id, supplier_id, follow_up_type, priority,
      scheduled_for, metadata
    ) VALUES (
      NEW.id, NEW.assigned_supplier_id, 'work_reminder', NEW.priority,
      NEW.scheduled_start_date - (work_hours_before || ' hours')::interval,
      jsonb_build_object('work_date', NEW.scheduled_start_date)
    );

    IF NEW.expected_completion_date IS NULL THEN
      UPDATE public.assistances
      SET expected_completion_date = NEW.scheduled_start_date +
        COALESCE(NEW.estimated_duration_hours || ' hours', '8 hours')::INTERVAL
      WHERE id = NEW.id;
    END IF;
  END IF;

  -- Agendar lembretes de conclusão
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'in_progress' AND NEW.expected_completion_date IS NOT NULL THEN

    INSERT INTO public.follow_up_schedules (
      assistance_id, supplier_id, follow_up_type, priority,
      scheduled_for, metadata
    ) VALUES (
      NEW.id, NEW.assigned_supplier_id, 'completion_reminder', NEW.priority,
      NEW.expected_completion_date + (completion_hours_after || ' hours')::interval,
      jsonb_build_object('expected_completion', NEW.expected_completion_date)
    );
  END IF;

  RETURN NEW;
END;
$function$;
