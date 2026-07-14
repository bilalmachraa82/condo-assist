
CREATE OR REPLACE FUNCTION public.safe_delete_supplier(p_supplier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deps jsonb;
  supplier_name text;
  was_active boolean;
BEGIN
  SELECT name, is_active INTO supplier_name, was_active
    FROM public.suppliers WHERE id = p_supplier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'supplier_not_found');
  END IF;

  SELECT public.check_supplier_dependencies(p_supplier_id) INTO deps;

  IF COALESCE((deps->>'has_critical_data')::boolean, true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'has_critical_dependencies',
      'dependencies', deps
    );
  END IF;

  -- Purge non-critical data (email logs, magic codes, access logs)
  PERFORM public.purge_supplier_non_critical(p_supplier_id);

  -- Soft-delete: mark as inactive (preserves audit trail, avoids FK violations)
  UPDATE public.suppliers
     SET is_active = false, updated_at = now()
   WHERE id = p_supplier_id;

  INSERT INTO public.activity_log (supplier_id, action, details, metadata)
  VALUES (
    p_supplier_id,
    'supplier_deleted',
    'Fornecedor desativado em segurança: ' || COALESCE(supplier_name, ''),
    jsonb_build_object(
      'deleted_by', auth.uid(),
      'deleted_at', now(),
      'was_active', was_active,
      'soft', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'soft', true,
    'is_active', false,
    'supplier_id', p_supplier_id,
    'supplier_name', supplier_name
  );
END;
$function$;
