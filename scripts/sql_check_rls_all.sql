-- Check RLS enabled on all 64 tables
SELECT 
    t.table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced,
    COUNT(p.policyname) as policy_count
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = t.table_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name, c.relrowsecurity, c.relforcerowsecurity
ORDER BY t.table_name;
