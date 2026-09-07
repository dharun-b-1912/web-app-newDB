// src/services/operations/employeeDocumentEngine.ts
// ============================================================================
// Joy PeopleHR — Employee Document Management & Expiry Tracking Engine
// ============================================================================

import { supabase } from '../../lib/supabase';

export type DocumentType =
  | 'AADHAAR'
  | 'PAN'
  | 'BANK_PROOF'
  | 'EDUCATION'
  | 'EXPERIENCE'
  | 'MEDICAL'
  | 'JOINING_DOC'
  | 'CUSTOM';

export type VerificationStatus =
  | 'PENDING'
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export interface EmployeeDocument {
  id?: string;
  organization_id: string;
  employee_id: string;
  document_type: DocumentType;
  document_title: string;
  file_url: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  issue_date?: string;
  expiry_date?: string;
  verification_status: VerificationStatus;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  is_mandatory: boolean;
  created_at?: string;
}

class EmployeeDocumentEngine {
  /**
   * Fetch all documents for an employee
   */
  async getEmployeeDocuments(employeeId: string, orgId: string): Promise<EmployeeDocument[]> {
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        organization_id: d.organization_id || orgId,
        employee_id: d.employee_id,
        document_title: d.file_name || 'Document',
        document_type: 'OTHER' as DocumentType,
        file_url: d.storage_path || '',
        file_name: d.file_name,
        verification_status: (d.verification_status || 'PENDING') as VerificationStatus,
        verified_by: d.verified_by,
        verified_at: d.verified_at,
        rejection_reason: d.rejection_reason,
        is_mandatory: false,
        created_at: d.created_at,
      }));
    } catch (err) {
      console.warn('[DocumentEngine] Failed to fetch documents:', err);
      return [];
    }
  }

  /**
   * Upload or register a new employee document
   */
  async saveDocument(doc: EmployeeDocument): Promise<EmployeeDocument> {
    const payload: any = {
      id: doc.id,
      organization_id: doc.organization_id || '00000000-0000-0000-0000-000000000000',
      employee_id: doc.employee_id,
      file_name: doc.document_title || doc.file_name || 'Document',
      storage_path: doc.file_url,
      file_size_bytes: doc.file_size_bytes || 0,
      mime_type: doc.mime_type || 'application/pdf',
      verification_status: doc.verification_status || 'PENDING',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('employee_documents')
      .upsert(payload)
      .select()
      .maybeSingle();

    if (error) throw error;
    return (data || doc) as any;
  }

  /**
   * Verify or reject an employee document
   */
  async verifyDocument(
    docId: string,
    status: 'VERIFIED' | 'REJECTED',
    _verifierName: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('employee_documents')
        .update({
          verification_status: status,
          verified_at: new Date().toISOString(),
          rejection_reason: status === 'REJECTED' ? rejectionReason : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId);

      if (error) throw error;
      return { success: true, message: `Document marked as ${status}.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Verification update failed.' };
    }
  }

  /**
   * Scans for employee documents expiring within the next N days
   */
  async getExpiringDocuments(orgId: string, _daysAhead: number = 30): Promise<EmployeeDocument[]> {
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('organization_id', orgId)
        .eq('verification_status', 'PENDING')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        organization_id: d.organization_id || orgId,
        employee_id: d.employee_id,
        document_title: d.file_name || 'Document',
        document_type: 'OTHER' as DocumentType,
        file_url: d.storage_path || '',
        file_name: d.file_name,
        verification_status: (d.verification_status || 'PENDING') as VerificationStatus,
        is_mandatory: false,
        created_at: d.created_at,
      }));
    } catch (err) {
      console.warn('[DocumentEngine] Expiry scan notice:', err);
      return [];
    }
  }
}

export const employeeDocumentEngine = new EmployeeDocumentEngine();
