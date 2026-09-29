// src/types/payrollPolicy.ts
// ============================================================================
// Joy PeopleHR — Payroll Policy & Versioned Snapshot Type System
// Authoritative, multi-tenant, versioned payroll policy architecture
// ============================================================================

import { WageBasis } from './wageEngine';

export type PolicyStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';

// ---------------------------------------------------------------------------
// WAGE RULES (Base & Rate Splitting)
// ---------------------------------------------------------------------------
export interface WageSplitRule {
  componentCode: string;
  componentName: string;
  percentageOfBase: number; // e.g. 55 for Basic, 45 for HRA, or 56/10/4/15/6/9
  rounding: 'ROUND' | 'CEIL' | 'FLOOR' | 'EXACT';
  decimalPlaces: number;
}

export interface WagePolicyRules {
  salaryBasis: 'DAILY_RATE' | 'MONTHLY_FIXED' | 'HOURLY';
  standardWorkingHoursPerDay: number; // typically 8
  standardMonthDays: number; // 26 or 30 or actual calendar days
  baseWageSplitRules: WageSplitRule[]; // e.g. Basic 55% + HRA 45% = 100%
  minWagesComplianceCheck: boolean;
  minDailyWageThreshold?: number;
}

// ---------------------------------------------------------------------------
// OVERTIME RULES
// ---------------------------------------------------------------------------
export interface OTPolicyRules {
  enabled: boolean;
  rateMultiplier: number; // 1.0 = single rate, 2.0 = double statutory rate
  hourlyRateFormula: 'DAILY_RATE_DIV_8' | 'BASIC_DIV_26_DIV_8' | 'FIXED_HOURLY';
  customHourlyRate?: number;
  minOtThresholdMinutes: number; // e.g. 30 mins to qualify
  roundOtToQuarterHour: boolean;
  requiresManagerApproval: boolean;
}

// ---------------------------------------------------------------------------
// ALLOWANCE RULES (Food, Night, Attendance Bonus, etc.)
// ---------------------------------------------------------------------------
export interface FoodAllowanceRule {
  enabled: boolean;
  ratePerDay: number; // e.g. ₹50/day
  eligibilityBasis: 'PRESENT_DAYS' | 'WORKED_HOURS' | 'MIN_6_HOURS';
  excludeWeeklyOff: boolean;
  excludeHolidays: boolean;
}

export interface NightAllowanceRule {
  enabled: boolean;
  ratePerShift: number; // e.g. ₹100/shift
  shiftCodes: string[]; // e.g. ['C', 'NIGHT', 'III']
}

export interface AttendanceBonusRule {
  enabled: boolean;
  amount: number; // e.g. ₹500
  minPresentDays: number; // e.g. 25 or 27
  maxAllowedLOP: number; // 0
  maxAllowedLateCount: number; // 0
}

export interface EarningRules {
  foodAllowance?: FoodAllowanceRule;
  nightAllowance?: NightAllowanceRule;
  attendanceBonus?: AttendanceBonusRule;
  customAllowances?: Array<{
    code: string;
    name: string;
    basis: WageBasis;
    rate: number;
    enabled: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// STATUTORY RULES (Independent Employee vs Employer PF/ESI & PT/LWF)
// ---------------------------------------------------------------------------
export interface StatutoryPfRule {
  enabled: boolean;
  employeeRate: number; // 0.12 (12%)
  employerRate: number; // 0.13 (12% EPF + 0.5% admin + 0.5% EDLI = 13%)
  wageCeiling: number; // ₹15,000 statutory cap
  basis: 'BASIC_ONLY' | 'BASIC_PLUS_DA' | 'GROSS_LESS_HRA';
  applyWageCeilingToEmployee: boolean;
  applyWageCeilingToEmployer: boolean;
}

export interface StatutoryEsiRule {
  enabled: boolean;
  employeeRate: number; // 0.0075 (0.75%)
  employerRate: number; // 0.0325 (3.25%)
  grossWageLimit: number; // ₹21,000 threshold (disables ESI if exceeded)
  basis: 'GROSS_EARNINGS';
}

export interface StatutoryPtRule {
  enabled: boolean;
  stateCode: 'TN' | 'KA' | 'MH' | 'DL' | 'OTHER';
  slabTable: Array<{
    minMonthlyGross: number;
    maxMonthlyGross: number;
    taxAmount: number;
  }>;
}

export interface StatutoryLwfRule {
  enabled: boolean;
  employeeAmount: number; // e.g. ₹10
  employerAmount: number; // e.g. ₹20
  deductionMonthInterval: number; // 1 = monthly, 6 = half-yearly, 12 = annual (December)
}

export interface StatutoryRules {
  pf: StatutoryPfRule;
  esi: StatutoryEsiRule;
  pt: StatutoryPtRule;
  lwf: StatutoryLwfRule;
}

// ---------------------------------------------------------------------------
// DEDUCTION RULES (Canteen, Rent, Advance, etc.)
// ---------------------------------------------------------------------------
export interface DeductionRules {
  canteenRecoveryEnabled: boolean;
  accommodationRentEnabled: boolean;
  salaryAdvanceRecoveryEnabled: boolean;
  uniformShoeRecoveryEnabled: boolean;
  maxDeductionCapPercentageOfGross?: number; // e.g. 50% statutory maximum under Payment of Wages Act
}

// ---------------------------------------------------------------------------
// BILLING & SERVICE CHARGE RULES
// ---------------------------------------------------------------------------
export interface BillingRules {
  serviceChargePercentage: number; // e.g. 8.0%
  serviceChargeBasis: 'WAGES_PLUS_OT' | 'GROSS' | 'CTC';
  taxInvoiceSacCode: string; // e.g. "998519"
  categoryOfService: string; // e.g. "Other Employment and Labour Supply Services"
  gstEnabled: boolean;
  sgstRate: number; // 0.09 (9%)
  cgstRate: number; // 0.09 (9%)
  igstRate: number; // 0.18 (18%)
  reverseChargeApplicable: boolean;
}

// ---------------------------------------------------------------------------
// CANONICAL PAYROLL POLICY OBJECT
// ---------------------------------------------------------------------------
export interface PayrollPolicy {
  policyId: string;
  policyName: string;
  vendorId?: string;
  clientId?: string;
  siteId?: string;
  contractId?: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null;
  version: string; // e.g. 'V2.1-SEP2026'
  status: PolicyStatus;
  description: string;

  wageRules: WagePolicyRules;
  otRules: OTPolicyRules;
  earningRules: EarningRules;
  deductionRules: DeductionRules;
  statutoryRules: StatutoryRules;
  billingRules: BillingRules;

  exportTemplateId: string; // e.g. 'TMPL_JOY_MANPOWER_SEP26' or 'TMPL_BULL_PLANT1'
  createdAt: string;
  updatedAt: string;
  lockedAt?: string;
  lockedBy?: string;
}

// ---------------------------------------------------------------------------
// IMMUTABLE POLICY SNAPSHOT
// ---------------------------------------------------------------------------
export interface PayrollPolicySnapshot {
  snapshotId: string;
  policyId: string;
  policyVersion: string;
  policyHash: string;
  capturedAt: string;
  policyData: PayrollPolicy;
}
