import React from 'react';
import {
  Building2,
  Users,
  CircleDollarSign,
  TrendingUp,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Server,
  Database,
  Cpu,
  Wifi,
  Mail,
  MessageSquare,
  CreditCard,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { platformAdminApi } from '../../../services/platformAdminApi';

export interface PlatformDashboardViewProps {
  onNavigateTab: (tab: string) => void;
}

export const PlatformDashboardView: React.FC<PlatformDashboardViewProps> = ({ onNavigateTab }) => {
  const metrics = platformAdminApi.getDashboardMetrics();
  const health = platformAdminApi.getSystemHealth();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-[#07563D] border border-emerald-200">
              Platform Control Plane
            </span>
            <span className="text-xs font-semibold text-gray-500">SaaS Owner View</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Platform Admin Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time SaaS operational health, customer growth, subscription revenues, and infrastructure telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
            <span className="text-gray-400 font-normal">({metrics.trialOrganizations} Trials)</span>
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
            <span>+8.7% MRR Growth</span>
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
            <span>{metrics.totalUsers.toLocaleString()} Total User Accounts</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('saas-churn')}
          className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Retention & Health</span>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-[#07563D] group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-gray-900 mt-3">{metrics.netRetentionRate}%</div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{metrics.customerHealthScore}% Health Score</span>
            <span className="text-gray-400 font-normal">({metrics.churnRate}% Churn)</span>
          </div>
        </div>
      </div>

      {/* Operational Telemetry & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Infrastructure & System Telemetry</h3>
              <p className="text-xs text-gray-500">Real-time status of WorkForceOS core services</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-[#07563D] rounded-full text-xs font-bold border border-emerald-200">
              {health.overallUptimePercent}% Overall Uptime
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { title: 'API Gateway', status: health.api, icon: Server },
              { title: 'Database', status: health.database, icon: Database },
              { title: 'Authentication', status: health.authentication, icon: Cpu },
              { title: 'Storage & S3', status: health.storage, icon: Activity },
              { title: 'Realtime Engine', status: health.realtime, icon: Wifi },
              { title: 'Email Service', status: health.email, icon: Mail },
              { title: 'WhatsApp Gateway', status: health.whatsapp, icon: MessageSquare },
              { title: 'Payments Gateway', status: health.payments, icon: CreditCard },
            ].map(sys => (
              <div key={sys.title} className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/60">
                <div className="flex items-center justify-between">
                  <sys.icon className="w-4 h-4 text-gray-500" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-xs font-bold text-gray-900 mt-2">{sys.title}</div>
                <div className="text-[10px] font-semibold text-emerald-700">{sys.status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Health Overview */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-extrabold text-gray-900">Tenant Action Alerts</h3>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>

          <div className="space-y-2.5">
            <div
              onClick={() => onNavigateTab('platform-billing')}
              className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-amber-900">Payment Overdue</div>
                <div className="text-[10px] text-amber-700">Zenith Logistics (₹2.48L)</div>
              </div>
              <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 font-bold text-[10px] rounded-lg">Action</span>
            </div>

            <div
              onClick={() => onNavigateTab('saas-trials')}
              className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-emerald-900">37 Trials Active</div>
                <div className="text-[10px] text-emerald-700">CyberSoft trial expires in 13 days</div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 font-bold text-[10px] rounded-lg">View</span>
            </div>

            <div
              onClick={() => onNavigateTab('platform-incidents')}
              className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-gray-900">Zero Critical Incidents</div>
                <div className="text-[10px] text-gray-500">All SaaS systems running normal</div>
              </div>
              <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold text-[10px] rounded-lg">Health</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
