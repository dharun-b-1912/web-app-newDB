import React, { useState } from 'react';
import { SlidersHorizontal, GitFork, Check, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { platformAdminApi } from '../../../services/platformAdminApi';
import { FeatureFlagItem } from '../../../types/platformAdmin';

export const FeatureFlagsView: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlagItem[]>(() => platformAdminApi.getFeatureFlags());

  const handleToggle = (key: string) => {
    platformAdminApi.toggleFeatureFlag(key);
    setFlags(flags.map(f => (f.key === key ? { ...f, status: f.status === 'Active' ? 'Disabled' : 'Active' } : f)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Feature Flags & Module Registry</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Central feature flag evaluation engine, beta rollouts, and tenant-specific feature overrides.
          </p>
        </div>

        <button
          onClick={() => alert('Feature Flag Creation Modal')}
          className="flex items-center gap-2 px-4 py-2 bg-[#07563D] hover:bg-[#064733] text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Feature Flag
        </button>
      </div>

      {/* Feature Flags Grid */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Feature Key & Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Allowed Tiers</th>
                <th className="py-3 px-4">Overrides</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Toggle State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {flags.map(f => (
                <tr key={f.key} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900">{f.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{f.key}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 max-w-xs">{f.description}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {f.allowed_plans.map(plan => (
                        <span key={plan} className="px-2 py-0.5 bg-gray-100 text-gray-800 text-[10px] font-bold rounded-md">
                          {plan}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-700">{f.tenant_overrides_count} Tenants</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 font-bold text-[10px] rounded-md ${
                        f.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : f.status === 'Beta'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggle(f.key)}
                      className="p-1 text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer"
                    >
                      {f.status === 'Active' ? <ToggleRight className="w-7 h-7 text-[#07563D]" /> : <ToggleLeft className="w-7 h-7 text-gray-400" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
