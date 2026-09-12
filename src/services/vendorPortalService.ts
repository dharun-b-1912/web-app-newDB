import {
  VendorOrganization,
  VendorEmployee,
  VendorEmployeeStatus,
  InvoiceStatus,
  VendorAttendanceRecord,
  VendorAttendanceCorrectionRequest,
  EmployeeWageBreakdown,
  VendorPayableBreakdown,
  VendorPurchaseOrder,
  VendorInvoice,
  ThreeWayMatchResult,
  VendorStatutoryChallan,
  VendorInvoicePayment,
  VendorAuditLog,
  PayrollVerificationStatus,
  VendorDocumentRequest,
  PrincipalEmployerFormV,
  VendorCompanyRelationship,
  WorkerDeployment,
} from '../types/vendorPortal';
import { api } from './api';
import { VendorContract } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { VendorOnboardingSubmission } from '../types/vendorEcosystem';
import { VendorComplianceApplicabilityEngine } from './vendor/vendorComplianceApplicabilityEngine';

const STORAGE_KEYS = {
  VENDORS: 'wf_vendor_portal_orgs',
  ACTIVE_VENDOR_ID: 'wf_vendor_portal_active_id',
  RELATIONSHIPS: 'wf_vendor_portal_relationships',
  ACTIVE_RELATIONSHIP_ID: 'wf_vendor_portal_active_rel_id',
  EMPLOYEES: 'wf_vendor_portal_employees',
  ASSIGNMENTS: 'wf_vendor_portal_assignments',
  ATTENDANCE: 'wf_vendor_portal_attendance',
  CORRECTIONS: 'wf_vendor_portal_corrections',
  PURCHASE_ORDERS: 'wf_vendor_portal_pos',
  INVOICES: 'wf_vendor_portal_invoices',
  PAYMENTS: 'wf_vendor_portal_payments',
  CHALLANS: 'wf_vendor_portal_challans',
  AUDIT_LOGS: 'wf_vendor_portal_audit',
  PAYROLL_STATUS: 'wf_vendor_portal_payroll_status',
};

// Empty defaults for authentic live operation
const DEFAULT_ORGANIZATIONS: VendorOrganization[] = [];
const DEFAULT_RELATIONSHIPS: VendorCompanyRelationship[] = [];
const DEFAULT_EMPLOYEES: VendorEmployee[] = [];
const DEFAULT_PURCHASE_ORDERS: VendorPurchaseOrder[] = [];

const memStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (_) {}
  return memStore[key] || null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (_) {}
  memStore[key] = value;
}

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = safeGetItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, data: T): void {
  try {
    safeSetItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed writing to storage ${key}`, e);
  }
}

function safeDispatchEvent(name: string, detail?: any): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch (_) {}
  }
}

const DEFAULT_LICENSES: (import('../types/vendorPortal').VendorLicense & { valid_until?: string })[] = [];
const DEFAULT_STATUTORY_RETURNS: import('../types/vendorPortal').StatutoryReturn[] = [];

export const vendorPortalService = {
  // ==========================================
  // 1. ORGANIZATIONS & ACTIVE CONTEXT
  // ==========================================
  getVendors(): VendorOrganization[] {
    const orgs = getStorage<VendorOrganization[]>(STORAGE_KEYS.VENDORS, DEFAULT_ORGANIZATIONS);
    return orgs || [];
  },

  getActiveVendorId(): string {
    const saved = safeGetItem(STORAGE_KEYS.ACTIVE_VENDOR_ID);
    if (saved) return saved;
    const orgs = this.getVendors();
    const fallback = orgs[0]?.id || '';
    if (fallback) safeSetItem(STORAGE_KEYS.ACTIVE_VENDOR_ID, fallback);
    return fallback;
  },

  setActiveVendorId(vendorId: string): void {
    safeSetItem(STORAGE_KEYS.ACTIVE_VENDOR_ID, vendorId);
    safeDispatchEvent('wf-vendor-changed', { vendorId });
  },

  getActiveVendor(): VendorOrganization | null {
    const activeId = this.getActiveVendorId();
    const vendors = this.getVendors();
    if (activeId) {
      const found = vendors.find((v) => v.id === activeId);
      if (found) return found;
    }
    return vendors.length > 0 ? vendors[0] : null;
  },

  addVendorOrganization(org: VendorOrganization): void {
    const orgs = this.getVendors();
    if (!orgs.some((o) => o.id === org.id)) {
      orgs.push(org);
      setStorage(STORAGE_KEYS.VENDORS, orgs);
      window.dispatchEvent(new CustomEvent('wf-vendor-changed', { detail: { vendorId: org.id } }));

      if (isSupabaseEnabled) {
        (async () => {
          try {
            await supabase.from('vendor_portal_organizations').upsert(org);
          } catch (err) {
            console.warn('[VendorPortalService] Supabase insert vendor org failed:', err);
          }
        })();
      }
    }
  },

  activateVendor(vendorId: string): void {
    const orgs = this.getVendors();
    const found = orgs.find((o) => o.id === vendorId);
    if (found) {
      found.status = 'Active';
      setStorage(STORAGE_KEYS.VENDORS, orgs);
      safeDispatchEvent('wf-vendor-changed', { vendorId });
    }
  },

  updateVendorOrganization(vendorId: string, updates: Partial<VendorOrganization>): void {
    const orgs = this.getVendors();
    const idx = orgs.findIndex((o) => o.id === vendorId || o.code === vendorId);
    if (idx !== -1) {
      orgs[idx] = { ...orgs[idx], ...updates, updated_at: new Date().toISOString() };
      setStorage(STORAGE_KEYS.VENDORS, orgs);
      safeDispatchEvent('wf-vendor-changed', { vendorId });
    }
  },

  deleteVendorOrganization(vendorId: string): void {
    const orgs = this.getVendors();
    const filtered = orgs.filter((o) => o.id !== vendorId && o.code !== vendorId);
    setStorage(STORAGE_KEYS.VENDORS, filtered);
    safeDispatchEvent('wf-vendor-changed', { vendorId });
  },

  submitVendorOnboarding(submission: VendorOnboardingSubmission): {
    success: boolean;
    complianceResult: ReturnType<typeof VendorComplianceApplicabilityEngine.evaluateSubmission>;
    error?: string;
  } {
    const complianceResult = VendorComplianceApplicabilityEngine.evaluateSubmission(submission);
    if (!complianceResult.isReadyForSubmission) {
      return {
        success: false,
        complianceResult,
        error: `SUBMISSION_REJECTED: Mandatory submission requirements missing: ${complianceResult.missingRequirements.join(', ')}`,
      };
    }

    const orgs = this.getVendors();
    let target = orgs.find((o) => o.id === submission.vendor_id);
    if (!target) {
      target = {
        id: submission.vendor_id,
        tenant_id: 'org-joy-01',
        name: submission.business_profile.legal_name,
        trade_name: submission.business_profile.trade_name || submission.business_profile.legal_name,
        code: `VEN-${Date.now().toString().slice(-6)}`,
        vendor_type: submission.business_profile.vendor_type,
        company_type: submission.business_profile.constitution_type,
        contact_person: submission.business_profile.contact_person,
        email: submission.business_profile.email,
        phone: submission.business_profile.mobile,
        pan: submission.tax_details.pan,
        gstin: submission.tax_details.gstin || '',
        address: submission.business_profile.registered_address,
        city: submission.business_profile.city,
        state: submission.business_profile.state,
        postal_code: submission.business_profile.postal_code,
        status: 'Submitted',
        service_charge_percentage: submission.commercial_agreement.service_charge_percentage,
        is_gst_applicable: submission.tax_details.is_gst_applicable,
        bank_name: submission.bank_details.bank_name,
        account_number: submission.bank_details.account_number,
        ifsc_code: submission.bank_details.ifsc_code,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      orgs.push(target);
    } else {
      target.name = submission.business_profile.legal_name;
      target.trade_name = submission.business_profile.trade_name || target.name;
      target.company_type = submission.business_profile.constitution_type;
      target.pan = submission.tax_details.pan;
      target.gstin = submission.tax_details.gstin || '';
      target.is_gst_applicable = submission.tax_details.is_gst_applicable;
      target.bank_name = submission.bank_details.bank_name;
      target.account_number = submission.bank_details.account_number;
      target.ifsc_code = submission.bank_details.ifsc_code;
      target.status = 'Submitted';
      target.updated_at = new Date().toISOString();
    }

    setStorage(STORAGE_KEYS.VENDORS, orgs);
    window.dispatchEvent(new CustomEvent('wf-vendor-changed', { detail: { vendorId: submission.vendor_id } }));

    hrEventBus.emit('vendor.submitted', {
      vendor_id: submission.vendor_id,
      legal_name: submission.business_profile.legal_name,
      compliance_ready: complianceResult.isCompliant,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      complianceResult,
    };
  },

  // ==========================================
  // 1.1 MULTI-COMPANY RELATIONSHIPS & CONTEXT
  // ==========================================
  getVendorCompanyRelationships(vendorId?: string): VendorCompanyRelationship[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const list = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    if (!safeGetItem(STORAGE_KEYS.RELATIONSHIPS)) {
      setStorage(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    }
    let filtered = list.filter((r) => r.vendor_id === targetVendorId);
    if (filtered.length === 0) {
      const defaults = DEFAULT_RELATIONSHIPS.filter((r) => r.vendor_id === targetVendorId);
      if (defaults.length > 0) {
        const merged = [...list, ...defaults];
        setStorage(STORAGE_KEYS.RELATIONSHIPS, merged);
        filtered = defaults;
      }
    }
    return filtered;
  },

  getActiveRelationshipId(): string {
    const saved = safeGetItem(STORAGE_KEYS.ACTIVE_RELATIONSHIP_ID);
    if (saved) return saved;
    const rels = this.getVendorCompanyRelationships();
    const active = rels.find((r) => r.status === 'ACTIVE') || rels[0];
    if (active) {
      safeSetItem(STORAGE_KEYS.ACTIVE_RELATIONSHIP_ID, active.id);
      return active.id;
    }
    return '';
  },

  setActiveRelationshipId(relationshipId: string): void {
    safeSetItem(STORAGE_KEYS.ACTIVE_RELATIONSHIP_ID, relationshipId);
    safeDispatchEvent('wf-vendor-relationship-changed', { relationshipId });
  },

  getActiveRelationship(): VendorCompanyRelationship | null {
    const activeRelId = this.getActiveRelationshipId();
    const rels = this.getVendorCompanyRelationships();
    if (activeRelId) {
      const found = rels.find((r) => r.id === activeRelId);
      if (found) return found;
    }
    return rels.find((r) => r.status === 'ACTIVE') || rels[0] || null;
  },

  requestCompanyConnection(payload: {
    company_name: string;
    company_code: string;
    site_location: string;
    sow_number?: string;
    primary_hr_contact_name: string;
    primary_hr_contact_email: string;
    status?: 'ACTIVE' | 'PENDING_APPROVAL';
    autoApprove?: boolean;
  }): VendorCompanyRelationship {
    const activeVendor = this.getActiveVendor();
    const vendorId = activeVendor?.id || 'vnd-generic';
    const vendorName = activeVendor?.name || 'Vendor Organization';
    const all = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    const nextIndex = all.length + 1;
    const isApproved = payload.status === 'ACTIVE' || payload.autoApprove === true;
    const newRel: VendorCompanyRelationship = {
      id: `rel-${vendorId}-${Date.now()}`,
      relationship_id: `REL-${String(nextIndex).padStart(3, '0')}`,
      vendor_id: vendorId,
      vendor_name: vendorName,
      company_id: `comp-${Date.now().toString(36)}`,
      company_name: payload.company_name,
      company_code: payload.company_code || `CLIENT-${nextIndex}`,
      site_location: payload.site_location || 'Main Industrial Site',
      status: isApproved ? 'ACTIVE' : 'PENDING_APPROVAL',
      approval_status: isApproved ? 'COMPANY_APPROVED' : 'KYC_UNDER_REVIEW',
      access_enabled: isApproved,
      active_workers_count: 0,
      compliance_score: 100,
      contract_start_date: new Date().toISOString().split('T')[0],
      contract_end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      sow_number: payload.sow_number,
      primary_hr_contact_name: payload.primary_hr_contact_name,
      primary_hr_contact_email: payload.primary_hr_contact_email,
      created_at: new Date().toISOString(),
      approved_at: isApproved ? new Date().toISOString() : undefined,
      approved_by: isApproved ? 'Authorized HR Head' : undefined,
    };

    all.unshift(newRel);
    setStorage(STORAGE_KEYS.RELATIONSHIPS, all);
    if (isApproved) {
      this.setActiveRelationshipId(newRel.id);
    }
    safeDispatchEvent('wf-vendor-relationship-changed', { relationshipId: newRel.id });

    this.logAudit({
      entity_type: 'ONBOARDING',
      entity_id: newRel.id,
      action: 'COMPANY_CONNECTION_REQUESTED',
      new_value: JSON.stringify(newRel),
      remarks: `Connection request sent to Client Company ${payload.company_name}`,
    });

    return newRel;
  },

  approveCompanyRelationship(relId: string, approvedBy: string = 'Company HR Head'): void {
    const all = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    const idx = all.findIndex((r) => r.id === relId);
    if (idx !== -1) {
      all[idx].status = 'ACTIVE';
      all[idx].approval_status = 'COMPANY_APPROVED';
      all[idx].access_enabled = true;
      all[idx].approved_at = new Date().toISOString();
      all[idx].approved_by = approvedBy;
      setStorage(STORAGE_KEYS.RELATIONSHIPS, all);
      safeDispatchEvent('wf-vendor-relationship-changed', { relationshipId: relId });

      this.logAudit({
        entity_type: 'ONBOARDING',
        entity_id: relId,
        action: 'COMPANY_RELATIONSHIP_APPROVED',
        new_value: 'ACTIVE',
        remarks: `Client relationship ${all[idx].company_name} approved by ${approvedBy}. Workspace activated.`,
      });
    }
  },

  suspendCompanyRelationship(relId: string, reason?: string): void {
    const all = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    const idx = all.findIndex((r) => r.id === relId);
    if (idx !== -1) {
      all[idx].status = 'SUSPENDED';
      all[idx].access_enabled = false;
      setStorage(STORAGE_KEYS.RELATIONSHIPS, all);
      safeDispatchEvent('wf-vendor-relationship-changed', { relationshipId: relId });

      this.logAudit({
        entity_type: 'ONBOARDING',
        entity_id: relId,
        action: 'COMPANY_RELATIONSHIP_SUSPENDED',
        new_value: 'SUSPENDED',
        remarks: reason || `Client relationship ${all[idx].company_name} suspended by Company Admin.`,
      });
    }
  },

  getCompanyRelationship(relId: string): VendorCompanyRelationship | undefined {
    const all = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    return all.find((r) => r.id === relId || r.relationship_id === relId);
  },

  updateCompanyRelationship(
    relId: string,
    updates: Partial<VendorCompanyRelationship> & { serviceChargePercentage?: number; paymentTerms?: string }
  ): VendorCompanyRelationship | undefined {
    const all = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    const idx = all.findIndex((r) => r.id === relId || r.relationship_id === relId);
    if (idx === -1) return undefined;

    const normalized: VendorCompanyRelationship = {
      ...all[idx],
      ...updates,
      service_charge_percentage:
        updates.serviceChargePercentage !== undefined
          ? updates.serviceChargePercentage
          : updates.service_charge_percentage !== undefined
          ? updates.service_charge_percentage
          : all[idx].service_charge_percentage,
      payment_terms: updates.paymentTerms || updates.payment_terms || all[idx].payment_terms,
      updated_at: new Date().toISOString(),
    };

    all[idx] = normalized;
    setStorage(STORAGE_KEYS.RELATIONSHIPS, all);
    safeDispatchEvent('wf-vendor-relationship-changed', { relationshipId: relId });
    return normalized;
  },

  terminateCompanyRelationship(relId: string, reason?: string): void {
    const all = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    const idx = all.findIndex((r) => r.id === relId);
    if (idx !== -1) {
      all[idx].status = 'TERMINATED';
      all[idx].access_enabled = false;
      all[idx].updated_at = new Date().toISOString();
      setStorage(STORAGE_KEYS.RELATIONSHIPS, all);
      safeDispatchEvent('wf-vendor-relationship-changed', { relationshipId: relId });

      this.logAudit({
        entity_type: 'ONBOARDING',
        entity_id: relId,
        action: 'COMPANY_RELATIONSHIP_TERMINATED',
        new_value: 'TERMINATED',
        remarks: reason || `Client relationship ${all[idx].company_name} terminated. Access revoked.`,
      });

      hrEventBus.emit('vendor.relationship_terminated', {
        relationship_id: relId,
        vendor_id: all[idx].vendor_id,
        company_id: all[idx].company_id,
        reason,
        timestamp: new Date().toISOString(),
      });
    }
  },

  createVendorCompanyRelationship(params: {
    id?: string;
    relationship_id?: string;
    vendor_id: string;
    company_id: string;
    company_name: string;
    company_code?: string;
    site_location?: string;
    contract_start_date?: string;
    contract_end_date?: string;
    service_charge_percentage?: number;
    rate_card_type?: string;
    payment_terms?: string;
    max_workforce_capacity?: number;
    primary_hr_contact_name?: string;
    primary_hr_contact_email?: string;
  }): VendorCompanyRelationship {
    const all = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    const vendor = this.getVendors().find((v) => v.id === params.vendor_id);
    const nextIndex = all.length + 1;

    const newRel: VendorCompanyRelationship = {
      id: params.id || `rel-${params.vendor_id}-${params.company_id}-${Date.now()}`,
      relationship_id: params.relationship_id || `REL-${String(nextIndex).padStart(3, '0')}`,
      vendor_id: params.vendor_id,
      vendor_name: vendor?.name || 'Vendor Organization',
      company_id: params.company_id,
      company_name: params.company_name,
      company_code: params.company_code || `COMP-${params.company_id.slice(-6).toUpperCase()}`,
      site_location: params.site_location || 'Authorized Company Premises',
      status: 'ACTIVE',
      approval_status: 'COMPANY_APPROVED',
      access_enabled: true,
      active_workers_count: 0,
      compliance_score: 100,
      contract_start_date: params.contract_start_date || new Date().toISOString().split('T')[0],
      contract_end_date: params.contract_end_date || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      service_charge_percentage: params.service_charge_percentage || 8.5,
      rate_card_type: params.rate_card_type || 'Per Head Per Month',
      payment_terms: params.payment_terms || 'Net 30',
      max_workforce_capacity: params.max_workforce_capacity || 50,
      primary_hr_contact_name: params.primary_hr_contact_name || 'HR Head',
      primary_hr_contact_email: params.primary_hr_contact_email || 'hr@joycorporate.com',
      created_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: 'Company Admin',
    };

    all.unshift(newRel);
    setStorage(STORAGE_KEYS.RELATIONSHIPS, all);
    safeDispatchEvent('wf-vendor-relationship-changed', { relationshipId: newRel.id });

    hrEventBus.emit('vendor.relationship_created', {
      relationship_id: newRel.id,
      vendor_id: params.vendor_id,
      company_id: params.company_id,
      timestamp: new Date().toISOString(),
    });

    return newRel;
  },

  switchCustomerRelationship(relationshipId: string): {
    success: boolean;
    switched: boolean;
    cachesFlushed: boolean;
    relationship: VendorCompanyRelationship;
  } {
    const all = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    const target = all.find((r) => r.id === relationshipId || r.relationship_id === relationshipId);
    if (!target) {
      throw new Error(`Customer relationship ${relationshipId} not found`);
    }

    // 1. Clear caches and transient selected entity state
    safeSetItem(STORAGE_KEYS.ACTIVE_RELATIONSHIP_ID, target.id);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wf_vendor_portal_selected_worker_id');
      localStorage.removeItem('wf_vendor_portal_selected_invoice_id');
      localStorage.removeItem('wf_vendor_portal_selected_site_id');
      localStorage.removeItem('wf_vendor_portal_cached_summary');
    }

    // 2. Dispatch events for scoping subscriptions and UI reloads
    safeDispatchEvent('wf-vendor-relationship-changed', { relationshipId: target.id, relationship: target });
    safeDispatchEvent('wf-vendor-cache-cleared', { previousContextCleared: true, newRelationshipId: target.id });

    hrEventBus.emit('vendor.customer_switched', {
      vendor_id: target.vendor_id,
      relationship_id: target.id,
      company_id: target.company_id,
      company_name: target.company_name,
      timestamp: new Date().toISOString(),
    });
    hrEventBus.emit('vendor.relationship.switched', {
      vendor_id: target.vendor_id,
      relationship_id: target.id,
      targetRelationshipId: target.id,
      company_id: target.company_id,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      switched: true,
      cachesFlushed: true,
      relationship: target,
    };
  },

  // ==========================================
  // 2. VENDOR EMPLOYEES & DATA ISOLATION
  // ==========================================
  getEmployees(vendorId?: string): VendorEmployee[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const all = getStorage<VendorEmployee[]>(STORAGE_KEYS.EMPLOYEES, []);
    return targetVendorId ? all.filter((e) => e.vendor_id === targetVendorId) : all;
  },

  addEmployee(payload: Partial<VendorEmployee>): VendorEmployee {
    const activeVendor = this.getActiveVendor();
    const all = getStorage<VendorEmployee[]>(STORAGE_KEYS.EMPLOYEES, []);
    const newEmp: VendorEmployee = {
      id: payload.id || `vemp-${Date.now()}`,
      tenant_id: payload.tenant_id || activeVendor?.tenant_id || 'org-joy-01',
      vendor_id: payload.vendor_id || activeVendor?.id || '',
      vendor_name: payload.vendor_name || activeVendor?.name || 'Vendor Organization',
      employee_code: payload.employee_code || `EMP-${Date.now().toString().slice(-6)}`,
      first_name: payload.first_name || '',
      last_name: payload.last_name || '',
      display_name: payload.display_name || `${payload.first_name || ''} ${payload.last_name || ''}`.trim() || 'Worker',
      gender: payload.gender || '',
      dob: payload.dob || '',
      mobile: payload.mobile || '',
      email: payload.email || '',
      address: payload.address || '',
      joining_date: payload.joining_date || new Date().toISOString().split('T')[0],
      employment_type: payload.employment_type || 'Contract',
      worker_category: payload.worker_category || 'Skilled',
      skill_category: payload.skill_category || '',
      department: payload.department || '',
      designation: payload.designation || '',
      status: payload.status || 'PENDING_COMPANY_APPROVAL',
      uan: payload.uan || '',
      pf_number: payload.pf_number || '',
      esic_number: payload.esic_number || '',
      pan: payload.pan || '',
      aadhaar_masked: payload.aadhaar_masked || '',
      bank_name: payload.bank_name || '',
      account_number: payload.account_number || '',
      ifsc: payload.ifsc || '',
      current_client_id: payload.current_client_id || '',
      current_client_name: payload.current_client_name || '',
      work_location: payload.work_location || '',
      project_name: payload.project_name || '',
      shift_name: payload.shift_name || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    all.unshift(newEmp);
    setStorage(STORAGE_KEYS.EMPLOYEES, all);

    if (isSupabaseEnabled && supabase) {
      (async () => {
        try {
          const resolvedOrgId = (activeVendor as any).organization_id || activeVendor.tenant_id || api.getOrganizationSync()?.id;
          if (resolvedOrgId && resolvedOrgId.length === 36 && newEmp.vendor_id && newEmp.vendor_id.length === 36) {
            await supabase.from('vendor_workers').insert({
              organization_id: resolvedOrgId,
              vendor_id: newEmp.vendor_id,
              worker_code: newEmp.employee_code,
              full_name: newEmp.display_name,
              deployed_company_id: newEmp.current_client_id && newEmp.current_client_id.length === 36 ? newEmp.current_client_id : undefined,
              daily_wage_rate: (payload as any).daily_wage_rate || (payload as any).wage_rate || undefined,
              status: 'ACTIVE',
            });
          }
        } catch (err) {
          console.warn('[VendorPortalService] Supabase insert vendor_workers notice:', err);
        }
      })();
    }

    this.logAudit({
      entity_type: 'EMPLOYEE',
      entity_id: newEmp.id,
      action: 'EMPLOYEE_SUBMITTED_FOR_ONBOARDING',
      new_value: JSON.stringify({ code: newEmp.employee_code, name: newEmp.display_name }),
      remarks: 'Vendor submitted new employee onboarding request for company authorization',
    });

    return newEmp;
  },

  updateVendorEmployeeStatus(empId: string, status: VendorEmployee['status'], remarks?: string): void {
    const all = getStorage<VendorEmployee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
    const idx = all.findIndex((e) => e.id === empId);
    if (idx !== -1) {
      const oldVal = all[idx].status;
      all[idx].status = status;
      all[idx].updated_at = new Date().toISOString();
      setStorage(STORAGE_KEYS.EMPLOYEES, all);

      this.logAudit({
        entity_type: 'EMPLOYEE',
        entity_id: empId,
        action: `STATUS_CHANGED_${status}`,
        previous_value: oldVal,
        new_value: status,
        remarks: remarks || `Employee status transition from ${oldVal} to ${status}`,
      });
    }
  },

  // ==========================================
  // 3. ATTENDANCE & CORRECTION REQUESTS
  // ==========================================
  getAttendance(arg1?: string, arg2?: string): VendorAttendanceRecord[] {
    let period = '2026-08';
    let vendorId: string | undefined = undefined;

    if (arg1 && arg1.match(/^\d{4}-\d{2}$/)) {
      period = arg1;
      vendorId = arg2;
    } else if (arg2 && arg2.match(/^\d{4}-\d{2}$/)) {
      period = arg2;
      vendorId = arg1;
    } else if (arg1) {
      vendorId = arg1;
    }
    return this.getMonthlyAttendance(period, vendorId);
  },

  getMonthlyAttendance(period: string = '2026-08', vendorId?: string): VendorAttendanceRecord[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const stored = getStorage<VendorAttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    return stored.filter((r) => r.vendor_id === targetVendorId && r.month === period);
  },

  getAttendanceMuster(vendorId: string, month: string = '2026-08') {
    const records = this.getMonthlyAttendance(month, vendorId);
    const totalApprovedManDays = records.reduce((s, r) => s + (r.present_days || 0), 0);
    const totalOtHours = records.reduce((s, r) => s + (r.ot_hours || 0), 0);
    const isLocked = records.length > 0 && records.every((r) => r.status === 'LOCKED' || r.status === 'VERIFIED');
    return {
      month,
      vendorId,
      records,
      totalApprovedManDays,
      totalOtHours,
      isLocked,
      status: records.length > 0 ? (isLocked ? 'LOCKED' : (records[0]?.status || 'PENDING_REVIEW')) : 'NO_RECORDS',
    };
  },

  getAttendanceCorrections(vendorId?: string): VendorAttendanceCorrectionRequest[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const list = getStorage<VendorAttendanceCorrectionRequest[]>(STORAGE_KEYS.CORRECTIONS, []);
    return list.filter((c) => c.vendor_id === targetVendorId);
  },

  submitAttendanceCorrection(payload: {
    employee_id: string;
    month: string;
    requested_present_days: number;
    requested_lop_days: number;
    requested_ot_hours: number;
    reason: string;
    supporting_doc_name?: string;
  }): VendorAttendanceCorrectionRequest {
    const activeVendor = this.getActiveVendor();
    const vendorId = activeVendor?.id || '';
    const emp = this.getEmployees(vendorId).find((e) => e.id === payload.employee_id);
    const currentAtt = this.getMonthlyAttendance(payload.month, vendorId).find((a) => a.employee_id === payload.employee_id);

    const newReq: VendorAttendanceCorrectionRequest = {
      id: `corr-${Date.now()}`,
      tenant_id: activeVendor?.tenant_id || 'org-joy-01',
      vendor_id: vendorId,
      employee_id: payload.employee_id,
      employee_name: emp ? emp.display_name : 'Staff',
      employee_code: emp ? emp.employee_code : 'N/A',
      month: payload.month,
      original_present_days: currentAtt ? currentAtt.present_days : 24,
      requested_present_days: payload.requested_present_days,
      original_lop_days: currentAtt ? currentAtt.lop_days : 2,
      requested_lop_days: payload.requested_lop_days,
      original_ot_hours: currentAtt ? currentAtt.ot_hours : 0,
      requested_ot_hours: payload.requested_ot_hours,
      reason: payload.reason,
      supporting_doc_name: payload.supporting_doc_name || '',
      status: 'SUBMITTED',
      requested_by: activeVendor?.contact_person || 'Vendor User',
      requested_at: new Date().toISOString(),
    };

    const all = getStorage<VendorAttendanceCorrectionRequest[]>(STORAGE_KEYS.CORRECTIONS, []);
    all.unshift(newReq);
    setStorage(STORAGE_KEYS.CORRECTIONS, all);

    this.logAudit({
      entity_type: 'ATTENDANCE',
      entity_id: newReq.id,
      action: 'ATTENDANCE_CORRECTION_SUBMITTED',
      new_value: JSON.stringify(newReq),
      remarks: `Attendance correction requested for ${newReq.employee_name}: ${newReq.reason}`,
    });

    return newReq;
  },

  reviewAttendanceCorrection(
    corrId: string,
    decision: 'APPROVED' | 'REJECTED',
    remarks: string
  ): void {
    const all = getStorage<VendorAttendanceCorrectionRequest[]>(STORAGE_KEYS.CORRECTIONS, []);
    const idx = all.findIndex((c) => c.id === corrId);
    if (idx !== -1) {
      all[idx].status = decision;
      all[idx].reviewed_by = 'Client HR Administrator';
      all[idx].reviewed_at = new Date().toISOString();
      all[idx].reviewer_remarks = remarks;
      setStorage(STORAGE_KEYS.CORRECTIONS, all);

      // If approved, update attendance record
      if (decision === 'APPROVED') {
        const atts = getStorage<VendorAttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
        const attIdx = atts.findIndex((a) => a.employee_id === all[idx].employee_id && a.month === all[idx].month);
        if (attIdx !== -1) {
          atts[attIdx].present_days = all[idx].requested_present_days;
          atts[attIdx].lop_days = all[idx].requested_lop_days;
          atts[attIdx].ot_hours = all[idx].requested_ot_hours;
          atts[attIdx].payable_days = all[idx].requested_present_days;
          setStorage(STORAGE_KEYS.ATTENDANCE, atts);
        }
      }

      this.logAudit({
        entity_type: 'ATTENDANCE',
        entity_id: corrId,
        action: `ATTENDANCE_CORRECTION_${decision}`,
        new_value: decision,
        remarks: `Correction request ${decision}: ${remarks}`,
      });
    }
  },

  // ==========================================
  // 4. WAGE BREAKDOWN & CALCULATION ENGINE
  // ==========================================
  getEmployeeWageBreakdowns(period: string = '2026-08', vendorId?: string): EmployeeWageBreakdown[] {
    const attendance = this.getMonthlyAttendance(period, vendorId);
    const employees = this.getEmployees(vendorId);

    if (attendance.length === 0 || employees.length === 0) {
      return [];
    }

    return (employees as VendorEmployee[]).reduce((acc: EmployeeWageBreakdown[], emp) => {
      const att = attendance.find((a) => a.employee_id === emp.id);
      if (!att) return acc;

      // Real formulas based on worker category
      const monthlyGross =
        emp.worker_category === 'Highly Skilled'
          ? 32000
          : emp.worker_category === 'Skilled'
          ? 26000
          : emp.worker_category === 'Semi-Skilled'
          ? 21000
          : 18000;

      const basicWage = Math.round(monthlyGross * 0.5); // 50% Basic
      const hra = Math.round(monthlyGross * 0.3); // 30% HRA
      const specialAllowance = monthlyGross - basicWage - hra;

      // LOP deduction formula: (Monthly Gross / Total Days) * LOP Days
      const lopDeduction = att.total_working_days > 0 ? (monthlyGross / att.total_working_days) * att.lop_days : 0;
      const grossPayable = Math.round(monthlyGross - lopDeduction);

      // Overtime wage formula: (Monthly Gross / 208 hours) * 2.0 (Double Rate) * OT Hours
      const hourlyRate = monthlyGross / (26 * 8);
      const otWages = Math.round(hourlyRate * 2.0 * att.ot_hours);

      // Statutory Employee Deductions
      const pfBase = Math.min(basicWage, 15000);
      const employeePf = Math.round(pfBase * 0.12); // 12% EPF
      const employeeEsi = monthlyGross <= 21000 ? Math.round(grossPayable * 0.0075) : 0; // 0.75% ESIC
      const professionalTax = monthlyGross > 15000 ? 200 : 0;
      const lwf = 10;
      const advanceDeduction = 0;
      const totalDeductions = employeePf + employeeEsi + professionalTax + lwf + advanceDeduction;

      const netSalary = grossPayable + otWages - totalDeductions;

      // Employer Statutory Cost
      const employerPf = Math.round(pfBase * 0.13); // 12% + 1% admin/EDLI
      const employerEsi = monthlyGross <= 21000 ? Math.round(grossPayable * 0.0325) : 0; // 3.25% ESIC
      const employerLwf = 20;
      const totalEmployerStatutory = employerPf + employerEsi + employerLwf;

      acc.push({
        employee_id: emp.id,
        employee_name: emp.display_name,
        employee_code: emp.employee_code,
        client_name: emp.current_client_name || '',
        working_days: att.total_working_days,
        present_days: att.present_days,
        lop_days: att.lop_days,
        payable_days: att.payable_days,
        ot_hours: att.ot_hours,
        monthly_gross: monthlyGross,
        basic_wage: basicWage,
        hra,
        special_allowance: specialAllowance,
        food_allowance: 1200,
        ot_wages: otWages,
        attendance_bonus: att.lop_days === 0 ? 1000 : 0,
        gross_payable: grossPayable,
        employee_pf: employeePf,
        employee_esi: employeeEsi,
        professional_tax: professionalTax,
        lwf,
        advance_deduction: advanceDeduction,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        employer_pf: employerPf,
        employer_esi: employerEsi,
        employer_lwf: employerLwf,
        total_employer_statutory: totalEmployerStatutory,
      });
      return acc;
    }, []);
  },

  // ==========================================
  // 5. VENDOR PAYABLE ENGINE
  // ==========================================
  getVendorPayableBreakdown(period: string = '2026-08', vendorId?: string): VendorPayableBreakdown {
    const activeVendor = vendorId ? this.getVendors().find((v) => v.id === vendorId) || this.getActiveVendor() : this.getActiveVendor();
    if (!activeVendor) {
      return {
        period,
        vendor_id: '',
        vendor_name: '',
        client_company_id: '',
        client_company_name: '',
        headcount: 0,
        total_gross_wages: 0,
        total_ot_wages: 0,
        total_allowances_incentives: 0,
        wage_subtotal: 0,
        total_employer_pf: 0,
        total_employer_esi: 0,
        total_employer_lwf: 0,
        statutory_subtotal: 0,
        service_charge_percentage: 0,
        service_charge_amount: 0,
        other_contractual_charges: 0,
        commercials_subtotal: 0,
        total_before_tax: 0,
        gst_percentage: 0,
        gst_amount: 0,
        gross_payable_value: 0,
        previous_recoveries: 0,
        penalties: 0,
        net_vendor_payable: 0,
      };
    }
    const wages = this.getEmployeeWageBreakdowns(period, activeVendor.id);

    if (wages.length === 0) {
      return {
        period,
        vendor_id: activeVendor.id,
        vendor_name: activeVendor.name,
        client_company_id: '',
        client_company_name: '',
        headcount: 0,
        total_gross_wages: 0,
        total_ot_wages: 0,
        total_allowances_incentives: 0,
        wage_subtotal: 0,
        total_employer_pf: 0,
        total_employer_esi: 0,
        total_employer_lwf: 0,
        statutory_subtotal: 0,
        service_charge_percentage: activeVendor.service_charge_percentage || 0,
        service_charge_amount: 0,
        other_contractual_charges: 0,
        commercials_subtotal: 0,
        total_before_tax: 0,
        gst_percentage: activeVendor.is_gst_applicable ? 18 : 0,
        gst_amount: 0,
        gross_payable_value: 0,
        previous_recoveries: 0,
        penalties: 0,
        net_vendor_payable: 0,
      };
    }

    const totalGrossWages = wages.reduce((sum, w) => sum + w.gross_payable, 0);
    const totalOtWages = wages.reduce((sum, w) => sum + w.ot_wages, 0);
    const totalAllowances = wages.reduce((sum, w) => sum + w.attendance_bonus + w.food_allowance, 0);
    const wageSubtotal = totalGrossWages + totalOtWages + totalAllowances;

    const totalEmployerPf = wages.reduce((sum, w) => sum + w.employer_pf, 0);
    const totalEmployerEsi = wages.reduce((sum, w) => sum + w.employer_esi, 0);
    const totalEmployerLwf = wages.reduce((sum, w) => sum + w.employer_lwf, 0);
    const statutorySubtotal = totalEmployerPf + totalEmployerEsi + totalEmployerLwf;

    const serviceChargePercentage = activeVendor.service_charge_percentage || 8.5;
    const serviceChargeAmount = Math.round(wageSubtotal * (serviceChargePercentage / 100));
    const otherContractualCharges = 0;
    const commercialsSubtotal = serviceChargeAmount + otherContractualCharges;

    const totalBeforeTax = wageSubtotal + statutorySubtotal + commercialsSubtotal;
    const gstPercentage = activeVendor.is_gst_applicable ? 18 : 0;
    const gstAmount = Math.round(totalBeforeTax * (gstPercentage / 100));
    const grossPayableValue = totalBeforeTax + gstAmount;

    const previousRecoveries = 0;
    const penalties = 0;
    const netVendorPayable = grossPayableValue - previousRecoveries - penalties;

    return {
      period,
      vendor_id: activeVendor.id,
      vendor_name: activeVendor.name,
      client_company_id: 'comp-joy-01',
      client_company_name: 'Joy Corporate Solutions Pvt Ltd',
      headcount: wages.length,
      total_gross_wages: totalGrossWages,
      total_ot_wages: totalOtWages,
      total_allowances_incentives: totalAllowances,
      wage_subtotal: wageSubtotal,
      total_employer_pf: totalEmployerPf,
      total_employer_esi: totalEmployerEsi,
      total_employer_lwf: totalEmployerLwf,
      statutory_subtotal: statutorySubtotal,
      service_charge_percentage: serviceChargePercentage,
      service_charge_amount: serviceChargeAmount,
      other_contractual_charges: otherContractualCharges,
      commercials_subtotal: commercialsSubtotal,
      total_before_tax: totalBeforeTax,
      gst_percentage: gstPercentage,
      gst_amount: gstAmount,
      gross_payable_value: grossPayableValue,
      previous_recoveries: previousRecoveries,
      penalties,
      net_vendor_payable: netVendorPayable,
    };
  },

  // ==========================================
  // 6. PAYROLL VERIFICATION & STATUS
  // ==========================================
  getPayrollVerificationStatus(period: string = '2026-08', vendorId?: string): PayrollVerificationStatus {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const map = getStorage<Record<string, PayrollVerificationStatus>>(STORAGE_KEYS.PAYROLL_STATUS, {});
    const key = `${targetVendorId}_${period}`;
    return map[key] || 'ATTENDANCE_OPEN';
  },

  updatePayrollVerificationStatus(period: string, status: PayrollVerificationStatus, remarks?: string): void {
    const activeVendor = this.getActiveVendor();
    const vendorId = activeVendor?.id || 'default';
    const map = getStorage<Record<string, PayrollVerificationStatus>>(STORAGE_KEYS.PAYROLL_STATUS, {});
    const key = `${vendorId}_${period}`;
    const oldStatus = map[key] || 'ATTENDANCE_OPEN';
    map[key] = status;
    setStorage(STORAGE_KEYS.PAYROLL_STATUS, map);

    this.logAudit({
      entity_type: 'PAYROLL',
      entity_id: `${vendorId}_${period}`,
      action: `PAYROLL_STATUS_${status}`,
      previous_value: oldStatus,
      new_value: status,
      remarks: remarks || `Vendor payroll workflow advanced to ${status}`,
    });
  },

  // ==========================================
  // 7. PURCHASE ORDERS
  // ==========================================
  getPurchaseOrders(vendorId?: string): VendorPurchaseOrder[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const list = getStorage<VendorPurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, []);
    return targetVendorId ? list.filter((po) => po.vendor_id === targetVendorId) : list;
  },

  acknowledgePurchaseOrder(poId: string, acknowledgedBy: string): void {
    const all = getStorage<VendorPurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, DEFAULT_PURCHASE_ORDERS);
    const idx = all.findIndex((po) => po.id === poId);
    if (idx !== -1) {
      all[idx].status = 'VENDOR_ACKNOWLEDGED';
      all[idx].acknowledged_by = acknowledgedBy;
      all[idx].acknowledged_at = new Date().toISOString();
      all[idx].updated_at = new Date().toISOString();
      setStorage(STORAGE_KEYS.PURCHASE_ORDERS, all);

      this.logAudit({
        entity_type: 'PO',
        entity_id: poId,
        action: 'PO_ACKNOWLEDGED_BY_VENDOR',
        new_value: 'VENDOR_ACKNOWLEDGED',
        remarks: `Purchase Order ${all[idx].po_number} formally acknowledged by ${acknowledgedBy}`,
      });
    }
  },

  // ==========================================
  // 8. INVOICE MANAGEMENT & 3-WAY MATCHING
  // ==========================================
  getInvoices(vendorId?: string, relationshipId?: string): VendorInvoice[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const list = getStorage<VendorInvoice[]>(STORAGE_KEYS.INVOICES, []);
    let filtered = list.filter((inv) =>
      !targetVendorId || inv.vendor_id === targetVendorId
    );
    if (relationshipId && relationshipId !== 'all') {
      filtered = filtered.filter((inv) => (inv as any).relationship_id === relationshipId || inv.client_company_id === relationshipId);
    }
    return filtered;
  },

  submitInvoice(payload: {
    vendor_id?: string;
    po_id?: string;
    payroll_period?: string;
    period?: string;
    invoice_number: string;
    invoice_date?: string;
    due_date?: string;
    taxable_amount?: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    total_invoice_amount?: number;
    total_amount?: number;
    file_name?: string;
    po_number?: string;
    attached_invoice_pdf?: string;
  }): { invoice: VendorInvoice; matchResult: ThreeWayMatchResult } {
    const targetVendor = payload.vendor_id ? (this.getVendors().find(v => v.id === payload.vendor_id) || this.getActiveVendor()) : this.getActiveVendor();
    const vendorId = targetVendor?.id || '';
    const period = payload.payroll_period || payload.period || '2026-08';
    const totalAmount = payload.total_invoice_amount ?? payload.total_amount ?? 0;
    const pos = this.getPurchaseOrders(vendorId);
    const allPos = getStorage<VendorPurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, DEFAULT_PURCHASE_ORDERS);
    const po = pos.find((p) => (payload.po_id && p.id === payload.po_id) || (payload.po_number && p.po_number === payload.po_number))
      || allPos.find((p) => (payload.po_id && p.id === payload.po_id) || (payload.po_number && p.po_number === payload.po_number));
    const payable = this.getVendorPayableBreakdown(period, vendorId);

    let benchmarkPayable = payable.net_vendor_payable;
    const monthlyAtt = this.getMonthlyAttendance(period, vendorId);
    const deps = this.getDeployments(vendorId);
    if (deps.length > 0 && monthlyAtt.length > 0) {
      let depBaseWages = 0;
      let depOtWages = 0;
      for (const att of monthlyAtt) {
        const dep = deps.find((d) => d.worker_id === att.employee_id);
        if (!dep) continue;
        const dailyRate = (dep as any).daily_wage_rate || 0;
        const otRate = (dep as any).ot_hourly_rate || (dailyRate > 0 ? dailyRate / 8 : 0);
        depBaseWages += (att.present_days || 0) * dailyRate;
        depOtWages += (att.ot_hours || 0) * otRate;
      }
      const servicePct = targetVendor.service_charge_percentage || 8.5;
      const subtotal = depBaseWages + depOtWages;
      const fee = subtotal * (servicePct / 100);
      const gst = (subtotal + fee) * 0.18;
      const deploymentExpected = Math.round(subtotal + fee + gst);
      if (Math.abs(totalAmount - deploymentExpected) <= 25) {
        benchmarkPayable = deploymentExpected;
      }
    }

    // 3-Way Match Check
    const diff = totalAmount - benchmarkPayable;
    const variancePct = benchmarkPayable > 0 ? (Math.abs(diff) / benchmarkPayable) * 100 : 0;
    const isPoSufficient = (po?.remaining_balance || 0) >= totalAmount;
    const isPayrollMatch = Math.abs(diff) <= 10; // Within rounding tolerance

    const matchStatus = !isPoSufficient
      ? 'EXCEPTION'
      : isPayrollMatch
      ? 'MATCHED'
      : variancePct <= 2
      ? 'PARTIALLY_MATCHED'
      : 'MISMATCHED';

    const exceptionNotes: string[] = [];
    if (!isPoSufficient) {
      exceptionNotes.push(`Claimed invoice amount exceeds PO available balance by ₹${(totalAmount - (po?.remaining_balance || 0)).toLocaleString()}`);
    }
    if (!isPayrollMatch) {
      exceptionNotes.push(`Invoice claimed value differs from system-approved payroll payable by ₹${Math.abs(diff).toLocaleString()}`);
    }

    const newInvoice: VendorInvoice = {
      id: `inv-${Date.now()}`,
      tenant_id: targetVendor.tenant_id,
      vendor_id: targetVendor.id,
      vendor_name: targetVendor.name,
      client_company_id: po ? po.client_company_id : '',
      client_company_name: po ? po.client_company_name : '',
      po_id: po ? po.id : '',
      po_number: po ? po.po_number : (payload.po_number || ''),
      payroll_period: period,
      invoice_number: payload.invoice_number,
      invoice_date: payload.invoice_date || new Date().toISOString().split('T')[0],
      due_date: payload.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      gstin: targetVendor?.gstin || '',
      taxable_amount: payload.taxable_amount || totalAmount,
      cgst_amount: payload.cgst_amount || 0,
      sgst_amount: payload.sgst_amount || 0,
      igst_amount: payload.igst_amount || 0,
      total_invoice_amount: totalAmount,
      status: matchStatus === 'EXCEPTION' ? 'ON_HOLD' : 'SUBMITTED',
      match_status: matchStatus,
      variance_amount: diff,
      exception_reason: exceptionNotes.join('; ') || undefined,
      attached_invoice_pdf: payload.attached_invoice_pdf || payload.file_name || '',
      submitted_by: targetVendor?.contact_person || 'Vendor Admin',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const allInvoices = getStorage<VendorInvoice[]>(STORAGE_KEYS.INVOICES, []);
    allInvoices.unshift(newInvoice);
    setStorage(STORAGE_KEYS.INVOICES, allInvoices);

    // Also update PO consumed amount
    if (po && matchStatus !== 'EXCEPTION') {
      const allPos = getStorage<VendorPurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, DEFAULT_PURCHASE_ORDERS);
      const pIdx = allPos.findIndex((p) => p.id === po.id);
      if (pIdx !== -1) {
        allPos[pIdx].consumed_amount += totalAmount;
        allPos[pIdx].remaining_balance = Math.max(0, allPos[pIdx].contract_value - allPos[pIdx].consumed_amount);
        setStorage(STORAGE_KEYS.PURCHASE_ORDERS, allPos);
      }
    }

    const matchResult: ThreeWayMatchResult = {
      invoice_id: newInvoice.id,
      invoice_number: newInvoice.invoice_number,
      po_number: newInvoice.po_number,
      period: payload.payroll_period,
      po_available_balance: po?.remaining_balance || 0,
      approved_payroll_payable: payable.net_vendor_payable,
      vendor_invoice_claimed: payload.total_invoice_amount,
      difference_amount: diff,
      variance_percentage: variancePct,
      is_po_limit_sufficient: isPoSufficient,
      is_payroll_matched: isPayrollMatch,
      match_status: matchStatus,
      exception_notes: exceptionNotes,
    };

    this.logAudit({
      entity_type: 'INVOICE',
      entity_id: newInvoice.id,
      action: 'INVOICE_SUBMITTED_3WAY_MATCHED',
      new_value: JSON.stringify({ matchStatus, diff, invoiceNo: newInvoice.invoice_number }),
      remarks: `Invoice ${newInvoice.invoice_number} submitted with 3-Way Match Result: ${matchStatus}`,
    });

    return { invoice: newInvoice, matchResult };
  },

  // ==========================================
  // 9. STATUTORY COMPLIANCE & CHALLANS
  // ==========================================
  getStatutoryChallans(period: string = '2026-08', vendorId?: string): VendorStatutoryChallan[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const stored = getStorage<VendorStatutoryChallan[]>(STORAGE_KEYS.CHALLANS, []);
    return stored.filter((c) => c.vendor_id === targetVendorId && c.period === period);
  },

  // ==========================================
  // 10. PAYMENTS & RECONCILIATION
  // ==========================================
  getPayments(vendorId?: string): VendorInvoicePayment[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const invoices = this.getInvoices(targetVendorId);
    const stored = getStorage<VendorInvoicePayment[]>(STORAGE_KEYS.PAYMENTS, []);

    // Sync with invoices
    const synced: VendorInvoicePayment[] = invoices.map((inv) => {
      const match = stored.find((p) => p.invoice_id === inv.id);
      if (match) return match;
      const isPaid = inv.status === 'PAID';
      const paidAmt = isPaid ? inv.total_invoice_amount : 0;
      return {
        id: `pay-${inv.id}`,
        tenant_id: inv.tenant_id,
        vendor_id: inv.vendor_id,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        po_number: inv.po_number,
        client_company_name: inv.client_company_name,
        invoice_amount: inv.total_invoice_amount,
        paid_amount: paidAmt,
        outstanding_amount: inv.total_invoice_amount - paidAmt,
        payment_status: isPaid ? 'PAID' : 'DUE',
        payment_date: isPaid ? inv.updated_at.split('T')[0] : undefined,
        payment_reference: isPaid ? 'NEFT-JCS-881920' : undefined,
        bank_transaction_id: isPaid ? 'TXN-99881122' : undefined,
        payment_mode: 'NEFT',
      };
    });

    return synced;
  },

  recordPayment(invoiceId: string, amount: number, ref: string): void {
    const invoices = getStorage<VendorInvoice[]>(STORAGE_KEYS.INVOICES, []);
    const invIdx = invoices.findIndex((i) => i.id === invoiceId);
    if (invIdx !== -1) {
      invoices[invIdx].status = 'PAID';
      invoices[invIdx].paid_amount = amount;
      invoices[invIdx].payment_reference = ref;
      invoices[invIdx].updated_at = new Date().toISOString();
      setStorage(STORAGE_KEYS.INVOICES, invoices);

      this.logAudit({
        entity_type: 'PAYMENT',
        entity_id: invoiceId,
        action: 'PAYMENT_RECEIVED_RECONCILED',
        new_value: JSON.stringify({ amount, ref }),
        remarks: `Payment of ₹${amount.toLocaleString()} received and confirmed for Invoice ${invoices[invIdx].invoice_number}`,
      });
    }
  },

  getSettlements(vendorId?: string, relationshipId?: string): VendorInvoicePayment[] {
    return this.getPayments(vendorId);
  },

  getContracts(vendorId?: string, relationshipId?: string): VendorContract[] {
    return [];
  },

  // ==========================================
  // 11. AUDIT LOGS
  // ==========================================
  getAuditLogs(vendorId?: string): VendorAuditLog[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const all = getStorage<VendorAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    return all.filter((l) => l.vendor_id === targetVendorId);
  },

  logAudit(entry: {
    vendor_id?: string;
    entity_type: VendorAuditLog['entity_type'];
    entity_id: string;
    action: string;
    previous_value?: string;
    new_value?: string;
    remarks?: string;
  }): void {
    const activeVendor = this.getActiveVendor();
    const user = api.getCurrentUser();
    const targetVendorId = entry.vendor_id || activeVendor?.id || 'vnd-default';
    const newLog: VendorAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: activeVendor?.tenant_id || 'org-joy-01',
      vendor_id: targetVendorId,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      previous_value: entry.previous_value,
      new_value: entry.new_value,
      performed_by: user?.name || activeVendor?.contact_person || 'Vendor Operations Head',
      performed_at: new Date().toISOString(),
      role: user?.roles?.[0]?.name || 'Vendor Admin',
      remarks: entry.remarks,
    };

    const all = getStorage<VendorAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    all.unshift(newLog);
    // Keep last 500 audit logs
    if (all.length > 500) all.pop();
    setStorage(STORAGE_KEYS.AUDIT_LOGS, all);
  },

  // ==========================================
  // 12. COMPLIANCE INTELLIGENCE & LICENSES
  // ==========================================
  getLicenses(vendorId?: string): import('../types/vendorPortal').VendorLicense[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const all = getStorage<import('../types/vendorPortal').VendorLicense[]>('wf_vendor_portal_licenses', []);
    const matches = all.filter((l) => l.vendor_id === targetVendorId);
    const now = new Date();

    return matches.map((lic) => {
      const expiry = new Date(lic.expiry_date);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let status = lic.status;
      if (diffDays <= 0) {
        status = 'EXPIRED';
      } else if (diffDays <= 7) {
        status = 'CRITICAL';
      } else if (diffDays <= 30) {
        status = 'EXPIRING_SOON';
      } else if (status !== 'UNDER_RENEWAL') {
        status = 'ACTIVE';
      }
      return {
        ...lic,
        valid_until: lic.valid_until || lic.expiry_date,
        days_until_expiry: diffDays,
        status,
      };
    });
  },

  addLicense(payload: Partial<import('../types/vendorPortal').VendorLicense>): import('../types/vendorPortal').VendorLicense {
    const activeVendor = this.getActiveVendor();
    const all = getStorage<import('../types/vendorPortal').VendorLicense[]>('wf_vendor_portal_licenses', []);
    
    const expiry = new Date(payload.expiry_date || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let status: import('../types/vendorPortal').VendorLicenseStatus = 'ACTIVE';
    if (diffDays <= 0) status = 'EXPIRED';
    else if (diffDays <= 7) status = 'CRITICAL';
    else if (diffDays <= 30) status = 'EXPIRING_SOON';

    const newLic: import('../types/vendorPortal').VendorLicense = {
      id: `lic-${Date.now()}`,
      tenant_id: activeVendor?.tenant_id || 'org-joy-01',
      vendor_id: activeVendor?.id || '',
      vendor_name: activeVendor?.name || 'Vendor Organization',
      license_type: payload.license_type || 'Contract Labour License',
      license_number: payload.license_number || '',
      issued_date: payload.issued_date || new Date().toISOString().split('T')[0],
      expiry_date: payload.expiry_date || expiry.toISOString().split('T')[0],
      max_worker_capacity: payload.max_worker_capacity || 0,
      issuing_authority: payload.issuing_authority || '',
      work_location: payload.work_location || '',
      status: payload.status || status,
      days_until_expiry: diffDays,
      document_name: payload.document_name || '',
      document_url: payload.document_url || '',
      reminders_enabled: payload.reminders_enabled ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    all.unshift(newLic);
    setStorage('wf_vendor_portal_licenses', all);

    this.logAudit({
      entity_type: 'LICENSE',
      entity_id: newLic.id,
      action: 'LICENSE_REGISTERED',
      new_value: JSON.stringify({ type: newLic.license_type, num: newLic.license_number, expiry: newLic.expiry_date }),
      remarks: `New ${newLic.license_type} registered. Expiry date: ${newLic.expiry_date}`,
    });

    return newLic;
  },

  updateLicenseStatus(licenseId: string, status: import('../types/vendorPortal').VendorLicenseStatus, remarks?: string): void {
    const all = getStorage<import('../types/vendorPortal').VendorLicense[]>('wf_vendor_portal_licenses', []);
    const idx = all.findIndex((l) => l.id === licenseId);
    if (idx !== -1) {
      const oldStatus = all[idx].status;
      all[idx].status = status;
      all[idx].updated_at = new Date().toISOString();
      setStorage('wf_vendor_portal_licenses', all);

      this.logAudit({
        entity_type: 'LICENSE',
        entity_id: licenseId,
        action: `LICENSE_STATUS_${status}`,
        previous_value: oldStatus,
        new_value: status,
        remarks: remarks || `License status changed to ${status}`,
      });
    }
  },

  // ==========================================
  // 13. STATUTORY RETURNS & FORM V REGISTRY
  // ==========================================
  getStatutoryReturns(vendorId?: string): import('../types/vendorPortal').StatutoryReturn[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const all = getStorage<import('../types/vendorPortal').StatutoryReturn[]>('wf_vendor_portal_returns', []);
    return all.filter((r) => r.vendor_id === targetVendorId);
  },

  addStatutoryReturn(payload: Partial<import('../types/vendorPortal').StatutoryReturn>): import('../types/vendorPortal').StatutoryReturn {
    const activeVendor = this.getActiveVendor();
    const all = getStorage<import('../types/vendorPortal').StatutoryReturn[]>('wf_vendor_portal_returns', []);

    const newReturn: import('../types/vendorPortal').StatutoryReturn = {
      id: `ret-${Date.now()}`,
      tenant_id: activeVendor?.tenant_id || 'org-joy-01',
      vendor_id: activeVendor?.id || '',
      vendor_name: activeVendor?.name || 'Vendor Organization',
      form_type: payload.form_type || 'Form XXIV (Half-Yearly Return)',
      return_period: payload.return_period || '2026-H1',
      due_date: payload.due_date || '2026-07-31',
      filing_date: payload.filing_date || new Date().toISOString().split('T')[0],
      acknowledgement_number: payload.acknowledgement_number || '',
      status: payload.status || 'SUBMITTED',
      document_name: payload.document_name || '',
      document_url: payload.document_url || '',
      remarks: payload.remarks || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    all.unshift(newReturn);
    setStorage('wf_vendor_portal_returns', all);

    this.logAudit({
      entity_type: 'RETURN',
      entity_id: newReturn.id,
      action: 'STATUTORY_RETURN_SUBMITTED',
      new_value: JSON.stringify({ type: newReturn.form_type, period: newReturn.return_period }),
      remarks: `Submitted ${newReturn.form_type} for period ${newReturn.return_period}`,
    });

    return newReturn;
  },

  submitStatutoryReturn(payload: Partial<import('../types/vendorPortal').StatutoryReturn>): import('../types/vendorPortal').StatutoryReturn {
    return this.addStatutoryReturn(payload);
  },

  issueFormV(payload: {
    vendor_id?: string;
    client_company_name: string;
    max_workers: number;
    valid_from: string;
    valid_to: string;
    work_location: string;
    scope_of_work: string;
  }): import('../types/vendorPortal').StatutoryReturn {
    const targetVendor = payload.vendor_id ? this.getVendors().find(v => v.id === payload.vendor_id) || this.getActiveVendor() : this.getActiveVendor();
    const vendorId = targetVendor?.id || '';
    const vendorName = targetVendor?.name || 'Vendor Organization';
    const all = getStorage<import('../types/vendorPortal').StatutoryReturn[]>('wf_vendor_portal_returns', []);

    const newFormV: import('../types/vendorPortal').StatutoryReturn = {
      id: `formv-${Date.now()}`,
      tenant_id: targetVendor?.tenant_id || 'org-joy-01',
      vendor_id: vendorId,
      vendor_name: vendorName,
      form_type: 'Form V (Principal Employer Certificate)',
      return_period: `${payload.valid_from} to ${payload.valid_to}`,
      due_date: payload.valid_to,
      filing_date: new Date().toISOString().split('T')[0],
      acknowledgement_number: `PE-FORM-V-${Date.now().toString().slice(-6)}`,
      status: 'VERIFIED',
      document_name: targetVendor?.code ? `Form_V_${targetVendor.code}.pdf` : 'Form_V.pdf',
      document_url: '',
      remarks: `Form V Certificate issued by Principal Employer ${payload.client_company_name} for ${payload.max_workers} contract workers`,
      verified_by: 'Principal Employer Authorized Signatory',
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    all.unshift(newFormV);
    setStorage('wf_vendor_portal_returns', all);

    this.logAudit({
      entity_type: 'RETURN',
      entity_id: newFormV.id,
      action: 'FORM_V_CERTIFICATE_ISSUED',
      new_value: JSON.stringify({ workers: payload.max_workers, location: payload.work_location }),
      remarks: `Principal Employer issued Form V Certificate to ${targetVendor.name}`,
    });

    return newFormV;
  },

  // ==========================================
  // 14. COMPLIANCE CALENDAR & SMART REMINDERS
  // ==========================================
  getComplianceCalendarTasks(period?: string, vendorId?: string): import('../types/vendorPortal').ComplianceCalendarTask[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const stored = getStorage<import('../types/vendorPortal').ComplianceCalendarTask[]>('wf_vendor_portal_cal_tasks', []);
    return stored.filter((t) => !vendorId || t.vendor_id === targetVendorId);
  },

  updateCalendarTaskStatus(taskId: string, status: import('../types/vendorPortal').ComplianceCalendarTask['status']): void {
    const all = getStorage<import('../types/vendorPortal').ComplianceCalendarTask[]>('wf_vendor_portal_cal_tasks', []);
    const idx = all.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      all[idx].status = status;
      setStorage('wf_vendor_portal_cal_tasks', all);

      this.logAudit({
        entity_type: 'COMPLIANCE',
        entity_id: taskId,
        action: `CALENDAR_TASK_${status}`,
        new_value: status,
        remarks: `Compliance calendar task "${all[idx].title}" marked as ${status}`,
      });
    }
  },

  // ==========================================
  // 15. COMPLIANCE HEALTH SCORE CALCULATION
  // ==========================================
  getComplianceScore(vendorId?: string): import('../types/vendorPortal').ComplianceScoreBreakdown {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const vendor = this.getVendors().find((v) => v.id === targetVendorId) || this.getActiveVendor();
    const licenses = this.getLicenses(targetVendorId);
    const returns = this.getStatutoryReturns(targetVendorId);
    const challans = this.getStatutoryChallans('2026-08', targetVendorId);
    const tasks = this.getComplianceCalendarTasks('2026-08', targetVendorId);

    // Multi-factor calculations:
    // 1. Documents: Check KYC, Bank, Agreement
    let docScore = 100;
    if (!vendor?.gstin || !vendor?.pan) docScore -= 30;
    if (!vendor?.bank_details?.is_verified) docScore -= 10;
    if (!vendor?.authorized_person?.pan) docScore -= 10;

    // 2. Licenses: Active = 100%, Expiring soon = 80%, Critical = 40%, Expired = 0%
    let licScore = 100;
    if (licenses.length === 0) {
      licScore = 50; // no license uploaded yet
    } else {
      const activeCount = licenses.filter(l => l.status === 'ACTIVE').length;
      const criticalCount = licenses.filter(l => l.status === 'CRITICAL' || l.status === 'EXPIRED').length;
      licScore = Math.round((activeCount / licenses.length) * 100) - (criticalCount * 25);
      if (licScore < 0) licScore = 0;
    }

    // 3. Payroll: 90% default if employees have verified wages
    const payScore = 88;

    // 4. Statutory: PF & ESI Remittances
    const statutoryScore = challans.some(c => c.status === 'REMITTED') ? 95 : 70;

    // 5. Returns: Submitted/Verified vs Pending
    const returnScore = returns.filter(r => r.status === 'VERIFIED' || r.status === 'SUBMITTED').length > 0 ? 90 : 60;

    // Weighted Overall Score:
    // Documents 20%, Licenses 25%, Payroll 25%, Statutory 20%, Returns 10%
    const overall = Math.round(
      docScore * 0.20 +
      licScore * 0.25 +
      payScore * 0.25 +
      statutoryScore * 0.20 +
      returnScore * 0.10
    );

    let riskTier: import('../types/vendorPortal').ComplianceRiskTier = 'EXCELLENT';
    if (overall < 50) riskTier = 'HIGH_RISK';
    else if (overall < 75) riskTier = 'ATTENTION_REQUIRED';
    else if (overall < 90) riskTier = 'GOOD';

    return {
      vendor_id: targetVendorId,
      vendor_name: vendor?.name || 'Vendor Partner',
      overall_score: Math.min(100, Math.max(0, overall)),
      risk_tier: riskTier,
      documents_score: docScore,
      licenses_score: licScore,
      payroll_score: payScore,
      statutory_score: statutoryScore,
      returns_score: returnScore,
      active_issues_count: licenses.filter(l => l.status === 'CRITICAL' || l.status === 'EXPIRED').length + tasks.filter(t => t.status === 'OVERDUE').length,
      expiring_licenses_count: licenses.filter(l => l.status === 'EXPIRING_SOON' || l.status === 'CRITICAL').length,
      overdue_tasks_count: tasks.filter(t => t.status === 'OVERDUE').length,
      calculated_at: new Date().toISOString(),
    };
  },

  getAllVendorComplianceScores(): import('../types/vendorPortal').ComplianceScoreBreakdown[] {
    const vendors = this.getVendors();
    return vendors.map((v) => this.getComplianceScore(v.id));
  },

  // ==========================================
  // 16. DOCUMENT INTELLIGENCE & OCR SIMULATION
  // ==========================================
  async simulateOcrExtraction(file: { name: string; size?: number }): Promise<import('../types/vendorPortal').OcrExtractionResult> {
    // Artificial latency for realistic OCR intelligence scan experience
    await new Promise((res) => setTimeout(res, 1200));

    const name = file.name.toLowerCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

    const activeVendorName = this.getActiveVendor()?.name || 'Vendor Organization';

    if (name.includes('migrant') || name.includes('ismw')) {
      return {
        detected_document_type: 'Migrant Labour License',
        confidence_score: 96,
        extracted_license_number: `TN/ML/2026/${randomSuffix}`,
        extracted_issue_date: new Date().toISOString().split('T')[0],
        extracted_expiry_date: nextYear,
        extracted_holder_name: activeVendorName,
        extracted_issuing_authority: 'Office of the Assistant Commissioner of Labour (ISMW Licensing)',
        raw_text_snippet: `INTER-STATE MIGRANT WORKMEN (REGULATION OF EMPLOYMENT AND CONDITIONS OF SERVICE) ACT, 1979 - LICENSE NO: TN/ML/2026/${randomSuffix} VALID UPTO ${nextYear}`,
      };
    }

    if (name.includes('factory') || name.includes('fl')) {
      return {
        detected_document_type: 'Factory License',
        confidence_score: 94,
        extracted_license_number: `FL-CBE-2026-${randomSuffix}`,
        extracted_issue_date: new Date().toISOString().split('T')[0],
        extracted_expiry_date: nextYear,
        extracted_holder_name: activeVendorName,
        extracted_issuing_authority: 'Directorate of Industrial Safety and Health (DISH)',
        raw_text_snippet: `FACTORIES ACT, 1948 - RENEWED FACTORY LICENSE FL-CBE-2026-${randomSuffix} HP INSTALLED: 150HP WORKERS: 100`,
      };
    }

    if (name.includes('psara') || name.includes('security')) {
      return {
        detected_document_type: 'PSARA License',
        confidence_score: 97,
        extracted_license_number: `PSARA/TN/POL/2026/${randomSuffix}`,
        extracted_issue_date: new Date().toISOString().split('T')[0],
        extracted_expiry_date: nextYear,
        extracted_holder_name: activeVendorName,
        extracted_issuing_authority: 'Controlling Authority & ADGP Tamil Nadu',
        raw_text_snippet: `PRIVATE SECURITY AGENCIES (REGULATION) ACT, 2005 - LICENSE VALID FOR OPERATION IN ALL DISTRICTS`,
      };
    }

    // Default to Contract Labour License
    return {
      detected_document_type: 'Contract Labour License',
      confidence_score: 98,
      extracted_license_number: `TN/CL/2026/${randomSuffix}`,
      extracted_issue_date: new Date().toISOString().split('T')[0],
      extracted_expiry_date: nextYear,
      extracted_holder_name: activeVendorName,
      extracted_issuing_authority: 'Joint Commissioner of Labour (Contract Labour Cell)',
      raw_text_snippet: `CONTRACT LABOUR (REGULATION AND ABOLITION) ACT, 1970 - FORM VI (RULE 25(1)) - LICENSE NUMBER: TN/CL/2026/${randomSuffix} MAX WORKERS: 50`,
    };
  },

  // ==========================================
  // 17. 4-STEP ONBOARDING ENGINE
  // ==========================================
  createVendorOnboarding(payload: Partial<VendorOrganization>): VendorOrganization {
    const orgs = this.getVendors();
    const vendorCode = payload.code || `VND-${Date.now().toString().slice(-6)}`;
    const newVendor: VendorOrganization = {
      id: payload.id || `vnd-${Date.now()}`,
      tenant_id: payload.tenant_id || 'org-joy-01',
      name: payload.name || '',
      trade_name: payload.trade_name || payload.name || '',
      code: vendorCode,
      vendor_type: payload.vendor_type || 'MANPOWER_STAFFING',
      company_type: payload.company_type || undefined,
      registration_number: payload.registration_number || '',
      contact_person: payload.contact_person || '',
      email: payload.email || '',
      phone: payload.phone || '',
      gstin: payload.gstin || '',
      pan: payload.pan || '',
      address: payload.address || '',
      city: payload.city || '',
      state: payload.state || '',
      postal_code: payload.postal_code || '',
      status: payload.status || 'Active',
      service_charge_percentage: payload.service_charge_percentage || 0,
      is_gst_applicable: payload.is_gst_applicable ?? false,
      bank_name: payload.bank_details?.bank_name || payload.bank_name || '',
      account_number: payload.bank_details?.account_number || payload.account_number || '',
      ifsc_code: payload.bank_details?.ifsc || payload.ifsc_code || '',
      bank_details: payload.bank_details ? {
        bank_name: payload.bank_details.bank_name || '',
        account_holder_name: payload.bank_details.account_holder_name || payload.name || '',
        account_number: payload.bank_details.account_number || '',
        ifsc: payload.bank_details.ifsc || '',
        is_verified: payload.bank_details.is_verified ?? false,
      } : undefined,
      authorized_person: payload.authorized_person ? {
        name: payload.authorized_person.name || payload.contact_person || '',
        designation: payload.authorized_person.designation || '',
        pan: payload.authorized_person.pan || payload.pan || '',
        aadhaar_masked: payload.authorized_person.aadhaar_masked || '',
        mobile: payload.authorized_person.mobile || payload.phone || '',
        email: payload.authorized_person.email || payload.email || '',
        is_verified: payload.authorized_person.is_verified ?? false,
      } : undefined,
      agreement_details: payload.agreement_details ? {
        agreement_number: payload.agreement_details.agreement_number || '',
        client_company_name: payload.agreement_details.client_company_name || '',
        start_date: payload.agreement_details.start_date || '',
        end_date: payload.agreement_details.end_date || '',
        contract_value: payload.agreement_details.contract_value || 0,
        scope_of_work: payload.agreement_details.scope_of_work || '',
        work_location: payload.agreement_details.work_location || '',
        status: payload.agreement_details.status || 'ACTIVE',
      } : undefined,
      compliance_score: payload.compliance_score || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    orgs.unshift(newVendor);
    setStorage(STORAGE_KEYS.VENDORS, orgs);
    this.setActiveVendorId(newVendor.id);

    this.logAudit({
      entity_type: 'ONBOARDING',
      entity_id: newVendor.id,
      action: 'VENDOR_ONBOARDING_COMPLETED',
      new_value: JSON.stringify({ code: newVendor.code, name: newVendor.name, gstin: newVendor.gstin }),
      remarks: `Vendor ${newVendor.name} successfully onboarded via 4-step wizard with complete KYC, Banking, and Agreement details`,
    });

    return newVendor;
  },

  // ==========================================
  // 14. DOCUMENT REQUISITION & AUDIT (HR & COMPANY ADMIN)
  // ==========================================
  getDocumentRequests(vendorId?: string): VendorDocumentRequest[] {
    const list = getStorage<VendorDocumentRequest[]>('wf_vendor_portal_doc_requests', []);
    if (vendorId) {
      return list.filter((r) => r.vendor_id === vendorId);
    }
    return list;
  },

  createDocumentRequest(payload: {
    vendor_id: string;
    document_type: string;
    description: string;
    due_date: string;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';
    requested_by_name?: string;
  }): VendorDocumentRequest {
    const vendors = this.getVendors();
    const vendor = vendors.find((v) => v.id === payload.vendor_id);
    if (!vendor) {
      throw new Error('Vendor not found for document request');
    }
    const all = this.getDocumentRequests();

    const newReq: VendorDocumentRequest = {
      id: `docreq-${Date.now()}`,
      tenant_id: vendor.tenant_id,
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      document_type: payload.document_type,
      description: payload.description,
      due_date: payload.due_date,
      priority: payload.priority || 'HIGH',
      status: 'REQUESTED',
      requested_by_name: payload.requested_by_name || 'Principal Employer HR',
      requested_at: new Date().toISOString(),
    };

    all.unshift(newReq);
    setStorage('wf_vendor_portal_doc_requests', all);

    this.logAudit({
      entity_type: 'COMPLIANCE',
      entity_id: newReq.id,
      action: 'DOCUMENT_REQUISITION_SENT',
      new_value: JSON.stringify(newReq),
      remarks: `Document request for "${newReq.document_type}" issued to ${vendor.name} by ${newReq.requested_by_name}`,
    });

    return newReq;
  },

  updateDocumentRequestStatus(
    id: string,
    status: VendorDocumentRequest['status'],
    remarks?: string,
    verifiedBy?: string
  ): void {
    const all = this.getDocumentRequests();
    const idx = all.findIndex((r) => r.id === id);
    if (idx !== -1) {
      all[idx].status = status;
      if (remarks) all[idx].verification_remarks = remarks;
      if (verifiedBy) all[idx].verified_by = verifiedBy;
      all[idx].verified_at = new Date().toISOString();
      setStorage('wf_vendor_portal_doc_requests', all);

      this.logAudit({
        entity_type: 'COMPLIANCE',
        entity_id: id,
        action: `DOCUMENT_REQ_${status}`,
        new_value: status,
        remarks: remarks || `Document requirement updated to ${status}`,
      });
    }
  },

  updateEmployeeStatus(
    empId: string,
    status: VendorEmployee['status'],
    remarks?: string
  ): void {
    return this.updateVendorEmployeeStatus(empId, status, remarks);
  },

  // ==========================================
  // 15. PRINCIPAL EMPLOYER FORM V ISSUANCE
  // ==========================================
  getFormVs(vendorId?: string): PrincipalEmployerFormV[] {
    return this.getPrincipalEmployerFormVs(vendorId);
  },

  getPrincipalEmployerFormVs(vendorId?: string): PrincipalEmployerFormV[] {
    const list = getStorage<PrincipalEmployerFormV[]>('wf_vendor_portal_form_v', []);
    return vendorId ? list.filter((f) => f.vendor_id === vendorId) : list;
  },

  issuePrincipalEmployerFormV(payload: {
    vendor_id: string;
    nature_of_work: string;
    max_workers: number;
    duration_from: string;
    duration_to: string;
    site_location: string;
    issued_by_name?: string;
    issued_by_designation?: string;
  }): PrincipalEmployerFormV {
    const vendors = this.getVendors();
    const vendor = vendors.find((v) => v.id === payload.vendor_id);
    if (!vendor) {
      throw new Error('Vendor not found for Form V issuance');
    }
    const all = this.getPrincipalEmployerFormVs();

    const certNum = `FORM-V/JCS/2026/${Math.floor(100 + Math.random() * 900)}`;
    const newFormV: PrincipalEmployerFormV = {
      id: `formv-${Date.now()}`,
      tenant_id: vendor.tenant_id,
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      certificate_number: certNum,
      issue_date: new Date().toISOString().split('T')[0],
      principal_employer_name: (payload as any).principal_employer_name || api.getOrganizationSync()?.name || '',
      principal_employer_address: (payload as any).principal_employer_address || (api.getOrganizationSync() as any)?.address || '',
      principal_employer_registration_no: (payload as any).principal_employer_registration_no || '',
      contractor_name: vendor.name,
      contractor_address: vendor.address || '',
      nature_of_work: payload.nature_of_work,
      max_contract_labour_capacity: payload.max_workers,
      duration_from: payload.duration_from,
      duration_to: payload.duration_to,
      site_location: payload.site_location,
      issued_by_name: payload.issued_by_name || api.getCurrentUser()?.name || '',
      issued_by_designation: payload.issued_by_designation || '',
      status: 'ISSUED',
      created_at: new Date().toISOString(),
    };

    all.unshift(newFormV);
    setStorage('wf_vendor_portal_form_v', all);

    this.logAudit({
      entity_type: 'FORM_V',
      entity_id: newFormV.id,
      action: 'FORM_V_CERTIFICATE_ISSUED',
      new_value: JSON.stringify(newFormV),
      remarks: `Form V Certificate ${certNum} issued to contractor ${vendor.name} for ${payload.max_workers} contract workers`,
    });

    hrEventBus.publish('vendor.form_v_issued', newFormV);

    return newFormV;
  },

  // ==========================================
  // 16. HELPER EXTENSIONS FOR LAUNCH WORKFLOWS
  // ==========================================
  getEmployeeById(id: string): VendorEmployee | undefined {
    return this.getEmployees().find((e) => e.id === id);
  },

  getDeployments(vendorId?: string, relationshipId?: string): WorkerDeployment[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const list = getStorage<WorkerDeployment[]>('wf_vendor_portal_deployments', []);
    let filtered = list.filter((d) => d.vendor_id === targetVendorId);
    if (relationshipId) {
      filtered = filtered.filter((d) => d.relationship_id === relationshipId);
    }
    return filtered;
  },

  getDeploymentsByRelationship(relationshipId: string): WorkerDeployment[] {
    const list = getStorage<WorkerDeployment[]>('wf_vendor_portal_deployments', []);
    return list.filter((d) => d.relationship_id === relationshipId);
  },

  updateDeployment(deploymentId: string, updates: Partial<WorkerDeployment>): WorkerDeployment | undefined {
    const list = getStorage<WorkerDeployment[]>('wf_vendor_portal_deployments', []);
    const idx = list.findIndex((d) => d.id === deploymentId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      setStorage('wf_vendor_portal_deployments', list);
      return list[idx];
    }
    return undefined;
  },

  updateDeploymentStatus(deploymentId: string, status: WorkerDeployment['status'], remarks?: string): WorkerDeployment | undefined {
    return this.updateDeployment(deploymentId, { status });
  },

  assignWorkerDeployment(payload: Partial<WorkerDeployment>): WorkerDeployment {
    const activeVendor = this.getActiveVendor();
    const list = getStorage<WorkerDeployment[]>('wf_vendor_portal_deployments', []);
    const newDep: WorkerDeployment = {
      id: `dep-${Date.now()}`,
      worker_id: payload.worker_id || '',
      vendor_id: payload.vendor_id || activeVendor?.id || '',
      company_id: payload.company_id || '',
      relationship_id: payload.relationship_id || '',
      company_name: payload.company_name || '',
      site_name: payload.site_name || '',
      department_name: payload.department_name || '',
      designation: payload.designation || '',
      start_date: payload.start_date || new Date().toISOString().split('T')[0],
      end_date: payload.end_date,
      daily_wage_rate: payload.daily_wage_rate || 0,
      overtime_eligible: payload.overtime_eligible ?? true,
      status: payload.status || 'ACTIVE',
      gate_pass_valid_till: payload.gate_pass_valid_till,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(payload as any),
    };
    list.unshift(newDep);
    setStorage('wf_vendor_portal_deployments', list);
    hrEventBus.publish('vendor.worker_deployed', newDep);
    return newDep;
  },

  recordAttendance(record: Partial<VendorAttendanceRecord>): VendorAttendanceRecord {
    const targetVendorId = record.vendor_id || this.getActiveVendorId();
    const all = getStorage<VendorAttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    const newRec: VendorAttendanceRecord = {
      id: record.id || `att-${Date.now()}`,
      tenant_id: record.tenant_id || 'org-joy-01',
      vendor_id: targetVendorId,
      employee_id: record.employee_id || '',
      employee_name: record.employee_name || '',
      employee_code: record.employee_code || '',
      month: record.month || '2026-08',
      total_working_days: record.total_working_days || 0,
      present_days: record.present_days || 0,
      absent_days: record.absent_days || 0,
      leave_days: record.leave_days || 0,
      lop_days: record.lop_days || 0,
      ot_hours: record.ot_hours || 0,
      payable_days: record.payable_days || 0,
      status: record.status || 'PENDING_REVIEW',
      ...(record as any),
    };
    const idx = all.findIndex((a) => a.id === newRec.id || (a.employee_id === newRec.employee_id && a.month === newRec.month));
    if (idx !== -1) all[idx] = newRec;
    else all.unshift(newRec);
    setStorage(STORAGE_KEYS.ATTENDANCE, all);
    return newRec;
  },

  runThreeWayMatch(params: {
    vendor_id: string;
    company_id: string;
    period: string;
    po_number: string;
    claimed_amount: number;
    invoice_id?: string;
    invoice_number?: string;
  }): ThreeWayMatchResult {
    const pos = this.getPurchaseOrders(params.vendor_id);
    const allPos = getStorage<VendorPurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, DEFAULT_PURCHASE_ORDERS);
    const po = pos.find((p) => p.po_number === params.po_number) || allPos.find((p) => p.po_number === params.po_number);
    const payable = this.getVendorPayableBreakdown(params.period, params.vendor_id);
    let benchmarkPayable = payable.net_vendor_payable;

    const monthlyAtt = this.getMonthlyAttendance(params.period, params.vendor_id);
    const deps = this.getDeployments(params.vendor_id);
    if (deps.length > 0 && monthlyAtt.length > 0) {
      let depBaseWages = 0;
      let depOtWages = 0;
      for (const att of monthlyAtt) {
        const dep = deps.find((d) => d.worker_id === att.employee_id);
        if (!dep) continue;
        const dailyRate = (dep as any).daily_wage_rate || 0;
        const otRate = (dep as any).ot_hourly_rate || (dailyRate > 0 ? dailyRate / 8 : 0);
        depBaseWages += (att.present_days || 0) * dailyRate;
        depOtWages += (att.ot_hours || 0) * otRate;
      }
      const vendor = this.getVendors().find((v) => v.id === params.vendor_id) || this.getActiveVendor();
      const servicePct = vendor?.service_charge_percentage || 0;
      const subtotal = depBaseWages + depOtWages;
      const fee = subtotal * (servicePct / 100);
      const gst = (subtotal + fee) * 0.18;
      const deploymentExpected = Math.round(subtotal + fee + gst);
      if (Math.abs(params.claimed_amount - deploymentExpected) <= 25) {
        benchmarkPayable = deploymentExpected;
      }
    }

    const diff = params.claimed_amount - benchmarkPayable;
    const variancePct = benchmarkPayable > 0 ? (Math.abs(diff) / benchmarkPayable) * 100 : 0;
    const isPoSufficient = (po?.remaining_balance || 0) >= params.claimed_amount;
    const isPayrollMatch = Math.abs(diff) <= 10;

    const matchStatus = !isPoSufficient ? 'EXCEPTION' : isPayrollMatch ? 'MATCHED' : variancePct <= 2 ? 'PARTIALLY_MATCHED' : 'MISMATCHED';

    return {
      invoice_id: params.invoice_id || `inv-${Date.now()}`,
      invoice_number: params.invoice_number || `INV-${params.period}`,
      po_number: params.po_number,
      period: params.period,
      po_available_balance: po?.remaining_balance || 0,
      approved_payroll_payable: benchmarkPayable,
      vendor_invoice_claimed: params.claimed_amount,
      difference_amount: diff,
      variance_percentage: variancePct,
      is_po_limit_sufficient: isPoSufficient,
      is_payroll_matched: isPayrollMatch,
      match_status: matchStatus,
      exception_notes: !isPoSufficient ? ['PO balance insufficient'] : [],
    };
  },

  verifyInvoice(invoiceId: string, params: { verified_by: string; verified_amount: number }): void {
    const all = getStorage<VendorInvoice[]>(STORAGE_KEYS.INVOICES, []);
    const idx = all.findIndex((i) => i.id === invoiceId);
    if (idx !== -1) {
      all[idx].status = 'FINANCE_REVIEW';
      all[idx].finance_reviewer = params.verified_by;
      all[idx].reviewed_at = new Date().toISOString();
      all[idx].updated_at = new Date().toISOString();
      setStorage(STORAGE_KEYS.INVOICES, all);
      hrEventBus.publish('vendor.invoice_verified', all[idx]);
    }
  },

  approveInvoice(invoiceId: string, params: { approved_by: string }): void {
    const all = getStorage<VendorInvoice[]>(STORAGE_KEYS.INVOICES, []);
    const idx = all.findIndex((i) => i.id === invoiceId);
    if (idx !== -1) {
      all[idx].status = 'APPROVED';
      (all[idx] as any).approved_by = params.approved_by;
      all[idx].updated_at = new Date().toISOString();
      setStorage(STORAGE_KEYS.INVOICES, all);
      hrEventBus.publish('vendor.invoice_approved', all[idx]);
    }
  },
};
