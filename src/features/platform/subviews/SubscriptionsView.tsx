// src/features/platform/subviews/SubscriptionsView.tsx
// ============================================================
// Joy PeopleHR — Tenant Subscriptions & Customer Contracts Management Console
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  Package,
  Check,
  Shield,
  Layers,
  CreditCard,
  Sparkles,
  Sliders,
  RefreshCw,
  Plus,
  Edit2,
  CheckCircle2,
  X,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  Clock,
  ExternalLink,
  ChevronRight,
  Download,
  AlertCircle,
  FileText,
  Activity,
  HardDrive,
  Cpu,
  PauseCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import {
  platformSubscriptionService,
  SubscriptionContractItem,
  SubscriptionStatus,
} from '../../../services/platform/platformSubscriptionService';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { cn } from '../../../lib/utils';

export interface SubscriptionsViewProps {
  initialPlanFilter?: string;
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  initialPlanFilter,
  onNavigateTab,
}) => {
  // State
  const [subscriptions, setSubscriptions] = useState<SubscriptionContractItem[]>(() =>
    platformSubscriptionService.getSubscriptions()
  );
  const metrics = useMemo(() => platformSubscriptionService.getMetrics(), [subscriptions]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState(initialPlanFilter || 'All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Drawers & Modals
  const [selectedSub, setSelectedSub] = useState<SubscriptionContractItem | null>(null);
  const [manageTab, setManageTab] = useState<'overview' | 'plan' | 'billing' | 'usage' | 'history'>('overview');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isChangeSeatsOpen, setIsChangeSeatsOpen] = useState(false);

  const refreshData = () => {
    setSubscriptions(platformSubscriptionService.getSubscriptions());
  };

  const handleToggleAutoRenew = async (id: string) => {
    const updated = await platformSubscriptionService.toggleAutoRenew(id);
    setSubscriptions(subscriptions.map((s) => (s.id === id ? { ...updated } : s)));
    if (selectedSub?.id === id) setSelectedSub({ ...updated });
  };

  const handlePauseResume = async (sub: SubscriptionContractItem) => {
    if (sub.status === 'Suspended') {
      const resumed = await platformSubscriptionService.resumeSubscription(sub.id);
      setSubscriptions(subscriptions.map((s) => (s.id === sub.id ? { ...resumed } : s)));
      if (selectedSub?.id === sub.id) setSelectedSub({ ...resumed });
    } else {
      const paused = await platformSubscriptionService.pauseSubscription(sub.id, 'Administrative hold');
      setSubscriptions(subscriptions.map((s) => (s.id === sub.id ? { ...paused } : s)));
      if (selectedSub?.id === sub.id) setSelectedSub({ ...paused });
    }
  };

  const handleCancelSub = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this contract?')) {
      const cancelled = await platformSubscriptionService.cancelSubscription(id, 'Customer cancellation request');
      setSubscriptions(subscriptions.map((s) => (s.id === id ? { ...cancelled } : s)));
      if (selectedSub?.id === id) setSelectedSub({ ...cancelled });
    }
  };

  // Filtered List
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchPlan = planFilter === 'All' || s.plan.toLowerCase() === planFilter.toLowerCase();
      const matchStatus = statusFilter === 'All' || s.status.toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.tenant_name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.tenant_id.toLowerCase().includes(q) ||
        s.plan.toLowerCase().includes(q);
      return matchPlan && matchStatus && matchSearch;
    });
  }, [subscriptions, planFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Subscriptions</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              ● Subscription Engine Active
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Manage tenant subscriptions, plan changes, renewals, lifecycle status, and customer contracts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('Exporting active subscriptions to CSV...')}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Download className="h-4 w-4 text-[#64748B]" />
            Export
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#036246] text-white shadow-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            + Create Subscription
          </Button>
        </div>
      </div>

      {/* 2. 5 Subscription Lifecycle KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Active Contracts</span>
          <strong className="text-2xl font-bold text-[#047857] block mt-1">{metrics.active}</strong>
          <span className="text-[10px] text-[#047857] font-semibold">96.2% Retention</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Trial Subscriptions</span>
          <strong className="text-2xl font-bold text-[#2563EB] block mt-1">{metrics.trial}</strong>
          <span className="text-[10px] text-[#2563EB] font-semibold">14-Day Full Access</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Past Due</span>
          <strong className="text-2xl font-bold text-[#DC2626] block mt-1">{metrics.past_due}</strong>
          <span className="text-[10px] text-[#DC2626] font-semibold">Payment Dunning</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Renewing Soon (30d)</span>
          <strong className="text-2xl font-bold text-[#D97706] block mt-1">{metrics.renewing_soon}</strong>
          <span className="text-[10px] text-[#D97706] font-semibold">Auto-Debit Pending</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Cancelled</span>
          <strong className="text-2xl font-bold text-[#64748B] block mt-1">{metrics.cancelled}</strong>
          <span className="text-[10px] text-[#64748B]">Historical Records</span>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search organization, subscription ID, plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#047857]"
            />
          </div>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#334155]"
          >
            <option value="All">All Plans</option>
            <option value="Starter">Starter</option>
            <option value="Professional">Professional</option>
            <option value="Business">Business</option>
            <option value="Enterprise">Enterprise</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#334155]"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Past Due">Past Due</option>
            <option value="Suspended">Suspended</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="text-xs text-[#64748B]">
          Showing <strong>{filteredSubscriptions.length}</strong> active contracts
        </div>
      </div>

      {/* 4. Subscriptions Data Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                <th className="py-3 px-4">Organization & ID</th>
                <th className="py-3 px-4">Current Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Seat Allocation</th>
                <th className="py-3 px-4">Billing Cycle</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4">Auto-Renew</th>
                <th className="py-3 px-4">Monthly Value</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#0F172B]">{sub.tenant_name}</div>
                    <div className="text-[10px] text-[#94A3B8] font-mono">
                      {sub.id} • {sub.tenant_id}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => onNavigateTab?.('platform-plans', { presetFilter: sub.plan })}
                      className="font-bold text-[#047857] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{sub.plan}</span>
                      <ExternalLink className="h-3 w-3 text-[#047857]/70" />
                    </button>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold',
                        sub.status === 'Active'
                          ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                          : sub.status === 'Trial'
                          ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                          : sub.status === 'Past Due'
                          ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                          : sub.status === 'Suspended'
                          ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                          : 'bg-[#F1F5F9] text-[#64748B]'
                      )}
                    >
                      ● {sub.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono">
                    <div className="font-semibold text-[#0F172B]">
                      {sub.used_seats} / {sub.seats} seats
                    </div>
                    <div className="w-20 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mt-1">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          sub.used_seats / sub.seats > 0.9 ? 'bg-[#DC2626]' : 'bg-[#047857]'
                        )}
                        style={{ width: `${Math.min(100, (sub.used_seats / sub.seats) * 100)}%` }}
                      />
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-[#334155]">{sub.billing_cycle}</td>

                  <td className="py-3.5 px-4 font-mono text-[#334155]">{sub.renewal_date}</td>

                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleAutoRenew(sub.id)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer',
                        sub.auto_renew
                          ? 'bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]'
                          : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                      )}
                    >
                      {sub.auto_renew ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-[#0F172B]">
                    ₹{(sub.total_amount / 1000).toFixed(1)}k
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSub(sub);
                        setManageTab('overview');
                      }}
                      className="text-xs text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5] font-semibold"
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------
          SUBSCRIPTION DETAIL DRAWER (5 Sub-tabs)
         --------------------------------------------------------- */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col border-l border-[#E2E8F0] overflow-hidden text-xs">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC] flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#0F172B]">{selectedSub.tenant_name}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 bg-[#E2E8F0] rounded text-[#475569]">
                    {selectedSub.id}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                    ● {selectedSub.status}
                  </span>
                </div>
                <div className="text-xs text-[#64748B] mt-0.5">
                  Plan: <strong className="text-[#0F172B]">{selectedSub.plan}</strong> • Renewal:{' '}
                  <strong className="text-[#0F172B]">{selectedSub.renewal_date}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsChangePlanOpen(true)}
                  className="bg-[#047857] hover:bg-[#036246] text-white font-semibold text-xs"
                >
                  Change Plan
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangeSeatsOpen(true)}
                  className="border-[#CBD5E1] text-[#334155] text-xs"
                >
                  Change Seats
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePauseResume(selectedSub)}
                  className="text-xs text-[#475569]"
                >
                  {selectedSub.status === 'Suspended' ? 'Resume' : 'Pause'}
                </Button>

                <button
                  onClick={() => setSelectedSub(null)}
                  className="p-1.5 text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#E2E8F0] rounded-lg transition-colors ml-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 5 Sub-navigation Tabs */}
            <div className="border-b border-[#E2E8F0] px-5 bg-white flex-shrink-0">
              <div className="flex items-center gap-6">
                {[
                  { id: 'overview', label: 'Overview', icon: Building2 },
                  { id: 'plan', label: 'Plan Details', icon: Layers },
                  { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
                  { id: 'usage', label: 'Usage & Quotas', icon: Activity },
                  { id: 'history', label: 'Contract History', icon: Clock },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = manageTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setManageTab(tab.id as any)}
                      className={cn(
                        'py-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer',
                        isActive
                          ? 'border-[#047857] text-[#047857]'
                          : 'border-transparent text-[#64748B] hover:text-[#0F172B]'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#047857]' : 'text-[#94A3B8]')} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Section 1: Overview */}
              {manageTab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Subscription ID</span>
                      <strong className="text-xs text-[#0F172B] font-mono">{selectedSub.id}</strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Billing Cycle</span>
                      <strong className="text-xs text-[#0F172B]">{selectedSub.billing_cycle}</strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Contract Start</span>
                      <strong className="text-xs text-[#0F172B] font-mono">{selectedSub.start_date}</strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Renewal Due</span>
                      <strong className="text-xs text-[#047857] font-mono">{selectedSub.renewal_date}</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-[#0F172B]">Automated Renewal & Card Mandate</div>
                      <div className="text-[10px] text-[#64748B]">Automatically bill client upon renewal date</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleAutoRenew(selectedSub.id)}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                        selectedSub.auto_renew ? 'bg-[#047857] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
                      )}
                    >
                      {selectedSub.auto_renew ? 'Auto-Renew ON' : 'Auto-Renew OFF'}
                    </button>
                  </div>
                </div>
              )}

              {/* Section 2: Plan Details */}
              {manageTab === 'plan' && (
                <div className="space-y-4">
                  <div className="p-5 bg-[#F0FDF4] rounded-2xl border border-[#A7F3D0] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#047857] tracking-wider">Subscribed Tier</span>
                      <h4 className="text-lg font-extrabold text-[#0F172B]">{selectedSub.plan} Plan</h4>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Capacity: {selectedSub.seats} included employee accounts • ₹{(selectedSub.total_amount / 1000).toFixed(1)}k / mo
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSub(null);
                        onNavigateTab?.('platform-plans', { presetFilter: selectedSub.plan });
                      }}
                      className="bg-white border-[#A7F3D0] text-[#047857] hover:bg-[#ECFDF5] font-semibold"
                    >
                      View Full Plan Catalog →
                    </Button>
                  </div>
                </div>
              )}

              {/* Section 3: Billing & Invoices */}
              {manageTab === 'billing' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172B]">Linked Invoices & Payment Ledger</h4>
                      <p className="text-[10px] text-[#64748B]">All invoices generated under {selectedSub.id}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSub(null);
                        onNavigateTab?.('platform-billing', { presetFilter: selectedSub.tenant_name });
                      }}
                      className="text-xs text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5]"
                    >
                      Open Full Billing View →
                    </Button>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-xs text-[#0F172B]">{selectedSub.last_invoice_id}</div>
                      <div className="text-[10px] text-[#64748B]">Last Invoice • ₹{(selectedSub.total_amount / 1000).toFixed(1)}k</div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857]">
                      {selectedSub.last_invoice_status}
                    </span>
                  </div>
                </div>
              )}

              {/* Section 4: Usage & Quotas */}
              {manageTab === 'usage' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-[#0F172B]">Measured Tenant Consumption</h4>
                      <p className="text-[10px] text-[#64748B]">Real-time resource utilization against plan quotas</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSub(null);
                        onNavigateTab?.('platform-usage', { tenantId: selectedSub.tenant_id });
                      }}
                      className="text-xs text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5]"
                    >
                      Open Usage & Metering →
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border space-y-1">
                      <span className="text-[10px] text-[#64748B]">Employee Seats</span>
                      <strong className="text-sm text-[#0F172B] block">
                        {selectedSub.used_seats} / {selectedSub.seats}
                      </strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border space-y-1">
                      <span className="text-[10px] text-[#64748B]">Cloud Storage</span>
                      <strong className="text-sm text-[#0F172B] block">
                        {selectedSub.storage_used_gb} GB / {selectedSub.storage_limit_gb} GB
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 5: History */}
              {manageTab === 'history' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#0F172B]">Contract Modification Trail</h4>
                  <div className="space-y-2">
                    {selectedSub.history.map((h) => (
                      <div key={h.id} className="p-3 bg-[#F8FAFC] rounded-xl border text-xs space-y-1">
                        <div className="flex justify-between font-mono text-[10px] text-[#64748B]">
                          <span>{h.timestamp}</span>
                          <span>{h.actor}</span>
                        </div>
                        <div className="font-bold text-[#0F172B]">{h.action}</div>
                        <div className="text-[11px] text-[#475569]">{h.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          CHANGE PLAN MODAL (With capacity validation)
         --------------------------------------------------------- */}
      {isChangePlanOpen && selectedSub && (
        <ChangePlanWizardModal
          sub={selectedSub}
          onClose={() => setIsChangePlanOpen(false)}
          onSuccess={(updated) => {
            setSubscriptions(subscriptions.map((s) => (s.id === updated.id ? { ...updated } : s)));
            setSelectedSub({ ...updated });
            setIsChangePlanOpen(false);
          }}
        />
      )}

      {/* ---------------------------------------------------------
          CREATE SUBSCRIPTION MODAL
         --------------------------------------------------------- */}
      {isCreateOpen && (
        <CreateSubscriptionModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setIsCreateOpen(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
};

/**
 * 3-Step Change Plan Wizard
 */
const ChangePlanWizardModal: React.FC<{
  sub: SubscriptionContractItem;
  onClose: () => void;
  onSuccess: (updated: SubscriptionContractItem) => void;
}> = ({ sub, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [targetPlan, setTargetPlan] = useState<'Starter' | 'Professional' | 'Business' | 'Enterprise'>('Enterprise');
  const [reason, setReason] = useState('Expansion upgrade requested by client');

  const planSeatLimits = { Starter: 50, Professional: 200, Business: 500, Enterprise: 5000 };
  const planPrices = { Starter: 18000, Professional: 45000, Business: 85000, Enterprise: 180000 };

  const isSeatExceeded = sub.used_seats > planSeatLimits[targetPlan];

  const handleConfirm = async () => {
    const updated = await platformSubscriptionService.changePlan(
      sub.id,
      targetPlan,
      `plan-${targetPlan.toLowerCase()}`,
      reason
    );
    onSuccess(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider">Step {step} of 2</span>
            <h3 className="text-base font-bold text-[#0F172B]">Change Subscription Tier</h3>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <span className="font-semibold text-[#334155] block">Select New Subscription Plan:</span>
            <div className="grid grid-cols-2 gap-2">
              {(['Starter', 'Professional', 'Business', 'Enterprise'] as const).map((p) => (
                <div
                  key={p}
                  onClick={() => setTargetPlan(p)}
                  className={cn(
                    'p-3 rounded-xl border cursor-pointer transition-all',
                    targetPlan === p ? 'bg-[#ECFDF5] border-[#047857]' : 'bg-white border-[#E2E8F0]'
                  )}
                >
                  <div className="font-bold text-sm text-[#0F172B]">{p}</div>
                  <div className="text-[10px] text-[#047857] font-semibold">₹{planPrices[p] / 1000}k / mo</div>
                  <div className="text-[10px] text-[#64748B]">Max {planSeatLimits[p]} seats</div>
                </div>
              ))}
            </div>

            {isSeatExceeded && (
              <div className="p-3 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Capacity Block:</strong> Client currently has {sub.used_seats} active users, which exceeds {targetPlan}'s limit of {planSeatLimits[targetPlan]} seats.
                </span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="p-4 bg-[#F8FAFC] rounded-xl border space-y-2">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Current Plan:</span>
                <strong>{sub.plan} (₹{planPrices[sub.plan] / 1000}k / mo)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">New Plan:</span>
                <strong className="text-[#047857]">{targetPlan} (₹{planPrices[targetPlan] / 1000}k / mo)</strong>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-[#64748B]">Financial Impact:</span>
                <strong className="text-[#047857]">
                  {planPrices[targetPlan] >= planPrices[sub.plan] ? '+' : '-'}₹
                  {Math.abs(planPrices[targetPlan] - planPrices[sub.plan]) / 1000}k / mo
                </strong>
              </div>
            </div>

            <div>
              <label className="font-semibold text-[#334155] block mb-1">Reason for Plan Change</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          {step === 2 ? (
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <Button
              variant="primary"
              size="sm"
              disabled={isSeatExceeded}
              onClick={() => setStep(2)}
              className="bg-[#047857] hover:bg-[#036246] text-white"
            >
              Continue <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              className="bg-[#047857] hover:bg-[#036246] text-white font-bold"
            >
              Confirm Plan Change
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Create Subscription Modal
 */
const CreateSubscriptionModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
}> = ({ onClose, onCreated }) => {
  const [tenantName, setTenantName] = useState('Zenith Global Logistics');
  const [tenantId, setTenantId] = useState('org-zenith-07');
  const [plan, setPlan] = useState<'Starter' | 'Professional' | 'Business' | 'Enterprise'>('Professional');
  const [seats, setSeats] = useState(150);
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Annual'>('Annual');
  const [autoRenew, setAutoRenew] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await platformSubscriptionService.createSubscription({
      tenant_id: tenantId,
      tenant_name: tenantName,
      plan,
      plan_id: `plan-${plan.toLowerCase()}`,
      seats,
      billing_cycle: billingCycle,
      auto_renew: autoRenew,
    });
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-bold text-[#0F172B]">Create Tenant Subscription</h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="font-semibold text-[#334155] block mb-1">Organization Name</label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              className="w-full p-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-[#334155] block mb-1">Select Existing Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as any)}
              className="w-full p-2 border rounded-lg bg-white text-xs"
            >
              <option value="Starter">Starter (₹18k/mo • 50 seats)</option>
              <option value="Professional">Professional (₹45k/mo • 200 seats)</option>
              <option value="Business">Business (₹85k/mo • 500 seats)</option>
              <option value="Enterprise">Enterprise (₹180k/mo • 5000+ seats)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#334155] block mb-1">Included Seats</label>
              <input
                type="number"
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-full p-2 border rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-[#334155] block mb-1">Billing Cycle</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as any)}
                className="w-full p-2 border rounded-lg bg-white text-xs"
              >
                <option value="Annual">Annual (Save 17%)</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>

          <Button type="submit" variant="primary" size="sm" className="w-full bg-[#047857] hover:bg-[#036246] text-white font-bold">
            Execute Subscription Contract
          </Button>
        </form>
      </div>
    </div>
  );
};
