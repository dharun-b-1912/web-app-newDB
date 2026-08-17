import {
  Vendor,
  VendorType,
  VendorStatus,
  VendorContract,
  VendorDocument,
  VendorPayment,
  VendorEmployeeAssignment,
  VendorSavedView,
  VendorAuditLog,
  Employee,
  VendorReturnReason,
} from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { api } from './api';

const VENDOR_STORAGE_KEY = 'workforce_vendors_master';
const VENDOR_CONTRACTS_KEY = 'workforce_vendor_contracts';
const VENDOR_DOCS_KEY = 'workforce_vendor_docs';
const VENDOR_PAYMENTS_KEY = 'workforce_vendor_payments';
const VENDOR_ASSIGNMENTS_KEY = 'workforce_vendor_assignments';
const VENDOR_SAVED_VIEWS_KEY = 'workforce_vendor_saved_views';
const VENDOR_AUDIT_KEY = 'workforce_vendor_audit';

// Canonical Initial Vendors
const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'e2000000-0000-0000-0000-000000000001',
    organization_id: 'a0000000-0000-0000-0000-000000000001',
    legal_entity_id: 'c1000000-0000-0000-0000-000000000001',
    legal_entity_name: 'Joy Corporate Solutions Pvt Ltd',
    vendor_code: 'VEN-000001',
    legal_name: 'ABC Workforce Solutions Pvt Ltd',
    trade_name: 'ABC Workforce',
    vendor_type: 'MANPOWER_PROVIDER',
    status: 'ACTIVE',
    registration_number: 'U74999TN2020PTC134567',
    tax_id: '33AABCW1234F1Z5',
    pan: 'AABCW1234F',
    gstin: '33AABCW1234F1Z5',
    primary_contact_name: 'Ramesh Chandran',
    primary_contact_designation: 'Director - Enterprise Partnerships',
    primary_contact_email: 'contracts@abcworkforce.in',
    primary_contact_phone: '+91 98400 11223',
    alternate_phone: '+91 44 2233 4455',
    website: 'https://abcworkforcesolutions.in',
    address_line1: '45 Anna Salai, Guindy Industrial Estate',
    address_line2: 'Floor 3, Tech Tower',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postal_code: '600032',
    country: 'India',
    manpower_license_no: 'ML-TN-CHN-2022-8901',
    manpower_license_expiry: '2027-03-31',
    max_workforce_capacity: 150,
    authorized_workforce_categories: ['Contract Labour', 'Facility Operations', 'Technical Staffing'],
    contract_start_date: '2025-01-01',
    contract_end_date: '2026-12-31',
    payment_terms: 'Net 30',
    currency: 'INR',
    payment_method: 'Bank Transfer',
    bank_name: 'ICICI Bank Ltd',
    account_name: 'ABC Workforce Solutions Pvt Ltd',
    account_number_masked: '•••• •••• 8821',
    account_number_encrypted: 'ENC_AC_8821',
    ifsc_code: 'ICIC0001234',
    swift_code: 'ICICINBBCTS',
    bank_branch: 'Guindy Branch, Chennai',
    notes: 'Primary manpower provider for engineering facilities, infrastructure and field operations.',
    deployed_workforce_count: 2,
    active_contracts_count: 1,
    compliance_issues_count: 0,
    pending_payments_count: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'e2000000-0000-0000-0000-000000000002',
    organization_id: 'a0000000-0000-0000-0000-000000000001',
    legal_entity_id: 'c1000000-0000-0000-0000-000000000001',
    legal_entity_name: 'Joy Corporate Solutions Pvt Ltd',
    vendor_code: 'VEN-000002',
    legal_name: 'Apex Technical Staffing India LLP',
    trade_name: 'Apex Staffing',
    vendor_type: 'RECRUITMENT_AGENCY',
    status: 'ACTIVE',
    registration_number: 'AAB-1234',
    tax_id: '33AAPEX5678G1Z9',
    pan: 'AAPEX5678G',
    gstin: '33AAPEX5678G1Z9',
    primary_contact_name: 'Swaminathan V',
    primary_contact_designation: 'Client Relationship Manager',
    primary_contact_email: 'accounts@apexstaffing.com',
    primary_contact_phone: '+91 98840 55667',
    address_line1: '12 Avinashi Road, Peelamedu',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    postal_code: '641004',
    country: 'India',
    contract_start_date: '2025-02-01',
    contract_end_date: '2026-09-30',
    payment_terms: 'Net 15',
    currency: 'INR',
    payment_method: 'Bank Transfer',
    bank_name: 'HDFC Bank Ltd',
    account_name: 'Apex Technical Staffing India LLP',
    account_number_masked: '•••• •••• 4410',
    ifsc_code: 'HDFC0000456',
    bank_branch: 'Peelamedu, Coimbatore',
    notes: 'Recruitment and lateral contingent placement vendor for DevOps and QA.',
    deployed_workforce_count: 0,
    active_contracts_count: 1,
    compliance_issues_count: 0,
    pending_payments_count: 0,
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
];

