/**
 * JOY PEOPLEHR — PHASE J: EMPLOYEE SELF-SERVICE FUNCTIONAL CERTIFICATION
 * 
 * Target: ysiajemrqakfngasehhi (https://ysiajemrqakfngasehhi.supabase.co)
 * Rigorous end-to-end functional certification of all employee self-service modules
 * using authentic GoTrue JWT sessions.
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const URL  = 'https://ysiajemrqakfngasehhi.supabase.co';
const ANON = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const ORG_ID  = 'e539780b-df07-4b45-beaa-ccf1d2224be8';
const COMP_ID = '5537b879-7299-48a4-bdfe-16e327a2d3d0';

const EMP_A = {
  email: 'e2e.employee.1788509696336@joypeoplehr.com', password: 'JoyEmployee@2026',
  empId: '7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5', profileId: '08276023-7172-4141-a228-3f9ec68d2eb4',
  userProfileId: '82bfde5a-369b-4bdf-9afd-7fec6c103e65',
};
const EMP_B = {
  email: 'e2e.employee.b.1788510620285@joypeoplehr.com', password: 'JoyEmployeeB@2026',
  empId: '1d9e2f8b-70f7-4704-a16f-200b251f0839', profileId: '0b000001-0000-0000-0000-000000000001',
  userProfileId: '5bac7a13-4e7e-40d6-9b55-860baf537aba',
};

const IDS = {
  aAddr:     'a0000002-0000-0000-0000-000000000001',
  aBank:     'a0000001-0000-0000-0000-000000000001',
  aDoc:      'a0000004-0000-0000-0000-000000000001',
  aAttDaily: 'a0000005-0000-0000-0000-000000000001',
  aAttPunch: 'a0000006-0000-0000-0000-000000000001',
  aLvBal:    'a0000007-0000-0000-0000-000000000001',
  aLvReq:    'a0000008-0000-0000-0000-000000000001',
  aEmpReq:   'a0000009-0000-0000-0000-000000000001',
  aPayslip:  'a0000014-0000-0000-0000-000000000001',
  aPayLine:  'a0000013-0000-0000-0000-000000000001',
  bAddr:     'b0000002-0000-0000-0000-000000000001',
  bBank:     'b0000001-0000-0000-0000-000000000001',
  bDoc:      'b0000004-0000-0000-0000-000000000001',
  bPayslip:  'b0000014-0000-0000-0000-000000000001',
};

async function login(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  return { client: c, session: data.session, user: data.user };
}

async function runCertification() {
  console.log('='.repeat(75));
  console.log('JOY PEOPLEHR — PHASE J: EMPLOYEE SELF-SERVICE FUNCTIONAL CERTIFICATION');
  console.log('Target Canonical Database: https://ysiajemrqakfngasehhi.supabase.co');
  console.log('='.repeat(75));

  const results = [];
  function record(section, test, expected, actual, pass, details = '') {
    results.push({ section, test, expected, actual, pass, details });
    const mark = pass ? '✓ PASS' : '✗ FAIL';
    console.log(`[${mark}] ${section} > ${test}: ${details || actual}`);
  }

  // 1. P0: Authentication & Session
  console.log('\n--- 1. P0: Authentication & Session ---');
  const { client: cA, session: sA, user: uA } = await login(EMP_A.email, EMP_A.password);
  record('AUTH_SESSION', 'Employee A GoTrue Login', 'Valid Session & JWT', `UID: ${uA.id}`, !!sA?.access_token);

  const { client: cB, session: sB, user: uB } = await login(EMP_B.email, EMP_B.password);
  record('AUTH_SESSION', 'Employee B GoTrue Login', 'Valid Session & JWT', `UID: ${uB.id}`, !!sB?.access_token);

  // Identity Resolution Employee A
  const { data: empA } = await cA.from('employees').select('*').eq('id', EMP_A.empId).single();
  record('AUTH_SESSION', 'Employee A Identity Resolution', `empId: ${EMP_A.empId}, org: ${ORG_ID}`, `Resolved empId: ${empA?.id}, org: ${empA?.organization_id}`, empA?.id === EMP_A.empId && empA?.organization_id === ORG_ID);

  // Identity Resolution Employee B
  const { data: empB } = await cB.from('employees').select('*').eq('id', EMP_B.empId).single();
  record('AUTH_SESSION', 'Employee B Identity Resolution', `empId: ${EMP_B.empId}, org: ${ORG_ID}`, `Resolved empId: ${empB?.id}, org: ${empB?.organization_id}`, empB?.id === EMP_B.empId && empB?.organization_id === ORG_ID);

  // Cross-Identity Check: No crosstalk
  record('AUTH_SESSION', 'Cross-Identity Non-Crosstalk', 'Unique IDs for A & B', `A=${empA?.id} != B=${empB?.id}`, empA?.id !== empB?.id);

  // 2. P0: Employee Dashboard Live Backend Data
  console.log('\n--- 2. P0: Employee Dashboard Live Backend Data ---');
  const { data: aDashAtt } = await cA.from('attendance_daily').select('*').eq('employee_id', EMP_A.empId);
  record('DASHBOARD', 'Dashboard: Today Attendance Record', '>= 1 row', `${aDashAtt?.length || 0} rows`, (aDashAtt?.length || 0) >= 1);

  const { data: aDashLeaveBal } = await cA.from('leave_balances').select('*').eq('employee_id', EMP_A.empId);
  record('DASHBOARD', 'Dashboard: Leave Balance Record', '>= 1 row', `${aDashLeaveBal?.length || 0} rows`, (aDashLeaveBal?.length || 0) >= 1);

  const { data: aDashLeaveReq } = await cA.from('leave_requests').select('*').eq('employee_id', EMP_A.empId);
  record('DASHBOARD', 'Dashboard: Pending Leave Requests', '>= 1 row', `${aDashLeaveReq?.length || 0} rows`, (aDashLeaveReq?.length || 0) >= 1);

  const { data: aDashEmpReq } = await cA.from('employee_requests').select('*').eq('employee_id', EMP_A.empId);
  record('DASHBOARD', 'Dashboard: Employee Service Requests', '>= 1 row', `${aDashEmpReq?.length || 0} rows`, (aDashEmpReq?.length || 0) >= 1);

  const { data: aDashPayslip } = await cA.from('payslips').select('*').eq('employee_id', EMP_A.empId);
  record('DASHBOARD', 'Dashboard: Payslip Availability', '>= 1 row', `${aDashPayslip?.length || 0} rows`, (aDashPayslip?.length || 0) >= 1);

  // 3. P0: Profile Read & Permitted Mutation E2E
  console.log('\n--- 3. P0: Profile Read & Permitted Mutation ---');
  const testBio = `Verified Bio Phase J at ${new Date().toISOString()}`;
  const { data: updateBioRes } = await cA.from('employee_profiles').update({ bio: testBio }).eq('id', EMP_A.profileId).select();
  record('PROFILE', 'Profile: Update Bio (Permitted Field)', '1 row updated', `${updateBioRes?.length || 0} rows updated`, updateBioRes?.length === 1 && updateBioRes?.[0]?.bio === testBio);

  const testPhone = '+91 91111 22222';
  const { data: updatePhoneRes } = await cA.from('employees').update({ phone: testPhone }).eq('id', EMP_A.empId).select();
  record('PROFILE', 'Profile: Update Phone on Employees', '1 row updated', `${updatePhoneRes?.length || 0} rows updated`, updatePhoneRes?.length === 1 && updatePhoneRes?.[0]?.phone === testPhone);

  // Verify reload returns mutated data
  const { data: reloadedEmp } = await cA.from('employees').select('phone').eq('id', EMP_A.empId).single();
  record('PROFILE', 'Profile: Reload Verification', testPhone, `Reloaded Phone: ${reloadedEmp?.phone}`, reloadedEmp?.phone === testPhone);

  // Protected Field Alteration Attempt: Employee A attempts to change employee_code
  const { data: protCodeRes, error: protCodeErr } = await cA.from('employees').update({ employee_code: 'HACKED-CODE-999' }).eq('id', EMP_A.empId).select();
  record('PROFILE', 'Profile: Protected Field Tampering Blocked', 'Trigger / Policy Block', protCodeErr ? `Blocked: ${protCodeErr.message}` : `Denied (${protCodeRes?.length || 0} rows)`, protCodeErr !== null || (protCodeRes?.length || 0) === 0);

  // 4. P0: Address Read & Permitted Mutation E2E
  console.log('\n--- 4. P0: Address Read & Permitted Mutation ---');
  const { data: addrRead } = await cA.from('employee_addresses').select('*').eq('id', IDS.aAddr);
  record('ADDRESS', 'Address: Read Own Address', '1 row', `${addrRead?.length || 0} rows (City: ${addrRead?.[0]?.city})`, addrRead?.length === 1);

  const testCity = `Chennai-Verified-${Date.now().toString().slice(-4)}`;
  const { data: addrUpdate } = await cA.from('employee_addresses').update({ city: testCity }).eq('id', IDS.aAddr).select();
  record('ADDRESS', 'Address: Update City (Permitted)', '1 row updated', `${addrUpdate?.length || 0} rows updated`, addrUpdate?.length === 1 && addrUpdate?.[0]?.city === testCity);

  // Verify reload
  const { data: reloadedAddr } = await cA.from('employee_addresses').select('city').eq('id', IDS.aAddr).single();
  record('ADDRESS', 'Address: Reload Persisted City', testCity, `Reloaded City: ${reloadedAddr?.city}`, reloadedAddr?.city === testCity);

  // Cross-employee isolation: A cannot read B's address
  const { data: aReadsBAddr } = await cA.from('employee_addresses').select('*').eq('id', IDS.bAddr);
  record('ADDRESS', 'Address: A Reads B Address Isolation', '0 rows', `${aReadsBAddr?.length || 0} rows`, aReadsBAddr?.length === 0);

  // 5. P0: Bank Details Read & Isolation
  console.log('\n--- 5. P0: Bank Details Read & Isolation ---');
  const { data: bankRead } = await cA.from('employee_bank_details').select('*').eq('id', IDS.aBank);
  record('BANK_DETAILS', 'Bank: Read Own Bank Details', '1 row', `${bankRead?.length || 0} rows (Bank: ${bankRead?.[0]?.bank_name})`, bankRead?.length === 1);

  // A cannot read B bank details
  const { data: aReadsBBank } = await cA.from('employee_bank_details').select('*').eq('id', IDS.bBank);
  record('BANK_DETAILS', 'Bank: A Reads B Bank Details Isolation', '0 rows', `${aReadsBBank?.length || 0} rows`, aReadsBBank?.length === 0);

  // 6. P0: Documents Read & Controlled Creation E2E
  console.log('\n--- 6. P0: Documents Read & Controlled Creation ---');
  const { data: docRead } = await cA.from('employee_documents').select('*').eq('id', IDS.aDoc);
  record('DOCUMENTS', 'Documents: Read Own Document Metadata', '1 row', `${docRead?.length || 0} rows (${docRead?.[0]?.file_name})`, docRead?.length === 1);

  // Create controlled test document metadata
  const testDocId = crypto.randomUUID();
  const { data: docCreate, error: docCreateErr } = await cA.from('employee_documents').insert({
    id: testDocId,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    document_type_id: 'a0000003-0000-0000-0000-000000000001',
    file_name: 'Phase_J_Certification_Doc.pdf',
    storage_path: 'employees/7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5/phase_j_cert.pdf',
    file_size_bytes: 1048576,
    mime_type: 'application/pdf',
    verification_status: 'PENDING',
  }).select();
  record('DOCUMENTS', 'Documents: Create Controlled Document Record', '1 row inserted', docCreateErr ? `Error: ${docCreateErr.message}` : `${docCreate?.length || 0} rows inserted`, docCreate?.length === 1);

  // Verify reload
  const { data: docReload } = await cA.from('employee_documents').select('*').eq('id', testDocId).single();
  record('DOCUMENTS', 'Documents: Reload Created Document', 'Phase_J_Certification_Doc.pdf', `${docReload?.file_name}`, docReload?.file_name === 'Phase_J_Certification_Doc.pdf');

  // A cannot read B's documents
  const { data: aReadsBDoc } = await cA.from('employee_documents').select('*').eq('id', IDS.bDoc);
  record('DOCUMENTS', 'Documents: A Reads B Document Isolation', '0 rows', `${aReadsBDoc?.length || 0} rows`, aReadsBDoc?.length === 0);

  // Clean up test doc
  await cA.from('employee_documents').delete().eq('id', testDocId);

  // 7. P0: Attendance, Punches & Regularization E2E
  console.log('\n--- 7. P0: Attendance, Punches & Regularization ---');
  const { data: aAttDailyRead } = await cA.from('attendance_daily').select('*').eq('id', IDS.aAttDaily);
  record('ATTENDANCE', 'Attendance: Read Own Daily Attendance', '1 row', `${aAttDailyRead?.length || 0} rows (Status: ${aAttDailyRead?.[0]?.status})`, aAttDailyRead?.length === 1);

  const { data: aPunchRead } = await cA.from('attendance_punches').select('*').eq('id', IDS.aAttPunch);
  record('ATTENDANCE', 'Attendance: Read Own Punch Record', '1 row', `${aPunchRead?.length || 0} rows (Type: ${aPunchRead?.[0]?.punch_type})`, aPunchRead?.length === 1);

  // Create controlled regularization request
  const testRegId = crypto.randomUUID();
  const { data: regCreate, error: regCreateErr } = await cA.from('attendance_regularizations').insert({
    id: testRegId,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    attendance_date: '2026-09-04',
    reason: 'Biometric device network latency during punch',
    requested_check_in: '2026-09-04T09:00:00Z',
    requested_check_out: '2026-09-04T18:00:00Z',
    status: 'PENDING',
  }).select();
  record('ATTENDANCE', 'Attendance: Create Regularization Request', '1 row inserted', regCreateErr ? `Error: ${regCreateErr.message}` : `${regCreate?.length || 0} rows inserted`, regCreate?.length === 1);

  // Clean up test regularization
  await cA.from('attendance_regularizations').delete().eq('id', testRegId);

  // 8. P0: Leave Balances & Controlled Request Lifecycle E2E
  console.log('\n--- 8. P0: Leave Balances & Request Lifecycle ---');
  const { data: lvBalRead } = await cA.from('leave_balances').select('*').eq('id', IDS.aLvBal);
  record('LEAVE', 'Leave: Read Own Leave Balances', '1 row', `${lvBalRead?.length || 0} rows (Total: ${lvBalRead?.[0]?.total_allocated || lvBalRead?.[0]?.allocated_days || 'Available'})`, lvBalRead?.length === 1);

  const { data: lvTypes } = await cA.from('leave_types').select('*').eq('organization_id', ORG_ID);
  record('LEAVE', 'Leave: Read Organization Leave Types', '>= 1 row', `${lvTypes?.length || 0} types available`, (lvTypes?.length || 0) >= 1);

  // Create controlled leave request
  const testLvReqId = crypto.randomUUID();
  const { data: lvReqCreate, error: lvReqErr } = await cA.from('leave_requests').insert({
    id: testLvReqId,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    leave_type_id: 'aa000001-0000-0000-0000-000000000001',
    start_date: '2026-09-10',
    end_date: '2026-09-11',
    total_days: 2,
    reason: 'Family event attendance',
    status: 'PENDING',
  }).select();
  record('LEAVE', 'Leave: Create Controlled Leave Request', '1 row inserted', lvReqErr ? `Error: ${lvReqErr.message}` : `${lvReqCreate?.length || 0} rows inserted`, lvReqCreate?.length === 1);

  // Cancel / Withdraw leave request
  const { data: lvReqCancel } = await cA.from('leave_requests').update({ status: 'CANCELLED' }).eq('id', testLvReqId).select();
  record('LEAVE', 'Leave: Cancel Leave Request', '1 row updated to CANCELLED', `${lvReqCancel?.length || 0} rows updated (${lvReqCancel?.[0]?.status})`, lvReqCancel?.length === 1 && lvReqCancel?.[0]?.status === 'CANCELLED');

  // Clean up
  await cA.from('leave_requests').delete().eq('id', testLvReqId);

  // 9. P0: Payroll & Payslips E2E
  console.log('\n--- 9. P0: Payroll & Payslips ---');
  const { data: paySlipRead } = await cA.from('payslips').select('*').eq('id', IDS.aPayslip);
  record('PAYROLL', 'Payroll: Read Own Payslip', '1 row', `${paySlipRead?.length || 0} rows (${paySlipRead?.[0]?.payslip_number})`, paySlipRead?.length === 1);

  const { data: payLineRead } = await cA.from('payroll_line_items').select('*').eq('id', IDS.aPayLine);
  record('PAYROLL', 'Payroll: Read Own Line Items', '1 row', `${payLineRead?.length || 0} rows (Net: ${payLineRead?.[0]?.net_pay})`, payLineRead?.length === 1);

  // Isolation: A cannot read B's payslip
  const { data: aReadsBSlip } = await cA.from('payslips').select('*').eq('id', IDS.bPayslip);
  record('PAYROLL', 'Payroll: A Reads B Payslip Isolation', '0 rows', `${aReadsBSlip?.length || 0} rows`, aReadsBSlip?.length === 0);

  // 10. P1: Employee Service Requests E2E
  console.log('\n--- 10. P1: Employee Service Requests ---');
  const testReqId = crypto.randomUUID();
  const { data: empReqCreate, error: empReqErr } = await cA.from('employee_requests').insert({
    id: testReqId,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    request_type: 'EQUIPMENT_REQUEST',
    subject: 'Second Monitor Request for Data Analysis',
    description: 'Require 27-inch 4K monitor for data visualization tasks',
    priority: 'MEDIUM',
    status: 'OPEN',
  }).select();
  record('EMPLOYEE_REQUESTS', 'Requests: Create Service Request', '1 row inserted', empReqErr ? `Error: ${empReqErr.message}` : `${empReqCreate?.length || 0} rows inserted`, empReqCreate?.length === 1);

  // Verify reload
  const { data: empReqReload } = await cA.from('employee_requests').select('*').eq('id', testReqId).single();
  record('EMPLOYEE_REQUESTS', 'Requests: Reload Created Request', 'OPEN', `${empReqReload?.status} (${empReqReload?.subject})`, empReqReload?.status === 'OPEN');

  // Clean up
  await cA.from('employee_requests').delete().eq('id', testReqId);

  // 11. P1: Notifications E2E
  console.log('\n--- 11. P1: Notifications ---');
  const { data: notifRead } = await cA.from('notification_events').select('*').eq('organization_id', ORG_ID).limit(5);
  record('NOTIFICATIONS', 'Notifications: Read Event Mesh', '>= 0 rows without error', `${notifRead?.length || 0} events retrieved`, Array.isArray(notifRead));

  // 12. Cross-Client Consistency Verification
  console.log('\n--- 12. Cross-Client Consistency Proof ---');
  const crossClientPhone = `+91 94444 ${Date.now().toString().slice(-5)}`;
  // Mutate from Web Client session
  await cA.from('employees').update({ phone: crossClientPhone }).eq('id', EMP_A.empId);
  // Re-fetch via separate client instance (simulating Flutter)
  const separateClient = createClient(URL, ANON, { auth: { persistSession: false } });
  await separateClient.auth.signInWithPassword({ email: EMP_A.email, password: EMP_A.password });
  const { data: separateEmp } = await separateClient.from('employees').select('phone').eq('id', EMP_A.empId).single();
  record('CROSS_CLIENT', 'Web Mutation -> Mobile Query Sync', crossClientPhone, `Synced Phone: ${separateEmp?.phone}`, separateEmp?.phone === crossClientPhone);

  // 13. Error Handling & Data Integrity
  console.log('\n--- 13. Error Handling & Data Integrity ---');
  // Attempt invalid leave insert with non-existent foreign organization
  const { data: invOrgData, error: invOrgErr } = await cA.from('leave_requests').insert({
    organization_id: '00000000-0000-0000-0000-000000000999',
    employee_id: EMP_A.empId,
    leave_type_id: 'aa000001-0000-0000-0000-000000000001',
    start_date: '2026-09-15',
    end_date: '2026-09-16',
    total_days: 2,
    status: 'PENDING',
  }).select();
  record('ERROR_HANDLING', 'Foreign Org Leave Insert Rejection', 'RLS/FK Error', invOrgErr ? `Blocked: ${invOrgErr.message}` : `Leaked: ${JSON.stringify(invOrgData)}`, invOrgErr !== null);

  // Attempt unauthorized payroll run creation (now hardened by Migration 203)
  const { data: unauthPayData, error: unauthPayErr } = await cA.from('payroll_runs').insert({
    organization_id: ORG_ID,
    company_id: COMP_ID,
    month: 12,
    year: 2026,
    status: 'DRAFT',
  }).select();
  record('ERROR_HANDLING', 'Unauthorized Payroll Run Creation', 'RLS Error (42501)', unauthPayErr ? `Blocked: ${unauthPayErr.message}` : `Leaked: ${JSON.stringify(unauthPayData)}`, unauthPayErr !== null);

  // 14. Security Regression Post-Functional Test
  console.log('\n--- 14. Security Regression Post-Functional Test ---');
  const { data: regBFromA } = await cA.from('employee_bank_details').select('*').eq('id', IDS.bBank);
  record('SECURITY_REGRESSION', 'A -> B Bank Details Isolation', '0 rows', `${regBFromA?.length || 0} rows`, regBFromA?.length === 0);

  const { data: regAFromB } = await cB.from('employee_bank_details').select('*').eq('id', IDS.aBank);
  record('SECURITY_REGRESSION', 'B -> A Bank Details Isolation', '0 rows', `${regAFromB?.length || 0} rows`, regAFromB?.length === 0);

  // Summary
  console.log('\n' + '='.repeat(75));
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  console.log(`PHASE J TEST RESULTS: TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('='.repeat(75));

  return { total, passed, failed, results };
}

runCertification().catch(console.error);
