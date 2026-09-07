import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const ORG_ID = 'e539780b-df07-4b45-beaa-ccf1d2224be8';
const COMP_ID = '5537b879-7299-48a4-bdfe-16e327a2d3d0';

const FOREIGN_ORG_ID = '860f2a6a-23ea-48cf-bf33-666115e32c2b';
const FOREIGN_COMP_ID = '77e102b1-8699-4db1-abdd-48ab08b2bf2d';

const ACCOUNTS = {
  platformAdmin: {
    name: 'Platform Admin',
    email: 'superadmin@joypeoplehr.com',
    password: 'Dharun@1912'
  },
  companyAdmin: {
    name: 'Company Admin',
    email: 'e2e.companyadmin.1788509617070@joypeoplehr.com',
    password: 'JoyCompAdmin@2026'
  },
  hrHead: {
    name: 'HR Head',
    email: 'e2e.hrhead.1788509683332@joypeoplehr.com',
    password: 'JoyHrHead@2026'
  },
  employeeA: {
    name: 'Employee A',
    email: 'e2e.employee.1788509696336@joypeoplehr.com',
    password: 'JoyEmployee@2026',
    empId: '7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5',
    profileId: '82bfde5a-369b-4bdf-9afd-7fec6c103e65'
  },
  employeeB: {
    name: 'Employee B',
    email: 'e2e.employee.b.1788510620285@joypeoplehr.com',
    password: 'JoyEmployeeB@2026',
    empId: '1d9e2f8b-70f7-4704-a16f-200b251f0839',
    profileId: '5bac7a13-4e7e-40d6-9b55-860baf537aba'
  }
};

async function getClient(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, user: data.user, session: data.session };
}

