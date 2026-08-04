-- 1. Tighten overly permissive SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view assembly items" ON public.assembly_items;
CREATE POLICY "Admins can view assembly items"
ON public.assembly_items FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Everyone can view intervention types" ON public.intervention_types;
CREATE POLICY "Admins can view intervention types"
ON public.intervention_types FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. Revoke EXECUTE on every public SECURITY DEFINER function from anon/authenticated/public
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- 3. Re-grant only what the app really needs.
-- 3a. Role helpers are evaluated inside RLS policies for both roles.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- 3b. Supplier portal (magic-code, unauthenticated) RPCs
GRANT EXECUTE ON FUNCTION public.get_assistances_for_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_code_to_latest_assistance(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_estado_assistencia_por_codigo(text, public.assistance_status, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_resposta_fornecedor_por_codigo(text, text, text, timestamptz, integer, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_communications_for_code(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_communication_via_code(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_quotation_via_code(text, numeric, text, text, integer, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_complete_assistance(uuid) TO anon, authenticated;

-- 3c. Admin dashboard RPCs (authenticated only; the functions themselves check admin rights / RLS)
GRANT EXECUTE ON FUNCTION public.generate_magic_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_assistance_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_basic_suppliers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_delete_supplier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_supplier_non_critical(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_delete_supplier_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_supplier_dependencies(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_reminder_schedule(public.assistance_priority) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assistance_needs_followup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_followup_processing_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, jsonb, inet, text) TO authenticated;