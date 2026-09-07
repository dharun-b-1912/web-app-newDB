SELECT * FROM storage.buckets;
SELECT 
    schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage';