const INITIAL_CONTRACTS: VendorContract[] = [
  {
    id: 'cnt-001',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    legal_entity_id: 'c1000000-0000-0000-0000-000000000001',
    legal_entity_name: 'Joy Corporate Solutions Pvt Ltd',
    contract_number: 'MSA-2025-ABC-01',
    contract_type: 'Master Service Agreement (MSA)',
    start_date: '2025-01-01',
    end_date: '2026-12-31',
    renewal_date: '2026-11-30',
    notice_period_days: 60,
    payment_terms: 'Net 30',
    currency: 'INR',
    status: 'ACTIVE',
    notes: '2-year master workforce supply agreement with rate card appendix.',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'cnt-002',
    vendor_id: 'e2000000-0000-0000-0000-000000000002',
    legal_entity_id: 'c1000000-0000-0000-0000-000000000001',
    legal_entity_name: 'Joy Corporate Solutions Pvt Ltd',
    contract_number: 'SOW-2025-APEX-02',
    contract_type: 'Contingent Staffing Agreement',
    start_date: '2025-02-01',
    end_date: '2026-09-30',
    renewal_date: '2026-08-31',
    notice_period_days: 30,
    payment_terms: 'Net 15',
    currency: 'INR',
    status: 'ACTIVE',
    notes: 'Contingent technical staffing agreement.',
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
];

const INITIAL_DOCS: VendorDocument[] = [
  {
    id: 'vdoc-001',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    document_type: 'Agreement',
    document_name: 'Signed Master Service Agreement (MSA)',
    file_name: 'ABC_MSA_Executed_2025.pdf',
    uploaded_at: '2025-01-05T00:00:00Z',
    expiry_date: '2026-12-31',
    verification_status: 'VERIFIED',
    verified_by: 'user-admin-01',
    verified_at: '2025-01-06T00:00:00Z',
    notes: 'Executed by Managing Director.',
  },
  {
    id: 'vdoc-002',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    document_type: 'Manpower License',
    document_name: 'Contract Labour Regulation License (Form VI)',
    file_name: 'ABC_Labour_License_2022_27.pdf',
    uploaded_at: '2025-01-05T00:00:00Z',
    expiry_date: '2027-03-31',
    verification_status: 'VERIFIED',
    verified_by: 'user-admin-01',
    verified_at: '2025-01-06T00:00:00Z',
  },
  {
    id: 'vdoc-003',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    document_type: 'GST Certificate',
    document_name: 'GST Registration Certificate (REG-06)',
    file_name: 'ABC_GST_REG06.pdf',
    uploaded_at: '2025-01-05T00:00:00Z',
    verification_status: 'VERIFIED',
  },
  {
    id: 'vdoc-004',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    document_type: 'Bank Proof',
    document_name: 'Cancelled Cheque & Bank Mandate',
    file_name: 'ABC_ICICI_Cancelled_Cheque.pdf',
    uploaded_at: '2025-01-05T00:00:00Z',
    verification_status: 'VERIFIED',
  },
];

const INITIAL_PAYMENTS: VendorPayment[] = [
  {
    id: 'vpay-001',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    legal_entity_name: 'Joy Corporate Solutions Pvt Ltd',
    invoice_reference: 'INV-ABC-2026-07',
    payment_reference: 'UTR-HDFC-991823',
    amount: 145000,
    currency: 'INR',
    payment_date: '2026-08-05',
    payment_method: 'NEFT/RTGS',
    status: 'PAID',
    bank_reference: 'ICICI000998811',
    notes: 'Monthly deployed workforce billing for July 2026.',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-05T00:00:00Z',
  },
  {
    id: 'vpay-002',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    legal_entity_name: 'Joy Corporate Solutions Pvt Ltd',
    invoice_reference: 'INV-ABC-2026-06',
    payment_reference: 'UTR-HDFC-882110',
    amount: 142000,
    currency: 'INR',
    payment_date: '2026-07-05',
    payment_method: 'NEFT/RTGS',
    status: 'PAID',
    bank_reference: 'ICICI000881122',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-05T00:00:00Z',
  },
];

const INITIAL_ASSIGNMENTS: VendorEmployeeAssignment[] = [
  {
    id: 'vasgn-001',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    vendor_name: 'ABC Workforce Solutions Pvt Ltd',
    employee_id: 'emp-vnd-001',
    legal_entity_name: 'Joy Corporate Solutions Pvt Ltd',
    deployment_role: 'Facilities & Operations Specialist',
    contract_reference: 'MSA-2025-ABC-01',
    start_date: '2025-05-01',
    end_date: '2026-12-31',
    status: 'ACTIVE',
    created_at: '2025-05-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'vasgn-002',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    vendor_name: 'ABC Workforce Solutions Pvt Ltd',
    employee_id: 'emp-vnd-002',
    legal_entity_name: 'Joy Corporate Solutions Pvt Ltd',
    deployment_role: 'Technical Support Specialist',
    contract_reference: 'MSA-2025-ABC-01',
    start_date: '2025-06-01',
    end_date: '2026-12-31',
    status: 'ACTIVE',
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
];

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`[VendorService] Storage write error for ${key}:`, err);
  }
}

