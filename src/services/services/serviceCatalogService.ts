import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import {
  ServiceDefinition,
  ServiceRequest,
  ServiceRequestStatus,
  ServiceFormField,
} from '../../types/employeeRelations';

class ServiceCatalogService {
  private static instance: ServiceCatalogService;

  private constructor() {}

  public static getInstance(): ServiceCatalogService {
    if (!ServiceCatalogService.instance) {
      ServiceCatalogService.instance = new ServiceCatalogService();
    }
    return ServiceCatalogService.instance;
  }

  // ============================================================
  // SERVICE DEFINITIONS
  // ============================================================

  public async fetchServiceDefinitions(tenantId = getActiveOrgId()): Promise<ServiceDefinition[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('service_definitions')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data !== null) return data;
        if (error) console.warn('[ServiceCatalog] fetchDefinitions error:', error);
      } catch (err) {
        console.warn('[ServiceCatalog] definitions notice:', err);
      }
    }
    return [];
  }

  public async createOrUpdateDefinition(
    def: Partial<ServiceDefinition>,
    tenantId = getActiveOrgId()
  ): Promise<ServiceDefinition | null> {
    const payload = {
      tenant_id: tenantId,
      organization_id: tenantId,
      code: def.code,
      name: def.name,
      category: def.category || 'General',
      description: def.description,
      icon: def.icon || 'file-text',
      enabled: def.enabled ?? true,
      employee_visible: def.employee_visible ?? true,
      requires_attachment: def.requires_attachment ?? false,
      requires_approval: def.requires_approval ?? true,
      sla_hours: def.sla_hours || 48,
      form_schema: def.form_schema || [],
      workflow_config: def.workflow_config || { steps: ['EMPLOYEE', 'HR', 'COMPLETED'] },
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled) {
      try {
        let res;
        if (def.id) {
          res = await supabase
            .from('service_definitions')
            .update(payload)
            .eq('id', def.id)
            .select()
            .single();
        } else {
          res = await supabase
            .from('service_definitions')
            .insert([payload])
            .select()
            .single();
        }
        if (res.data) return res.data;
        if (res.error) console.warn('[ServiceCatalog] save error:', res.error);
      } catch (err) {
        console.warn('[ServiceCatalog] save exception:', err);
      }
    }
    return null;
  }

  public async toggleServiceStatus(id: string, enabled: boolean): Promise<boolean> {
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase
          .from('service_definitions')
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq('id', id);

        return !error;
      } catch (_) {}
    }
    return false;
  }

  // ============================================================
  // SERVICE REQUESTS
  // ============================================================

  public async fetchServiceRequests(tenantId = getActiveOrgId()): Promise<ServiceRequest[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select('*')
          .order('submitted_at', { ascending: false });

        if (!error && data !== null) return data;
        if (error) console.warn('[ServiceCatalog] fetchRequests error:', error);
      } catch (err) {
        console.warn('[ServiceCatalog] requests notice:', err);
      }
    }
    return [];
  }

  public async updateRequestStatus(
    requestId: string,
    status: ServiceRequestStatus,
    notes?: string,
    actorName = 'HR Administrator'
  ): Promise<boolean> {
    const updatePayload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'APPROVED' || status === 'COMPLETED') {
      updatePayload.completed_at = new Date().toISOString();
      if (notes) updatePayload.resolution_notes = notes;
    } else if (status === 'REJECTED') {
      if (notes) updatePayload.rejection_reason = notes;
    }

    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase
          .from('service_requests')
          .update(updatePayload)
          .eq('id', requestId);

        if (!error) {
          // Log audit event
          await supabase.from('service_request_events').insert([
            {
              request_id: requestId,
              actor_id: 'hr-admin-01',
              actor_name: actorName,
              actor_role: 'HR',
              event_type: 'STATUS_CHANGE',
              new_status: status,
              comment: notes,
            },
          ]);
          return true;
        }
      } catch (err) {
        console.warn('[ServiceCatalog] updateRequestStatus error:', err);
      }
    }
    return false;
  }
}

export const serviceCatalogService = ServiceCatalogService.getInstance();
