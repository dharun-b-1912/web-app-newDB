import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { hrEventBus } from '../hrEventBus';

export interface EmployeeGrievance {
  id: string;
  ticket_number: string;
  tenant_id: string;
  organization_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  category: string; // WORKPLACE, MANAGER, PAYROLL, ATTENDANCE, LEAVE, HARASSMENT, FACILITIES, OTHER
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  subject: string;
  description: string;
  attachment_url?: string;
  is_anonymous: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'RESOLVED' | 'CLOSED' | 'REJECTED';
  assigned_hr_id?: string;
  assigned_hr_name?: string;
  hr_notes?: string; // Confidential
  resolution_summary?: string;
  submitted_at: string;
  resolved_at?: string;
}

const STORAGE_KEY_GRIEVANCES = 'workforceos_employee_grievances_v1';

class GrievanceService {
  private memoryCache: EmployeeGrievance[] = [];

  private getStorageKey(tenantId = getActiveOrgId()): string {
    return `${STORAGE_KEY_GRIEVANCES}_${tenantId}`;
  }

  private loadLocalStore(tenantId = getActiveOrgId()): EmployeeGrievance[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(tenantId));
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  private saveLocalStore(items: EmployeeGrievance[], tenantId = getActiveOrgId()): void {
    try {
      localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(items));
    } catch (_) {}
  }

  public async fetchGrievances(tenantId = getActiveOrgId()): Promise<EmployeeGrievance[]> {
    if (isSupabaseEnabled) {
      try {
        const { data } = await supabase
          .from('employee_grievances')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('submitted_at', { ascending: false });

        if (data && data.length > 0) {
          this.memoryCache = data;
          this.saveLocalStore(data, tenantId);
          return data;
        }
      } catch (err) {
        console.warn('[GrievanceService] DB query notice:', err);
      }
    }
    const local = this.loadLocalStore(tenantId);
    this.memoryCache = local;
    return local;
  }

  public async updateGrievanceStatus(
    grievanceId: string,
    status: EmployeeGrievance['status'],
    resolutionSummary?: string,
    hrNotes?: string,
    tenantId = getActiveOrgId()
  ): Promise<void> {
    const list = this.memoryCache.length > 0 ? this.memoryCache : this.loadLocalStore(tenantId);
    const updated = list.map((g) =>
      g.id === grievanceId
        ? {
            ...g,
            status,
            resolution_summary: resolutionSummary || g.resolution_summary,
            hr_notes: hrNotes || g.hr_notes,
            resolved_at: status === 'RESOLVED' || status === 'CLOSED' ? new Date().toISOString() : undefined,
          }
        : g
    );
    this.memoryCache = updated;
    this.saveLocalStore(updated, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('employee_grievances')
          .update({
            status,
            resolution_summary: resolutionSummary,
            hr_notes: hrNotes,
            resolved_at: status === 'RESOLVED' || status === 'CLOSED' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', grievanceId);

        await supabase.from('realtime_outbox').insert({
          tenant_id: tenantId,
          entity_type: 'employee_grievances',
          entity_id: grievanceId,
          action: 'UPDATE',
          payload: { id: grievanceId, status, resolution_summary: resolutionSummary },
        });
      } catch (err) {
        console.warn('[GrievanceService] updateGrievanceStatus DB notice:', err);
      }
    }

    hrEventBus.publish('grievance.updated' as any, { grievanceId, status });
  }
}

export const grievanceService = new GrievanceService();
