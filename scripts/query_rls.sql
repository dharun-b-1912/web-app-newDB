
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  p.policyname,
  p.cmd,
  p.roles,
  p.qual as using_expr,
  p.with_check as with_check_expr
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename, p.policyname;
