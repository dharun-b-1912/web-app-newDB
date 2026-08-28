// src/features/platform/components/tenants/CustomerUsageTab.tsx
// ============================================================
// Joy PeopleHR — Customer Capacity, Metered Usage & Quotas Tab
// ============================================================

import React from 'react';
import {
  Activity,
  Users,
  HardDrive,
  Cpu,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { cn } from '../../../../lib/utils';

export interface CustomerUsageTabProps {
  organization: OrganizationRecord;
}

export const CustomerUsageTab: React.FC<CustomerUsageTabProps> = ({ organization: org }) => {
  const quotas = [
    {
      title: 'Seat Allocation',
      current: org.active_employees,
      limit: org.seat_limit,
      unit: 'Seats',
      pct: org.seat_utilization_pct,
      status: org.seat_utilization_pct > 85 ? 'Approaching Limit' : 'Healthy',
      color: 'bg-[#047857]',
      desc: 'Active billable employee profiles.',
    },
    {
      title: 'Document Cloud Storage',
      current: org.storage_used_gb,
      limit: org.storage_quota_gb,
      unit: 'GB',
      pct: Math.round((org.storage_used_gb / org.storage_quota_gb) * 100),
      status: 'Healthy',
      color: 'bg-blue-600',
      desc: 'Encrypted storage for employee documents and payroll payslips.',
    },
    {
      title: 'Monthly API Calls',
      current: org.api_calls_this_month,
      limit: 100000,
      unit: 'Calls',
      pct: Math.round((org.api_calls_this_month / 100000) * 100),
      status: 'Healthy',
      color: 'bg-purple-600',
      desc: 'External ERP & biometric API request throughput.',
    },
    {
      title: 'WhatsApp Business Bot Dispatches',
      current: 1280,
      limit: 10000,
      unit: 'Msgs',
      pct: 13,
      status: 'Healthy',
      color: 'bg-emerald-600',
      desc: 'Automated shift roster dispatches and payslip alerts.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quotas.map((q) => (
          <div key={q.title} className="p-6 bg-white rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">{q.title}</span>
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                  q.status === 'Healthy'
                    ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                )}
              >
                {q.status}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-500">Usage:</span>
                <strong className="text-gray-900">
                  {q.current.toLocaleString()} / {q.limit.toLocaleString()} {q.unit} ({q.pct}%)
                </strong>
              </div>

              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', q.color)}
                  style={{ width: `${Math.min(100, q.pct)}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-500">{q.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
