import {
  VendorOrganization,
  VendorEmployee,
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
import { supabase, isSupabaseEnabled } from '../lib/supabase';

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

// Initial Seed Generators ensuring clean data exists on initial launch if empty
const SEED_ORGANIZATION: VendorOrganization = {
  id: 'vnd-apex-01',
  tenant_id: 'org-joy-corporate-solutions-private-',
  name: 'Apex Staffing Solutions Pvt Ltd',
  trade_name: 'Apex Workforce Solutions',
  code: 'VND-APX-01',
  vendor_type: 'MANPOWER_STAFFING',
  company_type: 'Pvt Ltd',
  registration_number: 'U74999TN2020PTC135892',
  contact_person: 'Rajesh Kumar',
  email: 'vendor@apexstaffing.in',
  phone: '+91 98765 43210',
  gstin: '33AAACA1234F1Z8',
  pan: 'AAACA1234F',
  address: 'Plot 42, SIDCO Industrial Estate, Phase 2, Coimbatore',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  postal_code: '641021',
  status: 'Active',
  service_charge_percentage: 8.5,
  is_gst_applicable: true,
  bank_name: 'HDFC Bank',
  account_number: '50200088192841',
  ifsc_code: 'HDFC0001234',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-08-31T00:00:00Z',
};

const DEFAULT_RELATIONSHIPS: VendorCompanyRelationship[] = [
  {
    id: 'rel-apex-joy-01',
    relationship_id: 'REL-001',
    vendor_id: 'vnd-apex-01',
    vendor_name: 'Apex Staffing Solutions Pvt Ltd',
    company_id: 'comp-joy-01',
    company_name: 'Joy Manufacturing Pvt Ltd',
    company_code: 'JCS-MFG-01',
    site_location: 'Coimbatore Manufacturing Complex (Plant 1 & 2)',
    status: 'ACTIVE',
    approval_status: 'COMPANY_APPROVED',
    access_enabled: true,
    active_workers_count: 100,
    compliance_score: 95,
    contract_start_date: '2026-01-01',
    contract_end_date: '2026-12-31',
    sow_number: 'SOW-JCS-2026-089',
    master_po_number: 'PO-2026-08-001',
    primary_hr_contact_name: 'Senthil Nathan (CHRO)',
    primary_hr_contact_email: 'senthil.nathan@joymfg.com',
    created_at: '2026-01-01T00:00:00Z',
    approved_at: '2026-01-05T10:00:00Z',
    approved_by: 'Senthil Nathan',
  },
  {
    id: 'rel-apex-titan-02',
    relationship_id: 'REL-002',
    vendor_id: 'vnd-apex-01',
    vendor_name: 'Apex Staffing Solutions Pvt Ltd',
    company_id: 'comp-titan-02',
    company_name: 'Titan Tech Industries Ltd',
    company_code: 'TTI-CORP-02',
    site_location: 'Hosur Electronic Park Unit 4',
    status: 'ACTIVE',
    approval_status: 'COMPANY_APPROVED',
    access_enabled: true,
    active_workers_count: 50,
    compliance_score: 88,
    contract_start_date: '2026-03-01',
    contract_end_date: '2027-02-28',
    sow_number: 'SOW-TTI-2026-112',
    master_po_number: 'PO-TTI-2026-042',
    primary_hr_contact_name: 'Meenakshi Sundaram (Head HR)',
    primary_hr_contact_email: 'meenakshi@titantech.in',
    created_at: '2026-03-01T00:00:00Z',
    approved_at: '2026-03-04T14:30:00Z',
    approved_by: 'Meenakshi Sundaram',
  },
  {
    id: 'rel-apex-delta-03',
    relationship_id: 'REL-003',
    vendor_id: 'vnd-apex-01',
    vendor_name: 'Apex Staffing Solutions Pvt Ltd',
    company_id: 'comp-delta-03',
    company_name: 'Delta Engineering Corp',
    company_code: 'DEC-ENG-03',
    site_location: 'Chennai Heavy Fabrication Yard',
    status: 'PENDING_APPROVAL',
    approval_status: 'KYC_UNDER_REVIEW',
    access_enabled: false,
    active_workers_count: 200,
    compliance_score: 72,
    contract_start_date: '2026-09-01',
    contract_end_date: '2027-08-31',
    sow_number: 'SOW-DEC-2026-004',
    primary_hr_contact_name: 'Karthik Raja (Compliance Lead)',
    primary_hr_contact_email: 'karthik.raja@deltaeng.com',
    created_at: '2026-08-20T11:00:00Z',
  },
  {
    id: 'rel-apex-omega-04',
    relationship_id: 'REL-004',
    vendor_id: 'vnd-apex-01',
    vendor_name: 'Apex Staffing Solutions Pvt Ltd',
    company_id: 'comp-omega-04',
    company_name: 'Omega Logistics & Freight Solutions',
    company_code: 'OLF-LOG-04',
    site_location: 'Tirupur Automated Warehouse & Logistics Hub',
    status: 'SUSPENDED',
    approval_status: 'REJECTED',
    access_enabled: false,
    active_workers_count: 75,
    compliance_score: 45,
    contract_start_date: '2025-06-01',
    contract_end_date: '2026-05-31',
    sow_number: 'SOW-OLF-2025-099',
    primary_hr_contact_name: 'Prakash Nair (VP Operations)',
    primary_hr_contact_email: 'prakash@omegalogistics.in',
    created_at: '2025-06-01T00:00:00Z',
  },
];

const DEFAULT_ORGANIZATIONS: VendorOrganization[] = [SEED_ORGANIZATION];
const DEFAULT_EMPLOYEES: VendorEmployee[] = [];
const DEFAULT_PURCHASE_ORDERS: VendorPurchaseOrder[] = [];

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed writing to storage ${key}`, e);
  }
}

export const vendorPortalService = {
  // ==========================================
  // 1. ORGANIZATIONS & ACTIVE CONTEXT
  // ==========================================
  getVendors(): VendorOrganization[] {
    const orgs = getStorage<VendorOrganization[]>(STORAGE_KEYS.VENDORS, DEFAULT_ORGANIZATIONS);
    if (!orgs || orgs.length === 0) {
      setStorage(STORAGE_KEYS.VENDORS, DEFAULT_ORGANIZATIONS);
      return DEFAULT_ORGANIZATIONS;
    }
    return orgs;
  },

  getActiveVendorId(): string {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_VENDOR_ID);
    if (saved) return saved;
    const orgs = this.getVendors();
    const fallback = orgs[0]?.id || SEED_ORGANIZATION.id;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_VENDOR_ID, fallback);
    return fallback;
  },

  setActiveVendorId(vendorId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_VENDOR_ID, vendorId);
    window.dispatchEvent(new CustomEvent('wf-vendor-changed', { detail: { vendorId } }));
  },

  getActiveVendor(): VendorOrganization {
    const activeId = this.getActiveVendorId();
    const vendors = this.getVendors();
    const found = vendors.find((v) => v.id === activeId);
    if (found) return found;
    if (vendors.length > 0) return vendors[0];
    return SEED_ORGANIZATION;
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

  // ==========================================
  // 1.1 MULTI-COMPANY RELATIONSHIPS & CONTEXT
  // ==========================================
  getVendorCompanyRelationships(vendorId?: string): VendorCompanyRelationship[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const list = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    if (!localStorage.getItem(STORAGE_KEYS.RELATIONSHIPS)) {
      setStorage(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    }
    return list.filter((r) => r.vendor_id === targetVendorId);
  },

  getActiveRelationshipId(): string {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_RELATIONSHIP_ID);
    if (saved) return saved;
    const rels = this.getVendorCompanyRelationships();
    const active = rels.find((r) => r.status === 'ACTIVE') || rels[0] || DEFAULT_RELATIONSHIPS[0];
    localStorage.setItem(STORAGE_KEYS.ACTIVE_RELATIONSHIP_ID, active.id);
    return active.id;
  },

  setActiveRelationshipId(relationshipId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_RELATIONSHIP_ID, relationshipId);
    window.dispatchEvent(new CustomEvent('wf-vendor-relationship-changed', { detail: { relationshipId } }));
  },

  getActiveRelationship(): VendorCompanyRelationship {
    const activeRelId = this.getActiveRelationshipId();
    const rels = this.getVendorCompanyRelationships();
    const found = rels.find((r) => r.id === activeRelId);
    if (found) return found;
    const activeFallback = rels.find((r) => r.status === 'ACTIVE') || rels[0] || DEFAULT_RELATIONSHIPS[0];
    return activeFallback;
  },

  requestCompanyConnection(payload: {
    company_name: string;
    company_code: string;
    site_location: string;
    sow_number?: string;
    primary_hr_contact_name: string;
    primary_hr_contact_email: string;
  }): VendorCompanyRelationship {
    const activeVendor = this.getActiveVendor();
    const all = getStorage<VendorCompanyRelationship[]>(STORAGE_KEYS.RELATIONSHIPS, DEFAULT_RELATIONSHIPS);
    const nextIndex = all.length + 1;
    const newRel: VendorCompanyRelationship = {
      id: `rel-${activeVendor.id}-${Date.now()}`,
      relationship_id: `REL-${String(nextIndex).padStart(3, '0')}`,
      vendor_id: activeVendor.id,
      vendor_name: activeVendor.name,
      company_id: `comp-${Date.now().toString(36)}`,
      company_name: payload.company_name,
      company_code: payload.company_code || `CLIENT-${nextIndex}`,
      site_location: payload.site_location || 'Main Industrial Site',
      status: 'PENDING_APPROVAL',
      approval_status: 'CONNECTION_REQUESTED',
      access_enabled: false,
      active_workers_count: 0,
      compliance_score: 50,
      contract_start_date: new Date().toISOString().split('T')[0],
      contract_end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      sow_number: payload.sow_number,
      primary_hr_contact_name: payload.primary_hr_contact_name,
      primary_hr_contact_email: payload.primary_hr_contact_email,
      created_at: new Date().toISOString(),
    };

    all.unshift(newRel);
    setStorage(STORAGE_KEYS.RELATIONSHIPS, all);
    window.dispatchEvent(new CustomEvent('wf-vendor-relationship-changed', { detail: { relationshipId: newRel.id } }));

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
      window.dispatchEvent(new CustomEvent('wf-vendor-relationship-changed', { detail: { relationshipId: relId } }));

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
      window.dispatchEvent(new CustomEvent('wf-vendor-relationship-changed', { detail: { relationshipId: relId } }));

      this.logAudit({
        entity_type: 'ONBOARDING',
        entity_id: relId,
        action: 'COMPANY_RELATIONSHIP_SUSPENDED',
        new_value: 'SUSPENDED',
        remarks: reason || `Client relationship ${all[idx].company_name} suspended by Company Admin.`,
      });
    }
  },

  // ==========================================
  // 2. VENDOR EMPLOYEES & DATA ISOLATION
  // ==========================================
  getEmployees(vendorId?: string): VendorEmployee[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const all = getStorage<VendorEmployee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      setStorage(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
    }
    return all.filter((e) => e.vendor_id === targetVendorId);
  },

  addEmployee(payload: Partial<VendorEmployee>): VendorEmployee {
    const activeVendor = this.getActiveVendor();
    const all = getStorage<VendorEmployee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
    
    const newEmp: VendorEmployee = {
      id: `vemp-${Date.now()}`,
      tenant_id: activeVendor.tenant_id,
      vendor_id: activeVendor.id,
      vendor_name: activeVendor.name,
      employee_code: payload.employee_code || `APX-EMP-${Math.floor(100 + Math.random() * 900)}`,
      first_name: payload.first_name || 'New',
      last_name: payload.last_name || 'Staff',
      display_name: `${payload.first_name || 'New'} ${payload.last_name || 'Staff'}`.trim(),
      gender: payload.gender || 'Male',
      dob: payload.dob || '1998-01-01',
      mobile: payload.mobile || '+91 98000 00000',
      email: payload.email || 'staff@contractor.in',
      address: payload.address || 'Coimbatore, Tamil Nadu',
      joining_date: payload.joining_date || new Date().toISOString().split('T')[0],
      employment_type: payload.employment_type || 'Contract',
      worker_category: payload.worker_category || 'Skilled',
      skill_category: payload.skill_category || 'Operations Specialist',
      department: payload.department || 'Production',
      designation: payload.designation || 'Specialist',
      status: 'PENDING_COMPANY_APPROVAL',
      uan: payload.uan || '100984716999',
      pf_number: payload.pf_number || 'TN/CBE/0091827/999',
      esic_number: payload.esic_number || '51000847291000999',
      pan: payload.pan || 'AAAAA0000A',
      aadhaar_masked: payload.aadhaar_masked || 'XXXX-XXXX-1122',
      bank_name: payload.bank_name || 'State Bank of India',
      account_number: payload.account_number || '39281726351',
      ifsc: payload.ifsc || 'SBIN0001234',
      current_client_id: 'comp-joy-01',
      current_client_name: 'Joy Corporate Solutions Pvt Ltd',
      work_location: payload.work_location || 'Coimbatore Plant 1',
      project_name: payload.project_name || 'Core Operations',
      shift_name: payload.shift_name || 'Day Shift',
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

  updateEmployeeStatus(empId: string, status: VendorEmployee['status'], remarks?: string): void {
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
  getMonthlyAttendance(period: string = '2026-08', vendorId?: string): VendorAttendanceRecord[] {
    const employees = this.getEmployees(vendorId);
    const targetVendorId = vendorId || this.getActiveVendorId();
    const stored = getStorage<VendorAttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);

    // If records for this period already exist, return them
    const existing = stored.filter((r) => r.vendor_id === targetVendorId && r.month === period);
    if (existing.length > 0) return existing;

    // Generate dynamic baseline from actual employees
    const generated: VendorAttendanceRecord[] = employees.map((emp, i) => {
      const totalDays = 26;
      const lop = i === 1 ? 1 : 0;
      const present = totalDays - lop;
      const ot = i === 0 ? 12 : i === 1 ? 8 : i === 2 ? 4 : 0;
      return {
        id: `att-${emp.id}-${period}`,
        tenant_id: emp.tenant_id,
        vendor_id: emp.vendor_id,
        employee_id: emp.id,
        employee_name: emp.display_name,
        employee_code: emp.employee_code,
        month: period,
        total_working_days: totalDays,
        present_days: present,
        absent_days: 0,
        leave_days: 0,
        lop_days: lop,
        ot_hours: ot,
        payable_days: present,
        status: 'VERIFIED',
      };
    });

    const merged = [...stored.filter((r) => !(r.vendor_id === targetVendorId && r.month === period)), ...generated];
    setStorage(STORAGE_KEYS.ATTENDANCE, merged);
    return generated;
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
    const emp = this.getEmployees(activeVendor.id).find((e) => e.id === payload.employee_id);
    const currentAtt = this.getMonthlyAttendance(payload.month, activeVendor.id).find((a) => a.employee_id === payload.employee_id);

    const newReq: VendorAttendanceCorrectionRequest = {
      id: `corr-${Date.now()}`,
      tenant_id: activeVendor.tenant_id,
      vendor_id: activeVendor.id,
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
      supporting_doc_name: payload.supporting_doc_name || 'Biometric_Punch_Audit_Log.pdf',
      status: 'SUBMITTED',
      requested_by: activeVendor.contact_person,
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

    return employees.map((emp) => {
      const att = attendance.find((a) => a.employee_id === emp.id) || {
        total_working_days: 26,
        present_days: 26,
        lop_days: 0,
        payable_days: 26,
        ot_hours: 0,
      };

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

      return {
        employee_id: emp.id,
        employee_name: emp.display_name,
        employee_code: emp.employee_code,
        client_name: emp.current_client_name || 'Joy Corporate Solutions Pvt Ltd',
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
      };
    });
  },

  // ==========================================
  // 5. VENDOR PAYABLE ENGINE
  // ==========================================
  getVendorPayableBreakdown(period: string = '2026-08', vendorId?: string): VendorPayableBreakdown {
    const activeVendor = vendorId ? this.getVendors().find((v) => v.id === vendorId) || this.getActiveVendor() : this.getActiveVendor();
    const wages = this.getEmployeeWageBreakdowns(period, activeVendor.id);

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
    const otherContractualCharges = 5000;
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
    return map[key] || 'VENDOR_VERIFIED';
  },

  updatePayrollVerificationStatus(period: string, status: PayrollVerificationStatus, remarks?: string): void {
    const activeVendor = this.getActiveVendor();
    const map = getStorage<Record<string, PayrollVerificationStatus>>(STORAGE_KEYS.PAYROLL_STATUS, {});
    const key = `${activeVendor.id}_${period}`;
    const oldStatus = map[key] || 'ATTENDANCE_LOCKED';
    map[key] = status;
    setStorage(STORAGE_KEYS.PAYROLL_STATUS, map);

    this.logAudit({
      entity_type: 'PAYROLL',
      entity_id: `${activeVendor.id}_${period}`,
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
    const list = getStorage<VendorPurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, DEFAULT_PURCHASE_ORDERS);
    if (!localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS)) {
      setStorage(STORAGE_KEYS.PURCHASE_ORDERS, DEFAULT_PURCHASE_ORDERS);
    }
    return list.filter((po) => po.vendor_id === targetVendorId);
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
  getInvoices(vendorId?: string): VendorInvoice[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const list = getStorage<VendorInvoice[]>(STORAGE_KEYS.INVOICES, []);
    return list.filter((inv) => inv.vendor_id === targetVendorId);
  },

  submitInvoice(payload: {
    po_id: string;
    payroll_period: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    total_invoice_amount: number;
    attached_invoice_pdf?: string;
  }): { invoice: VendorInvoice; matchResult: ThreeWayMatchResult } {
    const activeVendor = this.getActiveVendor();
    const pos = this.getPurchaseOrders(activeVendor.id);
    const po = pos.find((p) => p.id === payload.po_id) || pos[0];
    const payable = this.getVendorPayableBreakdown(payload.payroll_period, activeVendor.id);

    // 3-Way Match Check
    const diff = payload.total_invoice_amount - payable.net_vendor_payable;
    const variancePct = payable.net_vendor_payable > 0 ? (Math.abs(diff) / payable.net_vendor_payable) * 100 : 0;
    const isPoSufficient = (po?.remaining_balance || 0) >= payload.total_invoice_amount;
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
      exceptionNotes.push(`Claimed invoice amount exceeds PO available balance by ₹${(payload.total_invoice_amount - (po?.remaining_balance || 0)).toLocaleString()}`);
    }
    if (!isPayrollMatch) {
      exceptionNotes.push(`Invoice claimed value differs from system-approved payroll payable by ₹${Math.abs(diff).toLocaleString()}`);
    }

    const newInvoice: VendorInvoice = {
      id: `inv-${Date.now()}`,
      tenant_id: activeVendor.tenant_id,
      vendor_id: activeVendor.id,
      vendor_name: activeVendor.name,
      client_company_id: po ? po.client_company_id : 'comp-joy-01',
      client_company_name: po ? po.client_company_name : 'Joy Corporate Solutions Pvt Ltd',
      po_id: po ? po.id : 'po-vnd-001',
      po_number: po ? po.po_number : 'PO-JCS-2026-VND-089',
      payroll_period: payload.payroll_period,
      invoice_number: payload.invoice_number,
      invoice_date: payload.invoice_date,
      due_date: payload.due_date,
      gstin: activeVendor.gstin,
      taxable_amount: payload.taxable_amount,
      cgst_amount: payload.cgst_amount,
      sgst_amount: payload.sgst_amount,
      igst_amount: payload.igst_amount,
      total_invoice_amount: payload.total_invoice_amount,
      status: matchStatus === 'EXCEPTION' ? 'ON_HOLD' : 'SUBMITTED',
      match_status: matchStatus,
      variance_amount: diff,
      exception_reason: exceptionNotes.join('; ') || undefined,
      attached_invoice_pdf: payload.attached_invoice_pdf || 'Tax_Invoice_Signed.pdf',
      submitted_by: activeVendor.contact_person,
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
        allPos[pIdx].consumed_amount += payload.total_invoice_amount;
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
    const filtered = stored.filter((c) => c.vendor_id === targetVendorId && c.period === period);
    if (filtered.length > 0) return filtered;

    const payable = this.getVendorPayableBreakdown(period, targetVendorId);
    const pfBase = payable.total_gross_wages;

    const defaults: VendorStatutoryChallan[] = [
      {
        id: `challan-pf-${period}`,
        tenant_id: 'org-joy-01',
        vendor_id: targetVendorId,
        period,
        type: 'PF',
        headcount: payable.headcount,
        wage_base: pfBase,
        employee_share: Math.round(pfBase * 0.12),
        employer_share: payable.total_employer_pf,
        admin_charges: Math.round(pfBase * 0.005),
        total_remitted: Math.round(pfBase * 0.12) + payable.total_employer_pf + Math.round(pfBase * 0.005),
        trrn_or_challan_no: `TRRN-${period.replace('-', '')}-991823`,
        payment_date: `${period}-15`,
        bank_ref: 'HDFC-EPFO-881920',
        status: 'REMITTED',
        receipt_doc_url: 'EPFO_Electronic_Challan_Receipt.pdf',
      },
      {
        id: `challan-esi-${period}`,
        tenant_id: 'org-joy-01',
        vendor_id: targetVendorId,
        period,
        type: 'ESI',
        headcount: payable.headcount,
        wage_base: pfBase,
        employee_share: Math.round(pfBase * 0.0075),
        employer_share: payable.total_employer_esi,
        total_remitted: Math.round(pfBase * 0.0075) + payable.total_employer_esi,
        trrn_or_challan_no: `ESIC-CBE-${period.replace('-', '')}-4412`,
        payment_date: `${period}-15`,
        bank_ref: 'SBI-ESIC-991283',
        status: 'REMITTED',
        receipt_doc_url: 'ESIC_Monthly_Contribution_Challan.pdf',
      },
    ];

    const merged = [...stored.filter((c) => !(c.vendor_id === targetVendorId && c.period === period)), ...defaults];
    setStorage(STORAGE_KEYS.CHALLANS, merged);
    return defaults;
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

  // ==========================================
  // 11. AUDIT LOGS
  // ==========================================
  getAuditLogs(vendorId?: string): VendorAuditLog[] {
    const targetVendorId = vendorId || this.getActiveVendorId();
    const all = getStorage<VendorAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    return all.filter((l) => l.vendor_id === targetVendorId);
  },

  logAudit(entry: {
    entity_type: VendorAuditLog['entity_type'];
    entity_id: string;
    action: string;
    previous_value?: string;
    new_value?: string;
    remarks?: string;
  }): void {
    const activeVendor = this.getActiveVendor();
    const user = api.getCurrentUser();
    const newLog: VendorAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: activeVendor.tenant_id,
      vendor_id: activeVendor.id,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      previous_value: entry.previous_value,
      new_value: entry.new_value,
      performed_by: user?.name || activeVendor.contact_person || 'Vendor Operations Head',
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
    
    // Auto calculate days until expiry and status
    const now = new Date();
    return all
      .filter((l) => l.vendor_id === targetVendorId)
      .map((lic) => {
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
        return { ...lic, days_until_expiry: diffDays, status };
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
      tenant_id: activeVendor.tenant_id,
      vendor_id: activeVendor.id,
      vendor_name: activeVendor.name,
      license_type: payload.license_type || 'Contract Labour License',
      license_number: payload.license_number || `CL-${Math.floor(1000 + Math.random() * 9000)}`,
      issued_date: payload.issued_date || new Date().toISOString().split('T')[0],
      expiry_date: payload.expiry_date || expiry.toISOString().split('T')[0],
      max_worker_capacity: payload.max_worker_capacity || 50,
      issuing_authority: payload.issuing_authority || 'Joint Commissioner of Labour',
      work_location: payload.work_location || 'Coimbatore Industrial Cluster',
      status: payload.status || status,
      days_until_expiry: diffDays,
      document_name: payload.document_name || 'License_Copy.pdf',
      document_url: payload.document_url || 'https://sample.pdf',
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
      tenant_id: activeVendor.tenant_id,
      vendor_id: activeVendor.id,
      vendor_name: activeVendor.name,
      form_type: payload.form_type || 'Form XXIV (Half-Yearly Return)',
      return_period: payload.return_period || '2026-H1',
      due_date: payload.due_date || '2026-07-31',
      filing_date: payload.filing_date || new Date().toISOString().split('T')[0],
      acknowledgement_number: payload.acknowledgement_number || `ACK-${Math.floor(100000 + Math.random() * 900000)}`,
      status: payload.status || 'SUBMITTED',
      document_name: payload.document_name || 'Return_Filing_Proof.pdf',
      document_url: payload.document_url || 'https://sample.pdf',
      remarks: payload.remarks || 'Statutory return filed on time with competent labour authority',
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
    const all = getStorage<import('../types/vendorPortal').StatutoryReturn[]>('wf_vendor_portal_returns', []);

    const newFormV: import('../types/vendorPortal').StatutoryReturn = {
      id: `formv-${Date.now()}`,
      tenant_id: targetVendor.tenant_id,
      vendor_id: targetVendor.id,
      vendor_name: targetVendor.name,
      form_type: 'Form V (Principal Employer Certificate)',
      return_period: `${payload.valid_from} to ${payload.valid_to}`,
      due_date: payload.valid_to,
      filing_date: new Date().toISOString().split('T')[0],
      acknowledgement_number: `PE-FORM-V-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'VERIFIED',
      document_name: `Form_V_${targetVendor.code}.pdf`,
      document_url: 'https://sample.pdf',
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
    const activeVendor = this.getVendors().find(v => v.id === targetVendorId) || this.getActiveVendor();
    const stored = getStorage<import('../types/vendorPortal').ComplianceCalendarTask[]>('wf_vendor_portal_cal_tasks', []);

    if (stored.length > 0) {
      return stored.filter((t) => !vendorId || t.vendor_id === targetVendorId);
    }

    // Default auto-generated statutory calendar
    const defaultTasks: import('../types/vendorPortal').ComplianceCalendarTask[] = [
      {
        id: `tsk-pf-${targetVendorId}`,
        tenant_id: activeVendor.tenant_id,
        vendor_id: targetVendorId,
        vendor_name: activeVendor.name,
        title: 'Monthly PF Remittance & ECR Filing',
        category: 'PF',
        frequency: 'MONTHLY',
        due_date: '2026-09-15',
        status: 'PENDING',
        assigned_to_role: 'Vendor Admin',
        reminder_days_before: [15, 7, 3, 1],
        created_at: new Date().toISOString(),
      },
      {
        id: `tsk-esi-${targetVendorId}`,
        tenant_id: activeVendor.tenant_id,
        vendor_id: targetVendorId,
        vendor_name: activeVendor.name,
        title: 'Monthly ESIC Online Payment & Contribution',
        category: 'ESI',
        frequency: 'MONTHLY',
        due_date: '2026-09-15',
        status: 'SUBMITTED',
        assigned_to_role: 'Vendor Admin',
        reminder_days_before: [15, 7, 3, 1],
        created_at: new Date().toISOString(),
      },
      {
        id: `tsk-wage-${targetVendorId}`,
        tenant_id: activeVendor.tenant_id,
        vendor_id: targetVendorId,
        vendor_name: activeVendor.name,
        title: 'Contractor Wage Register Submission (Form XVII)',
        category: 'WAGE_REGISTER',
        frequency: 'MONTHLY',
        due_date: '2026-09-07',
        status: 'PENDING',
        assigned_to_role: 'Company HR',
        reminder_days_before: [7, 3, 1],
        created_at: new Date().toISOString(),
      },
      {
        id: `tsk-half-yearly-${targetVendorId}`,
        tenant_id: activeVendor.tenant_id,
        vendor_id: targetVendorId,
        vendor_name: activeVendor.name,
        title: 'CLRA Half-Yearly Return (Form XXIV)',
        category: 'HALF_YEARLY_RETURN',
        frequency: 'HALF_YEARLY',
        due_date: '2026-07-31',
        status: 'VERIFIED',
        assigned_to_role: 'Compliance Officer',
        reminder_days_before: [30, 15, 7, 1],
        created_at: new Date().toISOString(),
      },
      {
        id: `tsk-annual-${targetVendorId}`,
        tenant_id: activeVendor.tenant_id,
        vendor_id: targetVendorId,
        vendor_name: activeVendor.name,
        title: 'Contract Labour Annual Return (Form XXV)',
        category: 'ANNUAL_RETURN',
        frequency: 'YEARLY',
        due_date: '2027-01-31',
        status: 'PENDING',
        assigned_to_role: 'Compliance Officer',
        reminder_days_before: [60, 30, 15, 7, 1],
        created_at: new Date().toISOString(),
      },
    ];

    setStorage('wf_vendor_portal_cal_tasks', defaultTasks);
    return defaultTasks;
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

    if (name.includes('migrant') || name.includes('ismw')) {
      return {
        detected_document_type: 'Migrant Labour License',
        confidence_score: 96,
        extracted_license_number: `TN/ML/2026/${randomSuffix}`,
        extracted_issue_date: new Date().toISOString().split('T')[0],
        extracted_expiry_date: nextYear,
        extracted_holder_name: this.getActiveVendor().name,
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
        extracted_holder_name: this.getActiveVendor().name,
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
        extracted_holder_name: this.getActiveVendor().name,
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
      extracted_holder_name: this.getActiveVendor().name,
      extracted_issuing_authority: 'Joint Commissioner of Labour (Contract Labour Cell)',
      raw_text_snippet: `CONTRACT LABOUR (REGULATION AND ABOLITION) ACT, 1970 - FORM VI (RULE 25(1)) - LICENSE NUMBER: TN/CL/2026/${randomSuffix} MAX WORKERS: 50`,
    };
  },

  // ==========================================
  // 17. 4-STEP ONBOARDING ENGINE
  // ==========================================
  createVendorOnboarding(payload: Partial<VendorOrganization>): VendorOrganization {
    const orgs = this.getVendors();
    const vendorCode = payload.code || `VND-${payload.name?.substring(0, 3).toUpperCase() || 'NEW'}-${Math.floor(100 + Math.random() * 900)}`;
    const newVendor: VendorOrganization = {
      id: `vnd-${Date.now()}`,
      tenant_id: 'org-joy-corporate-solutions-private-',
      name: payload.name || 'New Vendor Entity',
      trade_name: payload.trade_name || payload.name || 'New Vendor Partner',
      code: vendorCode,
      vendor_type: payload.vendor_type || 'MANPOWER_STAFFING',
      company_type: payload.company_type || 'Pvt Ltd',
      registration_number: payload.registration_number || `U74999TZ2026PTC${Math.floor(10000 + Math.random() * 90000)}`,
      contact_person: payload.contact_person || 'Managing Director',
      email: payload.email || 'compliance@vendorpartner.in',
      phone: payload.phone || '+91 98765 43210',
      gstin: payload.gstin || '33AAAAA0000A1Z5',
      pan: payload.pan || 'AAAAA0000A',
      address: payload.address || 'Industrial Estate, Phase 2, Coimbatore',
      city: payload.city || 'Coimbatore',
      state: payload.state || 'Tamil Nadu',
      postal_code: payload.postal_code || '641001',
      status: 'Active',
      service_charge_percentage: payload.service_charge_percentage || 8.5,
      is_gst_applicable: payload.is_gst_applicable ?? true,
      bank_name: payload.bank_details?.bank_name || payload.bank_name || 'HDFC Bank',
      account_number: payload.bank_details?.account_number || payload.account_number || '50200012345678',
      ifsc_code: payload.bank_details?.ifsc || payload.ifsc_code || 'HDFC0001234',
      bank_details: payload.bank_details || {
        bank_name: 'HDFC Bank',
        account_holder_name: payload.name || 'New Vendor Entity',
        account_number: '50200012345678',
        ifsc: 'HDFC0001234',
        is_verified: true,
      },
      authorized_person: payload.authorized_person || {
        name: payload.contact_person || 'Managing Director',
        designation: 'Managing Partner',
        pan: payload.pan || 'AAAAA0000A',
        aadhaar_masked: 'XXXX-XXXX-8822',
        mobile: payload.phone || '+91 98765 43210',
        email: payload.email || 'compliance@vendorpartner.in',
        is_verified: true,
      },
      agreement_details: payload.agreement_details || {
        agreement_number: `AGR-${vendorCode}-2026`,
        client_company_name: 'Joy Corporate Solutions Pvt Ltd',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        contract_value: 2500000,
        scope_of_work: 'Provision of Skilled Technical & Facility Staffing',
        work_location: 'Coimbatore Plant & Client Sites',
        status: 'ACTIVE',
      },
      compliance_score: 92,
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
    const list = getStorage<VendorDocumentRequest[]>('wf_vendor_portal_doc_requests', [
      {
        id: 'doc-req-01',
        tenant_id: 'org-joy-corporate-solutions-private-',
        vendor_id: 'vnd-apex-01',
        vendor_name: 'Apex Staffing Solutions Pvt Ltd',
        document_type: 'Contract Labour License Renewal (CLRA Form VI)',
        description: 'Please upload the renewed Contract Labour License issued by the Joint Labour Commissioner for 2026-2027.',
        due_date: '2026-09-15',
        priority: 'CRITICAL',
        status: 'REQUESTED',
        requested_by_name: 'HR Compliance Head (Joy PeopleHR)',
        requested_at: '2026-08-31T10:00:00Z',
      },
      {
        id: 'doc-req-02',
        tenant_id: 'org-joy-corporate-solutions-private-',
        vendor_id: 'vnd-apex-01',
        vendor_name: 'Apex Staffing Solutions Pvt Ltd',
        document_type: 'Monthly EPFO ECR & Contribution Challan',
        description: 'Electronic Challan cum Return (ECR) for August 2026 wage cycle along with TRRN confirmation payment slip.',
        due_date: '2026-09-15',
        priority: 'HIGH',
        status: 'SUBMITTED',
        requested_by_name: 'Company Finance Admin',
        requested_at: '2026-08-25T14:30:00Z',
        submitted_file_name: 'EPFO_ECR_August_2026_TRRN89210.pdf',
        submitted_at: '2026-08-30T16:45:00Z',
      },
    ]);
    if (!localStorage.getItem('wf_vendor_portal_doc_requests')) {
      setStorage('wf_vendor_portal_doc_requests', list);
    }
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
    const vendor = vendors.find((v) => v.id === payload.vendor_id) || vendors[0] || SEED_ORGANIZATION;
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

  updateVendorEmployeeStatus(
    empId: string,
    status: VendorEmployee['status'],
    remarks?: string
  ): void {
    const all = getStorage<VendorEmployee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
    const idx = all.findIndex((e) => e.id === empId);
    if (idx !== -1) {
      all[idx].status = status;
      setStorage(STORAGE_KEYS.EMPLOYEES, all);

      this.logAudit({
        entity_type: 'WORKFORCE',
        entity_id: empId,
        action: `WORKER_STATUS_UPDATED_${status}`,
        new_value: status,
        remarks: remarks || `Contract worker ${all[idx].display_name} status updated to ${status} by Company HR`,
      });
    }
  },

  // ==========================================
  // 15. PRINCIPAL EMPLOYER FORM V ISSUANCE
  // ==========================================
  getPrincipalEmployerFormVs(vendorId?: string): PrincipalEmployerFormV[] {
    const list = getStorage<PrincipalEmployerFormV[]>('wf_vendor_portal_form_v', [
      {
        id: 'form-v-01',
        tenant_id: 'org-joy-corporate-solutions-private-',
        vendor_id: 'vnd-apex-01',
        vendor_name: 'Apex Staffing Solutions Pvt Ltd',
        certificate_number: 'FORM-V/JCS/2026/042',
        issue_date: '2026-08-01',
        principal_employer_name: 'Joy Corporate Solutions Pvt Ltd',
        principal_employer_address: '42 SIDCO Industrial Complex, Coimbatore, TN - 641021',
        principal_employer_registration_no: 'RC/TN/CBE/CLRA/2022/9918',
        contractor_name: 'Apex Staffing Solutions Pvt Ltd',
        contractor_address: 'Plot 42, SIDCO Industrial Estate, Phase 2, Coimbatore',
        nature_of_work: 'Assembly Line Support, Material Handling & Quality Testing',
        max_contract_labour_capacity: 50,
        duration_from: '2026-08-01',
        duration_to: '2027-07-31',
        site_location: 'Coimbatore Manufacturing Complex (Unit 1 & 2)',
        issued_by_name: 'Senthil Nathan',
        issued_by_designation: 'Head of Human Resources & Labour Compliance',
        status: 'ISSUED',
        created_at: '2026-08-01T09:00:00Z',
      },
    ]);
    if (!localStorage.getItem('wf_vendor_portal_form_v')) {
      setStorage('wf_vendor_portal_form_v', list);
    }
    if (vendorId) {
      return list.filter((f) => f.vendor_id === vendorId);
    }
    return list;
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
    const vendor = vendors.find((v) => v.id === payload.vendor_id) || vendors[0] || SEED_ORGANIZATION;
    const all = this.getPrincipalEmployerFormVs();

    const certNum = `FORM-V/JCS/2026/${Math.floor(100 + Math.random() * 900)}`;
    const newFormV: PrincipalEmployerFormV = {
      id: `formv-${Date.now()}`,
      tenant_id: vendor.tenant_id,
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      certificate_number: certNum,
      issue_date: new Date().toISOString().split('T')[0],
      principal_employer_name: 'Joy Corporate Solutions Pvt Ltd',
      principal_employer_address: '42 SIDCO Industrial Complex, Coimbatore, TN - 641021',
      principal_employer_registration_no: 'RC/TN/CBE/CLRA/2022/9918',
      contractor_name: vendor.name,
      contractor_address: vendor.address,
      nature_of_work: payload.nature_of_work,
      max_contract_labour_capacity: payload.max_workers,
      duration_from: payload.duration_from,
      duration_to: payload.duration_to,
      site_location: payload.site_location,
      issued_by_name: payload.issued_by_name || 'HR Head',
      issued_by_designation: payload.issued_by_designation || 'Head of HR & Legal Compliance',
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

    return newFormV;
  },
};

