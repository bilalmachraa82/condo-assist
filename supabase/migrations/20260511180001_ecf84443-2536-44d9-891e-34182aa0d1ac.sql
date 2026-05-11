
-- 1) Make building_inspection_status use SECURITY INVOKER (caller's RLS)
ALTER VIEW public.building_inspection_status SET (security_invoker = true);

-- 2) Restrict realtime.messages SELECT policy to admins only (was: USING true)
DROP POLICY IF EXISTS "Authenticated users can subscribe to realtime channels" ON realtime.messages;
CREATE POLICY "Admins can subscribe to realtime channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 3) Add admin-only UPDATE storage policies for inspection-documents and insurance-documents
CREATE POLICY "Admins update inspection docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'inspection-documents' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'inspection-documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update insurance docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'insurance-documents' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'insurance-documents' AND public.is_admin(auth.uid()));

-- 4) Remove the overly permissive supplier INSERT policy on communications_log.
-- Suppliers must use the SECURITY DEFINER RPC public.create_communication_via_code,
-- which validates the magic code before inserting.
DROP POLICY IF EXISTS "Suppliers can insert communications via magic code" ON public.communications_log;

-- 5) Document supplier_access_log: writes happen exclusively via SECURITY DEFINER
-- function public.log_supplier_access (bypasses RLS). No anon INSERT path exists.
COMMENT ON TABLE public.supplier_access_log IS 'Writes only via SECURITY DEFINER function public.log_supplier_access. No direct INSERT policy intended.';
