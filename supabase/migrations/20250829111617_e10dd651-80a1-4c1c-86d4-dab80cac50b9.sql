-- Check for any SECURITY DEFINER objects (functions, views, etc.)
SELECT 
  n.nspname as schema_name,
  p.proname as object_name,
  pg_get_function_result(p.oid) as return_type,
  prosecdef as is_security_definer
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE p.prosecdef = true 
AND n.nspname = 'public';

-- Also check for views with specific properties
SELECT schemaname, viewname 
FROM pg_views 
WHERE schemaname = 'public';