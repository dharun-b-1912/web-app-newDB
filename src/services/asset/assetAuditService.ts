import { AssetAuditLog } from '../../types';
import { api } from '../api';

const ASSET_AUDIT_KEY = 'workforce_asset_audit_logs_v1';

class AssetAuditService {
  private getStore(): AssetAuditLog[] {
    try {
      const data = localStorage.getItem(ASSET_AUDIT_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setStore(logs: AssetAuditLog[]): void {
    try {
      localStorage.setItem(ASSET_AUDIT_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('[AssetAuditService] Failed to persist audit log:', e);
    }
  }

  recordLog(params: {
    assetId?: string;
    action: string;
    details?: Record<string, any>;
  }): AssetAuditLog {
    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();

    const logEntry: AssetAuditLog = {
      id: `ast-aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: currentUser.organization_id || 'org-joy-01',
      asset_id: params.assetId,
      actor_id: currentUser.id || (currentUser as any).employee_id || 'user-admin-01',
      actor_name: currentUser.name || 'Dharun Joy',
      action: params.action,
      details: params.details,
      created_at: now,
    };

    const logs = this.getStore();
    logs.unshift(logEntry);
    this.setStore(logs);

    return logEntry;
  }

  getLogs(assetId?: string, limit: number = 100): AssetAuditLog[] {
    const logs = this.getStore();
    if (assetId) {
      return logs.filter(l => l.asset_id === assetId).slice(0, limit);
    }
    return logs.slice(0, limit);
  }
}

export const assetAuditService = new AssetAuditService();
