-- 1. Restringir SELECT em building_insurances apenas a admins
DROP POLICY IF EXISTS "Authenticated can view building insurances" ON public.building_insurances;

-- 2. Adicionar policies deny-all em tabelas com RLS sem policies (PII / interna)
CREATE POLICY "Admins can manage condominium contacts"
ON public.condominium_contacts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "System only agent api rate limit"
ON public.agent_api_rate_limit
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- 3. Recriar views com security_invoker para respeitarem RLS do utilizador
ALTER VIEW public.building_insurance_status SET (security_invoker = true);
ALTER VIEW public.building_inspection_status SET (security_invoker = true);