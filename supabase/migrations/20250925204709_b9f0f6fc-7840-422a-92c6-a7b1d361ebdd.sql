-- 1) Expand purge of non-critical data to include access logs
CREATE OR REPLACE FUNCTION public.purge_supplier_non_critical(p_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  email_deleted_count int := 0;
  magic_code_deleted_count int := 0;
  access_log_deleted_count int := 0;
BEGIN
  -- Delete email logs (non-critical data)
  DELETE FROM public.email_logs WHERE supplier_id = p_supplier_id;
  GET DIAGNOSTICS email_deleted_count = ROW_COUNT;

  -- Delete magic codes (non-critical data)
  DELETE FROM public.supplier_magic_codes WHERE supplier_id = p_supplier_id;
  GET DIAGNOSTICS magic_code_deleted_count = ROW_COUNT;

  -- Delete supplier access logs (non-critical data)
  DELETE FROM public.supplier_access_log WHERE supplier_id = p_supplier_id;
  GET DIAGNOSTICS access_log_deleted_count = ROW_COUNT;

  -- Log the purge action
  INSERT INTO public.activity_log (
    supplier_id,
    action,
    details,
    metadata
  ) VALUES (
    p_supplier_id,
    'supplier_non_critical_data_purged',
    'Dados não-críticos do fornecedor foram eliminados',
    jsonb_build_object(
      'email_logs_deleted', email_deleted_count,
      'magic_codes_deleted', magic_code_deleted_count,
      'access_logs_deleted', access_log_deleted_count,
      'purged_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_counts', jsonb_build_object(
      'email_logs', email_deleted_count,
      'magic_codes', magic_code_deleted_count,
      'access_logs', access_log_deleted_count
    )
  );
END;
$$;

-- 2) Safe delete supplier when there are no critical dependencies
CREATE OR REPLACE FUNCTION public.safe_delete_supplier(p_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deps jsonb;
  deleted boolean := false;
BEGIN
  -- Check dependencies
  SELECT public.check_supplier_dependencies(p_supplier_id) INTO deps;

  -- If there are critical records, block deletion
  IF COALESCE((deps->>'has_critical_data')::boolean, true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'has_critical_dependencies',
      'dependencies', deps
    );
  END IF;

  -- Purge non-critical tables just in case
  PERFORM public.purge_supplier_non_critical(p_supplier_id);

  -- Try to delete supplier
  DELETE FROM public.suppliers WHERE id = p_supplier_id;
  IF FOUND THEN
    deleted := true;
  END IF;

  IF deleted THEN
    INSERT INTO public.activity_log (supplier_id, action, details, metadata)
    VALUES (
      p_supplier_id,
      'supplier_deleted',
      'Fornecedor eliminado em segurança',
      jsonb_build_object('deleted_by', auth.uid(), 'deleted_at', now())
    );

    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'delete_failed');
  END IF;
END;
$$;