-- Phase 1 & 2: Triggers, functions, and RPCs to align with current schema and best practices

-- 1) Attach triggers for assistances
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_assistance_number_before_insert'
  ) THEN
    CREATE TRIGGER set_assistance_number_before_insert
    BEFORE INSERT ON public.assistances
    FOR EACH ROW
    EXECUTE FUNCTION public.set_assistance_number();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'assistances_log_creation'
  ) THEN
    CREATE TRIGGER assistances_log_creation
    AFTER INSERT ON public.assistances
    FOR EACH ROW
    EXECUTE FUNCTION public.log_assistance_creation();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'assistances_log_status_change'
  ) THEN
    CREATE TRIGGER assistances_log_status_change
    AFTER UPDATE ON public.assistances
    FOR EACH ROW
    EXECUTE FUNCTION public.log_assistance_status_change();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'assistances_update_updated_at'
  ) THEN
    CREATE TRIGGER assistances_update_updated_at
    BEFORE UPDATE ON public.assistances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) Attach trigger for assistance_progress updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'assistance_progress_update_updated_at'
  ) THEN
    CREATE TRIGGER assistance_progress_update_updated_at
    BEFORE UPDATE ON public.assistance_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_assistance_progress();
  END IF;
END $$;

-- 3) Quotations trigger to update assistance status and log changes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'quotations_update_assistance_status'
  ) THEN
    CREATE TRIGGER quotations_update_assistance_status
    AFTER INSERT OR UPDATE ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_assistance_quotation_status();
  END IF;
END $$;

-- 4) Supplier responses: log and propagate fields to assistances
CREATE OR REPLACE FUNCTION public.update_assistance_on_supplier_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_status assistance_status;
BEGIN
  -- Propagate scheduling data
  UPDATE public.assistances a
  SET 
    scheduled_start_date = COALESCE(NEW.scheduled_start_date, a.scheduled_start_date),
    scheduled_end_date = COALESCE(NEW.scheduled_end_date, a.scheduled_end_date),
    estimated_duration_hours = COALESCE(NEW.estimated_duration_hours, a.estimated_duration_hours),
    updated_at = now()
  WHERE a.id = NEW.assistance_id;

  -- Optionally update status when accepted/has schedule
  IF NEW.response_type = 'accepted' THEN
    SELECT CASE 
      WHEN NEW.scheduled_start_date IS NOT NULL THEN 'scheduled'::assistance_status
      ELSE 'accepted'::assistance_status
    END INTO new_status;

    UPDATE public.assistances 
    SET status = new_status, updated_at = now()
    WHERE id = NEW.assistance_id 
      AND status IN ('pending','awaiting_quotation','quotation_received','accepted');
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'supplier_responses_log'
  ) THEN
    CREATE TRIGGER supplier_responses_log
    AFTER INSERT ON public.supplier_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.log_supplier_response();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'supplier_responses_update_assistance'
  ) THEN
    CREATE TRIGGER supplier_responses_update_assistance
    AFTER INSERT ON public.supplier_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_assistance_on_supplier_response();
  END IF;
END $$;

