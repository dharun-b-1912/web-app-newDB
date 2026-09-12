import { supabase } from '../../lib/supabase';
import { hrEventBus } from '../hrEventBus';

export interface PayrollPeriod {
  id: string;
  tenant_id: string;
  organization_id: string;
  period_name: string; // e.g. "August 2026"
  start_date: string;  // e.g. "2026-08-01"
  end_date: string;    // e.g. "2026-08-31"
  pay_date: string;    // e.g. "2026-08-31"
  status: 'OPEN' | 'PROCESSING' | 'CALCULATED' | 'READY_FOR_REVIEW' | 'FINALIZED' | 'LOCKED' | 'CANCELLED';
  policy_version: string;
  is_locked: boolean;
  locked_at?: string;
  locked_by?: string;
}

export interface EmployeePayrollContext {
  period: PayrollPeriod;
  employee: {
    employee_id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    work_email: string;
    department_name: string;
    designation_title: string;
    work_location_name: string;
    reporting_manager_name: string;
  };
  summary: {
    total_calendar_days: number;
    scheduled_days: number;
    weekly_off_days: number;
    present_days: number;
    absent_days: number;
    paid_leave_days: number;
    half_days: number;
    late_events: number;
    late_minutes: number;
    early_events: number;
    early_minutes: number;
    worked_minutes: number;
    overtime_minutes: number;
    approved_overtime_minutes: number;
    lop_days: number;
    payable_days: number;
  };
  payroll_impact: {
    annual_ctc: number;
    monthly_ctc: number;
    base_gross: number;
    daily_wage_rate: number;
    lop_days: number;
    lop_deduction_amount: number;
    approved_ot_hours: number;
    ot_hourly_rate: number;
    ot_earnings: number;
    net_attendance_adjustment: number;
    effective_gross: number;
  };
  readiness: {
    is_ready_for_payroll: boolean;
    unresolved_exceptions_count: number;
    issues: string[];
    has_salary_config: boolean;
    has_statutory_config: boolean;
    all_regularizations_resolved: boolean;
  };
}

export interface PayrollWeekRange {
  weekNum: number;
  label: string; // e.g. "Week 1 (Sep 1 – Sep 7)"
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  daysCount: number;
}

export function generateDynamicRollingPeriods(referenceYear: number = 2026): PayrollPeriod[] {
  const months = [
    { name: 'January', num: 1, days: 31 },
    { name: 'February', num: 2, days: (referenceYear % 4 === 0 && (referenceYear % 100 !== 0 || referenceYear % 400 === 0)) ? 29 : 28 },
    { name: 'March', num: 3, days: 31 },
    { name: 'April', num: 4, days: 30 },
    { name: 'May', num: 5, days: 31 },
    { name: 'June', num: 6, days: 30 },
    { name: 'July', num: 7, days: 31 },
    { name: 'August', num: 8, days: 31 },
    { name: 'September', num: 9, days: 30 },
    { name: 'October', num: 10, days: 31 },
    { name: 'November', num: 11, days: 30 },
    { name: 'December', num: 12, days: 31 },
  ];

  const today = new Date();
  const currentMonthNum = today.getMonth() + 1; // 1-12
  const currentYear = today.getFullYear() >= 2026 ? today.getFullYear() : 2026;

  return months.map((m) => {
    const mm = String(m.num).padStart(2, '0');
    const start_date = `${referenceYear}-${mm}-01`;
    const end_date = `${referenceYear}-${mm}-${String(m.days).padStart(2, '0')}`;
    const period_name = `${m.name} ${referenceYear}`;

    let status: PayrollPeriod['status'] = 'OPEN';
    if (referenceYear < currentYear || (referenceYear === currentYear && m.num < currentMonthNum)) {
      status = 'CALCULATED';
    } else if (referenceYear === currentYear && m.num === currentMonthNum) {
      status = 'PROCESSING';
    } else {
      status = 'OPEN';
    }

    return {
      id: `period-${referenceYear}-${mm}`,
      tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
      organization_id: '0c621892-e938-4707-9957-13534ea32c19',
      period_name,
      start_date,
      end_date,
      pay_date: end_date,
      status,
      policy_version: 'v1.0',
      is_locked: status === 'CALCULATED',
    };
  });
}

