import React from 'react';
import { Activity, Database, MessageSquare, Cpu } from 'lucide-react';
import { platformAdminApi } from '../../../services/platformAdminApi';

export const UsageMeteringView: React.FC = () => {
  const usage = platformAdminApi.getUsage();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h1 className="text-2xl font-black text-gray-900">Tenant Usage & Metering Telemetry</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Real-time resource utilization tracking for Employee headcount, Storage GB, API calls, and WhatsApp Business API quotas.
        </p>
      </div>

      {/* Metering Table */}
      <div className="grid grid-cols-1 gap-4">
        {usage.map(u => (
          <div key={u.tenant_id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">{u.tenant_name}</h3>
                <span className="text-[10px] text-gray-400 font-mono">{u.tenant_id}</span>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-[#07563D] font-bold text-[11px] rounded-full border border-emerald-200">
                Quota Healthy
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Employee Seats</span>
                  <span>{u.employees_used} / {u.employees_limit}</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#07563D] h-full" style={{ width: `${(u.employees_used / u.employees_limit) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Storage Utilization</span>
                  <span>{u.storage_gb_used} GB / {u.storage_gb_limit} GB</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full" style={{ width: `${(u.storage_gb_used / u.storage_gb_limit) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Monthly API Calls</span>
                  <span>{(u.api_calls_used / 1000).toFixed(0)}k / {(u.api_calls_limit / 1000).toFixed(0)}k</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full" style={{ width: `${(u.api_calls_used / u.api_calls_limit) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>WhatsApp Quota</span>
                  <span>{u.whatsapp_sent.toLocaleString()} / {u.whatsapp_limit.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full" style={{ width: `${(u.whatsapp_sent / u.whatsapp_limit) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
