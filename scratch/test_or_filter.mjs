import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function main() {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: authData } = await client.auth.signInWithPassword({
    email: 'dharun@joyglobalcorp.com',
    password: 'joypeoplehr',
  });

  const empIdUuid = '0ce6436c-e9b4-4e0e-9102-93ea238be0df';
  const empCode = 'JCS-017';

  console.log('--- Test 1: Only UUID ---');
  const res1 = await client
    .from('employee_documents')
    .select('*, document_types(id, name, code)')
    .eq('employee_id', empIdUuid);
  console.log('Test 1 Count:', res1.data?.length, 'Error:', res1.error);

  console.log('\n--- Test 2: orFilter with UUID and non-UUID (JCS-017) ---');
  const res2 = await client
    .from('employee_documents')
    .select('*, document_types(id, name, code)')
    .or(`employee_id.eq.${empCode},employee_id.eq.${empIdUuid}`);
  console.log('Test 2 Count:', res2.data?.length, 'Error:', res2.error);
}

main().catch(console.error);
