// src/services/organization/vendorWorkforceService.ts
// ============================================================================
// WorkForceOS — Vendor & External Workforce Management Service 2.0
// Database-Backed Engine for Vendors, Manpower Workers, Site Deployments & Compliance
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { Vendor, VendorWorker, VendorDeployment, VendorContract, VendorDocument } from '../../types';
import { hrEventBus } from '../hrEventBus';

class VendorWorkforceService {
  /**
   * Fetches all Vendors for an organization.
   */
  async getVendors(organizationId: string): Promise<Vendor[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('[VendorWorkforceService] getVendors error:', err);
      }
    }
    return [];
  }

  /**
   * Fetches all Vendor Workers for an organization or specific vendor.
   */
  async getVendorWorkers(organizationId: string, vendorId?: string): Promise<VendorWorker[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let query = supabase.from('vendor_workers').select('*, vendors(legal_name)').eq('organization_id', organizationId);
        if (vendorId) {
          query = query.eq('vendor_id', vendorId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((row: any) => ({
            ...row,
            vendor_name: row.vendors?.legal_name || 'Workforce Partner',
          }));
        }
      } catch (err) {
        console.warn('[VendorWorkforceService] getVendorWorkers error:', err);
      }
    }
    return [];
  }

  /**
   * Creates a new Vendor Worker.
   */
  async createVendorWorker(
    payload: Partial<VendorWorker> & { organization_id: string; vendor_id: string; first_name: string; last_name: string; worker_code: string }
  ): Promise<VendorWorker> {
    const newWorker: VendorWorker = {
      id: `vwrk-${Date.now()}`,
      organization_id: payload.organization_id,
      vendor_id: payload.vendor_id,
      worker_code: payload.worker_code,
      first_name: payload.first_name,
      last_name: payload.last_name,
      display_name: `${payload.first_name} ${payload.last_name}`.trim(),
      email: payload.email || '',
      phone: payload.phone || '',
      identity_proof_type: payload.identity_proof_type || 'Aadhaar',
      identity_proof_number_masked: payload.identity_proof_number_masked || 'XXXX XXXX 1234',
      skill_category: payload.skill_category || 'Technical Support',
      status: payload.status || 'ACTIVE',
      date_of_birth: payload.date_of_birth,
      gender: payload.gender,
      blood_group: payload.blood_group,
      emergency_contact_name: payload.emergency_contact_name,
      emergency_contact_phone: payload.emergency_contact_phone,
      active_deployments_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('vendor_workers').insert([newWorker]).select().single();
        if (!error && data) {
          hrEventBus.emit('vendor.worker_created', { worker: data });
          return data;
        }
      } catch (err) {
        console.warn('[VendorWorkforceService] createVendorWorker fallback:', err);
      }
    }

    hrEventBus.emit('vendor.worker_created', { worker: newWorker });
    return newWorker;
  }

  /**
   * Fetches all Deployments for an organization, branch, or worker.
   */
  async getDeployments(organizationId: string, filter?: { vendorId?: string; workerId?: string; branchId?: string }): Promise<VendorDeployment[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let query = supabase
          .from('vendor_deployments')
          .select('*, vendors(legal_name), vendor_workers(display_name, worker_code), branches(name), departments(name), teams(name)')
          .eq('organization_id', organizationId);

        if (filter?.vendorId) query = query.eq('vendor_id', filter.vendorId);
        if (filter?.workerId) query = query.eq('worker_id', filter.workerId);
        if (filter?.branchId) query = query.eq('branch_id', filter.branchId);

        const { data, error } = await query.order('start_date', { ascending: false });
        if (!error && data) {
          return data.map((row: any) => ({
            ...row,
            vendor_name: row.vendors?.legal_name,
            worker_name: row.vendor_workers?.display_name,
            worker_code: row.vendor_workers?.worker_code,
            branch_name: row.branches?.name,
            department_name: row.departments?.name,
            team_name: row.teams?.name,
          }));
        }
      } catch (err) {
        console.warn('[VendorWorkforceService] getDeployments error:', err);
      }
    }
    return [];
  }

  /**
   * Creates a new Deployment for a vendor worker.
   */
  async createDeployment(
    payload: Partial<VendorDeployment> & { organization_id: string; vendor_id: string; worker_id: string; deployment_role: string; start_date: string }
  ): Promise<VendorDeployment> {
    const newDeploy: VendorDeployment = {
      id: `vdpl-${Date.now()}`,
      organization_id: payload.organization_id,
      vendor_id: payload.vendor_id,
      worker_id: payload.worker_id,
      company_id: payload.company_id,
      branch_id: payload.branch_id,
      department_id: payload.department_id,
      team_id: payload.team_id,
      deployment_role: payload.deployment_role,
      supervisor_employee_id: payload.supervisor_employee_id,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
      bill_rate: payload.bill_rate || 0,
      bill_unit: payload.bill_unit || 'MONTH',
      currency: payload.currency || 'INR',
      status: payload.status || 'ACTIVE',
      notes: payload.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('vendor_deployments').insert([newDeploy]).select().single();
        if (!error && data) {
          hrEventBus.emit('vendor.deployment_created', { deployment: data });
          return data;
        }
      } catch (err) {
        console.warn('[VendorWorkforceService] createDeployment fallback:', err);
      }
    }

    hrEventBus.emit('vendor.deployment_created', { deployment: newDeploy });
    return newDeploy;
  }

  /**
   * Fetches vendor contracts.
   */
  async getContracts(vendorId: string): Promise<VendorContract[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('vendor_contracts').select('*').eq('vendor_id', vendorId).order('start_date', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('[VendorWorkforceService] getContracts error:', err);
      }
    }
    return [];
  }

  /**
   * Fetches vendor compliance documents.
   */
  async getDocuments(vendorId: string): Promise<VendorDocument[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('vendor_documents').select('*').eq('vendor_id', vendorId).order('uploaded_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('[VendorWorkforceService] getDocuments error:', err);
      }
    }
    return [];
  }
}

export const vendorWorkforceService = new VendorWorkforceService();
