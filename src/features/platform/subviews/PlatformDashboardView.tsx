// src/features/platform/subviews/PlatformDashboardView.tsx
// ============================================================
// WorkForceOS — Platform Control Center 2.0 (Master Command Console)
// ============================================================

import React, { useState } from 'react';
import {
  Building2,
  Users,
  CircleDollarSign,
  TrendingUp,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  Search,
  ShieldAlert,
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
  Workflow,
  Sparkles,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  platformHealthService,
  platformIncidentService,
  platformJobService,
  platformAuditService,
} from '../../../services/platform';
import { SubsystemTelemetry, TenantActionAlert } from '../../../types/platformAdmin';
import { SubsystemHealthDrawer } from '../components/SubsystemHealthDrawer';
import { CommandPaletteModal } from '../components/CommandPaletteModal';

export interface PlatformDashboardViewProps {
  onNavigateTab: (tab: string) => void;
}

const sampleActionAlerts: TenantActionAlert[] = [
  {
    id: 'alt-01',
    severity: 'High',
    category: 'Billing',
    tenant_id: 'org-zenith-04',
    tenant_name: 'Zenith Logistics & Supply Chain',
    title: 'August Subscription Invoice Overdue',
    description: 'Invoice #INV-2026-0802 (₹2.47L) is 4 days past due. Auto-debit retry failed.',
    recommended_action: 'Review invoice reconciliation ledger or send reminder',
    action_tab: 'platform-billing',
    created_at: '2 hours ago',
  },
  {
    id: 'alt-02',
    severity: 'Medium',
    category: 'Usage',
    tenant_id: 'org-innovate-05',
    tenant_name: 'Innovate Labs Pvt Ltd',
    title: 'Starter Seat Quota at 90% Capacity',
    description: '45 of 50 employee licenses allocated. High candidate for Professional plan upgrade.',
    recommended_action: 'Trigger plan expansion recommendation to account owner',
    action_tab: 'platform-subscriptions',
    created_at: '5 hours ago',
  },
  {
    id: 'alt-03',
    severity: 'Medium',
    category: 'Lifecycle',
    tenant_id: 'org-cyber-03',
    tenant_name: 'CyberSoft Global Tech Ltd',
    title: 'Enterprise Trial Expiring in 11 Days',
    description: '120 employees onboarded. No billing payment method registered yet.',
    recommended_action: 'Contact primary admin anish@cybersoft.com for conversion',
    action_tab: 'platform-tenants',
    created_at: '1 day ago',
  },
];

const liveActivityEvents = [
  { id: 'act-1', text: 'Acme Technologies upgraded to Enterprise Tier', meta: 'Subscription #SUB-2026-001 • MRR +₹85,000', time: '2m ago', type: 'billing' },
  { id: 'act-2', text: 'Invoice payment received from Zenith Logistics', meta: '₹42,800 via Razorpay Auto-Debit (UTR #928310)', time: '5m ago', type: 'payment' },
  { id: 'act-3', text: 'Tenant provisioning completed: Nova Technologies', meta: '10 stages verified • 50 seats allocated in Coimbatore partition', time: '8m ago', type: 'tenant' },
  { id: 'act-4', text: 'Feature flag WHATSAPP_ALERTS rolled out to 100%', meta: 'Targeted to Professional, Business, and Enterprise plans', time: '11m ago', type: 'flag' },
  { id: 'act-5', text: 'Nightly database backup snapshot verified', meta: 'S3 cold vault hash verified (2.84 GB)', time: '25m ago', type: 'system' },
];

