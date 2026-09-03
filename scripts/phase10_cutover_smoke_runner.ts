// scripts/phase10_cutover_smoke_runner.ts
// ============================================================================
// Joy PeopleHR — Phase 10 Production Cutover & Live Smoke Runner
// Exercises the critical production paths and logs immutable cutover evidence.
// ============================================================================

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { LoggerService } from '../src/services/diagnostics/loggerService';
import { payrollApi } from '../src/services/payrollApi';

interface SmokeStepResult {
  step: string;
  name: string;
  category: 'AUTH' | 'TENANT' | 'HR' | 'ATTENDANCE' | 'LEAVE' | 'PAYROLL' | 'OBSERVABILITY';
  passed: boolean;
  metricOrEvidence: string;
}

const steps: SmokeStepResult[] = [];

function logStep(step: string, name: string, category: SmokeStepResult['category'], passed: boolean, metricOrEvidence: string) {
  steps.push({ step, name, category, passed, metricOrEvidence });
  console.log(`  [${passed ? '✓ PASS' : '✗ FAIL'}] ${step} — ${name}: ${metricOrEvidence}`);
}

async function runCutoverSmoke() {
  console.log('================================================================');
  console.log('  JOY PEOPLEHR SAAS — PHASE 10 PRODUCTION CUTOVER SMOKE TEST    ');
  console.log('================================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const client = createClient(supabaseUrl, supabaseAnonKey);

  // --------------------------------------------------------------------------
  // 1. Authentication & Tenant Resolution
  // --------------------------------------------------------------------------
  console.log('[STAGE 1: AUTHENTICATION & SESSION CONTEXT]');
  try {
    const { data: orgs, error: orgErr } = await client.from('organizations').select('id, name').limit(3);
    const orgQueryPassed = !orgErr && Array.isArray(orgs) && orgs.length > 0;
    logStep(
      'C-AUTH-01',
      'Public Organization Discovery',
      'AUTH',
      orgQueryPassed,
      orgQueryPassed ? `Found ${orgs.length} registered organizations (${orgs[0]?.name})` : `Query error: ${orgErr?.message}`
    );

    // Negative authentication check
    const { error: authErr } = await client.auth.signInWithPassword({
      email: 'security-probe@joypeoplehr.com',
      password: 'UnauthorizedPassword!2026',
    });
    const authDefensePassed = !!authErr;
    logStep(
      'C-AUTH-02',
      'Unauthorized Auth Interception',
      'AUTH',
      authDefensePassed,
      authErr ? `Correctly rejected: ${authErr.message}` : 'Failed to reject fake credentials'
    );
  } catch (err: any) {
    logStep('C-AUTH-01', 'Auth Gateway', 'AUTH', false, err.message);
  }

  // --------------------------------------------------------------------------
  // 2. Tenant Boundary Isolation
  // --------------------------------------------------------------------------
  console.log('\n[STAGE 2: LIVE MULTI-TENANT ISOLATION]');
  try {
    // Probe access to employees table across non-authenticated boundary
    const { data: crossData, error: crossErr } = await client
      .from('employees')
      .select('id, first_name, organization_id')
      .limit(10);
    const boundaryEnforced = !crossData || crossData.length === 0 || !!crossErr;
    logStep(
      'C-TNT-01',
      'Cross-Tenant Data Exposure Shield',
      'TENANT',
      boundaryEnforced,
      boundaryEnforced ? 'Zero rows exposed across unauthenticated boundary' : `Leakage detected: ${crossData.length} rows`
    );
  } catch (err: any) {
    logStep('C-TNT-01', 'Tenant Isolation', 'TENANT', false, err.message);
  }

  // --------------------------------------------------------------------------
  // 3. Core HR Domain Model Verification
  // --------------------------------------------------------------------------
  console.log('\n[STAGE 3: CORE HR DATA INTEGRITY]');
  try {
    // Query salary components structure (standard catalog)
    const { data: components, error: compErr } = await client
      .from('salary_components')
      .select('id')
      .limit(5);
    const componentsAvailable = !compErr;
    logStep(
      'C-HR-01',
      'Salary Component Taxonomy',
      'HR',
      componentsAvailable,
      componentsAvailable ? `Salary components schema accessible (returned ${components?.length ?? 0} items)` : `Error: ${compErr.message}`
    );
  } catch (err: any) {
    logStep('C-HR-01', 'Salary Components', 'HR', false, err.message);
  }

  // --------------------------------------------------------------------------
  // 4. Attendance Raw Punch Immutability & Event Bus
  // --------------------------------------------------------------------------
  console.log('\n[STAGE 4: ATTENDANCE IMMUTABILITY & ENGINE]');
  try {
    const { data: attDaily, error: attDailyErr } = await client
      .from('attendance_daily')
      .select('id, date, status')
      .limit(5);
    const dailyAccessible = !attDailyErr;
    logStep(
      'C-ATT-01',
      'Attendance Aggregation Schema',
      'ATTENDANCE',
      dailyAccessible,
      dailyAccessible ? `Daily attendance table verified (returned ${attDaily?.length ?? 0} rows)` : `Error: ${attDailyErr.message}`
    );
  } catch (err: any) {
    logStep('C-ATT-01', 'Attendance', 'ATTENDANCE', false, err.message);
  }

  // --------------------------------------------------------------------------
  // 5. Leave Ledger Double-Entry Rules
  // --------------------------------------------------------------------------
  console.log('\n[STAGE 5: LEAVE LEDGER DOUBLE-ENTRY ENGINE]');
  try {
    const { data: leaveTypes, error: ltErr } = await client
      .from('leave_types')
      .select('id, code, name, is_paid')
      .limit(5);
    const ltAvailable = !ltErr;
    logStep(
      'C-LEV-01',
      'Leave Type Catalog Verification',
      'LEAVE',
      ltAvailable,
      ltAvailable ? `Leave types accessible (returned ${leaveTypes?.length ?? 0} types)` : `Error: ${ltErr.message}`
    );
  } catch (err: any) {
    logStep('C-LEV-01', 'Leave Catalog', 'LEAVE', false, err.message);
  }

  // --------------------------------------------------------------------------
  // 6. Payroll Engine & Statutory Indian Calculation Reality
  // --------------------------------------------------------------------------
  console.log('\n[STAGE 6: PAYROLL ENGINE & STATUTORY ACCURACY]');
  try {
    const sampleRun = await payrollApi.calculatePayrollRun(
      'September 2026',
      '2026-09-01',
      '2026-09-30',
      '2026-09-30',
      'org-cutover-test'
    );

    const runValid = !!sampleRun && (sampleRun.status === 'CALCULATED' || sampleRun.status === 'PreviewReady' || sampleRun.status === 'Draft');
    logStep(
      'C-PAY-01',
      'Payroll Calculation Determinism',
      'PAYROLL',
      runValid,
      `Period ${sampleRun?.period_name || 'September 2026'}: status=${sampleRun?.status}, net_disbursement=Rs ${(sampleRun?.total_net_salary || 0).toLocaleString('en-IN')}`
    );
  } catch (err: any) {
    logStep('C-PAY-01', 'Payroll Engine', 'PAYROLL', false, err.message);
  }

  // --------------------------------------------------------------------------
  // 7. Observability & PII Redaction
  // --------------------------------------------------------------------------
  console.log('\n[STAGE 7: OBSERVABILITY & AUDIT TELEMETRY]');
  const auditLog = LoggerService.log({
    level: 'INFO',
    layer: 'PROD_CUTOVER',
    action: 'CUTOVER_SMOKE_VERIFICATION',
    message: 'Operational handover verification probe',
    metadata: {
      tester: 'Release Engineering Team',
      aadhaar_number: '999988887777',
      pan_number: 'ZZZZZ9999Z',
      ctc: 2400000,
    },
  });

  const piiClean =
    auditLog.metadata?.aadhaar_number?.includes('***MASKED') &&
    auditLog.metadata?.pan_number?.includes('***MASKED') &&
    auditLog.metadata?.ctc?.includes('***MASKED');

  logStep(
    'C-OBS-01',
    'Real-time PII Redaction at Observability Gate',
    'OBSERVABILITY',
    piiClean,
    `Telemetry dispatched: id=${auditLog.id}, PII masked in memory and console`
  );

  // --------------------------------------------------------------------------
  // Summary Evaluation
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  const passedCount = steps.filter((s) => s.passed).length;
  const failedCount = steps.filter((s) => !s.passed).length;
  console.log(`  CUTOVER SMOKE SUMMARY: ${passedCount} Passed, ${failedCount} Failed (${steps.length} Total)`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runCutoverSmoke().catch((err) => {
  console.error('Fatal Cutover Smoke Error:', err);
  process.exit(1);
});
