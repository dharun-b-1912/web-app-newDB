// src/services/platform/platformUsageService.ts
// ============================================================
// WorkForceOS — Dynamic Usage Metering & Quota Enforcement Service
// ============================================================

import { platformTenantService } from './platformTenantService';
import { UsageMeteringItem } from '../../types/platformAdmin';

export const platformUsageService = {
  getUsage(): UsageMeteringItem[] {
    const orgs = platformTenantService.getOrganizations().items;
    return orgs.map((o) => {
      const seatsLimit = o.seat_limit || (o.plan === 'Enterprise' ? 5000 : o.plan === 'Business' ? 1000 : o.plan === 'Professional' ? 300 : 50);
      const seatsUsed = o.active_employees || 1;
      const storageLimit = o.storage_quota_gb || (o.plan === 'Enterprise' ? 1000 : o.plan === 'Business' ? 500 : 100);
      const storageUsed = o.storage_used_gb || Math.min(storageLimit, Math.round(seatsUsed * 0.4));
      const apiLimit = o.plan === 'Enterprise' ? 10000000 : 1000000;
      const apiUsed = o.api_calls_this_month || Math.round(seatsUsed * 200);

      const empPct = (seatsUsed / seatsLimit) * 100;
      const status = empPct >= 100 ? 'Warning' : empPct >= 80 ? 'Near Limit' : 'Healthy';

      return {
        tenant_id: o.id,
        tenant_name: o.display_name || o.legal_name || o.id,
        employees_used: seatsUsed,
        employees_limit: seatsLimit,
        storage_gb_used: storageUsed,
        storage_gb_limit: storageLimit,
        api_calls_used: apiUsed,
        api_calls_limit: apiLimit,
        whatsapp_sent: Math.round(seatsUsed * 5),
        whatsapp_limit: 10000,
        status: status as any,
      };
    });
  },

  getTenantUsage(tenantId: string): UsageMeteringItem | undefined {
    return this.getUsage().find(u => u.tenant_id === tenantId);
  },
};
