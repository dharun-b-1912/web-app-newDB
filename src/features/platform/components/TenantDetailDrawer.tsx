// src/features/platform/components/TenantDetailDrawer.tsx
// ============================================================
// WorkForceOS — Tenant Command Center & 360° Detail Drawer
// ============================================================

import React, { useState } from 'react';
import {
  X,
  Building2,
  Users,
  Shield,
  CreditCard,
  HardDrive,
  Sliders,
  Activity,
  Key,
  ExternalLink,
  Lock,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { TenantOrganization, TenantStatus } from '../../../types/platformAdmin';

export interface TenantDetailDrawerProps {
  tenant: TenantOrganization | null;
  onClose: () => void;
  onStatusChange: (id: string, status: TenantStatus) => void;
  onPlanChange: (id: string, plan: TenantOrganization['plan']) => void;
  onRequestImpersonate: (tenant: TenantOrganization) => void;
}

export const TenantDetailDrawer: React.FC<TenantDetailDrawerProps> = ({
  tenant,
  onClose,
  onStatusChange,
  onPlanChange,
  onRequestImpersonate,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'usage' | 'subscription' | 'audit'>('overview');

  if (!tenant) return null;

  const isHealthy = tenant.health === 'Healthy';
  const isAtRisk = tenant.health === 'At Risk';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-950/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gray-50/70 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-md">
                  {tenant.id}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    tenant.status === 'Active'
                      ? 'bg-emerald-100 text-[#07563D]'
                      : tenant.status === 'Trial'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {tenant.status}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    isHealthy
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isAtRisk
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : isAtRisk ? 'bg-amber-500' : 'bg-red-500'}`} />
                  Health: {tenant.health_score}/100 ({tenant.health})
                </span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mt-2">{tenant.legal_name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {tenant.industry} • {tenant.city}, {tenant.country} • Primary Admin: {tenant.owner_email}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Toolbar */}
          <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onRequestImpersonate(tenant)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              Impersonate Tenant
            </button>

            {tenant.status === 'Active' ? (
              <button
                onClick={() => onStatusChange(tenant.id, 'Suspended')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Suspend Tenant
              </button>
            ) : (
              <button
                onClick={() => onStatusChange(tenant.id, 'Active')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#07563D] border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Activate Tenant
              </button>
            )}

            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
              <span>Plan:</span>
              <select
                value={tenant.plan}
                onChange={e => onPlanChange(tenant.id, e.target.value as any)}
                className="text-xs font-bold text-gray-900 bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 outline-hidden"
              >
                <option value="Starter">Starter (₹18K/mo)</option>
                <option value="Professional">Professional (₹45K/mo)</option>
                <option value="Business">Business (₹85K/mo)</option>
                <option value="Enterprise">Enterprise (₹1.8L/mo)</option>
              </select>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 px-6 bg-gray-50/50 gap-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview & Stats
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'health' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Health Score Signals ({tenant.health_signals?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'usage' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Resource Quotas
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`py-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'subscription' ? 'border-[#07563D] text-[#07563D]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Billing & Contract
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                    <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Active Employees</div>
                    <div className="text-2xl font-black text-gray-900 mt-1">{tenant.employee_count}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{tenant.active_users_count} active user logins</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                    <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Monthly MRR</div>
                    <div className="text-2xl font-black text-[#07563D] mt-1">₹{(tenant.mrr / 1000).toFixed(0)}K</div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">{tenant.plan} Plan</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
                    <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Storage Used</div>
                    <div className="text-2xl font-black text-gray-900 mt-1">{tenant.storage_used_gb} GB</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Quota: {tenant.storage_quota_gb} GB</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">Company Metadata</h3>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden text-xs">
                    <div className="p-3 flex items-center justify-between bg-white">
                      <span className="text-gray-500">Legal Name</span>
                      <span className="font-bold text-gray-900">{tenant.legal_name}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between bg-white">
                      <span className="text-gray-500">Trade / Display Name</span>
                      <span className="font-bold text-gray-900">{tenant.trade_name}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between bg-white">
                      <span className="text-gray-500">Domain Alias</span>
                      <span className="font-mono text-emerald-700 font-bold">{tenant.domain || 'N/A'}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between bg-white">
                      <span className="text-gray-500">GSTIN / Tax ID</span>
                      <span className="font-mono text-gray-900">{tenant.gstin || 'N/A'}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between bg-white">
                      <span className="text-gray-500">Onboarding Date</span>
                      <span className="text-gray-900">{tenant.created_at}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between bg-white">
                      <span className="text-gray-500">Next Renewal Date</span>
                      <span className="font-bold text-gray-900">{tenant.renewal_date}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'health' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-700">Overall Health Score</div>
                    <div className="text-3xl font-black text-[#07563D] mt-1">{tenant.health_score}/100</div>
                    <p className="text-xs text-gray-500 mt-0.5">Calculated across 4 operational telemetry categories</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-[#07563D]">
                      {tenant.health}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">Health Signals Breakdown</h4>
                  <div className="space-y-2">
                    {tenant.health_signals?.map((sig, idx) => (
                      <div key={idx} className="p-3.5 bg-white border border-gray-200 rounded-xl flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className={`p-1.5 rounded-lg mt-0.5 ${
                            sig.status === 'Good' ? 'bg-emerald-100 text-emerald-700' : sig.status === 'Warning' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {sig.status === 'Good' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900">{sig.category} Signal</div>
                            <div className="text-xs text-gray-600 mt-0.5">{sig.detail}</div>
                          </div>
                        </div>
                        <span className={`text-xs font-bold font-mono ${sig.scoreImpact < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {sig.scoreImpact > 0 ? `+${sig.scoreImpact}` : sig.scoreImpact}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="space-y-4">
                <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">Seat Utilization</span>
                    <span className="font-mono font-bold text-gray-900">{tenant.employee_count} / {tenant.plan === 'Enterprise' ? 5000 : tenant.plan === 'Business' ? 500 : 200}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#07563D] h-full rounded-full" style={{ width: `${Math.min(100, (tenant.employee_count / 500) * 100)}%` }} />
                  </div>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">Document Vault Storage</span>
                    <span className="font-mono font-bold text-gray-900">{tenant.storage_used_gb} GB / {tenant.storage_quota_gb} GB</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(tenant.storage_used_gb / tenant.storage_quota_gb) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Plan Tier</span>
                  <span className="font-black text-[#07563D] text-sm">{tenant.plan} Plan</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Annual Contract Value (ARR)</span>
                  <span className="font-black text-gray-900 text-sm">₹{((tenant.mrr * 12) / 100000).toFixed(2)} Lakhs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Billing Term</span>
                  <span className="font-semibold text-gray-700">12 Months (Prepaid Annual)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
