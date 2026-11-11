import { DocumentMaster, DocumentVerificationStatus } from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { documentAuditService } from './documentAuditService';
import { documentService, isValidDocumentUuid } from './documentService';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { notificationService } from '../notification/notificationService';

const DOCUMENTS_STORAGE_KEY = 'workforce_document_master_v2';

class DocumentVerificationService {
  private getTenantStorageKey(): string {
    const orgId = typeof window !== 'undefined' ? (localStorage.getItem('workforce_active_org_id') || '0c621892-e938-4707-9957-13534ea32c19') : '0c621892-e938-4707-9957-13534ea32c19';
    return `${DOCUMENTS_STORAGE_KEY}_${orgId}`;
  }

  private getDocuments(): DocumentMaster[] {
    try {
      const tenantData = localStorage.getItem(this.getTenantStorageKey());
      if (tenantData) return JSON.parse(tenantData);
      const data = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setDocuments(docs: DocumentMaster[]): void {
    try {
      const json = JSON.stringify(docs);
      localStorage.setItem(this.getTenantStorageKey(), json);
      localStorage.setItem(DOCUMENTS_STORAGE_KEY, json);
    } catch (e) {
      console.warn('[DocumentVerificationService] Failed to persist documents:', e);
    }
  }

  // Verify / Approve a document
  async verifyDocument(documentId: string, comments?: string): Promise<DocumentMaster> {
    const docs = this.getDocuments();
    let idx = docs.findIndex(d => d.id === documentId);
    if (idx === -1) {
      const fallback = documentService.getDocumentById(documentId);
      if (!fallback) throw new Error('Document not found.');
      docs.unshift(fallback);
      idx = 0;
    }

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const prevStatus = docs[idx].verification_status;
    const adminName = currentUser.name || currentUser.email || 'HR Reviewer';
    const verifierUuid = isValidDocumentUuid(currentUser.id) ? currentUser.id : null;

    docs[idx].verification_status = 'VERIFIED';
    docs[idx].verified_by = adminName;
    docs[idx].verified_at = now;
    docs[idx].rejection_reason = undefined;
    if (comments) docs[idx].notes = comments;
    docs[idx].updated_at = now;

    this.setDocuments(docs);

    // Persist to Supabase for valid UUID records
    if (isSupabaseEnabled && isValidDocumentUuid(documentId)) {
      try {
        const [{ error: empErr }, { error: docErr }] = await Promise.all([
          supabase
            .from('employee_documents')
            .update({
              verification_status: 'VERIFIED',
              verified_by: verifierUuid,
              verified_at: now,
              rejection_reason: null,
              updated_at: now,
            })
            .eq('id', documentId),
          supabase
            .from('documents')
            .update({
              status: 'VERIFIED',
              verified_by: verifierUuid,
              verified_at: now,
              rejection_reason: null,
              updated_at: now,
            })
            .eq('id', documentId),
        ]);
        if (empErr && docErr) {
          console.warn('[DocumentVerificationService] verify update:', empErr.message, docErr.message);
        }
      } catch (docErr) {
        console.warn('[DocumentVerificationService] employee_documents verify update:', docErr);
      }

      // Notify Flutter App via notification_events
      notificationService.emitEmployeeNotification({
        employeeId: docs[idx].subject_id,
        title: `Document Verified: ${docs[idx].title}`,
        message: `Your submitted ${docs[idx].title} has been verified and approved by HR.`,
        actionUrl: '/documents',
      }).catch(() => {});
    }

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

  // Reject a document with mandatory reason
  async rejectDocument(documentId: string, reason: string): Promise<DocumentMaster> {
    if (!reason || !reason.trim()) {
      throw new Error('A formal rejection reason is mandatory.');
    }

    const docs = this.getDocuments();
    let idx = docs.findIndex(d => d.id === documentId);
    if (idx === -1) {
      const fallback = documentService.getDocumentById(documentId);
      if (!fallback) throw new Error('Document not found.');
      docs.unshift(fallback);
      idx = 0;
    }

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const prevStatus = docs[idx].verification_status;
    const adminName = currentUser.name || currentUser.email || 'HR Reviewer';
    const verifierUuid = isValidDocumentUuid(currentUser.id) ? currentUser.id : null;

    docs[idx].verification_status = 'REJECTED';
    docs[idx].verified_by = adminName;
    docs[idx].verified_at = now;
    docs[idx].rejection_reason = reason;
    docs[idx].updated_at = now;

    this.setDocuments(docs);

    // Persist to Supabase for valid UUID records
    if (isSupabaseEnabled && isValidDocumentUuid(documentId)) {
      try {
        const [{ error: empErr }, { error: docErr }] = await Promise.all([
          supabase
            .from('employee_documents')
            .update({
              verification_status: 'REJECTED',
              verified_by: verifierUuid,
              verified_at: now,
              rejection_reason: reason,
              updated_at: now,
            })
            .eq('id', documentId),
          supabase
            .from('documents')
            .update({
              status: 'REJECTED',
              verified_by: verifierUuid,
              verified_at: now,
              rejection_reason: reason,
              updated_at: now,
            })
            .eq('id', documentId),
        ]);
        if (empErr && docErr) {
          console.warn('[DocumentVerificationService] reject update:', empErr.message, docErr.message);
        }
      } catch (docErr) {
        console.warn('[DocumentVerificationService] employee_documents reject update:', docErr);
      }

      // Notify Flutter App
      notificationService.emitEmployeeNotification({
        employeeId: docs[idx].subject_id,
        title: `Document Rejected: ${docs[idx].title}`,
        message: `HR has rejected your ${docs[idx].title}. Reason: ${reason}. Please re-upload via the mobile app.`,
        actionUrl: '/documents',
      }).catch(() => {});
    }

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
      reason,
    });

    return docs[idx];
  }
}

export const documentVerificationService = new DocumentVerificationService();
