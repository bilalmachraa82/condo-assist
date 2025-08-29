-- Find and remove any SECURITY DEFINER views
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%';

-- Drop any existing security definer views related to suppliers
DROP VIEW IF EXISTS public.suppliers_basic_secure;