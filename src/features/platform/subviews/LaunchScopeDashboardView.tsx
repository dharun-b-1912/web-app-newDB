// src/features/platform/subviews/LaunchScopeDashboardView.tsx
// ============================================================================
// Joy PeopleHR — Platform Portal: September 26 Launch Scope Dashboard
// Certified Launch Progress & Operational Verification Gate
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Workflow,
  Lock,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { moduleRegistryService } from '../../../services/platform/moduleRegistryService';
import { LaunchScopeMetrics, ModuleRegistryItem } from '../../../types/moduleRegistry';

export const LaunchScopeDashboardView: React.FC = () => {
  const [metrics, setMetrics] = useState<LaunchScopeMetrics>({
    totalModules: 0,
    liveForLaunch: 0,
    betaModules: 0,
    pausedModules: 0,
    developmentModules: 0,
    hiddenModules: 0,
    launchReadinessPercentage: 0,
    certifiedModulesCount: 0,
  });
  const [modules, setModules] = useState<ModuleRegistryItem[]>([]);

  useEffect(() => {
    setMetrics(moduleRegistryService.getLaunchScopeMetrics());
    setModules(moduleRegistryService.getAllModules());

    const handleUpdate = () => {
      setMetrics(moduleRegistryService.getLaunchScopeMetrics());
      setModules(moduleRegistryService.getAllModules());
    };
    window.addEventListener('platform:module_status_changed', handleUpdate);
    return () => window.removeEventListener('platform:module_status_changed', handleUpdate);
  }, []);

  const liveModules = modules.filter((m) => m.status === 'LIVE');
  const pausedModules = modules.filter((m) => m.status === 'PAUSED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
            <Target className="w-4 h-4" />
            <span>Launch Readiness Center</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            September 26, 2026 SaaS Launch Scope
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Realtime verification matrix of certified launch-critical domains vs controlled paused features.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald" className="px-3 py-1 text-xs font-black">
            TARGET LAUNCH: 26 SEPT 2026
          </Badge>
        </div>
      </div>

      {/* Hero Progress Banner */}
      <Card className="bg-gradient-to-r from-[#073B2A] via-[#074D37] to-[#0B563D] text-white p-6 sm:p-7 rounded-3xl shadow-xl border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>LAUNCH SCOPE DISCIPLINE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Launch Readiness: {metrics.launchReadinessPercentage}%
            </h2>
            <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
              All {metrics.liveForLaunch} core launch modules are certified and frozen. Unfinished modules are quarantined behind the Platform Module Registry.
            </p>

            {/* Launch Progress Meter */}
            <div className="pt-2 max-w-md">
              <div className="w-full h-3 bg-emerald-950/80 rounded-full overflow-hidden border border-emerald-500/30 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${metrics.launchReadinessPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <div className="text-2xl font-black text-white">{metrics.liveForLaunch}</div>
              <div className="text-[10px] text-emerald-200 font-bold uppercase mt-0.5">LIVE For Launch</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <div className="text-2xl font-black text-amber-300">{metrics.pausedModules}</div>
              <div className="text-[10px] text-amber-200 font-bold uppercase mt-0.5">Paused (Post-Launch)</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center col-span-2 sm:col-span-1">
              <div className="text-2xl font-black text-emerald-300">{metrics.certifiedModulesCount}</div>
              <div className="text-[10px] text-emerald-200 font-bold uppercase mt-0.5">100% Certified</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Two Column Breakdown: Certified LIVE vs Paused Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certified LIVE for Launch */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-black text-gray-900">
                Live For Launch ({liveModules.length})
              </h2>
            </div>
            <span className="text-xs text-emerald-700 font-bold">100% Certified</span>
          </div>

          <div className="space-y-3">
            {liveModules.map((m) => (
              <Card key={m.module_key} className="p-4 rounded-2xl border-gray-200/80 shadow-2xs hover:border-emerald-300 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-gray-900">{m.module_name}</h3>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                        LIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{m.development_notes}</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Paused Post-Launch Modules */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-black text-gray-900">
                Paused Post-Launch ({pausedModules.length})
              </h2>
            </div>
            <span className="text-xs text-amber-700 font-bold">Code Preserved</span>
          </div>

          <div className="space-y-3">
            {pausedModules.map((m) => (
              <Card key={m.module_key} className="p-4 rounded-2xl border-amber-200/80 bg-gradient-to-br from-amber-50/20 to-white shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-gray-900">{m.module_name}</h3>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-black uppercase">
                        PAUSED
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{m.development_notes}</p>
                    <div className="mt-2 text-[10px] text-amber-800 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-amber-600" />
                      <span>Release: {m.planned_phase}</span>
                    </div>
                  </div>
                  <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
