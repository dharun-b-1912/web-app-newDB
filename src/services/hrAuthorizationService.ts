import { supabase, isSupabaseEnabled } from '../lib/supabase';

export type HrOperationalModule =
  | 'attendance'
  | 'leave'
  | 'people'
  | 'work_overtime'
  | 'payroll_claims'
  | 'helpdesk_communication';

export interface ModuleActionPermissions {
  can_view: boolean;
  can_approve: boolean;
  can_edit: boolean;
  can_export: boolean;
}

export type RolePresetKey =
  | 'JUNIOR_HR'
  | 'ATTENDANCE_ADMIN'
  | 'LEAVE_ADMIN'
  | 'ONBOARDING_SPECIALIST'
  | 'PAYROLL_SPECIALIST'
  | 'FULL_HR_HEAD'
  | 'CUSTOM';

export interface EmployeeHrAuthorization {
  id: string;
  tenant_id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  work_email: string;
  department: string;
  designation: string;
  preset_name: RolePresetKey;
  is_active: boolean;
  module_permissions: Record<HrOperationalModule, ModuleActionPermissions>;
  granted_by: string;
  updated_at: string;
}

export const MODULE_DESCRIPTIONS: Record<
  HrOperationalModule,
  { label: string; description: string; submodules: string[] }
> = {
  attendance: {
    label: 'Attendance & Regularization Desk',
    description: 'Daily Attendance Matrix, Attendance History, Regularization Desk, Late/Early Tracking, Exceptions Queue, Biometric Logs',
    submodules: [
      'attendance',
      'attendance-employees',
      'history',
      'regularization',
      'exceptions',
      'late-early',
      'biometric',
      'face-attendance',
      'gps',
    ],
  },
  leave: {
    label: 'Leave Management & Approvals',
    description: 'Leave Dashboard, Calendar, Balances & Ledger, Requests, Approvals, Comp-Off Desk, Holidays',
    submodules: [
      'leave',
      'leave-dashboard',
      'leave-calendar',
      'leave-balance',
      'leave-requests',
      'leave-approval',
      'leave-compoff',
      'leave-holidays',
    ],
  },
  people: {
    label: 'People & Core HR Operations',
    description: 'Employee Directory, Profile Edit, Documents & E-Sign, Asset Management, Onboarding Engine, Offboarding & Exit',
    submodules: [
      'people',
      'organization',
      'documents',
      'assets',
      'onboarding',
      'offboarding',
    ],
  },
  work_overtime: {
    label: 'Work & Overtime Operations',
    description: 'Overtime Engine, Overtime Requests, WFH Desk, Breaks & Work Hours',
    submodules: [
      'overtime',
      'overtime-requests',
      'wfh',
      'breaks-workhours',
    ],
  },
  payroll_claims: {
    label: 'Payroll Inputs & Expense Claims',
    description: 'Expense Claims Desk, Digital Payslips, Salary Structures & Deductions',
    submodules: [
      'payroll-claims',
      'payroll-documents',
      'payroll-salary',
      'payroll-dashboard',
    ],
  },
  helpdesk_communication: {
    label: 'HR Helpdesk & Communication',
    description: 'HR Helpdesk Tickets, Communication Hub, Employee Service Requests',
    submodules: [
      'helpdesk',
      'other-communication',
      'requests',
    ],
  },
};

export const ROLE_PRESET_CONFIGS: Record<
  RolePresetKey,
  { label: string; description: string; permissions: Record<HrOperationalModule, ModuleActionPermissions> }
