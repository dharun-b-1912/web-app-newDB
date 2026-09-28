// src/services/documents/documentRequestService.ts
// ============================================================================
// Joy PeopleHR — Employee & Vendor Document Request Lifecycle Engine
// Synchronizes HR Dashboard <-> Flutter Mobile App <-> Private Supabase Storage
// Lifecycle: PENDING -> REQUESTED -> UPLOADED -> SUBMITTED -> UNDER_REVIEW -> VERIFIED / REJECTED
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';

export type DocumentOwnerType = 'EMPLOYEE' | 'VENDOR' | 'COMPANY' | 'CLIENT_SITE';
export type DocumentSource = 'HR' | 'VENDOR_ADMIN' | 'EMPLOYEE' | 'FLUTTER_APP' | 'WEB_APP';

export type DocumentRequestStatus =
  | 'PENDING'
  | 'REQUESTED'
  | 'UPLOADED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REPLACEMENT_REQUIRED'
  | 'EXPIRED';

export interface EmployeeDocumentRequest {
  id: string;
  tenant_id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  
  document_type_id: string;
  document_title: string;
  document_code: string;
  category: 'IDENTITY' | 'EMPLOYMENT' | 'EDUCATION' | 'PAYROLL' | 'STATUTORY' | 'VENDOR_WORKFORCE';
  
  is_required: boolean;
  requested_by: string;
  requested_by_name: string;
  requested_from: 'EMPLOYEE' | 'VENDOR_ADMIN' | 'HR';
  
  document_id?: string;
  status: DocumentRequestStatus;
  
  due_date?: string;
  request_message?: string;
  
  file_name?: string;
  file_size?: string;
  file_url?: string;
  storage_path?: string;
  bucket_id?: string;
  
  submitted_at?: string;
  submitted_via?: DocumentSource;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  replacement_note?: string;
  
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'joy_employee_document_requests_v1';

class DocumentRequestService {
  private getStore(): EmployeeDocumentRequest[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return this.getInitialSeedRequests();
  }

