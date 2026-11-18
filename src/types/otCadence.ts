// src/types/otCadence.ts
// ============================================================================
// JOY PeopleHR — Authoritative Overtime (OT) Multi-Cadence Types
// Day-Wise, Week-Wise, Month-Wise Cadences for Dual-Stream Payroll Architecture
// ============================================================================

export type OTCadenceCadenceType = 'DAY_WISE' | 'WEEK_WISE' | 'MONTH_WISE';

export type OTSettlementStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'REJECTED';

export type OTStreamPolicyMode = 'UNIFIED' | 'SEPARATE_STREAMS';

export interface DayWiseOTRecord {
  id: string;
  organization_id: string;
  company_id?: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  designation?: string;
  date: string; // YYYY-MM-DD
  shift_code: string;
  shift_name: string;
  shift_start: string;
  shift_end: string;
  first_check_in?: string;
  last_check_out?: string;
  work_minutes: number;
  regular_minutes: number;
  overtime_minutes: number;
  overtime_hours: number;
  hourly_rate: number;
  multiplier: number;
  day_ot_amount: number;
  is_weekly_off: boolean;
  is_holiday: boolean;
  settlement_status: OTSettlementStatus;
  settled_in_payroll_run_id?: string;
  settled_at?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface WeekWiseOTEmployeeSummary {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  weekday_ot_hours: number;
  weekend_ot_hours: number;
  holiday_ot_hours: number;
  total_ot_hours: number;
  total_ot_amount: number;
  is_cap_exceeded: boolean; // Flagged if total_ot_hours > statutory threshold (16 hrs/week)
}

export interface WeekWiseOTSummary {
  week_number: number; // 1 to 5
  week_start_date: string; // YYYY-MM-DD
  week_end_date: string;   // YYYY-MM-DD
  total_employees: number;
  total_regular_ot_hours: number;
  total_weekend_ot_hours: number;
  total_holiday_ot_hours: number;
  total_ot_hours: number;
  total_ot_amount: number;
  cap_exceeded_count: number;
  employee_summaries: WeekWiseOTEmployeeSummary[];
}

export interface MonthWiseOTEmployeeSummary {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  designation: string;
  fixed_monthly_salary: number;
  daily_rate: number;
  base_hourly_rate: number;
  effective_ot_rate: number;
  total_ot_days: number;
  total_ot_minutes: number;
  total_ot_hours: number;
  approved_ot_hours: number;
  gross_ot_amount: number;
  esic_ot_deduction: number;
  net_ot_payout: number;
  settlement_status: OTSettlementStatus;
  linked_payroll_run_id?: string;
}

export interface MonthWiseOTSummary {
  month: string; // "October 2026"
  year: number;
  period_start: string;
  period_end: string;
  total_employees: number;
  total_ot_hours: number;
  total_ot_amount: number;
  settled_ot_amount: number;
  pending_ot_amount: number;
  settlement_status: OTSettlementStatus;
  linked_payroll_run_id?: string;
  employee_summaries: MonthWiseOTEmployeeSummary[];
}

export interface TenantOTStreamSettings {
  organization_id: string;
  stream_mode: OTStreamPolicyMode; // 'UNIFIED' or 'SEPARATE_STREAMS'
  ot_disbursal_cadence: 'MONTH_END_SEPARATE' | 'MID_MONTH' | 'BI_WEEKLY' | 'UNIFIED_CYCLE';
  voucher_generation_enabled: boolean;
  pf_applicable_on_ot: boolean; // Default false (statutory basic only)
  auto_lock_punches_on_settlement: boolean;
  updated_at: string;
  updated_by?: string;
}