> = {
  JUNIOR_HR: {
    label: 'Junior HR / HR Executive',
    description: 'Operational access for daily attendance tracking, leave requests, employee records and helpdesk tickets with view/approve capabilities.',
    permissions: {
      attendance: { can_view: true, can_approve: true, can_edit: false, can_export: true },
      leave: { can_view: true, can_approve: true, can_edit: false, can_export: true },
      people: { can_view: true, can_approve: false, can_edit: true, can_export: false },
      work_overtime: { can_view: true, can_approve: true, can_edit: false, can_export: false },
      payroll_claims: { can_view: true, can_approve: false, can_edit: false, can_export: false },
      helpdesk_communication: { can_view: true, can_approve: true, can_edit: true, can_export: false },
    },
  },
  ATTENDANCE_ADMIN: {
    label: 'Attendance Administrator',
    description: 'Dedicated shift, roster, regularization, biometric and exception administrator.',
    permissions: {
      attendance: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      leave: { can_view: true, can_approve: false, can_edit: false, can_export: false },
      people: { can_view: true, can_approve: false, can_edit: false, can_export: false },
      work_overtime: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      payroll_claims: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      helpdesk_communication: { can_view: false, can_approve: false, can_edit: false, can_export: false },
    },
  },
  LEAVE_ADMIN: {
    label: 'Leave Administrator',
    description: 'Manages leave ledger, balance adjustments, comp-off grants, holidays and leave approvals.',
    permissions: {
      attendance: { can_view: true, can_approve: false, can_edit: false, can_export: false },
      leave: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      people: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      work_overtime: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      payroll_claims: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      helpdesk_communication: { can_view: true, can_approve: false, can_edit: false, can_export: false },
    },
  },
  ONBOARDING_SPECIALIST: {
    label: 'Onboarding & Document Specialist',
    description: 'Manages candidate onboarding engine, statutory verification, e-sign documents, and asset allocation.',
    permissions: {
      attendance: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      leave: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      people: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      work_overtime: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      payroll_claims: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      helpdesk_communication: { can_view: true, can_approve: true, can_edit: true, can_export: false },
    },
  },
  PAYROLL_SPECIALIST: {
    label: 'Payroll & Claims Executive',
    description: 'Manages expense claim verifications, payslips, deductions, and salary master configurations.',
    permissions: {
      attendance: { can_view: true, can_approve: false, can_edit: false, can_export: true },
      leave: { can_view: true, can_approve: false, can_edit: false, can_export: true },
      people: { can_view: true, can_approve: false, can_edit: false, can_export: false },
      work_overtime: { can_view: true, can_approve: false, can_edit: false, can_export: true },
      payroll_claims: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      helpdesk_communication: { can_view: false, can_approve: false, can_edit: false, can_export: false },
    },
  },
  FULL_HR_HEAD: {
    label: 'Full HR Head / Director',
    description: 'Unrestricted operational authority across all workforce modules with export and configuration capabilities.',
    permissions: {
      attendance: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      leave: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      people: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      work_overtime: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      payroll_claims: { can_view: true, can_approve: true, can_edit: true, can_export: true },
      helpdesk_communication: { can_view: true, can_approve: true, can_edit: true, can_export: true },
    },
  },
  CUSTOM: {
    label: 'Custom Tailored Scope',
    description: 'Custom combination of functional modules and action capabilities tailored for a specific work profile.',
    permissions: {
      attendance: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      leave: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      people: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      work_overtime: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      payroll_claims: { can_view: false, can_approve: false, can_edit: false, can_export: false },
      helpdesk_communication: { can_view: false, can_approve: false, can_edit: false, can_export: false },
    },
  },
};

class HrAuthorizationService {
  private STORAGE_KEY = 'workforce_hr_authorizations_sql_v2';
  private realtimeChannel: any = null;

  constructor() {
    // Clear legacy mock data cache if present
    try {
      localStorage.removeItem('workforce_hr_authorizations_v1');
    } catch {}

    this.initRealtime();
  }

  private initRealtime() {
    if (!isSupabaseEnabled || !supabase) return;
    try {
      this.realtimeChannel = supabase
        .channel('hr_authorizations_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hr_authorizations' },
          () => {
            this.syncFromSupabase();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[HrAuthService] Realtime subscription notice:', err);
    }
  }

  private loadLocal(): EmployeeHrAuthorization[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }

  private saveLocal(data: EmployeeHrAuthorization[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('hr-authorizations:updated'));
    } catch {}
  }

