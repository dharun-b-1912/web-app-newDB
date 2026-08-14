// src/services/platform/index.ts
// ============================================================
// WorkForceOS — Platform Control Plane 2.0 Unified Service Layer
// ============================================================

export * from './platformAuditService';
export * from './platformHealthService';
export * from './platformTenantService';
export * from './platformProvisioningService';
export * from './platformSubscriptionService';
export * from './platformBillingService';
export * from './platformUsageService';
export * from './platformFeatureFlagService';
export * from './platformSecurityService';
export * from './platformImpersonationService';
export * from './platformIncidentService';
export * from './platformJobService';
export * from './platformWebhookService';
export * from './platformApiKeyService';
export * from './platformAnalyticsService';

import { platformHealthService } from './platformHealthService';
import { platformTenantService } from './platformTenantService';
import { platformProvisioningService } from './platformProvisioningService';
import { platformSubscriptionService } from './platformSubscriptionService';
import { platformBillingService } from './platformBillingService';
import { platformUsageService } from './platformUsageService';
import { platformFeatureFlagService } from './platformFeatureFlagService';
import { platformSecurityService } from './platformSecurityService';
import { platformImpersonationService } from './platformImpersonationService';
import { platformIncidentService } from './platformIncidentService';
import { platformJobService } from './platformJobService';
import { platformWebhookService } from './platformWebhookService';
import { platformApiKeyService } from './platformApiKeyService';
import { platformAuditService } from './platformAuditService';
import { platformAnalyticsService } from './platformAnalyticsService';
import { PlatformAnnouncementItem } from '../../types/platformAdmin';

const initialAnnouncements: PlatformAnnouncementItem[] = [
  { id: 'ann-101', title: 'WorkForceOS v5.0 Infrastructure Upgrade Notice', type: 'Maintenance', target_plans: ['All'], target_audience: 'All Customer Admins', publish_date: '2026-08-10', status: 'Published' },
  { id: 'ann-102', title: 'New AI Copilot Policy Resolver Feature Released', type: 'Product Launch', target_plans: ['Business', 'Enterprise'], target_audience: 'HR Heads & Admins', publish_date: '2026-08-08', status: 'Published' },
];

/**
 * Backward-compatible facade for legacy components
 */
export const platformAdminApi = {
  getDashboardMetrics: () => platformHealthService.getDashboardMetrics(),
  getSystemHealth: () => platformHealthService.getSystemHealth(),
  getTenants: () => platformTenantService.getTenants(),
  createTenant: (t: any) => platformTenantService.createTenant(t),
  updateTenantStatus: (id: string, s: any) => platformTenantService.updateTenantStatus(id, s),
  getProvisioningRuns: () => platformProvisioningService.getProvisioningRuns(),
  getSubscriptions: () => platformSubscriptionService.getSubscriptions(),
  getPlans: () => platformSubscriptionService.getPlans(),
  getFeatureFlags: () => platformFeatureFlagService.getFeatureFlags(),
  toggleFeatureFlag: (key: string) => platformFeatureFlagService.toggleFeatureFlag(key),
  getInvoices: () => platformBillingService.getInvoices(),
  getUsage: () => platformUsageService.getUsage(),
  getSessions: () => platformSecurityService.getSessions(),
  revokeSession: (id: string) => platformSecurityService.revokeSession(id),
  getSupportRequests: () => platformImpersonationService.getSupportRequests(),
  getAnnouncements: () => initialAnnouncements,
  getIncidents: () => platformIncidentService.getIncidents(),
  getActiveIncidents: () => platformIncidentService.getActiveIncidents(),
  getJobs: () => platformJobService.getJobs(),
  getEndpoints: () => platformWebhookService.getEndpoints(),
  getDeliveries: () => platformWebhookService.getDeliveries(),
  getApiKeys: () => platformApiKeyService.getKeys(),
  getAuditEvents: (limit?: number) => platformAuditService.getAuditEvents(limit),
  getMrrTrends: () => platformAnalyticsService.getMrrTrends(),
  getPlanDistribution: () => platformAnalyticsService.getPlanDistribution(),
  getCohortRetention: () => platformAnalyticsService.getCohortRetention(),
};
