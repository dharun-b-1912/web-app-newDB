import { DocumentMaster, DocumentVerificationStatus } from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { documentAuditService } from './documentAuditService';

const DOCUMENTS_STORAGE_KEY = 'workforce_document_master_v2';

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
  verifyDocument(documentId: string, comments?: string): DocumentMaster {
    const docs = this.getDocuments();
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

    this.setDocuments(docs);

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
  rejectDocument(documentId: string, reason: string): DocumentMaster {
    if (!reason || !reason.trim()) {
      throw new Error('A formal rejection reason is mandatory.');
    }

    const docs = this.getDocuments();
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

    this.setDocuments(docs);

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
