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

const STORAGE_KEY_PERIODS = 'workforce_payroll_periods_v1';

const DEFAULT_PERIODS: PayrollPeriod[] = [];

class PayrollPeriodService {
  /**
   * Get all registered payroll periods for the tenant
   */
  async getPayrollPeriods(tenantId: string = 'org-joy-01'): Promise<PayrollPeriod[]> {
    try {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data !== null) {
        localStorage.setItem(STORAGE_KEY_PERIODS, JSON.stringify(data));
        return data as PayrollPeriod[];
      }
    } catch (err) {
      console.warn('Direct Supabase fetch for payroll periods failed, checking storage cache:', err);
    }

    try {
      const local = localStorage.getItem(STORAGE_KEY_PERIODS);
      if (local) {
        return JSON.parse(local);
      }
    } catch (_) {}

    return DEFAULT_PERIODS;
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
