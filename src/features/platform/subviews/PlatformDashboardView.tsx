// src/features/platform/subviews/PlatformDashboardView.tsx
// ============================================================
// WorkForceOS — Platform Dashboard 2.0 (Operational Command Center)
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
} from 'lucide-react';
import {
  platformHealthService,
  platformIncidentService,
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

export const PlatformDashboardView: React.FC<PlatformDashboardViewProps> = ({ onNavigateTab }) => {
  const metrics = platformHealthService.getDashboardMetrics();
  const health = platformHealthService.getSystemHealth();
  const activeIncidents = platformIncidentService.getActiveIncidents();

  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemTelemetry | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Subsystem Health Inspector Drawer */}
      <SubsystemHealthDrawer
        subsystem={selectedSubsystem}
        onClose={() => setSelectedSubsystem(null)}
      />

      {/* Global Command Palette */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={onNavigateTab}
      />

      {/* Active Incidents Alert Banner */}
      {activeIncidents.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex items-start justify-between gap-4 text-amber-950">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl mt-0.5">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900">
                  {activeIncidents[0].severity}
                </span>
                <span className="text-xs font-black text-amber-900">{activeIncidents[0].title}</span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">{activeIncidents[0].description}</p>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-amber-700 font-semibold">
                <span>Lead: {activeIncidents[0].lead_engineer}</span>
                <span>•</span>
                <span>Started: {activeIncidents[0].started_at}</span>
                <span>•</span>
                <span className="font-bold text-amber-900">Status: {activeIncidents[0].status}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('platform-support')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
          >
            Incident Desk
          </button>
        </div>
      )}

      {/* Header Operational Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider">
              ● PRODUCTION
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-200">
              Control Plane v2.0
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono">Region: Asia (ap-south-1)</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1.5">Platform Command Center</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time SaaS operational health, customer growth, subscription revenues, and infrastructure telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all cursor-pointer border border-gray-200"
          >
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono border border-gray-300">Ctrl+K</kbd>
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

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('platform-tenants')}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Organizations</span>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-[#07563D] group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900 mt-3">{metrics.totalOrganizations}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{metrics.activeOrganizations} Active</span>
            <span className="text-gray-400 font-normal">({metrics.trialOrganizations} Trials • {metrics.atRiskOrganizations} At Risk)</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('saas-revenue')}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Recurring Revenue</span>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-[#07563D] group-hover:scale-110 transition-transform">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900 mt-3">₹{(metrics.mrr / 100000).toFixed(1)}L</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{metrics.mrrGrowthPct}% MRR Growth</span>
            <span className="text-gray-400 font-normal">(ARR ₹{(metrics.arr / 10000000).toFixed(2)}Cr)</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('platform-users')}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Platform Users</span>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-[#07563D] group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900 mt-3">{metrics.activeUsers.toLocaleString()}</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-gray-500">
            <span>{metrics.totalUsers.toLocaleString()} Total Accounts (90.1% DAU)</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('saas-churn')}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Platform Uptime & SLA</span>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-[#07563D] group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900 mt-3">{health.overallUptimePercent}%</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Health Score: {metrics.customerHealthScore}/100</span>
            <span className="text-gray-400 font-normal">({metrics.churnRate}% Churn)</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Live Subsystem Telemetry & Tenant Action Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 12 Subsystem Telemetry Grid */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Observability Mesh</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#07563D]">
                  12/12 Live
                </span>
              </div>
              <h2 className="text-base font-black text-gray-900 mt-0.5">Real-time Infrastructure Telemetry</h2>
            </div>
            <span className="text-xs text-gray-400 font-mono">Click subsystem for diagnostics</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {health.subsystems.map(sub => {
              const isOp = sub.status === 'Operational';
              return (
                <div
                  key={sub.key}
                  onClick={() => setSelectedSubsystem(sub)}
                  className="p-3 rounded-xl border border-gray-200/80 hover:border-[#07563D] hover:shadow-xs transition-all cursor-pointer bg-gray-50/50 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#07563D] transition-colors truncate">
                      {sub.name}
                    </span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isOp ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2">
                    <span>{sub.latencyMs}ms latency</span>
                    <span className="font-bold text-emerald-700">{sub.uptimePct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Intelligent Tenant Action Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Action Center</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                  {sampleActionAlerts.length} Alerts
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('platform-support')}
                className="text-xs font-bold text-[#07563D] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <h2 className="text-base font-black text-gray-900 mt-0.5">Critical Tenant Action Alerts</h2>

            <div className="mt-4 space-y-3">
              {sampleActionAlerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => onNavigateTab(alert.action_tab)}
                  className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/60 hover:bg-gray-100/80 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      alert.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {alert.category} • {alert.severity}
                    </span>
                    <span className="text-[10px] text-gray-400">{alert.created_at}</span>
                  </div>
                  <div className="text-xs font-bold text-gray-900">{alert.tenant_name}</div>
                  <div className="text-[11px] text-gray-600 leading-snug">{alert.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