  private setStore(items: EmployeeDocumentRequest[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch (e) {
      console.warn('[DocumentRequestService] Failed to persist requests:', e);
    }
  }

  private getInitialSeedRequests(): EmployeeDocumentRequest[] {
    const seed: EmployeeDocumentRequest[] = [
      {
        id: 'dreq-101',
        tenant_id: 'org-joy-01',
        organization_id: '0c621892-e938-4707-9957-13534ea32c19',
        employee_id: 'emp-101',
        employee_name: 'Thirumalai R K',
        employee_code: 'WF-1001',
        document_type_id: 'dt-pan',
        document_title: 'Permanent Account Number (PAN) Card',
        document_code: 'PAN_CARD',
        category: 'IDENTITY',
        is_required: true,
        requested_by: 'hr-head',
        requested_by_name: 'Mari Muthu (HR Head)',
        requested_from: 'EMPLOYEE',
        status: 'VERIFIED',
        file_name: 'PAN_Thirumalai_RK.pdf',
        file_size: '420 KB',
        file_url: 'https://placehold.co/600x400.png?text=PAN+Card+Verified',
        storage_path: 'employees/WF-1001/identity/PAN_Thirumalai_RK.pdf',
        bucket_id: 'employee-private-documents',
        submitted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        submitted_via: 'FLUTTER_APP',
        verified_by: 'Mari Muthu (HR Head)',
        verified_at: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'dreq-102',
        tenant_id: 'org-joy-01',
        organization_id: '0c621892-e938-4707-9957-13534ea32c19',
        employee_id: 'emp-101',
        employee_name: 'Thirumalai R K',
        employee_code: 'WF-1001',
        document_type_id: 'dt-offer',
        document_title: 'Signed Appointment / Offer Letter',
        document_code: 'OFFER_LETTER',
        category: 'EMPLOYMENT',
        is_required: true,
        requested_by: 'hr-head',
        requested_by_name: 'Mari Muthu (HR Head)',
        requested_from: 'EMPLOYEE',
        status: 'REQUESTED',
        due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        request_message: 'Please upload your signed appointment letter copy through your JOY PeopleHR mobile app.',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'dreq-103',
        tenant_id: 'org-joy-01',
        organization_id: '0c621892-e938-4707-9957-13534ea32c19',
        employee_id: 'emp-101',
        employee_name: 'Thirumalai R K',
        employee_code: 'WF-1001',
        document_type_id: 'dt-bank',
        document_title: 'Bank Passbook / Cancelled Cheque',
        document_code: 'BANK_DOCUMENT',
        category: 'PAYROLL',
        is_required: true,
        requested_by: 'hr-head',
        requested_by_name: 'Mari Muthu (HR Head)',
        requested_from: 'EMPLOYEE',
        status: 'SUBMITTED',
        file_name: 'HDFC_Cancelled_Cheque_WF1001.jpg',
        file_size: '1.2 MB',
        file_url: 'https://placehold.co/600x400.png?text=Cancelled+Cheque',
        storage_path: 'employees/WF-1001/payroll/HDFC_Cancelled_Cheque.jpg',
        bucket_id: 'employee-private-documents',
        submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        submitted_via: 'FLUTTER_APP',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ];
    this.setStore(seed);
    return seed;
  }

  // ==========================================================================
  // 1. CREATE / DISPATCH REQUEST TO FLUTTER APP
  // ==========================================================================
  async createRequest(params: {
    employeeId: string;
    employeeName?: string;
    employeeCode?: string;
    documentTypeId: string;
    documentTitle: string;
    documentCode: string;
    category: 'IDENTITY' | 'EMPLOYMENT' | 'EDUCATION' | 'PAYROLL' | 'STATUTORY' | 'VENDOR_WORKFORCE';
    isRequired?: boolean;
    dueDate?: string;
    message?: string;
  }): Promise<EmployeeDocumentRequest> {
    const items = this.getStore();
    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();

    // Check if an active request already exists
    const existingIndex = items.findIndex(
      (r) =>
        r.employee_id === params.employeeId &&
        (r.document_code === params.documentCode || r.document_type_id === params.documentTypeId)
    );

    const newReq: EmployeeDocumentRequest = {
      id: existingIndex >= 0 ? items[existingIndex].id : `dreq-${Date.now()}`,
      tenant_id: 'org-joy-01',
      organization_id: '0c621892-e938-4707-9957-13534ea32c19',
      employee_id: params.employeeId,
      employee_name: params.employeeName || 'Employee',
      employee_code: params.employeeCode || params.employeeId,
      document_type_id: params.documentTypeId,
      document_title: params.documentTitle,
      document_code: params.documentCode,
      category: params.category,
      is_required: params.isRequired ?? true,
      requested_by: currentUser?.id || 'hr-admin',
      requested_by_name: currentUser?.name || 'HR Admin',
      requested_from: 'EMPLOYEE',
      status: 'REQUESTED',
      due_date: params.dueDate,
      request_message: params.message || `Please upload ${params.documentTitle} for verification.`,
      created_at: existingIndex >= 0 ? items[existingIndex].created_at : now,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      items[existingIndex] = newReq;
    } else {
      items.unshift(newReq);
    }

    this.setStore(items);

    // If Supabase is connected, attempt sync
    if (isSupabaseEnabled) {
      try {
        await supabase.from('employee_document_requests').upsert({
          id: newReq.id,
          employee_id: newReq.employee_id,
          document_type_id: newReq.document_type_id,
          status: newReq.status,
          request_message: newReq.request_message,
          due_date: newReq.due_date,
          created_at: newReq.created_at,
          updated_at: newReq.updated_at,
        });
      } catch (err) {
        console.warn('[DocumentRequestService] Supabase sync notice:', err);
      }
    }

    hrEventBus.publish('document.requested', {
      requestId: newReq.id,
      employeeId: newReq.employee_id,
      documentCode: newReq.document_code,
      title: newReq.document_title,
    });

    return newReq;
  }

  // ==========================================================================
  // 2. QUERY REQUESTS (Used by HR and Flutter App)
  // ==========================================================================
  getRequests(params: {
    employeeId?: string;
    category?: string;
    status?: DocumentRequestStatus;
  } = {}): EmployeeDocumentRequest[] {
    let list = this.getStore();
    if (params.employeeId) {
      list = list.filter((r) => r.employee_id === params.employeeId || r.employee_code === params.employeeId);
    }
    if (params.category && params.category !== 'ALL') {
      list = list.filter((r) => r.category === params.category);
    }
    if (params.status) {
      list = list.filter((r) => r.status === params.status);
    }
    return list;
  }

  getRequestById(id: string): EmployeeDocumentRequest | null {
    const list = this.getStore();
    return list.find((r) => r.id === id) || null;
  }

  // ==========================================================================
  // 3. FLUTTER / EMPLOYEE SUBMISSION
  // ==========================================================================
  async submitDocument(params: {
    requestId: string;
    fileName: string;
    fileSize: string;
    fileUrl?: string;
    storagePath?: string;
    source?: DocumentSource;
  }): Promise<EmployeeDocumentRequest> {
    const items = this.getStore();
    const idx = items.findIndex((r) => r.id === params.requestId);
    if (idx === -1) throw new Error('Document request not found');

    const now = new Date().toISOString();
    items[idx].status = 'SUBMITTED';
    items[idx].file_name = params.fileName;
    items[idx].file_size = params.fileSize;
    items[idx].file_url = params.fileUrl || 'https://placehold.co/600x400.png?text=Submitted+Document';
    items[idx].storage_path = params.storagePath || `employees/${items[idx].employee_code || items[idx].employee_id}/documents/${params.fileName}`;
    items[idx].bucket_id = 'employee-private-documents';
    items[idx].submitted_at = now;
    items[idx].submitted_via = params.source || 'FLUTTER_APP';
    items[idx].updated_at = now;

    this.setStore(items);

    hrEventBus.publish('document.submitted', {
      requestId: items[idx].id,
      employeeId: items[idx].employee_id,
      documentCode: items[idx].document_code,
      fileName: params.fileName,
    });

    return items[idx];
  }

  // ==========================================================================
  // 4. HR REVIEW / VERIFY / REJECT
  // ==========================================================================
  async reviewDocument(params: {
    requestId: string;
    status: 'VERIFIED' | 'REJECTED' | 'REPLACEMENT_REQUIRED';
    rejectionReason?: string;
    replacementNote?: string;
  }): Promise<EmployeeDocumentRequest> {
    if (params.status === 'REJECTED' && (!params.rejectionReason || !params.rejectionReason.trim())) {
      throw new Error('A formal rejection reason is required.');
    }

    const items = this.getStore();
    const idx = items.findIndex((r) => r.id === params.requestId);
    if (idx === -1) throw new Error('Document request not found');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();

    items[idx].status = params.status;
    items[idx].verified_by = currentUser?.name || 'HR Head';
    items[idx].verified_at = now;
    items[idx].updated_at = now;

    if (params.rejectionReason) {
      items[idx].rejection_reason = params.rejectionReason;
    }
    if (params.replacementNote) {
      items[idx].replacement_note = params.replacementNote;
    }

    this.setStore(items);

    if (params.status === 'VERIFIED') {
      hrEventBus.publish('document.verified', {
        requestId: items[idx].id,
        employeeId: items[idx].employee_id,
        documentCode: items[idx].document_code,
        verifiedBy: items[idx].verified_by,
      });
    } else {
      hrEventBus.publish('document.rejected', {
        requestId: items[idx].id,
        employeeId: items[idx].employee_id,
        documentCode: items[idx].document_code,
        reason: params.rejectionReason,
      });
    }

    return items[idx];
  }

  // ==========================================================================
  // 5. BULK SEEDING FOR NEW EMPLOYEE ONBOARDING
  // ==========================================================================
  initializeEmployeeChecklist(employeeId: string, employeeName: string, employeeCode: string, isVendorDeployed: boolean = false): void {
    const defaultChecklist: Array<{
      id: string;
      title: string;
      code: string;
      category: 'IDENTITY' | 'EMPLOYMENT' | 'EDUCATION' | 'PAYROLL' | 'STATUTORY' | 'VENDOR_WORKFORCE';
      required: boolean;
    }> = [
      { id: 'dt-aadhaar', title: 'Aadhaar / National Identity Proof', code: 'AADHAAR_CARD', category: 'IDENTITY', required: true },
      { id: 'dt-pan', title: 'PAN Card', code: 'PAN_CARD', category: 'IDENTITY', required: true },
      { id: 'dt-offer', title: 'Signed Appointment Letter', code: 'OFFER_LETTER', category: 'EMPLOYMENT', required: true },
      { id: 'dt-nda', title: 'NDA & Confidentiality Agreement', code: 'NDA_AGREEMENT', category: 'EMPLOYMENT', required: false },
      { id: 'dt-degree', title: 'Highest Educational Degree Certificate', code: 'DEGREE_CERTIFICATE', category: 'EDUCATION', required: true },
      { id: 'dt-bank', title: 'Bank Account Proof / Cancelled Cheque', code: 'BANK_DOCUMENT', category: 'PAYROLL', required: true },
      { id: 'dt-epf', title: 'EPFO Form 11 Declaration', code: 'EPF_FORM_11', category: 'STATUTORY', required: false },
      { id: 'dt-esi', title: 'ESIC Form 1 Declaration', code: 'ESI_FORM_1', category: 'STATUTORY', required: false },
      { id: 'dt-medical', title: 'Medical Fitness Certificate', code: 'MEDICAL_FITNESS', category: 'STATUTORY', required: false },
    ];

    if (isVendorDeployed) {
      defaultChecklist.push(
        { id: 'dt-vnd-letter', title: 'Vendor Engagement / Deputation Letter', code: 'VENDOR_DEPUTATION', category: 'VENDOR_WORKFORCE', required: true },
        { id: 'dt-vnd-safety', title: 'Site Safety & Induction Acknowledgment', code: 'SITE_SAFETY_INDUCTION', category: 'VENDOR_WORKFORCE', required: true },
        { id: 'dt-vnd-ppe', title: 'PPE & Uniform Issuance Receipt', code: 'PPE_ACKNOWLEDGMENT', category: 'VENDOR_WORKFORCE', required: false }
      );
    }

    const items = this.getStore();
    const now = new Date().toISOString();

    for (const item of defaultChecklist) {
      const exists = items.some((r) => r.employee_id === employeeId && r.document_code === item.code);
      if (!exists) {
        items.push({
          id: `dreq-${employeeId}-${item.code.toLowerCase()}`,
          tenant_id: 'org-joy-01',
          organization_id: '0c621892-e938-4707-9957-13534ea32c19',
          employee_id: employeeId,
          employee_name: employeeName,
          employee_code: employeeCode,
          document_type_id: item.id,
          document_title: item.title,
          document_code: item.code,
          category: item.category,
          is_required: item.required,
          requested_by: 'system-onboarding',
          requested_by_name: 'HR Onboarding Engine',
          requested_from: 'EMPLOYEE',
          status: 'PENDING',
          created_at: now,
          updated_at: now,
        });
      }
    }

    this.setStore(items);
  }
}

export const documentRequestService = new DocumentRequestService();
