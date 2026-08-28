// src/services/platform/platformApiKeyService.ts
// ============================================================
// Joy PeopleHR — REST API Key Management Service
// ============================================================

import { PlatformApiKey } from '../../types/platformAdmin';
import { platformAuditService } from './platformAuditService';

const initialKeys: PlatformApiKey[] = [
  { id: 'key-01', name: 'SAP Enterprise Integration Master Key', key_prefix: 'wfos_live_99a8', scopes: ['organizations.read', 'employees.read', 'payroll.read', 'attendance.write'], rate_limit_per_min: 500, created_by: 'Super Admin', created_at: '2026-01-15', last_used_at: '2 mins ago', status: 'Active' },
  { id: 'key-02', name: 'ZK Teco Biometric Hardware Sync Service', key_prefix: 'wfos_live_4b2c', scopes: ['attendance.write', 'devices.sync'], rate_limit_per_min: 1000, created_by: 'Super Admin', created_at: '2026-02-01', last_used_at: 'Just now', status: 'Active' },
  { id: 'key-03', name: 'Staging Environment Test Automation', key_prefix: 'wfos_test_7f11', scopes: ['*'], rate_limit_per_min: 100, created_by: 'QA Lead', created_at: '2026-06-10', last_used_at: '3 days ago', status: 'Active', expires_at: '2026-12-31' },
];

export const platformApiKeyService = {
  getKeys(): PlatformApiKey[] {
    return initialKeys;
  },

  async createApiKey(data: { name: string; scopes: string[]; rate_limit_per_min: number; expires_in_days?: number }): Promise<{ key: PlatformApiKey; rawSecret: string }> {
    const rawSecret = `wfos_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const prefix = rawSecret.substring(0, 14);

    const newKey: PlatformApiKey = {
      id: `key-${Date.now().toString(36)}`,
      name: data.name,
      key_prefix: prefix,
      scopes: data.scopes,
      rate_limit_per_min: data.rate_limit_per_min,
      created_by: 'Super Admin',
      created_at: new Date().toISOString().split('T')[0],
      expires_at: data.expires_in_days ? new Date(Date.now() + data.expires_in_days * 86400000).toISOString().split('T')[0] : undefined,
      status: 'Active',
    };

    initialKeys.unshift(newKey);

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'API_KEY_CREATED',
      resource_type: 'ApiKey',
      resource_id: newKey.id,
      severity: 'High',
      reason: `Generated API key "${data.name}" with scopes: ${data.scopes.join(', ')}`,
    });

    return { key: newKey, rawSecret };
  },

  async revokeApiKey(id: string, reason?: string): Promise<PlatformApiKey> {
    const target = initialKeys.find(k => k.id === id);
    if (!target) throw new Error('API key not found');

    target.status = 'Revoked';

    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'WorkForce Super Admin',
      actor_role: 'Super Admin',
      action: 'API_KEY_REVOKED',
      resource_type: 'ApiKey',
      resource_id: id,
      severity: 'Critical',
      reason: reason || `Revoked API key: ${target.name} (${target.key_prefix}...)`,
    });

    return target;
  },
};
