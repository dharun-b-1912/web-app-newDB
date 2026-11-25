import { AssetAuditLog } from '../../types';
import { api } from '../api';

function getTargetOrg(): string {
  const activeComp = typeof api !== 'undefined' && api.getActiveCompany ? api.getActiveCompany() : null;
  if (activeComp?.organization_id) return activeComp.organization_id;
  try {
    const user = api.getCurrentUser?.();
    if (user?.organization_id) return user.organization_id;
  } catch (_) {}
  return 'default';
}

class AssetAuditService {
  private getStore(): AssetAuditLog[] {
    try {
      const key = `workforce_asset_audit_logs_${getTargetOrg()}_v1`;
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setStore(logs: AssetAuditLog[]): void {
    try {
      const key = `workforce_asset_audit_logs_${getTargetOrg()}_v1`;
      localStorage.setItem(key, JSON.stringify(logs));
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
