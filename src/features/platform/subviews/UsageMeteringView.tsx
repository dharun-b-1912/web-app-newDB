// src/features/platform/subviews/UsageMeteringView.tsx
// ============================================================
// WorkForceOS — Event-Driven Usage Metering Console
// ============================================================

import React, { useState } from 'react';
import { HardDrive, Users, MessageSquare, Code, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { platformUsageService } from '../../../services/platform';
import { UsageMeteringItem } from '../../../types/platformAdmin';

export const UsageMeteringView: React.FC = () => {
  const [usageList] = useState<UsageMeteringItem[]>(() => platformUsageService.getUsage());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-200 uppercase tracking-wider">
            Resource Metering
          </span>
          <span className="text-xs font-semibold text-gray-500 font-mono">Live Quota Enforcement</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Tenant Resource Consumption & Quotas</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Real-time tracking of active headcount, document storage, REST API requests, and WhatsApp transactional alerts.
        </p>
      </div>

      {/* Metering Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usageList.map(usage => {
          const empPct = (usage.employees_used / usage.employees_limit) * 100;
          const storagePct = (usage.storage_gb_used / usage.storage_gb_limit) * 100;
          const apiPct = (usage.api_calls_used / usage.api_calls_limit) * 100;
          const waPct = (usage.whatsapp_sent / usage.whatsapp_limit) * 100;

          const isNearLimit = empPct >= 90 || storagePct >= 90 || apiPct >= 90;

          return (
            <div key={usage.tenant_id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-5 hover:border-emerald-300 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900">{usage.tenant_name}</h3>
                  <div className="text-[10px] font-mono text-gray-400 mt-0.5">{usage.tenant_id}</div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isNearLimit
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-emerald-100 text-[#07563D]'
                  }`}
                >
                  {isNearLimit ? 'Near Limit (90%+)' : 'Healthy'}
                </span>
              </div>

              {/* 4 Metering Gauges */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-700" /> Active Employee Headcount
                    </span>
                    <span className="font-mono text-gray-900">{usage.employees_used} / {usage.employees_limit} ({empPct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${empPct >= 90 ? 'bg-amber-500' : 'bg-[#07563D]'}`} style={{ width: `${Math.min(100, empPct)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-blue-600" /> Encrypted S3 Storage
                    </span>
                    <span className="font-mono text-gray-900">{usage.storage_gb_used} / {usage.storage_gb_limit} GB ({storagePct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, storagePct)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-purple-600" /> Monthly API Requests
                    </span>
                    <span className="font-mono text-gray-900">{(usage.api_calls_used / 1000).toFixed(0)}k / {(usage.api_calls_limit / 1000000).toFixed(1)}M ({apiPct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, apiPct)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Transactional Alerts
                    </span>
                    <span className="font-mono text-gray-900">{usage.whatsapp_sent.toLocaleString()} / {usage.whatsapp_limit.toLocaleString()} ({waPct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, waPct)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
