// src/features/platform/subviews/UsageMeteringView.tsx
// ============================================================
// WorkForceOS — Tenant Resource Consumption & Quotas Console
// ============================================================

import React, { useState } from 'react';
import {
  HardDrive,
  Users,
  MessageSquare,
  Code,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Download,
  ExternalLink,
  Cpu,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import { platformUsageService, usePlatformRealtime } from '../../../services/platform';
import { UsageMeteringItem } from '../../../types/platformAdmin';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

export interface UsageMeteringViewProps {
  tenantId?: string;
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const UsageMeteringView: React.FC<UsageMeteringViewProps> = ({ tenantId, onNavigateTab }) => {
  usePlatformRealtime();
  const [usageList] = useState<UsageMeteringItem[]>(() => platformUsageService.getUsage());

  const trackedCount = usageList.length;
  const nearLimitCount = usageList.filter((u) => {
    const empPct = (u.employees_used / u.employees_limit) * 100;
    const storagePct = (u.storage_gb_used / u.storage_gb_limit) * 100;
    const apiPct = (u.api_calls_used / u.api_calls_limit) * 100;
    return (empPct >= 80 || storagePct >= 80 || apiPct >= 80) && (empPct < 100 && storagePct < 100 && apiPct < 100);
  }).length;

  const overLimitCount = usageList.filter((u) => {
    const empPct = (u.employees_used / u.employees_limit) * 100;
    const storagePct = (u.storage_gb_used / u.storage_gb_limit) * 100;
    const apiPct = (u.api_calls_used / u.api_calls_limit) * 100;
    return empPct >= 100 || storagePct >= 100 || apiPct >= 100;
  }).length;

  const overageMrr = overLimitCount * 5000;

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Usage & Metering</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              ● Live Quota Enforcement
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Monitor employee seats, API requests, storage, devices, and plan-controlled consumption.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('Exporting Usage Telemetry Report...')}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Download className="h-4 w-4 text-[#64748B]" />
            Export Usage Telemetry
          </Button>
        </div>
      </div>

      {/* 2. 4 Consumption KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Tracked Organizations</span>
          <strong className="text-2xl font-bold text-[#0F172B] block mt-1">{trackedCount}</strong>
          <span className="text-[10px] text-[#047857] font-semibold">100% telemetry synced</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Near Limit (80%+)</span>
          <strong className="text-2xl font-bold text-[#D97706] block mt-1">{nearLimitCount}</strong>
          <span className="text-[10px] text-[#D97706] font-semibold">Upsell Opportunities</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Over Limit (100%+)</span>
          <strong className="text-2xl font-bold text-[#DC2626] block mt-1">{overLimitCount}</strong>
          <span className="text-[10px] text-[#DC2626] font-semibold">Overage Policy Active</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold text-[#64748B] block">Billable Overage MRR</span>
          <strong className="text-2xl font-bold text-[#047857] block mt-1">
            {overageMrr > 0 ? `₹${(overageMrr / 100000).toFixed(1)}L` : '₹0'}
          </strong>
          <span className="text-[10px] text-[#047857] font-semibold">Extra consumption billed</span>
        </div>
      </div>

      {/* 3. Metering Cards Grid */}
      {usageList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] flex items-center justify-center mx-auto animate-pulse">
            <Activity className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-sm text-[#0F172B]">No Organizations Tracked</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            Provision or onboard new organizations to view live employee seats, API requests, and cloud storage quotas in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usageList.map((usage) => {
            const empPct = (usage.employees_used / usage.employees_limit) * 100;
            const storagePct = (usage.storage_gb_used / usage.storage_gb_limit) * 100;
            const apiPct = (usage.api_calls_used / usage.api_calls_limit) * 100;
            const isNearLimit = empPct >= 80 || storagePct >= 80 || apiPct >= 80;
            const isOverLimit = empPct >= 100 || storagePct >= 100 || apiPct >= 100;

            return (
              <div
                key={usage.tenant_id}
                className={cn(
                  'bg-white p-5 rounded-2xl border shadow-xs space-y-4 transition-all',
                  isOverLimit
                    ? 'border-[#FCA5A5] bg-[#FFFBFB]'
                    : isNearLimit
                    ? 'border-[#FDE68A]'
                    : 'border-[#E2E8F0]'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172B]">{usage.tenant_name}</h3>
                    <div className="text-[10px] font-mono text-[#64748B] mt-0.5">{usage.tenant_id}</div>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] px-2.5 py-0.5 rounded-full font-bold',
                      isOverLimit
                        ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                        : isNearLimit
                        ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                        : 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                    )}
                  >
                    {isOverLimit ? 'Over Limit' : isNearLimit ? 'Near Limit (80%+)' : 'Healthy'}
                  </span>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-3 pt-1">
                  {/* Headcount */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#64748B] flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#2563EB]" /> Employee Headcount
                      </span>
                      <span className="text-[#0F172B]">
                        {usage.employees_used} / {usage.employees_limit} ({Math.round(empPct)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          empPct >= 100 ? 'bg-[#DC2626]' : empPct >= 80 ? 'bg-[#D97706]' : 'bg-[#047857]'
                        )}
                        style={{ width: `${Math.min(empPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Cloud Storage */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#64748B] flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-[#3B82F6]" /> Document Cloud Storage
                      </span>
                      <span className="text-[#0F172B]">
                        {usage.storage_gb_used} GB / {usage.storage_gb_limit} GB ({Math.round(storagePct)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          storagePct >= 100 ? 'bg-[#DC2626]' : storagePct >= 80 ? 'bg-[#D97706]' : 'bg-[#2563EB]'
                        )}
                        style={{ width: `${Math.min(storagePct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* API Calls */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#64748B] flex items-center gap-1.5">
                        <Code className="h-3.5 w-3.5 text-[#7C3AED]" /> Monthly REST API Gateway Calls
                      </span>
                      <span className="text-[#0F172B]">
                        {(usage.api_calls_used / 1000).toFixed(0)}k / {(usage.api_calls_limit / 1000).toFixed(0)}k ({Math.round(apiPct)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          apiPct >= 100 ? 'bg-[#DC2626]' : apiPct >= 80 ? 'bg-[#D97706]' : 'bg-[#7C3AED]'
                        )}
                        style={{ width: `${Math.min(apiPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.('platform-subscriptions', { tenantId: usage.tenant_id })}
                    className="text-[#047857] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Subscription Contract</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.('platform-plans')}
                    className="text-[#64748B] hover:text-[#0F172B] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Check Plan Quota Tier</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