async function runPhaseGTests() {
  console.log('================================================================');
  console.log('JOY PEOPLEHR — PHASE G: REMEDIATION & ROW-LEVEL SECURITY SUITE');
  console.log('Canonical Supabase:', SUPABASE_URL);
  console.log('================================================================\n');

  const results = {
    empA_positive: {},
    empA_to_empB: {},
    empA_immutable_tampering: {},
    empA_self_update: {},
    empB_to_empA: {},
    admin_positive: {},
    cross_org: {}
  };

  const { client: clientA, user: userA } = await getClient(ACCOUNTS.employeeA.email, ACCOUNTS.employeeA.password);
  const { client: clientB, user: userB } = await getClient(ACCOUNTS.employeeB.email, ACCOUNTS.employeeB.password);
  const { client: clientCA } = await getClient(ACCOUNTS.companyAdmin.email, ACCOUNTS.companyAdmin.password);
  const { client: clientHR } = await getClient(ACCOUNTS.hrHead.email, ACCOUNTS.hrHead.password);
  const { client: clientPA } = await getClient(ACCOUNTS.platformAdmin.email, ACCOUNTS.platformAdmin.password);

  // ============================================================
  // TEST 1: Employee A Positive Own Data Access
  // ============================================================
  console.log('>>> [1/7] Employee A Positive Tests (Own Data Access)...');
  const { data: aOwnEmp } = await clientA.from('employees').select('id, employee_code, phone').eq('id', ACCOUNTS.employeeA.empId).single();
  const { data: aOwnProfile } = await clientA.from('user_profiles').select('id, full_name').eq('id', ACCOUNTS.employeeA.profileId).single();
  const { data: aOwnStat } = await clientA.from('employee_statutory_details').select('*').eq('employee_id', ACCOUNTS.employeeA.empId).maybeSingle();

  console.log(`  - Read own employees row: ${Boolean(aOwnEmp)} (${aOwnEmp?.employee_code})`);
  console.log(`  - Read own user_profiles row: ${Boolean(aOwnProfile)} (${aOwnProfile?.full_name})`);
  console.log(`  - Read own statutory details: ${Boolean(aOwnStat)} (PAN: ${aOwnStat?.pan_number})`);
  results.empA_positive = { ownEmp: Boolean(aOwnEmp), ownProfile: Boolean(aOwnProfile) };

  // ============================================================
  // TEST 2: Employee A -> Employee B Negative Tests
  // ============================================================
  console.log('\n>>> [2/7] Employee A -> Employee B Negative Tests (Intra-Tenant Peer Isolation)...');
  
  // 1. UPDATE Employee B row
  const { data: aModBEmp, error: aModBEmpErr } = await clientA
    .from('employees')
    .update({ first_name: 'HackedByEmpA' })
    .eq('id', ACCOUNTS.employeeB.empId)
    .select();
  const aModBBlocked = (!aModBEmp || aModBEmp.length === 0);
  console.log(`  - [NEGATIVE] Employee A UPDATE Employee B row: ${aModBBlocked ? 'PASS (0 rows affected / BLOCKED)' : 'FAIL (MUTATION LEAK)'}`);

  // 2. DELETE Employee B row
  const { data: aDelBEmp, error: aDelBEmpErr } = await clientA
    .from('employees')
    .delete()
    .eq('id', ACCOUNTS.employeeB.empId)
    .select();
  const aDelBBlocked = (!aDelBEmp || aDelBEmp.length === 0);
  console.log(`  - [NEGATIVE] Employee A DELETE Employee B row: ${aDelBBlocked ? 'PASS (0 rows deleted / BLOCKED)' : 'FAIL (DELETION LEAK)'}`);

  // 3. INSERT arbitrary employee row as Employee A
  const { data: aInsEmp, error: aInsEmpErr } = await clientA
    .from('employees')
    .insert({
      organization_id: ORG_ID,
      company_id: COMP_ID,
      employee_code: 'FAKE-EMP-' + Date.now(),
      first_name: 'Malicious',
      last_name: 'Insert',
      work_email: 'malicious@joy.com',
      doj: '2026-09-01'
    })
    .select();
  const aInsBlocked = Boolean(aInsEmpErr);
  console.log(`  - [NEGATIVE] Employee A INSERT new employee row: ${aInsBlocked ? 'PASS (BLOCKED: ' + aInsEmpErr?.message + ')' : 'FAIL (INSERT LEAK)'}`);

  results.empA_to_empB = {
    updateBlocked: aModBBlocked,
    deleteBlocked: aDelBBlocked,
    insertBlocked: aInsBlocked
  };

  // ============================================================
  // TEST 3: Employee A Immutable / Master Field Tampering Tests
  // ============================================================
  console.log('\n>>> [3/7] Employee A Immutable / Master-Data Field Tampering Tests...');

  // 1. Try modifying organization_id
  const { data: tOrg, error: tOrgErr } = await clientA
    .from('employees')
    .update({ organization_id: FOREIGN_ORG_ID })
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const tOrgBlocked = Boolean(tOrgErr) || (!tOrg || tOrg.length === 0);
  console.log(`  - [NEGATIVE] Alter organization_id: ${tOrgBlocked ? 'PASS (BLOCKED: ' + (tOrgErr?.message || '0 rows') + ')' : 'FAIL'}`);

  // 2. Try modifying company_id
  const { data: tComp, error: tCompErr } = await clientA
    .from('employees')
    .update({ company_id: FOREIGN_COMP_ID })
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const tCompBlocked = Boolean(tCompErr) || (!tComp || tComp.length === 0);
  console.log(`  - [NEGATIVE] Alter company_id: ${tCompBlocked ? 'PASS (BLOCKED: ' + (tCompErr?.message || '0 rows') + ')' : 'FAIL'}`);

  // 3. Try modifying user_id
  const { data: tUser, error: tUserErr } = await clientA
    .from('employees')
    .update({ user_id: ACCOUNTS.employeeB.profileId })
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const tUserBlocked = Boolean(tUserErr) || (!tUser || tUser.length === 0);
  console.log(`  - [NEGATIVE] Alter user_id: ${tUserBlocked ? 'PASS (BLOCKED: ' + (tUserErr?.message || '0 rows') + ')' : 'FAIL'}`);

  // 4. Try modifying employee_code
  const { data: tCode, error: tCodeErr } = await clientA
    .from('employees')
    .update({ employee_code: 'ESCALATED-ADMIN-001' })
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const tCodeBlocked = Boolean(tCodeErr) || (!tCode || tCode.length === 0);
  console.log(`  - [NEGATIVE] Alter employee_code: ${tCodeBlocked ? 'PASS (BLOCKED: ' + (tCodeErr?.message || '0 rows') + ')' : 'FAIL'}`);

  // 5. Try modifying employment_status
  const { data: tStatus, error: tStatusErr } = await clientA
    .from('employees')
    .update({ employment_status: 'TERMINATED' })
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const tStatusBlocked = Boolean(tStatusErr) || (!tStatus || tStatus.length === 0);
  console.log(`  - [NEGATIVE] Alter employment_status: ${tStatusBlocked ? 'PASS (BLOCKED: ' + (tStatusErr?.message || '0 rows') + ')' : 'FAIL'}`);

  // 6. Legitimate Self-Service Update (e.g. phone number)
  const newPhone = '+91 9000000099';
  const { data: legUpdate, error: legErr } = await clientA
    .from('employees')
    .update({ phone: newPhone })
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const legUpdateSuccess = Boolean(legUpdate && legUpdate.length > 0 && legUpdate[0].phone === newPhone);
  console.log(`  - [POSITIVE] Legitimate Self-Service Phone Update: ${legUpdateSuccess ? 'PASS (' + legUpdate[0].phone + ')' : 'FAIL: ' + legErr?.message}`);

  results.empA_immutable_tampering = {
    orgBlocked: tOrgBlocked,
    compBlocked: tCompBlocked,
    userBlocked: tUserBlocked,
    codeBlocked: tCodeBlocked,
    statusBlocked: tStatusBlocked,
    legitimateSelfUpdate: legUpdateSuccess
  };

  // ============================================================
  // TEST 4: Employee B -> Employee A Negative Tests
  // ============================================================
  console.log('\n>>> [4/7] Employee B -> Employee A Negative Tests (Intra-Tenant Peer Isolation)...');
  
  // 1. UPDATE Employee A row
  const { data: bModAEmp } = await clientB
    .from('employees')
    .update({ first_name: 'HackedByEmpB' })
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const bModABlocked = (!bModAEmp || bModAEmp.length === 0);
  console.log(`  - [NEGATIVE] Employee B UPDATE Employee A row: ${bModABlocked ? 'PASS (0 rows affected / BLOCKED)' : 'FAIL (MUTATION LEAK)'}`);

  // 2. DELETE Employee A row
  const { data: bDelAEmp } = await clientB
    .from('employees')
    .delete()
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const bDelABlocked = (!bDelAEmp || bDelAEmp.length === 0);
  console.log(`  - [NEGATIVE] Employee B DELETE Employee A row: ${bDelABlocked ? 'PASS (0 rows deleted / BLOCKED)' : 'FAIL (DELETION LEAK)'}`);

  results.empB_to_empA = {
    updateBlocked: bModABlocked,
    deleteBlocked: bDelABlocked
  };

  // ============================================================
  // TEST 5: Company Admin & HR Head Positive Employee Management
  // ============================================================
  console.log('\n>>> [5/7] Company Admin & HR Head Management Tests...');

  // 1. Company Admin updates Employee B's phone
  const { data: caModEmp, error: caModErr } = await clientCA
    .from('employees')
    .update({ phone: '+91 9000000055' })
    .eq('id', ACCOUNTS.employeeB.empId)
    .select();
  const caModSuccess = Boolean(caModEmp && caModEmp.length > 0);
  console.log(`  - [POSITIVE] Company Admin UPDATE Employee B: ${caModSuccess ? 'PASS' : 'FAIL: ' + caModErr?.message}`);

  // 2. HR Head updates Employee A's phone
  const { data: hrModEmp, error: hrModErr } = await clientHR
    .from('employees')
    .update({ phone: '+91 9000000077' })
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const hrModSuccess = Boolean(hrModEmp && hrModEmp.length > 0);
  console.log(`  - [POSITIVE] HR Head UPDATE Employee A: ${hrModSuccess ? 'PASS' : 'FAIL: ' + hrModErr?.message}`);

  // 3. Platform Admin updates Employee A
  const { data: paModEmp, error: paModErr } = await clientPA
    .from('employees')
    .update({ phone: '+91 9000000088' })
    .eq('id', ACCOUNTS.employeeA.empId)
    .select();
  const paModSuccess = Boolean(paModEmp && paModEmp.length > 0);
  console.log(`  - [POSITIVE] Platform Admin UPDATE Employee A: ${paModSuccess ? 'PASS' : 'FAIL: ' + paModErr?.message}`);

  results.admin_positive = {
    companyAdmin: caModSuccess,
    hrHead: hrModSuccess,
    platformAdmin: paModSuccess
  };

  // ============================================================
  // TEST 6: Cross-Organization Regression Tests
  // ============================================================
  console.log('\n>>> [6/7] Cross-Organization Regression Tests...');

  const { data: caCrossOrg } = await clientCA
    .from('organizations')
    .update({ legal_name: 'Hacked Foreign Org' })
    .eq('id', FOREIGN_ORG_ID)
    .select();
  const caCrossBlocked = (!caCrossOrg || caCrossOrg.length === 0);
  console.log(`  - [NEGATIVE] Company Admin UPDATE Foreign Org: ${caCrossBlocked ? 'PASS (0 rows affected)' : 'FAIL'}`);

  const { data: hrCrossOrg } = await clientHR
    .from('organizations')
    .update({ legal_name: 'Hacked Foreign Org' })
    .eq('id', FOREIGN_ORG_ID)
    .select();
  const hrCrossBlocked = (!hrCrossOrg || hrCrossOrg.length === 0);
  console.log(`  - [NEGATIVE] HR Head UPDATE Foreign Org: ${hrCrossBlocked ? 'PASS (0 rows affected)' : 'FAIL'}`);

  const { data: empCrossOrg } = await clientA
    .from('organizations')
    .update({ legal_name: 'Hacked Foreign Org' })
    .eq('id', FOREIGN_ORG_ID)
    .select();
  const empCrossBlocked = (!empCrossOrg || empCrossOrg.length === 0);
  console.log(`  - [NEGATIVE] Employee A UPDATE Foreign Org: ${empCrossBlocked ? 'PASS (0 rows affected)' : 'FAIL'}`);

  results.cross_org = {
    companyAdminBlocked: caCrossBlocked,
    hrHeadBlocked: hrCrossBlocked,
    employeeBlocked: empCrossBlocked
  };

  console.log('\n================================================================');
  console.log('PHASE G REMEDIATION CERTIFICATION COMPLETE');
  console.log('================================================================\n');
}

runPhaseGTests().catch(console.error);
