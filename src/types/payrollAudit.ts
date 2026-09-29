// src/types/payrollAudit.ts
// ============================================================================
// Joy PeopleHR — Payroll Audit, Controlled Deductions & Lineage Types
// Prevents unvetted deduction entries and provides line-by-line lineage
// ============================================================================

export type ControlledDeductionCategory =
  | 'CANTEEN'
  | 'ACCOMMODATION_RENT'
  | 'UNIFORM'
  | 'SAFETY_SHOE'
  | 'SALARY_ADVANCE'
  | 'FOOD_RECOVERY'
  | 'TOOL_EQUIPMENT_LOSS'
  | 'ADMINISTRATIVE_FINE'
  | 'MARRIAGE_WELFARE'
  | 'OTHER_GOVERNED_DEDUCTION';

export interface ControlledDeductionRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  category: ControlledDeductionCategory;
  amount: number;
  reason: string;
  referenceNumber: string; // e.g. "UNIFORM-SEP-20385" or "CANT-2026-09-012"
  source: 'BIOMETRIC_CANTEEN' | 'HR_WELFARE_LEDGER' | 'ADVANCE_REGISTER' | 'MANUAL_AUTHORIZED';
  enteredBy: string;
  approvedBy: string;
  supportingDocRef?: string;
  effectivePeriod: string; // "2026-09"
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'DISPUTED' | 'WAIVED';
}

export interface PayDaysBreakdownPayload {
  calendarDays: number;
  presentDays: number;
  weeklyOffDays: number;
  nfhDays: number;
  lopDays: number;
  approvedLeaveDays: number;
  payableDays: number;
  source: string;
  employeeCode: string;
  periodLabel: string;
}

export interface GrossBreakdownPayload {
  basic: number;
  hra: number;
  wages: number;
  ot: number;
  otStipend: number;
  foodAllowance: number;
  nightAllowance: number;
  attendanceBonus: number;
  arrears: number;
  gross: number;
  earningsComponents: Array<{ code: string; name: string; amount: number; formula: string }>;
}

export interface NetPayBreakdownPayload {
  grossEarnings: number;
  employeeDeductions: Array<{ code: string; name: string; amount: number }>;
  totalDeductions: number;
  netPay: number;
  auditTrail: string[];
}
