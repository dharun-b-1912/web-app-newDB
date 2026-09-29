// src/types/payrollValidation.ts
// ============================================================================
// Joy PeopleHR — Payroll Reconciliation & Invariant Validation Types
// Enforces mathematical reconciliation: Basic + HRA = Wages, Earnings = Gross,
// Gross - Deductions = Net, and Cross-Sheet Aggregates
// ============================================================================

export interface EmployeeValidationReport {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  passed: boolean;

  // Invariant checks
  basicPlusHraEqualsWages: boolean;
  baseWageVariance: number; // should be 0.00
  
  earningsSumEqualsGross: boolean;
  grossVariance: number;

  deductionsSumEqualsTotal: boolean;
  deductionVariance: number;

  netPayReconciled: boolean;
  netPayVariance: number; // Gross - TotalDeductions - NetPay (should be 0.00)

  // Status & exceptions
  blockingErrors: string[];
  warnings: string[];
}

export interface PayrollRunValidationSummary {
  runId: string;
  evaluatedAt: string;
  allInvariantsSatisfied: boolean;
  canExport: boolean;

  // Aggregate reconciliations
  payrollGrossMatchesSumOfEmployees: boolean;
  grossVariance: number;

  payrollNetMatchesSumOfEmployees: boolean;
  netVariance: number;

  totalOtMatchesOtMatrixReport: boolean;
  otHoursVariance: number;
  otAmountVariance: number;

  contractedRosterCountReconciled: boolean;
  expectedContractedCount: number; // 44
  actualContractedCount: number;
  
  payableCountReconciled: boolean;
  expectedPayableCount: number; // 43
  actualPayableCount: number;

  excludedCountReconciled: boolean;
  expectedExcludedCount: number; // 1 (Prakash R)
  actualExcludedCount: number;

  // Counts
  totalPassedEmployees: number;
  totalFailedEmployees: number;
  blockingErrorCount: number;
  warningCount: number;

  // Granular logs
  blockingErrors: string[];
  warnings: string[];
  passedChecks: string[];
  employeeReports: EmployeeValidationReport[];
}
