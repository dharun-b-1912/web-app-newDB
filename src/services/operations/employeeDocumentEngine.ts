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
        .from('employee_documents_master')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[DocumentEngine] Failed to fetch documents:', err);
      return [];
    }
  }

  /**
   * Upload or register a new employee document
   */
  async saveDocument(doc: EmployeeDocument): Promise<EmployeeDocument> {
    const payload = {
      ...doc,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('employee_documents_master')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Verify or reject an employee document
   */
  async verifyDocument(
    docId: string,
    status: 'VERIFIED' | 'REJECTED',
    verifierName: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('employee_documents_master')
        .update({
          verification_status: status,
          verified_by: verifierName,
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
  async getExpiringDocuments(orgId: string, daysAhead: number = 30): Promise<EmployeeDocument[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('employee_documents_master')
        .select('*')
        .eq('organization_id', orgId)
        .neq('verification_status', 'EXPIRED')
        .lte('expiry_date', futureDateStr)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[DocumentEngine] Expiry scan failed:', err);
      return [];
    }
  }
}

export const employeeDocumentEngine = new EmployeeDocumentEngine();
