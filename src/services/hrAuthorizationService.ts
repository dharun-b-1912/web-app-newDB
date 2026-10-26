import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { realtimeChannelManager } from './realtime/realtimeChannelManager';

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
  organization_id?: string;
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
  private inMemoryCache: EmployeeHrAuthorization[] = [];
  private isSubscribed = false;

  constructor() {
    this.initRealtime();
    // Eagerly sync from DB
    if (typeof window !== 'undefined') {
      this.syncFromSupabase();
    }
  }

  private initRealtime() {
    if (!isSupabaseEnabled || this.isSubscribed) return;
    try {
      this.isSubscribed = true;
      realtimeChannelManager.subscribeToTable('hr_authorizations', () => {
        this.syncFromSupabase();
      });
    } catch (err) {
      console.warn('[HrAuthService] Realtime subscription notice:', err);
    }
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
            id: String(row.id),
            tenant_id: row.organization_id || '',
            organization_id: row.organization_id || '',
            company_id: row.company_id || '',
            employee_id: row.employee_id || '',
            employee_name: row.employee_name || '',
            employee_code: row.employee_code || '',
            work_email: row.work_email || '',
            department: row.department || '',
            designation: row.designation || '',
            preset_name: row.preset_name || 'CUSTOM',
            is_active: row.is_active ?? true,
            module_permissions: typeof row.module_permissions === 'string'
              ? JSON.parse(row.module_permissions)
              : (row.module_permissions || {}),
            granted_by: row.granted_by || 'Administrator',
            updated_at: row.updated_at || new Date().toISOString(),
          }));

          this.inMemoryCache = mapped;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('hr-authorizations:updated', { detail: mapped }));
          }
          return mapped;
        }
      } catch (err) {
        console.warn('[HrAuthService] Supabase sync notice:', err);
      }
    }
    return this.inMemoryCache;
  }

  getAuthorizationsForCompany(companyId?: string, organizationId?: string): EmployeeHrAuthorization[] {
    if (!companyId && !organizationId) {
      return [...this.inMemoryCache];
    }
    return this.inMemoryCache.filter(a => {
      if (companyId && a.company_id && a.company_id === companyId) return true;
      if (organizationId && a.tenant_id && a.tenant_id === organizationId) return true;
      // If neither explicitly matches or records have no company set, return if tenant matches
      return !companyId && !organizationId;
    });
  }

  getAuthorizationByEmail(workEmail: string, companyId?: string): EmployeeHrAuthorization | undefined {
    const cleanEmail = workEmail.trim().toLowerCase();
    return this.inMemoryCache.find(
      a =>
        a.work_email.trim().toLowerCase() === cleanEmail &&
        (!companyId || !a.company_id || a.company_id === companyId)
    );
  }

  async saveAuthorization(
    data: Omit<EmployeeHrAuthorization, 'id' | 'updated_at'>
  ): Promise<EmployeeHrAuthorization> {
    const timestamp = new Date().toISOString();

    const dbPayload = {
      organization_id: data.organization_id || data.tenant_id,
      company_id: data.company_id || null,
      employee_id: data.employee_id || null,
      employee_name: data.employee_name,
      employee_code: data.employee_code,
      work_email: data.work_email.trim().toLowerCase(),
      department: data.department,
      designation: data.designation,
      preset_name: data.preset_name,
      is_active: data.is_active,
      module_permissions: data.module_permissions,
      granted_by: data.granted_by,
      updated_at: timestamp,
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('hr_authorizations')
          .upsert(dbPayload, { onConflict: 'organization_id,work_email' })
          .select()
          .single();

        if (error) {
          console.error('[HrAuthService] Database upsert error:', error);
          throw error;
        }

        if (inserted) {
          const record: EmployeeHrAuthorization = {
            id: String(inserted.id),
            tenant_id: inserted.organization_id,
            organization_id: inserted.organization_id,
            company_id: inserted.company_id || '',
            employee_id: inserted.employee_id || '',
            employee_name: inserted.employee_name,
            employee_code: inserted.employee_code,
            work_email: inserted.work_email,
            department: inserted.department,
            designation: inserted.designation,
            preset_name: inserted.preset_name,
            is_active: inserted.is_active,
            module_permissions: typeof inserted.module_permissions === 'string'
              ? JSON.parse(inserted.module_permissions)
              : inserted.module_permissions,
            granted_by: inserted.granted_by,
            updated_at: inserted.updated_at,
          };

          await this.syncFromSupabase();
          return record;
        }
      } catch (err) {
        console.warn('[HrAuthService] Supabase SQL upsert notice:', err);
      }
    }

    // Fallback in-memory representation
    const record: EmployeeHrAuthorization = {
      ...data,
      id: `auth-${Date.now()}`,
      updated_at: timestamp,
    };
    const idx = this.inMemoryCache.findIndex(a => a.work_email.toLowerCase() === data.work_email.toLowerCase());
    if (idx >= 0) {
      this.inMemoryCache[idx] = record;
    } else {
      this.inMemoryCache.unshift(record);
    }
    return record;
  }

  async deleteAuthorization(id: string): Promise<boolean> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase
          .from('hr_authorizations')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[HrAuthService] Database delete error:', error);
          return false;
        }

        await this.syncFromSupabase();
        return true;
      } catch (err) {
        console.warn('[HrAuthService] Supabase SQL delete notice:', err);
      }
    }

    this.inMemoryCache = this.inMemoryCache.filter(a => a.id !== id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hr-authorizations:updated', { detail: this.inMemoryCache }));
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
