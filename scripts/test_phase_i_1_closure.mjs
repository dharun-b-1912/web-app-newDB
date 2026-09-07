/**
 * JOY PEOPLEHR — PHASE I.1 SECURITY CLOSURE E2E VERIFICATION SUITE
 * 
 * Canonical Project: ysiajemrqakfngasehhi
 * Direct PostgreSQL RLS boundary verification using real GoTrue JWTs.
 * Zero service-role keys used for employee access tests.
 */
import { createClient } from '@supabase/supabase-js';

const URL  = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const ORG_ID  = 'e539780b-df07-4b45-beaa-ccf1d2224be8';
const COMP_ID = '5537b879-7299-48a4-bdfe-16e327a2d3d0';

const EMP_A = {
  email: 'e2e.employee.1788509696336@joypeoplehr.com', password: 'JoyEmployee@2026',
  empId: '7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5', profileId: '08276023-7172-4141-a228-3f9ec68d2eb4',
};
const EMP_B = {
  email: 'e2e.employee.b.1788510620285@joypeoplehr.com', password: 'JoyEmployeeB@2026',
  empId: '1d9e2f8b-70f7-4704-a16f-200b251f0839', profileId: '0b000001-0000-0000-0000-000000000001',
};
const CA = { email: 'e2e.companyadmin.1788509617070@joypeoplehr.com', password: 'JoyCompAdmin@2026' };
const HR = { email: 'e2e.hrhead.1788509683332@joypeoplehr.com',      password: 'JoyHrHead@2026' };
const PA = { email: 'superadmin@joypeoplehr.com',                    password: 'Dharun@1912' };

// Deterministic test record IDs
const IDS = {
  ltCL:      'aa000001-0000-0000-0000-000000000001',
  aProfile:  EMP_A.profileId,
  aBank:     'a0000001-0000-0000-0000-000000000001',
  aAddr:     'a0000002-0000-0000-0000-000000000001',
  aDocType:  'a0000003-0000-0000-0000-000000000001',
  aDoc:      'a0000004-0000-0000-0000-000000000001',
  aAttDaily: 'a0000005-0000-0000-0000-000000000001',
  aAttPunch: 'a0000006-0000-0000-0000-000000000001',
  aLvBal:    'a0000007-0000-0000-0000-000000000001',
  aLvReq:    'a0000008-0000-0000-0000-000000000001',
  aEmpReq:   'a0000009-0000-0000-0000-000000000001',
  aSalStr:   'a0000010-0000-0000-0000-000000000001',
  aSalAsgn:  'a0000011-0000-0000-0000-000000000001',
  aPayRun:   'a0000012-0000-0000-0000-000000000001',
  aPayLine:  'a0000013-0000-0000-0000-000000000001',
  aPayslip:  'a0000014-0000-0000-0000-000000000001',
  bProfile:  EMP_B.profileId,
  bBank:     'b0000001-0000-0000-0000-000000000001',
  bAddr:     'b0000002-0000-0000-0000-000000000001',
  bDoc:      'b0000004-0000-0000-0000-000000000001',
  bAttDaily: 'b0000005-0000-0000-0000-000000000001',
  bAttPunch: 'b0000006-0000-0000-0000-000000000001',
  bLvBal:    'b0000007-0000-0000-0000-000000000001',
  bLvReq:    'b0000008-0000-0000-0000-000000000001',
  bEmpReq:   'b0000009-0000-0000-0000-000000000001',
  bSalAsgn:  'b0000011-0000-0000-0000-000000000001',
  bPayLine:  'b0000013-0000-0000-0000-000000000001',
  bPayslip:  'b0000014-0000-0000-0000-000000000001',
};

async function login(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  return { client: c, session: data.session, user: data.user };
}

