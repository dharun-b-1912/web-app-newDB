// src/features/platform/subviews/SaasBusinessView.tsx
// ============================================================
// WorkForceOS — SaaS Business & Revenue Analytics Executive Console
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  Download,
  Calendar,
  Layers,
  CreditCard,
  Building2,
  Package,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';
import {
  platformTenantService,
  platformSubscriptionService,
  platformBillingService,
  usePlatformRealtime,
} from '../../../services/platform';

export interface SaasBusinessViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const SaasBusinessView: React.FC<SaasBusinessViewProps> = ({ onNavigateTab }) => {
  usePlatformRealtime();
  const [metricView, setMetricView] = useState<'mrr' | 'arr'>('mrr');

  // Dynamic Domain Data
  const orgs = platformTenantService.getOrganizations().items;
  const subscriptions = platformSubscriptionService.getSubscriptions();
  const invoices = platformBillingService.getInvoices();

  const totalMrr = orgs.reduce((sum, o) => sum + (o.mrr || 0), 0);
  const totalArr = totalMrr * 12;
  const activeOrgsCount = orgs.filter((o) => o.status === 'Active').length;
  const newSubsCount = subscriptions.filter((s) => s.status === 'Active' || s.status === 'Trial').length;
  const arpu = orgs.length > 0 ? Math.round(totalMrr / orgs.length) : 0;

  // Plan Performance Calculation
  const planPerformance = useMemo(() => {
    const plans = [
      { name: 'Starter', color: '#64748B' },
      { name: 'Professional', color: '#047857' },
      { name: 'Business', color: '#2563EB' },
      { name: 'Enterprise', color: '#7C3AED' },
    ];

    return plans.map((p) => {
      const planOrgs = orgs.filter((o) => o.plan?.toLowerCase() === p.name.toLowerCase());
      const planMrr = planOrgs.reduce((sum, o) => sum + (o.mrr || 0), 0);
      return {
        name: p.name,
        tenants: planOrgs.length,
        mrr: planMrr > 0 ? `₹${(planMrr / 100000).toFixed(1)}L` : '₹0',
        growth: 'Nominal',
        churn: '0.0%',
        color: p.color,
      };
    });
  }, [orgs]);

  // Dynamic Chart Data
  const chartData = useMemo(() => {
    const mrrInLakhs = Number((totalMrr / 100000).toFixed(1));
    const arrInCrores = Number((totalArr / 10000000).toFixed(2));

    return [
      { month: 'Current', mrr: mrrInLakhs, arr: arrInCrores },
    ];
  }, [totalMrr, totalArr]);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Revenue & Growth</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              ● Realtime Revenue Engine
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Monitor recurring revenue, subscription growth, retention, expansion, and commercial performance across all organizations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Calendar className="h-4 w-4 text-[#64748B]" />
            Live Snapshot
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const dataStr = JSON.stringify({ totalMrr, totalArr, activeOrgsCount, subscriptionsCount: subscriptions.length }, null, 2);
              const blob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `workforceos-revenue-report-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Download className="h-4 w-4 text-[#64748B]" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* 2. 6 Executive Commercial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">MRR</span>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1">
            ₹{totalMrr > 0 ? (totalMrr / 100000).toFixed(1) + 'L' : '0'}
          </strong>
          <span className="text-[10px] font-semibold text-[#047857] flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" /> Live Run-Rate
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">ARR</span>
          <strong className="text-2xl font-bold text-[#047857] block mt-1">
            ₹{totalArr > 0 ? (totalArr / 10000000).toFixed(2) + 'Cr' : '0'}
          </strong>
          <span className="text-[10px] font-semibold text-[#047857] flex items-center gap-0.5">
            <ArrowUpRight className="h-3 w-3" /> Annualized
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Active Organizations</span>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1">{activeOrgsCount}</strong>
          <span className="text-[10px] font-semibold text-[#047857]">Active database tenants</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Total Contracts</span>
          <strong className="text-2xl font-bold text-[#2563EB] block mt-1">{subscriptions.length}</strong>
          <span className="text-[10px] text-[#2563EB] font-semibold">Active Agreements</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Invoices Issued</span>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1">{invoices.length}</strong>
          <span className="text-[10px] font-semibold text-[#047857]">
            {invoices.filter((i) => i.status === 'Paid').length} paid
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">ARPU (Avg Revenue)</span>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1">
            ₹{arpu.toLocaleString()}
          </strong>
          <span className="text-[10px] font-semibold text-[#047857]">Per tenant average</span>
        </div>
      </div>

      {/* 3. Cross-Navigation Jump Bar */}
      <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] flex items-center justify-between flex-wrap gap-3 text-xs">
        <span className="font-bold text-[#0F172B] flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-[#047857]" /> Quick Operations Navigation:
        </span>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab?.('platform-subscriptions')}
            className="text-[#047857] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View Subscription Growth</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <span className="text-[#CBD5E1]">•</span>
          <button
            type="button"
            onClick={() => onNavigateTab?.('platform-billing')}
            className="text-[#047857] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View Invoices & Collections</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <span className="text-[#CBD5E1]">•</span>
          <button
            type="button"
            onClick={() => onNavigateTab?.('platform-usage')}
            className="text-[#047857] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View Usage & Metering</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Recurring Revenue Trends Chart & Plan Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#0F172B]">Recurring Revenue Growth (MRR / ARR)</h3>
              <p className="text-xs text-[#64748B]">Real-time expansion & net revenue telemetry</p>
            </div>

            <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setMetricView('mrr')}
                className={cn(
                  'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer',
                  metricView === 'mrr' ? 'bg-white text-[#0F172B] shadow-xs' : 'text-[#64748B]'
                )}
              >
                MRR (Lakhs)
              </button>
              <button
                type="button"
                onClick={() => setMetricView('arr')}
                className={cn(
                  'px-3 py-1 rounded-lg font-bold transition-all cursor-pointer',
                  metricView === 'arr' ? 'bg-white text-[#0F172B] shadow-xs' : 'text-[#64748B]'
                )}
              >
                ARR (Crores)
              </button>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#047857" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey={metricView === 'mrr' ? 'mrr' : 'arr'}
                  stroke="#047857"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Plan Performance Breakdown */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-[#0F172B]">Plan Performance & Contribution</h3>
            <p className="text-xs text-[#64748B]">Revenue distribution across active subscription tiers</p>
          </div>

          <div className="space-y-3">
            {planPerformance.map((p) => (
              <div
                key={p.name}
                className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#047857] transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.('platform-plans', { presetFilter: p.name })}
                    className="font-bold text-xs text-[#0F172B] hover:text-[#047857] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{p.name}</span>
                    <ExternalLink className="h-3 w-3 text-[#94A3B8]" />
                  </button>
                  <span className="font-bold text-xs text-[#047857]">{p.mrr}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>{p.tenants} Organizations</span>
                  <span className="text-[#047857] font-semibold">{p.growth}</span>
                  <span>Churn: {p.churn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
