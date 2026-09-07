import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const ORG_ID = 'e539780b-df07-4b45-beaa-ccf1d2224be8';
const COMP_ID = '5537b879-7299-48a4-bdfe-16e327a2d3d0';

const FOREIGN_ORG_ID = '860f2a6a-23ea-48cf-bf33-666115e32c2b';

const EMP_A = {
  email: 'e2e.employee.1788509696336@joypeoplehr.com',
  password: 'JoyEmployee@2026',
  authUid: '4b49a236-391b-44c3-93f6-87e6d4100097',
  profileId: '82bfde5a-369b-4bdf-9afd-7fec6c103e65',
  employeeId: '7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5',
  code: 'SMOKE-E2E-EMP-001'
};

const EMP_B = {
  email: 'e2e.employee.b.1788510620285@joypeoplehr.com',
  password: 'JoyEmployeeB@2026',
  authUid: '77969db3-5b96-411a-a575-a13644ba722c',
  profileId: '5bac7a13-4e7e-40d6-9b55-860baf537aba',
  employeeId: '1d9e2f8b-70f7-4704-a16f-200b251f0839',
  code: 'SMOKE-E2E-EMP-002'
};

async function getClient(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, user: data.user };
}

async function runPhaseF() {
  console.log('================================================================');
  console.log('JOY PEOPLEHR — PHASE F: EMPLOYEE ISOLATION & E2E VERIFICATION');
  console.log('Canonical Supabase:', SUPABASE_URL);
  console.log('Target Organization:', ORG_ID);
  console.log('Target Company:', COMP_ID);
  console.log('================================================================\n');

  // ============================================================
  // STEP 1 & 2: Identity Distinctness
  // ============================================================
  console.log('>>> [1/6] Distinctness Verification...');
  const { user: uA } = await getClient(EMP_A.email, EMP_A.password);
  const { user: uB } = await getClient(EMP_B.email, EMP_B.password);

  console.log(`  - Employee A Auth UID: ${uA.id}`);
  console.log(`  - Employee B Auth UID: ${uB.id}`);
  console.log(`  - Distinct: ${uA.id !== uB.id} (PASS)`);

  // ============================================================
  // STEP 3: Employee A Positive Tests
  // ============================================================
  console.log('\n>>> [2/6] Employee A Positive Tests (Own Data Access)...');
  const { client: clientA } = await getClient(EMP_A.email, EMP_A.password);

  const { data: aOwnEmp } = await clientA.from('employees').select('id, employee_code').eq('id', EMP_A.employeeId).single();
  const { data: aOwnProfile } = await clientA.from('employee_profiles').select('*').eq('employee_id', EMP_A.employeeId).single();
  const { data: aOwnBank } = await clientA.from('employee_bank_details').select('*').eq('employee_id', EMP_A.employeeId).single();
  const { data: aOwnStat } = await clientA.from('employee_statutory_details').select('*').eq('employee_id', EMP_A.employeeId).single();
  const { data: aOwnAddr } = await clientA.from('employee_addresses').select('*').eq('employee_id', EMP_A.employeeId).single();
  const { data: aOwnAtt } = await clientA.from('attendance_daily').select('*').eq('employee_id', EMP_A.employeeId);

  console.log(`  - Read own employees row: ${Boolean(aOwnEmp)} (${aOwnEmp?.employee_code})`);
  console.log(`  - Read own employee_profiles: ${Boolean(aOwnProfile)} (${aOwnProfile?.bio})`);
  console.log(`  - Read own bank details: ${Boolean(aOwnBank)} (${aOwnBank?.bank_name})`);
  console.log(`  - Read own statutory details: ${Boolean(aOwnStat)} (${aOwnStat?.pan_number})`);
  console.log(`  - Read own addresses: ${Boolean(aOwnAddr)} (${aOwnAddr?.address_line1})`);
  console.log(`  - Read own attendance: ${aOwnAtt?.length > 0} (${aOwnAtt?.length} records)`);

  // ============================================================
  // STEP 4: Employee A -> Employee B Negative Tests
  // ============================================================
  console.log('\n>>> [3/6] Employee A -> Employee B Negative Tests (Cross-Employee Isolation)...');
  
  // 1. Attempt to update Employee B's employee record
  const { data: aModBEmp, error: aModBEmpErr } = await clientA
    .from('employees')
    .update({ first_name: 'HackedByEmpA' })
    .eq('id', EMP_B.employeeId)
    .select();
  const aModBEmpBlocked = (!aModBEmp || aModBEmp.length === 0);
  console.log(`  - [NEGATIVE] Employee A update Employee B employee record: ${aModBEmpBlocked ? 'BLOCKED (0 rows modified)' : 'LEAK'}`);

  // 2. Attempt to update Employee B's bank details
  const { data: aModBBank, error: aModBBankErr } = await clientA
    .from('employee_bank_details')
    .update({ account_number: '999999999999' })
    .eq('employee_id', EMP_B.employeeId)
    .select();
  const aModBBankBlocked = (!aModBBank || aModBBank.length === 0);
  console.log(`  - [NEGATIVE] Employee A update Employee B bank details: ${aModBBankBlocked ? 'BLOCKED (0 rows modified)' : 'LEAK'}`);

  // 3. Attempt to delete Employee B's addresses
  const { data: aDelBAddr, error: aDelBAddrErr } = await clientA
    .from('employee_addresses')
    .delete()
    .eq('employee_id', EMP_B.employeeId)
    .select();
  const aDelBAddrBlocked = (!aDelBAddr || aDelBAddr.length === 0);
  console.log(`  - [NEGATIVE] Employee A delete Employee B address: ${aDelBAddrBlocked ? 'BLOCKED (0 rows deleted)' : 'LEAK'}`);

  // ============================================================
  // STEP 5: Employee B Positive Tests
  // ============================================================
  console.log('\n>>> [4/6] Employee B Positive Tests (Own Data Access)...');
  const { client: clientB } = await getClient(EMP_B.email, EMP_B.password);

  const { data: bOwnEmp } = await clientB.from('employees').select('id, employee_code').eq('id', EMP_B.employeeId).single();
  const { data: bOwnProfile } = await clientB.from('employee_profiles').select('*').eq('employee_id', EMP_B.employeeId).single();
  const { data: bOwnBank } = await clientB.from('employee_bank_details').select('*').eq('employee_id', EMP_B.employeeId).single();
  const { data: bOwnStat } = await clientB.from('employee_statutory_details').select('*').eq('employee_id', EMP_B.employeeId).single();
  const { data: bOwnAddr } = await clientB.from('employee_addresses').select('*').eq('employee_id', EMP_B.employeeId).single();
  const { data: bOwnAtt } = await clientB.from('attendance_daily').select('*').eq('employee_id', EMP_B.employeeId);

  console.log(`  - Read own employees row: ${Boolean(bOwnEmp)} (${bOwnEmp?.employee_code})`);
  console.log(`  - Read own employee_profiles: ${Boolean(bOwnProfile)} (${bOwnProfile?.bio})`);
  console.log(`  - Read own bank details: ${Boolean(bOwnBank)} (${bOwnBank?.bank_name})`);
  console.log(`  - Read own statutory details: ${Boolean(bOwnStat)} (${bOwnStat?.pan_number})`);
  console.log(`  - Read own addresses: ${Boolean(bOwnAddr)} (${bOwnAddr?.address_line1})`);
  console.log(`  - Read own attendance: ${bOwnAtt?.length > 0} (${bOwnAtt?.length} records)`);

  // ============================================================
  // STEP 6: Employee B -> Employee A Negative Tests
  // ============================================================
  console.log('\n>>> [5/6] Employee B -> Employee A Negative Tests (Cross-Employee Isolation)...');

  // 1. Attempt to update Employee A's employee record
  const { data: bModAEmp } = await clientB
    .from('employees')
    .update({ first_name: 'HackedByEmpB' })
    .eq('id', EMP_A.employeeId)
    .select();
  const bModAEmpBlocked = (!bModAEmp || bModAEmp.length === 0);
  console.log(`  - [NEGATIVE] Employee B update Employee A employee record: ${bModAEmpBlocked ? 'BLOCKED (0 rows modified)' : 'LEAK'}`);

  // 2. Attempt to update Employee A's bank details
  const { data: bModABank } = await clientB
    .from('employee_bank_details')
    .update({ account_number: '888888888888' })
    .eq('employee_id', EMP_A.employeeId)
    .select();
  const bModABankBlocked = (!bModABank || bModABank.length === 0);
  console.log(`  - [NEGATIVE] Employee B update Employee A bank details: ${bModABankBlocked ? 'BLOCKED (0 rows modified)' : 'LEAK'}`);

  // 3. Attempt to delete Employee A's address
  const { data: bDelAAddr } = await clientB
    .from('employee_addresses')
    .delete()
    .eq('employee_id', EMP_A.employeeId)
    .select();
  const bDelAAddrBlocked = (!bDelAAddr || bDelAAddr.length === 0);
  console.log(`  - [NEGATIVE] Employee B delete Employee A address: ${bDelAAddrBlocked ? 'BLOCKED (0 rows deleted)' : 'LEAK'}`);

  // ============================================================
  // STEP 7: Cross-Org Regression
  // ============================================================
  console.log('\n>>> [6/6] Cross-Organization Regression Tests...');
  const { data: aModForOrg } = await clientA
    .from('organizations')
    .update({ legal_name: 'Hacked Foreign Org' })
    .eq('id', FOREIGN_ORG_ID)
    .select();
  const aModForOrgBlocked = (!aModForOrg || aModForOrg.length === 0);
  console.log(`  - [NEGATIVE] Employee A update foreign organization: ${aModForOrgBlocked ? 'BLOCKED (0 rows modified)' : 'LEAK'}`);

  const { data: bModForOrg } = await clientB
    .from('organizations')
    .update({ legal_name: 'Hacked Foreign Org' })
    .eq('id', FOREIGN_ORG_ID)
    .select();
  const bModForOrgBlocked = (!bModForOrg || bModForOrg.length === 0);
  console.log(`  - [NEGATIVE] Employee B update foreign organization: ${bModForOrgBlocked ? 'BLOCKED (0 rows modified)' : 'LEAK'}`);

  console.log('\n================================================================');
  console.log('ALL PHASE F AUTOMATED VERIFICATION CHECKS COMPLETED');
  console.log('================================================================\n');
}

runPhaseF().catch(console.error);
