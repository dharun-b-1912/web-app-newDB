// src/features/platform/subviews/FeatureFlagsView.tsx
// ============================================================
// WorkForceOS — Enterprise Feature Flag Management Console
// ============================================================

import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Sparkles, Sliders, Shield, Globe, Layers, AlertTriangle, Plus, Users } from 'lucide-react';
import { platformFeatureFlagService } from '../../../services/platform';
import { FeatureFlagItem } from '../../../types/platformAdmin';

export const FeatureFlagsView: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlagItem[]>(() => platformFeatureFlagService.getFeatureFlags());
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlagItem | null>(null);

  const handleToggle = async (key: string) => {
    const updated = await platformFeatureFlagService.toggleFeatureFlag(key);
    setFlags(flags.map(f => (f.key === key ? updated : f)));
  };

  const handleRolloutChange = async (key: string, pct: number) => {
    const updated = await platformFeatureFlagService.updateRolloutPercentage(key, pct);
    setFlags(flags.map(f => (f.key === key ? updated : f)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#07563D] border border-emerald-200 uppercase tracking-wider">
              Control Plane Flags
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono">Dynamic Entitlement Injection</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Global Feature Flags & Kill Switches</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Safely rollout experimental capabilities, gate features by subscription plan, and grant tenant beta overrides.
          </p>
        </div>
      </div>

      {/* Feature Flags List */}
      <div className="space-y-4">
        {flags.map(flag => {
          const isActive = flag.status === 'Active';
          const isBeta = flag.status === 'Beta';

          return (
            <div
              key={flag.key}
              className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 hover:border-emerald-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base font-black text-gray-900">{flag.name}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-100 text-[#07563D]'
                          : isBeta
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {flag.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                      Env: {flag.environment}
                    </span>
                    <span className="font-mono text-[11px] text-gray-400 font-bold">{flag.key}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{flag.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleToggle(flag.key)}
                    className="cursor-pointer transition-transform hover:scale-105"
                  >
                    {isActive || isBeta ? (
                      <ToggleRight className="w-9 h-9 text-[#07563D]" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom Config Row */}
              <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500 font-bold">Allowed Plans:</span>
                  {flag.allowed_plans.map(p => (
                    <span key={p} className="px-2 py-0.5 bg-emerald-50 text-[#07563D] font-black text-[10px] rounded-md border border-emerald-200">
                      {p}
                    </span>
                  ))}
                  {flag.tenant_overrides_count > 0 && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold text-[10px] rounded-md border border-purple-200">
                      {flag.tenant_overrides_count} Tenant Overrides Active
                    </span>
                  )}
                </div>

                {/* Rollout % Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-bold text-[11px]">Rollout:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={flag.rollout_percentage}
                    onChange={e => handleRolloutChange(flag.key, Number(e.target.value))}
                    className="w-24 accent-[#07563D] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-gray-900 w-10 text-right">{flag.rollout_percentage}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
