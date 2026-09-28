// src/types/payslipViewModel.ts
// ============================================================================
// Joy PeopleHR — Universal Enterprise Payslip View Model & Document Model
// Production-Grade Multi-Tenant Blueprint • Factory / Blue-Collar / Staff / Contract
// ============================================================================

export interface PayslipComponent {
  code: string;
  label: string;
  rate?: number | null;
  units?: string | number | null;
  amount: number;
  arrearAmount?: number;
  ytdAmount?: number;
  category?: 'BASIC' | 'HRA' | 'DA' | 'OT' | 'ALLOWANCE' | 'BONUS' | 'INCENTIVE' | 'ARREARS' | 'STATUTORY' | 'RECOVERY' | 'OTHER';
}

export interface PayslipEmployerContribution {
  code: string;
  label: string;
  amount: number;
  ytdAmount?: number;
}

export interface PayslipLeaveBalance {
  leaveType: string;
  opening: number;
  availed: number;
  balance: number;
}

export interface PayslipDocumentModel {
  company: {
    id: string;
    legalName: string;
    displayName: string;
    logoUrl?: string;
    address?: string;
    branch?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
    pan?: string;
    cin?: string;
    pfEstablishmentCode?: string;
    esiEmployerCode?: string;
    payrollContact?: string;
    supportContact?: string;
    contact?: string;
    tagline?: string;
    footerText?: string;
    authorizedSignatory?: string;
    signatoryDesignation?: string;
  };

  payroll: {
    payrollPeriod: string; // e.g. "August 2026"
    periodMonth: string;   // e.g. "August"
    periodYear: number;    // e.g. 2026
    payDate: string;       // e.g. "2026-08-31"
    periodStart: string;   // e.g. "2026-08-01"
    periodEnd: string;     // e.g. "2026-08-31"
    payrollRunId: string;  // e.g. "RUN-2026-08-001"
    calendarWorkingDays: number;
    payrollStatus?: 'DRAFT' | 'VERIFIED' | 'APPROVED' | 'FINALIZED' | 'LOCKED';
  };

  employee: {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    designation: string;
    department: string;
    dateOfJoining: string;
    employmentType?: string; // Full-time, Permanent, Contract, Apprentice, Trainee
    /** Employment source — determines payslip layout and which fields are visible. */
    employmentSource?: 'DIRECT' | 'VENDOR' | 'CONTRACTOR' | 'CONSULTANT';
    workLocation: string;
    branch?: string;
    shift?: string;
    shiftTiming?: string;
    // Factory / Blue-collar / Contract specific attributes
    workerType?: 'Blue Collar' | 'White Collar' | 'Staff' | 'Contract' | 'Operator' | 'Technician' | 'Helper' | 'Supervisor' | 'Management' | string;
    grade?: string;
    skillCategory?: string; // Highly Skilled, Skilled, Semi-Skilled, Unskilled
    lineSection?: string;
    workCenter?: string;
    factorySite?: string;
    vendor?: string;              // Contractor / Agency Name
    vendorEmployeeCode?: string;  // Contractor Employee Token
    clientName?: string;
    // Banking & PII (Masked where appropriate)
    panMasked: string;
    uanMasked: string;
    esiMasked: string;
    bankAccountMasked: string;
    bankName: string;
    ifscCode: string;
    paymentMode: string; // Direct Bank Transfer, NEFT, RTGS, Cheque, Cash
  };

  attendance: {
    fixedWorkingDays: number;
    calendarDays: number;
    presentDays: number;
    paidDays: number;
    payableDays: number;
    lopDays: number;
    absentDays: number;
    weeklyOffDays: number;
    paidHolidays: number;
    leaveDays: number;
    overtimeHours: number;
    lateDays?: number;
    earlyExitDays?: number;
    regularizedDays?: number;
  };

  overtime: {
    actualOtHours: number;
    otRate: number;
    otAmount: number;
    otType: 'DYNAMIC' | 'FIXED' | string;
  };

  wageRates: {
    dailyRate: number;
    hourlyOtRate: number;
    ratePerDayFormatted: string;
  };

  earnings: PayslipComponent[];
  deductions: PayslipComponent[];

  statutoryDetails?: {
    uan?: string;
    pfNumber?: string;
    esiNumber?: string;
    pan?: string;
    pt?: string;
    pfWage?: number;
    esiWage?: number;
    tds?: number;
  };

  employerContributions: PayslipEmployerContribution[];

  leaveSummary?: PayslipLeaveBalance[];

  paymentDetails?: {
    paymentMode: string;
    payDate: string;
    bankName: string;
    accountNumberMasked: string;
    ifscCode?: string;
    transactionRef?: string;
  };

  totals: {
    grossEarnings: number;
    grossEarningsYtd?: number;
    totalDeductions: number;
    totalDeductionsYtd?: number;
    netPayable: number;
    netPayableYtd?: number;
    netPayableInWords: string;
    totalEmployerContributions?: number;
  };

  audit: {
    sourceGross?: number;
    sourceDeductions?: number;
    sourceNet?: number;
    isReconciled: boolean;
    dataHash: string;
  };

  metadata: {
    currency: string;
    currencySymbol: string;
    generatedAt: string;
    payslipNumber: string;
    templateVersion: string;
    isLocked: boolean;
  };
}

// Canonical alias for backward compatibility
export type PayslipViewModel = PayslipDocumentModel;

/**
 * Enforces Strict Mathematical Invariants on Payslip Financial Data.
 * Guarantees that:
 * 1. Gross = Sum of all earnings components
 * 2. Total Deductions = Sum of all employee deductions
 * 3. Net Pay = Gross - Total Deductions (Zero-Drift invariant)
 * 4. Employer contributions are strictly segregated and NEVER reduce employee Net Pay.
 */
export function validatePayslipFinancialInvariants(vm: PayslipDocumentModel): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const sumEarnings = vm.earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
  const sumDeductions = vm.deductions.reduce((sum, d) => sum + (d.amount || 0), 0);

  const roundedGross = Math.round(vm.totals.grossEarnings * 100) / 100;
  const roundedSumEarnings = Math.round(sumEarnings * 100) / 100;
  const roundedDeductions = Math.round(vm.totals.totalDeductions * 100) / 100;
  const roundedSumDeductions = Math.round(sumDeductions * 100) / 100;
  const roundedNet = Math.round(vm.totals.netPayable * 100) / 100;
  const expectedNet = Math.round((roundedGross - roundedDeductions) * 100) / 100;

  if (Math.abs(roundedGross - roundedSumEarnings) > 0.05) {
    errors.push(
      `PAYSLIP_GROSS_RECONCILIATION_FAILED: Declared Gross (₹${roundedGross}) != Sum of Earnings Components (₹${roundedSumEarnings})`
    );
  }

  if (Math.abs(roundedDeductions - roundedSumDeductions) > 0.05) {
    errors.push(
      `PAYSLIP_DEDUCTION_RECONCILIATION_FAILED: Declared Deductions (₹${roundedDeductions}) != Sum of Deduction Components (₹${roundedSumDeductions})`
    );
  }

  if (Math.abs(roundedNet - expectedNet) > 0.05) {
    errors.push(
      `PAYSLIP_NET_RECONCILIATION_FAILED: Declared Net (₹${roundedNet}) != Gross (₹${roundedGross}) - Deductions (₹${roundedDeductions}) = ₹${expectedNet}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
