
-- Criar tabela para agendamento de follow-ups
CREATE TABLE public.follow_up_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistance_id UUID NOT NULL REFERENCES public.assistances(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('quotation_reminder', 'date_confirmation', 'work_reminder', 'completion_reminder')),
  priority assistance_priority NOT NULL DEFAULT 'normal',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos para tracking de follow-ups nas assistências
ALTER TABLE public.assistances 
ADD COLUMN IF NOT EXISTS quotation_follow_up_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_quotation_follow_up_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS work_reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_work_reminder_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expected_completion_date TIMESTAMP WITH TIME ZONE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_follow_up_schedules_scheduled_for ON public.follow_up_schedules(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_follow_up_schedules_assistance ON public.follow_up_schedules(assistance_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_schedules_supplier ON public.follow_up_schedules(supplier_id);
CREATE INDEX IF NOT EXISTS idx_assistances_dates ON public.assistances(scheduled_start_date, expected_completion_date) WHERE status IN ('scheduled', 'in_progress');

-- RLS policies para follow_up_schedules
ALTER TABLE public.follow_up_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage follow-up schedules" 
  ON public.follow_up_schedules 
  FOR ALL 
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view follow-up schedules" 
  ON public.follow_up_schedules 
  FOR SELECT 
  USING (true);

-- Função para calcular próximo follow-up baseado na prioridade
CREATE OR REPLACE FUNCTION public.calculate_next_followup(
  p_follow_up_type TEXT,
  p_priority assistance_priority,
  p_attempt_count INTEGER,
  p_base_date TIMESTAMP WITH TIME ZONE DEFAULT now()
) RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  hours_to_add INTEGER;
BEGIN
  CASE p_follow_up_type
    WHEN 'quotation_reminder' THEN
      -- Primeiro lembrete baseado na prioridade
      IF p_attempt_count = 0 THEN
        CASE p_priority
          WHEN 'critical' THEN hours_to_add := 12;
          WHEN 'urgent' THEN hours_to_add := 24;
          ELSE hours_to_add := 48;
        END CASE;
      -- Segundo lembrete (escalação)
      ELSIF p_attempt_count = 1 THEN
        hours_to_add := 24;
      -- Terceiro lembrete
      ELSE
        hours_to_add := 48;
      END IF;
      
    WHEN 'date_confirmation' THEN
      hours_to_add := 24; -- 24h após aceitação
      
    WHEN 'work_reminder' THEN
      hours_to_add := -24; -- 1 dia antes da data agendada
      
    WHEN 'completion_reminder' THEN
      hours_to_add := 24; -- Diariamente após data esperada
      
    ELSE
      hours_to_add := 24;
  END CASE;
  
  RETURN p_base_date + (hours_to_add || ' hours')::INTERVAL;
END;
$function$;

-- Função para agendar follow-ups automaticamente
CREATE OR REPLACE FUNCTION public.schedule_automatic_followups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  followup_date TIMESTAMP WITH TIME ZONE;
BEGIN
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
      now() + interval '24 hours',
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
      NEW.scheduled_start_date - interval '24 hours',
      jsonb_build_object('work_date', NEW.scheduled_start_date)
    );
    
    -- Definir data esperada de conclusão (se não definida)
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
      NEW.expected_completion_date + interval '24 hours',
      jsonb_build_object('expected_completion', NEW.expected_completion_date)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger para agendamento automático
DROP TRIGGER IF EXISTS trigger_schedule_followups ON public.assistances;
CREATE TRIGGER trigger_schedule_followups
  AFTER INSERT OR UPDATE ON public.assistances
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_automatic_followups();

-- Função para processar follow-ups pendentes
CREATE OR REPLACE FUNCTION public.process_pending_followups()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  followup_record RECORD;
  processed_count INTEGER := 0;
BEGIN
  FOR followup_record IN
    SELECT fs.*, a.title, a.description, a.priority, a.scheduled_start_date,
           s.name as supplier_name, s.email as supplier_email,
           b.name as building_name
    FROM public.follow_up_schedules fs
    JOIN public.assistances a ON fs.assistance_id = a.id
    JOIN public.suppliers s ON fs.supplier_id = s.id
    JOIN public.buildings b ON a.building_id = b.id
    WHERE fs.status = 'pending' 
      AND fs.scheduled_for <= now()
      AND fs.attempt_count < fs.max_attempts
    ORDER BY fs.scheduled_for ASC
    LIMIT 50
  LOOP
    -- Marcar como processando
    UPDATE public.follow_up_schedules 
    SET status = 'processing', updated_at = now()
    WHERE id = followup_record.id;
    
    -- Aqui será chamado o edge function de envio de email
    -- Por agora apenas incrementamos tentativas
    UPDATE public.follow_up_schedules
    SET 
      attempt_count = attempt_count + 1,
      next_attempt_at = CASE 
        WHEN attempt_count + 1 < max_attempts 
        THEN now() + interval '4 hours' 
        ELSE NULL 
      END,
      updated_at = now()
    WHERE id = followup_record.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$function$;
