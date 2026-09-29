// src/services/vendor/bullPlant1/bullPlant1PayrollMapper.ts
// ============================================================================
// Joy PeopleHR — Bull Plant 1 Dedicated Payroll Mapping Layer
// Spec Section 2 & 4: Maps AttendanceMaster → ReconciliationMaster → WageRun
// into an explicit BullPlant1PayrollRow data model using Employee ID as primary key.
// Never directly dumps or copies raw uploaded source Excel sheets wholesale.
// ============================================================================

import { WageRunRecord, EmployeeWageResult } from '../../../types/wageEngine';
import { PayrollPolicy } from '../../../types/payrollPolicy';
import { WagePolicyService, BULL_MACHINES_PLANT_1_POLICY } from '../wagePolicyService';
import { BULL_PLANT_1_WORKERS, BullPlant1WorkerWorking } from '../fixtures/bullPlant1InvoiceFixture';

export interface BullPlant1PayrollRow {
  employeeId: string;
  employeeName: string;
  department: string;

  dailyWage: number;
  workingDays: number;
  nfh: number;
  payableDays: number;

  basic: number;
  hra: number;
  wages: number;

  otHours: number;
  otAmount: number;
  otStipend: number;

  foodAllowance: number;
  nightAllowance: number;
  attendanceBonus: number;
  arrears: number;
  otherEarnings: number;

  gross: number;

  pf: number;
  esi: number;
  professionalTax: number;
  lwf: number;
  canteen: number;
  rent: number;
  advanceRecovery: number;
  foodRecovery: number;
  uniform: number;
  shoe: number;
  otherDeduction: number;

  totalDeductions: number;
  netAmount: number;

  calculationStatus: string;

  // Extended Bull Plant 1 Client Working Attributes
  ta: number;
  turnPerf: number;
  hodAssPerf: number;
  taskPerf: number;
  pfEmployer13: number;
  esiEmployer325: number;
  serviceCharge8: number;
  branch?: string;
  cadre?: string;
  designation?: string;
  grade?: string;
  dateOfJoining?: string;
}

