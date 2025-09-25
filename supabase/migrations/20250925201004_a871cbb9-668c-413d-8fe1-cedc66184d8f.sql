-- Update check_supplier_dependencies to include activity_log count
CREATE OR REPLACE FUNCTION public.check_supplier_dependencies(p_supplier_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  email_count int;
  assistance_count int;
  quotation_count int;
  response_count int;
  magic_code_count int;
  activity_log_count int;
  can_delete boolean := true;
BEGIN
  -- Check email logs
  SELECT COUNT(*) INTO email_count 
  FROM email_logs 
  WHERE supplier_id = p_supplier_id;
  
  -- Check assistances (critical data - should not be deleted)
  SELECT COUNT(*) INTO assistance_count 
  FROM assistances 
  WHERE assigned_supplier_id = p_supplier_id;
  
  -- Check quotations (critical data - should not be deleted)
  SELECT COUNT(*) INTO quotation_count 
  FROM quotations 
  WHERE supplier_id = p_supplier_id;
  
  -- Check supplier responses (critical data - should not be deleted)
  SELECT COUNT(*) INTO response_count 
  FROM supplier_responses 
  WHERE supplier_id = p_supplier_id;
  
  -- Check magic codes
  SELECT COUNT(*) INTO magic_code_count 
  FROM supplier_magic_codes 
  WHERE supplier_id = p_supplier_id;
  
  -- Check activity logs (critical data - should not be deleted)
  SELECT COUNT(*) INTO activity_log_count 
  FROM activity_log 
  WHERE supplier_id = p_supplier_id;
  
  -- Determine if safe to delete (no critical dependencies)
  IF assistance_count > 0 OR quotation_count > 0 OR response_count > 0 OR activity_log_count > 0 THEN
    can_delete := false;
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'can_delete', can_delete,
    'dependencies', jsonb_build_object(
      'email_logs', email_count,
      'assistances', assistance_count,
      'quotations', quotation_count,
      'supplier_responses', response_count,
      'magic_codes', magic_code_count,
      'activity_logs', activity_log_count
    ),
    'has_critical_data', (assistance_count > 0 OR quotation_count > 0 OR response_count > 0 OR activity_log_count > 0),
    'total_records', email_count + assistance_count + quotation_count + response_count + magic_code_count + activity_log_count
  );
  
  RETURN result;
END;
$function$;

-- Create function to safely purge non-critical supplier data
CREATE OR REPLACE FUNCTION public.purge_supplier_non_critical(p_supplier_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  email_deleted_count int;
  magic_code_deleted_count int;
BEGIN
  -- Delete email logs (non-critical data)
  DELETE FROM email_logs WHERE supplier_id = p_supplier_id;
  GET DIAGNOSTICS email_deleted_count = ROW_COUNT;
  
  -- Delete magic codes (non-critical data)
  DELETE FROM supplier_magic_codes WHERE supplier_id = p_supplier_id;
  GET DIAGNOSTICS magic_code_deleted_count = ROW_COUNT;
  
  -- Log the purge action
  INSERT INTO activity_log (
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
      'purged_at', now()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_counts', jsonb_build_object(
      'email_logs', email_deleted_count,
      'magic_codes', magic_code_deleted_count
    )
  );
END;
$function$;