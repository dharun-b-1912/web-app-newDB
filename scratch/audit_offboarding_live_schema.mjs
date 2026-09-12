import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probeTable(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      console.log(`[TABLE] ${tableName}: NOT FOUND / ERROR (${error.code}: ${error.message})`);
      return null;
    }
    if (data && data.length > 0) {
      console.log(`[TABLE] ${tableName}: EXISTS (sample columns: ${Object.keys(data[0]).join(', ')})`);
    } else {
      console.log(`[TABLE] ${tableName}: EXISTS (0 rows)`);
    }
    return true;
  } catch (err) {
    console.log(`[TABLE] ${tableName}: EXCEPTION (${err.message})`);
    return null;
  }
}

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  const targetTables = [
    'employee_separations',
    'separation_clearances',
    'separation_asset_recoveries',
    'fnf_settlements',
    'assets',
    'asset_allocations',
    'company_assets',
    'employee_lifecycle_events',
    'employees',
    'user_profiles',
    'payroll_runs',
    'payroll_periods',
    'domain_events',
    'leave_balances',
    'leave_ledger_entries',
    'attendance_daily'
  ];

  console.log('=== AUDITING LIVE DATABASE FOR MODULE 02 TABLES ===');
  for (const t of targetTables) {
    await probeTable(t);
  }
}

main();