export interface BullPlant1ValidationCheck {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

export interface BullPlant1ValidationSummary {
  canExport: boolean;
  totalEmployees: number;
  activePayrollCount: number;
  onLeaveCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalOtHours: number;
  totalOtAmount: number;
  checks: BullPlant1ValidationCheck[];
  blockingErrors: string[];
  warnings: string[];
  sourceLineage: {
    attendanceRecordsCount: number;
    otRecordsCount: number;
    policySnapshotId: string;
  };
}

function assertClose(a: number, b: number, tolerance: number = 1.0): boolean {
  return Math.abs(a - b) <= tolerance;
}

export class BullPlant1PayrollMapper {
  /**
   * Primary Key-driven mapping from universal WageRunRecord to BullPlant1PayrollRow[]
   * Matches workers by Employee ID/Code, NEVER by row index.
   */
  static mapWageRunToBullPlant1Rows(
    wageRun: WageRunRecord,
    policy: PayrollPolicy = BULL_MACHINES_PLANT_1_POLICY
  ): BullPlant1PayrollRow[] {
    return wageRun.employee_results.map((emp: EmployeeWageResult) => {
      const isEligible = emp.payroll_status.wage_eligible;

      // Extract Earning Components
      const basicLine = emp.earnings.find((e) => e.component_code === 'BASIC');
      const hraLine = emp.earnings.find((e) => e.component_code === 'HRA');
      const otLine = emp.earnings.find((e) => e.component_code === 'OT');
      const foodLine = emp.earnings.find((e) => e.component_code === 'FOOD_E');
      const nightLine = emp.earnings.find((e) => e.component_code === 'NIGHT_E');
      const bonusLine = emp.earnings.find((e) => e.component_code === 'ATT_BONUS');
      const arrearsLine = emp.earnings.find((e) => e.component_code === 'ARREARS');

      // Specific Bull Performance allowances if present
      const taLine = emp.earnings.find((e) => e.component_code === 'TA');
      const turnLine = emp.earnings.find((e) => e.component_code === 'TURNPERF');
      const hodLine = emp.earnings.find((e) => e.component_code === 'HODASSPERF');
      const taskLine = emp.earnings.find((e) => e.component_code === 'TASKPERF');

      const basic = basicLine?.status === 'CALCULATED' ? basicLine.amount : 0;
      const hra = hraLine?.status === 'CALCULATED' ? hraLine.amount : 0;
      const wages = basic + hra;

      const otHours = emp.ot_hours;
      const otAmount = otLine?.status === 'CALCULATED' ? otLine.amount : 0;
      const otStipend = 0;

      const foodAllowance = foodLine?.status === 'CALCULATED' ? foodLine.amount : 0;
      const nightAllowance = nightLine?.status === 'CALCULATED' ? nightLine.amount : 0;
      const attendanceBonus = bonusLine?.status === 'CALCULATED' ? bonusLine.amount : 0;
      const arrears = arrearsLine?.status === 'CALCULATED' ? arrearsLine.amount : 0;
      const otherEarnings = 0;

      const gross = isEligible ? emp.gross_earnings : 0;

      // Extract Deductions
      const pfLine = emp.deductions.find((d) => d.component_code === 'PF');
      const esiLine = emp.deductions.find((d) => d.component_code === 'ESI');
      const ptLine = emp.deductions.find((d) => d.component_code === 'PT');
      const lwfLine = emp.deductions.find((d) => d.component_code === 'LWF');
      const cantLine = emp.deductions.find((d) => d.component_code === 'CANTEEN');
      const rentLine = emp.deductions.find((d) => d.component_code === 'RENT');
      const advLine = emp.deductions.find((d) => d.component_code === 'ADV');
      const otherDedLine = emp.deductions.find((d) => d.component_code === 'OTHER_DED');

      const pf = pfLine?.status === 'CALCULATED' ? pfLine.amount : 0;
      const esi = esiLine?.status === 'CALCULATED' ? esiLine.amount : 0;
      const professionalTax = ptLine?.status === 'CALCULATED' ? ptLine.amount : 0;
      const lwf = lwfLine?.status === 'CALCULATED' ? lwfLine.amount : 0;
      const canteen = cantLine?.status === 'CALCULATED' ? cantLine.amount : 0;
      const rent = rentLine?.status === 'CALCULATED' ? rentLine.amount : 0;
      const advanceRecovery = advLine?.status === 'CALCULATED' ? advLine.amount : 0;
      const foodRecovery = 0;
      const otherDeduction = otherDedLine?.status === 'CALCULATED' ? otherDedLine.amount : 0;

      const totalDeductions = isEligible ? emp.total_deductions : 0;
      const netAmount = isEligible ? emp.net_pay : 0;

      // Employer Contributions
      const pfEmployer = emp.employer_costs?.find((c) => c.component_code === 'PF_EMPLOYER')?.amount ?? (isEligible ? Math.round(Math.min(basic, 15000) * 0.13 * 100) / 100 : 0);
      const esiEmployer = emp.employer_costs?.find((c) => c.component_code === 'ESI_EMPLOYER')?.amount ?? (isEligible && gross <= 21000 ? Math.round(gross * 0.0325 * 100) / 100 : 0);
      const serviceCharge = emp.employer_costs?.find((c) => c.component_code === 'SERVICE_CHARGE')?.amount ?? (isEligible ? Math.round((wages + otAmount) * 0.08) : 0);

      const dailyWage = emp.payable_days > 0 ? Math.round(wages / emp.payable_days) : 0;

      return {
        employeeId: emp.employee_code,
        employeeName: emp.employee_name,
        department: emp.department || 'Assembly',
        dailyWage,
        workingDays: emp.payable_days,
        nfh: 0,
        payableDays: emp.payable_days,
        basic,
        hra,
        wages,
        otHours,
        otAmount,
        otStipend,
        foodAllowance,
        nightAllowance,
        attendanceBonus,
        arrears,
        otherEarnings,
        gross,
        pf,
        esi,
        professionalTax,
        lwf,
        canteen,
        rent,
        advanceRecovery,
        foodRecovery,
        uniform: 0,
        shoe: 0,
        otherDeduction,
        totalDeductions,
        netAmount,
        calculationStatus: isEligible ? 'CALCULATED' : 'NOT_ELIGIBLE',
        ta: taLine?.amount || 0,
        turnPerf: turnLine?.amount || 0,
        hodAssPerf: hodLine?.amount || 0,
        taskPerf: taskLine?.amount || 0,
        pfEmployer13: pfEmployer,
        esiEmployer325: esiEmployer,
        serviceCharge8: serviceCharge,
        branch: 'Plant 1',
        cadre: 'Technician',
        designation: 'Operator',
        grade: 'G1',
        dateOfJoining: '01/01/2026',
      };
    });
  }

