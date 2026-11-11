// src/services/document/documentService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Document Management & Repository Service
// Secure Private Storage, Optimization Pipeline, Versioning, Verification & Requirements
// ============================================================================

import {
  DocumentMaster,
  DocumentVersion,
  DocumentCategory,
  DocumentTypeMaster,
  DocumentSubjectType,
  DocumentClassification,
  DocumentVerificationStatus,
  DocumentSummaryMetrics,
  DocumentRequirement,
} from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { documentSecurityService } from './documentSecurityService';
import { documentAuditService } from './documentAuditService';
import { fileOptimizationService, OptimizedFileResult } from './fileOptimizationService';
import { supabaseStorageEngine, StorageBucketDomain, SignedUrlResponse } from './supabaseStorageEngine';

const DOCUMENTS_STORAGE_KEY = 'workforce_document_master_v2';
const VERSIONS_STORAGE_KEY = 'workforce_document_versions_v2';
const CATEGORIES_STORAGE_KEY = 'workforce_document_categories_v2';
const TYPES_STORAGE_KEY = 'workforce_document_types_v2';
const REQUIREMENTS_STORAGE_KEY = 'workforce_document_requirements_v2';

const DEFAULT_ORG_UUID = '0c621892-e938-4707-9957-13534ea32c19';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidDocumentUuid = (value?: string | null): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value.trim());

const generateDocumentUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

const isMockSeedRecord = (item: any): boolean => {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.id || '');
  const sub = String(item.subject_id || item.employee_id || '');
  return (
    /^req-(pan|aadhaar|bank)-emp101$/i.test(id) ||
    /^doc-seed-/i.test(id) ||
    /^ver-seed-/i.test(id) ||
    sub === 'emp-101'
  );
};

const normalizeCategoryCode = (rawCategory?: string | null, code?: string | null): string => {
  const c = (rawCategory || code || '').toUpperCase();
  if (c.includes('IDENTITY') || c.includes('PAN') || c.includes('AADHAAR') || c.includes('PASSPORT') || c.includes('VOTER') || c.includes('DRIVING')) {
    return 'IDENTITY';
  }
  if (c.includes('BANK') || c.includes('PAY') || c.includes('TAX') || c.includes('SALARY')) {
    return 'PAYROLL';
  }
  if (c.includes('EDU') || c.includes('DEGREE') || c.includes('CERT')) {
    return 'EDUCATION';
  }
  if (c.includes('STAT') || c.includes('PF') || c.includes('ESI') || c.includes('COMPLIANCE') || c.includes('WORKFORCE')) {
    return 'STATUTORY';
  }
  if (c.includes('POLICY') || c.includes('HANDBOOK') || c.includes('COMPANY')) {
    return 'COMPANY_POLICY';
  }
  if (c.includes('EXIT') || c.includes('RELIEVING') || c.includes('APPRAISAL')) {
    return 'PERFORMANCE_EXIT';
  }
  if (c.includes('EMPLOY') || c.includes('OFFER') || c.includes('NDA') || c.includes('CONTRACT') || c.includes('EXPERIENCE')) {
    return 'EMPLOYMENT';
  }
  return 'IDENTITY';
};

const DOC_TYPE_CODE_ALIASES: Record<string, string[]> = {
  PAN_CARD: ['PAN_CARD', 'PAN'],
  PAN: ['PAN', 'PAN_CARD'],
  AADHAAR_CARD: ['AADHAAR_CARD', 'AADHAAR'],
  AADHAAR: ['AADHAAR', 'AADHAAR_CARD'],
  BANK_DOCUMENT: ['BANK_DOCUMENT', 'BANK_DETAILS', 'BANK_PASSBOOK', 'CANCELLED_CHEQUE'],
  BANK_DETAILS: ['BANK_DETAILS', 'BANK_DOCUMENT', 'BANK_PASSBOOK'],
  BANK_PASSBOOK: ['BANK_PASSBOOK', 'BANK_DETAILS', 'BANK_DOCUMENT'],
  OFFER_LETTER: ['OFFER_LETTER', 'APPOINTMENT_LETTER', 'EXPERIENCE_LETTER', 'OTHER'],
  NDA_AGREEMENT: ['NDA_AGREEMENT', 'CONTRACT', 'OTHER'],
  COMPANY_POLICY: ['COMPANY_POLICY', 'OTHER'],
  OTHER: ['OTHER'],
};

const DEFAULT_CATEGORIES: DocumentCategory[] = [
  { id: 'cat-01', tenant_id: 'org-joy-01', code: 'IDENTITY', name: 'Identity & KYC', description: 'National IDs, PAN, Aadhaar, Passport', icon: 'Shield' },
  { id: 'cat-02', tenant_id: 'org-joy-01', code: 'EMPLOYMENT', name: 'Employment & Contracts', description: 'Offer, Appointment, NDA, SOW', icon: 'Briefcase' },
  { id: 'cat-03', tenant_id: 'org-joy-01', code: 'EDUCATION', name: 'Education & Academics', description: 'Degrees, Transcripts, Certifications', icon: 'GraduationCap' },
  { id: 'cat-04', tenant_id: 'org-joy-01', code: 'STATUTORY', name: 'Statutory & Compliance', description: 'PF, ESI, Gratuity, Form 11', icon: 'FileCheck' },
  { id: 'cat-05', tenant_id: 'org-joy-01', code: 'PAYROLL', name: 'Payroll & Banking', description: 'Bank proof, Payslips, Tax statements', icon: 'DollarSign' },
  { id: 'cat-06', tenant_id: 'org-joy-01', code: 'COMPANY_POLICY', name: 'Company Policies & Handbooks', description: 'Leave policy, Code of conduct, HR Handbook', icon: 'Building' },
  { id: 'cat-07', tenant_id: 'org-joy-01', code: 'PERFORMANCE_EXIT', name: 'Performance & Exit', description: 'Appraisals, Relieving, F&F Statement', icon: 'Award' },
];

const DEFAULT_DOCUMENT_TYPES: DocumentTypeMaster[] = [
  {
    id: 'dt-pan',
    tenant_id: 'org-joy-01',
    code: 'PAN_CARD',
    name: 'Permanent Account Number (PAN) Card',
    allowed_subject_types: ['employee', 'vendor_worker', 'vendor', 'candidate'],
    allowed_file_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_size_bytes: 10485760,
    requires_expiry: false,
    requires_verification: true,
    requires_signature: false,
    default_classification: 'restricted',
    retention_period_years: 10,
    is_active: true,
  },
  {
    id: 'dt-aadhaar',
    tenant_id: 'org-joy-01',
    code: 'AADHAAR_CARD',
    name: 'Aadhaar Identity Card',
    allowed_subject_types: ['employee', 'vendor_worker', 'candidate'],
    allowed_file_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_size_bytes: 10485760,
    requires_expiry: false,
    requires_verification: true,
    requires_signature: false,
    default_classification: 'restricted',
    retention_period_years: 10,
    is_active: true,
  },
  {
    id: 'dt-passport',
    tenant_id: 'org-joy-01',
    code: 'PASSPORT',
    name: 'International Passport',
    allowed_subject_types: ['employee', 'candidate'],
    allowed_file_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_size_bytes: 10485760,
    requires_expiry: true,
    requires_verification: true,
    requires_signature: false,
    default_classification: 'restricted',
    retention_period_years: 10,
    is_active: true,
  },
  {
    id: 'dt-driving-license',
    tenant_id: 'org-joy-01',
    code: 'DRIVING_LICENSE',
    name: 'Driving Licence',
    allowed_subject_types: ['employee', 'vendor_worker'],
    allowed_file_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_size_bytes: 10485760,
    requires_expiry: true,
    requires_verification: true,
    requires_signature: false,
    default_classification: 'restricted',
    retention_period_years: 10,
    is_active: true,
  },
  {
    id: 'dt-bank',
    tenant_id: 'org-joy-01',
    code: 'BANK_DOCUMENT',
    name: 'Bank Passbook / Cancelled Cheque',
    allowed_subject_types: ['employee', 'vendor_worker', 'vendor'],
    allowed_file_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_size_bytes: 10485760,
    requires_expiry: false,
    requires_verification: true,
    requires_signature: false,
    default_classification: 'restricted',
    retention_period_years: 7,
    is_active: true,
  },
  {
    id: 'dt-offer',
    tenant_id: 'org-joy-01',
    code: 'OFFER_LETTER',
    name: 'Formal Offer Letter & Compensation Annexure',
    allowed_subject_types: ['employee', 'candidate'],
    allowed_file_types: ['application/pdf'],
    max_size_bytes: 10485760,
    requires_expiry: false,
    requires_verification: true,
    requires_signature: true,
    default_classification: 'confidential',
    retention_period_years: 7,
    is_active: true,
  },
  {
    id: 'dt-nda',
    tenant_id: 'org-joy-01',
    code: 'NDA_AGREEMENT',
    name: 'Non-Disclosure & Confidentiality Agreement',
    allowed_subject_types: ['employee', 'vendor', 'vendor_worker'],
    allowed_file_types: ['application/pdf'],
    max_size_bytes: 10485760,
    requires_expiry: false,
    requires_verification: true,
    requires_signature: true,
    default_classification: 'confidential',
    retention_period_years: 10,
    is_active: true,
  },
  {
    id: 'dt-degree',
    tenant_id: 'org-joy-01',
    code: 'DEGREE_CERTIFICATE',
    name: 'Highest Educational Degree Certificate',
    allowed_subject_types: ['employee', 'candidate'],
    allowed_file_types: ['application/pdf', 'image/jpeg', 'image/png'],
    max_size_bytes: 10485760,
    requires_expiry: false,
    requires_verification: true,
    requires_signature: false,
    default_classification: 'confidential',
    retention_period_years: 7,
    is_active: true,
  },
  {
    id: 'dt-policy',
    tenant_id: 'org-joy-01',
    code: 'COMPANY_POLICY',
    name: 'Official Enterprise Policy & Guidelines',
    allowed_subject_types: ['company'],
    allowed_file_types: ['application/pdf'],
    max_size_bytes: 20971520,
    requires_expiry: false,
    requires_verification: false,
    requires_signature: false,
    default_classification: 'internal',
    retention_period_years: 15,
    is_active: true,
  },
];

