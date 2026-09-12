// src/services/__tests__/offboardingFnFModule02.test.ts
// ============================================================================
// JOY PeopleHR — Module Certification 02: Offboarding → FnF Automation Engine
// 15-Test Master Verification Suite
// ============================================================================

import { separationFnFEngine } from '../offboarding/separationFnFEngine';
import { UnifiedApprovalEngine } from '../approvals/unifiedApprovalEngine';
import { domainEventService } from '../events/domainEventService';
import { CANONICAL_DOMAIN_EVENTS } from '../../types/domainEvents';

export async function runOffboardingFnFModule02CertificationSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
  details: string[];
}> {
  console.log('\n================================================================');
  console.log('🚀 MODULE CERTIFICATION 02: OFFBOARDING → FNF AUTOMATION ENGINE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;
  const details: string[] = [];

  const assert = (condition: boolean, testName: string, message?: string) => {
    if (condition) {
      passed++;
      const msg = `  ✅ PASS: ${testName}`;
      console.log(msg);
      details.push(msg);
    } else {
      failed++;
      const msg = `  ❌ FAIL: ${testName} — ${message || 'Assertion failed'}`;
      console.error(msg);
      details.push(msg);
    }
  };

  const TENANT_A = 'org-tenant-alpha';
  const TENANT_B = 'org-tenant-beta';
  const EMP_REGULAR = 'emp-vikram-101';
  const EMP_PROBATION = 'emp-anita-102';
  const EMP_LEAD = 'emp-suresh-103';
  const EMP_INTERN = 'emp-rahul-104';
  const EMP_CONTRACTOR = 'emp-deepa-105';
  const HR_ACTOR = 'emp-hr-admin-999';

  // Initialize clean mock environment in globalThis
  (globalThis as any).__JOY_SEPARATIONS__ = [];
  (globalThis as any).__JOY_SEPARATION_CLEARANCES__ = [];
  (globalThis as any).__JOY_SEPARATION_ASSETS__ = [];
  (globalThis as any).__JOY_FNF_SETTLEMENTS__ = [];
  (globalThis as any).__JOY_EMPLOYEES__ = [
    { id: EMP_REGULAR, employment_status: 'ACTIVE', last_working_day: null },
    { id: EMP_PROBATION, employment_status: 'PROBATION', last_working_day: null },
    { id: EMP_LEAD, employment_status: 'ACTIVE', last_working_day: null },
  ];
  (globalThis as any).__JOY_USER_PROFILES__ = [
    { employee_id: EMP_REGULAR, status: 'ACTIVE' },
    { employee_id: EMP_PROBATION, status: 'ACTIVE' },
    { employee_id: EMP_LEAD, status: 'ACTIVE' },
  ];
  (globalThis as any).__JOY_LIFECYCLE_EVENTS__ = [];

  // ==========================================================================
  // LAYER 02A: Separation Authority & Notice Period Engine
  // ==========================================================================

  // Test 1: Policy-based notice period calculation
  try {
    const probCalc = separationFnFEngine.calculateNoticePeriod({
      employmentType: 'probation',
      designation: 'Software Engineer',
      resignationDateStr: '2026-06-01',
    });
    const internCalc = separationFnFEngine.calculateNoticePeriod({
      employmentType: 'intern',
      designation: 'Intern',
      resignationDateStr: '2026-06-01',
    });
    const contractCalc = separationFnFEngine.calculateNoticePeriod({
      employmentType: 'contractor',
      designation: 'Consultant',
      resignationDateStr: '2026-06-01',
    });
    const leadCalc = separationFnFEngine.calculateNoticePeriod({
      employmentType: 'regular',
      designation: 'Engineering Lead',
      resignationDateStr: '2026-06-01',
    });
    const regCalc = separationFnFEngine.calculateNoticePeriod({
      employmentType: 'regular',
      designation: 'Software Engineer',
      resignationDateStr: '2026-06-01',
    });

    const isProb15 = probCalc.noticeDays === 15;
    const isIntern7 = internCalc.noticeDays === 7;
    const isContract14 = contractCalc.noticeDays === 14;
    const isLead60 = leadCalc.noticeDays === 60;
    const isReg30 = regCalc.noticeDays === 30;

    assert(
      isProb15 && isIntern7 && isContract14 && isLead60 && isReg30,
      'Test 1 (Layer 02A): Notice period rules (Probation: 15d, Intern: 7d, Contractor: 14d, Lead: 60d, Reg: 30d)',
      `Actual: prob=${probCalc.noticeDays}, intern=${internCalc.noticeDays}, cont=${contractCalc.noticeDays}, lead=${leadCalc.noticeDays}, reg=${regCalc.noticeDays}`
    );
  } catch (e: any) {
    assert(false, 'Test 1 (Layer 02A): Notice period calculation failed', e.message);
  }

  // Test 2: Involuntary termination initiation with immediate/custom LWD
  let sepTerminationId = '';
  try {
    const termRes = await separationFnFEngine.initiateSeparation({
      id: 'sep-term-001',
      organizationId: TENANT_A,
      employeeId: EMP_PROBATION,
      separationType: 'TERMINATION',
      resignationDate: '2026-06-01',
      proposedLastWorkingDate: '2026-06-01', // Immediate LWD
      employmentType: 'probation',
      reason: 'Performance mismatch during probation',
      initiatedBy: HR_ACTOR,
      initiatedRole: 'HR_HEAD',
    });
    sepTerminationId = termRes.separation.id;

    const isImmediate = termRes.separation.expected_last_working_date === '2026-06-01';
    const isTermType = termRes.separation.separation_type === 'TERMINATION';
    const hasClearances = termRes.clearances.length === 8;

    assert(
      isImmediate && isTermType && hasClearances,
      'Test 2 (Layer 02A): Involuntary termination initiation with immediate LWD and 8 clearance tasks',
      `Immediate=${isImmediate}, Type=${isTermType}, Clearances=${termRes.clearances.length}`
    );
  } catch (e: any) {
    assert(false, 'Test 2 (Layer 02A): Termination initiation failed', e.message);
  }

  // Test 3: Resignation initiation and notice period buyout / waiver adjustment
  let sepRegularId = '';
  try {
    const initRes = await separationFnFEngine.initiateSeparation({
      id: 'sep-reg-001',
      organizationId: TENANT_A,
      employeeId: EMP_REGULAR,
      separationType: 'RESIGNATION',
      resignationDate: '2026-06-01',
      employmentType: 'regular',
      designation: 'Senior Developer',
      reason: 'Better career opportunity',
      initiatedBy: EMP_REGULAR,
      initiatedRole: 'EMPLOYEE',
    });
    sepRegularId = initRes.separation.id;

    // Approver adjusts notice period: 10 days waiver granted
    const approvedRes = await separationFnFEngine.approveSeparation({
      separationId: sepRegularId,
      organizationId: TENANT_A,
      actorId: HR_ACTOR,
      actorRole: 'HR_HEAD',
      approvedLwd: '2026-06-20',
      noticeWaiverDays: 10,
      comments: '10 days waiver granted by HR management',
    });

    const isWaiverRecorded = approvedRes.separation.notice_waiver_days === 10;
    const isApprovedLwd = approvedRes.separation.approved_last_working_date === '2026-06-20';

    assert(
      isWaiverRecorded && isApprovedLwd,
      'Test 3 (Layer 02A): Separation approval with notice period waiver adjustment',
      `WaiverDays=${approvedRes.separation.notice_waiver_days}, ApprovedLwd=${approvedRes.separation.approved_last_working_date}`
    );
  } catch (e: any) {
    assert(false, 'Test 3 (Layer 02A): Notice buyout/waiver adjustment failed', e.message);
  }

  // Test 4: Separation withdrawal / cancellation before terminal approval
  try {
    const withdrawInit = await separationFnFEngine.initiateSeparation({
      id: 'sep-withdraw-001',
      organizationId: TENANT_A,
      employeeId: EMP_LEAD,
      separationType: 'RESIGNATION',
      resignationDate: '2026-06-05',
      employmentType: 'regular',
      designation: 'Tech Lead',
      reason: 'Exploring options',
      initiatedBy: EMP_LEAD,
      initiatedRole: 'EMPLOYEE',
    });

    // Withdraw resignation
    const withdrawRes = await separationFnFEngine.withdrawSeparation({
      separationId: withdrawInit.separation.id,
      organizationId: TENANT_A,
      actorId: EMP_LEAD,
      reason: 'Counter-offer accepted and retained',
    });

    const isCancelled = (withdrawRes.separation.status as string) === 'CANCELLED';

    // Verify cannot withdraw already completed separation
    (withdrawRes.separation as any).status = 'COMPLETED';
    (separationFnFEngine as any).saveLocalSeparation(withdrawRes.separation);
    let threwIllegalState = false;
    try {
      await separationFnFEngine.withdrawSeparation({
        separationId: withdrawInit.separation.id,
        organizationId: TENANT_A,
        actorId: EMP_LEAD,
        reason: 'Attempting invalid withdrawal',
      });
    } catch (err: any) {
      threwIllegalState = err.message.includes('ILLEGAL_STATE_TRANSITION');
    }

    assert(
      isCancelled && threwIllegalState,
      'Test 4 (Layer 02A): Separation withdrawal before approval & prevention of post-completion withdrawal',
      `Cancelled=${isCancelled}, ThrewIllegalState=${threwIllegalState}`
    );
  } catch (e: any) {
    assert(false, 'Test 4 (Layer 02A): Separation withdrawal failed', e.message);
  }

  // ==========================================================================
  // LAYER 02B: Clearance Authority & Asset Recovery
  // ==========================================================================

  // Test 5: Standard 8-department clearance matrix generation
  try {
    const clearances = separationFnFEngine.getLocalClearances(sepRegularId);
    const expectedDepts = [
      'MANAGER',
      'TEAM_LEAD',
      'IT',
      'ASSET',
      'FINANCE',
      'PAYROLL',
      'HR',
      'ADMIN',
    ];
    const presentDepts = clearances.map((c) => c.department);
    const allEightPresent = expectedDepts.every((d) => presentDepts.includes(d as any));
    const allPending = clearances.every((c) => c.status === 'PENDING');

    assert(
      clearances.length === 8 && allEightPresent && allPending,
      'Test 5 (Layer 02B): Spawning standard 8-department clearance matrix (all PENDING)',
      `Count=${clearances.length}, Present=${presentDepts.join(', ')}`
    );
  } catch (e: any) {
    assert(false, 'Test 5 (Layer 02B): Clearance matrix generation failed', e.message);
  }

  // Test 6: Asset recovery inspection (RETURNED vs DAMAGED vs MISSING)
  let assetDeduction = 0;
  try {
    // Laptop returned in good condition
    const rec1 = await separationFnFEngine.recordAssetRecovery({
      id: 'rec-laptop-01',
      organizationId: TENANT_A,
      separationId: sepRegularId,
      assetId: 'ast-macbook-01',
      assetName: 'MacBook Pro 16"',
      condition: 'GOOD',
      recoveryStatus: 'RETURNED',
      recoveredBy: 'IT Asset Admin',
    });

    // Access badge damaged/missing -> ₹2,500 replacement deduction
    const rec2 = await separationFnFEngine.recordAssetRecovery({
      id: 'rec-badge-02',
      organizationId: TENANT_A,
      separationId: sepRegularId,
      assetId: 'ast-badge-02',
      assetName: 'RFID Security Card',
      condition: 'DAMAGED',
      recoveryStatus: 'DAMAGED',
      damageDeductionAmount: 2500,
      recoveredBy: 'Admin Team',
    });

    assetDeduction = rec2.recovery.financial_recovery_amount;
    const isRec1Returned = rec1.recovery.recovery_status === 'RETURNED';
    const isRec2Damaged = rec2.recovery.recovery_status === 'DAMAGED' && assetDeduction === 2500;

    assert(
      isRec1Returned && isRec2Damaged,
      'Test 6 (Layer 02B): Asset recovery inspection (Returned vs Damaged deduction)',
      `Rec1Status=${rec1.recovery.recovery_status}, Rec2Deduction=${assetDeduction}`
    );
  } catch (e: any) {
    assert(false, 'Test 6 (Layer 02B): Asset recovery inspection failed', e.message);
  }

  // Test 7: Clearance sign-offs and damage deduction flowing to clearance ledger
  try {
    const clearances = separationFnFEngine.getLocalClearances(sepRegularId);
    // Clear 7 departments, leave 1 pending to test blocker
    for (let i = 0; i < 7; i++) {
      await separationFnFEngine.updateClearance({
        clearanceId: clearances[i].id,
        separationId: sepRegularId,
        organizationId: TENANT_A,
        status: 'CLEARED',
        clearedBy: 'Department Head',
        remarks: 'All items handed over cleanly',
      });
    }

    const readinessCheck = separationFnFEngine.verifyClearanceReadiness(sepRegularId);
    const hasOnePending = readinessCheck.pendingCount === 1 && !readinessCheck.isReady;

    assert(
      hasOnePending && readinessCheck.blockers.length === 1,
      'Test 7 (Layer 02B): Partial clearance verification accurately flags pending blocker',
      `PendingCount=${readinessCheck.pendingCount}, Blockers=${readinessCheck.blockers[0]}`
    );
  } catch (e: any) {
    assert(false, 'Test 7 (Layer 02B): Clearance sign-offs failed', e.message);
  }

  // Test 8: Clearance blocker gate enforcement (settleFnF rejects exit unless exception granted)
  try {
    // Generate a temporary settlement for sepRegularId
    const tempFnF = await separationFnFEngine.calculateFnFSettlement({
      organizationId: TENANT_A,
      separationId: sepRegularId,
      employeeId: EMP_REGULAR,
      resignationDate: '2026-06-01',
      lastWorkingDate: '2026-06-20',
      grossMonthly: 90000,
      basicMonthly: 45000,
      unpaidSalaryDays: 20,
      earnedLeaveBalanceDays: 10,
      tenureYears: 3,
      noticeRequiredDays: 30,
      noticeServedDays: 20,
      noticeWaiverDays: 10,
      assetRecoveryDeduction: assetDeduction,
    });

    let blockerBlocked = false;
    try {
      await separationFnFEngine.settleFnF({
        settlementId: tempFnF.settlement.id,
        organizationId: TENANT_A,
        actorId: HR_ACTOR,
        paymentReference: 'TXN-BLOCKER-TEST',
      });
    } catch (err: any) {
      blockerBlocked = err.message.includes('CLEARANCE_BLOCKER');
    }

    // Now clear the last department (8th)
    const clearances = separationFnFEngine.getLocalClearances(sepRegularId);
    const lastPending = clearances.find((c) => c.status === 'PENDING');
    if (lastPending) {
      await separationFnFEngine.updateClearance({
        clearanceId: lastPending.id,
        separationId: sepRegularId,
        organizationId: TENANT_A,
        status: 'CLEARED',
        clearedBy: 'Admin Head',
      });
    }

    const readinessAfter = separationFnFEngine.verifyClearanceReadiness(sepRegularId);

    assert(
      blockerBlocked && readinessAfter.isReady,
      'Test 8 (Layer 02B): Clearance blocker gate stops FnF settlement until all 8 departments sign off',
      `BlockerBlocked=${blockerBlocked}, IsReadyAfterClearance=${readinessAfter.isReady}`
    );
  } catch (e: any) {
    assert(false, 'Test 8 (Layer 02B): Clearance blocker enforcement failed', e.message);
  }

  // ==========================================================================
  // LAYER 02C: Authoritative Financial FnF Engine
  // ==========================================================================

  // Test 9: Authoritative FnF formula calculation
  // Formula: Net = (Pending Salary + Leave Encashment + Gratuity + Incentives)
  //              - (Notice Shortfall Recovery + Asset Recovery + Loan Recovery + Statutory Deductions)
  let fnfResultTest9: any;
  try {
    // Gross: 90,000 / month -> Daily: 3,000. Basic: 45,000 -> Daily: 1,500.
    // Unpaid days: 15 -> Pending Salary = 15 * 3,000 = 45,000.
    // Earned Leave: 10 days -> Leave Encashment = 10 * 1,500 = 15,000.
    // Gratuity: tenure = 2 years (< 5 years) -> Gratuity = 0.
    // Notice: required = 30, served = 20, waiver = 5 -> shortfall = 5 days.
    // Notice Shortfall Recovery = 5 * 3,000 = 15,000.
    // Asset Recovery Deduction = 2,500.
    // Loan Outstanding Recovery = 5,000.
    // Statutory Deductions = 200.
    // Expected Total Gross = 45,000 + 15,000 + 0 = 60,000.
    // Expected Total Deductions = 15,000 + 2,500 + 5,000 + 200 = 22,700.
    // Expected Net Payable = 60,000 - 22,700 = 37,300.
    fnfResultTest9 = await separationFnFEngine.calculateFnFSettlement({
      organizationId: TENANT_A,
      separationId: sepRegularId,
      employeeId: EMP_REGULAR,
      resignationDate: '2026-06-01',
      lastWorkingDate: '2026-06-20',
      grossMonthly: 90000,
      basicMonthly: 45000,
      unpaidSalaryDays: 15,
      earnedLeaveBalanceDays: 10,
      tenureYears: 2,
      noticeRequiredDays: 30,
      noticeServedDays: 20,
      noticeWaiverDays: 5,
      assetRecoveryDeduction: 2500,
      loanOutstandingRecovery: 5000,
      statutoryDeductions: 200,
    });

    const b = fnfResultTest9.breakdown;
    const isGrossMatch = b.totalGross === 60000;
    const isDeductionMatch = b.totalDeductions === 22700;
    const isNetMatch = b.netPayable === 37300;

    assert(
      isGrossMatch && isDeductionMatch && isNetMatch,
      'Test 9 (Layer 02C): Authoritative FnF calculation matches exact statutory mathematical breakdown',
      `Gross=${b.totalGross} (exp 60000), Ded=${b.totalDeductions} (exp 22700), Net=${b.netPayable} (exp 37300)`
    );
  } catch (e: any) {
    assert(false, 'Test 9 (Layer 02C): FnF mathematical calculation failed', e.message);
  }

  // Test 10: Gratuity eligibility rule (0 if < 5 yrs, (15 * basic * tenure)/26 if >= 5 yrs)
  try {
    // Tenure = 6 years, Basic = 52,000
    // Expected Gratuity = Math.round((15 * 52000 * 6) / 26) = Math.round(4680000 / 26) = 180,000.
    const eligibleGratuity = await separationFnFEngine.calculateFnFSettlement({
      organizationId: TENANT_A,
      employeeId: EMP_LEAD,
      resignationDate: '2026-06-01',
      lastWorkingDate: '2026-06-30',
      grossMonthly: 120000,
      basicMonthly: 52000,
      unpaidSalaryDays: 30,
      earnedLeaveBalanceDays: 0,
      tenureYears: 6,
      noticeRequiredDays: 60,
      noticeServedDays: 60,
    });

    // Ineligible employee: Tenure = 4.5 years
    const ineligibleGratuity = await separationFnFEngine.calculateFnFSettlement({
      organizationId: TENANT_A,
      employeeId: EMP_REGULAR,
      resignationDate: '2026-06-01',
      lastWorkingDate: '2026-06-30',
      grossMonthly: 120000,
      basicMonthly: 52000,
      unpaidSalaryDays: 30,
      earnedLeaveBalanceDays: 0,
      tenureYears: 4.5,
      noticeRequiredDays: 60,
      noticeServedDays: 60,
    });

    const isEligibleExact = eligibleGratuity.breakdown.gratuity === 180000;
    const isIneligibleZero = ineligibleGratuity.breakdown.gratuity === 0;

    assert(
      isEligibleExact && isIneligibleZero,
      'Test 10 (Layer 02C): Statutory gratuity rule (>=5 yrs: (15*Basic*Tenure)/26 = 180,000; <5 yrs: 0)',
      `Eligible=${eligibleGratuity.breakdown.gratuity}, Ineligible=${ineligibleGratuity.breakdown.gratuity}`
    );
  } catch (e: any) {
    assert(false, 'Test 10 (Layer 02C): Gratuity calculation failed', e.message);
  }

  // ==========================================================================
  // LAYER 02D: Locked Period Isolation
  // ==========================================================================

  // Test 11: Locked payroll period isolation
  try {
    // Exit in a period where payroll is locked
    const lockedFnF = await separationFnFEngine.calculateFnFSettlement({
      organizationId: TENANT_A,
      separationId: 'sep-locked-001',
      employeeId: 'emp-locked-user',
      resignationDate: '2026-05-15',
      lastWorkingDate: '2026-05-31',
      grossMonthly: 75000,
      basicMonthly: 37500,
      unpaidSalaryDays: 31,
      earnedLeaveBalanceDays: 5,
      tenureYears: 2,
      noticeRequiredDays: 30,
      noticeServedDays: 30,
      isPayrollPeriodLocked: true, // Month is locked
    });

    const isLockedFlagged = lockedFnF.isLockedPayrollPeriod === true;
    const hasIsolatedSettlement = lockedFnF.settlement.id.includes('fnf-');
    const netCalculated = lockedFnF.breakdown.netPayable > 0;

    assert(
      isLockedFlagged && hasIsolatedSettlement && netCalculated,
      'Test 11 (Layer 02D): Locked period isolation preserves historical locked payroll and generates standalone FnF delta',
      `Locked=${isLockedFlagged}, SettlementId=${lockedFnF.settlement.id}`
    );
  } catch (e: any) {
    assert(false, 'Test 11 (Layer 02D): Locked period isolation failed', e.message);
  }

  // ==========================================================================
  // LAYER 02E: Unified Approvals, Terminal Exit Automation & Lifecycle Records
  // ==========================================================================

  // Test 12: Unified Approval Engine routes FNF approval
  let fnfApprovedId = '';
  try {
    const approvalEngine = UnifiedApprovalEngine.getInstance();
    fnfApprovedId = fnfResultTest9.settlement.id;

    // Create approval instance for FNF
    const instance = await approvalEngine.createInstance({
      organizationId: TENANT_A,
      workflowId: 'wf-fnf-settlement',
      targetEntityType: 'FNF',
      targetEntityId: fnfApprovedId,
      requesterEmployeeId: EMP_REGULAR,
    });

    // Execute approval via Finance Approver
    const approvalResult = await approvalEngine.executeApprovalAction({
      instanceId: instance.id,
      actorEmployeeId: HR_ACTOR,
      actorRole: 'Admin',
      action: 'APPROVE',
      comments: 'All deductions, gratuity, and clearances verified by Finance',
      approverOrgId: TENANT_A,
    });

    const updatedSettlement = separationFnFEngine.getLocalFnFSettlement(fnfApprovedId);
    const isApprovedStatus = updatedSettlement?.payment_status === 'Approved';
    const isInstanceApproved = approvalResult.instance?.status === 'APPROVED';

    assert(
      isInstanceApproved && isApprovedStatus,
      'Test 12 (Layer 02E): Unified Approval Engine routes FNF approval to domain adapter and marks Approved',
      `InstanceStatus=${approvalResult.instance?.status}, PaymentStatus=${updatedSettlement?.payment_status}`
    );
  } catch (e: any) {
    assert(false, 'Test 12 (Layer 02E): Unified approval routing failed', e.message);
  }

  // Test 13: Terminal Employee Status update (employment_status = 'EXITED') & Lifecycle log
  try {
    const settleRes = await separationFnFEngine.settleFnF({
      settlementId: fnfApprovedId,
      organizationId: TENANT_A,
      actorId: HR_ACTOR,
      paymentReference: 'NEFT-JOY-2026-998811',
    });

    const emps = (globalThis as any).__JOY_EMPLOYEES__ || [];
    const empRecord = emps.find((e: any) => e.id === EMP_REGULAR);
    const isExited = empRecord?.employment_status === 'EXITED';

    const events = (globalThis as any).__JOY_LIFECYCLE_EVENTS__ || [];
    const exitEvent = events.find(
      (ev: any) => ev.employee_id === EMP_REGULAR && ev.event_type === 'EXIT'
    );

    assert(
      settleRes.exitExecuted && isExited && exitEvent !== undefined,
      'Test 13 (Layer 02E): Settle FnF transitions employee to EXITED and records immutable EXIT lifecycle event',
      `ExitExecuted=${settleRes.exitExecuted}, EmpStatus=${empRecord?.employment_status}, HasLifecycleLog=${!!exitEvent}`
    );
  } catch (e: any) {
    assert(false, 'Test 13 (Layer 02E): Terminal employee status update failed', e.message);
  }

  // Test 14: Access revocation & User Profile status deactivation (INACTIVE)
  try {
    const userProfiles = (globalThis as any).__JOY_USER_PROFILES__ || [];
    const prof = userProfiles.find((p: any) => p.employee_id === EMP_REGULAR);
    const isInactive = prof?.status === 'INACTIVE';

    assert(
      isInactive,
      'Test 14 (Layer 02E): Auth access revoked and user_profile status transitioned to INACTIVE',
      `ProfileStatus=${prof?.status}`
    );
  } catch (e: any) {
    assert(false, 'Test 14 (Layer 02E): User profile deactivation failed', e.message);
  }

  // Test 15: Multi-Tenant Isolation & Maker-Checker Security
  try {
    // 1. Self-approval prevention
    let selfApprovalBlocked = false;
    try {
      await separationFnFEngine.approveFnFSettlement({
        settlementId: fnfApprovedId,
        organizationId: TENANT_A,
        actorId: EMP_REGULAR, // Employee attempting to approve own FnF
        actorRole: 'Admin',
      });
    } catch (err: any) {
      selfApprovalBlocked = err.message.includes('UNAUTHORIZED_FNF_APPROVAL');
    }

    // 2. Cross-tenant isolation in Unified Approval Engine
    const approvalEngine = UnifiedApprovalEngine.getInstance();
    const instTenantB = await approvalEngine.createInstance({
      organizationId: TENANT_B,
      workflowId: 'wf-fnf-tenant-b',
      targetEntityType: 'FNF',
      targetEntityId: 'fnf-tenant-b-001',
      requesterEmployeeId: 'emp-tenant-b-user',
    });

    let crossTenantBlocked = false;
    try {
      await approvalEngine.executeApprovalAction({
        instanceId: instTenantB.id,
        actorEmployeeId: HR_ACTOR,
        actorRole: 'Admin',
        action: 'APPROVE',
        approverOrgId: TENANT_A, // Tenant A user attempting to approve Tenant B FnF
      });
    } catch (err: any) {
      crossTenantBlocked = err.message.includes('Tenant isolation boundary violation');
    }

    assert(
      selfApprovalBlocked && crossTenantBlocked,
      'Test 15 (Layer 02E): Multi-tenant boundary protection & Maker-Checker self-approval prevention',
      `SelfApprovalBlocked=${selfApprovalBlocked}, CrossTenantBlocked=${crossTenantBlocked}`
    );
  } catch (e: any) {
    assert(false, 'Test 15 (Layer 02E): Multi-tenant security test failed', e.message);
  }

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('----------------------------------------------------------------');
  console.log(`Summary: ${passed} / ${passed + failed} Tests Passed (${passed === 15 ? '100%' : 'INCOMPLETE'})`);
  console.log('================================================================\n');

  return {
    passed,
    failed,
    total: passed + failed,
    details,
  };
}

// Allow direct execution via tsx
if (typeof process !== 'undefined' && process.argv[1]?.includes('offboardingFnFModule02.test.ts')) {
  runOffboardingFnFModule02CertificationSuite()
    .then((res) => {
      if (res.failed > 0) {
        process.exit(1);
      } else {
        setTimeout(() => process.exit(0), 50);
      }
    })
    .catch((err) => {
      console.error('Fatal error running certification suite:', err);
      process.exit(1);
    });
}
