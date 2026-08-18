import { DocumentShare } from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { documentAuditService } from './documentAuditService';

const SHARES_STORAGE_KEY = 'workforce_document_shares_v2';

class DocumentSharingService {
  private getStore(): DocumentShare[] {
    try {
      const data = localStorage.getItem(SHARES_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setStore(shares: DocumentShare[]): void {
    try {
      localStorage.setItem(SHARES_STORAGE_KEY, JSON.stringify(shares));
    } catch (e) {
      console.warn('[DocumentSharingService] Failed to persist shares:', e);
    }
  }

  // Create a time-bounded scoped document share
  createShare(params: {
    documentId: string;
    sharedWithEmail: string;
    sharedWithUserId?: string;
    canView?: boolean;
    canDownload?: boolean;
    canPrint?: boolean;
    canVerify?: boolean;
    durationHours?: number;
    maxAccessCount?: number;
    reason?: string;
  }): DocumentShare {
    const currentUser = api.getCurrentUser();
    const now = new Date();
    const durationMs = (params.durationHours || 48) * 60 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + durationMs).toISOString();
    const tokenHash = `tok_shr_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;

    const newShare: DocumentShare = {
      id: `dshr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      document_id: params.documentId,
      shared_by_id: currentUser.id || (currentUser as any).employee_id || 'user-admin-01',
      shared_by_name: currentUser.name || 'Dharun Joy',
      shared_with_email: params.sharedWithEmail,
      shared_with_user_id: params.sharedWithUserId,
      can_view: params.canView !== undefined ? params.canView : true,
      can_download: params.canDownload || false,
      can_print: params.canPrint || false,
      can_verify: params.canVerify || false,
      access_token_hash: tokenHash,
      expires_at: expiresAt,
      max_access_count: params.maxAccessCount || 10,
      access_count: 0,
      created_at: now.toISOString(),
    };

    const shares = this.getStore();
    shares.unshift(newShare);
    this.setStore(shares);

    documentAuditService.recordLog({
      documentId: params.documentId,
      action: 'SHARE',
      details: {
        sharedWith: params.sharedWithEmail,
        expiresAt,
        permissions: {
          canView: newShare.can_view,
          canDownload: newShare.can_download,
          canPrint: newShare.can_print,
        },
        reason: params.reason,
      },
    });

    hrEventBus.publish('share.created', {
      shareId: newShare.id,
      documentId: params.documentId,
      sharedWith: params.sharedWithEmail,
    });

    return newShare;
  }

  // Revoke an active share immediately
  revokeShare(shareId: string, reason?: string): DocumentShare {
    const shares = this.getStore();
    const idx = shares.findIndex(s => s.id === shareId);
    if (idx === -1) throw new Error('Share link not found.');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();

    shares[idx].revoked_at = now;
    shares[idx].revoked_by = currentUser.name || 'Admin';
    this.setStore(shares);

    const share = shares[idx];
    documentAuditService.recordLog({
      documentId: share.document_id,
      action: 'UNSHARE',
      details: { shareId, revokedBy: share.revoked_by, reason },
    });

    hrEventBus.publish('share.revoked', { shareId, documentId: share.document_id });

    return share;
  }

  getShares(documentId?: string): DocumentShare[] {
    const shares = this.getStore();
    const now = new Date().toISOString();

    return shares
      .map(s => ({
        ...s,
        isExpired: s.expires_at < now || !!s.revoked_at || s.access_count >= s.max_access_count,
      }))
      .filter(s => (documentId ? s.document_id === documentId : true));
  }
}

export const documentSharingService = new DocumentSharingService();
