-- Phase 2 Storage Hardening (retry): Make assistance-photos bucket private and add strict admin-only policies

-- 1) Ensure the bucket exists and set it to private
update storage.buckets
set public = false
where id = 'assistance-photos';

-- 2) Drop existing policies with our target names to avoid duplicates
DROP POLICY IF EXISTS "Admins can view assistance photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload assistance photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update assistance photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete assistance photos" ON storage.objects;

-- Also drop some common permissive policy names if present
DROP POLICY IF EXISTS "Public read access to assistance-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can access assistance-photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view assistance photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to assistance-photos" ON storage.objects;

-- 3) Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4) Create admin-only policies for assistance-photos bucket
CREATE POLICY "Admins can view assistance photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assistance-photos'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Admins can upload assistance photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assistance-photos'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Admins can update assistance photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'assistance-photos'
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'assistance-photos'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete assistance photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assistance-photos'
  AND public.is_admin(auth.uid())
);
