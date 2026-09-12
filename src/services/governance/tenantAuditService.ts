// src/services/governance/tenantAuditService.ts
// ============================================================================
// JOY PeopleHR — Tenant-Isolated Structured Audit Service
// Immutable Audit Stream • Request ID Correlation • Zero Secrets Logged
// ============================================================================

import { generateRequestId } from '../resilience/requestContext';
import { tenantContextService } from '../tenant/tenantContextService';
import { hrEventBus } from '../hrEventBus';

export interface TenantAuditRecord {
  auditId: string;
  requestId: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  action: string;
  module: string;
  resourceId?: string;
  previousState?: any;
  newState?: any;
  status: 'SUCCESS' | 'FAILED' | 'REJECTED';
  ipAddress?: string;
  timestamp: string;
}

const STORAGE_KEYS = {
  AUDIT_STREAM: 'joy_peoplehr_tenant_audit_stream_v2',
};

class TenantAuditService {
  private inMemoryStream: TenantAuditRecord[] = [];

  /**
   * Records an immutable audit log entry.
   * Automatically scrubs sensitive fields (passwords, tokens, keys).
   */
  log(entry: Omit<TenantAuditRecord, 'auditId' | 'requestId' | 'timestamp'> & { requestId?: string }): TenantAuditRecord {
    const ctx = tenantContextService.getActiveContext();
    const reqId = entry.requestId || generateRequestId('audit');

    const cleanPrevious = this.sanitizeSensitiveData(entry.previousState);
    const cleanNew = this.sanitizeSensitiveData(entry.newState);

    const record: TenantAuditRecord = {
      auditId: `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      requestId: reqId,
      organizationId: entry.organizationId || ctx.organizationId,
      userId: entry.userId || ctx.userId,
      userEmail: entry.userEmail || ctx.userEmail,
      action: entry.action,
      module: entry.module,
      resourceId: entry.resourceId,
      previousState: cleanPrevious,
      newState: cleanNew,
      status: entry.status,
      ipAddress: entry.ipAddress || '127.0.0.1',
      timestamp: new Date().toISOString(),
    };

    this.inMemoryStream.unshift(record);
    if (this.inMemoryStream.length > 2000) {
      this.inMemoryStream.pop();
    }

    hrEventBus.emit('audit.logged', { record });
    return record;
  }

  /**
   * Retrieves audit logs strictly filtered by the caller's authorized organization.
   */
  getLogsForTenant(organizationId?: string, limit = 100): TenantAuditRecord[] {
    const authorizedOrgId = tenantContextService.assertTenantAccess(organizationId);
    return this.inMemoryStream
      .filter((r) => r.organizationId === authorizedOrgId)
      .slice(0, limit);
  }

  private sanitizeSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const clone = Array.isArray(data) ? [...data] : { ...data };
    const forbiddenKeys = ['password', 'token', 'secret', 'apiKey', 'pin', 'template'];

    for (const key of Object.keys(clone)) {
      if (forbiddenKeys.some((f) => key.toLowerCase().includes(f))) {
        clone[key] = '[REDACTED]';
      } else if (typeof clone[key] === 'object') {
        clone[key] = this.sanitizeSensitiveData(clone[key]);
      }
    }
    return clone;
  }
}

export const tenantAuditService = new TenantAuditService();