export const vendorService = {
  // 1. Get All Vendors with Real Aggregates
  async getVendors(params?: {
    search?: string;
    vendorType?: string;
    status?: string;
    legalEntityId?: string;
    city?: string;
    segment?: string;
  }): Promise<Vendor[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('vendors').select('*');
        if (params?.status && params.status !== 'ALL') q = q.eq('status', params.status);
        if (params?.vendorType && params.vendorType !== 'ALL') q = q.eq('vendor_type', params.vendorType);
        if (params?.legalEntityId && params.legalEntityId !== 'ALL') q = q.eq('legal_entity_id', params.legalEntityId);
        const { data, error } = await q;
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[VendorService] Supabase getVendors failed:', err);
      }
    }

    let list = getStorage<Vendor[]>(VENDOR_STORAGE_KEY, INITIAL_VENDORS);
    if (!list || list.length === 0) {
      list = INITIAL_VENDORS;
      setStorage(VENDOR_STORAGE_KEY, list);
    }

    // Refresh dynamically computed workforce counts & contract status
    const assignments = getStorage<VendorEmployeeAssignment[]>(VENDOR_ASSIGNMENTS_KEY, INITIAL_ASSIGNMENTS);
    const contracts = getStorage<VendorContract[]>(VENDOR_CONTRACTS_KEY, INITIAL_CONTRACTS);
    const docs = getStorage<VendorDocument[]>(VENDOR_DOCS_KEY, INITIAL_DOCS);
    const payments = getStorage<VendorPayment[]>(VENDOR_PAYMENTS_KEY, INITIAL_PAYMENTS);

    list = list.map((v) => {
      const activeWorkforce = assignments.filter((a) => a.vendor_id === v.id && a.status === 'ACTIVE').length;
      const activeContracts = contracts.filter((c) => c.vendor_id === v.id && c.status === 'ACTIVE').length;
      const pendingDocs = docs.filter((d) => d.vendor_id === v.id && (d.verification_status === 'PENDING' || d.verification_status === 'REJECTED')).length;
      const pendingPayments = payments.filter((p) => p.vendor_id === v.id && (p.status === 'PENDING' || p.status === 'RETURNED')).length;

      return {
        ...v,
        deployed_workforce_count: activeWorkforce,
        active_contracts_count: activeContracts,
        compliance_issues_count: pendingDocs,
        pending_payments_count: pendingPayments,
      };
    });

    if (!params) return list;

    // Apply Multi-Dimensional Filters
    return list.filter((v) => {
      const q = (params.search || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.legal_name.toLowerCase().includes(q) ||
        (v.trade_name && v.trade_name.toLowerCase().includes(q)) ||
        v.vendor_code.toLowerCase().includes(q) ||
        v.primary_contact_name.toLowerCase().includes(q) ||
        v.primary_contact_email.toLowerCase().includes(q) ||
        (v.tax_id && v.tax_id.toLowerCase().includes(q)) ||
        (v.registration_number && v.registration_number.toLowerCase().includes(q));

      const matchesType = !params.vendorType || params.vendorType === 'ALL' || v.vendor_type === params.vendorType;
      const matchesStatus = !params.status || params.status === 'ALL' || v.status === params.status;
      const matchesCity = !params.city || params.city === 'ALL' || (v.city && v.city.toLowerCase() === params.city.toLowerCase());

      // Segment filters
      let matchesSegment = true;
      if (params.segment === 'ACTIVE_VENDORS') matchesSegment = v.status === 'ACTIVE';
      else if (params.segment === 'MANPOWER_PROVIDERS') matchesSegment = v.vendor_type === 'MANPOWER_PROVIDER';
      else if (params.segment === 'CONTRACTORS') matchesSegment = v.vendor_type === 'CONTRACTOR';
      else if (params.segment === 'COMPLIANCE_PENDING') matchesSegment = (v.compliance_issues_count || 0) > 0;
      else if (params.segment === 'PAYMENT_ISSUES') matchesSegment = (v.pending_payments_count || 0) > 0;
      else if (params.segment === 'ACTIVE_WORKFORCE') matchesSegment = (v.deployed_workforce_count || 0) > 0;

      return matchesSearch && matchesType && matchesStatus && matchesCity && matchesSegment;
    });
  },

  // 2. Get Vendor by ID with Relationships
  async getVendorById(id: string): Promise<Vendor | undefined> {
    const list = await this.getVendors();
    return list.find((v) => v.id === id);
  },

  // 3. Create Vendor with Auto-Generated VEN-00000X Code & Audit
  async createVendor(data: Partial<Vendor>): Promise<Vendor> {
    const list = getStorage<Vendor[]>(VENDOR_STORAGE_KEY, INITIAL_VENDORS);

    // Auto-generate next unique code VEN-00000X
    const existingNums = list
      .map((v) => v.vendor_code)
      .filter((c) => /^VEN-\d+$/.test(c))
      .map((c) => parseInt(c.replace('VEN-', ''), 10));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    const nextCode = `VEN-${String(maxNum + 1).padStart(6, '0')}`;

    const newVendor: Vendor = {
      id: `e2000000-0000-0000-0000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`,
      organization_id: data.organization_id || 'a0000000-0000-0000-0000-000000000001',
      legal_entity_id: data.legal_entity_id || 'c1000000-0000-0000-0000-000000000001',
      legal_entity_name: data.legal_entity_name || 'Joy Corporate Solutions Pvt Ltd',
      vendor_code: data.vendor_code || nextCode,
      legal_name: data.legal_name || 'New Vendor',
      trade_name: data.trade_name || data.legal_name,
      vendor_type: data.vendor_type || 'MANPOWER_PROVIDER',
      status: data.status || 'DRAFT',
      registration_number: data.registration_number,
      tax_id: data.tax_id,
      pan: data.pan,
      gstin: data.gstin,
      primary_contact_name: data.primary_contact_name || 'Admin',
      primary_contact_designation: data.primary_contact_designation,
      primary_contact_email: data.primary_contact_email || 'admin@vendor.in',
      primary_contact_phone: data.primary_contact_phone || '+91 00000 00000',
      alternate_phone: data.alternate_phone,
      website: data.website,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city || 'Coimbatore',
      state: data.state || 'Tamil Nadu',
      postal_code: data.postal_code,
      country: data.country || 'India',
      manpower_license_no: data.manpower_license_no,
      manpower_license_expiry: data.manpower_license_expiry,
      max_workforce_capacity: data.max_workforce_capacity || 50,
      authorized_workforce_categories: data.authorized_workforce_categories || ['Contract Labour', 'Facility Staff'],
      contract_start_date: data.contract_start_date,
      contract_end_date: data.contract_end_date,
      payment_terms: data.payment_terms || 'Net 30',
      currency: data.currency || 'INR',
      payment_method: data.payment_method || 'Bank Transfer',
      bank_name: data.bank_name,
      account_name: data.account_name,
      account_number_masked: data.account_number_masked,
      ifsc_code: data.ifsc_code,
      swift_code: data.swift_code,
      bank_branch: data.bank_branch,
      notes: data.notes,
      deployed_workforce_count: 0,
      active_contracts_count: 0,
      compliance_issues_count: 0,
      pending_payments_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled) {
      try {
        await supabase.from('vendors').insert(newVendor);
      } catch (err) {
        console.warn('[VendorService] Supabase insert vendor failed:', err);
      }
    }

    setStorage(VENDOR_STORAGE_KEY, [newVendor, ...list]);
    await this.logAudit(newVendor.id, 'VENDOR_CREATED', null, newVendor);
    hrEventBus.publish('vendor.created', newVendor);
    return newVendor;
  },

  // 4. Update Vendor
  async updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor> {
    const list = getStorage<Vendor[]>(VENDOR_STORAGE_KEY, INITIAL_VENDORS);
    const idx = list.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error('Vendor not found');

    const oldVal = list[idx];
    const updated = { ...oldVal, ...data, updated_at: new Date().toISOString() };

    if (isSupabaseEnabled) {
      try {
        await supabase.from('vendors').update(updated).eq('id', id);
      } catch (err) {
        console.warn('[VendorService] Supabase update vendor failed:', err);
      }
    }

    list[idx] = updated;
    setStorage(VENDOR_STORAGE_KEY, list);
    await this.logAudit(id, 'VENDOR_UPDATED', oldVal, updated);

    if (oldVal.status !== updated.status) {
      hrEventBus.publish('vendor.status_changed', { vendorId: id, oldStatus: oldVal.status, newStatus: updated.status });
    }
    hrEventBus.publish('vendor.updated', updated);
    return updated;
  },

  // 5. Activation Validation Rule (Section 44)
  async validateActivationEligibility(vendorId: string): Promise<{ eligible: boolean; reasons: string[] }> {
    const vendor = await this.getVendorById(vendorId);
    if (!vendor) return { eligible: false, reasons: ['Vendor record not found'] };

    const reasons: string[] = [];
    if (!vendor.legal_name || !vendor.vendor_type) {
      reasons.push('Missing basic legal identity or vendor type');
    }
    if (!vendor.tax_id && !vendor.pan && !vendor.registration_number) {
      reasons.push('Missing tax or legal registration identifier (PAN/GSTIN/CIN)');
    }
    if (!vendor.primary_contact_name || !vendor.primary_contact_email || !vendor.primary_contact_phone) {
      reasons.push('Missing primary contact name, email, or phone');
    }
    if (!vendor.bank_name || !vendor.account_number_masked) {
      reasons.push('Missing bank disbursement account details');
    }

    const contracts = await this.getVendorContracts(vendorId);
    if (contracts.length === 0 || !contracts.some((c) => c.status === 'ACTIVE')) {
      reasons.push('No active service agreement or contract attached');
    }

    if (vendor.vendor_type === 'MANPOWER_PROVIDER' && !vendor.manpower_license_no) {
      reasons.push('Manpower Providers require a valid Labour Supply / Form VI License number');
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  },

  // 6. Contracts Management
  async getVendorContracts(vendorId: string): Promise<VendorContract[]> {
    const contracts = getStorage<VendorContract[]>(VENDOR_CONTRACTS_KEY, INITIAL_CONTRACTS);
    return contracts.filter((c) => c.vendor_id === vendorId);
  },

  async createContract(data: Omit<VendorContract, 'id' | 'created_at' | 'updated_at'>): Promise<VendorContract> {
    const list = getStorage<VendorContract[]>(VENDOR_CONTRACTS_KEY, INITIAL_CONTRACTS);
    const newContract: VendorContract = {
      ...data,
      id: `cnt-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStorage(VENDOR_CONTRACTS_KEY, [newContract, ...list]);
    await this.logAudit(data.vendor_id, 'CONTRACT_CREATED', null, newContract);
    hrEventBus.publish('vendor.contract_created', newContract);
    return newContract;
  },

  // 7. Compliance Documents
  async getVendorDocuments(vendorId: string): Promise<VendorDocument[]> {
    const docs = getStorage<VendorDocument[]>(VENDOR_DOCS_KEY, INITIAL_DOCS);
    return docs.filter((d) => d.vendor_id === vendorId);
  },

  async uploadDocument(data: Omit<VendorDocument, 'id' | 'uploaded_at'>): Promise<VendorDocument> {
    const list = getStorage<VendorDocument[]>(VENDOR_DOCS_KEY, INITIAL_DOCS);
    const newDoc: VendorDocument = {
      ...data,
      id: `vdoc-${Date.now().toString(36)}`,
      uploaded_at: new Date().toISOString(),
    };

    setStorage(VENDOR_DOCS_KEY, [newDoc, ...list]);
    await this.logAudit(data.vendor_id, 'DOCUMENT_UPLOADED', null, newDoc);
    hrEventBus.publish('vendor.document_uploaded', newDoc);
    return newDoc;
  },

  async verifyDocument(docId: string, status: VendorDocument['verification_status'], notes?: string): Promise<VendorDocument> {
    const list = getStorage<VendorDocument[]>(VENDOR_DOCS_KEY, INITIAL_DOCS);
    const idx = list.findIndex((d) => d.id === docId);
    if (idx === -1) throw new Error('Document not found');

    const updated = {
      ...list[idx],
      verification_status: status,
      verified_at: new Date().toISOString(),
      notes: notes || list[idx].notes,
    };

    list[idx] = updated;
    setStorage(VENDOR_DOCS_KEY, list);
    await this.logAudit(updated.vendor_id, 'DOCUMENT_VERIFIED', list[idx], updated);
    hrEventBus.publish('vendor.document_verified', updated);
    return updated;
  },

  // 8. Payment Ledger & Returned Payments Workflow (Section 16, 17)
  async getVendorPayments(vendorId: string): Promise<VendorPayment[]> {
    const payments = getStorage<VendorPayment[]>(VENDOR_PAYMENTS_KEY, INITIAL_PAYMENTS);
    return payments.filter((p) => p.vendor_id === vendorId);
  },

  async recordPayment(data: Omit<VendorPayment, 'id' | 'created_at' | 'updated_at'>): Promise<VendorPayment> {
    const list = getStorage<VendorPayment[]>(VENDOR_PAYMENTS_KEY, INITIAL_PAYMENTS);
    const newPayment: VendorPayment = {
      ...data,
      id: `vpay-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStorage(VENDOR_PAYMENTS_KEY, [newPayment, ...list]);
    await this.logAudit(data.vendor_id, 'PAYMENT_RECORDED', null, newPayment);
    hrEventBus.publish('vendor.payment_created', newPayment);
    return newPayment;
  },

  async markPaymentReturned(
    paymentId: string,
    reason: VendorReturnReason,
    notes: string,
    bankRef?: string
  ): Promise<VendorPayment> {
    const list = getStorage<VendorPayment[]>(VENDOR_PAYMENTS_KEY, INITIAL_PAYMENTS);
    const idx = list.findIndex((p) => p.id === paymentId);
    if (idx === -1) throw new Error('Payment record not found');

    const oldVal = list[idx];
    const updated: VendorPayment = {
      ...oldVal,
      status: 'RETURNED',
      return_reason: reason,
      returned_date: new Date().toISOString().split('T')[0],
      resolution_notes: notes,
      bank_reference: bankRef || oldVal.bank_reference,
      updated_at: new Date().toISOString(),
    };

    list[idx] = updated;
    setStorage(VENDOR_PAYMENTS_KEY, list);
    await this.logAudit(updated.vendor_id, 'PAYMENT_RETURNED', oldVal, updated);
    hrEventBus.publish('vendor.payment_returned', updated);
    return updated;
  },

  async resolveReturnedPayment(paymentId: string, resolutionNotes: string): Promise<VendorPayment> {
    const list = getStorage<VendorPayment[]>(VENDOR_PAYMENTS_KEY, INITIAL_PAYMENTS);
    const idx = list.findIndex((p) => p.id === paymentId);
    if (idx === -1) throw new Error('Payment record not found');

    const oldVal = list[idx];
    const updated: VendorPayment = {
      ...oldVal,
      status: 'PAID',
      resolution_notes: `[Resolved on ${new Date().toISOString().split('T')[0]}] ${resolutionNotes}`,
      updated_at: new Date().toISOString(),
    };

    list[idx] = updated;
    setStorage(VENDOR_PAYMENTS_KEY, list);
    await this.logAudit(updated.vendor_id, 'PAYMENT_RESOLVED', oldVal, updated);
    hrEventBus.publish('vendor.payment_created', updated);
    return updated;
  },

  // 9. Vendor Workforce & Assignments (JOIN Canonical Employees)
  async getVendorWorkforce(vendorId: string): Promise<VendorEmployeeAssignment[]> {
    const assignments = getStorage<VendorEmployeeAssignment[]>(VENDOR_ASSIGNMENTS_KEY, INITIAL_ASSIGNMENTS);
    const vendorAssignments = assignments.filter((a) => a.vendor_id === vendorId);

    // Join with canonical employee master
    const allEmployees = await api.getEmployees();
    return vendorAssignments.map((asgn) => {
      const emp = allEmployees.find((e) => e.id === asgn.employee_id);
      return {
        ...asgn,
        employee: emp,
      };
    });
  },

  async assignEmployeeToVendor(data: Omit<VendorEmployeeAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<VendorEmployeeAssignment> {
    const list = getStorage<VendorEmployeeAssignment[]>(VENDOR_ASSIGNMENTS_KEY, INITIAL_ASSIGNMENTS);
    const newAsgn: VendorEmployeeAssignment = {
      ...data,
      id: `vasgn-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStorage(VENDOR_ASSIGNMENTS_KEY, [newAsgn, ...list]);
    await this.logAudit(data.vendor_id, 'EMPLOYEE_ASSIGNED', null, newAsgn);
    hrEventBus.publish('vendor.employee_assigned', newAsgn);
    return newAsgn;
  },

  async endEmployeeDeployment(assignmentId: string, endDate?: string, notes?: string): Promise<VendorEmployeeAssignment> {
    const list = getStorage<VendorEmployeeAssignment[]>(VENDOR_ASSIGNMENTS_KEY, INITIAL_ASSIGNMENTS);
    const idx = list.findIndex((a) => a.id === assignmentId);
    if (idx === -1) throw new Error('Assignment not found');

    const oldVal = list[idx];
    const updated: VendorEmployeeAssignment = {
      ...oldVal,
      status: 'COMPLETED',
      end_date: endDate || new Date().toISOString().split('T')[0],
      notes: notes || oldVal.notes,
      updated_at: new Date().toISOString(),
    };

    list[idx] = updated;
    setStorage(VENDOR_ASSIGNMENTS_KEY, list);
    await this.logAudit(updated.vendor_id, 'EMPLOYEE_DEPLOYMENT_ENDED', oldVal, updated);
    hrEventBus.publish('vendor.employee_removed', updated);
    return updated;
  },

  // 10. Saved Views Persistence (Section 29)
  async getSavedViews(): Promise<VendorSavedView[]> {
    return getStorage<VendorSavedView[]>(VENDOR_SAVED_VIEWS_KEY, [
      {
        id: 'view-01',
        user_id: 'user-admin-01',
        organization_id: 'a0000000-0000-0000-0000-000000000001',
        name: 'Active Manpower Providers — Tamil Nadu',
        filters: {
          vendor_type: 'MANPOWER_PROVIDER',
          status: 'ACTIVE',
          city: 'Chennai',
        },
        is_default: false,
        created_at: '2026-08-01T00:00:00Z',
      },
    ]);
  },

  async saveView(name: string, filters: any): Promise<VendorSavedView> {
    const views = await this.getSavedViews();
    const newView: VendorSavedView = {
      id: `view-${Date.now().toString(36)}`,
      user_id: 'user-admin-01',
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      name,
      filters,
      created_at: new Date().toISOString(),
    };
    setStorage(VENDOR_SAVED_VIEWS_KEY, [newView, ...views]);
    return newView;
  },

  // 11. Audit Logging (Section 36)
  async logAudit(vendorId: string, action: string, oldVal: any, newVal: any): Promise<void> {
    const logs = getStorage<VendorAuditLog[]>(VENDOR_AUDIT_KEY, []);
    const log: VendorAuditLog = {
      id: `vaudit-${Date.now().toString(36)}`,
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      vendor_id: vendorId,
      actor_id: 'user-admin-01',
      actor_name: 'Dharun Joy (Company Admin)',
      action,
      old_value: oldVal,
      new_value: newVal,
      created_at: new Date().toISOString(),
    };
    setStorage(VENDOR_AUDIT_KEY, [log, ...logs]);
  },

  async getAuditLogs(vendorId: string): Promise<VendorAuditLog[]> {
    const logs = getStorage<VendorAuditLog[]>(VENDOR_AUDIT_KEY, []);
    return logs.filter((l) => l.vendor_id === vendorId);
  },
};