-- 5) Enhance atualizar_estado_assistencia_por_codigo with validation and timestamps
CREATE OR REPLACE FUNCTION public.atualizar_estado_assistencia_por_codigo(
  p_magic_code text,
  p_new_status assistance_status,
  p_supplier_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_record RECORD;
  assistance_record RECORD;
  can_complete BOOLEAN;
BEGIN
  -- Validate magic code (must be valid and not expired)
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
    AND expires_at > now();

  IF NOT FOUND THEN
    PERFORM public.log_supplier_access(NULL, p_magic_code, 'update_assistance_status', false, jsonb_build_object('error', 'invalid_or_expired_magic_code'));
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou expirado');
  END IF;

  -- For completion, ensure preconditions are met
  IF p_new_status = 'completed' THEN
    SELECT public.can_complete_assistance(code_record.assistance_id) INTO can_complete;
    IF NOT can_complete THEN
      RETURN jsonb_build_object('success', false, 'error', 'Condições para conclusão não satisfeitas');
    END IF;
  END IF;

  -- Update assistance status and timestamps
  UPDATE public.assistances a
  SET 
    status = p_new_status,
    supplier_notes = CASE WHEN p_supplier_notes IS NOT NULL THEN COALESCE(a.supplier_notes, '') || CASE WHEN a.supplier_notes IS NULL OR a.supplier_notes = '' THEN '' ELSE E'\n' END || p_supplier_notes ELSE a.supplier_notes END,
    actual_start_date = CASE WHEN p_new_status = 'in_progress' AND a.actual_start_date IS NULL THEN now() ELSE a.actual_start_date END,
    actual_end_date = CASE WHEN p_new_status = 'completed' THEN now() ELSE a.actual_end_date END,
    updated_at = now()
  WHERE a.id = code_record.assistance_id
  RETURNING * INTO assistance_record;

  -- Log access
  PERFORM public.log_supplier_access(code_record.supplier_id, p_magic_code, 'update_assistance_status', true, jsonb_build_object('assistance_id', code_record.assistance_id, 'new_status', p_new_status));

  RETURN jsonb_build_object('success', true, 'assistance', to_jsonb(assistance_record));
END;
$$;

-- 6) RPC: create_quotation_via_code
CREATE OR REPLACE FUNCTION public.create_quotation_via_code(
  p_magic_code text,
  p_assistance_id uuid DEFAULT NULL,
  p_amount numeric,
  p_description text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_validity_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_record RECORD;
  target_assistance_id uuid;
  new_row public.quotations%rowtype;
BEGIN
  -- Get magic code (allow 24h grace like other RPCs)
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_magic_code');
  END IF;

  IF code_record.expires_at <= now() THEN
    IF code_record.expires_at > (now() - interval '24 hours') THEN
      UPDATE public.supplier_magic_codes SET expires_at = now() + interval '24 hours' WHERE id = code_record.id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'expired_magic_code');
    END IF;
  END IF;

  target_assistance_id := COALESCE(p_assistance_id, code_record.assistance_id);

  -- Ensure assistance belongs to supplier (assigned or linked)
  IF NOT EXISTS (
    SELECT 1 FROM public.assistances a
    WHERE a.id = target_assistance_id
      AND (a.assigned_supplier_id = code_record.supplier_id OR a.id = code_record.assistance_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;

  -- Insert quotation (status default 'pending')
  INSERT INTO public.quotations (
    assistance_id, supplier_id, amount, description, notes, validity_days, submitted_at
  ) VALUES (
    target_assistance_id, code_record.supplier_id, p_amount, p_description, p_notes, COALESCE(p_validity_days, 30), now()
  ) RETURNING * INTO new_row;

  -- Activity log
  INSERT INTO public.activity_log (assistance_id, supplier_id, action, details, metadata)
  VALUES (
    target_assistance_id,
    code_record.supplier_id,
    'quotation_submitted',
    'Orçamento submetido pelo fornecedor',
    jsonb_build_object('amount', p_amount, 'validity_days', p_validity_days)
  );

  RETURN jsonb_build_object('success', true, 'quotation', to_jsonb(new_row));
END;
$$;

-- 7) RPC: create_assistance_progress_via_code
CREATE OR REPLACE FUNCTION public.create_assistance_progress_via_code(
  p_magic_code text,
  p_assistance_id uuid,
  p_progress_type text,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_photo_urls text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_record RECORD;
  new_row public.assistance_progress%rowtype;
BEGIN
  IF coalesce(trim(p_progress_type), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_progress_type');
  END IF;

  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_magic_code');
  END IF;

  IF code_record.expires_at <= now() THEN
    IF code_record.expires_at > (now() - interval '24 hours') THEN
      UPDATE public.supplier_magic_codes SET expires_at = now() + interval '24 hours' WHERE id = code_record.id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'expired_magic_code');
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.assistances a
    WHERE a.id = p_assistance_id
      AND (a.assigned_supplier_id = code_record.supplier_id OR a.id = code_record.assistance_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_allowed');
  END IF;

  INSERT INTO public.assistance_progress (
    assistance_id, supplier_id, progress_type, title, description, photo_urls
  ) VALUES (
    p_assistance_id, code_record.supplier_id, p_progress_type, p_title, p_description, p_photo_urls
  ) RETURNING * INTO new_row;

  INSERT INTO public.activity_log (assistance_id, supplier_id, action, details, metadata)
  VALUES (
    p_assistance_id,
    code_record.supplier_id,
    'progress_logged',
    coalesce(p_title, 'Atualização de progresso registada'),
    jsonb_build_object('progress_type', p_progress_type)
  );

  RETURN jsonb_build_object('success', true, 'progress', to_jsonb(new_row));
END;
$$;

-- 8) Helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_supplier_magic_codes_magic_expires ON public.supplier_magic_codes (magic_code, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistances_assigned_supplier ON public.assistances (assigned_supplier_id);
CREATE INDEX IF NOT EXISTS idx_communications_log_assistance ON public.communications_log (assistance_id);
CREATE INDEX IF NOT EXISTS idx_quotations_assistance ON public.quotations (assistance_id);
CREATE INDEX IF NOT EXISTS idx_supplier_responses_assistance ON public.supplier_responses (assistance_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings (key);
CREATE INDEX IF NOT EXISTS idx_notifications_assistance ON public.notifications (assistance_id);