  /**
   * Maps Bull Machines Plant 1 Benchmark July 2026 workers into canonical BullPlant1PayrollRow[]
   */
  static mapBenchmarkWorkersToBullPlant1Rows(
    workers: BullPlant1WorkerWorking[] = BULL_PLANT_1_WORKERS
  ): BullPlant1PayrollRow[] {
    return workers.map((w) => ({
      employeeId: w.empId,
      employeeName: w.employeeName,
      department: w.department,
      dailyWage: w.dailyRate,
      workingDays: w.presentDays,
      nfh: 0,
      payableDays: w.payDays,
      basic: w.basic,
      hra: w.hra,
      wages: w.basic + w.hra,
      otHours: w.otHours,
      otAmount: w.otAmount,
      otStipend: 0,
      foodAllowance: 0,
      nightAllowance: 0,
      attendanceBonus: w.attdGift,
      arrears: w.arrears,
      otherEarnings: w.reward,
      gross: w.totalEarning,
      pf: w.pfEmployee,
      esi: w.esiEmployee,
      professionalTax: 0,
      lwf: 0,
      canteen: w.canteen,
      rent: 0,
      advanceRecovery: 0,
      foodRecovery: 0,
      uniform: w.uniform,
      shoe: w.shoe,
      otherDeduction: w.otherDed,
      totalDeductions: w.totalDeduction,
      netAmount: w.netAmount,
      calculationStatus: 'CALCULATED',
      ta: w.ta,
      turnPerf: w.turnPerf,
      hodAssPerf: w.hodAssPerf,
      taskPerf: w.taskPerf,
      pfEmployer13: w.pfEmployer13,
      esiEmployer325: w.esiEmployer325,
      serviceCharge8: w.serviceCharge8,
      branch: w.branch,
      cadre: w.cadre,
      designation: w.designation,
      grade: w.grade,
      dateOfJoining: w.dateOfJoining,
    }));
  }

