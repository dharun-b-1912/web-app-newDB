// src/features/platform/subviews/FeatureFlagsView.tsx
// ============================================================
// WorkForceOS — Feature Flags & Product Capabilities Control Center
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Zap,
  Shield,
  Layers,
  Plus,
  Search,
  Filter,
  RefreshCw,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Activity,
  Users,
  Building2,
  Clock,
  HardDrive,
  Eye,
  ArrowRight,
  Sliders,
  TrendingUp,
  Cpu,
  Lock,
  Flame,
  Check,
  Minus,
  Download,
  RotateCcw,
  Sparkles,
  FileText,
  Save,
} from 'lucide-react';
import {
  ProductCapability,
  TenantCapabilityOverride,
  LifecycleStage,
  FeatureType,
  AccessExplanationResult,
} from '../../../types/productCapabilities';
import { platformCapabilitiesService } from '../../../services/platform/platformCapabilitiesService';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { cn } from '../../../lib/utils';

export const FeatureFlagsView: React.FC = () => {
  // -------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'rollouts' | 'overrides' | 'archived'>('overview');
  const [capabilities, setCapabilities] = useState<ProductCapability[]>(() =>
    platformCapabilitiesService.getCapabilities()
  );
  const [overrides, setOverrides] = useState<TenantCapabilityOverride[]>(() =>
    platformCapabilitiesService.getOverrides()
  );
  const metrics = useMemo(() => platformCapabilitiesService.getOverviewMetrics(), [capabilities, overrides]);

  // Rollout pending changes state
  const [pendingRollouts, setPendingRollouts] = useState<Record<string, number>>({});
  const [savingRollouts, setSavingRollouts] = useState<Record<string, boolean>>({});
  const [savedSuccessRollouts, setSavedSuccessRollouts] = useState<Record<string, boolean>>({});

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [lifecycleFilter, setLifecycleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals & Drawers
  const [selectedCapability, setSelectedCapability] = useState<ProductCapability | null>(null);
  const [manageSection, setManageSection] = useState<'overview' | 'access' | 'rollout' | 'dependencies' | 'usage' | 'history'>('overview');
  const [isAddFeatureOpen, setIsAddFeatureOpen] = useState(false);
  const [isCreateOverrideOpen, setIsCreateOverrideOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [killSwitchModalTarget, setKillSwitchModalTarget] = useState<ProductCapability | null>(null);
  const [killSwitchReason, setKillSwitchReason] = useState('');

  const refreshData = () => {
    setCapabilities(platformCapabilitiesService.getCapabilities());
    setOverrides(platformCapabilitiesService.getOverrides());
  };

  const handleSliderChange = (capId: string, value: number) => {
    setPendingRollouts((prev) => ({ ...prev, [capId]: value }));
    setSavedSuccessRollouts((prev) => ({ ...prev, [capId]: false }));
  };

  const handleCommitRollout = async (capId: string) => {
    const targetValue = pendingRollouts[capId];
    if (targetValue === undefined) return;

    setSavingRollouts((prev) => ({ ...prev, [capId]: true }));
    try {
      const updated = await platformCapabilitiesService.updateRollout(capId, targetValue);
      setCapabilities((prev) => prev.map((c) => (c.id === capId ? { ...updated } : c)));
      if (selectedCapability?.id === capId) setSelectedCapability({ ...updated });
      setPendingRollouts((prev) => {
        const next = { ...prev };
        delete next[capId];
        return next;
      });
      setSavedSuccessRollouts((prev) => ({ ...prev, [capId]: true }));
      setTimeout(() => {
        setSavedSuccessRollouts((prev) => ({ ...prev, [capId]: false }));
      }, 2500);
    } finally {
      setSavingRollouts((prev) => ({ ...prev, [capId]: false }));
    }
  };

  const handleToggleKillSwitch = async (cap: ProductCapability) => {
    if (cap.status === 'Kill-Switched') {
      const restored = await platformCapabilitiesService.restoreKillSwitch(cap.id, 'Super Admin manual restoration');
      setCapabilities(capabilities.map((c) => (c.id === cap.id ? { ...restored } : c)));
      if (selectedCapability?.id === cap.id) setSelectedCapability({ ...restored });
    } else {
      setKillSwitchModalTarget(cap);
      setKillSwitchReason('');
    }
  };

  const handleConfirmKillSwitch = async () => {
    if (!killSwitchModalTarget || !killSwitchReason.trim()) return;
    const disabled = await platformCapabilitiesService.emergencyKillSwitch(killSwitchModalTarget.id, killSwitchReason);
    setCapabilities(capabilities.map((c) => (c.id === killSwitchModalTarget.id ? { ...disabled } : c)));
    if (selectedCapability?.id === killSwitchModalTarget.id) setSelectedCapability({ ...disabled });
    setKillSwitchModalTarget(null);
  };

  const handleDeleteOverride = async (overrideId: string) => {
    await platformCapabilitiesService.deleteOverride(overrideId);
    refreshData();
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Feature Flags & Capabilities</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              ● Feature Engine Healthy
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Manage product capabilities, controlled rollouts, plan access, tenant overrides, and feature lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExplainOpen(true)}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <HelpCircle className="h-4 w-4 text-[#64748B]" />
            Explain Access
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompareOpen(true)}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Eye className="h-4 w-4 text-[#64748B]" />
            Compare Capabilities
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddFeatureOpen(true)}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#036246] text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            + Add Feature
          </Button>
        </div>
      </div>

      {/* 2. Main 5 Navigation Tabs */}
      <div className="border-b border-[#E2E8F0]">
        <div className="flex items-center gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: Activity, count: null },
            { id: 'features', label: 'Features', icon: SlidersHorizontal, count: capabilities.filter((c) => c.lifecycle !== 'Archived').length },
            { id: 'rollouts', label: 'Rollouts', icon: TrendingUp, count: capabilities.filter((c) => c.rollout_percentage > 0 && c.rollout_percentage < 100).length },
            { id: 'overrides', label: 'Tenant Overrides', icon: Building2, count: overrides.length },
            { id: 'archived', label: 'Archived', icon: HardDrive, count: capabilities.filter((c) => c.lifecycle === 'Archived' || c.lifecycle === 'Deprecated').length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer',
                  isActive
                    ? 'border-[#047857] text-[#047857]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172B] hover:border-[#CBD5E1]'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#047857]' : 'text-[#94A3B8]')} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------
          TAB 1: OVERVIEW
         --------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 6 Real KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B] block">Total Features</span>
              <strong className="text-2xl font-bold text-[#0F172B] block mt-1">{metrics.total_features}</strong>
              <span className="text-[10px] text-[#64748B]">Across 10 HRMS modules</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B] block">Live Features</span>
              <strong className="text-2xl font-bold text-[#047857] block mt-1">{metrics.live_features}</strong>
              <span className="text-[10px] text-[#047857] font-semibold">100% GA Deployed</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B] block">In Beta</span>
              <strong className="text-2xl font-bold text-[#D97706] block mt-1">{metrics.in_beta}</strong>
              <span className="text-[10px] text-[#D97706] font-semibold">Controlled Testing</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B] block">Rolling Out</span>
              <strong className="text-2xl font-bold text-[#2563EB] block mt-1">{metrics.rolling_out}</strong>
              <span className="text-[10px] text-[#2563EB]">Canary / Staged</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B] block">Tenant Overrides</span>
              <strong className="text-2xl font-bold text-[#0F172B] block mt-1">{metrics.tenant_overrides}</strong>
              <span className="text-[10px] text-[#64748B]">Active exceptions</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <span className="text-[11px] font-semibold text-[#64748B] block">Needs Attention</span>
              <strong className="text-2xl font-bold text-[#DC2626] block mt-1">{metrics.needs_attention}</strong>
              <span className="text-[10px] text-[#DC2626] font-semibold">Gaps & Dependencies</span>
            </div>
          </div>

          {/* Attention Items & Release Activity Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Features Needing Attention */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                  <h3 className="font-bold text-sm text-[#0F172B]">Features Needing Attention</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                  {metrics.attention_items.length} Action Items
                </span>
              </div>

              <div className="space-y-2.5">
                {metrics.attention_items.length === 0 ? (
                  <div className="p-6 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] text-xs text-[#64748B]">
                    <CheckCircle2 className="h-5 w-5 text-[#047857] mx-auto mb-1.5" />
                    <span className="font-bold text-[#0F172B] block">All Capabilities Nominal</span>
                    Zero unresolved dependencies or kill-switches active.
                  </div>
                ) : (
                  metrics.attention_items.map((att) => (
                    <div
                      key={att.id}
                      className="p-3.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#991B1B]">{att.title}</div>
                        <div className="text-[10px] text-[#B91C1C] font-mono">{att.feature_code}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const target = capabilities.find((c) => c.code === att.feature_code);
                          if (target) {
                            setSelectedCapability(target);
                            setManageSection('dependencies');
                          }
                        }}
                        className="text-xs text-[#DC2626] border-[#FCA5A5] bg-white hover:bg-[#FEF2F2] whitespace-nowrap cursor-pointer"
                      >
                        {att.action}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Release Activity Stream */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#047857]" />
                  <h3 className="font-bold text-sm text-[#0F172B]">Recent Feature Activity</h3>
                </div>
                <span className="text-[11px] text-[#64748B]">Real-time stream</span>
              </div>

              <div className="space-y-3">
                {metrics.recent_activity.length === 0 ? (
                  <div className="p-6 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] text-xs text-[#64748B]">
                    <Clock className="h-5 w-5 text-[#94A3B8] mx-auto mb-1.5" />
                    <span className="font-bold text-[#0F172B] block">No Recent Flag Mutations</span>
                    Rollout and override adjustments will stream live here.
                  </div>
                ) : (
                  metrics.recent_activity.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs border-b border-[#F1F5F9] pb-2.5 last:border-0 last:pb-0">
                      <span className="font-mono text-[10px] text-[#64748B] pt-0.5 w-12 flex-shrink-0">{act.time}</span>
                      <div className="flex-1 space-y-0.5">
                        <div className="font-bold text-[#0F172B]">{act.title}</div>
                        <div className="text-[10px] text-[#64748B]">
                          Actor: <strong>{act.actor}</strong> • Feature: <span className="font-mono">{act.feature}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const target = capabilities.find((c) => c.code === act.feature);
                          if (target) {
                            setSelectedCapability(target);
                            setManageSection('overview');
                          }
                        }}
                        className="text-xs text-[#047857] hover:bg-[#ECFDF5] cursor-pointer"
                      >
                        View →
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 2: FEATURES (Dense Searchable Management Table)
         --------------------------------------------------------- */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search feature name, code, module, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#047857]"
                />
              </div>

              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#334155]"
              >
                <option value="All">All Modules</option>
                <option value="Core HR">Core HR</option>
                <option value="Attendance">Attendance</option>
                <option value="Leave">Leave</option>
                <option value="Payroll">Payroll</option>
                <option value="Recruitment">Recruitment</option>
                <option value="Communication">Communication</option>
                <option value="Biometrics">Biometrics</option>
                <option value="AI Capabilities">AI Capabilities</option>
              </select>

              <select
                value={lifecycleFilter}
                onChange={(e) => setLifecycleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white text-[#334155]"
              >
                <option value="All">All Lifecycle Stages</option>
                <option value="Planned">Planned</option>
                <option value="Development">Development</option>
                <option value="Internal Testing">Internal Testing</option>
                <option value="Beta">Beta</option>
                <option value="Early Access">Early Access</option>
                <option value="General Availability">General Availability</option>
                <option value="Deprecated">Deprecated</option>
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddFeatureOpen(true)}
              className="text-xs bg-[#047857] hover:bg-[#036246] text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> + Add Feature
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Feature & Code</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Lifecycle Stage</th>
                    <th className="py-3 px-4">Plan Access</th>
                    <th className="py-3 px-4">Rollout</th>
                    <th className="py-3 px-4">Enabled Tenants</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {capabilities
                    .filter((c) => {
                      const matchModule = moduleFilter === 'All' || c.module === moduleFilter;
                      const matchStage = lifecycleFilter === 'All' || c.lifecycle === lifecycleFilter;
                      const q = searchQuery.toLowerCase().trim();
                      const matchSearch =
                        !q ||
                        c.name.toLowerCase().includes(q) ||
                        c.code.toLowerCase().includes(q) ||
                        c.module.toLowerCase().includes(q) ||
                        c.description.toLowerCase().includes(q);
                      return matchModule && matchStage && matchSearch;
                    })
                    .map((cap) => (
                      <tr key={cap.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0F172B]">{cap.name}</div>
                          <div className="font-mono text-[10px] text-[#64748B]">{cap.code}</div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[#334155]">{cap.module}</td>

                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-bold',
                              cap.lifecycle === 'General Availability'
                                ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                                : cap.lifecycle === 'Beta'
                                ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                : cap.lifecycle === 'Early Access'
                                ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                                : 'bg-[#F1F5F9] text-[#64748B]'
                            )}
                          >
                            {cap.lifecycle === 'General Availability' ? 'GA' : cap.lifecycle}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-[#0F172B]">
                          {cap.allowed_plans.includes('Starter')
                            ? 'All Plans'
                            : `${cap.allowed_plans[0]}+`}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#047857] rounded-full"
                                style={{ width: `${cap.rollout_percentage}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-[#0F172B]">{cap.rollout_percentage}%</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-[#334155]">
                          {cap.enabled_tenants_count} / {cap.eligible_tenants_count}
                        </td>

                        <td className="py-3.5 px-4">
                          {cap.status === 'Kill-Switched' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]">
                              ⚠ Kill-Switched
                            </span>
                          ) : cap.status === 'Active' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ECFDF5] text-[#047857]">
                              ● Active
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#F1F5F9] text-[#64748B]">
                              Draft
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCapability(cap);
                              setManageSection('overview');
                            }}
                            className="text-xs text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5]"
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
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 3: ROLLOUTS (Canary & Progressive Releases)
         --------------------------------------------------------- */}
      {activeTab === 'rollouts' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#0F172B]">Controlled Staged Rollouts & Canaries</h3>
              <p className="text-xs text-[#64748B]">
                Gradually increase rollout percentage to eligible customer cohorts with automatic health verification.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#047857] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
              Automated Rollback Protection: Active (Error &gt; 5%)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((cap) => {
              const currentVal = pendingRollouts[cap.id] !== undefined ? pendingRollouts[cap.id] : cap.rollout_percentage;
              const isChanged = pendingRollouts[cap.id] !== undefined && pendingRollouts[cap.id] !== cap.rollout_percentage;
              const isSaving = !!savingRollouts[cap.id];
              const isSaved = !!savedSuccessRollouts[cap.id];

              return (
                <div key={cap.id} className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 font-sans">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#64748B]">{cap.module}</span>
                      <h4 className="font-bold text-sm text-[#0F172B]">{cap.name}</h4>
                      <span className="font-mono text-[10px] text-[#64748B]">{cap.code}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
                      {cap.lifecycle}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Rollout Cohort:</span>
                      <div className="flex items-center gap-2">
                        <strong className={cn('text-sm font-bold', isChanged ? 'text-[#D97706]' : 'text-[#047857]')}>
                          {currentVal}%
                        </strong>
                        {isChanged && (
                          <span className="text-[10px] bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-md font-semibold">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={currentVal}
                      onChange={(e) => handleSliderChange(cap.id, Number(e.target.value))}
                      className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#047857]"
                    />
                    <div className="flex justify-between text-[10px] text-[#64748B]">
                      <span>0% (Disabled)</span>
                      <span>25% (Canary)</span>
                      <span>50% (Half)</span>
                      <span>100% (GA)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
                    <div className="p-2 bg-[#F8FAFC] rounded-lg">
                      <span className="text-[10px] text-[#64748B] block">Enabled</span>
                      <strong className="text-[#0F172B]">{cap.enabled_tenants_count} Tenants</strong>
                    </div>
                    <div className="p-2 bg-[#F8FAFC] rounded-lg">
                      <span className="text-[10px] text-[#64748B] block">Error Rate</span>
                      <strong className={cap.error_rate_pct > 2 ? 'text-[#DC2626]' : 'text-[#047857]'}>
                        {cap.error_rate_pct}%
                      </strong>
                    </div>
                    <div className="p-2 bg-[#F8FAFC] rounded-lg">
                      <span className="text-[10px] text-[#64748B] block">Latency</span>
                      <strong className="text-[#0F172B]">{cap.latency_ms} ms</strong>
                    </div>
                  </div>

                  {/* Save / Commit Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                    <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                      {isSaved ? (
                        <span className="text-[#047857] font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Rollout Committed & Synced
                        </span>
                      ) : isChanged ? (
                        <span className="text-[#D97706] font-semibold">Unsaved rollout percentage</span>
                      ) : (
                        <span>Status: Synchronized with database mesh</span>
                      )}
                    </div>

                    {isChanged && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => handleCommitRollout(cap.id)}
                        className="text-xs bg-[#047857] hover:bg-[#036246] text-white flex items-center gap-1.5 shadow-sm font-semibold cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? 'Committing...' : 'Save Rollout'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 4: TENANT OVERRIDES
         --------------------------------------------------------- */}
      {activeTab === 'overrides' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-[#0F172B]">Explicit Tenant Beta Overrides</h3>
              <p className="text-xs text-[#64748B]">
                Grant or deny specific client organizations access to capabilities outside normal plan boundaries.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOverrideOpen(true)}
              className="text-xs bg-[#047857] hover:bg-[#036246] text-white whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> + Create Override
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                  <th className="py-3 px-4">Tenant & ID</th>
                  <th className="py-3 px-4">Feature Capability</th>
                  <th className="py-3 px-4">Override State</th>
                  <th className="py-3 px-4">Business Reason</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {overrides.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#64748B]">
                      <SlidersHorizontal className="h-6 w-6 text-[#94A3B8] mx-auto mb-2" />
                      <div className="font-bold text-sm text-[#0F172B]">No Tenant Overrides Configured</div>
                      <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-0.5">
                        All client organizations inherit standard plan boundaries and rollout percentages. Click &quot;+ Create Override&quot; to whitelist a tenant.
                      </p>
                    </td>
                  </tr>
                ) : (
                  overrides.map((ov) => (
                  <tr key={ov.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-4 font-bold text-[#0F172B]">
                      <div>{ov.tenant_name}</div>
                      <div className="text-[10px] text-[#94A3B8] font-mono font-normal">{ov.tenant_id}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#0F172B]">{ov.capability_name}</div>
                      <div className="text-[10px] text-[#64748B] font-mono">{ov.capability_code}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-bold',
                          ov.override_state === 'Enabled'
                            ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                            : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                        )}
                      >
                        {ov.override_state}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#475569] max-w-xs">{ov.reason}</td>

                    <td className="py-3.5 px-4 text-[#64748B]">{ov.created_by}</td>

                    <td className="py-3.5 px-4 font-mono text-[#64748B]">
                      {ov.expires_at || 'Permanent / No Expiry'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteOverride(ov.id)}
                        className="text-xs text-[#DC2626] hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 5: ARCHIVED & DEPRECATED CAPABILITIES
         --------------------------------------------------------- */}
      {activeTab === 'archived' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
            <h3 className="font-bold text-sm text-[#0F172B]">Archived & Deprecated Capabilities</h3>
            <p className="text-xs text-[#64748B]">
              Phased-out legacy capabilities with migration mapping to new v2 architectures.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-6 text-center space-y-2 text-xs text-[#64748B]">
            <HardDrive className="h-8 w-8 text-[#94A3B8] mx-auto" />
            <div className="font-bold text-[#0F172B]">All legacy migrations currently complete</div>
            <p className="max-w-md mx-auto">
              When a capability reaches end-of-life, transition its lifecycle stage to <strong>Deprecated</strong> or <strong>Archived</strong> from the feature management drawer.
            </p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          FEATURE DETAIL DRAWER (6 Sub-tabs + Kill Switch)
         --------------------------------------------------------- */}
      {selectedCapability && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col border-l border-[#E2E8F0] overflow-hidden text-xs">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC] flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#0F172B]">{selectedCapability.name}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 bg-[#E2E8F0] rounded text-[#475569]">
                    {selectedCapability.code}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-bold',
                      selectedCapability.status === 'Kill-Switched'
                        ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]'
                        : 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                    )}
                  >
                    ● {selectedCapability.status}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">{selectedCapability.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleKillSwitch(selectedCapability)}
                  className={cn(
                    'text-xs font-bold',
                    selectedCapability.status === 'Kill-Switched'
                      ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                      : 'text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEF2F2]'
                  )}
                >
                  {selectedCapability.status === 'Kill-Switched' ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore Feature
                    </>
                  ) : (
                    <>
                      <Flame className="h-3.5 w-3.5 mr-1" /> ⚠ Emergency Kill Switch
                    </>
                  )}
                </Button>

                <button
                  onClick={() => setSelectedCapability(null)}
                  className="p-1.5 text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#E2E8F0] rounded-lg transition-colors ml-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 6 Sub-navigation Tabs */}
            <div className="border-b border-[#E2E8F0] px-5 bg-white flex-shrink-0">
              <div className="flex items-center gap-6">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'access', label: 'Plan Entitlements', icon: Layers },
                  { id: 'rollout', label: 'Rollout & Canary', icon: TrendingUp },
                  { id: 'dependencies', label: 'Dependencies', icon: Cpu },
                  { id: 'usage', label: 'Usage & Health', icon: Activity },
                  { id: 'history', label: 'Audit History', icon: Clock },
                ].map((sec) => {
                  const Icon = sec.icon;
                  const isActive = manageSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setManageSection(sec.id as any)}
                      className={cn(
                        'py-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer',
                        isActive
                          ? 'border-[#047857] text-[#047857]'
                          : 'border-transparent text-[#64748B] hover:text-[#0F172B]'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#047857]' : 'text-[#94A3B8]')} />
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Section 1: Overview & Readiness Score */}
              {manageSection === 'overview' && (
                <div className="space-y-6">
                  {/* Basic Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Product & Module</span>
                      <strong className="text-xs text-[#0F172B]">{selectedCapability.product} • {selectedCapability.module}</strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Feature Type</span>
                      <strong className="text-xs text-[#0F172B]">{selectedCapability.type}</strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Lifecycle Stage</span>
                      <strong className="text-xs text-[#047857]">{selectedCapability.lifecycle}</strong>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Environment</span>
                      <strong className="text-xs text-[#0F172B]">{selectedCapability.environment}</strong>
                    </div>
                  </div>

                  {/* Owners */}
                  <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] space-y-2">
                    <span className="font-bold text-xs text-[#0F172B]">Operational Ownership:</span>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>Product Owner: <strong>{selectedCapability.owners.product}</strong></div>
                      <div>Engineering Owner: <strong>{selectedCapability.owners.engineering}</strong></div>
                      <div>Support Pod: <strong>{selectedCapability.owners.support}</strong></div>
                    </div>
                  </div>

                  {/* Implementation Readiness Score Checklist */}
                  <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#0F172B]">Implementation Readiness Checklist</span>
                        <p className="text-[10px] text-[#64748B]">All 6 items required before General Availability release</p>
                      </div>
                      <span className="text-sm font-extrabold text-[#047857] bg-white px-3 py-1 rounded-full border border-[#A7F3D0]">
                        {selectedCapability.readiness_score}% Complete
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {Object.entries(selectedCapability.readiness_checklist).map(([key, val]) => (
                        <div key={key} className="p-2.5 bg-white rounded-xl border flex items-center justify-between">
                          <span className="capitalize text-[#334155]">{key} Layer</span>
                          {val ? (
                            <CheckCircle2 className="h-4 w-4 text-[#047857]" />
                          ) : (
                            <XCircle className="h-4 w-4 text-[#DC2626]" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Access & Plans */}
              {manageSection === 'access' && (
                <div className="space-y-4">
                  <div>
                    <span className="font-bold text-sm text-[#0F172B]">Subscription Tier Entitlement Access</span>
                    <p className="text-[11px] text-[#64748B]">
                      Which plan packages include technical access to this capability.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {(['Starter', 'Professional', 'Business', 'Enterprise'] as const).map((plan) => {
                      const isIncluded = selectedCapability.allowed_plans.includes(plan);
                      return (
                        <div
                          key={plan}
                          onClick={() => {
                            const nextPlans = isIncluded
                              ? selectedCapability.allowed_plans.filter((p) => p !== plan)
                              : [...selectedCapability.allowed_plans, plan];
                            platformCapabilitiesService.updateCapability(selectedCapability.id, { allowed_plans: nextPlans });
                            setSelectedCapability({ ...selectedCapability, allowed_plans: nextPlans });
                            refreshData();
                          }}
                          className={cn(
                            'p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
                            isIncluded ? 'bg-[#ECFDF5] border-[#A7F3D0]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                          )}
                        >
                          <div>
                            <div className="font-bold text-sm text-[#0F172B]">{plan} Plan</div>
                            <div className="text-[10px] text-[#64748B]">
                              {isIncluded ? 'Feature enabled for this tier' : 'Feature locked / gated'}
                            </div>
                          </div>
                          <input type="checkbox" checked={isIncluded} readOnly className="h-4 w-4 text-[#047857]" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 3: Rollout & Safety */}
              {manageSection === 'rollout' && (
                <div className="space-y-4">
                  <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-4">
                    <span className="font-bold text-sm text-[#0F172B]">Staged Percentage Rollout</span>

                    {(() => {
                      const drawerVal = pendingRollouts[selectedCapability.id] !== undefined ? pendingRollouts[selectedCapability.id] : selectedCapability.rollout_percentage;
                      const isDrawerChanged = pendingRollouts[selectedCapability.id] !== undefined && pendingRollouts[selectedCapability.id] !== selectedCapability.rollout_percentage;
                      const isDrawerSaving = !!savingRollouts[selectedCapability.id];
                      const isDrawerSaved = !!savedSuccessRollouts[selectedCapability.id];

                      return (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#64748B]">Current Production Rollout:</span>
                              <div className="flex items-center gap-2">
                                <strong className={cn('text-base font-bold', isDrawerChanged ? 'text-[#D97706]' : 'text-[#047857]')}>
                                  {drawerVal}%
                                </strong>
                                {isDrawerChanged && (
                                  <span className="text-[10px] bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-md font-semibold">
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={drawerVal}
                              onChange={(e) => handleSliderChange(selectedCapability.id, Number(e.target.value))}
                              className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#047857]"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="text-[11px] text-[#64748B]">
                              {isDrawerSaved ? (
                                <span className="text-[#047857] font-semibold flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Rollout Committed & Synced
                                </span>
                              ) : isDrawerChanged ? (
                                <span className="text-[#D97706] font-semibold">Unsaved rollout percentage</span>
                              ) : (
                                <span>Status: Synchronized with database mesh</span>
                              )}
                            </div>

                            {isDrawerChanged && (
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={isDrawerSaving}
                                onClick={() => handleCommitRollout(selectedCapability.id)}
                                className="text-xs bg-[#047857] hover:bg-[#036246] text-white flex items-center gap-1.5 shadow-sm font-semibold cursor-pointer"
                              >
                                <Save className="h-3.5 w-3.5" />
                                {isDrawerSaving ? 'Committing...' : 'Save Rollout'}
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    <div className="pt-3 border-t flex justify-between items-center text-xs">
                      <div>
                        <div className="font-semibold text-[#0F172B]">Automatic Rollback Trigger</div>
                        <div className="text-[10px] text-[#64748B]">Automatically pause rollout if error rate exceeds 5%</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ECFDF5] text-[#047857]">
                        Protected
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4: Dependencies */}
              {manageSection === 'dependencies' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border space-y-2">
                    <span className="font-bold text-xs text-[#0F172B]">Prerequisite Capabilities (Requires):</span>
                    {selectedCapability.dependencies.requires.map((req) => (
                      <div key={req} className="p-2 bg-white rounded-lg border font-mono text-xs text-[#047857] flex items-center gap-2">
                        <Check className="h-3.5 w-3.5" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border space-y-2">
                    <span className="font-bold text-xs text-[#0F172B]">Conflicting Capabilities (Conflicts With):</span>
                    {selectedCapability.dependencies.conflicts.length === 0 ? (
                      <div className="text-[11px] text-[#64748B]">No conflicting capabilities registered.</div>
                    ) : (
                      selectedCapability.dependencies.conflicts.map((conf) => (
                        <div key={conf} className="p-2 bg-white rounded-lg border font-mono text-xs text-[#DC2626] flex items-center gap-2">
                          <X className="h-3.5 w-3.5" />
                          <span>{conf}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Section 5: Usage & Health */}
              {manageSection === 'usage' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Availability SLA</span>
                      <strong className="text-base text-[#047857]">{selectedCapability.availability_pct}%</strong>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Service Latency</span>
                      <strong className="text-base text-[#0F172B]">{selectedCapability.latency_ms} ms</strong>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border">
                      <span className="text-[10px] text-[#64748B] block">Active User Sessions</span>
                      <strong className="text-base text-[#0F172B]">{selectedCapability.active_users_count}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 6: History */}
              {manageSection === 'history' && (
                <div className="space-y-3">
                  <span className="font-bold text-xs text-[#0F172B]">Capability Modification Trail:</span>
                  <div className="space-y-2">
                    {selectedCapability.history.map((h) => (
                      <div key={h.id} className="p-3 bg-[#F8FAFC] rounded-xl border text-xs space-y-1">
                        <div className="flex justify-between font-mono text-[10px] text-[#64748B]">
                          <span>{h.timestamp}</span>
                          <span>{h.actor}</span>
                        </div>
                        <div className="font-bold text-[#0F172B]">{h.change_summary}</div>
                        {h.before_value && (
                          <div className="text-[11px] text-[#475569]">
                            {h.before_value} → {h.after_value}
                          </div>
                        )}
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
          EMERGENCY KILL SWITCH MODAL
         --------------------------------------------------------- */}
      {killSwitchModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#FCA5A5] space-y-4 text-xs">
            <div className="flex items-center gap-2 text-[#DC2626]">
              <Flame className="h-6 w-6 flex-shrink-0" />
              <h3 className="text-base font-bold">Emergency Feature Kill Switch</h3>
            </div>

            <p className="text-[#334155] leading-relaxed">
              This will immediately disable <strong className="text-[#0F172B]">{killSwitchModalTarget.name}</strong> across{' '}
              <strong>{killSwitchModalTarget.enabled_tenants_count} organizations</strong>. Use only for critical security or data corruption risks.
            </p>

            <div>
              <label className="font-bold text-[#334155] block mb-1">
                Mandatory Kill Switch Reason <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Critical security patch deployment / incident SEV-1..."
                value={killSwitchReason}
                onChange={(e) => setKillSwitchReason(e.target.value)}
                className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setKillSwitchModalTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!killSwitchReason.trim()}
                onClick={handleConfirmKillSwitch}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold"
              >
                Execute Kill Switch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          EXPLAIN ACCESS DIAGNOSTIC MODAL ("Why is this enabled?")
         --------------------------------------------------------- */}
      {isExplainOpen && (
        <ExplainAccessModal
          capabilities={capabilities}
          onClose={() => setIsExplainOpen(false)}
        />
      )}

      {/* ---------------------------------------------------------
          COMPARE CAPABILITIES MODAL
         --------------------------------------------------------- */}
      {isCompareOpen && (
        <CompareCapabilitiesModal
          capabilities={capabilities}
          onClose={() => setIsCompareOpen(false)}
        />
      )}

      {/* ---------------------------------------------------------
          NEW FEATURE CAPABILITY CREATION SYSTEM (4-Step Guided Flow)
         --------------------------------------------------------- */}
      {isAddFeatureOpen && (
        <CreateFeatureModal
          onClose={() => setIsAddFeatureOpen(false)}
          onCreated={(newCap) => {
            setIsAddFeatureOpen(false);
            refreshData();
            if (newCap) {
              setSelectedCapability(newCap);
              setManageSection('overview');
            }
          }}
          onNavigateRollout={() => {
            setIsAddFeatureOpen(false);
            refreshData();
            setActiveTab('rollouts');
          }}
        />
      )}

      {/* ---------------------------------------------------------
          CREATE TENANT OVERRIDE MODAL
         --------------------------------------------------------- */}
      {isCreateOverrideOpen && (
        <CreateOverrideModal
          capabilities={capabilities}
          onClose={() => setIsCreateOverrideOpen(false)}
          onCreated={() => {
            setIsCreateOverrideOpen(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
};

/**
 * ============================================================
 * WORKFORCEOS — ENTERPRISE FEATURE CAPABILITY CREATION WIZARD
 * Progressive 4-Step Guided Flow with Full Safety & Entitlements
 * ============================================================
 */
interface CreateFeatureModalProps {
  onClose: () => void;
  onCreated: (cap?: ProductCapability) => void;
  onNavigateRollout: () => void;
}

const CreateFeatureModal: React.FC<CreateFeatureModalProps> = ({
  onClose,
  onCreated,
  onNavigateRollout,
}) => {
  // Wizard Steps
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<ProductCapability | null>(null);

  // -------------------------------------------------------------
  // STEP 1: FEATURE IDENTITY
  // -------------------------------------------------------------
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [module, setModule] = useState('Core HR');
  const [type, setType] = useState<FeatureType>('Boolean');
  const [description, setDescription] = useState('');
  const [ownerTeam, setOwnerTeam] = useState('Platform');
  const [ownerLead, setOwnerLead] = useState('');
  const [tags, setTags] = useState<string[]>(['core', 'enterprise']);
  const [newTagInput, setNewTagInput] = useState('');

  // -------------------------------------------------------------
  // STEP 2: ACCESS & ENTITLEMENTS
  // -------------------------------------------------------------
  const [plans, setPlans] = useState<('Starter' | 'Professional' | 'Business' | 'Enterprise')[]>([
    'Professional',
    'Business',
    'Enterprise',
  ]);
  const [defaultAccess, setDefaultAccess] = useState<'Disabled' | 'SelectedPlans' | 'AllPlans'>('Disabled');
  const [allowTenantOverrides, setAllowTenantOverrides] = useState(true);
  const [overrideMode, setOverrideMode] = useState<'Both' | 'EnableOnly' | 'DisableOnly'>('Both');
  const [roleRestrictions, setRoleRestrictions] = useState<string[]>([
    'Tenant Admin',
    'HR Admin',
  ]);
  const [hasUsageLimits, setHasUsageLimits] = useState(false);
  const [quotaAmount, setQuotaAmount] = useState<number>(500);
  const [quotaUnit, setQuotaUnit] = useState('Employees');
  const [quotaPeriod, setQuotaPeriod] = useState('Monthly');

  // -------------------------------------------------------------
  // STEP 3: ROLLOUT & SAFETY
  // -------------------------------------------------------------
  const [environment, setEnvironment] = useState<'Staging' | 'Production' | 'Development'>('Staging');
  const [initialStatus, setInitialStatus] = useState<'Draft' | 'Beta' | 'Active' | 'Disabled'>('Draft');
  const [rolloutStrategy, setRolloutStrategy] = useState<'Manual' | 'Percentage' | 'Plan Based' | 'Tenant Allowlist' | 'Gradual Rollout'>('Percentage');
  const [rolloutPercentage, setRolloutPercentage] = useState<number>(0);
  const [isBeta, setIsBeta] = useState(false);
  const [betaAccessScope, setBetaAccessScope] = useState<'Selected tenants' | 'Selected enterprise plans' | 'Internal users only'>('Selected tenants');
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(true);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [newDepInput, setNewDepInput] = useState('');

  // Modules list from centralized service
  const modulesList = useMemo(() => platformCapabilitiesService.getModules(), []);

  // Real-time code availability check
  const codeStatus = useMemo(() => {
    if (!code.trim()) return null;
    return platformCapabilitiesService.checkFeatureCodeAvailability(code);
  }, [code]);

  // Auto-sync code from name if user hasn't explicitly customized it
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isCodeManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9\s_]/g, '')
        .trim()
        .replace(/\s+/g, '.');
      const modPrefix = module.toLowerCase().replace(/\s+/g, '_');
      setCode(generated ? `${modPrefix}.${generated}` : '');
    }
  };

  const handleAddTag = () => {
    const val = newTagInput.trim().toLowerCase();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const handleAddDependency = () => {
    const val = newDepInput.trim().toLowerCase();
    if (val && !dependencies.includes(val)) {
      setDependencies([...dependencies, val]);
      setNewDepInput('');
    }
  };

  const handleRemoveDependency = (d: string) => {
    setDependencies(dependencies.filter((x) => x !== d));
  };

  const toggleAllPlans = () => {
    if (plans.length === 4) {
      setPlans([]);
    } else {
      setPlans(['Starter', 'Professional', 'Business', 'Enterprise']);
    }
  };

  // Step Validation Logic
  const isStep1Valid = name.trim().length >= 3 && code.trim().length >= 3 && (codeStatus?.available ?? false);
  const isStep2Valid = plans.length > 0;
  const isStep3Valid = rolloutPercentage >= 0 && rolloutPercentage <= 100;

  // Final Submission
  const handleCreateFeature = async () => {
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newCap = await platformCapabilitiesService.createCapability({
        name: name.trim(),
        code: code.trim().toLowerCase(),
        module,
        description: description.trim() || `Enterprise capability for ${name}`,
        type,
        lifecycle: isBeta ? 'Beta' : initialStatus === 'Draft' ? 'Development' : 'General Availability',
        environment,
        status: initialStatus === 'Disabled' ? 'Draft' : 'Active',
        default_enabled: defaultAccess !== 'Disabled',
        allowed_plans: plans,
        rollout_percentage: rolloutPercentage,
        owner_team: ownerTeam,
        owners: {
          product: ownerLead ? `${ownerLead} (${ownerTeam} Team)` : `${ownerTeam} Product Lead`,
          engineering: 'Core Engineering Lead',
          support: 'Support Tier-2',
        },
        tags,
        dependencies: {
          requires: dependencies,
          conflicts: [],
          recommended: [],
        },
        readiness_score: dependencies.length > 0 ? 85 : 100,
        rollback_policy: {
          auto_rollback_enabled: killSwitchEnabled,
          max_error_rate_pct: 5.0,
        },
      });

      setCreatedResult(newCap);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to persist feature capability to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setCreatedResult(null);
    setStep(1);
    setName('');
    setCode('');
    setIsCodeManuallyEdited(false);
    setDescription('');
    setRolloutPercentage(0);
    setDependencies([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E2E8F0] overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div>
            <h3 className="text-lg font-bold text-[#0F172B]">Create Feature Capability</h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Define product capability identity, plan entitlements, rollout safety, and deployment scope.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4-Step Progress Indicator */}
        {!createdResult && (
          <div className="px-6 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <div className="flex items-center justify-between max-w-xl mx-auto">
              {[
                { s: 1, label: 'Identity' },
                { s: 2, label: 'Access' },
                { s: 3, label: 'Rollout' },
                { s: 4, label: 'Review' },
              ].map((item, idx, arr) => {
                const isCurrent = step === item.s;
                const isCompleted = step > item.s;

                return (
                  <React.Fragment key={item.s}>
                    <div
                      onClick={() => {
                        if (isCompleted) setStep(item.s as any);
                      }}
                      className={cn(
                        'flex items-center gap-2 text-xs font-semibold select-none',
                        isCompleted ? 'cursor-pointer' : ''
                      )}
                    >
                      <span
                        className={cn(
                          'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                          isCurrent
                            ? 'bg-[#047857] text-white shadow-xs ring-4 ring-[#ECFDF5]'
                            : isCompleted
                            ? 'bg-[#10B981] text-white'
                            : 'bg-[#E2E8F0] text-[#64748B]'
                        )}
                      >
                        {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : item.s}
                      </span>
                      <span
                        className={cn(
                          isCurrent
                            ? 'text-[#0F172B] font-bold'
                            : isCompleted
                            ? 'text-[#047857]'
                            : 'text-[#94A3B8]'
                        )}
                      >
                        {item.label}
                      </span>
                    </div>

                    {idx < arr.length - 1 && (
                      <div
                        className={cn(
                          'flex-1 h-0.5 mx-3 transition-colors',
                          step > item.s ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* SUCCESS VIEW */}
          {createdResult ? (
            <div className="py-6 space-y-6 text-center animate-in fade-in">
              <div className="h-14 w-14 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-[#0F172B]">Feature Created Successfully</h4>
                <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                  <strong>{createdResult.name}</strong> is now registered as an enterprise capability and ready for controlled tenant delivery.
                </p>
              </div>

              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="text-[#64748B]">Feature Code:</span>
                  <span className="font-mono font-bold text-[#0F172B]">{createdResult.code}</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="text-[#64748B]">Initial State:</span>
                  <span className="font-semibold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-md text-[11px]">
                    ● {createdResult.lifecycle} ({createdResult.environment})
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="text-[#64748B]">HRMS Module:</span>
                  <span className="font-semibold text-[#0F172B]">{createdResult.module}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Rollout Cohort:</span>
                  <span className="font-semibold text-[#047857]">{createdResult.rollout_percentage}% Production</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onCreated(createdResult)}
                  className="bg-[#047857] hover:bg-[#036246] text-white px-4 cursor-pointer"
                >
                  View Feature in Drawer →
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateRollout}
                  className="border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Configure Rollout Stage
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetForAnother}
                  className="text-[#64748B] hover:text-[#0F172B] cursor-pointer"
                >
                  + Create Another
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Alert if any */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] flex items-center justify-between gap-3 text-xs text-[#991B1B]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#DC2626] flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-[#DC2626] font-bold hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* ---------------------------------------------------
                  STEP 1: FEATURE IDENTITY
                 --------------------------------------------------- */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Feature Name */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">
                        Feature Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GPS Geofenced Attendance"
                        value={name}
                        onChange={handleNameChange}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:border-[#047857] focus:ring-1 focus:ring-[#047857] outline-none"
                      />
                      <span className="text-[11px] text-[#64748B] block">
                        Clear product-facing name (3–100 chars).
                      </span>
                    </div>

                    {/* Feature Code */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#0F172B] block">
                          Feature Code <span className="text-[#DC2626]">*</span>
                        </label>
                        {codeStatus && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold flex items-center gap-1',
                              codeStatus.available ? 'text-[#047857]' : 'text-[#DC2626]'
                            )}
                          >
                            {codeStatus.available ? (
                              <>
                                <Check className="h-3 w-3" /> Available
                              </>
                            ) : (
                              codeStatus.reason
                            )}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. attendance.gps_geofence"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          setIsCodeManuallyEdited(true);
                        }}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono focus:border-[#047857] focus:ring-1 focus:ring-[#047857] outline-none"
                      />
                      <span className="text-[11px] text-[#64748B] block">
                        Machine-readable API key and feature gate symbol.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* HRMS Module */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">
                        HRMS Module <span className="text-[#DC2626]">*</span>
                      </label>
                      <select
                        value={module}
                        onChange={(e) => setModule(e.target.value)}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs focus:border-[#047857] outline-none cursor-pointer"
                      >
                        {modulesList.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Feature Type */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">
                        Feature Type <span className="text-[#DC2626]">*</span>
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as FeatureType)}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs focus:border-[#047857] outline-none cursor-pointer"
                      >
                        <option value="Boolean">Boolean (On/Off Toggle)</option>
                        <option value="Quota">Quota / Metered Volume</option>
                        <option value="Workflow">Workflow / Multi-Step Logic</option>
                        <option value="Integration">Integration / Third-Party API</option>
                        <option value="AI Capability">AI Capability / LLM Feature</option>
                      </select>
                    </div>
                  </div>

                  {/* Short Description */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-[#0F172B] block">What does this feature do?</label>
                      <span className="text-[10px] text-[#64748B]">{description.length}/250</span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={250}
                      placeholder="Enables GPS-based geofenced employee attendance with configurable radius boundaries."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:border-[#047857] outline-none"
                    />
                  </div>

                  {/* Ownership & Tags */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Owner Team</label>
                      <select
                        value={ownerTeam}
                        onChange={(e) => setOwnerTeam(e.target.value)}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs focus:border-[#047857] outline-none cursor-pointer"
                      >
                        {['Platform', 'Core HR', 'Attendance', 'Payroll', 'Integrations', 'Security', 'AI', 'Infrastructure', 'Support'].map((t) => (
                          <option key={t} value={t}>
                            {t} Engineering & PM
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Product / Engineering Lead</label>
                      <input
                        type="text"
                        placeholder="e.g. Priya Sharma (PM)"
                        value={ownerLead}
                        onChange={(e) => setOwnerLead(e.target.value)}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:border-[#047857] outline-none"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1">
                    <label className="font-bold text-[#0F172B] block">Tags & Categorization</label>
                    <div className="flex flex-wrap items-center gap-1.5 p-2 border border-[#CBD5E1] rounded-xl bg-[#F8FAFC]">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[11px] font-semibold text-[#334155]"
                        >
                          #{t}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="text-[#94A3B8] hover:text-[#DC2626]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="Add tag + Enter..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        className="bg-transparent border-0 outline-none text-xs p-1 text-[#0F172B] placeholder:text-[#94A3B8] min-w-[120px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------
                  STEP 2: ACCESS & ENTITLEMENTS
                 --------------------------------------------------- */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Plan Entitlements */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-[#0F172B] block">Subscription Plan Entitlements</span>
                        <span className="text-[11px] text-[#64748B]">Select tier levels granted inclusion for this capability.</span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleAllPlans}
                        className="text-xs text-[#047857] font-semibold hover:underline cursor-pointer"
                      >
                        {plans.length === 4 ? 'Deselect All' : 'Select All Plans'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {(['Starter', 'Professional', 'Business', 'Enterprise'] as const).map((p) => {
                        const isSelected = plans.includes(p);
                        return (
                          <div
                            key={p}
                            onClick={() => {
                              setPlans(isSelected ? plans.filter((x) => x !== p) : [...plans, p]);
                            }}
                            className={cn(
                              'p-3 rounded-xl border text-center cursor-pointer transition-all',
                              isSelected
                                ? 'bg-[#ECFDF5] border-[#047857] shadow-xs ring-1 ring-[#047857]'
                                : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
                            )}
                          >
                            <div className={cn('font-bold text-xs', isSelected ? 'text-[#047857]' : 'text-[#0F172B]')}>
                              {p}
                            </div>
                            <span className="text-[10px] text-[#64748B] block mt-0.5">
                              {isSelected ? '✓ Included' : 'Excluded'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-semibold text-[#047857] block">
                      ● Active entitlement mapped to {plans.length} of 4 plans
                    </span>
                  </div>

                  {/* Default Access Scope */}
                  <div className="space-y-1.5 pt-3 border-t border-[#E2E8F0]">
                    <label className="font-bold text-[#0F172B] block">Default Activation State</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'Disabled', label: 'Disabled (Recommended)', desc: 'Zero initial tenant exposure' },
                        { id: 'SelectedPlans', label: 'Enabled for Selected Plans', desc: 'Active for all paid cohort' },
                        { id: 'AllPlans', label: 'Enabled Globally', desc: 'Universal platform availability' },
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setDefaultAccess(item.id as any)}
                          className={cn(
                            'p-3 rounded-xl border cursor-pointer transition-all',
                            defaultAccess === item.id
                              ? 'bg-[#ECFDF5] border-[#047857] ring-1 ring-[#047857]'
                              : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
                          )}
                        >
                          <strong className={cn('block text-xs', defaultAccess === item.id ? 'text-[#047857]' : 'text-[#0F172B]')}>
                            {item.label}
                          </strong>
                          <span className="text-[10px] text-[#64748B] block mt-0.5">{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tenant Overrides Setting */}
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#0F172B] block">Allow Tenant-Level Beta Overrides</span>
                        <p className="text-[11px] text-[#64748B]">
                          Permit Super Admins to manually whitelist or blacklist individual organizations.
                        </p>
                      </div>
                      <Switch
                        checked={allowTenantOverrides}
                        onChange={(e) => setAllowTenantOverrides(e.target.checked)}
                      />
                    </div>

                    {allowTenantOverrides && (
                      <div className="pt-2 border-t border-[#E2E8F0] flex items-center gap-4 text-xs">
                        <span className="font-semibold text-[#334155]">Override Mode:</span>
                        {(['Both', 'EnableOnly', 'DisableOnly'] as const).map((m) => (
                          <label key={m} className="flex items-center gap-1.5 cursor-pointer text-[#475569]">
                            <input
                              type="radio"
                              name="override_mode"
                              checked={overrideMode === m}
                              onChange={() => setOverrideMode(m)}
                              className="text-[#047857]"
                            />
                            <span>{m === 'Both' ? 'Allow Both (Recommended)' : m}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quota & Usage Limits */}
                  <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-[#0F172B] block">Usage & Metering Quotas</span>
                        <p className="text-[11px] text-[#64748B]">Define seat caps, API velocity limits, or storage ceilings.</p>
                      </div>
                      <Switch
                        checked={hasUsageLimits}
                        onChange={(e) => setHasUsageLimits(e.target.checked)}
                      />
                    </div>

                    {hasUsageLimits && (
                      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#E2E8F0]">
                        <div>
                          <label className="text-[10px] font-semibold text-[#64748B] block mb-1">Limit Amount</label>
                          <input
                            type="number"
                            value={quotaAmount}
                            onChange={(e) => setQuotaAmount(Number(e.target.value))}
                            className="w-full p-2 border rounded-lg bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[#64748B] block mb-1">Unit</label>
                          <select
                            value={quotaUnit}
                            onChange={(e) => setQuotaUnit(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white text-xs"
                          >
                            <option value="Employees">Employees</option>
                            <option value="API Calls">API Calls</option>
                            <option value="GB Storage">GB Storage</option>
                            <option value="Messages">WhatsApp Messages</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[#64748B] block mb-1">Period</label>
                          <select
                            value={quotaPeriod}
                            onChange={(e) => setQuotaPeriod(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white text-xs"
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Annual">Annual</option>
                            <option value="Unlimited">Per Event</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------
                  STEP 3: ROLLOUT & SAFETY
                 --------------------------------------------------- */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Target Environment */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Deployment Environment</label>
                      <select
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value as any)}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs focus:border-[#047857] outline-none cursor-pointer"
                      >
                        <option value="Staging">Staging (Safe Pre-Release)</option>
                        <option value="Production">Production (Live Customer Mesh)</option>
                        <option value="Development">Development (Internal Only)</option>
                      </select>
                    </div>

                    {/* Initial Status */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Initial Lifecycle Status</label>
                      <select
                        value={initialStatus}
                        onChange={(e) => setInitialStatus(e.target.value as any)}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs focus:border-[#047857] outline-none cursor-pointer"
                      >
                        <option value="Draft">Draft (Safe Inactive State)</option>
                        <option value="Beta">Beta (Controlled Cohorts)</option>
                        <option value="Active">Active (GA Ready)</option>
                        <option value="Disabled">Disabled</option>
                      </select>
                    </div>
                  </div>

                  {/* Rollout Percentage Slider & Direct Controls */}
                  <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-xs text-[#0F172B] block">Initial Rollout Percentage</span>
                        <span className="text-[11px] text-[#64748B]">
                          Cohort allocation within eligible subscribed organizations.
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rolloutPercentage}
                          onChange={(e) => setRolloutPercentage(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-16 p-1.5 border border-[#CBD5E1] rounded-lg text-right font-mono font-bold text-xs"
                        />
                        <span className="font-bold text-[#64748B]">%</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={rolloutPercentage}
                      onChange={(e) => setRolloutPercentage(Number(e.target.value))}
                      className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#047857]"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                      {[
                        { val: 0, label: '0% (Disabled)' },
                        { val: 10, label: '10%' },
                        { val: 25, label: '25% (Canary)' },
                        { val: 50, label: '50% (Half)' },
                        { val: 100, label: '100% (GA)' },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setRolloutPercentage(preset.val)}
                          className={cn(
                            'px-2.5 py-1 rounded-md border font-semibold transition-all cursor-pointer',
                            rolloutPercentage === preset.val
                              ? 'bg-[#047857] text-white border-[#047857]'
                              : 'bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Safety Toggles: Kill Switch & Beta Mode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <strong className="text-xs text-[#0F172B] block">Emergency Kill Switch</strong>
                        <span className="text-[10px] text-[#64748B]">Allows instant global disable</span>
                      </div>
                      <Switch
                        checked={killSwitchEnabled}
                        onChange={(e) => setKillSwitchEnabled(e.target.checked)}
                      />
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <strong className="text-xs text-[#0F172B] block">Beta Access Gate</strong>
                        <span className="text-[10px] text-[#64748B]">Restricts to design partners</span>
                      </div>
                      <Switch
                        checked={isBeta}
                        onChange={(e) => setIsBeta(e.target.checked)}
                      />
                    </div>
                  </div>

                  {/* Prerequisite Dependencies */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-[#0F172B] block">Prerequisite Feature Dependencies</label>
                    <div className="flex flex-wrap items-center gap-1.5 p-2 border border-[#CBD5E1] rounded-xl bg-[#F8FAFC]">
                      {dependencies.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-[#CBD5E1] text-[11px] font-mono font-semibold text-[#0F172B]"
                        >
                          {d}
                          <button
                            type="button"
                            onClick={() => handleRemoveDependency(d)}
                            className="text-[#94A3B8] hover:text-[#DC2626]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder="e.g. attendance.core + Enter"
                        value={newDepInput}
                        onChange={(e) => setNewDepInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddDependency();
                          }
                        }}
                        className="bg-transparent border-0 outline-none text-xs p-1 text-[#0F172B] font-mono placeholder:text-[#94A3B8] min-w-[150px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------
                  STEP 4: REVIEW & CREATE
                 --------------------------------------------------- */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Identity Summary Card */}
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <span className="font-bold text-[#047857] uppercase text-[10px] tracking-wider block">
                        Feature Identity
                      </span>
                      <div className="text-sm font-bold text-[#0F172B]">{name}</div>
                      <div className="font-mono text-[11px] text-[#64748B]">{code}</div>
                      <div className="text-[11px] text-[#475569] mt-1">{description || 'No description provided.'}</div>
                      <div className="text-[11px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                        Module: <strong>{module}</strong> • Type: <strong>{type}</strong>
                      </div>
                    </div>

                    {/* Access Summary Card */}
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <span className="font-bold text-[#047857] uppercase text-[10px] tracking-wider block">
                        Access & Entitlements
                      </span>
                      <div>
                        Plans: <strong>{plans.join(', ')}</strong>
                      </div>
                      <div>
                        Default State: <strong>{defaultAccess}</strong>
                      </div>
                      <div>
                        Tenant Overrides: <strong>{allowTenantOverrides ? `Enabled (${overrideMode})` : 'Disabled'}</strong>
                      </div>
                      {hasUsageLimits && (
                        <div>
                          Quota: <strong>{quotaAmount} {quotaUnit} ({quotaPeriod})</strong>
                        </div>
                      )}
                    </div>

                    {/* Rollout Summary Card */}
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <span className="font-bold text-[#047857] uppercase text-[10px] tracking-wider block">
                        Deployment & Safety
                      </span>
                      <div>
                        Environment: <strong>{environment}</strong>
                      </div>
                      <div>
                        Lifecycle State: <strong>{initialStatus}</strong>
                      </div>
                      <div>
                        Rollout Cohort: <strong>{rolloutPercentage}%</strong>
                      </div>
                      <div>
                        Kill-Switch Protection: <strong>{killSwitchEnabled ? 'Active' : 'Disabled'}</strong>
                      </div>
                    </div>

                    {/* Dependencies & Audit Card */}
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <span className="font-bold text-[#047857] uppercase text-[10px] tracking-wider block">
                        Audit & Dependencies
                      </span>
                      <div>
                        Dependencies: <strong>{dependencies.length > 0 ? dependencies.join(', ') : 'None (Independent)'}</strong>
                      </div>
                      <div>
                        Owner Team: <strong>{ownerTeam}</strong>
                      </div>
                      <div>
                        Created By: <strong>WorkForce Super Admin</strong>
                      </div>
                    </div>
                  </div>

                  {/* Safety Notice */}
                  <div className="p-3.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] flex items-center gap-2.5 text-xs text-[#1E40AF]">
                    <Shield className="h-4 w-4 text-[#2563EB] flex-shrink-0" />
                    <span>
                      This feature will be registered in <strong>{initialStatus}</strong> state ({environment}). No tenant will receive production access until rollout is explicitly enabled.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!createdResult && (
          <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-white">
            {step > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((step - 1) as any)}
                className="border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
              >
                ← Back
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
              >
                Cancel
              </Button>
            )}

            {step < 4 ? (
              <Button
                variant="primary"
                size="sm"
                disabled={step === 1 ? !isStep1Valid : step === 2 ? !isStep2Valid : !isStep3Valid}
                onClick={() => setStep((step + 1) as any)}
                className="bg-[#047857] hover:bg-[#036246] text-white flex items-center gap-1.5 px-4 cursor-pointer disabled:opacity-50"
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting || !isStep1Valid || !isStep2Valid}
                onClick={handleCreateFeature}
                className="bg-[#047857] hover:bg-[#036246] text-white flex items-center gap-1.5 px-5 font-bold cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {isSubmitting ? 'Creating Feature...' : 'Create Feature'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Explain Access Modal ("Why is this enabled?")
 */
const ExplainAccessModal: React.FC<{
  capabilities: ProductCapability[];
  onClose: () => void;
}> = ({ capabilities, onClose }) => {
  const [tenantId, setTenantId] = useState('org-acme-01');
  const [selectedCapCode, setSelectedCapCode] = useState('attendance.gps');

  const result: AccessExplanationResult = useMemo(
    () => platformCapabilitiesService.explainAccess(tenantId, selectedCapCode),
    [tenantId, selectedCapCode]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider">Access Diagnostic Engine</span>
            <h3 className="text-base font-bold text-[#0F172B]">Why is this capability enabled?</h3>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172B]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-[#334155] block mb-1">Target Tenant</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white text-xs"
            >
              <option value="org-acme-01">Acme Technologies (Enterprise)</option>
              <option value="org-tech-02">TechCorp Global (Business)</option>
              <option value="org-nex-03">Nexus Retail (Professional)</option>
              <option value="org-zen-04">Zenith Logistics (Starter)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-[#334155] block mb-1">Product Capability</label>
            <select
              value={selectedCapCode}
              onChange={(e) => setSelectedCapCode(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white text-xs"
            >
              {capabilities.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Diagnostic Result Banner */}
        <div
          className={cn(
            'p-4 rounded-xl border flex items-center justify-between',
            result.is_enabled ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
          )}
        >
          <div>
            <div className="font-bold text-sm">
              Resolution: {result.is_enabled ? 'ENABLED' : 'DISABLED'}
            </div>
            <p className="text-[11px] mt-0.5">{result.reason_summary}</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-white rounded-full border">
            {result.is_enabled ? '✓ Fully Active' : '✕ Gated'}
          </span>
        </div>

        {/* 8-Step Resolution Pipeline */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          <span className="font-bold text-xs text-[#0F172B]">Deterministic Evaluation Pipeline:</span>
          {result.checks.map((chk, idx) => (
            <div key={idx} className="p-3 bg-[#F8FAFC] rounded-xl border flex items-start gap-3 text-xs">
              {chk.passed ? (
                <CheckCircle2 className="h-4 w-4 text-[#047857] flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-bold text-[#0F172B]">{chk.step}</div>
                <p className="text-[11px] text-[#64748B]">{chk.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Diagnostic
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Compare Capabilities Modal — World-Class Release & Entitlement Matrix
 */
const CompareCapabilitiesModal: React.FC<{
  capabilities: ProductCapability[];
  onClose: () => void;
}> = ({ capabilities, onClose }) => {
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('All');

  // Extract unique modules
  const modules = useMemo(() => {
    const list = Array.from(new Set(capabilities.map((c) => c.module)));
    return ['All', ...list];
  }, [capabilities]);

  // Filtered capabilities
  const filtered = useMemo(() => {
    return capabilities.filter((c) => {
      const matchModule = selectedModule === 'All' || c.module === selectedModule;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.module.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      return matchModule && matchSearch;
    });
  }, [capabilities, selectedModule, search]);

  // Group capabilities by module
  const grouped = useMemo<Record<string, ProductCapability[]>>(() => {
    const map: Record<string, ProductCapability[]> = {};
    filtered.forEach((c) => {
      if (!map[c.module]) map[c.module] = [];
      map[c.module].push(c);
    });
    return map;
  }, [filtered]);

  // Plan inclusion counts
  const planCounts = useMemo(() => {
    const counts = { Starter: 0, Professional: 0, Business: 0, Enterprise: 0 };
    capabilities.forEach((c) => {
      if (c.allowed_plans.includes('Starter')) counts.Starter++;
      if (c.allowed_plans.includes('Professional')) counts.Professional++;
      if (c.allowed_plans.includes('Business')) counts.Business++;
      if (c.allowed_plans.includes('Enterprise')) counts.Enterprise++;
    });
    return counts;
  }, [capabilities]);

  const handleExportCSV = () => {
    const rows = [
      ['Capability', 'Code', 'Module', 'Lifecycle', 'Starter', 'Professional', 'Business', 'Enterprise'],
      ...capabilities.map((c) => [
        `"${c.name}"`,
        c.code,
        c.module,
        c.lifecycle,
        c.allowed_plans.includes('Starter') ? 'Included' : 'No',
        c.allowed_plans.includes('Professional') ? 'Included' : 'No',
        c.allowed_plans.includes('Business') ? 'Included' : 'No',
        c.allowed_plans.includes('Enterprise') ? 'Included' : 'No',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'WorkForceOS_Capability_Release_Matrix.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs max-h-[90vh] flex flex-col font-sans">
        {/* 1. Modal Header */}
        <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0F172B]">Product Capability Release Matrix</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                  {capabilities.length} Total Capabilities
                </span>
              </div>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                Cross-tier technical entitlement matrix and release lifecycle coverage across WorkForceOS subscription tiers.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. Tier Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] text-center">
            <span className="text-[11px] font-bold text-[#64748B] block">Starter Tier</span>
            <div className="font-mono font-bold text-sm text-[#0F172B] mt-0.5">
              {planCounts.Starter} <span className="text-xs font-normal text-[#64748B]">/ {capabilities.length}</span>
            </div>
            <span className="text-[10px] text-[#64748B] font-semibold">₹7.5k / mo (Basic Core HR)</span>
          </div>

          <div className="p-3 bg-[#ECFDF5] rounded-2xl border border-[#A7F3D0] text-center">
            <span className="text-[11px] font-bold text-[#047857] block">Professional</span>
            <div className="font-mono font-bold text-sm text-[#047857] mt-0.5">
              {planCounts.Professional} <span className="text-xs font-normal text-[#065F46]">/ {capabilities.length}</span>
            </div>
            <span className="text-[10px] text-[#047857] font-semibold">₹24k / mo (Growing SMBs)</span>
          </div>

          <div className="p-3 bg-[#EFF6FF] rounded-2xl border border-[#BFDBFE] text-center">
            <span className="text-[11px] font-bold text-[#1D4ED8] block">Business Tier</span>
            <div className="font-mono font-bold text-sm text-[#1D4ED8] mt-0.5">
              {planCounts.Business} <span className="text-xs font-normal text-[#1E40AF]">/ {capabilities.length}</span>
            </div>
            <span className="text-[10px] text-[#1D4ED8] font-semibold">₹85k / mo (Mid-Market Scale)</span>
          </div>

          <div className="p-3 bg-[#FAF5FF] rounded-2xl border border-[#E9D5FF] text-center">
            <span className="text-[11px] font-bold text-[#7C3AED] block">Enterprise Complete</span>
            <div className="font-mono font-bold text-sm text-[#7C3AED] mt-0.5">
              {planCounts.Enterprise} <span className="text-xs font-normal text-[#6D28D9]">/ {capabilities.length}</span>
            </div>
            <span className="text-[10px] text-[#7C3AED] font-semibold">100% Unlocked (Dedicated Cluster)</span>
          </div>
        </div>

        {/* 3. Search & Module Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search capability name, code, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#CBD5E1] bg-white focus:outline-none focus:ring-2 focus:ring-[#047857]"
              />
            </div>

            {/* Module Filter Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {modules.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setSelectedModule(mod)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border',
                    selectedModule === mod
                      ? 'bg-[#047857] text-white border-[#047857] shadow-xs'
                      : 'bg-white text-[#64748B] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                  )}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-[#64748B]">
            Showing <strong>{filtered.length}</strong> capabilities
          </div>
        </div>

        {/* 4. Categorized High-Density Release Matrix Table */}
        <div className="overflow-y-auto flex-1 border border-[#E2E8F0] rounded-2xl bg-white shadow-inner">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-[#0F172B] text-white shadow-md">
              <tr className="border-b border-[#334155]">
                <th className="py-3 px-4 font-bold text-xs w-2/5">Capability & Code</th>
                <th className="py-3 px-3 font-semibold text-xs text-[#94A3B8] w-1/6">Lifecycle Stage</th>
                <th className="py-3 px-3 font-bold text-xs text-center w-1/8 text-slate-300">Starter</th>
                <th className="py-3 px-3 font-bold text-xs text-center w-1/8 text-[#6EE7B7]">Professional</th>
                <th className="py-3 px-3 font-bold text-xs text-center w-1/8 text-[#93C5FD]">Business</th>
                <th className="py-3 px-3 font-bold text-xs text-center w-1/8 text-[#C4B5FD]">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {Object.keys(grouped).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#64748B]">
                    No capabilities match your search query.
                  </td>
                </tr>
              ) : (
                (Object.entries(grouped) as [string, ProductCapability[]][]).map(([moduleName, items]) => (
                  <React.Fragment key={moduleName}>
                    {/* Category Banner Row */}
                    <tr className="bg-[#F1F5F9] font-bold text-[#0F172B] border-y border-[#E2E8F0]">
                      <td colSpan={6} className="py-2 px-4 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-[#334155]">
                          <Sparkles className="h-3.5 w-3.5 text-[#047857]" />
                          {moduleName} Module
                        </span>
                        <span className="text-[10px] font-semibold text-[#64748B] bg-white px-2 py-0.5 rounded-full border border-[#CBD5E1]">
                          {items.length} {items.length === 1 ? 'Feature' : 'Features'}
                        </span>
                      </td>
                    </tr>

                    {/* Capability Item Rows */}
                    {items.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#0F172B] text-xs">{c.name}</div>
                          <div className="text-[10px] font-mono text-[#64748B] mt-0.5">{c.code}</div>
                          <p className="text-[11px] text-[#475569] mt-1 line-clamp-1">{c.description}</p>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-bold inline-block',
                              c.lifecycle === 'General Availability'
                                ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                                : c.lifecycle === 'Beta'
                                ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                                : c.lifecycle === 'Early Access'
                                ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                : 'bg-[#F1F5F9] text-[#64748B]'
                            )}
                          >
                            ● {c.lifecycle === 'General Availability' ? 'GA' : c.lifecycle}
                          </span>
                        </td>

                        {['Starter', 'Professional', 'Business', 'Enterprise'].map((plan) => {
                          const hasAccess = c.allowed_plans.includes(plan as any);
                          return (
                            <td key={plan} className="py-3 px-3 text-center">
                              {hasAccess ? (
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] shadow-2xs">
                                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#F8FAFC] text-[#CBD5E1] border border-[#E2E8F0]">
                                  <Minus className="h-3 w-3" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Modal Footer with Visual Legend & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-4 text-[11px] text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] inline-flex items-center justify-center">
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              </span>
              <span>Included in Plan</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#CBD5E1] inline-flex items-center justify-center">
                <Minus className="h-2.5 w-2.5" />
              </span>
              <span>Requires Tier Upgrade</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                ● GA
              </span>
              <span>Production Ready</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV Matrix
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
              className="bg-[#0F172B] hover:bg-[#1E293B] text-white text-xs font-semibold px-4"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Create Override Modal
 */
const CreateOverrideModal: React.FC<{
  capabilities: ProductCapability[];
  onClose: () => void;
  onCreated: () => void;
}> = ({ capabilities, onClose, onCreated }) => {
  const [tenantName, setTenantName] = useState('Acme Technologies Pvt Ltd');
  const [tenantId, setTenantId] = useState('org-acme-01');
  const [capId, setCapId] = useState(capabilities[0]?.id || 'cap-01');
  const [state, setState] = useState<'Enabled' | 'Disabled'>('Enabled');
  const [reason, setReason] = useState('Strategic early access trial');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cap = capabilities.find((c) => c.id === capId);
    await platformCapabilitiesService.createOverride({
      tenant_id: tenantId,
      tenant_name: tenantName,
      capability_id: capId,
      capability_name: cap?.name || 'Capability',
      capability_code: cap?.code || 'feature.code',
      override_state: state,
      reason,
    });
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0F172B]">Create Tenant Beta Override</h3>
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
            <label className="font-semibold text-[#334155] block mb-1">Target Capability</label>
            <select
              value={capId}
              onChange={(e) => setCapId(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white text-xs"
            >
              {capabilities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-[#334155] block mb-1">Override State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value as any)}
              className="w-full p-2 border rounded-lg bg-white text-xs"
            >
              <option value="Enabled">Enabled (Grant Beta Access)</option>
              <option value="Disabled">Disabled (Explicit Block)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-[#334155] block mb-1">Business Reason</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded-lg text-xs"
            />
          </div>

          <Button type="submit" variant="primary" size="sm" className="w-full bg-[#047857] hover:bg-[#036246] text-white">
            Apply Tenant Override
          </Button>
        </form>
      </div>
    </div>
  );
};
