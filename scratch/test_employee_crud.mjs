import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  await supabase.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('email', 'marimuthu@joycorporatesolutions.com')
    .single();

  const orgId = profile.organization_id;
  const { data: branches } = await supabase.from('branches').select('id, company_id').eq('organization_id', orgId).limit(1);
  const { data: depts } = await supabase.from('departments').select('id').eq('organization_id', orgId).limit(1);
  const { data: desigs } = await supabase.from('designations').select('id').eq('organization_id', orgId).limit(1);

  console.log('Org:', orgId, 'Branch:', branches?.[0]?.id, 'Dept:', depts?.[0]?.id, 'Desig:', desigs?.[0]?.id);

  const testEmpId = crypto.randomUUID();
  console.log('Inserting test employee into Supabase...');

  const { data: empData, error: empErr } = await supabase.from('employees').insert({
    id: testEmpId,
    organization_id: orgId,
    company_id: branches[0].company_id,
    branch_id: branches[0].id,
    department_id: depts[0].id,
    designation_id: desigs[0].id,
    employee_code: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
    first_name: 'Test',
    last_name: 'Employee',
    display_name: 'Test Employee',
    work_email: `test.${Date.now()}@joycorporatesolutions.com`,
    phone: '+919876543210',
    gender: 'MALE',
    doj: '2026-09-05',
    employment_type: 'FULL_TIME',
    employment_status: 'ACTIVE',
  }).select().single();

  console.log('Employee Insert:', empData?.id, empErr);

  if (empData) {
    // Bank details
    const { data: bData, error: bErr } = await supabase.from('employee_bank_details').insert({
      id: crypto.randomUUID(),
      organization_id: orgId,
      employee_id: empData.id,
      account_holder_name: 'Test Employee',
      bank_name: 'HDFC Bank',
      account_number: '1234567890',
      ifsc_code: 'HDFC0001234',
      account_type: 'SALARY',
      is_verified: true,
    }).select().single();
    console.log('Bank Insert:', bData?.id, bErr);

    // Statutory details
    const { data: sData, error: sErr } = await supabase.from('employee_statutory_details').insert({
      id: crypto.randomUUID(),
      organization_id: orgId,
      employee_id: empData.id,
      pan_number: 'ABCDE1234F',
      uan_number: '100123456789',
      pf_number: 'PF123456',
      esi_number: 'ESI123456',
      is_pf_eligible: true,
      is_esi_eligible: false,
      is_pt_eligible: true,
    }).select().single();
    console.log('Statutory Insert:', sData?.id, sErr);

    // Clean up
    await supabase.from('employees').delete().eq('id', empData.id);
    console.log('Cleaned up test employee.');
  }
}

main();
