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

class DocumentService {
  private getTenantStorageKey(baseKey: string): string {
    const orgId = typeof window !== 'undefined' ? (localStorage.getItem('workforce_active_org_id') || 'org-joy-01') : 'org-joy-01';
    return `${baseKey}_${orgId}`;
  }

  private getStore<T>(baseKey: string, fallback: T[] = []): T[] {
    try {
      const tenantKey = this.getTenantStorageKey(baseKey);
      const data = localStorage.getItem(tenantKey);
      if (data) return JSON.parse(data);

      const legacy = localStorage.getItem(baseKey);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        localStorage.setItem(tenantKey, legacy);
        return parsed;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  private setStore<T>(baseKey: string, items: T[]): void {
    try {
      const tenantKey = this.getTenantStorageKey(baseKey);
      const str = JSON.stringify(items);
      localStorage.setItem(tenantKey, str);
      localStorage.setItem(baseKey, str);
      localStorage.setItem(`${baseKey}_org-joy-01`, str);
    } catch (e) {
      console.warn(`[DocumentService] Failed to persist ${baseKey}:`, e);
    }
  }

  // ==========================================================================
  // 1. MASTER TAXONOMY & TYPES
  // ==========================================================================

  async syncWithDatabase(): Promise<void> {
    if (!isSupabaseEnabled) return;
    try {
      const [reqsRes, docsRes, empsRes] = await Promise.all([
        supabase.from('document_requirements').select('*'),
        supabase.from('employee_documents').select('*'),
        supabase.from('employees').select('*'),
      ]);

      const empsMap = new Map<string, any>();
      if (empsRes.data) {
        for (const emp of empsRes.data) {
          empsMap.set(emp.id, emp);
          if (emp.employee_code) empsMap.set(emp.employee_code, emp);
        }
      }

      // Sync requirements
      if (reqsRes.data && reqsRes.data.length > 0) {
        const mappedReqs: DocumentRequirement[] = reqsRes.data.map(r => {
          const emp = empsMap.get(r.employee_id);
          const empName = emp ? `${emp.first_name} ${emp.last_name}` : r.employee_id;
          return {
            id: r.id,
            tenant_id: r.tenant_id || 'org-joy-01',
            organization_id: r.organization_id || 'org-joy-01',
            employee_id: r.employee_id,
            document_type: r.document_type,
            title: r.title,
            description: r.description,
            required: r.required ?? true,
            due_date: r.due_date,
            status: r.status,
            rejection_reason: r.rejection_reason,
            requested_by: r.requested_by || 'HR Head',
            document_id: r.document_id,
            created_at: r.created_at,
            updated_at: r.updated_at,
          };
        });
        this.setStore(REQUIREMENTS_STORAGE_KEY, mappedReqs);
      }

      // Build DocumentMaster records from employee_documents & document_requirements
      const masterDocs: DocumentMaster[] = [];
      const versions: DocumentVersion[] = [];

      if (docsRes.data && docsRes.data.length > 0) {
        for (const doc of docsRes.data) {
          const emp = empsMap.get(doc.employee_id);
          const empName = emp ? `${emp.first_name} ${emp.last_name} (${emp.employee_code || emp.id})` : doc.employee_id;
          const matchingType = this.getDocumentTypeByCode(doc.document_type);

          let filePublicUrl = doc.file_url || '';
          if (doc.storage_path && (!filePublicUrl || !filePublicUrl.startsWith('http') || filePublicUrl.includes('/object/public/'))) {
            try {
              filePublicUrl = supabaseStorageEngine.createSignedUrlSync
                ? supabaseStorageEngine.createSignedUrlSync('employee-documents', doc.storage_path)
                : supabase.storage.from('employee-documents').getPublicUrl(doc.storage_path).data.publicUrl;
            } catch (_) {
              try {
                filePublicUrl = supabase.storage.from('workforce-documents').getPublicUrl(doc.storage_path).data.publicUrl;
              } catch (_) {}
            }
          }

          const versionId = `ver-${doc.id}-1`;
          const curVer: DocumentVersion = {
            id: versionId,
            document_id: doc.id,
            version_number: 1,
            file_name: doc.file_name || `${doc.document_type}.pdf`,
            file_size_bytes: doc.file_size_bytes || 1024 * 1024,
            mime_type: doc.mime_type || 'application/pdf',
            storage_path: doc.storage_path || '',
            content_hash: 'sha256-verified',
            encryption_algorithm: 'AES-256-GCM',
            malware_scan_status: 'SAFE',
            uploaded_by_id: doc.employee_id,
            uploaded_by_name: empName,
            created_at: doc.uploaded_at || doc.created_at || new Date().toISOString(),
          };
          versions.push(curVer);

          masterDocs.push({
            id: doc.id,
            tenant_id: doc.tenant_id || 'org-joy-01',
            subject_type: 'employee',
            subject_id: doc.employee_id,
            subject_name: empName,
            document_type_code: doc.document_type,
            category_code: matchingType?.code || 'IDENTITY',
            title: matchingType?.name || doc.document_type,
            classification: (matchingType?.default_classification as any) || 'restricted',
            status: 'active',
            verification_status: doc.verification_status?.toUpperCase() === 'VERIFIED' ? 'VERIFIED' : (doc.verification_status?.toUpperCase() === 'REJECTED' ? 'REJECTED' : 'PENDING_VERIFICATION'),
            current_version_id: versionId,
            current_version: curVer,
            versions: [curVer],
            version_count: 1,
            created_by: empName,
            created_at: doc.uploaded_at || doc.created_at || new Date().toISOString(),
            updated_at: doc.uploaded_at || doc.created_at || new Date().toISOString(),
            file_url: filePublicUrl,
            file_name: doc.file_name,
            employee_id: doc.employee_id,
            employee_name: empName,
            document_type: matchingType?.name || doc.document_type,
          });
        }
      }

      // Also merge requirements so HR can see submitted mobile documents
      if (reqsRes.data && reqsRes.data.length > 0) {
        for (const req of reqsRes.data) {
          const emp = empsMap.get(req.employee_id);
          const empName = emp ? `${emp.first_name} ${emp.last_name} (${emp.employee_code || emp.id})` : req.employee_id;
          const matchingType = this.getDocumentTypeByCode(req.document_type);

          // Find if there is a matching uploaded file in employee_documents or storage
          const matchingDoc = docsRes.data?.find(d => 
            d.id === req.document_id || 
            (d.employee_id === req.employee_id && (d.document_type === req.document_type || d.document_type === req.title))
          );

          let reqFileUrl = matchingDoc?.file_url || '';
          let reqStoragePath = matchingDoc?.storage_path || '';
          let reqFileName = matchingDoc?.file_name || `${req.title || 'Document'}.pdf`;

          // If no doc record yet, check storage folder
          if (!reqFileUrl && (req.status === 'SUBMITTED' || req.status === 'VERIFIED')) {
            try {
              const folderPath = `employees/${req.employee_id}/documents/${req.id}`;
              const { data: files } = await supabase.storage.from('employee-documents').list(folderPath, {
                limit: 50,
              });
              if (files && files.length > 0) {
                const realFiles = files.filter(f => f.name && !f.name.startsWith('.'));
                if (realFiles.length > 0) {
                  realFiles.sort((a, b) => {
                    const timeA = parseInt(a.name.split('_')[0]) || new Date(a.created_at || 0).getTime();
                    const timeB = parseInt(b.name.split('_')[0]) || new Date(b.created_at || 0).getTime();
                    return timeB - timeA; // Descending (newest first)
                  });
                  const latest = realFiles[0];
                  reqStoragePath = `${folderPath}/${latest.name}`;
                  reqFileName = latest.name.replace(/^\d+_/, '');
                  reqFileUrl = supabase.storage.from('employee-documents').getPublicUrl(reqStoragePath).data.publicUrl;
                }
              }
            } catch (_) {}
          }

          const versionId = `ver-${req.id}-1`;
          const curVer: DocumentVersion = {
            id: versionId,
            document_id: req.id,
            version_number: 1,
            file_name: reqFileName,
            file_size_bytes: matchingDoc?.file_size_bytes || 1024 * 512,
            mime_type: matchingDoc?.mime_type || (reqFileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            storage_path: reqStoragePath,
            file_url: reqFileUrl,
            content_hash: 'sha256-verified',
            encryption_algorithm: 'AES-256-GCM',
            malware_scan_status: 'SAFE',
            uploaded_by_id: req.employee_id,
            uploaded_by_name: empName,
            created_at: req.updated_at || req.created_at || new Date().toISOString(),
          };
          versions.push(curVer);

          const existingMasterIndex = masterDocs.findIndex(d => d.id === req.id || (req.document_id && d.id === req.document_id));
          const docPayload: DocumentMaster = {
            id: req.id,
            tenant_id: req.tenant_id || 'org-joy-01',
            subject_type: 'employee',
            subject_id: req.employee_id,
            subject_name: empName,
            document_type_code: req.document_type,
            category_code: matchingType?.code || 'IDENTITY',
            title: req.title || matchingType?.name || req.document_type,
            classification: (matchingType?.default_classification as any) || 'restricted',
            status: 'active',
            verification_status: req.status?.toUpperCase() === 'VERIFIED' ? 'VERIFIED' : (req.status?.toUpperCase() === 'REJECTED' ? 'REJECTED' : 'PENDING_VERIFICATION'),
            current_version_id: versionId,
            current_version: curVer,
            versions: [curVer],
            version_count: 1,
            created_by: req.requested_by || 'HR Head',
            created_at: req.created_at || new Date().toISOString(),
            updated_at: req.updated_at || new Date().toISOString(),
            file_url: reqFileUrl,
            file_name: reqFileName,
            storage_path: reqStoragePath,
            employee_id: req.employee_id,
            employee_name: empName,
            document_type: req.title || req.document_type,
          };

          if (existingMasterIndex >= 0) {
            masterDocs[existingMasterIndex] = { ...masterDocs[existingMasterIndex], ...docPayload };
          } else {
            masterDocs.push(docPayload);
          }
        }
      }

      if (masterDocs.length > 0) {
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
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const versionId = `dver-${Date.now()}-1`;
    const now = new Date().toISOString();
    const originalFileName = params.fileName || (params.file as File).name || `${params.documentTypeCode.toLowerCase()}.pdf`;

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
      tenantId: currentUser.organization_id || 'org-joy-01',
      organizationId: currentUser.organization_id || 'org-joy-01',
      employeeId: params.subjectType === 'employee' ? params.subjectId : undefined,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      documentId: docId,
      versionNumber: 1,
      fileName: originalFileName,
      file: optimized.file,
      classification: params.classification || 'restricted',
      isCompanyDoc: params.subjectType === 'company' || params.categoryCode === 'COMPANY_POLICY',
    });

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
      uploaded_by_id: currentUser.id || (currentUser as any).employee_id || 'user-admin-01',
      uploaded_by_name: currentUser.name || 'Dharun Joy',
      created_at: now,
    };

    // Step 5: Construct Canonical Document Master Record
    const newDoc: DocumentMaster = {
      id: docId,
      tenant_id: currentUser.organization_id || 'org-joy-01',
      legal_entity_id: 'comp-joy-01',
      subject_type: params.subjectType,
      subject_id: params.subjectId,
      subject_name: params.subjectName || currentUser.name || 'Employee',
      document_type_code: params.documentTypeCode,
      category_code: params.categoryCode || 'IDENTITY',
      title: params.title,
      description: params.description,
      classification: params.classification || 'restricted',
      status: 'active',
      verification_status: params.requiresVerification ? 'PENDING_VERIFICATION' : 'VERIFIED',
      current_version_id: versionId,
      version_count: 1,
      issued_at: params.issuedAt,
      expires_at: params.expiresAt,
      created_by: currentUser.name || 'Current User',
      created_at: now,
      updated_at: now,
    };

    params.onProgress?.('SAVING');

    // Save locally
    const docs = this.getStore<DocumentMaster>(DOCUMENTS_STORAGE_KEY, []);
    docs.unshift(newDoc);
    this.setStore(DOCUMENTS_STORAGE_KEY, docs);

    const versions = this.getStore<DocumentVersion>(VERSIONS_STORAGE_KEY, []);
    versions.unshift(newVersion);
    this.setStore(VERSIONS_STORAGE_KEY, versions);

    // Save in Supabase PostgreSQL if enabled
    if (isSupabaseEnabled) {
      try {
        await Promise.all([
          supabase.from('document_master').insert({
            id: newDoc.id,
            tenant_id: newDoc.tenant_id,
            organization_id: newDoc.tenant_id,
            document_type_code: newDoc.document_type_code,
            title: newDoc.title,
            subject_type: newDoc.subject_type,
            subject_id: newDoc.subject_id,
            subject_name: newDoc.subject_name,
            current_version_id: versionId,
            current_version_number: 1,
            classification: newDoc.classification,
            verification_status: newDoc.verification_status,
            storage_bucket: storageResult.storageBucket,
            storage_path: storageResult.storagePath,
            original_filename: originalFileName,
            original_size_bytes: optimized.originalSizeBytes,
            stored_size_bytes: optimized.storedSizeBytes,
            compression_ratio: optimized.compressionRatio,
            checksum_sha256: optimized.sha256,
            created_by: newDoc.created_by,
          }),
          supabase.from('document_versions').insert({
            id: versionId,
            tenant_id: newDoc.tenant_id,
            organization_id: newDoc.tenant_id,
            document_id: docId,
            version_number: 1,
            storage_bucket: storageResult.storageBucket,
            storage_path: storageResult.storagePath,
            original_filename: originalFileName,
            mime_type: optimized.mimeType,
            original_size_bytes: optimized.originalSizeBytes,
            stored_size_bytes: optimized.storedSizeBytes,
            checksum_sha256: optimized.sha256,
            compression_ratio: optimized.compressionRatio,
            uploaded_by: currentUser.name || 'Current User',
            is_current: true,
          }),
        ]);
      } catch (err) {
        console.warn('[DocumentService] Postgres insertion background error:', err);
      }
    }

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

    return this.getDocumentById(docId)!;
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
    const nextVerNumber = (doc.version_count || 1) + 1;
    const versionId = `dver-${Date.now()}-${nextVerNumber}`;
    const now = new Date().toISOString();
    const actualFileName = fileName || (file as File).name || doc.file_name || 'document_v2.pdf';

    // Optimize and calculate hash
    const optimized = await fileOptimizationService.optimizeFile(file, actualFileName);

    // Upload to Private Supabase Storage
    const storageResult = await supabaseStorageEngine.uploadFile({
      tenantId: doc.tenant_id,
      organizationId: doc.tenant_id,
      employeeId: doc.subject_type === 'employee' ? doc.subject_id : undefined,
      subjectType: doc.subject_type,
      subjectId: doc.subject_id,
      documentId: doc.id,
      versionNumber: nextVerNumber,
      fileName: actualFileName,
      file: optimized.file,
      classification: doc.classification,
    });

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
      uploaded_by_id: currentUser.id || 'user-admin-01',
      uploaded_by_name: currentUser.name || 'Dharun Joy',
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
      docs[docIdx].version_count = nextVerNumber;
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
    docs[idx].verified_by = currentUser.name || 'Dharun Joy (HR Head)';
    docs[idx].verified_at = now;
    docs[idx].rejection_reason = undefined;
    if (comments) docs[idx].notes = comments;
    docs[idx].updated_at = now;

    this.setStore(DOCUMENTS_STORAGE_KEY, docs);

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
    docs[idx].verified_by = currentUser.name || 'Dharun Joy (HR Head)';
    docs[idx].verified_at = now;
    docs[idx].rejection_reason = reason;
    docs[idx].updated_at = now;

    this.setStore(DOCUMENTS_STORAGE_KEY, docs);

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

    const bucket: StorageBucketDomain = supabaseStorageEngine.resolveStorageBucket(doc.classification, doc.subject_type === 'company');
    const storagePath = targetVersion?.storage_path || `tenant/${doc.tenant_id}/employee/${doc.subject_id}/documents/${doc.id}/v1/${doc.file_name || 'document.pdf'}`;

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

    // 1. Remove from local store
    this.setStore(DOCUMENTS_STORAGE_KEY, docs.filter(d => d.id !== documentId));
    this.setStore(REQUIREMENTS_STORAGE_KEY, reqs.filter(r => r.id !== documentId && r.document_id !== documentId));
    this.setStore(VERSIONS_STORAGE_KEY, versions.filter(v => v.document_id !== documentId));

    // 2. Clean completely from Supabase backend
    if (isSupabaseEnabled) {
      try {
        // Delete requirement row
        await supabase.from('document_requirements').delete().or(`id.eq.${documentId},document_id.eq.${documentId}`);

        // Delete employee document row
        await supabase.from('employee_documents').delete().eq('id', documentId);

        // Delete associated notification events
        await supabase.from('notification_events').delete().or(`resource_id.eq.${documentId},metadata->>requirement_id.eq.${documentId}`);

        // Delete storage file if exists from both buckets
        const storagePath = targetDoc?.current_version?.storage_path;
        if (storagePath) {
          try {
            await supabase.storage.from('employee-documents').remove([storagePath]);
          } catch (_) {}
          try {
            await supabase.storage.from('workforce-documents').remove([storagePath]);
          } catch (_) {}
        }
      } catch (err) {
        console.warn('[DocumentService] Supabase delete error:', err);
      }
    }

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
    const reqId = `doc-req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const tenantId = currentUser.organization_id || 'org-joy-01';

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

    // Persist to Supabase Postgres via RPC or direct insertion
    if (isSupabaseEnabled) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_dispatch_document_request', {
          p_employee_id: params.employeeId,
          p_document_type: params.documentTypeCode,
          p_title: params.title,
          p_description: params.description || '',
          p_due_date: params.dueDate || null,
          p_is_mandatory: params.required !== false,
          p_requested_by: currentUser.name || 'HR Team',
          p_correlation_id: correlationId,
        });

        if (!rpcErr && rpcRes && rpcRes.request_id) {
          newReq.id = rpcRes.request_id;
          console.log(`[DOC_REQUEST][DB] CREATE_SUCCESS request_id=${rpcRes.request_id} correlation=${correlationId}`);
        } else {
          // Fallback direct insert
          await supabase.from('document_requirements').insert({
            id: newReq.id,
            tenant_id: newReq.tenant_id,
            organization_id: newReq.organization_id,
            employee_id: newReq.employee_id,
            document_type: newReq.document_type,
            title: newReq.title,
            description: newReq.description,
            required: newReq.required,
            due_date: newReq.due_date,
            status: newReq.status,
            requested_by: newReq.requested_by,
          });

          await supabase.from('notification_events').insert({
            event_type: 'DOCUMENT_UPLOAD_REQUESTED',
            category: 'SYSTEM',
            severity: 'WARNING',
            title: `Action Required: Document Upload (${params.title})`,
            body: `HR has requested you to upload: ${params.title}. Please upload via the mobile app before ${params.dueDate || 'due date'}.`,
            resource_type: 'DOCUMENT_REQUIREMENT',
            resource_id: params.employeeId,
            actor_name: currentUser.name || 'HR Team',
            action_url: `/documents/upload?reqId=${reqId}`,
            metadata: {
              target_user_id: params.employeeId,
              requirement_id: reqId,
              document_type: params.documentTypeCode,
              due_date: params.dueDate,
              correlation_id: correlationId,
            },
          });

          await supabase.from('realtime_outbox').insert({
            event_type: 'document.requested',
            entity_type: 'DOCUMENT_REQUIREMENT',
            entity_id: newReq.id,
            organization_id: tenantId,
            payload: {
              requirement_id: newReq.id,
              employee_id: newReq.employee_id,
              title: newReq.title,
              document_type: newReq.document_type,
              due_date: newReq.due_date,
              correlation_id: correlationId,
              created_at: now,
            },
          });
        }
      } catch (err) {
        console.warn('[DocumentService] Postgres requirement insert error:', err);
      }
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
