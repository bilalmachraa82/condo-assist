
-- 1. Fix storage bucket assistance-photos: restrict SELECT to admins only
DROP POLICY IF EXISTS "Todos podem ver fotos de assistência" ON storage.objects;
DROP POLICY IF EXISTS "Fornecedores podem fazer upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Fornecedores podem atualizar suas fotos" ON storage.objects;

-- Only admins can read assistance photos directly; suppliers use signed URLs via edge function
CREATE POLICY "Admins can read assistance photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'assistance-photos' AND public.is_admin(auth.uid()));

-- Only admins can upload assistance photos directly; suppliers upload via upload-assistance-photo edge function
CREATE POLICY "Admins can upload assistance photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assistance-photos' AND public.is_admin(auth.uid()));

-- Only admins can update assistance photos directly
CREATE POLICY "Admins can update assistance photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'assistance-photos' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'assistance-photos' AND public.is_admin(auth.uid()));

-- 2. Fix realtime.messages: only authenticated users can subscribe to channels
-- Service role and edge functions bypass RLS. Postgres_changes are still filtered by underlying table RLS.
DROP POLICY IF EXISTS "Authenticated users can subscribe to realtime channels" ON realtime.messages;

CREATE POLICY "Authenticated users can subscribe to realtime channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
