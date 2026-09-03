// src/services/operations/dailyWagePayrollEngine.ts
// ============================================================================
// Joy PeopleHR — Daily Wage & Flexible Wage Payroll Engine
// Supports: DAILY_WAGE, HOURLY, PIECE_RATE, MONTHLY
// ============================================================================

import { supabase } from '../../lib/supabase';

export interface DailyWageCalculationInput {
  employeeId: string;
  employeeName: string;
  dailyRate: number; // e.g. 800
  presentDays: number; // e.g. 24
  halfDays: number; // e.g. 2
  paidHolidays: number; // e.g. 2
  otHours: number; // e.g. 10
  otHourlyRate?: number; // default dailyRate / 8
  deductions?: number;
}

export interface DailyWageCalculationResult {
  totalBillableDays: number;
  baseWageAmount: number;
  otHourlyRate: number;
  otAmount: number;
  grossWage: number;
  deductions: number;
  netWage: number;
}

class DailyWagePayrollEngine {
  /**
   * Calculates gross and net wages for daily wage and contract workers
   */
  calculateDailyWage(input: DailyWageCalculationInput): DailyWageCalculationResult {
    const totalBillableDays = input.presentDays + input.halfDays * 0.5 + input.paidHolidays;
    const baseWageAmount = totalBillableDays * input.dailyRate;

    const otHourlyRate = input.otHourlyRate || Number((input.dailyRate / 8).toFixed(2));
    const otAmount = Number((input.otHours * otHourlyRate * 1.5).toFixed(2));

    const grossWage = Number((baseWageAmount + otAmount).toFixed(2));
    const deductions = input.deductions || 0;
    const netWage = Number((grossWage - deductions).toFixed(2));

    return {
      totalBillableDays: Number(totalBillableDays.toFixed(1)),
      baseWageAmount: Number(baseWageAmount.toFixed(2)),
      otHourlyRate,
      otAmount,
      grossWage,
      deductions,
      netWage,
    };
  }

  /**
   * Generates or saves a daily wage payroll batch entry
   */
  async recordDailyWageEntry(params: {
    organizationId: string;
    payrollPeriodId: string;
    input: DailyWageCalculationInput;
  }) {
    const calc = this.calculateDailyWage(params.input);

    const { data, error } = await supabase
      .from('daily_wage_payroll_entries')
      .upsert({
        organization_id: params.organizationId,
        payroll_period_id: params.payrollPeriodId,
        employee_id: params.input.employeeId,
        employee_name: params.input.employeeName,
        salary_basis: 'DAILY_WAGE',
        daily_rate: params.input.dailyRate,
        present_days: params.input.presentDays,
        half_days: params.input.halfDays,
        paid_holidays: params.input.paidHolidays,
        total_billable_days: calc.totalBillableDays,
        base_wage_amount: calc.baseWageAmount,
        ot_hours: params.input.otHours,
        ot_amount: calc.otAmount,
        gross_wage: calc.grossWage,
        deductions: calc.deductions,
        net_wage: calc.netWage,
        status: 'DRAFT',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const dailyWagePayrollEngine = new DailyWagePayrollEngine();