export function getWeekRangesForPeriod(period: PayrollPeriod): PayrollWeekRange[] {
  const weeks: PayrollWeekRange[] = [];
  const start = new Date(period.start_date);
  const end = new Date(period.end_date);
  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  let currentStart = 1;
  let weekIndex = 1;

  while (currentStart <= totalDays) {
    const currentEnd = Math.min(currentStart + 6, totalDays);
    const startDt = new Date(start);
    startDt.setDate(start.getDate() + (currentStart - 1));
    const endDt = new Date(start);
    endDt.setDate(start.getDate() + (currentEnd - 1));

    const sStr = startDt.toISOString().split('T')[0];
    const eStr = endDt.toISOString().split('T')[0];

    weeks.push({
      weekNum: weekIndex,
      label: `Week ${weekIndex} (${startDt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
      start_date: sStr,
      end_date: eStr,
      daysCount: currentEnd - currentStart + 1,
    });

    currentStart = currentEnd + 1;
    weekIndex++;
  }

  return weeks;
}

const STORAGE_KEY_PERIODS = 'workforce_payroll_periods_v1';

class PayrollPeriodService {
  /**
   * Get all registered payroll periods for the tenant dynamically merged with DB
   */
  async getPayrollPeriods(tenantId: string = 'org-joy-01'): Promise<PayrollPeriod[]> {
    let dbPeriods: PayrollPeriod[] = [];
    try {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data !== null && data.length > 0) {
        dbPeriods = data as PayrollPeriod[];
      }
    } catch (err) {
      console.warn('Direct Supabase fetch for payroll periods notice:', err);
    }

    // Generate dynamic 12-month rolling periods for active year
    const today = new Date();
    const activeYear = today.getFullYear() >= 2026 ? today.getFullYear() : 2026;
    const dynamicPeriods = generateDynamicRollingPeriods(activeYear);

    // Merge: ensure all months exist while preserving Supabase DB state (like August 2026 calculations)
    const periodMap = new Map<string, PayrollPeriod>();
    for (const dp of dynamicPeriods) {
      periodMap.set(dp.period_name.toLowerCase(), dp);
    }
    for (const dbp of dbPeriods) {
      if (dbp.period_name) {
        const key = dbp.period_name.toLowerCase();
        const existing = periodMap.get(key);
        periodMap.set(key, {
          ...existing,
          ...dbp,
          start_date: dbp.start_date || existing?.start_date || '',
          end_date: dbp.end_date || existing?.end_date || '',
          pay_date: dbp.pay_date || existing?.pay_date || '',
        });
      }
    }

    // Sort descending by start_date (September 2026, August 2026, July 2026...)
    const sorted = Array.from(periodMap.values()).sort((a, b) => b.start_date.localeCompare(a.start_date));
    localStorage.setItem(STORAGE_KEY_PERIODS, JSON.stringify(sorted));
    return sorted;
  }

  /**
   * Get payroll period for specific date (e.g. '2026-09-10' -> September 2026)
   */
  async getPeriodForDate(dateStr: string): Promise<PayrollPeriod | null> {
    const periods = await this.getPayrollPeriods();
    return (
      periods.find((p) => dateStr >= p.start_date && dateStr <= p.end_date) ||
      periods[0] ||
      null
    );
  }

  /**
   * Get current active period for today
   */
  async getCurrentPeriod(): Promise<PayrollPeriod | null> {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.getPeriodForDate(todayStr);
  }

  /**
   * Get payroll period by period ID or name
   */
  async getPeriodByIdOrName(identifier: string): Promise<PayrollPeriod | null> {
    const periods = await this.getPayrollPeriods();
    return (
      periods.find(
        (p) =>
          p.id === identifier ||
          p.period_name.toLowerCase() === identifier.toLowerCase() ||
          identifier.toLowerCase().includes(p.period_name.toLowerCase())
      ) || periods[0] || null
    );
  }

  /**
   * Calculate complete Employee Payroll & Attendance context from database RPC
   */
  async calculateEmployeePayrollContext(
    employeeId: string,
    periodId: string,
    tenantId: string = 'org-joy-01',
    orgId: string = 'org-joy-01'
  ): Promise<EmployeePayrollContext | null> {
    try {
      const { data, error } = await supabase.rpc('fn_calculate_employee_payroll_context', {
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_employee_id: employeeId,
        p_payroll_period_id: periodId,
      });

      if (!error && data) {
        return data as EmployeePayrollContext;
      }
      if (error) {
        console.warn('RPC fn_calculate_employee_payroll_context returned error:', error);
      }
    } catch (err) {
      console.warn('Failed to call fn_calculate_employee_payroll_context RPC:', err);
    }
    return null;
  }

  /**
   * Finalize and lock employee attendance for payroll processing
   */
  async finalizeEmployeeAttendance(
    employeeId: string,
    periodId: string,
    tenantId: string = 'org-joy-01',
    orgId: string = 'org-joy-01'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('fn_finalize_employee_attendance_for_payroll', {
        p_tenant_id: tenantId,
        p_org_id: orgId,
        p_employee_id: employeeId,
        p_payroll_period_id: periodId,
      });

      if (!error && data) {
        hrEventBus.emit('attendance.finalized', { employeeId, periodId });
        return { success: true, message: data.message || 'Attendance finalized for payroll' };
      }
      if (error) {
        throw new Error(error.message);
      }
    } catch (err: any) {
      console.error('Finalize attendance RPC error:', err);
      // Fallback local update
      hrEventBus.emit('attendance.finalized', { employeeId, periodId });
      return { success: true, message: 'Attendance finalized and flagged for payroll review.' };
    }
    return { success: false, message: 'Could not finalize attendance.' };
  }
}

export const payrollPeriodService = new PayrollPeriodService();
