// src/services/platform/platformHealthService.ts
// ============================================================
// Joy PeopleHR — Platform Health & Observability Service (Dynamic Realtime)
// ============================================================

import { SystemHealthStatus, SubsystemTelemetry, PlatformDashboardMetrics } from '../../types/platformAdmin';
import { platformTenantService } from './platformTenantService';
import { platformIncidentService } from './platformIncidentService';
import { platformJobService } from './platformJobService';
import { platformSubscriptionService } from './platformSubscriptionService';

const initialSubsystems: SubsystemTelemetry[] = [
  { key: 'api_gateway', name: 'API Gateway', category: 'Infrastructure', status: 'Operational', uptimePct: 99.99, latencyMs: 24, errorRatePct: 0.01, lastChecked: '1 min ago', description: 'Kong API ingress & rate limiting proxy' },
  { key: 'database', name: 'Database Cluster', category: 'Infrastructure', status: 'Operational', uptimePct: 99.98, latencyMs: 14, errorRatePct: 0.00, lastChecked: 'Just now', description: 'PostgreSQL 16 Multi-AZ Primary + Read Replica' },
  { key: 'auth', name: 'Authentication Engine', category: 'Core', status: 'Operational', uptimePct: 99.99, latencyMs: 18, errorRatePct: 0.02, lastChecked: 'Just now', description: 'Supabase Auth, JWT validation & Session tokens' },
  { key: 'storage', name: 'Cloud Document Vault', category: 'Infrastructure', status: 'Operational', uptimePct: 100.0, latencyMs: 38, errorRatePct: 0.00, lastChecked: '2 mins ago', description: 'Encrypted S3 object storage with CDN cache' },
  { key: 'realtime', name: 'Realtime WebSocket Mesh', category: 'Infrastructure', status: 'Operational', uptimePct: 99.95, latencyMs: 12, errorRatePct: 0.03, lastChecked: 'Just now', description: 'Presence channels, live chat & push notifications' },
  { key: 'email', name: 'Email Dispatch Gateway', category: 'Communication', status: 'Operational', uptimePct: 99.91, latencyMs: 95, errorRatePct: 0.08, lastChecked: '3 mins ago', description: 'SendGrid transactional email with DKIM/SPF' },
  { key: 'whatsapp', name: 'WhatsApp Business API', category: 'Communication', status: 'Operational', uptimePct: 99.85, latencyMs: 140, errorRatePct: 0.12, lastChecked: '1 min ago', description: 'Meta Cloud API payslip & leave approval bot' },
  { key: 'payments', name: 'Billing & Payments Gateway', category: 'Integration', status: 'Operational', uptimePct: 99.99, latencyMs: 110, errorRatePct: 0.01, lastChecked: 'Just now', description: 'Razorpay / Stripe recurring subscription webhooks' },
  { key: 'background_jobs', name: 'Background Worker Queue', category: 'Core', status: 'Operational', uptimePct: 99.94, latencyMs: 32, errorRatePct: 0.05, lastChecked: 'Just now', description: 'Redis BullMQ distributed workers for accruals & payroll' },
  { key: 'webhooks', name: 'Outbound Webhook Mesh', category: 'Integration', status: 'Operational', uptimePct: 99.88, latencyMs: 78, errorRatePct: 0.14, lastChecked: '4 mins ago', description: 'HMAC-SHA256 signed event delivery engine' },
  { key: 'search', name: 'Global Command Search Index', category: 'Core', status: 'Operational', uptimePct: 99.99, latencyMs: 8, errorRatePct: 0.00, lastChecked: 'Just now', description: 'In-memory inverted index for Ctrl+K command palette' },
  { key: 'analytics', name: 'SaaS Business BI Aggregator', category: 'Core', status: 'Operational', uptimePct: 99.92, latencyMs: 65, errorRatePct: 0.02, lastChecked: '5 mins ago', description: 'Materialized view rollup engine for MRR and Cohorts' },
];

export const platformHealthService = {
  getSystemHealth(): SystemHealthStatus {
    const degradedCount = initialSubsystems.filter(s => s.status === 'Degraded').length;
    const outageCount = initialSubsystems.filter(s => s.status === 'Outage').length;

    return {
      api: initialSubsystems.find(s => s.key === 'api_gateway')?.status || 'Operational',
      database: initialSubsystems.find(s => s.key === 'database')?.status || 'Operational',
      authentication: initialSubsystems.find(s => s.key === 'auth')?.status || 'Operational',
      storage: initialSubsystems.find(s => s.key === 'storage')?.status || 'Operational',
      realtime: initialSubsystems.find(s => s.key === 'realtime')?.status || 'Operational',
      email: initialSubsystems.find(s => s.key === 'email')?.status || 'Operational',
      whatsapp: initialSubsystems.find(s => s.key === 'whatsapp')?.status || 'Operational',
      payments: initialSubsystems.find(s => s.key === 'payments')?.status || 'Operational',
      backgroundJobs: initialSubsystems.find(s => s.key === 'background_jobs')?.status || 'Operational',
      webhooks: initialSubsystems.find(s => s.key === 'webhooks')?.status || 'Operational',
      search: initialSubsystems.find(s => s.key === 'search')?.status || 'Operational',
      analytics: initialSubsystems.find(s => s.key === 'analytics')?.status || 'Operational',
      overallUptimePercent: outageCount > 0 ? 94.5 : degradedCount > 0 ? 98.8 : 99.98,
      subsystems: initialSubsystems,
    };
  },

  getDashboardMetrics(): PlatformDashboardMetrics {
    const orgs = platformTenantService.getOrganizations().items;
    const activeIncidents = platformIncidentService.getActiveIncidents();
    const jobs = platformJobService.getJobs();
    const failedJobs = jobs.filter(j => j.status === 'Failed');

    const totalOrganizations = orgs.length;
    const activeOrganizations = orgs.filter(o => o.status === 'Active').length;
    const trialOrganizations = orgs.filter(o => o.status === 'Trial').length;
    const suspendedOrganizations = orgs.filter(o => o.status === 'Suspended').length;
    const atRiskOrganizations = orgs.filter(o => o.health_grade === 'At Risk' || o.health_grade === 'Critical').length;
    const totalUsers = orgs.reduce((sum, o) => sum + (o.total_employees || 0), 0);
    const activeUsers = orgs.reduce((sum, o) => sum + (o.active_employees || 0), 0);
    const mrr = orgs.reduce((sum, o) => sum + (o.mrr || 0), 0);
    const arr = mrr * 12;
    const avgHealth = orgs.length > 0 ? Number((orgs.reduce((sum, o) => sum + o.health_score, 0) / orgs.length).toFixed(1)) : 100;

    return {
      totalOrganizations,
      activeOrganizations,
      trialOrganizations,
      suspendedOrganizations,
      atRiskOrganizations,
      totalUsers,
      activeUsers,
      mrr,
      arr,
      mrrGrowthPct: 0,
      netRevenue: mrr,
      outstandingPayments: orgs.filter(o => o.billing_status === 'Past Due').reduce((sum, o) => sum + o.mrr, 0),
      churnRate: 0,
      netRetentionRate: 100,
      customerHealthScore: avgHealth,
      platformUptimePct: 99.99,
      activeIncidentsCount: activeIncidents.length,
      failedJobsCount: failedJobs.length,
    };
  },

  updateSubsystemStatus(key: string, status: SubsystemTelemetry['status']): void {
    const target = initialSubsystems.find(s => s.key === key);
    if (target) {
      target.status = status;
    }
  },
};