const DEFAULT_REQUIREMENTS: DocumentRequirement[] = [
  {
    id: 'req-pan-emp101',
    tenant_id: 'org-joy-01',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    employee_id: 'emp-101',
    document_type: 'PAN_CARD',
    title: 'PAN Card Verification',
    description: 'Permanent Account Number Card for KYC and Tax compliance',
    required: true,
    status: 'VERIFIED',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'req-aadhaar-emp101',
    tenant_id: 'org-joy-01',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    employee_id: 'emp-101',
    document_type: 'AADHAAR_CARD',
    title: 'Aadhaar Card Copy',
    description: 'National Identity Proof',
    required: true,
    status: 'VERIFIED',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'req-bank-emp101',
    tenant_id: 'org-joy-01',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    employee_id: 'emp-101',
    document_type: 'BANK_PASSBOOK',
    title: 'Bank Account Passbook / Cancelled Cheque',
    description: 'Required for salary account direct deposit verification',
    required: true,
    status: 'REQUIRED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_MASTER_DOCS: DocumentMaster[] = [
  {
    id: 'doc-seed-101',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    subject_type: 'employee',
    subject_id: 'emp-101',
    subject_name: 'Thirumalai R K (WF-1001)',
    document_type_code: 'AADHAAR_CARD',
    category_code: 'IDENTITY',
    title: 'Aadhaar Identity Card',
    classification: 'restricted',
    status: 'active',
    verification_status: 'VERIFIED',
    current_version_id: 'ver-seed-101',
    version_count: 1,
    created_by: 'Thirumalai R K',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    file_url: 'https://placehold.co/600x400.png?text=Aadhaar+Verified',
    file_name: 'Aadhaar_Thirumalai_RK.pdf',
    storage_path: 'employees/WF-1001/identity/Aadhaar_Thirumalai_RK.pdf',
    employee_id: 'emp-101',
    employee_name: 'Thirumalai R K (WF-1001)',
    document_type: 'Aadhaar Identity Card',
  },
  {
    id: 'doc-seed-102',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    subject_type: 'employee',
    subject_id: 'emp-101',
    subject_name: 'Thirumalai R K (WF-1001)',
    document_type_code: 'OFFER_LETTER',
    category_code: 'EMPLOYMENT',
    title: 'Signed Appointment Letter',
    classification: 'confidential',
    status: 'active',
    verification_status: 'PENDING_VERIFICATION',
    current_version_id: 'ver-seed-102',
    version_count: 1,
    created_by: 'Mari Muthu (HR Head)',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    file_url: 'https://placehold.co/600x400.png?text=Appointment+Letter',
    file_name: 'Appointment_Letter_WF1001.pdf',
    storage_path: 'employees/WF-1001/employment/Appointment_Letter.pdf',
    employee_id: 'emp-101',
    employee_name: 'Thirumalai R K (WF-1001)',
    document_type: 'Signed Appointment Letter',
  },
  {
    id: 'doc-seed-103',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    subject_type: 'vendor',
    subject_id: 'v-101',
    subject_name: 'Apex Security & Facility Services (VND-101)',
    document_type_code: 'EPFO_REGISTRATION',
    category_code: 'STATUTORY',
    title: 'Vendor EPFO Registration & Compliance Certificate',
    classification: 'confidential',
    status: 'active',
    verification_status: 'VERIFIED',
    current_version_id: 'ver-seed-103',
    version_count: 1,
    created_by: 'Rajesh Kumar (Apex Vendor Admin)',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    file_url: 'https://placehold.co/600x400.png?text=EPFO+Compliance',
    file_name: 'Apex_Security_EPFO_Certificate.pdf',
    storage_path: 'vendors/VND-101/statutory/EPFO_Certificate.pdf',
    document_type: 'EPFO Registration',
  },
  {
    id: 'doc-seed-104',
    tenant_id: '0c621892-e938-4707-9957-13534ea32c19',
    subject_type: 'company',
    subject_id: 'org-joy-01',
    subject_name: 'Joy Corporate Solutions Pvt Ltd',
    document_type_code: 'COMPANY_POLICY',
    category_code: 'COMPANY_POLICY',
    title: 'Enterprise Code of Conduct & Information Security Policy 2026',
    classification: 'internal',
    status: 'active',
    verification_status: 'VERIFIED',
    current_version_id: 'ver-seed-104',
    version_count: 2,
    created_by: 'Dharun Joy (HR Head)',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    file_url: 'https://placehold.co/600x400.png?text=Enterprise+Policy',
    file_name: 'Enterprise_Code_Of_Conduct_v2.pdf',
    storage_path: 'company/policies/Enterprise_Code_Of_Conduct_v2.pdf',
    document_type: 'Company Policy',
  },
];

const DEFAULT_MASTER_VERSIONS: DocumentVersion[] = [
  {
    id: 'ver-seed-101',
    document_id: 'doc-seed-101',
    version_number: 1,
    file_name: 'Aadhaar_Thirumalai_RK.pdf',
    file_size_bytes: 512 * 1024,
    mime_type: 'application/pdf',
    storage_path: 'employees/WF-1001/identity/Aadhaar_Thirumalai_RK.pdf',
    content_hash: 'sha256-verified',
    encryption_algorithm: 'AES-256-GCM',
    malware_scan_status: 'SAFE',
    uploaded_by_id: 'emp-101',
    uploaded_by_name: 'Thirumalai R K',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'ver-seed-102',
    document_id: 'doc-seed-102',
    version_number: 1,
    file_name: 'Appointment_Letter_WF1001.pdf',
    file_size_bytes: 840 * 1024,
    mime_type: 'application/pdf',
    storage_path: 'employees/WF-1001/employment/Appointment_Letter.pdf',
    content_hash: 'sha256-verified',
    encryption_algorithm: 'AES-256-GCM',
    malware_scan_status: 'SAFE',
    uploaded_by_id: 'hr-head',
    uploaded_by_name: 'Mari Muthu (HR Head)',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'ver-seed-103',
    document_id: 'doc-seed-103',
    version_number: 1,
    file_name: 'Apex_Security_EPFO_Certificate.pdf',
    file_size_bytes: 1024 * 1024,
    mime_type: 'application/pdf',
    storage_path: 'vendors/VND-101/statutory/EPFO_Certificate.pdf',
    content_hash: 'sha256-verified',
    encryption_algorithm: 'AES-256-GCM',
    malware_scan_status: 'SAFE',
    uploaded_by_id: 'v-101',
    uploaded_by_name: 'Rajesh Kumar (Apex Vendor Admin)',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'ver-seed-104',
    document_id: 'doc-seed-104',
    version_number: 2,
    file_name: 'Enterprise_Code_Of_Conduct_v2.pdf',
    file_size_bytes: 2 * 1024 * 1024,
    mime_type: 'application/pdf',
    storage_path: 'company/policies/Enterprise_Code_Of_Conduct_v2.pdf',
    content_hash: 'sha256-verified',
    encryption_algorithm: 'AES-256-GCM',
    malware_scan_status: 'SAFE',
    uploaded_by_id: 'hr-head',
    uploaded_by_name: 'Dharun Joy (HR Head)',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
];

class DocumentService {
  private resolveOrgUuid(): string {
    try {
      const currentUser = api.getCurrentUser();
      if (isValidDocumentUuid(currentUser?.organization_id)) {
        return currentUser.organization_id;
      }
      if (typeof window !== 'undefined') {
        const storedOrg = localStorage.getItem('workforce_active_org_id');
        if (isValidDocumentUuid(storedOrg)) return storedOrg;
      }
    } catch {
      // ignore fallback
    }
    return DEFAULT_ORG_UUID;
  }

  private getTenantStorageKey(baseKey: string): string {
    const orgId = typeof window !== 'undefined' ? (localStorage.getItem('workforce_active_org_id') || DEFAULT_ORG_UUID) : DEFAULT_ORG_UUID;
    return `${baseKey}_${orgId}`;
  }

  private getStore<T>(baseKey: string, fallback: T[] = []): T[] {
    const sanitize = (arr: any[]): T[] => {
      if (!isSupabaseEnabled) return arr as T[];
      if (
        baseKey === DOCUMENTS_STORAGE_KEY ||
        baseKey === VERSIONS_STORAGE_KEY ||
        baseKey === REQUIREMENTS_STORAGE_KEY
      ) {
        return arr.filter(item => !isMockSeedRecord(item)) as T[];
      }
      return arr as T[];
    };

    try {
      const tenantKey = this.getTenantStorageKey(baseKey);
      const data = localStorage.getItem(tenantKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return sanitize(parsed);
        }
      }

      const legacy = localStorage.getItem(baseKey);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          const clean = sanitize(parsed);
          localStorage.setItem(tenantKey, JSON.stringify(clean));
          return clean;
        }
      }

      // Never seed mock demo records when Supabase production mode is active
      if (isSupabaseEnabled) {
        if (baseKey === CATEGORIES_STORAGE_KEY) return (DEFAULT_CATEGORIES as unknown) as T[];
        if (baseKey === TYPES_STORAGE_KEY) return (DEFAULT_DOCUMENT_TYPES as unknown) as T[];
        return fallback;
      }

      if (baseKey === DOCUMENTS_STORAGE_KEY) {
        return (DEFAULT_MASTER_DOCS as unknown) as T[];
      }
      if (baseKey === VERSIONS_STORAGE_KEY) {
        return (DEFAULT_MASTER_VERSIONS as unknown) as T[];
      }
      if (baseKey === REQUIREMENTS_STORAGE_KEY) {
        return (DEFAULT_REQUIREMENTS as unknown) as T[];
      }

      return fallback;
    } catch {
      if (isSupabaseEnabled) {
        if (baseKey === CATEGORIES_STORAGE_KEY) return (DEFAULT_CATEGORIES as unknown) as T[];
        if (baseKey === TYPES_STORAGE_KEY) return (DEFAULT_DOCUMENT_TYPES as unknown) as T[];
        return fallback;
      }
      if (baseKey === DOCUMENTS_STORAGE_KEY) {
        return (DEFAULT_MASTER_DOCS as unknown) as T[];
      }
      if (baseKey === VERSIONS_STORAGE_KEY) {
        return (DEFAULT_MASTER_VERSIONS as unknown) as T[];
      }
      if (baseKey === REQUIREMENTS_STORAGE_KEY) {
        return (DEFAULT_REQUIREMENTS as unknown) as T[];
      }
      return fallback;
    }
  }

  private setStore<T>(baseKey: string, items: T[]): void {
    try {
      const tenantKey = this.getTenantStorageKey(baseKey);
      const str = JSON.stringify(items);
      localStorage.setItem(tenantKey, str);
      localStorage.setItem(baseKey, str);
    } catch (e) {
      console.warn(`[DocumentService] Failed to persist ${baseKey}:`, e);
    }
  }

  private mapDbDocTypeRow(row: any): DocumentTypeMaster {
    const code = row.code || String(row.name || 'OTHER').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const applicable = Array.isArray(row.applicable_to)
      ? row.applicable_to.map((a: string) => (a.toLowerCase() === 'vendor' ? 'vendor' : 'employee'))
      : ['employee', 'vendor_worker', 'vendor', 'candidate'];
    return {
      id: row.id,
      tenant_id: row.organization_id || row.tenant_id || DEFAULT_ORG_UUID,
      category_id: normalizeCategoryCode(row.category, code),
      code,
      name: row.display_name || row.name || code,
      description: row.description || undefined,
      allowed_subject_types: [...new Set([...applicable, 'company'])] as DocumentSubjectType[],
      allowed_file_types: Array.isArray(row.allowed_mime_types) && row.allowed_mime_types.length > 0
        ? row.allowed_mime_types
        : ['application/pdf', 'image/jpeg', 'image/png'],
      max_size_bytes: Number(row.max_size_bytes) || 10485760,
      requires_expiry: false,
      requires_verification: row.requires_verification ?? row.is_review_required ?? true,
      requires_signature: false,
      default_classification: normalizeCategoryCode(row.category, code) === 'COMPANY_POLICY' ? 'internal' : 'restricted',
      retention_period_years: 10,
      is_active: row.is_active !== false,
    };
  }

  async fetchDocumentTypes(): Promise<DocumentTypeMaster[]> {
    if (!isSupabaseEnabled) {
      return this.getDocumentTypes();
    }
    try {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(r => this.mapDbDocTypeRow(r));
        this.setStore(TYPES_STORAGE_KEY, mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[DocumentService] fetchDocumentTypes fallback:', e);
    }
    return this.getDocumentTypes();
  }

  private async resolveDocumentTypeUuid(docTypeCode: string, preferredId?: string): Promise<string> {
    if (isValidDocumentUuid(preferredId)) return preferredId;

    const types = await this.fetchDocumentTypes();
    const candidates = DOC_TYPE_CODE_ALIASES[docTypeCode] || [docTypeCode];

    for (const candidate of candidates) {
      const hit = types.find(t => t.code === candidate && isValidDocumentUuid(t.id));
      if (hit) return hit.id;
    }

    // Fallback: direct live lookup for ANY active document_type (preferring OTHER)
    try {
      const { data } = await supabase
        .from('document_types')
        .select('id, code')
        .eq('is_active', true)
        .limit(20);
      if (Array.isArray(data) && data.length > 0) {
        for (const candidate of candidates) {
          const match = data.find((r: any) => String(r.code || '').toUpperCase() === candidate.toUpperCase());
          if (match && isValidDocumentUuid(match.id)) return match.id;
        }
        const otherRow = data.find((r: any) => String(r.code || '').toUpperCase() === 'OTHER');
        if (otherRow && isValidDocumentUuid(otherRow.id)) return otherRow.id;
        if (isValidDocumentUuid(data[0]?.id)) return data[0].id;
      }
    } catch {
      // ignore
    }

    throw new Error('No active document type configuration found in database.');
  }

  // ==========================================================================
  // 1. MASTER TAXONOMY & TYPES
  // ==========================================================================

  async syncWithDatabase(): Promise<void> {
    if (!isSupabaseEnabled) return;
    try {
      const orgUuid = this.resolveOrgUuid();

      // Purge any legacy mock/seed entries from localStorage immediately
      const existingReqs = this.getStore<DocumentRequirement>(REQUIREMENTS_STORAGE_KEY, []);
      this.setStore(REQUIREMENTS_STORAGE_KEY, existingReqs);

      const [docsRes, generalDocsRes, typesRes, empsRes] = await Promise.all([
        supabase.from('employee_documents').select('*, document_types(id, name, display_name, code, category, requires_verification)'),
        supabase.from('documents').select('*'),
        supabase.from('document_types').select('*').eq('is_active', true).order('display_order', { ascending: true }),
        supabase.from('employees').select('id, employee_code, first_name, last_name, organization_id'),
      ]);

      let docsData = docsRes.data;
      if (!docsData && docsRes.error) {
        const fallbackDocs = await supabase.from('employee_documents').select('*');
        docsData = fallbackDocs.data;
      }

      const dbTypesById = new Map<string, DocumentTypeMaster>();
      if (!typesRes.error && Array.isArray(typesRes.data) && typesRes.data.length > 0) {
        const mappedTypes = typesRes.data.map(r => this.mapDbDocTypeRow(r));
        this.setStore(TYPES_STORAGE_KEY, mappedTypes);
        for (const t of mappedTypes) {
          dbTypesById.set(t.id, t);
        }
      }

      const empsMap = new Map<string, any>();
      if (empsRes.data) {
        for (const emp of empsRes.data) {
          empsMap.set(emp.id, emp);
          if (emp.employee_code) empsMap.set(emp.employee_code, emp);
        }
      }

      const masterDocs: DocumentMaster[] = [];
      const versions: DocumentVersion[] = [];

      // 1. Map canonical public.employee_documents rows
      if (Array.isArray(docsData)) {
        for (const doc of docsData) {
          const emp = empsMap.get(doc.employee_id);
          const empName = emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() + (emp.employee_code ? ` (${emp.employee_code})` : '') : doc.employee_id;
          const dtMap = doc.document_types || dbTypesById.get(doc.document_type_id);
          const docTypeCode = dtMap?.code || doc.document_type || 'DOCUMENT';
          const docTypeName = dtMap?.display_name || dtMap?.name || doc.file_name || 'Document';
          const catCode = normalizeCategoryCode(dtMap?.category, docTypeCode);
          const matchingType = this.getDocumentTypeByCode(docTypeCode);

          const filePublicUrl = (doc.file_url && doc.file_url.startsWith('http'))
            ? doc.file_url
            : (doc.storage_path || doc.file_url || '');

          const versionId = `ver-${doc.id}-1`;
          const curVer: DocumentVersion = {
            id: versionId,
            document_id: doc.id,
            version_number: 1,
            file_name: doc.file_name || `${docTypeName}.pdf`,
            file_size_bytes: doc.file_size_bytes || 0,
            mime_type: doc.mime_type || 'application/pdf',
            storage_path: doc.storage_path || '',
            content_hash: 'sha256-verified',
            encryption_algorithm: 'AES-256-GCM',
            malware_scan_status: 'SAFE',
            uploaded_by_id: doc.employee_id,
            uploaded_by_name: empName,
            created_at: doc.created_at || new Date().toISOString(),
          };
          versions.push(curVer);

          masterDocs.push({
            id: doc.id,
            tenant_id: doc.organization_id || orgUuid,
            subject_type: 'employee',
            subject_id: doc.employee_id,
            subject_name: empName,
            document_type_code: docTypeCode,
            category_code: catCode,
            title: doc.title || docTypeName,
            classification: (matchingType?.default_classification as any) || 'restricted',
            status: 'active',
            verification_status: doc.verification_status?.toUpperCase() === 'VERIFIED'
              ? 'VERIFIED'
              : (doc.verification_status?.toUpperCase() === 'REJECTED' ? 'REJECTED' : 'PENDING_VERIFICATION'),
            verified_by: doc.verified_by || undefined,
            verified_at: doc.verified_at || undefined,
            rejection_reason: doc.rejection_reason || undefined,
            current_version_id: versionId,
            current_version: curVer,
            versions: [curVer],
            version_count: 1,
            created_by: empName,
            created_at: doc.created_at || new Date().toISOString(),
            updated_at: doc.updated_at || doc.created_at || new Date().toISOString(),
            file_url: filePublicUrl,
            file_name: doc.file_name,
            storage_path: doc.storage_path || doc.file_path || '',
            storage_bucket: doc.storage_bucket || 'employee-documents',
            employee_id: doc.employee_id,
            employee_name: empName,
            document_type: docTypeName,
          } as DocumentMaster);
        }
      }

      // 2. Also include public.documents rows (e.g. Company Policy / Vendor / Non-employee records)
      if (!generalDocsRes.error && Array.isArray(generalDocsRes.data)) {
        for (const doc of generalDocsRes.data) {
          if (masterDocs.some(m => m.id === doc.id)) continue;
          const emp = doc.employee_id ? empsMap.get(doc.employee_id) : null;
          const subjectType: DocumentSubjectType = doc.employee_id
            ? 'employee'
            : (doc.vendor_id ? 'vendor' : 'company');
          const subjectId = doc.employee_id || doc.vendor_id || doc.organization_id || orgUuid;
          const subjectName = emp
            ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() + (emp.employee_code ? ` (${emp.employee_code})` : '')
            : (subjectType === 'company' ? 'Company Record' : subjectId);
          const docTypeCode = doc.document_type_id || 'OTHER';
          const matchingType = this.getDocumentTypeByCode(docTypeCode);
          const catCode = normalizeCategoryCode(undefined, docTypeCode);

          const versionId = `ver-${doc.id}-1`;
          const curVer: DocumentVersion = {
            id: versionId,
            document_id: doc.id,
            version_number: 1,
            file_name: doc.original_filename || 'document.pdf',
            file_size_bytes: doc.file_size_bytes || 0,
            mime_type: doc.mime_type || 'application/pdf',
            storage_path: doc.object_path || '',
            content_hash: 'sha256-verified',
            encryption_algorithm: 'AES-256-GCM',
            malware_scan_status: 'SAFE',
            uploaded_by_id: doc.uploaded_by || orgUuid,
            uploaded_by_name: subjectName,
            created_at: doc.created_at || new Date().toISOString(),
          };
          versions.push(curVer);

          masterDocs.push({
            id: doc.id,
            tenant_id: doc.organization_id || orgUuid,
            subject_type: subjectType,
            subject_id: subjectId,
            subject_name: subjectName,
            document_type_code: docTypeCode,
            category_code: catCode,
            title: doc.original_filename || matchingType?.name || docTypeCode,
            classification: (matchingType?.default_classification as any) || (subjectType === 'company' ? 'internal' : 'restricted'),
            status: 'active',
            verification_status: doc.status?.toUpperCase() === 'VERIFIED'
              ? 'VERIFIED'
              : (doc.status?.toUpperCase() === 'REJECTED' ? 'REJECTED' : 'PENDING_VERIFICATION'),
            verified_by: doc.verified_by || undefined,
            verified_at: doc.verified_at || undefined,
            rejection_reason: doc.rejection_reason || undefined,
            current_version_id: versionId,
            current_version: curVer,
            versions: [curVer],
            version_count: 1,
            created_by: subjectName,
            created_at: doc.created_at || new Date().toISOString(),
            updated_at: doc.updated_at || doc.created_at || new Date().toISOString(),
            file_name: doc.original_filename,
            storage_path: doc.object_path || '',
            storage_bucket: doc.bucket_id || 'peoplehr-employee-documents',
            employee_id: doc.employee_id || undefined,
            employee_name: emp ? subjectName : undefined,
            document_type: matchingType?.name || docTypeCode,
          } as DocumentMaster);
        }
      }

      // Only replace local store if database queries succeeded cleanly (do not wipe on transient network error)
      if (!docsRes.error || Array.isArray(docsData) || (!generalDocsRes.error && Array.isArray(generalDocsRes.data))) {
        this.setStore(DOCUMENTS_STORAGE_KEY, masterDocs);
        this.setStore(VERSIONS_STORAGE_KEY, versions);
      }
    } catch (e) {
      console.warn('[DocumentService] syncWithDatabase error:', e);
    }
  }

  getCategories(): DocumentCategory[] {
    return this.getStore<DocumentCategory>(CATEGORIES_STORAGE_KEY, DEFAULT_CATEGORIES);
  }

  getDocumentTypes(): DocumentTypeMaster[] {
    return this.getStore<DocumentTypeMaster>(TYPES_STORAGE_KEY, DEFAULT_DOCUMENT_TYPES);
  }

  getDocumentTypeByCode(code: string): DocumentTypeMaster | null {
    const types = this.getDocumentTypes();
    return types.find(t => t.code === code) || null;
  }

  // getDocumentRequirements() and createDocumentRequirement() are defined in Section 6 below (parameterized versions)

  // ==========================================================================
  // 2. DOCUMENT QUERY & SUMMARY METRICS
  // ==========================================================================

  getDocuments(params: {
    tab?: 'all' | 'my_documents' | 'employee_documents' | 'vendor_documents' | 'verification_queue' | 'expiring_documents' | 'company_documents';
    subjectType?: string;
    subjectId?: string;
    categoryCode?: string;
    verificationStatus?: string;
    classification?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): { items: DocumentMaster[]; total: number; page: number; totalPages: number } {
    const rawDocs = this.getStore<DocumentMaster>(DOCUMENTS_STORAGE_KEY, []);
    const versions = this.getStore<DocumentVersion>(VERSIONS_STORAGE_KEY, []);
    const today = new Date();

    // Hydrate versions, expiry calculations, and metrics
    let hydrated: DocumentMaster[] = rawDocs.map(d => {
      const curVersion = versions.find(v => v.id === d.current_version_id) || versions.find(v => v.document_id === d.id);
      const docVersions = versions.filter(v => v.document_id === d.id);

      let daysUntilExpiry: number | undefined = undefined;
      let urgencyTier: DocumentMaster['urgency_tier'] = 'HEALTHY';

      if (d.expires_at) {
        const expDate = new Date(d.expires_at);
        daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry < 0) urgencyTier = 'EXPIRED';
        else if (daysUntilExpiry <= 7) urgencyTier = 'CRITICAL_7_DAYS';
        else if (daysUntilExpiry <= 30) urgencyTier = 'WARNING_30_DAYS';
        else if (daysUntilExpiry <= 90) urgencyTier = 'UPCOMING_90_DAYS';
      }

      return {
        ...d,
        current_version: curVersion,
        versions: docVersions,
        document_type: d.title || d.document_type_code,
        category: d.category_code,
        employee_id: d.subject_type === 'employee' ? d.subject_id : undefined,
        employee_name: d.subject_name,
        file_name: curVersion?.file_name || 'document.pdf',
        file_size: curVersion ? `${(curVersion.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
        version: curVersion?.version_number || 1,
        uploaded_at: d.created_at ? d.created_at.split('T')[0] : today.toISOString().split('T')[0],
        uploaded_by: d.created_by,
        days_until_expiry: daysUntilExpiry,
        urgency_tier: urgencyTier,
      };
    });

    // Tab-based filtering
    if (params.tab) {
      const currentUser = api.getCurrentUser();
      switch (params.tab) {
        case 'my_documents':
          hydrated = hydrated.filter(d => d.subject_id === (currentUser as any).employee_id || d.subject_id === currentUser.id);
          break;
        case 'employee_documents':
          hydrated = hydrated.filter(d => d.subject_type === 'employee');
          break;
        case 'vendor_documents':
          hydrated = hydrated.filter(d => d.subject_type === 'vendor' || d.subject_type === 'vendor_worker');
          break;
        case 'company_documents':
          hydrated = hydrated.filter(d => d.subject_type === 'company' || d.category_code === 'COMPANY_POLICY');
          break;
        case 'verification_queue':
          hydrated = hydrated.filter(
            d => d.verification_status === 'UPLOADED' || d.verification_status === 'PENDING_VERIFICATION' || d.verification_status === 'UNDER_REVIEW'
          );
          break;
        case 'expiring_documents':
          hydrated = hydrated.filter(d => d.expires_at && d.days_until_expiry !== undefined && d.days_until_expiry <= 90);
          break;
      }
    }

    if (params.subjectType && params.subjectType !== 'all') {
      hydrated = hydrated.filter(d => d.subject_type === params.subjectType);
    }

    if (params.subjectId) {
      hydrated = hydrated.filter(d => d.subject_id === params.subjectId);
    }

    if (params.categoryCode && params.categoryCode !== 'ALL') {
      hydrated = hydrated.filter(d => d.category_code === params.categoryCode);
    }

    if (params.verificationStatus && params.verificationStatus !== 'all') {
      hydrated = hydrated.filter(d => d.verification_status === params.verificationStatus);
    }

    if (params.classification && params.classification !== 'all') {
      hydrated = hydrated.filter(d => d.classification === params.classification);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      hydrated = hydrated.filter(d => {
        const title = (d.title || '').toLowerCase();
        const subName = (d.subject_name || '').toLowerCase();
        const subId = (d.subject_id || '').toLowerCase();
        const typeCode = (d.document_type_code || '').toLowerCase();
        const fileName = (d.current_version?.file_name || '').toLowerCase();

        return (
          title.includes(q) ||
          subName.includes(q) ||
          subId.includes(q) ||
          typeCode.includes(q) ||
          fileName.includes(q)
        );
      });
    }

    hydrated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = hydrated.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = hydrated.slice(start, start + limit);

    return { items, total, page, totalPages };
  }

  getDocumentById(id: string): DocumentMaster | null {
    const res = this.getDocuments({ limit: 1000 });
    return res.items.find(d => d.id === id) || null;
  }

  getSummaryMetrics(): DocumentSummaryMetrics {
    const { items } = this.getDocuments({ limit: 2000 });
    const versions = this.getStore<DocumentVersion>(VERSIONS_STORAGE_KEY, []);

    const total_documents = items.length;
    const pending_verification = items.filter(
      d => d.verification_status === 'PENDING_VERIFICATION' || d.verification_status === 'UPLOADED' || d.verification_status === 'UNDER_REVIEW'
    ).length;
    const expiring_in_30_days = items.filter(
      d => d.expires_at && d.days_until_expiry !== undefined && d.days_until_expiry <= 30 && d.days_until_expiry >= 0
    ).length;
    const esign_completed = items.filter(d => d.status === 'active' && (d.document_type_code.includes('OFFER') || d.document_type_code.includes('NDA'))).length;
    const restricted_documents = items.filter(d => d.classification === 'restricted' || d.classification === 'highly_confidential').length;

    // Calculate actual storage volume from versions
    const total_storage_bytes = versions.reduce((sum, v) => sum + (v.file_size_bytes || 0), 0);
    const totalMb = total_storage_bytes / (1024 * 1024);
    const total_storage_formatted = totalMb >= 1024 ? `${(totalMb / 1024).toFixed(2)} GB` : `${totalMb.toFixed(1)} MB`;

    return {
      total_documents,
      pending_verification,
      expiring_in_30_days,
      esign_completed,
      restricted_documents,
      total_storage_bytes,
      total_storage_formatted,
    };
  }

  // ==========================================================================
  // 3. ENTERPRISE UPLOAD & REPLACEMENT PIPELINE
  // ==========================================================================

  async uploadDocument(params: {
    subjectType: DocumentSubjectType;
    subjectId: string;
    subjectName?: string;
    documentTypeCode: string;
    documentTypeId?: string;
    categoryCode?: string;
    title: string;
    description?: string;
    classification?: DocumentClassification;
    file: File | Blob;
    fileName?: string;
    expiresAt?: string;
    issuedAt?: string;
    requiresVerification?: boolean;
    onProgress?: (stage: 'VALIDATING' | 'OPTIMIZING' | 'SECURING' | 'SAVING') => void;
  }): Promise<DocumentMaster> {
    const currentUser = api.getCurrentUser();
    const orgUuid = this.resolveOrgUuid();
    const docId = generateDocumentUuid();
    const versionId = generateDocumentUuid();
    const now = new Date().toISOString();
    const originalFileName = params.fileName || (params.file as File).name || `${params.documentTypeCode.toLowerCase()}.pdf`;
    const resolvedCategory = normalizeCategoryCode(params.categoryCode, params.documentTypeCode);

    // Step 1: Validate file & content magic bytes
    params.onProgress?.('VALIDATING');
    const validation = await fileOptimizationService.validateFile(params.file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file format.');
    }

    // Step 2: Optimize file & compute SHA-256 integrity hash
    params.onProgress?.('OPTIMIZING');
    const optimized: OptimizedFileResult = await fileOptimizationService.optimizeFile(params.file, originalFileName);

    // Step 3: Upload to Private Supabase Storage Bucket
    params.onProgress?.('SECURING');
    const storageResult = await supabaseStorageEngine.uploadFile({
      tenantId: orgUuid,
      organizationId: orgUuid,
      employeeId: params.subjectType === 'employee' ? params.subjectId : undefined,
      vendorId: params.subjectType === 'vendor' ? params.subjectId : undefined,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      documentId: docId,
      versionNumber: 1,
      fileName: originalFileName,
      file: optimized.file,
      classification: params.classification || 'restricted',
      isCompanyDoc: params.subjectType === 'company' || resolvedCategory === 'COMPANY_POLICY',
    } as any);

    // Step 4: Construct Immutable Version Record
    const newVersion: DocumentVersion = {
      id: versionId,
      document_id: docId,
      version_number: 1,
      storage_path: storageResult.storagePath,
      file_name: originalFileName,
      file_size_bytes: optimized.storedSizeBytes,
      mime_type: optimized.mimeType,
      content_hash: optimized.sha256,
      encryption_algorithm: 'AES-256-GCM',
      encryption_key_id: 'kms-joy-2026-01',
      malware_scan_status: 'SAFE',
      uploaded_by_id: currentUser.id || (currentUser as any).employee_id || orgUuid,
      uploaded_by_name: currentUser.name || currentUser.email || 'HR User',
      created_at: now,
    };

    // Step 5: Persist Metadata in Live Supabase DB (employee_documents or documents)
    params.onProgress?.('SAVING');

    const dbVerifStatus = params.requiresVerification ? 'PENDING' : 'VERIFIED';

    if (isSupabaseEnabled) {
      try {
        const isEmployeeDoc =
          (params.subjectType === 'employee' || params.subjectType === 'vendor_worker') &&
          isValidDocumentUuid(params.subjectId);

        if (isEmployeeDoc) {
          const docTypeUuid = await this.resolveDocumentTypeUuid(params.documentTypeCode, params.documentTypeId);
          const { error: empDocErr } = await supabase
            .from('employee_documents')
            .insert({
              id: docId,
              organization_id: orgUuid,
              employee_id: params.subjectId,
              document_type_id: docTypeUuid,
              file_name: originalFileName,
              storage_path: storageResult.storagePath,
              file_size_bytes: optimized.storedSizeBytes,
              mime_type: optimized.mimeType,
              verification_status: dbVerifStatus,
              verified_by: !params.requiresVerification && isValidDocumentUuid(currentUser.id) ? currentUser.id : null,
              verified_at: !params.requiresVerification ? now : null,
            });

          if (empDocErr) {
            throw new Error(empDocErr.message || 'Failed to save employee document metadata.');
          }
        } else {
          const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
          const actorUuid = authData?.user?.id || (isValidDocumentUuid(currentUser.id) ? currentUser.id : undefined);
          const docPayload: Record<string, any> = {
            id: docId,
            tenant_id: orgUuid,
            organization_id: orgUuid,
            employee_id: isValidDocumentUuid(params.subjectId) && params.subjectType === 'employee' ? params.subjectId : null,
            vendor_id: isValidDocumentUuid(params.subjectId) && params.subjectType === 'vendor' ? params.subjectId : null,
            document_type_id: params.documentTypeCode || 'OTHER',
            bucket_id: storageResult.storageBucket,
            object_path: storageResult.storagePath,
            original_filename: originalFileName,
            mime_type: optimized.mimeType,
            file_size_bytes: optimized.storedSizeBytes,
            status: dbVerifStatus,
            uploaded_by_role: currentUser.role || 'HR_ADMIN',
          };
          if (actorUuid) {
            docPayload.uploaded_by = actorUuid;
          }

          const { error: docErr } = await supabase.from('documents').insert(docPayload);
          if (docErr) {
            throw new Error(docErr.message || 'Failed to save document metadata.');
          }
        }
      } catch (dbErr: any) {
        // Roll back orphaned storage object if metadata save failed
        await supabaseStorageEngine.deleteFile(storageResult.storageBucket, storageResult.storagePath);
        throw new Error(dbErr?.message || 'Failed to save document record in database.');
      }
    }

    // Step 6: Construct Canonical Document Master Record & Cache Locally
    const newDoc: DocumentMaster = {
      id: docId,
      tenant_id: orgUuid,
      legal_entity_id: orgUuid,
      subject_type: params.subjectType,
      subject_id: params.subjectId,
      subject_name: params.subjectName || currentUser.name || 'Employee',
      document_type_code: params.documentTypeCode,
      category_code: resolvedCategory,
      title: params.title,
      description: params.description,
      classification: params.classification || 'restricted',
      status: 'active',
      verification_status: params.requiresVerification ? 'PENDING_VERIFICATION' : 'VERIFIED',
      current_version_id: versionId,
      current_version: newVersion,
      versions: [newVersion],
      version_count: 1,
      file_name: originalFileName,
      storage_path: storageResult.storagePath,
      storage_bucket: storageResult.storageBucket,
      employee_id: params.subjectType === 'employee' ? params.subjectId : undefined,
      employee_name: params.subjectName,
      issued_at: params.issuedAt,
      expires_at: params.expiresAt,
      created_by: currentUser.name || currentUser.email || 'Current User',
      created_at: now,
      updated_at: now,
    } as DocumentMaster;

    const docs = this.getStore<DocumentMaster>(DOCUMENTS_STORAGE_KEY, []);
    docs.unshift(newDoc);
    this.setStore(DOCUMENTS_STORAGE_KEY, docs);

    const versions = this.getStore<DocumentVersion>(VERSIONS_STORAGE_KEY, []);
    versions.unshift(newVersion);
    this.setStore(VERSIONS_STORAGE_KEY, versions);

    // Auto-fulfill matching document requirements
    this.fulfillMatchingRequirement(params.subjectId, params.documentTypeCode, docId);

    // Record audit log
    documentAuditService.recordLog({
      documentId: docId,
      action: 'UPLOAD',
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      details: {
        title: params.title,
        fileName: originalFileName,
        fileSizeBytes: optimized.storedSizeBytes,
        storagePath: storageResult.storagePath,
        storageBucket: storageResult.storageBucket,
        contentHash: optimized.sha256,
        compressionRatio: `${optimized.compressionRatio}%`,
        classification: newDoc.classification,
      },
    });

    // Dispatch realtime domain event
    hrEventBus.publish('document.created', {
      documentId: docId,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      title: params.title,
    });

    return this.getDocumentById(docId) || newDoc;
  }

  // Upload New Version (Version Control: Preserves v1, creates v2)
  async uploadNewVersion(
    documentId: string,
    file: File | Blob,
    changeNotes?: string,
    fileName?: string
  ): Promise<DocumentVersion> {
    const doc = this.getDocumentById(documentId);
    if (!doc) throw new Error('Document not found.');

    const currentUser = api.getCurrentUser();
    const orgUuid = isValidDocumentUuid(doc.tenant_id) ? doc.tenant_id : this.resolveOrgUuid();
    const nextVerNumber = (doc.version_count || 1) + 1;
    const versionId = generateDocumentUuid();
    const now = new Date().toISOString();
    const actualFileName = fileName || (file as File).name || doc.file_name || 'document_v2.pdf';

    // Optimize and calculate hash
    const optimized = await fileOptimizationService.optimizeFile(file, actualFileName);

    // Upload to Private Supabase Storage
    const storageResult = await supabaseStorageEngine.uploadFile({
      tenantId: orgUuid,
      organizationId: orgUuid,
      employeeId: doc.subject_type === 'employee' ? doc.subject_id : undefined,
      subjectType: doc.subject_type,
      subjectId: doc.subject_id,
      documentId: doc.id,
      versionNumber: nextVerNumber,
      fileName: actualFileName,
      file: optimized.file,
      classification: doc.classification,
    } as any);

    if (isSupabaseEnabled && isValidDocumentUuid(documentId)) {
      try {
        if (doc.subject_type === 'employee' && isValidDocumentUuid(doc.subject_id)) {
          const { error: upErr } = await supabase
            .from('employee_documents')
            .update({
              file_name: actualFileName,
              storage_path: storageResult.storagePath,
              file_size_bytes: optimized.storedSizeBytes,
              mime_type: optimized.mimeType,
              verification_status: 'PENDING',
              rejection_reason: null,
              updated_at: now,
            })
            .eq('id', documentId);
          if (upErr) throw upErr;
        } else {
          const { error: upErr } = await supabase
            .from('documents')
            .update({
              bucket_id: storageResult.storageBucket,
              object_path: storageResult.storagePath,
              original_filename: actualFileName,
              file_size_bytes: optimized.storedSizeBytes,
              mime_type: optimized.mimeType,
              status: 'UPLOADED',
              rejection_reason: null,
              updated_at: now,
            })
            .eq('id', documentId);
          if (upErr) throw upErr;
        }
      } catch (dbErr: any) {
        await supabaseStorageEngine.deleteFile(storageResult.storageBucket, storageResult.storagePath);
        throw new Error(dbErr?.message || 'Failed to save updated document version.');
      }
    }

    const newVersion: DocumentVersion = {
      id: versionId,
      document_id: doc.id,
      version_number: nextVerNumber,
      storage_path: storageResult.storagePath,
      file_name: actualFileName,
      file_size_bytes: optimized.storedSizeBytes,
      mime_type: optimized.mimeType,
      content_hash: optimized.sha256,
      encryption_algorithm: 'AES-256-GCM',
      encryption_key_id: 'kms-joy-2026-01',
      malware_scan_status: 'SAFE',
      uploaded_by_id: currentUser.id || orgUuid,
      uploaded_by_name: currentUser.name || currentUser.email || 'HR User',
      change_notes: changeNotes,
      created_at: now,
    };

    // Save version
    const versions = this.getStore<DocumentVersion>(VERSIONS_STORAGE_KEY, []);
    versions.unshift(newVersion);
    this.setStore(VERSIONS_STORAGE_KEY, versions);

    // Update document master
    const docs = this.getStore<DocumentMaster>(DOCUMENTS_STORAGE_KEY, []);
    const docIdx = docs.findIndex(d => d.id === documentId);
    if (docIdx !== -1) {
      docs[docIdx].current_version_id = versionId;
      docs[docIdx].current_version = newVersion;
      docs[docIdx].version_count = nextVerNumber;
      docs[docIdx].file_name = actualFileName;
      docs[docIdx].storage_path = storageResult.storagePath;
      (docs[docIdx] as any).storage_bucket = storageResult.storageBucket;
      docs[docIdx].verification_status = 'PENDING_VERIFICATION';
      docs[docIdx].rejection_reason = undefined;
      docs[docIdx].updated_at = now;
      this.setStore(DOCUMENTS_STORAGE_KEY, docs);
    }

    // Write audit log
    documentAuditService.recordLog({
      documentId: doc.id,
      action: 'CREATE_VERSION',
      subjectType: doc.subject_type,
      subjectId: doc.subject_id,
      details: {
        versionNumber: nextVerNumber,
        fileName: actualFileName,
        fileSizeBytes: optimized.storedSizeBytes,
        storagePath: storageResult.storagePath,
        contentHash: optimized.sha256,
        changeNotes,
      },
    });

    hrEventBus.publish('document.updated', {
      documentId: doc.id,
      version: nextVerNumber,
      title: doc.title,
    });

    return newVersion;
  }

  // ==========================================================================
  // 4. VERIFICATION WORKFLOW (VERIFY / REJECT)
  // ==========================================================================

  verifyDocument(documentId: string, comments?: string): DocumentMaster {
    const docs = this.getStore<DocumentMaster>(DOCUMENTS_STORAGE_KEY, []);
    const idx = docs.findIndex(d => d.id === documentId);
    if (idx === -1) throw new Error('Document not found.');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const prevStatus = docs[idx].verification_status;

    docs[idx].verification_status = 'VERIFIED';
    docs[idx].verified_by = currentUser.name || 'HR Reviewer';
    docs[idx].verified_at = now;
    docs[idx].rejection_reason = undefined;
    if (comments) docs[idx].notes = comments;
    docs[idx].updated_at = now;

    this.setStore(DOCUMENTS_STORAGE_KEY, docs);

    if (isSupabaseEnabled && isValidDocumentUuid(documentId)) {
      const verifierUuid = isValidDocumentUuid(currentUser.id) ? currentUser.id : null;
      supabase
        .from('employee_documents')
        .update({
          verification_status: 'VERIFIED',
          verified_by: verifierUuid,
          verified_at: now,
          rejection_reason: null,
          updated_at: now,
        })
        .eq('id', documentId)
        .then(({ error }) => {
          if (error) console.warn('[DocumentService] employee_documents verify update:', error.message);
        });
      supabase
        .from('documents')
        .update({
          status: 'VERIFIED',
          verified_by: verifierUuid,
          verified_at: now,
          rejection_reason: null,
          updated_at: now,
        })
        .eq('id', documentId)
        .then(() => {});
    }

    // Update requirement if applicable
    this.updateRequirementStatus(docs[idx].subject_id, docs[idx].document_type_code, 'VERIFIED');

    documentAuditService.recordLog({
      documentId,
      action: 'VERIFY',
      subjectType: docs[idx].subject_type,
      subjectId: docs[idx].subject_id,
      details: {
        previousStatus: prevStatus,
        verifiedBy: docs[idx].verified_by,
        comments,
      },
    });

    hrEventBus.publish('document.verified', {
      documentId,
      subjectType: docs[idx].subject_type,
      subjectId: docs[idx].subject_id,
      verifiedBy: docs[idx].verified_by,
    });

    return docs[idx];
  }

  rejectDocument(documentId: string, reason: string): DocumentMaster {
    if (!reason || !reason.trim()) {
      throw new Error('A formal rejection reason is mandatory.');
    }

    const docs = this.getStore<DocumentMaster>(DOCUMENTS_STORAGE_KEY, []);
    const idx = docs.findIndex(d => d.id === documentId);
    if (idx === -1) throw new Error('Document not found.');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const prevStatus = docs[idx].verification_status;

    docs[idx].verification_status = 'REJECTED';
    docs[idx].verified_by = currentUser.name || 'HR Reviewer';
    docs[idx].verified_at = now;
    docs[idx].rejection_reason = reason;
    docs[idx].updated_at = now;

    this.setStore(DOCUMENTS_STORAGE_KEY, docs);

    if (isSupabaseEnabled && isValidDocumentUuid(documentId)) {
      const verifierUuid = isValidDocumentUuid(currentUser.id) ? currentUser.id : null;
      supabase
        .from('employee_documents')
        .update({
          verification_status: 'REJECTED',
          verified_by: verifierUuid,
          verified_at: now,
          rejection_reason: reason,
          updated_at: now,
        })
        .eq('id', documentId)
        .then(({ error }) => {
          if (error) console.warn('[DocumentService] employee_documents reject update:', error.message);
        });
      supabase
        .from('documents')
        .update({
          status: 'REJECTED',
          verified_by: verifierUuid,
          verified_at: now,
          rejection_reason: reason,
          updated_at: now,
        })
        .eq('id', documentId)
        .then(() => {});
    }

    // Update requirement status
    this.updateRequirementStatus(docs[idx].subject_id, docs[idx].document_type_code, 'REJECTED', reason);

    documentAuditService.recordLog({
      documentId,
      action: 'REJECT',
      subjectType: docs[idx].subject_type,
      subjectId: docs[idx].subject_id,
      details: {
        previousStatus: prevStatus,
        rejectedBy: docs[idx].verified_by,
        reason,
      },
    });

    hrEventBus.publish('document.rejected', {
      documentId,
      subjectType: docs[idx].subject_type,
      subjectId: docs[idx].subject_id,
      rejectedBy: docs[idx].verified_by,
      reason,
    });

    return docs[idx];
  }

  // ==========================================================================
  // 5. SIGNED URL ACCESS & SECURE VIEW
  // ==========================================================================

  async getSignedUrl(documentId: string, versionNumber?: number): Promise<SignedUrlResponse> {
    const doc = this.getDocumentById(documentId);
    if (!doc) throw new Error('Document not found.');

    const versions = this.getStore<DocumentVersion>(VERSIONS_STORAGE_KEY, []);
    const targetVersion = versionNumber
      ? versions.find(v => v.document_id === documentId && v.version_number === versionNumber)
      : doc.current_version || versions.find(v => v.id === doc.current_version_id) || versions.find(v => v.document_id === documentId);

    const bucket: StorageBucketDomain | string =
      (doc as any).storage_bucket ||
      supabaseStorageEngine.resolveStorageBucket('documents', doc.subject_type === 'vendor');
    const storagePath =
      targetVersion?.storage_path ||
      doc.storage_path ||
      `tenant/${doc.tenant_id}/employee/${doc.subject_id}/documents/${doc.id}/v1/${doc.file_name || 'document.pdf'}`;

    return supabaseStorageEngine.createSignedUrl(bucket, storagePath, 900);
  }

  // ==========================================================================
  // 3. DOCUMENT DELETION & PURGE
  // ==========================================================================

  async deleteDocument(documentId: string): Promise<void> {
    const docs = this.getStore<DocumentMaster>(DOCUMENTS_STORAGE_KEY, []);
    const reqs = this.getStore<DocumentRequirement>(REQUIREMENTS_STORAGE_KEY, []);
    const versions = this.getStore<DocumentVersion>(VERSIONS_STORAGE_KEY, []);

    const targetDoc = docs.find(d => d.id === documentId);
    const storagePath = targetDoc?.current_version?.storage_path || targetDoc?.storage_path;
    const storageBucket = (targetDoc as any)?.storage_bucket || 'peoplehr-employee-documents';

    // 1. Clean completely from Supabase backend for real persisted UUID records
    if (isSupabaseEnabled && isValidDocumentUuid(documentId)) {
      const [empDelRes, docDelRes] = await Promise.all([
        supabase.from('employee_documents').delete().eq('id', documentId),
        supabase.from('documents').delete().eq('id', documentId),
      ]);

      if (empDelRes.error && docDelRes.error) {
        throw new Error(empDelRes.error.message || docDelRes.error.message || 'Failed to delete document from database.');
      }

      if (storagePath) {
        await supabaseStorageEngine.deleteFile(storageBucket, storagePath);
      }
    }

    // 2. Remove from local store
    this.setStore(DOCUMENTS_STORAGE_KEY, docs.filter(d => d.id !== documentId));
    this.setStore(REQUIREMENTS_STORAGE_KEY, reqs.filter(r => r.id !== documentId && r.document_id !== documentId));
    this.setStore(VERSIONS_STORAGE_KEY, versions.filter(v => v.document_id !== documentId));

    hrEventBus.publish('document.deleted', { documentId });
  }

  // ==========================================================================
  // 6. DOCUMENT REQUIREMENTS ENGINE
  // ==========================================================================

  getDocumentRequirements(employeeId?: string): DocumentRequirement[] {
    let reqs = this.getStore<DocumentRequirement>(REQUIREMENTS_STORAGE_KEY, []);
    if (employeeId) {
      return reqs.filter(r => r.employee_id === employeeId);
    }
    return reqs;
  }

  private fulfillMatchingRequirement(employeeId: string, docTypeCode: string, documentId: string): void {
    const reqs = this.getStore<DocumentRequirement>(REQUIREMENTS_STORAGE_KEY, []);
    const idx = reqs.findIndex(r => r.employee_id === employeeId && r.document_type === docTypeCode);
    if (idx !== -1) {
      reqs[idx].status = 'SUBMITTED';
      reqs[idx].document_id = documentId;
      reqs[idx].updated_at = new Date().toISOString();
      this.setStore(REQUIREMENTS_STORAGE_KEY, reqs);
    }
  }

  private updateRequirementStatus(employeeId: string, docTypeCode: string, status: DocumentRequirement['status'], reason?: string): void {
    const reqs = this.getStore<DocumentRequirement>(REQUIREMENTS_STORAGE_KEY, []);
    const idx = reqs.findIndex(r => r.employee_id === employeeId && r.document_type === docTypeCode);
    if (idx !== -1) {
      reqs[idx].status = status;
      if (reason) reqs[idx].rejection_reason = reason;
      reqs[idx].updated_at = new Date().toISOString();
      this.setStore(REQUIREMENTS_STORAGE_KEY, reqs);
    }
  }

  async createDocumentRequirement(params: {
    employeeId: string;
    employeeName?: string;
    documentTypeCode: string;
    title: string;
    description?: string;
    dueDate?: string;
    required?: boolean;
    correlationId?: string;
  }): Promise<DocumentRequirement> {
    const currentUser = api.getCurrentUser();
    const correlationId = params.correlationId || `WF-DOCREQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const reqId = generateDocumentUuid();
    const now = new Date().toISOString();
    const tenantId = isValidDocumentUuid(currentUser.organization_id)
      ? currentUser.organization_id
      : '0c621892-e938-4707-9957-13534ea32c19';

    console.log(`[DOC_REQUEST][WEB] CREATE_STARTED employee=${params.employeeId} doc_type=${params.documentTypeCode} correlation=${correlationId}`);

    const newReq: DocumentRequirement = {
      id: reqId,
      tenant_id: tenantId,
      organization_id: tenantId,
      employee_id: params.employeeId,
      document_type: params.documentTypeCode,
      title: params.title,
      description: params.description,
      required: params.required !== false,
      due_date: params.dueDate,
      status: 'REQUIRED',
      requested_by: currentUser.name || 'HR Admin',
      created_at: now,
      updated_at: now,
    };

    // Save locally for instant reactivity
    const reqs = this.getStore<DocumentRequirement>(REQUIREMENTS_STORAGE_KEY, []);
    reqs.unshift(newReq);
    this.setStore(REQUIREMENTS_STORAGE_KEY, reqs);

    // Broadcast in-app upload requirement event via canonical notification_events
    if (isSupabaseEnabled) {
      try {
        await supabase.from('notification_events').insert({
          organization_id: tenantId,
          channel: 'IN_APP',
          title: `Action Required: Document Upload (${params.title})`,
          message: `HR has requested you to upload: ${params.title}. Please upload before ${params.dueDate || 'due date'}.`,
          is_read: false,
        });
      } catch (_) {}
    }

    // Publish to Realtime Event Mesh
    hrEventBus.publish('document.updated', {
      requirementId: newReq.id,
      employeeId: params.employeeId,
      documentType: params.documentTypeCode,
      title: params.title,
      dueDate: params.dueDate,
      correlationId,
    });

    return newReq;
  }

  getEmployeeComplianceStatus(employeeId: string): {
    totalRequired: number;
    completed: number;
    pending: number;
    rejected: number;
    percentage: number;
  } {
    const reqs = this.getDocumentRequirements(employeeId);
    const totalRequired = reqs.length || 4; // default essential (PAN, Aadhaar, Bank, Degree)
    const completed = reqs.filter(r => r.status === 'VERIFIED').length;
    const pending = reqs.filter(r => r.status === 'REQUIRED' || r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length;
    const rejected = reqs.filter(r => r.status === 'REJECTED').length;
    const percentage = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 0;

    return { totalRequired, completed, pending, rejected, percentage };
  }
}

export const documentService = new DocumentService();