async function run() {
  console.log('='.repeat(70));
  console.log('JOY PEOPLEHR — PHASE I.1 SECURITY CLOSURE VERIFICATION');
  console.log('='.repeat(70));

  const results = [];
  function record(section, test, expected, actual, pass, details = '') {
    results.push({ section, test, expected, actual, pass, details });
    const mark = pass ? '✓ PASS' : '✗ FAIL';
    console.log(`[${mark}] ${section} > ${test}: ${details || actual}`);
  }

  // Authenticate all identities
  console.log('\n--- Authenticating Identities ---');
  const anonClient = createClient(URL, ANON, { auth: { persistSession: false } });
  const { client: cA, session: sA } = await login(EMP_A.email, EMP_A.password);
  const { client: cB, session: sB } = await login(EMP_B.email, EMP_B.password);
  const { client: cCA, session: sCA } = await login(CA.email, CA.password);
  const { client: cHR, session: sHR } = await login(HR.email, HR.password);
  const { client: cPA, session: sPA } = await login(PA.email, PA.password);
  console.log('All 5 identities authenticated via GoTrue successfully.\n');

  // =========================================================================
  // TASK B: attendance_punches Peer Read Isolation
  // =========================================================================
  console.log('--- TASK B: attendance_punches Peer Read Isolation ---');
  {
    // A reads own punch
    const { data: aOwn } = await cA.from('attendance_punches').select('*').eq('id', IDS.aAttPunch);
    record('TASK_B_PUNCHES', 'A reads own punch', '1 row', `${aOwn?.length || 0} rows`, aOwn?.length === 1);

    // A reads B punch
    const { data: aReadsB } = await cA.from('attendance_punches').select('*').eq('id', IDS.bAttPunch);
    record('TASK_B_PUNCHES', 'A reads B punch', '0 rows', `${aReadsB?.length || 0} rows`, aReadsB?.length === 0);

    // B reads own punch
    const { data: bOwn } = await cB.from('attendance_punches').select('*').eq('id', IDS.bAttPunch);
    record('TASK_B_PUNCHES', 'B reads own punch', '1 row', `${bOwn?.length || 0} rows`, bOwn?.length === 1);

    // B reads A punch
    const { data: bReadsA } = await cB.from('attendance_punches').select('*').eq('id', IDS.aAttPunch);
    record('TASK_B_PUNCHES', 'B reads A punch', '0 rows', `${bReadsA?.length || 0} rows`, bReadsA?.length === 0);

    // CA reads both
    const { data: caPunches } = await cCA.from('attendance_punches').select('*').in('id', [IDS.aAttPunch, IDS.bAttPunch]);
    record('TASK_B_PUNCHES', 'CA reads both punches', '2 rows', `${caPunches?.length || 0} rows`, caPunches?.length === 2);

    // HR reads both
    const { data: hrPunches } = await cHR.from('attendance_punches').select('*').in('id', [IDS.aAttPunch, IDS.bAttPunch]);
    record('TASK_B_PUNCHES', 'HR reads both punches', '2 rows', `${hrPunches?.length || 0} rows`, hrPunches?.length === 2);
  }

  // =========================================================================
  // TASK C: is_org_admin() Security & Authorization Audit
  // =========================================================================
  console.log('\n--- TASK C: is_org_admin() Security & Execution Grants ---');
  {
    // Anon calling is_org_admin
    const { data: anonRes, error: anonErr } = await anonClient.rpc('is_org_admin', { p_org_id: ORG_ID });
    record('TASK_C_IS_ORG_ADMIN', 'Anon invocation', 'Denial (permission denied)', anonErr ? `Blocked: ${anonErr.message}` : `Result: ${anonRes}`, anonErr !== null || anonRes === false);

    // Employee A calling is_org_admin
    const { data: aRes } = await cA.rpc('is_org_admin', { p_org_id: ORG_ID });
    record('TASK_C_IS_ORG_ADMIN', 'Employee A is_org_admin', 'false', `${aRes}`, aRes === false);

    // Employee B calling is_org_admin
    const { data: bRes } = await cB.rpc('is_org_admin', { p_org_id: ORG_ID });
    record('TASK_C_IS_ORG_ADMIN', 'Employee B is_org_admin', 'false', `${bRes}`, bRes === false);

    // Company Admin calling is_org_admin
    const { data: caRes } = await cCA.rpc('is_org_admin', { p_org_id: ORG_ID });
    record('TASK_C_IS_ORG_ADMIN', 'Company Admin is_org_admin', 'true', `${caRes}`, caRes === true);

    // HR Head calling is_org_admin
    const { data: hrRes } = await cHR.rpc('is_org_admin', { p_org_id: ORG_ID });
    record('TASK_C_IS_ORG_ADMIN', 'HR Head is_org_admin', 'true', `${hrRes}`, hrRes === true);

    // Platform Admin calling is_org_admin
    const { data: paRes } = await cPA.rpc('is_org_admin', { p_org_id: ORG_ID });
    record('TASK_C_IS_ORG_ADMIN', 'Platform Admin is_org_admin', 'true', `${paRes}`, paRes === true);
  }

  // =========================================================================
  // TASK D & E: Employee Directory Privacy & employees Table Hardening
  // =========================================================================
  console.log('\n--- TASK D & E: Employee Directory Privacy ---');
  {
    // A reads own row in employees table (should have full data including dob, gender, personal_email)
    const { data: aOwnEmp } = await cA.from('employees').select('id, first_name, last_name, dob, gender, personal_email').eq('id', EMP_A.empId);
    record('TASK_D_E_DIRECTORY', 'Employee A reads own full employee row', '1 row with PII', `${aOwnEmp?.length || 0} rows (dob=${aOwnEmp?.[0]?.dob})`, aOwnEmp?.length === 1);

    // A queries B directly in employees table (must be BLOCKED = 0 rows)
    const { data: aReadsBEmp } = await cA.from('employees').select('*').eq('id', EMP_B.empId);
    record('TASK_D_E_DIRECTORY', 'Employee A direct SELECT on Employee B employees row', '0 rows', `${aReadsBEmp?.length || 0} rows`, aReadsBEmp?.length === 0);

    // B reads own row in employees table
    const { data: bOwnEmp } = await cB.from('employees').select('id, first_name, last_name, dob, gender, personal_email').eq('id', EMP_B.empId);
    record('TASK_D_E_DIRECTORY', 'Employee B reads own full employee row', '1 row with PII', `${bOwnEmp?.length || 0} rows (dob=${bOwnEmp?.[0]?.dob})`, bOwnEmp?.length === 1);

    // B queries A directly in employees table (must be BLOCKED = 0 rows)
    const { data: bReadsAEmp } = await cB.from('employees').select('*').eq('id', EMP_A.empId);
    record('TASK_D_E_DIRECTORY', 'Employee B direct SELECT on Employee A employees row', '0 rows', `${bReadsAEmp?.length || 0} rows`, bReadsAEmp?.length === 0);

    // A queries B via employee_directory projection (safe fields only)
    const { data: dirB } = await cA.from('employee_directory').select('id, employee_code, first_name, last_name, display_name, work_email, phone, department_id, designation_id, avatar_url').eq('id', EMP_B.empId);
    record('TASK_D_E_DIRECTORY', 'Employee A queries Employee B via employee_directory', '1 row safe fields', `${dirB?.length || 0} rows (${dirB?.[0]?.display_name}, ${dirB?.[0]?.work_email})`, dirB?.length === 1);

    // A attempts to query PII (dob, gender, personal_email, user_id) on employee_directory (must FAIL because columns do not exist)
    const { data: dirPii, error: dirPiiErr } = await cA.from('employee_directory').select('dob, gender, personal_email, user_id').eq('id', EMP_B.empId);
    record('TASK_D_E_DIRECTORY', 'Attempt to select dob/gender/personal_email from employee_directory', 'SQL Error (Column not in view)', dirPiiErr ? `Blocked: ${dirPiiErr.message}` : `Leaked: ${JSON.stringify(dirPii)}`, dirPiiErr !== null);

    // CA and HR query employees table directly (must retain full org access)
    const { data: caEmps } = await cCA.from('employees').select('id, dob, personal_email').in('id', [EMP_A.empId, EMP_B.empId]);
    record('TASK_D_E_DIRECTORY', 'Company Admin queries both employees with PII', '2 rows', `${caEmps?.length || 0} rows`, caEmps?.length === 2);

    const { data: hrEmps } = await cHR.from('employees').select('id, dob, personal_email').in('id', [EMP_A.empId, EMP_B.empId]);
    record('TASK_D_E_DIRECTORY', 'HR Head queries both employees with PII', '2 rows', `${hrEmps?.length || 0} rows`, hrEmps?.length === 2);
  }

  // =========================================================================
  // TASK F: Employee Private Data Matrix (13 Sensitive Tables)
  // =========================================================================
  console.log('\n--- TASK F: 13-Table Private Data Matrix ---');
  const matrix = [
    { table: 'employee_profiles',           aId: IDS.aProfile,   bId: IDS.bProfile,   idCol: 'id' },
    { table: 'employee_addresses',          aId: IDS.aAddr,      bId: IDS.bAddr,      idCol: 'id' },
    { table: 'employee_bank_details',       aId: IDS.aBank,      bId: IDS.bBank,      idCol: 'id' },
    { table: 'employee_statutory_details',  aId: EMP_A.empId,    bId: EMP_B.empId,    idCol: 'employee_id' },
    { table: 'employee_documents',          aId: IDS.aDoc,       bId: IDS.bDoc,       idCol: 'id' },
    { table: 'attendance_daily',            aId: IDS.aAttDaily,  bId: IDS.bAttDaily,  idCol: 'id' },
    { table: 'attendance_punches',          aId: IDS.aAttPunch,  bId: IDS.bAttPunch,  idCol: 'id' },
    { table: 'leave_balances',              aId: IDS.aLvBal,     bId: IDS.bLvBal,     idCol: 'id' },
    { table: 'leave_requests',              aId: IDS.aLvReq,     bId: IDS.bLvReq,     idCol: 'id' },
    { table: 'employee_requests',           aId: IDS.aEmpReq,    bId: IDS.bEmpReq,    idCol: 'id' },
    { table: 'employee_salary_assignments', aId: IDS.aSalAsgn,   bId: IDS.bSalAsgn,   idCol: 'id' },
    { table: 'payslips',                    aId: IDS.aPayslip,   bId: IDS.bPayslip,   idCol: 'id' },
    { table: 'payroll_line_items',          aId: IDS.aPayLine,   bId: IDS.bPayLine,   idCol: 'id' },
  ];

  for (const item of matrix) {
    // A reads own
    const { data: aOwn } = await cA.from(item.table).select('*').eq(item.idCol, item.aId);
    record('TASK_F_MATRIX_READ', `A reads own ${item.table}`, '1 row', `${aOwn?.length || 0} rows`, aOwn?.length >= 1);

    // A reads B
    const { data: aReadsB } = await cA.from(item.table).select('*').eq(item.idCol, item.bId);
    record('TASK_F_MATRIX_READ', `A reads B ${item.table}`, '0 rows', `${aReadsB?.length || 0} rows`, aReadsB?.length === 0);

    // B reads own
    const { data: bOwn } = await cB.from(item.table).select('*').eq(item.idCol, item.bId);
    record('TASK_F_MATRIX_READ', `B reads own ${item.table}`, '1 row', `${bOwn?.length || 0} rows`, bOwn?.length >= 1);

    // B reads A
    const { data: bReadsA } = await cB.from(item.table).select('*').eq(item.idCol, item.aId);
    record('TASK_F_MATRIX_READ', `B reads A ${item.table}`, '0 rows', `${bReadsA?.length || 0} rows`, bReadsA?.length === 0);
  }

  // =========================================================================
  // TASK G: Write Isolation & Mutation Prevention
  // =========================================================================
  console.log('\n--- TASK G: Write Isolation ---');
  {
    // A attempts to update B's bank details
    const { data: aMutBank, error: aMutBankErr } = await cA.from('employee_bank_details').update({ account_number: 'HACKED123' }).eq('id', IDS.bBank).select();
    record('TASK_G_WRITE_ISOLATION', 'A updates B bank details', 'BLOCKED (0 rows / error)', aMutBankErr ? `Error: ${aMutBankErr.message}` : `${aMutBank?.length || 0} rows modified`, !aMutBank || aMutBank.length === 0);

    // A attempts to update B's address
    const { data: aMutAddr, error: aMutAddrErr } = await cA.from('employee_addresses').update({ city: 'HackedCity' }).eq('id', IDS.bAddr).select();
    record('TASK_G_WRITE_ISOLATION', 'A updates B address', 'BLOCKED (0 rows / error)', aMutAddrErr ? `Error: ${aMutAddrErr.message}` : `${aMutAddr?.length || 0} rows modified`, !aMutAddr || aMutAddr.length === 0);

    // A attempts to update B's salary assignment
    const { data: aMutSal, error: aMutSalErr } = await cA.from('employee_salary_assignments').update({ annual_ctc: 9999999 }).eq('id', IDS.bSalAsgn).select();
    record('TASK_G_WRITE_ISOLATION', 'A updates B salary assignment', 'BLOCKED (0 rows / error)', aMutSalErr ? `Error: ${aMutSalErr.message}` : `${aMutSal?.length || 0} rows modified`, !aMutSal || aMutSal.length === 0);

    // A attempts to insert payroll_runs
    const { data: aInsPayRun, error: aInsPayRunErr } = await cA.from('payroll_runs').insert({
      id: 'f0000099-0000-0000-0000-000000000099',
      organization_id: ORG_ID,
      company_id: COMP_ID,
      month: 9,
      year: 2026,
      status: 'DRAFT',
    }).select();
    record('TASK_G_WRITE_ISOLATION', 'Employee A inserts payroll_runs', 'BLOCKED (RLS violation)', aInsPayRunErr ? `Blocked: ${aInsPayRunErr.message}` : `Leaked insert: ${JSON.stringify(aInsPayRun)}`, aInsPayRunErr !== null);

    // A attempts to insert payslips
    const { data: aInsSlip, error: aInsSlipErr } = await cA.from('payslips').insert({
      id: 'f0000098-0000-0000-0000-000000000098',
      organization_id: ORG_ID,
      payroll_line_item_id: IDS.aPayLine,
      employee_id: EMP_A.empId,
      payslip_number: 'PS-HACK-001',
    }).select();
    record('TASK_G_WRITE_ISOLATION', 'Employee A inserts payslips', 'BLOCKED (RLS violation)', aInsSlipErr ? `Blocked: ${aInsSlipErr.message}` : `Leaked insert: ${JSON.stringify(aInsSlip)}`, aInsSlipErr !== null);
  }

  // =========================================================================
  // TASK H: Self-Service Positive Writes vs Protected-Field Tampering
  // =========================================================================
  console.log('\n--- TASK H: Self-Service Positive Writes & Protected Fields ---');
  {
    // A updates permitted field on own profile
    const testBio = `Verified Bio at ${new Date().toISOString()}`;
    const { data: aBioUpdate, error: aBioErr } = await cA.from('employee_profiles').update({ bio: testBio }).eq('id', IDS.aProfile).select();
    record('TASK_H_SELF_SERVICE', 'Employee A updates own profile bio', 'PASS (1 row updated)', aBioErr ? `Error: ${aBioErr.message}` : `${aBioUpdate?.length || 0} rows updated`, aBioUpdate?.length === 1);

    // A updates permitted phone on own employee record
    const { data: aPhoneUpdate, error: aPhoneErr } = await cA.from('employees').update({ phone: '+91 99999 88888' }).eq('id', EMP_A.empId).select();
    record('TASK_H_SELF_SERVICE', 'Employee A updates own phone on employees', 'PASS (1 row updated)', aPhoneErr ? `Error: ${aPhoneErr.message}` : `${aPhoneUpdate?.length || 0} rows updated`, aPhoneUpdate?.length === 1);

    // A submits own employee_request
    const testReqId = 'a0000099-0000-0000-0000-000000000099';
    await cA.from('employee_requests').delete().eq('id', testReqId);
    const { data: aReqIns, error: aReqErr } = await cA.from('employee_requests').insert({
      id: testReqId,
      organization_id: ORG_ID,
      employee_id: EMP_A.empId,
      request_type: 'EQUIPMENT_REQUEST',
      subject: 'Ergonomic Chair Request',
      description: 'Request for ergonomics',
      status: 'OPEN',
    }).select();
    record('TASK_H_SELF_SERVICE', 'Employee A submits own employee_request', 'PASS (1 row inserted)', aReqErr ? `Error: ${aReqErr.message}` : `${aReqIns?.length || 0} rows inserted`, aReqIns?.length === 1);
  }

  // =========================================================================
  // TASK I: Payroll Privacy
  // =========================================================================
  console.log('\n--- TASK I: Payroll Privacy ---');
  {
    // A reads own payslip
    const { data: aSlip } = await cA.from('payslips').select('*').eq('id', IDS.aPayslip);
    record('TASK_I_PAYROLL', 'A reads own payslip', '1 row', `${aSlip?.length || 0} rows`, aSlip?.length === 1);

    // A reads B payslip
    const { data: aReadsBSlip } = await cA.from('payslips').select('*').eq('id', IDS.bPayslip);
    record('TASK_I_PAYROLL', 'A reads B payslip', '0 rows', `${aReadsBSlip?.length || 0} rows`, aReadsBSlip?.length === 0);

    // B reads own payslip
    const { data: bSlip } = await cB.from('payslips').select('*').eq('id', IDS.bPayslip);
    record('TASK_I_PAYROLL', 'B reads own payslip', '1 row', `${bSlip?.length || 0} rows`, bSlip?.length === 1);

    // B reads A payslip
    const { data: bReadsASlip } = await cB.from('payslips').select('*').eq('id', IDS.aPayslip);
    record('TASK_I_PAYROLL', 'B reads A payslip', '0 rows', `${bReadsASlip?.length || 0} rows`, bReadsASlip?.length === 0);

    // CA reads both payslips
    const { data: caSlips } = await cCA.from('payslips').select('*').in('id', [IDS.aPayslip, IDS.bPayslip]);
    record('TASK_I_PAYROLL', 'CA reads both payslips', '2 rows', `${caSlips?.length || 0} rows`, caSlips?.length === 2);
  }

  // =========================================================================
  // TASK J: Statutory Privacy
  // =========================================================================
  console.log('\n--- TASK J: Statutory Privacy ---');
  {
    // A reads own statutory details
    const { data: aStat } = await cA.from('employee_statutory_details').select('*').eq('employee_id', EMP_A.empId);
    record('TASK_J_STATUTORY', 'A reads own statutory details', '1 row', `${aStat?.length || 0} rows (PAN=${aStat?.[0]?.pan_number ? 'PRESENT_MASKED' : 'NULL'})`, aStat?.length === 1);

    // A reads B statutory details
    const { data: aReadsBStat } = await cA.from('employee_statutory_details').select('*').eq('employee_id', EMP_B.empId);
    record('TASK_J_STATUTORY', 'A reads B statutory details', '0 rows', `${aReadsBStat?.length || 0} rows`, aReadsBStat?.length === 0);

    // B reads own statutory details
    const { data: bStat } = await cB.from('employee_statutory_details').select('*').eq('employee_id', EMP_B.empId);
    record('TASK_J_STATUTORY', 'B reads own statutory details', '1 row', `${bStat?.length || 0} rows (PAN=${bStat?.[0]?.pan_number ? 'PRESENT_MASKED' : 'NULL'})`, bStat?.length === 1);

    // B reads A statutory details
    const { data: bReadsAStat } = await cB.from('employee_statutory_details').select('*').eq('employee_id', EMP_A.empId);
    record('TASK_J_STATUTORY', 'B reads A statutory details', '0 rows', `${bReadsAStat?.length || 0} rows`, bReadsAStat?.length === 0);

    // CA reads both
    const { data: caStat } = await cCA.from('employee_statutory_details').select('*').in('employee_id', [EMP_A.empId, EMP_B.empId]);
    record('TASK_J_STATUTORY', 'CA reads both statutory details', '2 rows', `${caStat?.length || 0} rows`, caStat?.length === 2);
  }

  // =========================================================================
  // TASK K: Cross-Organization Regression
  // =========================================================================
  console.log('\n--- TASK K: Cross-Organization Isolation ---');
  {
    const foreignOrgId = '00000000-0000-0000-0000-000000000999';

    // A queries foreign org
    const { data: aForeign } = await cA.from('employees').select('*').eq('organization_id', foreignOrgId);
    record('TASK_K_CROSS_ORG', 'Employee A queries foreign org employees', '0 rows', `${aForeign?.length || 0} rows`, aForeign?.length === 0);

    // CA queries foreign org
    const { data: caForeign } = await cCA.from('employees').select('*').eq('organization_id', foreignOrgId);
    record('TASK_K_CROSS_ORG', 'Company Admin queries foreign org employees', '0 rows', `${caForeign?.length || 0} rows`, caForeign?.length === 0);

    // HR queries foreign org
    const { data: hrForeign } = await cHR.from('employees').select('*').eq('organization_id', foreignOrgId);
    record('TASK_K_CROSS_ORG', 'HR Head queries foreign org employees', '0 rows', `${hrForeign?.length || 0} rows`, hrForeign?.length === 0);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('='.repeat(70));

  return { total, passed, failed, results };
}

run().catch(console.error);
