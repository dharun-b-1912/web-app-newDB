// src/features/platform/subviews/DevelopmentRoadmapView.tsx
// ============================================================================
// Joy PeopleHR — Platform Portal: Post-Launch Development Roadmap
// Tracks Paused & Planned Modules without Exposing to Production Customers
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Workflow,
  Target,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { moduleRegistryService } from '../../../services/platform/moduleRegistryService';
import { ModuleRegistryItem } from '../../../types/moduleRegistry';

export const DevelopmentRoadmapView: React.FC = () => {
  const [modules, setModules] = useState<ModuleRegistryItem[]>([]);

  useEffect(() => {
    setModules(moduleRegistryService.getAllModules());

    const handleUpdate = () => {
      setModules(moduleRegistryService.getAllModules());
    };
    window.addEventListener('platform:module_status_changed', handleUpdate);
    return () => window.removeEventListener('platform:module_status_changed', handleUpdate);
  }, []);

  const pausedAndPlanned = modules.filter((m) => m.status === 'PAUSED' || m.status === 'DEVELOPMENT' || !m.launch_scope);
  const liveModules = modules.filter((m) => m.status === 'LIVE');

  const phases = [
    {
      id: 'phase_1',
      title: 'Phase 1: Production Launch (September 26, 2026)',
      tag: 'LAUNCH SCOPE FROZEN',
      items: liveModules,
      variant: 'live',
    },
    {
      id: 'phase_2',
      title: 'Phase 2: Enterprise Performance & Custom Reporting (Q4 2026)',
      tag: 'PLANNED POST-LAUNCH',
      items: modules.filter((m) => m.launch_scope_category === 'POST_LAUNCH_PHASE_2'),
      variant: 'phase2',
    },
    {
      id: 'phase_3',
      title: 'Phase 3: Learning Experience & Predictive AI Analytics (Q1 2027)',
      tag: 'PLANNED POST-LAUNCH',
      items: modules.filter((m) => m.launch_scope_category === 'POST_LAUNCH_PHASE_3'),
      variant: 'phase3',
    },
    {
      id: 'phase_4',
      title: 'Phase 4: Global Travel Desk & Automated Expense Fleet (Q2 2027)',
      tag: 'PLANNED POST-LAUNCH',
      items: modules.filter((m) => m.launch_scope_category === 'POST_LAUNCH_PHASE_4'),
      variant: 'phase4',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
            <Workflow className="w-4 h-4" />
            <span>Internal Engineering Roadmap</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Development Roadmap & Post-Launch Phases
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Internal Platform Control Plane for managing post-launch development cycles, component readiness, and dependencies.
          </p>
        </div>
      </div>

      {/* Phase Roadmap Streams */}
      <div className="space-y-8">
        {phases.map((phase) => (
          <div key={phase.id} className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#07563D]" />
                <h2 className="text-sm font-black text-gray-900">{phase.title}</h2>
              </div>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                phase.variant === 'live' ? 'bg-emerald-100 text-[#07563D]' : 'bg-amber-100 text-amber-900'
              }`}>
                {phase.tag}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phase.items.map((item) => (
                <Card
                  key={item.module_key}
                  className={`p-5 rounded-2xl border transition-all ${
                    item.status === 'LIVE'
                      ? 'border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20'
                      : 'border-amber-200/80 bg-white'
                  } shadow-2xs hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {item.module_key}
                    </span>
                    <Badge
                      variant={item.status === 'LIVE' ? 'emerald' : 'neutral'}
                      size="sm"
                      className="text-[10px] uppercase font-bold"
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 mt-2.5">{item.module_name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {item.development_notes || 'Feature specifications preserved.'}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400 font-medium">Readiness:</span>
                      <span className="font-bold text-gray-800">{item.completion_percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.status === 'LIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.completion_percentage}%` }}
                      />
                    </div>
                  </div>

                  {item.dependencies.length > 0 && (
                    <div className="mt-3 text-[10px] text-gray-400">
                      Dependencies: <span className="text-gray-600 font-medium">{item.dependencies.join(', ')}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
