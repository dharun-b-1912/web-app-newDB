
import { DocumentAuditLog, DocumentSubjectType } from '../../types';
import { api } from '../api';

const AUDIT_STORAGE_KEY = 'workforce_document_audit_logs_v2';

class DocumentAuditService {
  private getStore(): DocumentAuditLog[] {
    try {
      const data = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setStore(logs: DocumentAuditLog[]): void {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('[DocumentAuditService] Failed to persist audit log:', e);
    }
  }

  // Record an immutable document action log
  recordLog(params: {
    documentId?: string;
    action: DocumentAuditLog['action'];
    subjectType?: DocumentSubjectType;
    subjectId?: string;
    details?: Record<string, any>;
  }): DocumentAuditLog {
    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();

    const logEntry: DocumentAuditLog = {
      id: `daud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: currentUser.organization_id || 'org-joy-01',
      document_id: params.documentId,
      actor_id: currentUser.id || currentUser.employee_id || 'user-admin-01',
      actor_name: currentUser.name || 'Dharun Joy',
      actor_role: currentUser.roles?.[0]?.name || 'HR_HEAD',
      action: params.action,
      subject_type: params.subjectType,
      subject_id: params.subjectId,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Joy PeopleHR Node Client',
      details: params.details,
      created_at: now,
    };

    const logs = this.getStore();
    logs.unshift(logEntry);
    this.setStore(logs);

    return logEntry;
  }

  getLogs(documentId?: string, limit: number = 100): DocumentAuditLog[] {
    const logs = this.getStore();
    if (documentId) {
      return logs.filter(l => l.document_id === documentId).slice(0, limit);
    }
    return logs.slice(0, limit);
  }
}

export const documentAuditService = new DocumentAuditService();
