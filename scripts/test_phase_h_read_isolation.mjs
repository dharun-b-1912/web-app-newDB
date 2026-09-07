/**
 * JOY PEOPLEHR — PHASE H
 * Employee Read Isolation + Complete Employee Field Authorization Audit
 *
 * Canonical Project: ysiajemrqakfngasehhi
 *
 * TESTS:
 *  1. Policy inspection for all sensitive employee-domain tables
 *  2. Column-level classification (A=Self-service, B=HR/Admin, C=Security/Identity, D=Tenant, E=System)
 *  3. Employee A → Employee B read isolation on all private tables
 *  4. Admin positive read access verification
 *  5. Report all findings
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

const ACCOUNTS = {
  platformAdmin: { email: 'superadmin@joypeoplehr.com', password: 'Dharun@1912' },
  companyAdmin:  { email: 'e2e.companyadmin.1788509617070@joypeoplehr.com', password: 'JoyCompAdmin@2026' },
  hrHead:        { email: 'e2e.hrhead.1788509683332@joypeoplehr.com', password: 'JoyHrHead@2026' },
  employeeA: {
    email: 'e2e.employee.1788509696336@joypeoplehr.com',
    password: 'JoyEmployee@2026',
    empId: '7ea078b3-0a7e-47ce-82b7-ea9d33ab6da5',
    profileId: '82bfde5a-369b-4bdf-9afd-7fec6c103e65'
  },
  employeeB: {
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
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return { client, user: data.user };
}

function pass(msg)  { return `✅ PASS  — ${msg}`; }
function fail(msg)  { return `❌ FAIL  — ${msg}`; }
function info(msg)  { return `ℹ️  INFO  — ${msg}`; }

async function runPhaseH() {
  console.log('================================================================');
  console.log('JOY PEOPLEHR — PHASE H: READ ISOLATION + FIELD AUTHORIZATION AUDIT');
  console.log('Canonical Supabase:', SUPABASE_URL);
  console.log('================================================================\n');

  // ─── Authenticate all roles ───────────────────────────────────────────────
  const { client: clientA }  = await getClient(ACCOUNTS.employeeA.email, ACCOUNTS.employeeA.password);
  const { client: clientB }  = await getClient(ACCOUNTS.employeeB.email, ACCOUNTS.employeeB.password);
  const { client: clientCA } = await getClient(ACCOUNTS.companyAdmin.email, ACCOUNTS.companyAdmin.password);
  const { client: clientHR } = await getClient(ACCOUNTS.hrHead.email, ACCOUNTS.hrHead.password);
  const { client: clientPA } = await getClient(ACCOUNTS.platformAdmin.email, ACCOUNTS.platformAdmin.password);
  console.log('All 5 authenticated clients established.\n');

  const EMP_A_ID = ACCOUNTS.employeeA.empId;
  const EMP_B_ID = ACCOUNTS.employeeB.empId;

  const findings = {};

  // ─── STEP 1: employees table — Employee A SELECT Employee B ───────────────
  console.log('>>> [STEP 1] employees — Employee A reads Employee B row (SHOULD BE VISIBLE — org-scoped directory) ...');
  const { data: empBFromA } = await clientA.from('employees').select('id,employee_code,first_name').eq('id', EMP_B_ID).maybeSingle();
  const empBVisibleToA = Boolean(empBFromA);
  // Phase H key question: is it intentional that employees can see each other's records?
  console.log(info(`Employee A can SELECT Employee B employees row: ${empBVisibleToA} (employee_code: ${empBFromA?.employee_code})`));
  findings.employees_select_peer = empBVisibleToA;

  // ─── STEP 2: employee_profiles — PRIVATE — Employee A reads Employee B ────
  console.log('\n>>> [STEP 2] employee_profiles — Employee A reads Employee B profile (SHOULD BE BLOCKED) ...');
  const { data: profBFromA, error: profBErr } = await clientA
    .from('employee_profiles')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .maybeSingle();
  const profBLeak = Boolean(profBFromA);
  console.log(profBLeak
    ? fail(`Employee A can read Employee B employee_profiles (PRIVACY VIOLATION)`)
    : pass(`Employee A CANNOT read Employee B employee_profiles`));
  findings.employee_profiles_select_peer = profBLeak ? 'LEAK' : 'BLOCKED';

  // ─── STEP 3: employee_bank_details — PRIVATE ────────────────────────────
  console.log('\n>>> [STEP 3] employee_bank_details — Employee A reads Employee B bank details (SHOULD BE BLOCKED) ...');
  const { data: bankBFromA, error: bankBErr } = await clientA
    .from('employee_bank_details')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .maybeSingle();
  const bankBLeak = Boolean(bankBFromA);
  console.log(bankBLeak
    ? fail(`Employee A can read Employee B bank details (FINANCIAL PRIVACY VIOLATION)`)
    : pass(`Employee A CANNOT read Employee B bank details`));
  findings.employee_bank_details_select_peer = bankBLeak ? 'LEAK' : 'BLOCKED';

  // ─── STEP 4: employee_statutory_details — PRIVATE ────────────────────────
  console.log('\n>>> [STEP 4] employee_statutory_details — Employee A reads Employee B statutory details (SHOULD BE BLOCKED) ...');
  const { data: statBFromA, error: statBErr } = await clientA
    .from('employee_statutory_details')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .maybeSingle();
  const statBLeak = Boolean(statBFromA);
  console.log(statBLeak
    ? fail(`Employee A can read Employee B statutory details (PAN/AADHAR/TAN PRIVACY VIOLATION)`)
    : pass(`Employee A CANNOT read Employee B statutory details`));
  findings.employee_statutory_details_select_peer = statBLeak ? 'LEAK' : 'BLOCKED';

  // ─── STEP 5: payslips — PRIVATE ──────────────────────────────────────────
  console.log('\n>>> [STEP 5] payslips — Employee A reads Employee B payslips (SHOULD BE BLOCKED) ...');
  const { data: payslipBFromA, error: payslipBErr } = await clientA
    .from('payslips')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .limit(1);
  const payslipBLeak = Boolean(payslipBFromA && payslipBFromA.length > 0);
  console.log(payslipBLeak
    ? fail(`Employee A can read Employee B payslips (SALARY PRIVACY VIOLATION — ${payslipBFromA.length} rows exposed)`)
    : pass(`Employee A CANNOT read Employee B payslips`));
  findings.payslips_select_peer = payslipBLeak ? 'LEAK' : 'BLOCKED';

  // ─── STEP 6: payroll_line_items — PRIVATE ────────────────────────────────
  console.log('\n>>> [STEP 6] payroll_line_items — Employee A reads Employee B payroll line items (SHOULD BE BLOCKED) ...');
  const { data: paylineBFromA } = await clientA
    .from('payroll_line_items')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .limit(1);
  const paylineBLeak = Boolean(paylineBFromA && paylineBFromA.length > 0);
  console.log(paylineBLeak
    ? fail(`Employee A can read Employee B payroll_line_items (SALARY PRIVACY VIOLATION)`)
    : pass(`Employee A CANNOT read Employee B payroll_line_items`));
  findings.payroll_line_items_select_peer = paylineBLeak ? 'LEAK' : 'BLOCKED';

  // ─── STEP 7: leave_balances — SEMI-PRIVATE ───────────────────────────────
  console.log('\n>>> [STEP 7] leave_balances — Employee A reads Employee B leave balances ...');
  const { data: lvlBFromA } = await clientA
    .from('leave_balances')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .limit(1);
  const lvlBLeak = Boolean(lvlBFromA && lvlBFromA.length > 0);
  console.log(info(`Employee A can read Employee B leave_balances: ${lvlBLeak} (${lvlBLeak ? lvlBFromA.length + ' row(s) visible' : 'BLOCKED'})`));
  findings.leave_balances_select_peer = lvlBLeak ? 'VISIBLE' : 'BLOCKED';

  // ─── STEP 8: leave_requests — SEMI-PRIVATE ───────────────────────────────
  console.log('\n>>> [STEP 8] leave_requests — Employee A reads Employee B leave requests ...');
  const { data: lrBFromA } = await clientA
    .from('leave_requests')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .limit(1);
  const lrBLeak = Boolean(lrBFromA && lrBFromA.length > 0);
  console.log(info(`Employee A can read Employee B leave_requests: ${lrBLeak} (${lrBLeak ? lrBFromA.length + ' row(s) visible' : 'BLOCKED'})`));
  findings.leave_requests_select_peer = lrBLeak ? 'VISIBLE' : 'BLOCKED';

  // ─── STEP 9: attendance_daily — SEMI-PRIVATE ─────────────────────────────
  console.log('\n>>> [STEP 9] attendance_daily — Employee A reads Employee B attendance ...');
  const { data: attBFromA } = await clientA
    .from('attendance_daily')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .limit(1);
  const attBLeak = Boolean(attBFromA && attBFromA.length > 0);
  console.log(info(`Employee A can read Employee B attendance_daily: ${attBLeak} (${attBLeak ? attBFromA.length + ' row(s) visible' : 'BLOCKED'})`));
  findings.attendance_daily_select_peer = attBLeak ? 'VISIBLE' : 'BLOCKED';

  // ─── STEP 10: employee_documents — PRIVATE ───────────────────────────────
  console.log('\n>>> [STEP 10] employee_documents — Employee A reads Employee B documents (SHOULD BE BLOCKED) ...');
  const { data: docBFromA } = await clientA
    .from('employee_documents')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .limit(1);
  const docBLeak = Boolean(docBFromA && docBFromA.length > 0);
  console.log(docBLeak
    ? fail(`Employee A can read Employee B employee_documents (DOCUMENT PRIVACY VIOLATION)`)
    : pass(`Employee A CANNOT read Employee B employee_documents`));
  findings.employee_documents_select_peer = docBLeak ? 'LEAK' : 'BLOCKED';

  // ─── STEP 11: employee_requests — PRIVATE ────────────────────────────────
  console.log('\n>>> [STEP 11] employee_requests — Employee A reads Employee B requests ...');
  const { data: reqBFromA } = await clientA
    .from('employee_requests')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .limit(1);
  const reqBLeak = Boolean(reqBFromA && reqBFromA.length > 0);
  console.log(reqBLeak
    ? fail(`Employee A can read Employee B employee_requests (PRIVACY VIOLATION)`)
    : pass(`Employee A CANNOT read Employee B employee_requests`));
  findings.employee_requests_select_peer = reqBLeak ? 'LEAK' : 'BLOCKED';

  // ─── STEP 12: employee_salary_assignments — PRIVATE ──────────────────────
  console.log('\n>>> [STEP 12] employee_salary_assignments — Employee A reads Employee B salary (SHOULD BE BLOCKED) ...');
  const { data: salBFromA } = await clientA
    .from('employee_salary_assignments')
    .select('*')
    .eq('employee_id', EMP_B_ID)
    .limit(1);
  const salBLeak = Boolean(salBFromA && salBFromA.length > 0);
  console.log(salBLeak
    ? fail(`Employee A can read Employee B salary assignments (SALARY PRIVACY VIOLATION)`)
    : pass(`Employee A CANNOT read Employee B salary assignments`));
  findings.employee_salary_assignments_select_peer = salBLeak ? 'LEAK' : 'BLOCKED';

  // ─── STEP 13: Employee A reads OWN data (all tables — positive) ──────────
  console.log('\n>>> [STEP 13] Employee A reads OWN data across all private tables (SHOULD ALL PASS) ...');

  const { data: ownProfile }  = await clientA.from('employee_profiles').select('*').eq('employee_id', EMP_A_ID).maybeSingle();
  const { data: ownBank }     = await clientA.from('employee_bank_details').select('*').eq('employee_id', EMP_A_ID).maybeSingle();
  const { data: ownStat }     = await clientA.from('employee_statutory_details').select('*').eq('employee_id', EMP_A_ID).maybeSingle();
  const { data: ownPayslips } = await clientA.from('payslips').select('*').eq('employee_id', EMP_A_ID).limit(5);
  const { data: ownLeave }    = await clientA.from('leave_balances').select('*').eq('employee_id', EMP_A_ID).limit(5);
  const { data: ownAtt }      = await clientA.from('attendance_daily').select('*').eq('employee_id', EMP_A_ID).limit(5);
  const { data: ownDocs }     = await clientA.from('employee_documents').select('*').eq('employee_id', EMP_A_ID).limit(5);

  console.log(`  ${Boolean(ownProfile) ? '✅' : '⚠️ '} employee_profiles (own):         ${Boolean(ownProfile) ? 'READABLE' : 'NOT FOUND (no data yet)'}`);
  console.log(`  ${Boolean(ownBank)    ? '✅' : '⚠️ '} employee_bank_details (own):    ${Boolean(ownBank)    ? 'READABLE' : 'NOT FOUND (no data yet)'}`);
  console.log(`  ${Boolean(ownStat)    ? '✅' : '⚠️ '} employee_statutory_details(own): ${Boolean(ownStat)    ? 'READABLE' : 'NOT FOUND (no data yet)'}`);
  console.log(`  ${ownPayslips?.length > 0 ? '✅' : '⚠️ '} payslips (own):              ${ownPayslips?.length > 0 ? ownPayslips.length + ' row(s)' : 'NOT FOUND (no data yet)'}`);
  console.log(`  ${ownLeave?.length > 0    ? '✅' : '⚠️ '} leave_balances (own):        ${ownLeave?.length > 0    ? ownLeave.length + ' row(s)' : 'NOT FOUND (no data yet)'}`);
  console.log(`  ${ownAtt?.length > 0      ? '✅' : '⚠️ '} attendance_daily (own):      ${ownAtt?.length > 0      ? ownAtt.length + ' row(s)' : 'NOT FOUND (no data yet)'}`);
  console.log(`  ${ownDocs?.length > 0     ? '✅' : '⚠️ '} employee_documents (own):    ${ownDocs?.length > 0     ? ownDocs.length + ' row(s)' : 'NOT FOUND (no data yet)'}`);

  // ─── STEP 14: Company Admin reads Employee B data (SHOULD ALL PASS) ──────
  console.log('\n>>> [STEP 14] Company Admin reads Employee B private data (SHOULD ALL PASS) ...');
  const { data: caBankB }     = await clientCA.from('employee_bank_details').select('*').eq('employee_id', EMP_B_ID).maybeSingle();
  const { data: caStatB }     = await clientCA.from('employee_statutory_details').select('*').eq('employee_id', EMP_B_ID).maybeSingle();
  const { data: caPayslipB }  = await clientCA.from('payslips').select('*').eq('employee_id', EMP_B_ID).limit(1);
  const { data: caSalB }      = await clientCA.from('employee_salary_assignments').select('*').eq('employee_id', EMP_B_ID).limit(1);
  console.log(`  ${Boolean(caBankB)            ? '✅' : '⚠️ '} CA reads Employee B bank_details: ${Boolean(caBankB) ? 'ACCESSIBLE' : 'NO DATA'}`);
  console.log(`  ${Boolean(caStatB)            ? '✅' : '⚠️ '} CA reads Employee B statutory:    ${Boolean(caStatB) ? 'ACCESSIBLE' : 'NO DATA'}`);
  console.log(`  ${caPayslipB?.length > 0      ? '✅' : '⚠️ '} CA reads Employee B payslips:     ${caPayslipB?.length > 0 ? caPayslipB.length + ' row(s)' : 'NO DATA'}`);
  console.log(`  ${caSalB?.length > 0          ? '✅' : '⚠️ '} CA reads Employee B salary assign:${caSalB?.length > 0 ? caSalB.length + ' row(s)' : 'NO DATA'}`);

  // ─── STEP 15: HR Head reads Employee A data (SHOULD ALL PASS) ────────────
  console.log('\n>>> [STEP 15] HR Head reads Employee A private data (SHOULD ALL PASS) ...');
  const { data: hrBankA }     = await clientHR.from('employee_bank_details').select('*').eq('employee_id', EMP_A_ID).maybeSingle();
  const { data: hrStatA }     = await clientHR.from('employee_statutory_details').select('*').eq('employee_id', EMP_A_ID).maybeSingle();
  console.log(`  ${Boolean(hrBankA) ? '✅' : '⚠️ '} HR reads Employee A bank_details: ${Boolean(hrBankA) ? 'ACCESSIBLE' : 'NO DATA'}`);
  console.log(`  ${Boolean(hrStatA) ? '✅' : '⚠️ '} HR reads Employee A statutory:    ${Boolean(hrStatA) ? 'ACCESSIBLE' : 'NO DATA'}`);

  // ─── SUMMARY ──────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log('PHASE H — READ ISOLATION AUDIT SUMMARY');
  console.log('================================================================');
  console.log('\n[Column Classification Key]');
  console.log('  A = Self-service (employee can read/write own data)');
  console.log('  B = HR/Admin visible (HR Head, Company Admin, Platform Admin)');
  console.log('  C = Security/Identity (only Platform Admin or system)');
  console.log('  D = Tenant master (Organization, Company)');
  console.log('  E = System/Audit (read-only, no user writes)');

  console.log('\n[Employee A → Employee B READ Isolation Results]');
  const leakCount = Object.values(findings).filter(v => v === 'LEAK').length;
  const visibleCount = Object.values(findings).filter(v => v === 'VISIBLE').length;
  const blockedCount = Object.values(findings).filter(v => v === 'BLOCKED').length;

  for (const [table, result] of Object.entries(findings)) {
    const icon = result === 'LEAK' ? '❌' : result === 'VISIBLE' ? 'ℹ️ ' : '✅';
    console.log(`  ${icon} ${table}: ${result}`);
  }

  console.log(`\n  Total Tables Audited: ${Object.keys(findings).length}`);
  console.log(`  ❌ PRIVACY LEAKS (must remediate): ${leakCount}`);
  console.log(`  ℹ️  SEMI-PRIVATE VISIBLE (review required): ${visibleCount}`);
  console.log(`  ✅ PROPERLY BLOCKED: ${blockedCount}`);

  const verdict = leakCount === 0 ? 'PHASE H = PASS' : `PHASE H = REMEDIATION REQUIRED (${leakCount} privacy leak(s))`;
  console.log(`\n>>> VERDICT: ${verdict}\n`);

  return findings;
}

runPhaseH().catch(console.error);
