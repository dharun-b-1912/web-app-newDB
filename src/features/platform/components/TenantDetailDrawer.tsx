// src/features/platform/components/TenantDetailDrawer.tsx
// ============================================================
// Joy PeopleHR — Tenant Command Center & 360° Detail Drawer
// ============================================================

import React, { useState } from 'react';
import {
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../../../components/ui/Sheet';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { QuotaMeter } from '../../../components/workforce/QuotaMeter';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'usage' | 'subscription'>('overview');

  if (!tenant) return null;

  return (
    <Sheet open={Boolean(tenant)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {tenant.id}
            </span>
            <StatusBadge status={tenant.status} size="xs" />
            <StatusBadge
              status={`Health: ${tenant.health_score}/100 (${tenant.health})`}
              size="xs"
            />
          </div>
          <SheetTitle>{tenant.legal_name}</SheetTitle>
          <SheetDescription>
            {tenant.industry} • {tenant.city}, {tenant.country} • Admin: {tenant.owner_email}
          </SheetDescription>
        </SheetHeader>

        {/* Quick Action Toolbar */}
        <div className="py-2.5 px-0 border-b border-slate-100 flex items-center gap-2 flex-wrap text-xs">
          <Button
            size="sm"
            variant="warning"
            onClick={() => onRequestImpersonate(tenant)}
            leftIcon={<Key className="w-3.5 h-3.5" />}
          >
            Impersonate Tenant
          </Button>

          {tenant.status === 'Active' ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onStatusChange(tenant.id, 'Suspended')}
              leftIcon={<Lock className="w-3.5 h-3.5" />}
            >
              Suspend Tenant
            </Button>
          ) : (
            <Button
              size="sm"
              variant="success"
              onClick={() => onStatusChange(tenant.id, 'Active')}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Activate Tenant
            </Button>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-slate-500">
            <span className="font-medium">Plan:</span>
            <select
              value={tenant.plan}
              onChange={(e) => onPlanChange(tenant.id, e.target.value as any)}
              className="text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded-md px-2 py-1 outline-none"
            >
              <option value="Starter">Starter (₹18K/mo)</option>
              <option value="Professional">Professional (₹45K/mo)</option>
              <option value="Business">Business (₹85K/mo)</option>
              <option value="Enterprise">Enterprise (₹1.8L/mo)</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#047857] text-[#064E3B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Overview & Stats
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'health'
                ? 'border-[#047857] text-[#064E3B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Health Signals ({tenant.health_signals?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('usage')}
            className={`py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'usage'
                ? 'border-[#047857] text-[#064E3B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Resource Quotas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subscription')}
            className={`py-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'subscription'
                ? 'border-[#047857] text-[#064E3B]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Billing & Contract
          </button>
        </div>

        {/* Drawer Body */}
        <SheetBody>
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Active Employees</span>
                  <span className="text-xl font-bold text-slate-900 font-mono">{tenant.employee_count}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{tenant.active_users_count} active logins</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Monthly MRR</span>
                  <span className="text-xl font-bold text-[#047857] font-mono">₹{(tenant.mrr / 1000).toFixed(0)}K</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{tenant.plan} Plan</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Storage Used</span>
                  <span className="text-xl font-bold text-slate-900 font-mono">{tenant.storage_used_gb} GB</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Quota: {tenant.storage_quota_gb} GB</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Company Metadata</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Legal Name</span>
                    <span className="font-bold text-slate-900">{tenant.legal_name}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Domain Alias</span>
                    <span className="font-mono text-[#047857] font-bold">{tenant.domain || 'N/A'}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">GSTIN / Tax ID</span>
                    <span className="font-mono text-slate-900">{tenant.gstin || 'N/A'}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Onboarding Date</span>
                    <span className="text-slate-700">{tenant.created_at}</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Next Renewal Date</span>
                    <span className="font-bold text-slate-900">{tenant.renewal_date}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="space-y-3">
              <div className="p-4 bg-[#ECFDF5]/80 rounded-xl border border-[#A7F3D0] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Overall Health Score</span>
                  <span className="text-2xl font-bold text-[#064E3B] font-mono">{tenant.health_score}/100</span>
                  <p className="text-xs text-slate-500 mt-0.5">Calculated across 4 telemetry categories</p>
                </div>
                <StatusBadge status={tenant.health} size="sm" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Health Signals Breakdown</h4>
                <div className="space-y-2">
                  {tenant.health_signals?.map((sig, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1 rounded-md mt-0.5">
                          {sig.status === 'Good' ? (
                            <CheckCircle2 className="w-4 h-4 text-[#16845B]" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-[#D89A16]" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{sig.category} Signal</span>
                          <span className="text-slate-600 text-[11px]">{sig.detail}</span>
                        </div>
                      </div>
                      <span className={`font-bold font-mono text-xs ${sig.scoreImpact < 0 ? 'text-[#D94B4B]' : 'text-[#16845B]'}`}>
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
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4">
                <QuotaMeter
                  label="Employee Seat Utilization"
                  current={tenant.employee_count}
                  max={tenant.plan === 'Enterprise' ? 5000 : tenant.plan === 'Business' ? 500 : 200}
                  unit="seats"
                />
                <QuotaMeter
                  label="Document Vault Storage"
                  current={tenant.storage_used_gb}
                  max={tenant.storage_quota_gb}
                  unit="GB"
                />
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Plan Tier</span>
                <span className="font-bold text-[#047857] text-sm">{tenant.plan} Plan</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Annual Contract Value (ARR)</span>
                <span className="font-bold text-slate-900 text-sm">₹{((tenant.mrr * 12) / 100000).toFixed(2)} Lakhs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Billing Term</span>
                <span className="font-semibold text-slate-700">12 Months (Prepaid Annual)</span>
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
