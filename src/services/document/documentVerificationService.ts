import { DocumentMaster, DocumentVerificationStatus } from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { documentAuditService } from './documentAuditService';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';

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

      try {
        await supabase
          .from('document_requirements')
          .update({
            status: 'VERIFIED',
            completed_at: now,
            updated_at: now,
          })
          .or(`id.eq.${documentId},document_id.eq.${documentId}`);
      } catch (reqErr) {
        console.warn('[DocumentVerificationService] document_requirements verify update:', reqErr);
      }

      // 3. Notify Flutter App via notification_events
      try {
        await supabase.from('notification_events').insert({
          event_type: 'DOCUMENT_VERIFIED',
          category: 'APPROVAL',
          severity: 'INFO',
          title: `Document Verified: ${docs[idx].title}`,
          body: `Your submitted ${docs[idx].title} has been verified and approved by HR.`,
          resource_type: 'DOCUMENT_REQUIREMENT',
          resource_id: docs[idx].subject_id,
          actor_name: adminName,
          metadata: {
            requirement_id: documentId,
            status: 'VERIFIED',
            employee_id: docs[idx].subject_id,
          },
        });
      } catch (notifErr) {
        console.warn('[DocumentVerificationService] notification_events verify insert:', notifErr);
      }
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

      try {
        await supabase
          .from('document_requirements')
          .update({
            status: 'REJECTED',
            rejection_reason: reason,
            updated_at: now,
          })
          .or(`id.eq.${documentId},document_id.eq.${documentId}`);
      } catch (reqErr) {
        console.warn('[DocumentVerificationService] document_requirements reject update:', reqErr);
      }

      // 3. Notify Flutter App
      try {
        await supabase.from('notification_events').insert({
          event_type: 'DOCUMENT_REJECTED',
          category: 'APPROVAL',
          severity: 'CRITICAL',
          title: `Document Rejected: ${docs[idx].title}`,
          body: `HR has rejected your ${docs[idx].title}. Reason: ${reason}. Please re-upload via the mobile app.`,
          resource_type: 'DOCUMENT_REQUIREMENT',
          resource_id: docs[idx].subject_id,
          actor_name: adminName,
          metadata: {
            requirement_id: documentId,
            status: 'REJECTED',
            rejection_reason: reason,
            employee_id: docs[idx].subject_id,
          },
        });
      } catch (notifErr) {
        console.warn('[DocumentVerificationService] notification_events reject insert:', notifErr);
      }
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
