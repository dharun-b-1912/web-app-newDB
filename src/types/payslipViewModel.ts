// src/types/payslipViewModel.ts
// ============================================================================
// Joy PeopleHR — Canonical Enterprise Payslip View Model & DTO
// Production A4 Financial Invariant Standard v6.0
// ============================================================================

export interface PayslipComponent {
  code: string;
  label: string;
  rate?: number | null;
  units?: string | number | null;
  amount: number;
  category?: 'BASIC' | 'HRA' | 'DA' | 'OT' | 'ALLOWANCE' | 'BONUS' | 'ARREARS' | 'STATUTORY' | 'RECOVERY' | 'OTHER';
}

export interface PayslipViewModel {
  company: {
    id: string;
    legalName: string;
    displayName: string;
    logoUrl?: string;
    address?: string;
    contact?: string;
    email?: string;
    website?: string;
    gstin?: string;
    pan?: string;
  };

  payroll: {
    payrollPeriod: string;
    periodMonth: string;
    periodYear: number;
    payDate: string;
    periodStart: string;
    periodEnd: string;
    payrollRunId: string;
    calendarWorkingDays: number;
  };

  employee: {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    designation: string;
    department: string;
    workLocation: string;
    clientName?: string;
    dateOfJoining: string;
    panMasked: string;
    uanMasked: string;
    esiMasked: string;
    bankAccountMasked: string;
    bankName: string;
    ifscCode: string;
    paymentMode: string;
  };

  attendance: {
    fixedWorkingDays: number;
    payableDays: number;
    presentDays: number;
    lopDays: number;
    overtimeHours: number;
    paidLeaveDays: number;
  };

  wageRates: {
    dailyRate: number;
    hourlyOtRate: number;
    ratePerDayFormatted: string;
  };

  earnings: PayslipComponent[];
  deductions: PayslipComponent[];

  totals: {
    grossEarnings: number;
    totalDeductions: number;
    netPayable: number;
    netPayableInWords: string;
  };

  audit: {
    sourceGross?: number;
    sourceDeductions?: number;
    sourceNet?: number;
    isReconciled: boolean;
    dataHash: string;
  };

  metadata: {
    currency: 'INR';
    generatedAt: string;
    payslipNumber: string;
    isLocked: boolean;
  };
}

/**
 * Enforces Strict Mathematical Invariants on Payslip Financial Data
 */
export function validatePayslipFinancialInvariants(vm: PayslipViewModel): {
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

  if (Math.abs(roundedGross - roundedSumEarnings) > 0.01) {
    errors.push(
      `PAYSLIP_GROSS_RECONCILIATION_FAILED: Declared Gross (₹${roundedGross}) != Sum of Earnings Components (₹${roundedSumEarnings})`
    );
  }

  if (Math.abs(roundedDeductions - roundedSumDeductions) > 0.01) {
    errors.push(
      `PAYSLIP_DEDUCTION_RECONCILIATION_FAILED: Declared Deductions (₹${roundedDeductions}) != Sum of Deduction Components (₹${roundedSumDeductions})`
    );
  }

  if (Math.abs(roundedNet - expectedNet) > 0.01) {
    errors.push(
      `PAYSLIP_NET_RECONCILIATION_FAILED: Declared Net (₹${roundedNet}) != Gross (₹${roundedGross}) - Deductions (₹${roundedDeductions}) = ₹${expectedNet}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
