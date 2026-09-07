import { DocumentMaster, DocumentVerificationStatus } from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { documentAuditService } from './documentAuditService';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { notificationService } from '../notification/notificationService';

const DOCUMENTS_STORAGE_KEY = 'workforce_document_master_v2';
const REQUIREMENTS_STORAGE_KEY = 'workforce_document_requirements_v2';

class DocumentVerificationService {
  private getDocuments(): DocumentMaster[] {
    try {
      const data = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setDocuments(docs: DocumentMaster[]): void {
    try {
      localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
    } catch (e) {
      console.warn('[DocumentVerificationService] Failed to persist documents:', e);
    }
  }

  // Verify / Approve a document
  async verifyDocument(documentId: string, comments?: string): Promise<DocumentMaster> {
    const docs = this.getDocuments();
    const idx = docs.findIndex(d => d.id === documentId);
    if (idx === -1) throw new Error('Document not found.');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const prevStatus = docs[idx].verification_status;
    const adminName = currentUser.name || 'Hari priya (HR Head)';

    docs[idx].verification_status = 'VERIFIED';
    docs[idx].verified_by = adminName;
    docs[idx].verified_at = now;
    docs[idx].rejection_reason = undefined;
    if (comments) docs[idx].notes = comments;
    docs[idx].updated_at = now;

    this.setDocuments(docs);

    // Persist to Supabase
    if (isSupabaseEnabled) {
      // 1. Direct table updates to ensure both employee_documents and document_requirements are synced
      try {
        const { error } = await supabase
          .from('employee_documents')
          .update({
            verification_status: 'Verified',
          })
          .eq('id', documentId);

        if (error) {
          // If title-case failed or table expects uppercase, try VERIFIED
          await supabase
            .from('employee_documents')
            .update({
              verification_status: 'VERIFIED',
            })
            .eq('id', documentId);
        }
      } catch (docErr) {
        console.warn('[DocumentVerificationService] employee_documents verify update:', docErr);
      }

      // 3. Notify Flutter App via notification_events
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
    const idx = docs.findIndex(d => d.id === documentId);
    if (idx === -1) throw new Error('Document not found.');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const prevStatus = docs[idx].verification_status;
    const adminName = currentUser.name || 'Hari priya (HR Head)';

    docs[idx].verification_status = 'REJECTED';
    docs[idx].verified_by = adminName;
    docs[idx].verified_at = now;
    docs[idx].rejection_reason = reason;
    docs[idx].updated_at = now;

    this.setDocuments(docs);

    // Persist to Supabase
    if (isSupabaseEnabled) {
      // 1. Direct updates
      try {
        const { error } = await supabase
          .from('employee_documents')
          .update({
            verification_status: 'Rejected',
          })
          .eq('id', documentId);

        if (error) {
          await supabase
            .from('employee_documents')
            .update({
              verification_status: 'REJECTED',
            })
            .eq('id', documentId);
        }
      } catch (docErr) {
        console.warn('[DocumentVerificationService] employee_documents reject update:', docErr);
      }

      // 3. Notify Flutter App
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
