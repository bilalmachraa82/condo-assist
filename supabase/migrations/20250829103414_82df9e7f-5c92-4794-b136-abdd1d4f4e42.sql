-- First, check current policies on suppliers table
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'suppliers';