-- Phase 2: Security & GDPR (safe subset - no storage privacy flip yet)
-- 1) Restrict communications_log read access (remove public read)
DROP POLICY IF EXISTS "Anyone can view communications" ON public.communications_log;

CREATE POLICY "Admins can view communications"
ON public.communications_log
FOR SELECT
USING (is_admin(auth.uid()));

-- Keep existing policies:
--   "Admins can delete communications" (DELETE)
--   "Admins can insert communications" (INSERT)
--   "Admins can update communications" (UPDATE)
--   "Suppliers can insert communications via magic code" (INSERT)

-- 2) RPCs for Supplier Portal (validated by magic code)
-- Function: criar_resposta_fornecedor_por_codigo
CREATE OR REPLACE FUNCTION public.criar_resposta_fornecedor_por_codigo(
  p_magic_code text,
  p_response_type text,
  p_notes text DEFAULT NULL,
  p_estimated_completion_date timestamptz DEFAULT NULL,
  p_estimated_duration_hours integer DEFAULT NULL,
  p_scheduled_start_date timestamptz DEFAULT NULL,
  p_scheduled_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_record RECORD;
  response_record RECORD;
BEGIN
  -- Validate magic code
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
    AND expires_at > now();

  IF NOT FOUND THEN
    PERFORM public.log_supplier_access(NULL, p_magic_code, 'create_response', false, jsonb_build_object('error', 'invalid_or_expired_magic_code'));
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou expirado');
  END IF;

  -- Insert supplier response
  INSERT INTO public.supplier_responses (
    assistance_id,
    supplier_id,
    response_type,
    notes,
    estimated_completion_date,
    estimated_duration_hours,
    scheduled_start_date,
    scheduled_end_date,
    response_date
  ) VALUES (
    code_record.assistance_id,
    code_record.supplier_id,
    p_response_type,
    p_notes,
    p_estimated_completion_date,
    p_estimated_duration_hours,
    p_scheduled_start_date,
    p_scheduled_end_date,
    now()
  ) RETURNING * INTO response_record;

  -- Log access
  PERFORM public.log_supplier_access(code_record.supplier_id, p_magic_code, 'create_response', true, jsonb_build_object('assistance_id', code_record.assistance_id, 'response_type', p_response_type));

  RETURN jsonb_build_object('success', true, 'response', to_jsonb(response_record));
END;
$$;

-- Function: atualizar_estado_assistencia_por_codigo
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
BEGIN
  -- Validate magic code
  SELECT * INTO code_record
  FROM public.supplier_magic_codes
  WHERE magic_code = p_magic_code
    AND expires_at > now();

  IF NOT FOUND THEN
    PERFORM public.log_supplier_access(NULL, p_magic_code, 'update_assistance_status', false, jsonb_build_object('error', 'invalid_or_expired_magic_code'));
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou expirado');
  END IF;

  -- Update assistance status and optional supplier notes
  UPDATE public.assistances a
  SET 
    status = p_new_status,
    supplier_notes = CASE WHEN p_supplier_notes IS NOT NULL THEN COALESCE(a.supplier_notes, '') || CASE WHEN a.supplier_notes IS NULL OR a.supplier_notes = '' THEN '' ELSE E'\n' END || p_supplier_notes ELSE a.supplier_notes END,
    updated_at = now()
  WHERE a.id = code_record.assistance_id
  RETURNING * INTO assistance_record;

  -- Log access
  PERFORM public.log_supplier_access(code_record.supplier_id, p_magic_code, 'update_assistance_status', true, jsonb_build_object('assistance_id', code_record.assistance_id, 'new_status', p_new_status));

  RETURN jsonb_build_object('success', true, 'assistance', to_jsonb(assistance_record));
END;
$$;

-- Ensure anon can execute these RPCs (supplier portal without auth)
GRANT EXECUTE ON FUNCTION public.criar_resposta_fornecedor_por_codigo(text, text, text, timestamptz, integer, timestamptz, timestamptz) TO anon;
GRANT EXECUTE ON FUNCTION public.atualizar_estado_assistencia_por_codigo(text, assistance_status, text) TO anon;

-- Phase 3: Indexes for performance
-- Assistances
CREATE INDEX IF NOT EXISTS idx_assistances_status ON public.assistances (status);
CREATE INDEX IF NOT EXISTS idx_assistances_created_at ON public.assistances (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistances_assigned_supplier ON public.assistances (assigned_supplier_id);
CREATE INDEX IF NOT EXISTS idx_assistances_scheduled_start ON public.assistances (scheduled_start_date);
CREATE INDEX IF NOT EXISTS idx_assistances_priority ON public.assistances (priority);

-- Supplier responses
CREATE INDEX IF NOT EXISTS idx_supplier_responses_assistance_supplier ON public.supplier_responses (assistance_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_responses_created_at ON public.supplier_responses (created_at DESC);

-- Activity log
CREATE INDEX IF NOT EXISTS idx_activity_log_assistance_created_at ON public.activity_log (assistance_id, created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_assistance_status ON public.notifications (assistance_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON public.notifications (scheduled_for);

-- Communications log
CREATE INDEX IF NOT EXISTS idx_communications_log_assistance_created_at ON public.communications_log (assistance_id, created_at ASC);

-- Assistance photos (help queries by assistance)
CREATE INDEX IF NOT EXISTS idx_assistance_photos_assistance_created_at ON public.assistance_photos (assistance_id, created_at DESC);
