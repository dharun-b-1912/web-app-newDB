// src/services/platform/platformUsageService.ts
// ============================================================
// WorkForceOS — Event-Driven Usage Metering & Quota Service
// ============================================================

import { UsageMeteringItem } from '../../types/platformAdmin';

const initialUsage: UsageMeteringItem[] = [
  { tenant_id: 'org-acme-01', tenant_name: 'Acme Technologies Pvt Ltd', employees_used: 428, employees_limit: 500, storage_gb_used: 74, storage_gb_limit: 500, api_calls_used: 840000, api_calls_limit: 10000000, whatsapp_sent: 8420, whatsapp_limit: 50000, status: 'Healthy' },
  { tenant_id: 'org-tech-02', tenant_name: 'TechCorp Solutions Pvt Ltd', employees_used: 285, employees_limit: 300, storage_gb_used: 42, storage_gb_limit: 100, api_calls_used: 410000, api_calls_limit: 1500000, whatsapp_sent: 4100, whatsapp_limit: 10000, status: 'Warning' },
  { tenant_id: 'org-cyber-03', tenant_name: 'CyberSoft Global Tech Ltd', employees_used: 85, employees_limit: 120, storage_gb_used: 18, storage_gb_limit: 50, api_calls_used: 120000, api_calls_limit: 500000, whatsapp_sent: 1150, whatsapp_limit: 5000, status: 'Healthy' },
  { tenant_id: 'org-zenith-04', tenant_name: 'Zenith Logistics & Supply Chain', employees_used: 650, employees_limit: 800, storage_gb_used: 145, storage_gb_limit: 500, api_calls_used: 920000, api_calls_limit: 10000000, whatsapp_sent: 12400, whatsapp_limit: 50000, status: 'Healthy' },
  { tenant_id: 'org-innovate-05', tenant_name: 'Innovate Labs Pvt Ltd', employees_used: 45, employees_limit: 50, storage_gb_used: 8, storage_gb_limit: 20, api_calls_used: 85000, api_calls_limit: 100000, whatsapp_sent: 890, whatsapp_limit: 1000, status: 'Near Limit' },
  { tenant_id: 'org-apex-06', tenant_name: 'Apex Financial Services Ltd', employees_used: 920, employees_limit: 1000, storage_gb_used: 310, storage_gb_limit: 500, api_calls_used: 2400000, api_calls_limit: 10000000, whatsapp_sent: 24500, whatsapp_limit: 50000, status: 'Healthy' },
];

export const platformUsageService = {
  getUsage(): UsageMeteringItem[] {
    return initialUsage;
  },

  getTenantUsage(tenantId: string): UsageMeteringItem | undefined {
    return initialUsage.find(u => u.tenant_id === tenantId);
  },
};
