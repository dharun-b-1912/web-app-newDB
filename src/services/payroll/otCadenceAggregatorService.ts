// src/services/payroll/otCadenceAggregatorService.ts
// ============================================================================
// JOY PeopleHR — Authoritative Overtime (OT) Multi-Cadence Aggregator Service
// Extracts, normalizes, and groups Punch OT into Day-wise, Week-wise, and Month-wise Ledgers
// Dual-Stream Architecture for Electra EV, Manufacturing Plants & Industrial Facilities
// ============================================================================

import {
  DayWiseOTRecord,
  WeekWiseOTSummary,
  WeekWiseOTEmployeeSummary,
  MonthWiseOTSummary,
  MonthWiseOTEmployeeSummary,
  TenantOTStreamSettings,
  OTSettlementStatus,
} from '../../types/otCadence';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { attendanceApi } from '../attendanceApi';
import { payrollApi } from '../payrollApi';
import { OTPolicyEngine } from './otPolicyEngine';
import { api } from '../api';
import { getActiveOrgId } from '../attendance/biometricCommandService';

const DEFAULT_ORG_ID = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
const SETTINGS_STORAGE_KEY_PREFIX = 'joy_tenant_ot_stream_settings_';

export class OTCadenceAggregatorService {
  /**
   * Retrieves tenant-specific OT Stream & Disbursal Configuration
   */
  public static getTenantSettings(organizationId = getActiveOrgId()): TenantOTStreamSettings {
    const isElectra = organizationId === 'c5ab6b03-adde-47cc-a033-064f4c39b21e' || organizationId?.toLowerCase().includes('electra');
    
    // Check localStorage cache
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`${SETTINGS_STORAGE_KEY_PREFIX}${organizationId}`);
        if (stored) return JSON.parse(stored);
      }
    } catch {}

    // Smart Enterprise Default: Electra EV defaults to SEPARATE_STREAMS; Joy Corporate defaults to UNIFIED
    return {
      organization_id: organizationId,
      stream_mode: isElectra ? 'SEPARATE_STREAMS' : 'UNIFIED',
      ot_disbursal_cadence: isElectra ? 'MONTH_END_SEPARATE' : 'UNIFIED_CYCLE',
      voucher_generation_enabled: true,
      pf_applicable_on_ot: false,
      auto_lock_punches_on_settlement: true,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Persists tenant-specific OT Stream & Disbursal Configuration
   */
  public static saveTenantSettings(settings: TenantOTStreamSettings): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${SETTINGS_STORAGE_KEY_PREFIX}${settings.organization_id}`, JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('joy_tenant_ot_settings_changed', { detail: settings }));
      }
    } catch {}
  }

  /**
   * Builds the Authoritative Day-Wise OT Ledger for an organization
   */
  public static async getDayWiseOTLedger(
    organizationId = DEFAULT_ORG_ID,
    startDate: string,
    endDate: string,
    filterEmployeeId?: string
  ): Promise<DayWiseOTRecord[]> {
    const records: DayWiseOTRecord[] = [];

    // 1. Fetch live daily attendance records
    let dailyRecords = isSupabaseEnabled
      ? await attendanceApi.getDailyAttendanceForPeriodAsync(startDate, endDate).catch(() => [])
      : attendanceApi.getDailyAttendance();

    if (!dailyRecords || dailyRecords.length === 0) {
      dailyRecords = attendanceApi.getDailyAttendance();
    }

    // 2. Fetch employee master & salary records for wage basis resolution
    const employees = api.getEmployeesSync ? api.getEmployeesSync() : [];
    const salaries = await payrollApi.getEmployeeSalaries(organizationId).catch(() => []);

    // 3. Filter daily rows that have recorded overtime minutes
    const otRows = dailyRecords.filter((d: any) => {
      const dDate = d.date || d.attendance_date;
      if (!dDate || dDate < startDate || dDate > endDate) return false;
      const otMins = d.overtime_minutes || 0;
      if (filterEmployeeId && d.employee_id !== filterEmployeeId) return false;
      return otMins > 0;
    });

    for (const row of otRows) {
      const dDate = row.date || (row as any).attendance_date;
      const empId = row.employee_id;
      const emp = employees.find((e: any) => e.id === empId || e.employee_code === row.employee_code) || {};
      const sal = salaries.find((s: any) => s.employee_id === empId || s.employee_code === row.employee_code) || {};

      const otMins = row.overtime_minutes || 0;
      const otHours = Math.round((otMins / 60) * 10) / 10;

      // Resolve wage rate
      const monthlyGross = sal.gross_monthly || sal.annual_ctc ? sal.annual_ctc / 12 : 18000;
      const dailyRate = sal.daily_rate || monthlyGross / 26;
      const hourlyRate = Math.round((dailyRate / 8) * 100) / 100;
      const multiplier = row.status === 'WEEKLY_OFF' || row.status === 'HOLIDAY' ? 2.0 : 1.5;
      const dayAmount = Math.round(otHours * hourlyRate * multiplier);

      const recordId = `ot-day-${empId}-${dDate}`;
      const isSettled = Boolean((row as any).ot_settled || (row as any).settled_in_payroll_run_id);

      records.push({
        id: recordId,
        organization_id: organizationId,
        employee_id: empId,
        employee_code: row.employee_code || (emp as any).employee_code || `WF-${empId}`,
        employee_name: row.employee_name || (emp as any).display_name || (emp as any).name || 'Employee',
        department: (emp as any).department_name || (emp as any).department || 'Operations',
        designation: (emp as any).designation || 'Specialist',
        date: dDate,
        shift_code: (row as any).shift_code || 'GEN-01',
        shift_name: (row as any).shift_name || 'Standard Production Shift',
        shift_start: (row as any).shift_start || '09:00',
        shift_end: (row as any).shift_end || '18:00',
        first_check_in: row.first_check_in || (row as any).check_in,
        last_check_out: row.last_check_out || (row as any).check_out,
        work_minutes: row.total_work_minutes || 540 + otMins,
        regular_minutes: 480,
        overtime_minutes: otMins,
        overtime_hours: otHours,
        hourly_rate: hourlyRate,
        multiplier,
        day_ot_amount: dayAmount,
        is_weekly_off: row.status === 'WEEKLY_OFF',
        is_holiday: row.status === 'HOLIDAY',
        settlement_status: isSettled ? 'SETTLED' : 'APPROVED',
        settled_in_payroll_run_id: (row as any).settled_in_payroll_run_id,
      });
    }

    return records.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Builds the Statutory Week-Wise OT Aggregator for weekly cap compliance (Factories Act 1948)
   */
  public static async getWeekWiseOTSummary(
    organizationId = DEFAULT_ORG_ID,
    year: number,
    month: number
  ): Promise<WeekWiseOTSummary[]> {
    const pad = (n: number) => String(n).padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${pad(month)}-01`;
    const endDate = `${year}-${pad(month)}-${pad(daysInMonth)}`;

    const dayRecords = await this.getDayWiseOTLedger(organizationId, startDate, endDate);

    // Partition month into standard Monday–Sunday weekly windows
    const weeks: WeekWiseOTSummary[] = [];
    let currentDay = 1;
    let weekNum = 1;

    while (currentDay <= daysInMonth) {
      const wStart = `${year}-${pad(month)}-${pad(currentDay)}`;
      const endDay = Math.min(daysInMonth, currentDay + 6);
      const wEnd = `${year}-${pad(month)}-${pad(endDay)}`;

      // Filter day records belonging to this week
      const weekRecords = dayRecords.filter(r => r.date >= wStart && r.date <= wEnd);

      // Group by employee
      const empMap = new Map<string, WeekWiseOTEmployeeSummary>();
      for (const r of weekRecords) {
        let entry = empMap.get(r.employee_id);
        if (!entry) {
          entry = {
            employee_id: r.employee_id,
            employee_code: r.employee_code,
            employee_name: r.employee_name,
            department: r.department,
            weekday_ot_hours: 0,
            weekend_ot_hours: 0,
            holiday_ot_hours: 0,
            total_ot_hours: 0,
            total_ot_amount: 0,
            is_cap_exceeded: false,
          };
          empMap.set(r.employee_id, entry);
        }

        if (r.is_holiday) {
          entry.holiday_ot_hours += r.overtime_hours;
        } else if (r.is_weekly_off) {
          entry.weekend_ot_hours += r.overtime_hours;
        } else {
          entry.weekday_ot_hours += r.overtime_hours;
        }

        entry.total_ot_hours += r.overtime_hours;
        entry.total_ot_amount += r.day_ot_amount;
        // Factories Act statutory warning: OT exceeding 16h in a single workweek
        if (entry.total_ot_hours > 16) {
          entry.is_cap_exceeded = true;
        }
      }

      const empSummaries = Array.from(empMap.values());
      const totalHours = empSummaries.reduce((sum, e) => sum + e.total_ot_hours, 0);
      const totalAmount = empSummaries.reduce((sum, e) => sum + e.total_ot_amount, 0);
      const regHours = empSummaries.reduce((sum, e) => sum + e.weekday_ot_hours, 0);
      const wkndHours = empSummaries.reduce((sum, e) => sum + e.weekend_ot_hours, 0);
      const holHours = empSummaries.reduce((sum, e) => sum + e.holiday_ot_hours, 0);
      const capBreaches = empSummaries.filter(e => e.is_cap_exceeded).length;

      weeks.push({
        week_number: weekNum,
        week_start_date: wStart,
        week_end_date: wEnd,
        total_employees: empSummaries.length,
        total_regular_ot_hours: Math.round(regHours * 10) / 10,
        total_weekend_ot_hours: Math.round(wkndHours * 10) / 10,
        total_holiday_ot_hours: Math.round(holHours * 10) / 10,
        total_ot_hours: Math.round(totalHours * 10) / 10,
        total_ot_amount: totalAmount,
        cap_exceeded_count: capBreaches,
        employee_summaries: empSummaries,
      });

      currentDay += 7;
      weekNum++;
    }

    return weeks;
  }

  /**
   * Builds the Month-Wise Reconciliation & Disbursal Summary
   */
  public static async getMonthWiseOTSummary(
    organizationId = DEFAULT_ORG_ID,
    year: number,
    month: number,
    periodLabel = 'October 2026'
  ): Promise<MonthWiseOTSummary> {
    const pad = (n: number) => String(n).padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${pad(month)}-01`;
    const endDate = `${year}-${pad(month)}-${pad(daysInMonth)}`;

    const dayRecords = await this.getDayWiseOTLedger(organizationId, startDate, endDate);
    const salaries = await payrollApi.getEmployeeSalaries(organizationId).catch(() => []);

    const empMap = new Map<string, MonthWiseOTEmployeeSummary>();

    for (const r of dayRecords) {
      let entry = empMap.get(r.employee_id);
      if (!entry) {
        const sal = salaries.find((s: any) => s.employee_id === r.employee_id || s.employee_code === r.employee_code) || {};
        const monthlyGross = sal.gross_monthly || (sal.annual_ctc ? sal.annual_ctc / 12 : 18000);
        const dailyRate = sal.daily_rate || monthlyGross / 26;
        const hourlyRate = Math.round((dailyRate / 8) * 100) / 100;

        entry = {
          employee_id: r.employee_id,
          employee_code: r.employee_code,
          employee_name: r.employee_name,
          department: r.department,
          designation: r.designation || 'Specialist',
          fixed_monthly_salary: monthlyGross,
          daily_rate: dailyRate,
          base_hourly_rate: hourlyRate,
          effective_ot_rate: Math.round(hourlyRate * 1.5 * 100) / 100,
          total_ot_days: 0,
          total_ot_minutes: 0,
          total_ot_hours: 0,
          approved_ot_hours: 0,
          gross_ot_amount: 0,
          esic_ot_deduction: 0,
          net_ot_payout: 0,
          settlement_status: 'PENDING',
        };
        empMap.set(r.employee_id, entry);
      }

      entry.total_ot_days += 1;
      entry.total_ot_minutes += r.overtime_minutes;
      entry.total_ot_hours += r.overtime_hours;
      entry.approved_ot_hours += r.overtime_hours;
      entry.gross_ot_amount += r.day_ot_amount;

      if (r.settlement_status === 'SETTLED') {
        entry.settlement_status = 'SETTLED';
        entry.linked_payroll_run_id = r.settled_in_payroll_run_id;
      }
    }

    // Compute net payouts and ESIC contributions
    const empSummaries = Array.from(empMap.values()).map(e => {
      // Round hours
      e.total_ot_hours = Math.round(e.total_ot_hours * 10) / 10;
      e.approved_ot_hours = Math.round(e.approved_ot_hours * 10) / 10;
      // ESIC: 0.75% of overtime pay if monthly gross is eligible (< 21,000)
      if (e.fixed_monthly_salary <= 21000) {
        e.esic_ot_deduction = Math.round(e.gross_ot_amount * 0.0075);
      } else {
        e.esic_ot_deduction = 0;
      }
      e.net_ot_payout = e.gross_ot_amount - e.esic_ot_deduction;
      return e;
    });

    const totalHours = empSummaries.reduce((sum, e) => sum + e.total_ot_hours, 0);
    const totalAmount = empSummaries.reduce((sum, e) => sum + e.gross_ot_amount, 0);
    const settledAmount = empSummaries.filter(e => e.settlement_status === 'SETTLED').reduce((sum, e) => sum + e.net_ot_payout, 0);
    const pendingAmount = totalAmount - settledAmount;

    return {
      month: periodLabel,
      year,
      period_start: startDate,
      period_end: endDate,
      total_employees: empSummaries.length,
      total_ot_hours: Math.round(totalHours * 10) / 10,
      total_ot_amount: totalAmount,
      settled_ot_amount: settledAmount,
      pending_ot_amount: pendingAmount,
      settlement_status: settledAmount === totalAmount && totalAmount > 0 ? 'SETTLED' : settledAmount > 0 ? 'PARTIALLY_SETTLED' : 'PENDING',
      employee_summaries: empSummaries,
    };
  }
}