export const PlatformDashboardView: React.FC<PlatformDashboardViewProps> = ({ onNavigateTab }) => {
  const metrics = platformHealthService.getDashboardMetrics();
  const health = platformHealthService.getSystemHealth();
  const activeIncidents = platformIncidentService.getActiveIncidents();

  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemTelemetry | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const isDegraded = activeIncidents.length > 0;

  return (
    <div className="space-y-6">
      {/* Subsystem Health Inspector Drawer */}
      <SubsystemHealthDrawer
        subsystem={selectedSubsystem}
        onClose={() => setSelectedSubsystem(null)}
      />

      {/* Global Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={onNavigateTab}
      />

      {/* Global Status Bar Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs shadow-2xs ${
        isDegraded ? 'bg-amber-500/10 border-amber-500/30 text-amber-950' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl text-white shrink-0 ${isDegraded ? 'bg-amber-600' : 'bg-[#07563D]'}`}>
            {isDegraded ? <AlertTriangle className="w-4 h-4 animate-pulse" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isDegraded ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <strong className="font-bold text-xs">
                {isDegraded ? 'Partial Service Degradation — 1 active incident' : 'All Platform Microservices Operational'}
              </strong>
            </div>
            <p className="text-[11px] text-gray-600 mt-0.5">
              {isDegraded
                ? `${activeIncidents[0].title} (Lead: ${activeIncidents[0].lead_engineer})`
                : 'All 12 microservice clusters, RLS partitions, and background queues reporting 99.98% SLA.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-gray-500 hidden md:inline">Checked 12s ago</span>
          {isDegraded && (
            <button
              onClick={() => onNavigateTab('platform-support')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              View Incident
            </button>
          )}
        </div>
      </div>

      {/* Header Command Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-300 uppercase tracking-wider">
              ● PRODUCTION
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono">India (ap-south-1) • Super Admin</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Platform Control Center</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor platform health, customer operations, revenue and infrastructure from one command center.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all cursor-pointer border border-gray-200"
          >
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <span>Search anything...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono border border-gray-300">Ctrl+K</kbd>
          </button>

          <button
            onClick={() => onNavigateTab('platform-support')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all cursor-pointer border border-gray-200"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Incidents</span>
          </button>

          <button
            onClick={() => onNavigateTab('platform-tenants')}
            className="flex items-center gap-2 px-4 py-2 bg-[#07563D] hover:bg-[#064733] text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Provision Organization
          </button>
        </div>
      </div>

      {/* 4 Analytical Primary KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Organizations */}
        <div
          onClick={() => onNavigateTab('platform-tenants')}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Organizations</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-[#07563D] group-hover:scale-110 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-3xl font-black text-gray-900">{metrics.totalOrganizations}</div>
              <span className="text-xs font-bold text-emerald-700 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +12.4%
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <strong className="text-gray-800">{metrics.activeOrganizations} Active</strong> · {metrics.trialOrganizations} Trial
            </div>
          </div>
          {/* Mini Sparkline Visualization */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-end gap-1 h-6">
            {[32, 45, 54, 65, 78, 88, 100].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-xs ${i === 6 ? 'bg-[#07563D]' : 'bg-emerald-200'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* KPI 2: MRR */}
        <div
          onClick={() => onNavigateTab('saas-revenue')}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Monthly Recurring Revenue</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-[#07563D] group-hover:scale-110 transition-transform">
                <CircleDollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-3xl font-black text-gray-900">₹{(metrics.mrr / 100000).toFixed(1)}L</div>
              <span className="text-xs font-bold text-emerald-700 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +8.7%
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              vs ₹16.9L last month · <strong className="text-gray-800">ARR ₹{(metrics.arr / 10000000).toFixed(2)}Cr</strong>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-end gap-1 h-6">
            {[40, 50, 62, 70, 78, 90, 100].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-xs ${i === 6 ? 'bg-[#07563D]' : 'bg-emerald-200'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* KPI 3: Active Users */}
        <div
          onClick={() => onNavigateTab('platform-users')}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Platform Users</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-[#07563D] group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-3xl font-black text-gray-900">{metrics.activeUsers.toLocaleString()}</div>
              <span className="text-xs font-bold text-emerald-700 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +6.2%
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <strong className="text-gray-800">90.1% DAU</strong> across all organizations
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-end gap-1 h-6">
            {[50, 58, 65, 72, 80, 92, 100].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-xs ${i === 6 ? 'bg-[#07563D]' : 'bg-emerald-200'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* KPI 4: Health SLA */}
        <div
          onClick={() => setSelectedSubsystem(health.subsystems[0])}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Platform Health & SLA</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-[#07563D] group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <div className="text-3xl font-black text-gray-900">{health.overallUptimePercent}%</div>
              <span className="text-xs font-bold text-emerald-700">Healthy</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <strong className="text-gray-800">Health Score {metrics.customerHealthScore}/100</strong> · {metrics.churnRate}% Churn
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-end gap-1 h-6">
            {[98, 99, 99, 100, 99, 100, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-xs bg-emerald-500"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 12-Column Grid (Row 1: Platform Health 8-col + Attention Required 4-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Col 8: Platform Health Subsystem Mesh */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Observability Mesh</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#07563D]">
                  12/12 Live Probes
                </span>
              </div>
              <h2 className="text-base font-black text-gray-900 mt-0.5">Platform Infrastructure & Service Health</h2>
            </div>
            <button
              onClick={() => setSelectedSubsystem(health.subsystems[0])}
              className="text-xs font-bold text-[#07563D] hover:underline cursor-pointer"
            >
              Inspect Diagnostics
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {health.subsystems.slice(0, 6).map(sub => {
              const isOp = sub.status === 'Operational';
              return (
                <div
                  key={sub.key}
                  onClick={() => setSelectedSubsystem(sub)}
                  className="p-3.5 rounded-xl border border-gray-200/80 hover:border-[#07563D] hover:shadow-xs transition-all cursor-pointer bg-gray-50/50 group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#07563D] transition-colors truncate">
                      {sub.name}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOp ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  </div>
                  <div className="text-[11px] font-mono text-gray-600">
                    <div>Latency: <strong className="text-gray-900">{sub.latencyMs}ms</strong></div>
                    <div>Error Rate: <strong className="text-gray-900">{sub.errorRatePct}%</strong></div>
                    <div>Uptime: <strong className="text-emerald-700">{sub.uptimePct}%</strong></div>
                  </div>
                  <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-100 flex items-center justify-between">
                    <span>Checked {sub.lastCheckSecondsAgo}s ago</span>
                    <span className="text-[#07563D] font-bold group-hover:underline">Details →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 4: Attention Required Queue */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Operational Queue</span>
                <h2 className="text-base font-black text-gray-900 mt-0.5">Attention Required</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-900">
                {sampleActionAlerts.length} Action Items
              </span>
            </div>

            <div className="mt-3 space-y-2.5">
              {sampleActionAlerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => onNavigateTab(alert.action_tab)}
                  className="p-3 rounded-xl border border-gray-200/80 bg-gray-50/70 hover:bg-gray-100/90 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      alert.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {alert.category} • {alert.severity}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{alert.created_at}</span>
                  </div>
                  <div className="text-xs font-bold text-gray-900">{alert.tenant_name}</div>
                  <div className="text-[11px] text-gray-600 leading-snug">{alert.title}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('platform-support')}
            className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
          >
            Review All Operational Alerts
          </button>
        </div>
      </div>

      {/* 12-Column Grid (Row 2: Live Platform Activity Feed) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-black text-gray-900">Live Platform Activity Timeline</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-[#07563D] uppercase tracking-wider">
              ● LIVE STREAM
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('platform-audit')}
            className="text-xs font-bold text-[#07563D] hover:underline cursor-pointer"
          >
            Full Audit Stream →
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {liveActivityEvents.map(evt => (
            <div key={evt.id} className="py-3 flex items-start justify-between gap-4 hover:bg-gray-50/50 px-2 rounded-xl transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#07563D] mt-1.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-gray-900">{evt.text}</div>
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">{evt.meta}</div>
                </div>
              </div>
              <span className="text-[11px] font-mono text-gray-400 shrink-0">{evt.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
