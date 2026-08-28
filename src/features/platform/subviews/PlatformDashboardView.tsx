// src/features/platform/subviews/PlatformDashboardView.tsx
// ============================================================
// Joy PeopleHR — Platform Control Center 2.0 (Master Command Cockpit)
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  CircleDollarSign,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  Search,
  Server,
  Database,
  Cpu,
  Wifi,
  Mail,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  Lock,
  Layers,
  ArrowRight,
  Radio,
  RefreshCw,
  Sliders,
  Globe,
  HardDrive,
  BarChart3,
  FileText,
  Workflow,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  platformHealthService,
  platformIncidentService,
  platformCustomerHealthService,
  platformSubscriptionService,
  platformBillingService,
  platformJobService,
  platformAuditService,
  usePlatformRealtime,
} from '../../../services/platform';
import { SubsystemTelemetry } from '../../../types/platformAdmin';
import { SubsystemHealthDrawer } from '../components/SubsystemHealthDrawer';
import { CommandPaletteModal } from '../components/CommandPaletteModal';
import { WorkForceCopilotDrawer } from '../components/WorkForceCopilotDrawer';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export interface PlatformDashboardViewProps {
  onNavigateTab: (tab: string, payload?: { tenantId?: string; presetFilter?: string; search?: string }) => void;
}

