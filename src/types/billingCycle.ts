// src/types/billingCycle.ts
// ============================================================================
// Joy PeopleHR — Configurable Billing Cycle & Statutory Wage Policy Types
// Enables customizable 26th-25th, calendar month, or custom period billing cycles,
// department/role daily wage rates, Sunday/Week-off OT treatment, and breakup parameters.
// ============================================================================

export type BillingCycleType = 'CUSTOM_DATE_RANGE' | 'CALENDAR_MONTH';
export type WeekOffDay = 'SUNDAY' | 'SATURDAY' | 'CUSTOM';
export type SundayOtPolicy = 'DOUBLE_BASIC_RATE' | 'SINGLE_RATE' | 'COMP_OFF';

export interface BillingCycleConfig {
  id?: string;
  vendorId?: string;
  organizationId?: string;
  companyName?: string;
  clientName?: string;
  siteName?: string;

  // Cycle Schedule
  cycleType: BillingCycleType;
  customStartDay: number; // e.g. 26 (starts 26th of month M-1 to 25th of month M)
  customEndDay: number;   // e.g. 25
  periodMonth: string;    // e.g. "2026-09"
  periodDescription: string; // e.g. "26.08.2026 TO 25.09.2026"
  totalWorkingDaysInCycle: number; // e.g. 25 (or 26, 28, 30)
  weekOffDay: WeekOffDay;
  sundayOtPolicy: SundayOtPolicy;

  // Statutory Wage Breakdown (Must sum to 100% of regular wages)
  basicPercentage: number;   // e.g. 55%
  hraPercentage: number;     // e.g. 45%
  shiftHours: number;        // e.g. 8 hours standard shift
  otMultiplier: number;      // e.g. 2.0 (Double Basic hourly rate: DailyWage * Basic% / 8 * 2)

  // Allowance & Deduction Rules
  otThresholdFA: number;           // OT hours threshold for Food Allowance (4h)
  otThresholdNA: number;           // OT hours threshold for Night/Sunday Allowance (8h)
  foodAllowancePerDay: number;     // e.g. ₹20 per qualifying FA day
  nightAllowancePerDay: number;    // e.g. ₹45 per qualifying NA day
  roomAllowancePerMonth: number;   // e.g. ₹250 per eligible worker
  canteenDeductionPerMeal: number; // e.g. ₹20 per meal deduction

  // Statutory Rates
  pfEmployeePct: number;    // 12% on Basic
  pfEmployerPct: number;    // 13% on Basic
  esiEmployeePct: number;   // 0.75% on ESI Wages (Ceiling to next Rupee)
  esiEmployerPct: number;   // 3.25% on ESI Wages
  esiWagesBasis: 'GROSS_MINUS_HRA' | 'GROSS'; // Standard Joy policy: Gross - HRA

  // Commercial Breakup & Invoice
  serviceChargePct: number; // 6.0% on Gross (configurable e.g. 6% or 8%)
  cgstPct: number;          // 9.0%
  sgstPct: number;          // 9.0%
  sacCode: string;          // 998519
  invoiceNumberFormat: string; // e.g. "206/2026-27"
}

export const DEFAULT_JOY_BILLING_CONFIG: BillingCycleConfig = {
  cycleType: 'CUSTOM_DATE_RANGE',
  customStartDay: 26,
  customEndDay: 25,
  periodMonth: '2026-09',
  periodDescription: '26.08.2026 TO 25.09.2026',
  totalWorkingDaysInCycle: 25,
  weekOffDay: 'SUNDAY',
  sundayOtPolicy: 'DOUBLE_BASIC_RATE',
  basicPercentage: 55,
  hraPercentage: 45,
  shiftHours: 8,
  otMultiplier: 2.0,
  otThresholdFA: 4,
  otThresholdNA: 8,
  foodAllowancePerDay: 20,
  nightAllowancePerDay: 45,
  roomAllowancePerMonth: 250,
  canteenDeductionPerMeal: 20,
  pfEmployeePct: 12,
  pfEmployerPct: 13,
  esiEmployeePct: 0.75,
  esiEmployerPct: 3.25,
  esiWagesBasis: 'GROSS_MINUS_HRA',
  serviceChargePct: 6.0,
  cgstPct: 9.0,
  sgstPct: 9.0,
  sacCode: '998519',
  invoiceNumberFormat: '206/2026-27',
  companyName: 'WATERTEC (INDIA) PRIVATE LIMITED',
  clientName: 'Watertec India Private Limited - Unit - Ill',
  siteName: 'Unit - III',
};
