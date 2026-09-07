import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  const checkTables = [
    'employees',
    'employee_profiles',
    'employee_bank_details',
    'employee_statutory_details',
    'employee_salary_assignments',
    'employee_emergency_contacts',
    'employee_family_members',
    'employee_documents',
    'salary_structures'
  ];

  for (const t of checkTables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`[${t}] ERROR:`, error.code, error.message);
    } else {
      console.log(`[${t}] OK (exists in DB)`);
    }
  }

  // Check rpc fn_provision_employee_auth
  const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_provision_employee_auth', {
    p_tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    p_employee_id: crypto.randomUUID(),
    p_email: 'test@test.com',
    p_phone: '+919999999999',
    p_first_name: 'Test',
    p_last_name: 'User',
    p_role: 'Employee',
    p_verification_mode: 'TEST_AUTO_VERIFY',
    p_initial_password: 'Joy@2026!'
  });
  console.log('RPC fn_provision_employee_auth result:', rpcData, rpcErr);
}

main();
