-- Create function to check supplier dependencies
CREATE OR REPLACE FUNCTION public.check_supplier_dependencies(p_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  email_count int;
  assistance_count int;
  quotation_count int;
  response_count int;
  magic_code_count int;
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
  
  -- Determine if safe to delete (no critical dependencies)
  IF assistance_count > 0 OR quotation_count > 0 OR response_count > 0 THEN
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
      'magic_codes', magic_code_count
    ),
    'has_critical_data', (assistance_count > 0 OR quotation_count > 0 OR response_count > 0),
    'total_records', email_count + assistance_count + quotation_count + response_count + magic_code_count
  );
  
  RETURN result;
END;
$$;