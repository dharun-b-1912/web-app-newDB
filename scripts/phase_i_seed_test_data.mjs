/**
 * JOY PEOPLEHR — PHASE I
 * Step 1 & 2: Identity Verification + Admin-Side Data Seeding
 *
 * Uses Company Admin JWT (is_org_admin = true) to seed all domain tables.
 * DOES NOT use service-role key. All inserts go through authenticated RLS.
 *
 * Run FIRST before test_phase_i_e2e.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const ORG_ID  = 'e539780b-df07-4b45-beaa-ccf1d2224be8';
const COMP_ID = '5537b879-7299-48a4-bdfe-16e327a2d3d0';

const EMP_A = {
  email:     'e2e.employee.1788509696336@joypeoplehr.com',
  password:  'JoyEmployee@2026',
  empId:     '7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5',
  profileId: '82bfde5a-369b-4bdf-9afd-7fec6c103e65',
};
const EMP_B = {
  email:     'e2e.employee.b.1788510620285@joypeoplehr.com',
  password:  'JoyEmployeeB@2026',
  empId:     '1d9e2f8b-70f7-4704-a16f-200b251f0839',
  profileId: '5bac7a13-4e7e-40d6-9b55-860baf537aba',
};
const CA = { email: 'e2e.companyadmin.1788509617070@joypeoplehr.com', password: 'JoyCompAdmin@2026' };
const HR = { email: 'e2e.hrhead.1788509683332@joypeoplehr.com',      password: 'JoyHrHead@2026' };
const PA = { email: 'superadmin@joypeoplehr.com',                    password: 'Dharun@1912' };

async function login(email, password) {
  const c = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login FAILED for ${email}: ${error.message}`);
  return { client: c, user: data.user };
}

async function assertExists(client, table, filter, label) {
  const { data, error } = await client.from(table).select('id').match(filter).maybeSingle();
  if (error) { console.log(`  [!] ${label}: query error — ${error.message}`); return null; }
  if (!data)  { console.log(`  [!] ${label}: NOT FOUND`); return null; }
  console.log(`  [+] ${label}: OK (${data.id})`);
  return data.id;
}

async function upsertRow(client, table, row, label) {
  const { data, error } = await client.from(table).upsert(row, { onConflict: 'id' }).select('id').single();
  if (error) { console.log(`  [!] ${label} upsert FAILED: ${error.message}`); return null; }
  console.log(`  [+] ${label}: seeded (${data.id})`);
  return data.id;
}

async function insertRow(client, table, row, label) {
  // Try insert; if conflict skip
  const { data, error } = await client.from(table).insert(row).select('id').single();
  if (error) {
    if (error.code === '23505') { console.log(`  [~] ${label}: already exists (skipped)`); return 'EXISTS'; }
    console.log(`  [!] ${label} insert FAILED: ${error.message}`);
    return null;
  }
  console.log(`  [+] ${label}: seeded (${data.id})`);
  return data.id;
}

// Deterministic test UUIDs (so we can reference them in the E2E script)
const IDS = {
  // Leave type (shared)
  ltCL: 'aa000001-0000-0000-0000-000000000001',

  // Employee A
  aBank:    'a0000001-0000-0000-0000-000000000001',
  aAddr:    'a0000002-0000-0000-0000-000000000001',
  aDocType: 'a0000003-0000-0000-0000-000000000001',
  aDoc:     'a0000004-0000-0000-0000-000000000001',
  aAttDaily:'a0000005-0000-0000-0000-000000000001',
  aAttPunch:'a0000006-0000-0000-0000-000000000001',
  aLvBal:   'a0000007-0000-0000-0000-000000000001',
  aLvReq:   'a0000008-0000-0000-0000-000000000001',
  aEmpReq:  'a0000009-0000-0000-0000-000000000001',
  aSalStr:  'a0000010-0000-0000-0000-000000000001',
  aSalAsgn: 'a0000011-0000-0000-0000-000000000001',
  aPayRun:  'a0000012-0000-0000-0000-000000000001',
  aPayLine: 'a0000013-0000-0000-0000-000000000001',
  aPayslip: 'a0000014-0000-0000-0000-000000000001',

  // Employee B
  bBank:    'b0000001-0000-0000-0000-000000000001',
  bAddr:    'b0000002-0000-0000-0000-000000000001',
  bDocType: 'b0000003-0000-0000-0000-000000000001',
  bDoc:     'b0000004-0000-0000-0000-000000000001',
  bAttDaily:'b0000005-0000-0000-0000-000000000001',
  bAttPunch:'b0000006-0000-0000-0000-000000000001',
  bLvBal:   'b0000007-0000-0000-0000-000000000001',
  bLvReq:   'b0000008-0000-0000-0000-000000000001',
  bEmpReq:  'b0000009-0000-0000-0000-000000000001',
  bSalStr:  'b0000010-0000-0000-0000-000000000001',
  bSalAsgn: 'b0000011-0000-0000-0000-000000000001',
  bPayRun:  'b0000012-0000-0000-0000-000000000001',
  bPayLine: 'b0000013-0000-0000-0000-000000000001',
  bPayslip: 'b0000014-0000-0000-0000-000000000001',
};

async function seed() {
  console.log('================================================================');
  console.log('JOY PEOPLEHR — PHASE I — STEP 1: IDENTITY VERIFICATION');
  console.log('================================================================\n');

  // Step 1: Login as all identities and verify
  const { client: caClient, user: caUser } = await login(CA.email, CA.password);
  const { client: hrClient }               = await login(HR.email, HR.password);
  const { client: paClient }               = await login(PA.email, PA.password);
  const { client: aClient,  user: aUser  } = await login(EMP_A.email, EMP_A.password);
  const { client: bClient,  user: bUser  } = await login(EMP_B.email, EMP_B.password);

  console.log('[Identity verification]');
  console.log(`  Platform Admin UID: ${paClient.auth.user?.id ?? (await paClient.auth.getUser()).data.user?.id}`);
  const empASession = (await aClient.auth.getUser()).data.user;
  const empBSession = (await bClient.auth.getUser()).data.user;
  console.log(`  Employee A UID: ${empASession?.id} | email: ${empASession?.email}`);
  console.log(`  Employee B UID: ${empBSession?.id} | email: ${empBSession?.email}`);

  console.log('\n[Verify canonical records]');
  await assertExists(caClient, 'employees',         { id: EMP_A.empId },     'Employee A employees row');
  await assertExists(caClient, 'user_profiles',     { id: EMP_A.profileId }, 'Employee A user_profiles row');
  await assertExists(caClient, 'employee_profiles', { employee_id: EMP_A.empId }, 'Employee A employee_profiles row');
  await assertExists(caClient, 'employee_statutory_details', { employee_id: EMP_A.empId }, 'Employee A statutory_details row');

  await assertExists(caClient, 'employees',         { id: EMP_B.empId },     'Employee B employees row');
  await assertExists(caClient, 'user_profiles',     { id: EMP_B.profileId }, 'Employee B user_profiles row');
  await assertExists(caClient, 'employee_profiles', { employee_id: EMP_B.empId }, 'Employee B employee_profiles row');
  await assertExists(caClient, 'employee_statutory_details', { employee_id: EMP_B.empId }, 'Employee B statutory_details row');

  console.log('\n================================================================');
  console.log('PHASE I — STEP 2: ADMIN-SIDE REPRESENTATIVE DATA SEEDING');
  console.log('  Using Company Admin JWT (is_org_admin = true)');
  console.log('  Zero service-role key usage');
  console.log('================================================================\n');

  // ─── SHARED: Leave Type ─────────────────────────────────────────────────
  console.log('[Shared: Leave Type]');
  await upsertRow(caClient, 'leave_types', {
    id: IDS.ltCL,
    organization_id: ORG_ID,
    name: 'Casual Leave',
    code: 'CL',
    annual_quota: 12,
    accrual_frequency: 'MONTHLY',
    is_carry_forward_allowed: false,
    max_carry_forward_days: 0,
    is_encashable: false,
    is_paid: true,
    is_active: true,
  }, 'leave_type[CL]');

  // ─── SHARED: Salary Structures ──────────────────────────────────────────
  console.log('\n[Shared: Salary Structures]');
  await upsertRow(caClient, 'salary_structures', {
    id: IDS.aSalStr,
    organization_id: ORG_ID,
    name: 'E2E Structure A',
    code: 'E2E-STR-A',
    description: 'Smoke test salary structure for Employee A',
    is_active: true,
  }, 'salary_structure[A]');

  await upsertRow(caClient, 'salary_structures', {
    id: IDS.bSalStr,
    organization_id: ORG_ID,
    name: 'E2E Structure B',
    code: 'E2E-STR-B',
    description: 'Smoke test salary structure for Employee B',
    is_active: true,
  }, 'salary_structure[B]');

  // ─── SHARED: Document Types ─────────────────────────────────────────────
  console.log('\n[Shared: Document Types]');
  await upsertRow(caClient, 'document_types', {
    id: IDS.aDocType,
    organization_id: ORG_ID,
    name: 'Aadhaar Card',
    code: 'AADHAAR',
    is_mandatory_for_onboarding: true,
    requires_verification: true,
  }, 'document_type[AADHAAR-A]');

  await upsertRow(caClient, 'document_types', {
    id: IDS.bDocType,
    organization_id: ORG_ID,
    name: 'PAN Card',
    code: 'PAN',
    is_mandatory_for_onboarding: true,
    requires_verification: true,
  }, 'document_type[PAN-B]');

  // ─── EMPLOYEE A ──────────────────────────────────────────────────────────
  console.log('\n[Employee A: Bank Details]');
  await upsertRow(caClient, 'employee_bank_details', {
    id: IDS.aBank,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    account_holder_name: 'E2E Smoke Employee A',
    bank_name: 'State Bank of India',
    account_number: '9900000111222A',
    ifsc_code: 'SBIN0000111',
    branch_name: 'Chennai Main',
    account_type: 'SAVINGS',
    is_verified: true,
  }, 'employee_bank_details[A]');

  console.log('[Employee A: Address]');
  await upsertRow(caClient, 'employee_addresses', {
    id: IDS.aAddr,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    address_type: 'PERMANENT',
    address_line1: '10 E2E Smoke Street, Unit A',
    address_line2: 'Test Nagar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postal_code: '600001',
    country: 'India',
  }, 'employee_address[A]');

  console.log('[Employee A: Document]');
  await upsertRow(caClient, 'employee_documents', {
    id: IDS.aDoc,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    document_type_id: IDS.aDocType,
    file_name: 'e2e_smoke_aadhaar_a.pdf',
    storage_path: 'e2e/smoke/emp_a/aadhaar_a.pdf',
    file_size_bytes: 102400,
    mime_type: 'application/pdf',
    verification_status: 'PENDING',
  }, 'employee_document[A]');

  console.log('[Employee A: Attendance Daily]');
  await upsertRow(caClient, 'attendance_daily', {
    id: IDS.aAttDaily,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    attendance_date: '2026-09-01',
    first_check_in: '2026-09-01T09:00:00+05:30',
    last_check_out: '2026-09-01T18:00:00+05:30',
    total_work_minutes: 480,
    break_minutes: 60,
    overtime_minutes: 0,
    late_entry_minutes: 0,
    early_exit_minutes: 0,
    status: 'PRESENT',
    payable_status: 1.0,
    is_regularized: false,
  }, 'attendance_daily[A]');

  console.log('[Employee A: Attendance Punch]');
  await insertRow(caClient, 'attendance_punches', {
    id: IDS.aAttPunch,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    punch_time: '2026-09-01T09:00:00+05:30',
    punch_type: 'CHECK_IN',
    verification_mode: 'BIOMETRIC',
    is_processed: true,
  }, 'attendance_punch[A]');

  console.log('[Employee A: Leave Balance]');
  await upsertRow(caClient, 'leave_balances', {
    id: IDS.aLvBal,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    leave_type_id: IDS.ltCL,
    calendar_year: 2026,
    opening_balance: 0,
    accrued: 9.0,
    consumed: 1.0,
    closing_balance: 8.0,
  }, 'leave_balance[A]');

  console.log('[Employee A: Leave Request]');
  await upsertRow(caClient, 'leave_requests', {
    id: IDS.aLvReq,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    leave_type_id: IDS.ltCL,
    start_date: '2026-09-10',
    end_date: '2026-09-10',
    total_days: 1,
    is_half_day: false,
    reason: 'E2E Smoke Test personal leave request - Employee A',
    status: 'PENDING',
  }, 'leave_request[A]');

  console.log('[Employee A: Employee Request]');
  await upsertRow(caClient, 'employee_requests', {
    id: IDS.aEmpReq,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    request_type: 'LETTER_REQUEST',
    subject: 'E2E Smoke Letter Request - Employee A',
    description: 'Smoke test: requesting experience letter for Employee A',
    priority: 'MEDIUM',
    status: 'OPEN',
  }, 'employee_request[A]');

  console.log('[Employee A: Salary Assignment]');
  await upsertRow(caClient, 'employee_salary_assignments', {
    id: IDS.aSalAsgn,
    organization_id: ORG_ID,
    employee_id: EMP_A.empId,
    salary_structure_id: IDS.aSalStr,
    annual_ctc: 600000.00,
    monthly_gross: 50000.00,
    effective_from: '2026-01-01',
    is_active: true,
  }, 'salary_assignment[A]');

  console.log('[Employee A: Payroll Run]');
  await upsertRow(caClient, 'payroll_runs', {
    id: IDS.aPayRun,
    organization_id: ORG_ID,
    company_id: COMP_ID,
    month: 9,
    year: 2026,
    total_employees: 1,
    total_gross_pay: 50000.00,
    total_deductions: 5000.00,
    total_net_pay: 45000.00,
    status: 'DRAFT',
  }, 'payroll_run[A]');

  console.log('[Employee A: Payroll Line Item]');
  await upsertRow(caClient, 'payroll_line_items', {
    id: IDS.aPayLine,
    organization_id: ORG_ID,
    payroll_run_id: IDS.aPayRun,
    employee_id: EMP_A.empId,
    total_working_days: 26,
    payable_days: 26,
    lop_days: 0,
    gross_earnings: 50000.00,
    total_deductions: 5000.00,
    net_pay: 45000.00,
    earnings_breakdown: { basic: 25000, hra: 15000, conveyance: 10000 },
    deductions_breakdown: { pf: 3000, pt: 200, esi: 1800 },
    statutory_employer_contributions: { pf_employer: 3000 },
  }, 'payroll_line_item[A]');

  console.log('[Employee A: Payslip]');
  await upsertRow(caClient, 'payslips', {
    id: IDS.aPayslip,
    organization_id: ORG_ID,
    payroll_line_item_id: IDS.aPayLine,
    employee_id: EMP_A.empId,
    payslip_number: 'E2E-PS-A-2026-09',
    storage_path: 'e2e/smoke/emp_a/payslip_sep2026.pdf',
    is_published: true,
  }, 'payslip[A]');

  // ─── EMPLOYEE B ──────────────────────────────────────────────────────────
  console.log('\n[Employee B: Bank Details]');
  await upsertRow(caClient, 'employee_bank_details', {
    id: IDS.bBank,
    organization_id: ORG_ID,
    employee_id: EMP_B.empId,
    account_holder_name: 'Second Employee B',
    bank_name: 'HDFC Bank',
    account_number: '9900000222333B',
    ifsc_code: 'HDFC0000222',
    branch_name: 'Chennai Anna Nagar',
    account_type: 'SAVINGS',
    is_verified: false,
  }, 'employee_bank_details[B]');

  console.log('[Employee B: Address]');
  await upsertRow(caClient, 'employee_addresses', {
    id: IDS.bAddr,
    organization_id: ORG_ID,
    employee_id: EMP_B.empId,
    address_type: 'PERMANENT',
    address_line1: '20 E2E Smoke Street, Unit B',
    address_line2: 'Test Colony',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postal_code: '600002',
    country: 'India',
  }, 'employee_address[B]');

  console.log('[Employee B: Document]');
  await upsertRow(caClient, 'employee_documents', {
    id: IDS.bDoc,
    organization_id: ORG_ID,
    employee_id: EMP_B.empId,
    document_type_id: IDS.bDocType,
    file_name: 'e2e_smoke_pan_b.pdf',
    storage_path: 'e2e/smoke/emp_b/pan_b.pdf',
    file_size_bytes: 81920,
    mime_type: 'application/pdf',
    verification_status: 'PENDING',
  }, 'employee_document[B]');

  console.log('[Employee B: Attendance Daily]');
  await upsertRow(caClient, 'attendance_daily', {
    id: IDS.bAttDaily,
    organization_id: ORG_ID,
    employee_id: EMP_B.empId,
    attendance_date: '2026-09-01',
    first_check_in: '2026-09-01T09:15:00+05:30',
    last_check_out: '2026-09-01T18:15:00+05:30',
    total_work_minutes: 480,
    break_minutes: 45,
    overtime_minutes: 0,
    late_entry_minutes: 15,
    early_exit_minutes: 0,
    status: 'PRESENT',
    payable_status: 1.0,
    is_regularized: false,
  }, 'attendance_daily[B]');

  console.log('[Employee B: Attendance Punch]');
  await insertRow(caClient, 'attendance_punches', {
    id: IDS.bAttPunch,
    organization_id: ORG_ID,
    employee_id: EMP_B.empId,
    punch_time: '2026-09-01T09:15:00+05:30',
    punch_type: 'CHECK_IN',
    verification_mode: 'BIOMETRIC',
    is_processed: true,
  }, 'attendance_punch[B]');

  console.log('[Employee B: Leave Balance]');
  await upsertRow(caClient, 'leave_balances', {
    id: IDS.bLvBal,
    organization_id: ORG_ID,
    employee_id: EMP_B.empId,
    leave_type_id: IDS.ltCL,
    calendar_year: 2026,
    opening_balance: 0,
    accrued: 6.0,
    consumed: 0.0,
    closing_balance: 6.0,
  }, 'leave_balance[B]');

  console.log('[Employee B: Leave Request]');
  await upsertRow(caClient, 'leave_requests', {
    id: IDS.bLvReq,
    organization_id: ORG_ID,
    employee_id: EMP_B.empId,
    leave_type_id: IDS.ltCL,
    start_date: '2026-09-15',
    end_date: '2026-09-16',
    total_days: 2,
    is_half_day: false,
    reason: 'E2E Smoke Test personal leave request - Employee B',
    status: 'PENDING',
  }, 'leave_request[B]');

  console.log('[Employee B: Employee Request]');
  await upsertRow(caClient, 'employee_requests', {
    id: IDS.bEmpReq,
    organization_id: ORG_ID,
    employee_id: EMP_B.empId,
    request_type: 'LETTER_REQUEST',
    subject: 'E2E Smoke Letter Request - Employee B',
    description: 'Smoke test: requesting experience letter for Employee B',
    priority: 'LOW',
    status: 'OPEN',
  }, 'employee_request[B]');

  console.log('[Employee B: Salary Assignment]');
  await upsertRow(caClient, 'employee_salary_assignments', {
    id: IDS.bSalAsgn,
    organization_id: ORG_ID,
    employee_id: EMP_B.empId,
    salary_structure_id: IDS.bSalStr,
    annual_ctc: 480000.00,
    monthly_gross: 40000.00,
    effective_from: '2026-01-01',
    is_active: true,
  }, 'salary_assignment[B]');

  console.log('[Employee B: Payroll Run]');
  await upsertRow(caClient, 'payroll_runs', {
    id: IDS.bPayRun,
    organization_id: ORG_ID,
    company_id: COMP_ID,
    month: 9,
    year: 2026,
    total_employees: 1,
    total_gross_pay: 40000.00,
    total_deductions: 4000.00,
    total_net_pay: 36000.00,
    status: 'DRAFT',
  }, 'payroll_run[B]');

  console.log('[Employee B: Payroll Line Item]');
  await upsertRow(caClient, 'payroll_line_items', {
    id: IDS.bPayLine,
    organization_id: ORG_ID,
    payroll_run_id: IDS.bPayRun,
    employee_id: EMP_B.empId,
    total_working_days: 26,
    payable_days: 25,
    lop_days: 1,
    gross_earnings: 40000.00,
    total_deductions: 4000.00,
    net_pay: 36000.00,
    earnings_breakdown: { basic: 20000, hra: 12000, conveyance: 8000 },
    deductions_breakdown: { pf: 2400, pt: 200, esi: 1400 },
    statutory_employer_contributions: { pf_employer: 2400 },
  }, 'payroll_line_item[B]');

  console.log('[Employee B: Payslip]');
  await upsertRow(caClient, 'payslips', {
    id: IDS.bPayslip,
    organization_id: ORG_ID,
    payroll_line_item_id: IDS.bPayLine,
    employee_id: EMP_B.empId,
    payslip_number: 'E2E-PS-B-2026-09',
    storage_path: 'e2e/smoke/emp_b/payslip_sep2026.pdf',
    is_published: true,
  }, 'payslip[B]');

  console.log('\n================================================================');
  console.log('PHASE I SEEDING COMPLETE — ALL REPRESENTATIVE RECORDS CREATED');
  console.log('================================================================\n');

  console.log('Seeded IDs for reference (copy into test_phase_i_e2e.mjs if needed):');
  console.log(JSON.stringify(IDS, null, 2));
}

seed().catch(console.error);