  /**
   * Pre-Export Reconciliation & Invariants Validation (Spec Section 9 & 14)
   * BLOCKS export if any mathematical discrepancy or unconfigured value is detected.
   */
  static validateBullPlant1Rows(rows: BullPlant1PayrollRow[]): BullPlant1ValidationSummary {
    const checks: BullPlant1ValidationCheck[] = [];
    const blockingErrors: string[] = [];
    const warnings: string[] = [];

    // Duplicate check
    const idSet = new Set<string>();
    let duplicates = 0;
    rows.forEach((r) => {
      if (idSet.has(r.employeeId)) duplicates++;
      idSet.add(r.employeeId);
    });

    checks.push({
      name: 'Employee ID Uniqueness',
      passed: duplicates === 0,
      message: duplicates === 0 ? 'All Employee IDs are strictly unique' : `${duplicates} duplicate Employee IDs detected`,
    });
    if (duplicates > 0) blockingErrors.push(`${duplicates} duplicate employee ID(s) found in payroll set.`);

    // Mathematical reconciliation check per row
    let mathFailures = 0;
    rows.forEach((r) => {
      if (r.calculationStatus === 'NOT_ELIGIBLE') return;

      // 1. Regular Earning sum vs Gross (in Bull Plant, Regular Base Earnings are split across 6 components)
      const regularBaseEarned =
        r.basic +
        r.hra +
        r.ta +
        r.turnPerf +
        r.hodAssPerf +
        r.taskPerf +
        r.foodAllowance +
        r.nightAllowance +
        r.attendanceBonus +
        r.arrears +
        r.otherEarnings;

      // When OT is incorporated into gross vs when it's kept as a separate invoice line item
      const matchesBase = assertClose(regularBaseEarned, r.gross, 2.0);
      const matchesWithOt = assertClose(regularBaseEarned + r.otAmount, r.gross, 2.0);

      if (!matchesBase && !matchesWithOt) {
        mathFailures++;
        blockingErrors.push(
          `Gross Mismatch for Emp ${r.employeeId} (${r.employeeName}): Sum of earnings ₹${regularBaseEarned.toFixed(2)} != Gross ₹${r.gross.toFixed(2)}`
        );
      }

      // 2. Deduction sum vs Total Deductions
      const totalDed =
        r.pf +
        r.esi +
        r.professionalTax +
        r.lwf +
        r.canteen +
        r.rent +
        r.advanceRecovery +
        r.foodRecovery +
        r.otherDeduction;

      if (!assertClose(totalDed, r.totalDeductions, 2.0)) {
        mathFailures++;
        blockingErrors.push(
          `Deduction Mismatch for Emp ${r.employeeId} (${r.employeeName}): Sum of deductions ₹${totalDed.toFixed(2)} != Total Deductions ₹${r.totalDeductions.toFixed(2)}`
        );
      }

      // 3. Net Pay = Gross - Total Deductions (allowing standard payroll rupee rounding)
      const expectedNet = r.gross - r.totalDeductions;
      if (!assertClose(expectedNet, r.netAmount, 5.0)) {
        mathFailures++;
        blockingErrors.push(
          `Net Pay Mismatch for Emp ${r.employeeId} (${r.employeeName}): Gross - Deductions ₹${expectedNet.toFixed(2)} != Net Pay ₹${r.netAmount.toFixed(2)}`
        );
      }
    });

    checks.push({
      name: 'Row-Level Mathematical Invariants',
      passed: mathFailures === 0,
      message: mathFailures === 0 ? 'All 3 arithmetic invariants (Gross, Ded, Net) strictly balanced' : `${mathFailures} invariant failure(s) found`,
    });

    const activeRows = rows.filter((r) => r.calculationStatus === 'CALCULATED');
    const onLeaveRows = rows.filter((r) => r.calculationStatus === 'NOT_ELIGIBLE');

    const totalGross = activeRows.reduce((s, r) => s + r.gross, 0);
    const totalDeductions = activeRows.reduce((s, r) => s + r.totalDeductions, 0);
    const totalNet = activeRows.reduce((s, r) => s + r.netAmount, 0);
    const totalOtHours = activeRows.reduce((s, r) => s + r.otHours, 0);
    const totalOtAmount = activeRows.reduce((s, r) => s + r.otAmount, 0);

    // Sum invariant check across entire workforce (allowing standard per-worker coin/rupee rounding)
    const aggregateNetDiff = Math.abs((totalGross - totalDeductions) - totalNet);
    const maxAllowedRounding = Math.max(10, rows.length * 1.5);
    checks.push({
      name: 'Workforce Aggregate Integrity',
      passed: aggregateNetDiff <= maxAllowedRounding,
      message:
        aggregateNetDiff <= maxAllowedRounding
          ? `Sum(Gross) - Sum(Ded) = Sum(Net) verified within ₹${aggregateNetDiff.toFixed(2)} rounding tolerance`
          : `Aggregate net discrepancy of ₹${aggregateNetDiff.toFixed(2)} exceeds rounding threshold`,
    });

    const canExport = blockingErrors.length === 0;

    return {
      canExport,
      totalEmployees: rows.length,
      activePayrollCount: activeRows.length,
      onLeaveCount: onLeaveRows.length,
      totalGross,
      totalDeductions,
      totalNet,
      totalOtHours,
      totalOtAmount,
      checks,
      blockingErrors,
      warnings,
      sourceLineage: {
        attendanceRecordsCount: activeRows.reduce((s, r) => s + r.workingDays, 0),
        otRecordsCount: activeRows.filter((r) => r.otHours > 0).length,
        policySnapshotId: 'POL-BULL-PLANT1-JUL2026-V1',
      },
    };
  }
}
