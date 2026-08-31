import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { hrEventBus } from '../hrEventBus';

export interface EmployeeServiceConfig {
  id: string;
  tenant_id: string;
  organization_id: string;
  service_id: string;
  service_name: string;
  subtitle: string;
  icon_name: string;
  is_enabled: boolean;
  is_visible_to_employee: boolean;
  allowed_roles: string[];
  workflow_type: string;
  badge_type: string;
  sort_order: number;
}

const DEFAULT_SERVICES: EmployeeServiceConfig[] = [
  {
    id: 'cfg-roster',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    service_id: 'roster',
    service_name: 'Shift Roster',
    subtitle: 'Weekly schedule',
    icon_name: 'square_grid_2x2',
    is_enabled: true,
    is_visible_to_employee: true,
    allowed_roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
    workflow_type: 'STANDARD',
    badge_type: 'NONE',
    sort_order: 1,
  },
  {
    id: 'cfg-payslip',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    service_id: 'payslip',
    service_name: 'Payslips & Form 16',
    subtitle: 'Salary statements',
    icon_name: 'doc_text',
    is_enabled: true,
    is_visible_to_employee: true,
    allowed_roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
    workflow_type: 'STANDARD',
    badge_type: 'NONE',
    sort_order: 2,
  },
  {
    id: 'cfg-expense',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    service_id: 'expense',
    service_name: 'Expense Claims',
    subtitle: 'Reimbursements',
    icon_name: 'money_dollar_circle',
    is_enabled: true,
    is_visible_to_employee: true,
    allowed_roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
    workflow_type: 'APPROVAL_CHAIN',
    badge_type: 'PENDING_COUNT',
    sort_order: 3,
  },
  {
    id: 'cfg-letters',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    service_id: 'letters',
    service_name: 'Digital Letters',
    subtitle: 'HR & Offer letters',
    icon_name: 'rosette',
    is_enabled: true,
    is_visible_to_employee: true,
    allowed_roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
    workflow_type: 'ACKNOWLEDGMENT',
    badge_type: 'ACTION_REQUIRED',
    sort_order: 4,
  },
  {
    id: 'cfg-docs',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    service_id: 'docs',
    service_name: 'Documents',
    subtitle: 'Company & Personal',
    icon_name: 'folder',
    is_enabled: true,
    is_visible_to_employee: true,
    allowed_roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
    workflow_type: 'VERIFICATION',
    badge_type: 'ACTION_REQUIRED',
    sort_order: 5,
  },
  {
    id: 'cfg-okrs',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    service_id: 'okrs',
    service_name: 'Performance & Goals',
    subtitle: 'Quarterly OKRs',
    icon_name: 'scope',
    is_enabled: true,
    is_visible_to_employee: true,
    allowed_roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
    workflow_type: 'REVIEW_CYCLE',
    badge_type: 'NONE',
    sort_order: 6,
  },
  {
    id: 'cfg-announcements',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    service_id: 'announcements',
    service_name: 'Communication',
    subtitle: 'Company Broadcasts',
    icon_name: 'speaker_2',
    is_enabled: true,
    is_visible_to_employee: true,
    allowed_roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
    workflow_type: 'BROADCAST',
    badge_type: 'UNREAD_COUNT',
    sort_order: 7,
  },
  {
    id: 'cfg-complaint',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    service_id: 'complaint',
    service_name: 'Grievance / Complaint',
    subtitle: 'HR Support tickets',
    icon_name: 'exclamationmark_triangle',
    is_enabled: true,
    is_visible_to_employee: true,
    allowed_roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'],
    workflow_type: 'CONFIDENTIAL_TICKET',
    badge_type: 'STATUS_UPDATE',
    sort_order: 8,
  },
];

const STORAGE_KEY_SERVICES = 'workforceos_employee_service_configs_v1';

class EmployeeServiceConfigService {
  private memoryCache: EmployeeServiceConfig[] = [];

  private getStorageKey(tenantId = getActiveOrgId()): string {
    return `${STORAGE_KEY_SERVICES}_${tenantId}`;
  }

  private loadLocalStore(tenantId = getActiveOrgId()): EmployeeServiceConfig[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(tenantId));
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return DEFAULT_SERVICES;
  }

  private saveLocalStore(items: EmployeeServiceConfig[], tenantId = getActiveOrgId()): void {
    try {
      localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(items));
    } catch (_) {}
  }

  public async fetchServiceConfigs(tenantId = getActiveOrgId()): Promise<EmployeeServiceConfig[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('employee_service_configs')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('sort_order', { ascending: true });

        if (!error && data !== null) {
          this.memoryCache = data;
          this.saveLocalStore(data, tenantId);
          return data;
        }
      } catch (err) {
        console.warn('[EmployeeServiceConfig] DB fetch notice:', err);
      }
    }

    const local = this.loadLocalStore(tenantId);
    this.memoryCache = local;
    return local;
  }

  public async toggleService(serviceId: string, isEnabled: boolean, tenantId = getActiveOrgId()): Promise<void> {
    const list = this.memoryCache.length > 0 ? this.memoryCache : this.loadLocalStore(tenantId);
    const updated = list.map((s) => (s.service_id === serviceId ? { ...s, is_enabled: isEnabled } : s));
    this.memoryCache = updated;
    this.saveLocalStore(updated, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('employee_service_configs')
          .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('service_id', serviceId);

        // Broadcast outbox event for Flutter Realtime
        await supabase.from('realtime_outbox').insert({
          tenant_id: tenantId,
          entity_type: 'employee_service_configs',
          entity_id: serviceId,
          action: 'UPDATE',
          payload: { service_id: serviceId, is_enabled: isEnabled },
        });
      } catch (err) {
        console.warn('[EmployeeServiceConfig] DB update notice:', err);
      }
    }

    hrEventBus.publish('service_config.updated' as any, { serviceId, isEnabled });
  }
}

export const employeeServiceConfigService = new EmployeeServiceConfigService();
