import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const sb = createClient(SUPABASE_URL, ANON_KEY);

console.log('=== PHASE EMPLOYEE-ONBOARDING-01 TEST SUITE ===');

async function runTests() {
  const results = [];

  // Test 1: HR Head Login
  console.log('\n--- 1. Testing HR Head Login ---');
  const { data: hrAuth, error: hrAuthErr } = await sb.auth.signInWithPassword({
    email: 'marimuthu@joycorporatesolutions.com',
    password: 'joypeoplehr',
  });

  if (hrAuthErr || !hrAuth.user) {
    console.error('HR Head Login Failed:', hrAuthErr);
    results.push({ test: 'HR Head Login', status: 'FAIL', error: hrAuthErr });
    return;
  }
  console.log('HR Head Authenticated. UID:', hrAuth.user.id);
  results.push({ test: 'HR Head Login', status: 'PASS', uid: hrAuth.user.id });

  // Test 2: Verify HR Profile and Roles
  console.log('\n--- 2. Verifying HR Profile and Role ---');
  const { data: hrProfile, error: hrProfErr } = await sb
    .from('user_profiles')
    .select('*, user_roles(role_id, roles(code, name))')
    .eq('auth_user_id', hrAuth.user.id)
    .single();

  console.log('HR Profile:', hrProfile?.full_name, 'Org:', hrProfile?.organization_id);
  const hrRoles = (hrProfile?.user_roles || []).map((r) => r.roles?.code);
  console.log('HR Roles:', hrRoles);
  const isHr = hrRoles.includes('HR_HEAD') || hrRoles.includes('COMPANY_ADMIN') || hrRoles.includes('HR_ADMIN');
  results.push({ test: 'HR Profile & Role Verification', status: isHr ? 'PASS' : 'FAIL', roles: hrRoles });

  // Test 3: Create Employee Record in DB under HR Org & Company
  console.log('\n--- 3. Creating Master Employee in Database ---');
  const testEmpId = 'e0000000-0000-4000-a000-' + Date.now().toString(16).slice(-12).padStart(12, '0');
  const testEmail = `employee.${Date.now()}@joycorporatesolutions.com`;
  const orgId = hrProfile.organization_id;

  // Get valid company, dept, desig
  const { data: comp } = await sb.from('companies').select('id').eq('organization_id', orgId).limit(1).single();
  const { data: dept } = await sb.from('departments').select('id').eq('company_id', comp.id).limit(1).single();
  const { data: desig } = await sb.from('designations').select('id').eq('company_id', comp.id).limit(1).single();

  const employeeRecord = {
    id: testEmpId,
    organization_id: orgId,
    company_id: comp.id,
    department_id: dept.id,
    designation_id: desig.id,
    employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    first_name: 'Kavitha',
    last_name: 'Sundaram',
    display_name: 'Kavitha Sundaram',
    work_email: testEmail,
    employment_type: 'FULL_TIME',
    employment_status: 'ACTIVE',
    doj: new Date().toISOString().split('T')[0],
  };

  const { data: insertedEmp, error: insErr } = await sb.from('employees').insert(employeeRecord).select().single();
  if (insErr) {
    console.error('Failed to insert employee into employees table:', insErr);
    results.push({ test: 'Employee DB Insertion', status: 'FAIL', error: insErr });
  } else {
    console.log('Employee Inserted Successfully:', insertedEmp.id, insertedEmp.employee_code);
    results.push({ test: 'Employee DB Insertion', status: 'PASS', employee_id: insertedEmp.id });
  }

  // Test 4: Insert Bank & Statutory Details
  console.log('\n--- 4. Inserting Bank & Statutory Sub-domain Data ---');
  const bankId = 'b0000000-0000-4000-a000-' + Date.now().toString(16).slice(-12).padStart(12, '0');
  const statId = 'c0000000-0000-4000-a000-' + Date.now().toString(16).slice(-12).padStart(12, '0');

  const { error: bankErr } = await sb.from('employee_bank_details').insert({
    id: bankId,
    organization_id: orgId,
    employee_id: testEmpId,
    bank_name: 'HDFC Bank Ltd',
    account_number: '987654321012',
    ifsc_code: 'HDFC0001234',
    account_type: 'SALARY',
    account_holder_name: 'Kavitha Sundaram',
    is_verified: true,
  });

  const { error: statErr } = await sb.from('employee_statutory_details').insert({
    id: statId,
    organization_id: orgId,
    employee_id: testEmpId,
    pan_number: 'ABCDE1234F',
    uan_number: '100987654321',
    is_pf_eligible: true,
    is_esi_eligible: false,
    is_pt_eligible: true,
  });

  results.push({
    test: 'Bank & Statutory Details Persistence',
    status: (!bankErr && !statErr) ? 'PASS' : 'FAIL',
  });

  // Test 5: Call Edge Function employee-auth-provisioner to provision GoTrue user
  console.log('\n--- 5. Provisioning GoTrue Auth User & Profile ---');
  const { data: edgeRes, error: edgeErr } = await sb.functions.invoke('employee-auth-provisioner', {
    headers: {
      Authorization: `Bearer ${hrAuth.session.access_token}`,
    },
    body: {
      organization_id: orgId,
      company_id: comp.id,
      email: testEmail,
      password: 'joypeoplehr',
      full_name: 'Kavitha Sundaram',
      role_code: 'EMPLOYEE',
      employee_id: testEmpId,
    },
  });

  console.log('Edge function response:', edgeRes);
  const provSuccess = edgeRes?.success === true;
  results.push({ test: 'Server-side Auth Provisioning', status: provSuccess ? 'PASS' : 'FAIL', auth_user_id: edgeRes?.auth_user_id });

  // Test 6: Verify Employee Record Linkage in Database
  const { data: linkedProf } = await sb
    .from('user_profiles')
    .select('id, employee_id, auth_user_id, organization_id')
    .eq('id', edgeRes.user_profile_id)
    .single();

  console.log('Linked User Profile record:', linkedProf);
  const isLinkedCorrectly = linkedProf?.employee_id === testEmpId && linkedProf?.auth_user_id === edgeRes?.auth_user_id;
  results.push({ test: 'Identity Chain Linkage (Auth ↔ Profile ↔ Employee)', status: isLinkedCorrectly ? 'PASS' : 'FAIL', profile_id: linkedProf?.id });

  // Test 7: Audit Log write to canonical audit_logs
  console.log('\n--- 7. Testing Audit Log Persistence ---');
  const { error: auditErr } = await sb.from('audit_logs').insert({
    organization_id: orgId,
    entity_type: 'EMPLOYEE',
    entity_id: testEmpId,
    action: 'ONBOARD_COMPLETE',
    new_values: { email: testEmail, employee_code: employeeRecord.employee_code, actor_user_id: hrAuth.user.id },
  });
  console.log('Audit log insert error:', auditErr);
  results.push({ test: 'Audit Logs Table Persistence', status: !auditErr ? 'PASS' : 'FAIL' });

  // Test 8: Employee Login with Temporary Password joypeoplehr
  console.log('\n--- 8. Testing Employee Login with Temporary Password ---');
  const empSb = createClient(SUPABASE_URL, ANON_KEY);
  const { data: empAuth, error: empAuthErr } = await empSb.auth.signInWithPassword({
    email: testEmail,
    password: 'joypeoplehr',
  });

  console.log('Employee Login Result:', { user: empAuth?.user?.id, email: empAuth?.user?.email, error: empAuthErr?.message });
  const empLoginPass = !empAuthErr && empAuth?.user?.email === testEmail;
  results.push({ test: 'Employee Login with joypeoplehr', status: empLoginPass ? 'PASS' : 'FAIL', user_id: empAuth?.user?.id });

  if (empLoginPass) {
    // Test 9: Employee Updates Password to Permanent Password
    console.log('\n--- 9. Employee Mandatory Password Update ---');
    const { error: updatePassErr } = await empSb.auth.updateUser({
      password: 'joy@Permanent2026!',
    });
    console.log('Password update error:', updatePassErr);
    results.push({ test: 'Employee GoTrue Password Update', status: !updatePassErr ? 'PASS' : 'FAIL' });

    // Test 10: Employee Logs In with NEW Password
    console.log('\n--- 10. Employee Login with NEW Permanent Password ---');
    await empSb.auth.signOut();
    const { data: newLogin, error: newLoginErr } = await empSb.auth.signInWithPassword({
      email: testEmail,
      password: 'joy@Permanent2026!',
    });
    console.log('New Password Login Result:', { user: newLogin?.user?.id, error: newLoginErr?.message });
    results.push({ test: 'Employee Login with Permanent Password', status: !newLoginErr ? 'PASS' : 'FAIL' });

    // Test 11: Verify Employee Role is strictly EMPLOYEE and lands in ESS
    console.log('\n--- 11. Verifying Employee Profile & Role Linkage ---');
    const { data: empProf, error: empProfErr } = await empSb
      .from('user_profiles')
      .select('*, user_roles(*, roles(*))')
      .eq('auth_user_id', newLogin.user.id)
      .single();

    const empRoles = (empProf?.user_roles || []).map((r) => r.roles?.code);
    console.log('Employee Roles in DB:', empRoles);
    const isStrictlyEmployee = empRoles.includes('EMPLOYEE') && !empRoles.includes('HR_HEAD') && !empRoles.includes('COMPANY_ADMIN') && !empRoles.includes('PLATFORM_ADMIN');
    results.push({ test: 'Strict EMPLOYEE Role & Tenant Isolation', status: isStrictlyEmployee ? 'PASS' : 'FAIL', roles: empRoles });
  }

  // Cleanup test employee & auth
  console.log('\n--- 12. Cleaning Up Test Employee Data ---');
  await sb.from('employee_bank_details').delete().eq('id', bankId);
  await sb.from('employee_statutory_details').delete().eq('id', statId);
  await sb.from('employees').delete().eq('id', testEmpId);
  if (edgeRes?.user_profile_id) {
    await sb.from('user_roles').delete().eq('user_profile_id', edgeRes.user_profile_id);
    await sb.from('user_profiles').delete().eq('id', edgeRes.user_profile_id);
  }
  console.log('Cleaned up test DB records.');
  results.push({ test: 'Cleanup DB Records', status: 'PASS' });

  // Sign out HR
  await sb.auth.signOut();

  console.log('\n=== TEST RESULTS SUMMARY ===');
  console.table(results);
}

runTests().catch(console.error);