export const PlatformDashboardView: React.FC<PlatformDashboardViewProps> = ({
  onNavigateTab,
}) => {
  // Realtime hook with automatic live stream update
  usePlatformRealtime(undefined, () => {
    platformAuditService.getAuditEvents(20).then((res) => setAuditEvents(res));
  });

  // State
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemTelemetry | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [isActivityPaused, setIsActivityPaused] = useState(false);

  // Live Services Telemetry
  const metrics = platformHealthService.getDashboardMetrics();
  const health = platformHealthService.getSystemHealth();
  const operationalStatus = platformIncidentService.getPlatformOperationalStatus();
  const activeIncidents = platformIncidentService.getActiveIncidents();
  const portfolioHealth = platformCustomerHealthService.getPortfolioMetrics();
  const priorityAccounts = platformCustomerHealthService
    .getTenantsHealth()
    .filter((t) => t.health_grade === 'At Risk' || t.health_grade === 'Critical')
    .slice(0, 3);
  const subMetrics = platformSubscriptionService.getMetrics();

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  const [auditEvents, setAuditEvents] = useState<any[]>([]);

  React.useEffect(() => {
    platformAuditService.getAuditEvents(20).then((res) => setAuditEvents(res));
  }, []);

  // Dynamic Operational Attention Items (Computed from Realtime Telemetry)
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      priority: string;
      category: string;
      title: string;
      description: string;
      impact: string;
      actionLabel: string;
      actionTab: string;
      payload?: any;
      badgeClass: string;
    }> = [];

    // 1. Active incidents
    activeIncidents.forEach((inc) => {
      items.push({
        id: `inc-${inc.id}`,
        priority: inc.severity.includes('SEV-1') || inc.severity.includes('SEV-2') ? 'HIGH' : 'MEDIUM',
        category: 'Platform',
        title: `${inc.severity} Incident: ${inc.title}`,
        description: inc.description,
        impact: `${inc.affected_tenants_count || 0} tenants affected • ${inc.status}`,
        actionLabel: 'Open Incident',
        actionTab: 'platform-incidents',
        badgeClass: 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]',
      });
    });

    // 2. Overdue Invoices
    const overdueInvoices = platformBillingService.getInvoices().filter((i) => i.status === 'Overdue');
    overdueInvoices.forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        priority: 'HIGH',
        category: 'Billing',
        title: `Overdue Invoice: ${inv.tenant_name}`,
        description: `Invoice #${inv.invoice_number} (₹${inv.total?.toLocaleString()}) is past due date ${inv.due_date}.`,
        impact: `₹${inv.total?.toLocaleString()} at risk • ${inv.status}`,
        actionLabel: 'Resolve Billing',
        actionTab: 'platform-billing',
        payload: { presetFilter: 'overdue' },
        badgeClass: 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]',
      });
    });

    // 3. At-risk / Critical Accounts
    priorityAccounts.forEach((t) => {
      items.push({
        id: `risk-${t.tenant_id}`,
        priority: t.health_grade === 'Critical' ? 'HIGH' : 'MEDIUM',
        category: 'Retention',
        title: `${t.tenant_name} (${t.health_grade})`,
        description: t.primary_risk || 'Health score dropped below threshold',
        impact: `${t.health_score}/100 Health • ${t.mrr_formatted} MRR`,
        actionLabel: 'Intervene',
        actionTab: 'platform-tenant-health',
        payload: { tenantId: t.tenant_id },
        badgeClass: t.health_grade === 'Critical' ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]' : 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]',
      });
    });

    // 4. Failed background jobs
    const failedJobs = platformJobService.getJobs().filter((j) => j.status === 'Failed');
    failedJobs.forEach((job) => {
      items.push({
        id: `job-${job.id}`,
        priority: 'MEDIUM',
        category: 'Background Job',
        title: `Job Failed: ${job.name}`,
        description: job.error_message || 'Execution error during scheduled worker run.',
        impact: `Attempt ${job.attempt_count}/${job.max_attempts} • ${job.status}`,
        actionLabel: 'View Queue',
        actionTab: 'platform-jobs',
        badgeClass: 'bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]',
      });
    });

    return items;
  }, [activeIncidents, priorityAccounts]);

  // Live Activity Events (Streamed from Audit Log & Telemetry)
  const liveEvents = useMemo(() => {
    return auditEvents.map((a) => ({
      id: a.id,
      category: a.resource_type || 'Operations',
      text: `${a.actor_name}: ${a.action.replace(/_/g, ' ')}`,
      detail: a.reason || `${a.resource_type} ${a.resource_id}`,
      time: a.time_ago || 'Recently',
      tab: a.resource_type === 'Tenant' ? 'platform-tenants' : a.resource_type === 'Incident' ? 'platform-incidents' : 'platform-audit',
    }));
  }, [auditEvents]);

  const filteredEvents = useMemo(() => {
    if (activityFilter === 'all') return liveEvents;
    return liveEvents.filter((e) => e.category.toLowerCase() === activityFilter.toLowerCase());
  }, [activityFilter, liveEvents]);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Subsystem Health Inspector Drawer */}
      <SubsystemHealthDrawer
        subsystem={selectedSubsystem}
        onClose={() => setSelectedSubsystem(null)}
      />

      {/* Global Command Palette Modal (Ctrl + K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => onNavigateTab(tab)}
      />

      {/* Joy PeopleHR Copilot Assistant Drawer */}
      <WorkForceCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onNavigateTab={(tab) => onNavigateTab(tab)}
      />

      {/* ============================================================
          1. HEADER & GLOBAL TELEMETRY BAR
         ============================================================ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="text-xs font-semibold text-[#047857] flex items-center gap-1.5 mb-1">
            <span>Platform Admin</span>
            <ChevronRight className="h-3 w-3 text-[#94A3B8]" />
            <span>Control Center</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Platform Control Center</h1>

            <div className="flex items-center gap-1.5 font-sans">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.03em] bg-[#ECFDF5] text-[#047857] border border-[#15845B]/30">
                ● PRODUCTION
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
                ap-south-1 (Mumbai Primary)
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#047857] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#047857]"></span>
                </span>
                Realtime Active
              </span>
            </div>
          </div>

          <p className="text-[13.5px] text-[#64748B] mt-1">
            Monitor platform health, customer operations, revenue, and infrastructure from one unified command center.
          </p>
        </div>

        {/* Top-Right Quick Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCopilotOpen(true)}
            className="text-[#047857] hover:bg-[#ECFDF5] border-[#A7F3D0] text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#047857]" />
            Joy PeopleHR Copilot
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="text-xs font-semibold border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Search className="w-3.5 h-3.5 mr-1.5 text-[#94A3B8]" />
            Search Command
            <kbd className="ml-1.5 px-1.5 py-0.5 rounded-[4px] bg-[#F1F5F9] border border-[#CBD5E1] text-[10px] font-mono text-[#64748B]">
              Ctrl+K
            </kbd>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab('platform-incidents')}
            className={cn(
              'text-xs font-semibold',
              activeIncidents.length > 0
                ? 'text-[#C2410C] border-[#FFEDD5] bg-[#FFF7ED] hover:bg-[#FFEDD5]'
                : 'text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]'
            )}
          >
            <Flame className={cn('w-3.5 h-3.5 mr-1', activeIncidents.length > 0 ? 'text-[#C2410C]' : 'text-[#94A3B8]')} />
            Incidents ({activeIncidents.length})
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigateTab('platform-tenants')}
            className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Provision Organization
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ============================================================
          2. DYNAMIC GLOBAL PLATFORM STATUS BANNER
         ============================================================ */}
      <div
        className={cn(
          'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs transition-all',
          operationalStatus.statusTone === 'healthy'
            ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
            : operationalStatus.statusTone === 'warning'
              ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]'
              : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
        )}
      >
        <div className="flex items-center gap-3">
          {operationalStatus.statusTone === 'healthy' ? (
            <CheckCircle2 className="h-6 w-6 text-[#047857]" />
          ) : operationalStatus.statusTone === 'warning' ? (
            <AlertTriangle className="h-6 w-6 text-[#D97706] animate-pulse" />
          ) : (
            <Flame className="h-6 w-6 text-[#DC2626] animate-pulse" />
          )}

          <div>
            <strong className="text-sm font-bold block">
              {operationalStatus.statusText}
            </strong>
            <p className="text-xs opacity-90 mt-0.5">
              Uptime SLA: <strong>99.98%</strong> • {operationalStatus.degradedServicesCount} services degraded • {operationalStatus.activeIncidentsCount} active incident • {operationalStatus.tenantsImpactedCount} tenants impacted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeIncidents.length > 0 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateTab('platform-incidents')}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold shadow-xs"
            >
              <Flame className="h-3.5 w-3.5 mr-1" /> Open Incident Command
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('platform-tenant-health')}
              className="bg-white text-[#047857] border-[#A7F3D0] text-xs font-semibold"
            >
              View Platform Health →
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================
          3. CORE 6-KPI METRICS ROW (ACTIONABLE & CONNECTED)
         ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Organizations */}
        <div
          onClick={() => onNavigateTab('platform-tenants')}
          className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#047857] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>ORGANIZATIONS</span>
            <Building2 className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1 group-hover:text-[#047857] transition-colors">
            {metrics.totalOrganizations}
          </strong>
          <span className="text-[10px] text-[#047857] font-semibold block">↑ 12.4% vs last month</span>
          <span className="text-[10px] text-[#64748B] block mt-0.5">{metrics.activeOrganizations} Active · {metrics.trialOrganizations} Trial</span>
        </div>

        {/* KPI 2: MRR */}
        <div
          onClick={() => onNavigateTab('saas-revenue')}
          className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#047857] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>RECURRING REVENUE</span>
            <CircleDollarSign className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1 group-hover:text-[#047857] transition-colors">
            ₹{(metrics.mrr / 100000).toFixed(1)}L
          </strong>
          <span className="text-[10px] text-[#047857] font-semibold block">↑ 8.7% MoM</span>
          <span className="text-[10px] text-[#64748B] block mt-0.5">ARR: ₹{(metrics.arr / 10000000).toFixed(2)}Cr</span>
        </div>

        {/* KPI 3: Active Users */}
        <div
          onClick={() => onNavigateTab('platform-usage')}
          className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#047857] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>ACTIVE PLATFORM USERS</span>
            <Users className="h-3.5 w-3.5 text-[#2563EB]" />
          </div>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1 group-hover:text-[#2563EB] transition-colors">
            {metrics.activeUsers.toLocaleString()}
          </strong>
          <span className="text-[10px] text-[#2563EB] font-semibold block">↑ 6.2% vs last week</span>
          <span className="text-[10px] text-[#64748B] block mt-0.5">90.1% DAU across tenants</span>
        </div>

        {/* KPI 4: Platform Health */}
        <div
          onClick={() => onNavigateTab('platform-tenant-health')}
          className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#047857] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>PLATFORM HEALTH</span>
            <Activity className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1 group-hover:text-[#047857] transition-colors">
            99.98%
          </strong>
          <span className="text-[10px] text-[#047857] font-semibold block">Healthy (94.2/100)</span>
          <span className="text-[10px] text-[#64748B] block mt-0.5">14 Tenants At Risk</span>
        </div>

        {/* KPI 5: Attention Required */}
        <div
          onClick={() => onNavigateTab('platform-incidents')}
          className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#D97706] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>ATTENTION REQUIRED</span>
            <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
          </div>
          <strong className="text-2xl font-bold text-[#D97706] block mt-1">
            {attentionItems.length}
          </strong>
          <span className="text-[10px] text-[#DC2626] font-semibold block">2 High · 3 Medium · 1 Low</span>
          <span className="text-[10px] text-[#64748B] block mt-0.5">Operational action items</span>
        </div>

        {/* KPI 6: Security Posture */}
        <div
          onClick={() => onNavigateTab('platform-security')}
          className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#047857] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#64748B] text-[11px] font-semibold">
            <span>SECURITY POSTURE</span>
            <ShieldCheck className="h-3.5 w-3.5 text-[#047857]" />
          </div>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1 group-hover:text-[#047857] transition-colors">
            98/100
          </strong>
          <span className="text-[10px] text-[#047857] font-semibold block">SOC-2 Type II Certified</span>
          <span className="text-[10px] text-[#64748B] block mt-0.5">0 Critical Vulnerabilities</span>
        </div>
      </div>

      {/* ============================================================
          4. MAIN 12-COLUMN OPERATIONAL GRID
             Left (8 Cols): CORE PLATFORM SERVICES
             Right (4 Cols): ATTENTION REQUIRED ACTION QUEUE
         ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT (8 COLS): CORE PLATFORM SERVICES */}
        <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#64748B]">
                  LIVE SUBSYSTEM MESH
                </span>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                  health.subsystems.filter(s => s.status !== 'Operational').length > 0
                    ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                    : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                )}>
                  {health.subsystems.filter(s => s.status !== 'Operational').length > 0
                    ? `${health.subsystems.filter(s => s.status !== 'Operational').length} Degraded · ${health.subsystems.filter(s => s.status === 'Operational').length} Operational`
                    : `All ${health.subsystems.length} Subsystems Operational`}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#0F172B] mt-0.5 tracking-tight">
                Core Platform Services
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSubsystem(health.subsystems[0])}
              className="text-xs font-semibold text-[#047857] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Inspect Diagnostics</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* 12 Live Services Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {health.subsystems.map((sub) => {
              const isSubDegraded = sub.status !== 'Operational';
              return (
                <div
                  key={sub.key}
                  onClick={() => setSelectedSubsystem(sub)}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-xs',
                    isSubDegraded
                      ? 'bg-[#FFFBEB] border-[#FDE68A] hover:border-[#F59E0B]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#047857]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-bold text-[#0F172B]">{sub.name}</strong>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.2 rounded-full font-bold',
                        isSubDegraded
                          ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                          : 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                      )}
                    >
                      ● {sub.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mt-3 pt-2 border-t border-[#E2E8F0]/60 text-[10px] text-[#64748B]">
                    <div>
                      <span className="block text-[#94A3B8]">Latency</span>
                      <strong className={cn('text-[11px] font-mono', isSubDegraded ? 'text-[#DC2626]' : 'text-[#0F172B]')}>
                        {sub.latencyMs}ms
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[#94A3B8]">Errors</span>
                      <strong className={cn('text-[11px] font-mono', sub.errorRatePct > 1 ? 'text-[#DC2626]' : 'text-[#0F172B]')}>
                        {sub.errorRatePct}%
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[#94A3B8]">Uptime</span>
                      <strong className="text-[11px] font-mono text-[#047857]">{sub.uptimePct}%</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Health Strip */}
          <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B] flex-wrap gap-2">
            <span className="font-semibold text-[#0F172B]">Cluster Summary:</span>
            <span>API Gateway: <strong className="font-mono text-[#047857]">99.99%</strong></span>
            <span>Database: <strong className="font-mono text-[#047857]">99.98%</strong></span>
            <span>Auth: <strong className="font-mono text-[#047857]">99.99%</strong></span>
            <span>Realtime Mesh: <strong className="font-mono text-[#D97706]">99.95%</strong></span>
            <span>Email Gateway: <strong className="font-mono text-[#047857]">99.91%</strong></span>
            <span>Webhooks: <strong className="font-mono text-[#047857]">99.97%</strong></span>
          </div>
        </div>

        {/* RIGHT (4 COLS): ATTENTION REQUIRED QUEUE */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#64748B]">
                  OPERATIONAL QUEUE
                </span>
                <h2 className="text-lg font-bold text-[#0F172B] mt-0.5 tracking-tight">
                  Attention Required
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                {attentionItems.length} Action Items
              </span>
            </div>

            {/* Prioritized Alert Cards */}
            <div className="space-y-2.5">
              {attentionItems.slice(0, 4).map((alt) => (
                <div key={alt.id} className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2 hover:bg-white transition-colors">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[10px] font-bold px-2 py-0.2 rounded border', alt.badgeClass)}>
                      {alt.priority} · {alt.category}
                    </span>
                    <span className="text-[10px] font-semibold text-[#64748B]">{alt.impact}</span>
                  </div>

                  <div>
                    <strong className="text-xs font-bold text-[#0F172B] block">{alt.title}</strong>
                    <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2">{alt.description}</p>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateTab(alt.actionTab, alt.payload)}
                      className="text-xs font-semibold text-[#047857] border-[#CBD5E1] hover:bg-[#ECFDF5]"
                    >
                      {alt.actionLabel} →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('platform-incidents')}
              className="w-full text-xs font-semibold text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]"
            >
              Review All Operational Alerts ({attentionItems.length})
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================
          5. TENANT SIGNALS & RISK + SAAS BUSINESS REVENUE SECTION
         ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TENANT OPERATIONS & CHURN RISK */}
        <div className="bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#64748B]">
                TENANT HEALTH & RETENTION
              </span>
              <h3 className="text-base font-bold text-[#0F172B] mt-0.5">
                Customer Health & At-Risk Accounts
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('platform-tenant-health')}
              className="text-xs font-semibold text-[#047857] hover:underline flex items-center gap-1"
            >
              <span>View Retention Cockpit</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Churn summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0]">
              <span className="text-[10px] text-[#065F46] font-semibold block">HEALTHY ACCOUNTS</span>
              <strong className="text-lg font-bold text-[#047857]">{portfolioHealth.healthyTenants} Tenants</strong>
              <span className="text-[10px] text-[#065F46] block">{portfolioHealth.healthyPct}% portfolio</span>
            </div>

            <div className="p-3 bg-[#FEF3C7] rounded-xl border border-[#FDE68A]">
              <span className="text-[10px] text-[#92400E] font-semibold block">AT-RISK / WATCH</span>
              <strong className="text-lg font-bold text-[#D97706]">{portfolioHealth.atRiskTenants} Accounts</strong>
              <span className="text-[10px] text-[#92400E] block">{portfolioHealth.atRiskTenants > 0 ? 'Requires action' : 'Nominal'}</span>
            </div>

            <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5]">
              <span className="text-[10px] text-[#991B1B] font-semibold block">CHURN EXPOSURE</span>
              <strong className="text-lg font-bold text-[#DC2626]">
                ₹{portfolioHealth.mrrAtRisk > 0 ? (portfolioHealth.mrrAtRisk / 100000).toFixed(1) + 'L' : '0'} MRR
              </strong>
              <span className="text-[10px] text-[#991B1B] block">At risk revenue</span>
            </div>
          </div>

          {/* Priority At-Risk Accounts list */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#64748B] block uppercase">Priority Accounts Requiring Intervention</span>
            {priorityAccounts.length > 0 ? (
              priorityAccounts.map((acc) => (
                <div
                  key={acc.tenant_id}
                  onClick={() => onNavigateTab('platform-tenant-health', { tenantId: acc.tenant_id })}
                  className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between hover:bg-white transition-colors cursor-pointer"
                >
                  <div>
                    <strong className="text-xs font-bold text-[#0F172B]">{acc.tenant_name}</strong>
                    <div className="text-[10px] text-[#64748B] mt-0.5">
                      Plan: <strong>{acc.plan}</strong> • MRR: <strong>{acc.mrr_formatted}</strong> • Risk: {acc.primary_risk}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                      ● {acc.health_score}/100
                    </span>
                    <span className="text-[10px] text-[#047857] font-semibold block mt-1">Intervene →</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center text-xs text-[#64748B]">
                ✓ All registered organizations are currently operating with nominal health scores.
              </div>
            )}
          </div>
        </div>

        {/* REVENUE & BILLING SIGNALS */}
        <div className="bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#64748B]">
                COMMERCIAL HEALTH
              </span>
              <h3 className="text-base font-bold text-[#0F172B] mt-0.5">
                Revenue & Subscription Signals
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('saas-revenue')}
              className="text-xs font-semibold text-[#047857] hover:underline flex items-center gap-1"
            >
              <span>Revenue Analytics</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#F8FAFC] rounded-xl border">
              <span className="text-[10px] text-[#64748B] font-semibold block">TOTAL MRR</span>
              <strong className="text-base font-bold text-[#047857]">
                ₹{metrics.mrr > 0 ? (metrics.mrr / 100000).toFixed(1) + 'L' : '0'}
              </strong>
              <span className="text-[10px] text-[#64748B] block">{metrics.activeOrganizations} active orgs</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border">
              <span className="text-[10px] text-[#64748B] font-semibold block">ACTIVE SEATS</span>
              <strong className="text-base font-bold text-[#2563EB]">{metrics.activeUsers}</strong>
              <span className="text-[10px] text-[#64748B] block">Licensed users</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border">
              <span className="text-[10px] text-[#64748B] font-semibold block">OVERDUE INVOICES</span>
              <strong className="text-base font-bold text-[#DC2626]">
                ₹{metrics.outstandingPayments > 0 ? (metrics.outstandingPayments / 100000).toFixed(1) + 'L' : '0'}
              </strong>
              <span className="text-[10px] text-[#DC2626] font-semibold block">
                {platformBillingService.getInvoices().filter(i => i.status === 'Overdue').length} overdue
              </span>
            </div>
          </div>

          {/* Commercial Action Shortcuts */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div
              onClick={() => onNavigateTab('platform-subscriptions')}
              className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] hover:border-[#047857] cursor-pointer transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <strong className="text-xs text-[#0F172B]">Subscriptions Lifecycle</strong>
                <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
              </div>
              <p className="text-[10px] text-[#64748B]">
                {subMetrics.active} active contracts · {subMetrics.renewing_soon} renewals soon
              </p>
            </div>

            <div
              onClick={() => onNavigateTab('platform-billing', { presetFilter: 'overdue' })}
              className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] hover:border-[#DC2626] cursor-pointer transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <strong className="text-xs text-[#0F172B]">Billing Exceptions</strong>
                <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
              </div>
              <p className="text-[10px] text-[#DC2626] font-semibold">
                {platformBillingService.getInvoices().filter(i => i.status === 'Overdue').length} overdue · {platformBillingService.getDunning().length} in dunning
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          6. MULTI-REGION & INTEGRATION CONNECTORS HEALTH
         ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] block uppercase">India Primary Region</span>
            <strong className="text-xs font-bold text-[#047857] block mt-0.5">● Mumbai (ap-south-1)</strong>
            <span className="text-[10px] text-[#64748B]">
              {health.subsystems.filter(s => s.status !== 'Operational').length > 0
                ? `${health.subsystems.filter(s => s.status !== 'Operational').length} services degraded`
                : 'All services operational'}
            </span>
          </div>
          <Globe className="h-5 w-5 text-[#047857]" />
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] block uppercase">Singapore Region</span>
            <strong className="text-xs font-bold text-[#047857] block mt-0.5">● ap-southeast-1</strong>
            <span className="text-[10px] text-[#047857]">All services operational</span>
          </div>
          <Globe className="h-5 w-5 text-[#047857]" />
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] block uppercase">Middle East Hub</span>
            <strong className="text-xs font-bold text-[#047857] block mt-0.5">● UAE (me-central-1)</strong>
            <span className="text-[10px] text-[#047857]">100% SLA target</span>
          </div>
          <Globe className="h-5 w-5 text-[#047857]" />
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] block uppercase">External Connectors</span>
            <strong className="text-xs font-bold text-[#0F172B] block mt-0.5">WhatsApp, Email, Razorpay</strong>
            <span className="text-[10px] text-[#047857]">
              {health.subsystems.filter(s => s.category === 'Integration' && s.status === 'Operational').length}/{health.subsystems.filter(s => s.category === 'Integration').length || 2} Gateways Live
            </span>
          </div>
          <Zap className="h-5 w-5 text-[#047857]" />
        </div>
      </div>

      {/* ============================================================
          7. LIVE PLATFORM ACTIVITY STREAM
         ============================================================ */}
      <div className="bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#047857] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#047857]"></span>
            </span>
            <h2 className="text-lg font-bold text-[#0F172B] tracking-tight">
              Live Platform Activity Stream
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              ● LIVE
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter pills */}
            {['all', 'revenue', 'operations', 'organizations', 'product'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActivityFilter(f)}
                className={cn(
                  'px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer border',
                  activityFilter === f
                    ? 'bg-[#047857] text-white border-[#047857]'
                    : 'bg-white text-[#64748B] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                )}
              >
                {f}
              </button>
            ))}

            <button
              type="button"
              onClick={() => onNavigateTab('platform-audit')}
              className="text-xs font-semibold text-[#047857] hover:underline cursor-pointer ml-2"
            >
              Full Audit Stream →
            </button>
          </div>
        </div>

        {/* Activity feed */}
        <div className="space-y-2">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onNavigateTab(ev.tab)}
                className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-between hover:bg-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#475569]">
                    {ev.category}
                  </span>
                  <div>
                    <strong className="text-xs font-bold text-[#0F172B]">{ev.text}</strong>
                    <div className="text-[10px] text-[#64748B] mt-0.5">{ev.detail}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#94A3B8]">{ev.time}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1] text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#047857] text-xs font-semibold border border-[#A7F3D0]">
                <span className="h-2 w-2 rounded-full bg-[#047857] animate-pulse"></span>
                <span>Realtime Control Plane Listener Active</span>
              </div>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                No activity records yet. Platform operations, tenant provisionings, feature flag updates, and security events will stream here live as they occur.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          8. EXECUTIVE 30-DAY PERFORMANCE SUMMARY STRIP (BOTTOM)
         ============================================================ */}
      <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#047857]" />
          <strong className="text-[#0F172B]">30-Day Platform Performance:</strong>
        </div>

        <div className="flex items-center gap-6 flex-wrap font-sans">
          <span>Uptime: <strong className="text-[#047857]">99.98%</strong></span>
          <span>MTTR: <strong className="text-[#0F172B]">32m</strong></span>
          <span>Total Incidents: <strong className="text-[#0F172B]">8</strong></span>
          <span>Portfolio Health: <strong className="text-[#047857]">94.2 / 100</strong></span>
          <span>MRR Expansion: <strong className="text-[#047857]">+8.7% MoM</strong></span>
        </div>
      </div>
    </div>
  );
};
