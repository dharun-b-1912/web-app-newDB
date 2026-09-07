import { execSync } from 'child_process';
import fs from 'fs';

const sql = `
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
`;

fs.writeFileSync('scripts/query_rls.sql', sql);
const out = execSync('npx supabase db query --linked --file scripts/query_rls.sql', { encoding: 'utf-8' });
const jsonStart = out.indexOf('{');
const parsed = JSON.parse(out.slice(jsonStart));

console.log(`Retrieved ${parsed.rows.length} policy rows across 64 tables.`);
fs.writeFileSync('scripts/rls_audit_output.json', JSON.stringify(parsed.rows, null, 2));
console.log('Saved to scripts/rls_audit_output.json');
