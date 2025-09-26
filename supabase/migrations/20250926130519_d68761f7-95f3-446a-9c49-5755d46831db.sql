-- Create function for complete forced deletion of supplier
CREATE OR REPLACE FUNCTION public.force_delete_supplier_complete(p_supplier_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  supplier_name text;
  deps_before jsonb;
  deleted_counts jsonb;
BEGIN
  -- Check if supplier exists and get name
  SELECT name INTO supplier_name FROM public.suppliers WHERE id = p_supplier_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'supplier_not_found');
  END IF;

  -- Get dependencies count before deletion for audit
  SELECT public.check_supplier_dependencies(p_supplier_id) INTO deps_before;

  -- Log the complete deletion action BEFORE deleting
  INSERT INTO public.activity_log (
    supplier_id,
    action,
    details,
    metadata
  ) VALUES (
    p_supplier_id,
    'supplier_complete_deletion_initiated',
    'Eliminação completa forçada de todos os dados do fornecedor: ' || supplier_name,
    jsonb_build_object(
      'supplier_name', supplier_name,
      'dependencies_before', deps_before,
      'initiated_by', auth.uid(),
      'initiated_at', now()
    )
  );

  -- Delete in order of dependencies (child tables first)
  
  -- 1. Delete email logs
  DELETE FROM public.email_logs WHERE supplier_id = p_supplier_id;
  
  -- 2. Delete magic codes  
  DELETE FROM public.supplier_magic_codes WHERE supplier_id = p_supplier_id;
  
  -- 3. Delete supplier access logs
  DELETE FROM public.supplier_access_log WHERE supplier_id = p_supplier_id;
  
  -- 4. Delete supplier responses
  DELETE FROM public.supplier_responses WHERE supplier_id = p_supplier_id;
  
  -- 5. Delete quotations
  DELETE FROM public.quotations WHERE supplier_id = p_supplier_id;
  
  -- 6. Update assistances - remove supplier assignment instead of deleting
  UPDATE public.assistances 
  SET assigned_supplier_id = NULL, 
      supplier_notes = COALESCE(supplier_notes, '') || E'\n[FORNECEDOR ELIMINADO: ' || supplier_name || ' em ' || now()::text || ']'
  WHERE assigned_supplier_id = p_supplier_id;
  
  -- 7. Delete follow-up schedules
  DELETE FROM public.follow_up_schedules WHERE supplier_id = p_supplier_id;
  
  -- 8. Delete notifications  
  DELETE FROM public.notifications WHERE supplier_id = p_supplier_id;
  
  -- 9. Update activity logs - anonymize supplier reference instead of deleting
  UPDATE public.activity_log 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('deleted_supplier_name', supplier_name)
  WHERE supplier_id = p_supplier_id;
  
  UPDATE public.activity_log 
  SET supplier_id = NULL
  WHERE supplier_id = p_supplier_id;
  
  -- 10. Finally delete the supplier
  DELETE FROM public.suppliers WHERE id = p_supplier_id;
  
  -- Build success response
  deleted_counts := jsonb_build_object(
    'supplier_deleted', true,
    'supplier_name', supplier_name,
    'dependencies_cleared', deps_before->'dependencies',
    'assistances_updated', (deps_before->'dependencies'->>'assistances')::int,
    'activity_logs_anonymized', (deps_before->'dependencies'->>'activity_logs')::int
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fornecedor e todos os dados associados foram eliminados completamente',
    'deleted_counts', deleted_counts
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO public.activity_log (
      supplier_id,
      action,
      details,
      metadata
    ) VALUES (
      p_supplier_id,
      'supplier_complete_deletion_failed',
      'Erro na eliminação completa do fornecedor: ' || SQLERRM,
      jsonb_build_object(
        'supplier_name', supplier_name,
        'error', SQLERRM,
        'sqlstate', SQLSTATE,
        'failed_at', now()
      )
    );
    
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'deletion_failed',
      'message', SQLERRM
    );
END;
$function$;