import { executeSql } from './execute_sql.mjs';
import fs from 'fs';

async function main() {
  const tablesRes = await executeSql(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `);
  const pubRes = await executeSql(`
    SELECT tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    ORDER BY tablename;
  `);
  const storagePoliciesRes = await executeSql(`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects';
  `);
  const brokenPoliciesRes = await executeSql(`
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%current_setting%' OR with_check LIKE '%current_setting%');
  `);
  const secInvokerFnsRes = await executeSql(`
    SELECT proname, prosecdef
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname IN (
        'get_active_user_employee_id',
        'get_active_user_org_id',
        'is_org_admin',
        'is_platform_admin',
        'current_org_id',
        'current_authenticated_org_id',
        'get_current_user_org_id',
        'get_current_user_profile_id',
        'fn_get_my_assigned_work_locations',
        'fn_record_attendance_punch',
        'fn_recalculate_daily_attendance',
        'trg_fn_on_punch_recorded',
        'fn_prevent_employee_field_tampering'
      );
  `);

  const out = {
    publicTables: tablesRes.rows.map(r => r.tablename),
    realtimeTables: pubRes.rows.map(r => r.tablename),
    storagePolicies: storagePoliciesRes.rows,
    brokenPoliciesWithCurrentSetting: brokenPoliciesRes.rows,
    functionsSecDef: secInvokerFnsRes.rows,
  };
  fs.writeFileSync('scratch/db_state_report.json', JSON.stringify(out, null, 2));
  console.log('Saved scratch/db_state_report.json');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
