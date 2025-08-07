-- Phase 2 Storage Hardening: Make assistance-photos bucket private and add strict admin-only policies

-- 1) Ensure the bucket exists and set it to private
update storage.buckets
set public = false
where id = 'assistance-photos';

-- 2) Drop overly permissive policies if they exist (common names)
DROP POLICY IF EXISTS "Public read access to assistance-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can access assistance-photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view assistance photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to assistance-photos" ON storage.objects;

-- 3) Create admin-only policies for storage.objects on the assistance-photos bucket
-- Enable RLS is already default on storage.objects, but ensure it remains enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Admins can list/view objects in assistance-photos
CREATE POLICY IF NOT EXISTS "Admins can view assistance photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assistance-photos'
  AND public.is_admin(auth.uid())
);

-- Admins can upload objects to assistance-photos
CREATE POLICY IF NOT EXISTS "Admins can upload assistance photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assistance-photos'
  AND public.is_admin(auth.uid())
);

-- Admins can update objects in assistance-photos
CREATE POLICY IF NOT EXISTS "Admins can update assistance photos"
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

-- Admins can delete objects in assistance-photos
CREATE POLICY IF NOT EXISTS "Admins can delete assistance photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assistance-photos'
  AND public.is_admin(auth.uid())
);