  async syncFromSupabase(): Promise<EmployeeHrAuthorization[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('hr_authorizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped: EmployeeHrAuthorization[] = data.map((row: any) => ({
            id: row.id,
            tenant_id: row.tenant_id || 'default-tenant',
            company_id: row.company_id || 'comp-joy-01',
            employee_id: row.employee_id,
            employee_name: row.employee_name,
            employee_code: row.employee_code,
            work_email: row.work_email,
            department: row.department,
            designation: row.designation,
            preset_name: row.preset_name || 'CUSTOM',
            is_active: row.is_active ?? true,
            module_permissions: typeof row.module_permissions === 'string'
              ? JSON.parse(row.module_permissions)
              : row.module_permissions,
            granted_by: row.granted_by,
            updated_at: row.updated_at || new Date().toISOString(),
          }));

          this.saveLocal(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[HrAuthService] Supabase sync notice:', err);
      }
    }
    return this.loadLocal();
  }

  getAuthorizationsForCompany(companyId: string): EmployeeHrAuthorization[] {
    const all = this.loadLocal();
    return all.filter(a => a.company_id === companyId || a.company_id === 'comp-joy-01');
  }

  getAuthorizationByEmail(workEmail: string, companyId?: string): EmployeeHrAuthorization | undefined {
    const all = this.loadLocal();
    const cleanEmail = workEmail.trim().toLowerCase();
    return all.find(
      a =>
        a.work_email.trim().toLowerCase() === cleanEmail &&
        (!companyId || a.company_id === companyId || a.company_id === 'comp-joy-01')
    );
  }

  async saveAuthorization(
    data: Omit<EmployeeHrAuthorization, 'id' | 'updated_at'>
  ): Promise<EmployeeHrAuthorization> {
    const all = this.loadLocal();
    const existingIdx = all.findIndex(
      a => a.work_email.trim().toLowerCase() === data.work_email.trim().toLowerCase()
    );

    const recordId = existingIdx >= 0 ? all[existingIdx].id : `auth-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const record: EmployeeHrAuthorization = {
      ...data,
      id: recordId,
      updated_at: timestamp,
    };

    if (existingIdx >= 0) {
      all[existingIdx] = record;
    } else {
      all.unshift(record);
    }

    this.saveLocal(all);

    // Persist to Supabase SQL Database
    if (isSupabaseEnabled && supabase) {
      try {
        await supabase.from('hr_authorizations').upsert({
          id: record.id,
          tenant_id: record.tenant_id,
          company_id: record.company_id,
          employee_id: record.employee_id,
          employee_name: record.employee_name,
          employee_code: record.employee_code,
          work_email: record.work_email,
          department: record.department,
          designation: record.designation,
          preset_name: record.preset_name,
          is_active: record.is_active,
          module_permissions: record.module_permissions,
          granted_by: record.granted_by,
          updated_at: timestamp,
        });
      } catch (err) {
        console.warn('[HrAuthService] Supabase SQL upsert notice:', err);
      }
    }

    return record;
  }

  async deleteAuthorization(id: string): Promise<boolean> {
    const all = this.loadLocal();
    const filtered = all.filter(a => a.id !== id);
    if (filtered.length === all.length) return false;
    this.saveLocal(filtered);

    // Remove from Supabase SQL Database
    if (isSupabaseEnabled && supabase) {
      try {
        await supabase.from('hr_authorizations').delete().eq('id', id);
      } catch (err) {
        console.warn('[HrAuthService] Supabase SQL delete notice:', err);
      }
    }

    return true;
  }

  canEmployeeAccessModule(workEmail: string, moduleId: string): boolean {
    const auth = this.getAuthorizationByEmail(workEmail);
    if (!auth || !auth.is_active) return false;

    for (const [modKey, config] of Object.entries(MODULE_DESCRIPTIONS)) {
      if (config.submodules.includes(moduleId) || modKey === moduleId) {
        const perms = auth.module_permissions[modKey as HrOperationalModule];
        return perms ? perms.can_view : false;
      }
    }
    return false;
  }
}

export const hrAuthorizationService = new HrAuthorizationService();
