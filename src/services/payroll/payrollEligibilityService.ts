// src/services/payroll/payrollEligibilityService.ts
// ============================================================================
// Joy PeopleHR — Payroll Eligibility & Pre-Flight Readiness Engine
// Validates Employee Status, Salary Structure, Bank Details & Statutory Prereqs
// Zero Fallback • Actionable Blocking Errors & Warnings
// ============================================================================

import { Employee } from '../../types';
import { EmployeeSalaryAssignment, SalaryStructure } from '../../types/payroll';

export interface EmployeeReadinessIssue {
  code: string;
  field: string;
  message: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  resolutionHint: string;
}

export interface EmployeeEligibilityResult {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  designation: string;
  status: 'READY' | 'WARNING' | 'EXCLUDED';
  isEligible: boolean;
  issues: EmployeeReadinessIssue[];
  salaryStructureId?: string;
  salaryStructureName?: string;
  grossMonthly?: number;
  bankAccountMasked?: string;
}

export interface PayrollReadinessReport {
  periodName: string;
  totalEmployeesDetected: number;
  readyCount: number;
  warningCount: number;
  blockerCount: number;
  canProceedToCalculation: boolean;
  employees: EmployeeEligibilityResult[];
  blockingReasonsSummary: Record<string, number>;
}

export class PayrollEligibilityService {
  /**
   * Evaluates all employees in a tenant against strict payroll readiness prerequisites.
   * Returns a detailed readiness report. Calculation should be blocked if blockerCount > 0.
   */
  public static evaluateReadiness(
    employees: Employee[],
    salaryAssignments: EmployeeSalaryAssignment[],
    salaryStructures: SalaryStructure[],
    periodName: string,
    periodStart: string,
    periodEnd: string
  ): PayrollReadinessReport {
    const results: EmployeeEligibilityResult[] = [];
    const assignmentMap = new Map<string, EmployeeSalaryAssignment>();
    salaryAssignments.forEach(a => assignmentMap.set(a.employee_id, a));

    const structureMap = new Map<string, SalaryStructure>();
    salaryStructures.forEach(s => structureMap.set(s.id, s));

    let readyCount = 0;
    let warningCount = 0;
    let blockerCount = 0;
    const blockingSummary: Record<string, number> = {};

    for (const emp of employees) {
      // Exclude terminated / resigned employees prior to period
      const isExited = emp.status === 'Terminated' || emp.status === 'Exited' || emp.status === 'Resigned';
      const exitDate = emp.employment?.last_working_date || emp.employment?.resignation_date || (emp.employment as any)?.exit_date;
      if (isExited && exitDate && new Date(exitDate) < new Date(periodStart)) {
        continue; // Fully exited before this payroll cycle
      }

      const issues: EmployeeReadinessIssue[] = [];
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || 'Employee';
      const empCode = emp.employee_code || `WF-${emp.id}`;
      const deptName = emp.department_name || 'General';
      const desig = emp.designation_title || 'Staff';

      // 1. Check Employment Status
      if (emp.status === 'Suspended') {
        issues.push({
          code: 'EMP_STATUS_SUSPENDED',
          field: 'status',
          message: `Employee is currently marked as Suspended.`,
          severity: 'WARNING',
          resolutionHint: 'Verify if company suspension policy mandates partial / zero stipend payout.',
        });
      }

      // 2. Check Salary Structure Assignment
      const assignment = assignmentMap.get(emp.id);
      let assignedStructure: SalaryStructure | undefined;

      if (!assignment) {
        issues.push({
          code: 'PAYROLL_MISSING_SALARY_STRUCTURE',
          field: 'salary_structure',
          message: `No active salary structure or CTC assigned to employee.`,
          severity: 'BLOCKER',
          resolutionHint: `Assign an active Salary Structure to ${fullName} (${empCode}) in Salary Management before running payroll.`,
        });
      } else {
        assignedStructure = structureMap.get(assignment.salary_structure_id);
        if (!assignedStructure && !assignment.gross_monthly) {
          issues.push({
            code: 'PAYROLL_INVALID_STRUCTURE_REF',
            field: 'salary_structure_id',
            message: `Assigned structure ID ${assignment.salary_structure_id} not found in active structures.`,
            severity: 'BLOCKER',
            resolutionHint: 'Re-assign an active Salary Structure in Salary Management.',
          });
        }
        if (assignment.gross_monthly <= 0 && assignment.annual_ctc <= 0) {
          issues.push({
            code: 'PAYROLL_ZERO_SALARY',
            field: 'gross_monthly',
            message: `Employee has ₹0 monthly gross and CTC configured.`,
            severity: 'BLOCKER',
            resolutionHint: 'Update employee CTC / monthly gross in Salary Management.',
          });
        }
      }

      // 3. Check Bank Details for Bank Transfer payment mode
      const paymentMode = assignment?.payment_mode || 'BankTransfer';
      const accountNum = assignment?.account_number || emp.bank?.account_number || (emp.employment as any)?.bank_account_no || emp.profile?.statutory_and_bank?.bank_account_masked;
      const ifsc = assignment?.ifsc_code || emp.bank?.ifsc || emp.bank?.ifsc_code || (emp.employment as any)?.bank_ifsc || emp.profile?.statutory_and_bank?.ifsc_code;

      if (paymentMode === 'BankTransfer') {
        if (!accountNum || accountNum.trim().length < 6) {
          issues.push({
            code: 'PAYROLL_MISSING_BANK_ACCOUNT',
            field: 'account_number',
            message: `Missing or invalid bank account number for direct disbursement.`,
            severity: 'BLOCKER',
            resolutionHint: `Update bank account details for ${fullName} in Employee Profile or switch payment mode to Cheque/Cash.`,
          });
        }
        if (!ifsc || ifsc.trim().length < 8) {
          issues.push({
            code: 'PAYROLL_MISSING_BANK_IFSC',
            field: 'ifsc_code',
            message: `Missing or invalid bank IFSC code.`,
            severity: 'BLOCKER',
            resolutionHint: `Provide a valid 11-character RBI IFSC code.`,
          });
        }
      }

      // 4. Statutory Identifier Checks
      const pan = assignment?.pan_number || emp.statutory?.pan || emp.statutory?.pan_number || (emp.profile as any)?.pan_number || emp.profile?.statutory_and_bank?.pan_number_masked;
      if (!pan && (assignment?.annual_ctc || 0) > 300000) {
        issues.push({
          code: 'PAYROLL_MISSING_PAN',
          field: 'pan_number',
          message: `PAN is missing for employee with taxable income potential.`,
          severity: 'WARNING',
          resolutionHint: `Add employee PAN to avoid mandatory higher 20% TDS withholding under Section 206AA.`,
        });
      }

      const uan = assignment?.pf_uan || emp.statutory?.uan || emp.statutory?.uan_number || emp.profile?.statutory_and_bank?.pf_uan;
      const isPfApplicable = assignment?.pf_applicable ?? (emp as any)?.pf_applicable ?? false;
      if (isPfApplicable && (!uan || uan.trim().length < 10)) {
        issues.push({
          code: 'PAYROLL_MISSING_UAN',
          field: 'pf_uan',
          message: `EPF is enabled but 12-digit UAN is missing.`,
          severity: 'WARNING',
          resolutionHint: `Enter EPFO UAN for ECR monthly upload reconciliation.`,
        });
      }

      // 5. Joining Date Proration Notice
      const doj = emp.employment?.doj || (emp.employment as any)?.joining_date;
      if (doj && new Date(doj) > new Date(periodStart) && new Date(doj) <= new Date(periodEnd)) {
        issues.push({
          code: 'PAYROLL_MID_MONTH_JOINER',
          field: 'doj',
          message: `Joined mid-period on ${doj}. Payout will be prorated automatically.`,
          severity: 'INFO',
          resolutionHint: `Standard attendance & calendar divisor proration will apply.`,
        });
      }

      const hasBlocker = issues.some(i => i.severity === 'BLOCKER');
      const hasWarning = issues.some(i => i.severity === 'WARNING');

      let status: 'READY' | 'WARNING' | 'EXCLUDED' = 'READY';
      if (hasBlocker) {
        status = 'EXCLUDED';
        blockerCount++;
        for (const iss of issues.filter(i => i.severity === 'BLOCKER')) {
          blockingSummary[iss.code] = (blockingSummary[iss.code] || 0) + 1;
        }
      } else if (hasWarning) {
        status = 'WARNING';
        warningCount++;
        readyCount++;
      } else {
        status = 'READY';
        readyCount++;
      }

      results.push({
        employeeId: emp.id,
        employeeCode: empCode,
        employeeName: fullName,
        departmentName: deptName,
        designation: desig,
        status,
        isEligible: !hasBlocker,
        issues,
        salaryStructureId: assignment?.salary_structure_id,
        salaryStructureName: assignedStructure?.name || assignment?.salary_structure_name,
        grossMonthly: assignment?.gross_monthly,
        bankAccountMasked: accountNum ? `••••${accountNum.slice(-4)}` : undefined,
      });
    }

    return {
      periodName,
      totalEmployeesDetected: employees.length,
      readyCount,
      warningCount,
      blockerCount,
      canProceedToCalculation: blockerCount === 0 && employees.length > 0,
      employees: results,
      blockingReasonsSummary: blockingSummary,
    };
  }
}
