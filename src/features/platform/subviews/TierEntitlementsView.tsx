// src/features/platform/subviews/TierEntitlementsView.tsx
// ============================================================
// WorkForceOS — SaaS Plans & Tier Entitlements Management Console
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Package,
  Check,
  Plus,
  Edit,
  Edit2,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
  Users,
  Building2,
  Clock,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  FileText,
  Sliders,
  DollarSign,
  HelpCircle,
  Eye,
  TrendingUp,
  HardDrive,
  MessageSquare,
  Cpu,
  Shield,
  CheckCircle2,
  Compass,
  Award,
  Globe,
  Lock,
  Activity,
  GitBranch,
  History,
} from 'lucide-react';
import {
  TierPlan,
  PlanFeatureItem,
  TenantSubscriptionItem,
  PlanStatus,
  FeatureCategory,
  FeatureType,
  FeatureClassification,
  FeatureAccessModel,
  FeatureOveragePolicy,
} from '../../../types/tierPlans';
import { platformTierPlansService } from '../../../services/platform/platformTierPlansService';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { cn } from '../../../lib/utils';

export interface TierEntitlementsViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const TierEntitlementsView: React.FC<TierEntitlementsViewProps> = ({ onNavigateTab }) => {
  // -------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'plans' | 'features' | 'archived'>('plans');
  const [plans, setPlans] = useState<TierPlan[]>(() => platformTierPlansService.getPlans());
  const [features, setFeatures] = useState<PlanFeatureItem[]>(() => platformTierPlansService.getFeatures());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState('All');

  // Modals / Drawers State
  const [managedPlan, setManagedPlan] = useState<TierPlan | null>(null);
  const [manageSection, setManageSection] = useState<'overview' | 'pricing' | 'features' | 'limits' | 'history'>('overview');
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isCreateFeatureOpen, setIsCreateFeatureOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Features Inspection & Editing Drawers
  const [inspectedFeature, setInspectedFeature] = useState<PlanFeatureItem | null>(null);
  const [editingFeature, setEditingFeature] = useState<PlanFeatureItem | null>(null);
  const [featureStatusFilter, setFeatureStatusFilter] = useState('All');
  const [featureMinTierFilter, setFeatureMinTierFilter] = useState('All');
  const [featurePlanFilter, setFeaturePlanFilter] = useState('All');
  const [featureHighValueFilter, setFeatureHighValueFilter] = useState(false);

  const refreshData = () => {
    setPlans(platformTierPlansService.getPlans());
    setFeatures(platformTierPlansService.getFeatures());
    if (inspectedFeature) {
      const updated = platformTierPlansService.getFeatureById(inspectedFeature.id);
      if (updated) setInspectedFeature(updated);
    }
  };

  const featureMetrics = useMemo(() => platformTierPlansService.getFeatureMetrics(), [features]);

  // Active vs Archived Plans
  const activePlans = useMemo(() => plans.filter((p) => p.status !== 'Archived'), [plans]);
  const archivedPlans = useMemo(() => plans.filter((p) => p.status === 'Archived'), [plans]);

  // Plan Handlers
  const handleDuplicatePlan = async (planId: string) => {
    const copy = await platformTierPlansService.duplicatePlan(planId);
    refreshData();
    setManagedPlan({ ...copy });
    setManageSection('overview');
  };

  const handleArchivePlan = async (planId: string) => {
    await platformTierPlansService.archivePlan(planId);
    refreshData();
    setManagedPlan(null);
  };

  const handleRestorePlan = async (planId: string) => {
    await platformTierPlansService.restorePlan(planId);
    refreshData();
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await platformTierPlansService.deletePlan(planId);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Unable to delete plan');
    }
  };

  // Feature Actions
  const handleDuplicateFeature = async (featId: string) => {
    const copy = await platformTierPlansService.duplicateFeature(featId);
    refreshData();
    setInspectedFeature(copy);
  };

  const handleArchiveFeature = async (featId: string) => {
    await platformTierPlansService.archiveFeature(featId);
    refreshData();
  };

  const handleRestoreFeature = async (featId: string) => {
    await platformTierPlansService.restoreFeature(featId);
    refreshData();
  };

  const handleTogglePlanEntitlement = async (featureCode: string, planId: string, isAssigned: boolean) => {
    if (isAssigned) {
      await platformTierPlansService.removeFeatureFromPlan(featureCode, planId);
    } else {
      await platformTierPlansService.assignFeatureToPlan(featureCode, planId);
    }
    refreshData();
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E7EAF0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Plans & Entitlements</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              ● Plan Engine Active
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Create subscription plans, manage feature access, configure limits, and define what each plan includes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompareOpen(true)}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
          >
            <Eye className="h-4 w-4 text-[#64748B]" />
            Compare Plans
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreatePlanOpen(true)}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#036246] text-white shadow-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            + Create Plan
          </Button>
        </div>
      </div>

      {/* 2. Main 3 Navigation Tabs (No redundant tenants table!) */}
      <div className="border-b border-[#E2E8F0]">
        <div className="flex items-center gap-1">
          {[
            { id: 'plans', label: 'Plans', icon: Layers, count: activePlans.length },
            { id: 'features', label: 'Features', icon: Zap, count: features.length },
            { id: 'archived', label: 'Archived', icon: Archive, count: archivedPlans.length },
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
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                    isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#F1F5F9] text-[#64748B]'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------------------------------------------------
          TAB 1: PLANS (Clean 4-Card Product Catalog Grid)
         --------------------------------------------------------- */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activePlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between hover:border-[#047857] transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#047857]">
                      {plan.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                      ● Active
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-extrabold text-[#0F172B]">
                      ₹{Math.round(plan.monthly_price / 1000)}k
                      <span className="text-xs font-normal text-[#64748B]"> / month</span>
                    </div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">
                      ₹{(plan.annual_price / 100000).toFixed(1)}L / year (Save 17%)
                    </div>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9] space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[#334155]">
                      <span>Included Capacity:</span>
                      <strong className="text-[#0F172B]">
                        {plan.max_seats === -1 ? 'Unlimited' : `Up to ${plan.max_seats} seats`}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-[#334155]">
                      <span>HRMS Capabilities:</span>
                      <strong className="text-[#047857]">{plan.features.length} capabilities</strong>
                    </div>
                  </div>

                  {/* Clickable Active Subscriptions Pill linking to Subscriptions tab */}
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.('platform-subscriptions', { presetFilter: plan.name })}
                    className={cn(
                      "w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-colors cursor-pointer",
                      plan.tenant_count > 0
                        ? "bg-[#ECFDF5] hover:bg-[#D1FAE5] border-[#A7F3D0] text-[#047857]"
                        : "bg-[#F8FAFC] hover:bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]"
                    )}
                  >
                    <span>{plan.tenant_count === 0 ? '0 Active Subscriptions' : `${plan.tenant_count} Active Subscriptions`}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="pt-4 border-t border-[#F1F5F9] mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setManagedPlan(plan);
                      setManageSection('overview');
                    }}
                    className="w-full text-xs font-semibold text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5]"
                  >
                    Manage Plan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 2: FEATURES (Searchable Categorized Registry)
         --------------------------------------------------------- */}
      {/* ---------------------------------------------------------
          TAB 2: FEATURES & CAPABILITIES (Enterprise Feature Engine)
         --------------------------------------------------------- */}
      {activeTab === 'features' && (
        <div className="space-y-5">
          {/* Top Status & Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-[#0F172B]">Features & Capabilities Catalog</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#047857] animate-pulse" />
                  Feature Engine Healthy
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Canonical product capabilities, plan access matrices, usage rules, dependencies, and rollout states.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompareOpen(true)}
                className="text-xs border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
              >
                <Sliders className="h-3.5 w-3.5 mr-1 text-[#64748B]" /> Compare Capabilities
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateFeatureOpen(true)}
                className="text-xs bg-[#047857] hover:bg-[#036246] text-white shadow-sm font-bold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> + Create Feature
              </Button>
            </div>
          </div>

          {/* 5 Realtime Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">Total Features</span>
              <div className="text-2xl font-black text-[#0F172B] mt-1">{featureMetrics.total}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Across 18 HRMS modules</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#047857] block">Active Features</span>
              <div className="text-2xl font-black text-[#047857] mt-1">{featureMetrics.active}</div>
              <div className="text-[10px] text-[#047857] mt-0.5">Production GA tier</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D97706] block">Draft Features</span>
              <div className="text-2xl font-black text-[#D97706] mt-1">{featureMetrics.draft}</div>
              <div className="text-[10px] text-[#D97706] mt-0.5">Under definition</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block">Deprecated</span>
              <div className="text-2xl font-black text-[#64748B] mt-1">{featureMetrics.deprecated}</div>
              <div className="text-[10px] text-[#64748B] mt-0.5">Scheduled sunset</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626] block">Needs Attention</span>
              <div className="text-2xl font-black text-[#DC2626] mt-1">{featureMetrics.needs_attention}</div>
              <div className="text-[10px] text-[#DC2626] mt-0.5">Orphaned or missing refs</div>
            </div>
          </div>

          {/* Search & Multi-Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search feature name, code, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#047857] text-[#0F172B]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Filter */}
                <select
                  value={featureCategoryFilter}
                  onChange={(e) => setFeatureCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#CBD5E1] bg-white text-[#334155] outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Core HR">Core HR</option>
                  <option value="Employee Self-Service">Employee Self-Service</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Leave">Leave</option>
                  <option value="Payroll">Payroll</option>
                  <option value="WhatsApp & Messaging">WhatsApp & Messaging</option>
                  <option value="Biometrics & Hardware">Biometrics & Hardware</option>
                  <option value="Recruitment">Recruitment</option>
                  <option value="Performance">Performance</option>
                  <option value="AI & Copilot">AI & Copilot</option>
                  <option value="Integrations & Security">Integrations & Security</option>
                  <option value="Support & SLAs">Support & SLAs</option>
                </select>

                {/* Status Filter */}
                <select
                  value={featureStatusFilter}
                  onChange={(e) => setFeatureStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#CBD5E1] bg-white text-[#334155] outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Beta">Beta</option>
                  <option value="Deprecated">Deprecated</option>
                  <option value="Archived">Archived</option>
                </select>

                {/* Minimum Tier Filter */}
                <select
                  value={featureMinTierFilter}
                  onChange={(e) => setFeatureMinTierFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#CBD5E1] bg-white text-[#334155] outline-none cursor-pointer"
                >
                  <option value="All">All Min Tiers</option>
                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Business">Business</option>
                  <option value="Enterprise">Enterprise</option>
                </select>

                {/* Included in Plan Filter */}
                <select
                  value={featurePlanFilter}
                  onChange={(e) => setFeaturePlanFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#CBD5E1] bg-white text-[#334155] outline-none cursor-pointer"
                >
                  <option value="All">All Plan Inclusions</option>
                  {activePlans.map((p) => (
                    <option key={p.id} value={p.name}>
                      Included in {p.name}
                    </option>
                  ))}
                </select>

                {/* High Value Toggle */}
                <button
                  type="button"
                  onClick={() => setFeatureHighValueFilter(!featureHighValueFilter)}
                  className={cn(
                    'px-3 py-2 text-xs rounded-xl border font-semibold flex items-center gap-1.5 transition-colors cursor-pointer',
                    featureHighValueFilter
                      ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                      : 'bg-white text-[#64748B] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  )}
                >
                  ★ High Value
                </button>
              </div>
            </div>
          </div>

          {/* Production Features Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3.5 px-4">Feature Name & Code</th>
                    <th className="py-3.5 px-4">Category & Module</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Min Tier</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Included in Plans</th>
                    <th className="py-3.5 px-4">Usage</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {features
                    .filter((f) => {
                      const matchCat = featureCategoryFilter === 'All' || f.category === featureCategoryFilter;
                      const matchStatus =
                        featureStatusFilter === 'All' || f.status === featureStatusFilter || f.lifecycle_status === featureStatusFilter;
                      const matchMinTier = featureMinTierFilter === 'All' || f.min_tier_name === featureMinTierFilter;
                      const matchHighValue = !featureHighValueFilter || f.is_high_value;
                      const matchPlan =
                        featurePlanFilter === 'All' ||
                        plans.find((p) => p.name.toLowerCase() === featurePlanFilter.toLowerCase())?.features.includes(f.code);
                      const q = searchQuery.toLowerCase().trim();
                      const matchSearch =
                        !q ||
                        f.name.toLowerCase().includes(q) ||
                        f.code.toLowerCase().includes(q) ||
                        f.description.toLowerCase().includes(q) ||
                        f.category.toLowerCase().includes(q);
                      return matchCat && matchStatus && matchMinTier && matchHighValue && matchPlan && matchSearch;
                    })
                    .map((feat) => {
                      const includedIn = plans.filter((p) => p.features.includes(feat.code)).map((p) => p.name);
                      return (
                        <tr
                          key={feat.id}
                          onClick={() => setInspectedFeature(feat)}
                          className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                        >
                          {/* Name & Code */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[#0F172B] group-hover:text-[#047857] transition-colors">
                                {feat.name}
                              </span>
                              {feat.is_high_value && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                                  HIGH VALUE
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-[#64748B] mt-0.5">{feat.code}</div>
                          </td>

                          {/* Category & Module */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                              {feat.category}
                            </span>
                            {feat.module && feat.module !== feat.category && (
                              <div className="text-[10px] text-[#64748B] mt-0.5">{feat.module}</div>
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-3.5 px-4 max-w-xs text-[#475569] leading-relaxed line-clamp-2">
                            {feat.short_description || feat.description}
                          </td>

                          {/* Min Tier */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#0F172B] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E2E8F0]">
                              {feat.min_tier_name || 'Starter'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1',
                                feat.status === 'Active'
                                  ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                                  : feat.status === 'Draft'
                                  ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                  : feat.status === 'Beta'
                                  ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                                  : feat.status === 'Deprecated'
                                  ? 'bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]'
                                  : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                              )}
                            >
                              ● {feat.status}
                            </span>
                          </td>

                          {/* Included in Plans */}
                          <td className="py-3.5 px-4">
                            <div className="flex gap-1 flex-wrap items-center">
                              {includedIn.slice(0, 3).map((pName) => (
                                <span
                                  key={pName}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#047857] font-bold border border-[#A7F3D0]"
                                >
                                  {pName}
                                </span>
                              ))}
                              {includedIn.length > 3 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B] font-bold border border-[#E2E8F0]">
                                  +{includedIn.length - 3} more
                                </span>
                              )}
                              {includedIn.length === 0 && (
                                <span className="text-[10px] text-[#94A3B8] italic">No plans assigned</span>
                              )}
                            </div>
                          </td>

                          {/* Usage / Metered */}
                          <td className="py-3.5 px-4">
                            {feat.is_metered ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]">
                                Metered
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#64748B]">Boolean</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setInspectedFeature(feat)}
                                className="text-[11px] h-7 px-2 border-[#CBD5E1] text-[#0F172B] hover:bg-[#F1F5F9]"
                              >
                                Inspect
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingFeature(feat)}
                                className="text-[11px] h-7 px-2 border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
                              >
                                Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          TAB 3: ARCHIVED PLANS
         --------------------------------------------------------- */}
      {activeTab === 'archived' && (
        <div className="space-y-4">
          {archivedPlans.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-[#E2E8F0] text-xs text-[#64748B]">
              No archived plans. Active plans can be archived from the Manage Plan drawer.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Plan Name & Code</th>
                    <th className="py-3 px-4">Monthly Price</th>
                    <th className="py-3 px-4">Seats</th>
                    <th className="py-3 px-4">Active Tenants</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {archivedPlans.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3.5 px-4 font-bold text-[#0F172B]">{p.name}</td>
                      <td className="py-3.5 px-4">₹{p.monthly_price.toLocaleString()} / mo</td>
                      <td className="py-3.5 px-4">{p.included_seats} seats</td>
                      <td className="py-3.5 px-4">{p.tenant_count} tenants</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#F1F5F9] text-[#64748B]">
                          Archived
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestorePlan(p.id)}
                          className="text-xs text-[#047857]"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Restore
                        </Button>
                        {p.tenant_count === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePlan(p.id)}
                            className="text-xs text-[#DC2626] border-[#FCA5A5]"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------
          MANAGE PLAN DRAWER (HIGH VALUE & DEEP POLISH)
         --------------------------------------------------------- */}
      {managedPlan && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col border-l border-[#E2E8F0] overflow-hidden text-xs">
            {/* Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#0F172B]">{managedPlan.name} Plan</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                    ● {managedPlan.status}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                    {managedPlan.target_company_size || 'All Sizes'}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">{managedPlan.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicatePlan(managedPlan.id)}
                  className="text-xs border-[#CBD5E1] text-[#334155] hover:bg-white"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                </Button>
                {managedPlan.status !== 'Archived' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchivePlan(managedPlan.id)}
                    className="text-xs text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEF2F2]"
                  >
                    <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                  </Button>
                )}
                <button
                  onClick={() => setManagedPlan(null)}
                  className="p-1.5 text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#E2E8F0] rounded-lg transition-colors ml-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 5 Sub-navigation Tabs */}
            <div className="border-b border-[#E2E8F0] px-5 bg-white">
              <div className="flex items-center gap-6">
                {[
                  { id: 'overview', label: 'Overview', icon: Eye },
                  { id: 'pricing', label: 'Pricing & Economics', icon: DollarSign },
                  { id: 'features', label: 'Features & Entitlements', icon: Zap },
                  { id: 'limits', label: 'Limits & Quotas', icon: Sliders },
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

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* ---------------------------------------------------------
                  SECTION 1: OVERVIEW & TIER POSITIONING
                 --------------------------------------------------------- */}
              {manageSection === 'overview' && (
                <div className="space-y-6">
                  {/* Executive Positioning Banner */}
                  <div className="p-4 bg-gradient-to-r from-[#F0FDF4] to-[#ECFDF5] rounded-2xl border border-[#A7F3D0] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-[#047857]" />
                        <span className="font-bold text-sm text-[#065F46]">
                          Tier Value Proposition & Target Market
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#047857] bg-white px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                        {managedPlan.target_company_size}
                      </span>
                    </div>
                    <p className="text-xs text-[#065F46] font-medium leading-relaxed">
                      {managedPlan.value_proposition}
                    </p>
                  </div>

                  {/* Financial & Scale KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[11px]">Monthly Price</span>
                      <strong className="text-base text-[#0F172B] block mt-0.5">
                        ₹{managedPlan.monthly_price.toLocaleString()}
                      </strong>
                      <span className="text-[10px] text-[#047857] font-semibold">
                        ₹{Math.round(managedPlan.monthly_price / managedPlan.included_seats)} / seat / mo
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[11px]">Included Capacity</span>
                      <strong className="text-base text-[#0F172B] block mt-0.5">
                        {managedPlan.included_seats} Seats
                      </strong>
                      <span className="text-[10px] text-[#64748B]">
                        Max: {managedPlan.max_seats === -1 ? 'Unlimited' : `${managedPlan.max_seats} Seats`}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[11px]">Subscribed Tenants</span>
                      <strong className="text-base text-[#047857] block mt-0.5">
                        {managedPlan.tenant_count} Organizations
                      </strong>
                      <span className="text-[10px] text-[#64748B]">
                        {managedPlan.tenant_count > 0 ? 'Generating live MRR' : 'Draft / No tenants'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                      <span className="text-[#64748B] block text-[11px]">Annual Run-Rate (ARR)</span>
                      <strong className="text-base text-[#0F172B] block mt-0.5">
                        ₹{((managedPlan.monthly_price * 12 * managedPlan.tenant_count) / 100000).toFixed(1)} Lakhs
                      </strong>
                      <span className="text-[10px] text-[#047857] font-semibold">
                        ₹{((managedPlan.monthly_price * managedPlan.tenant_count) / 100000).toFixed(1)}L / mo MRR
                      </span>
                    </div>
                  </div>

                  {/* Customer-Facing Card Preview */}
                  <div className="space-y-3">
                    <span className="font-bold text-sm text-[#0F172B]">Customer-Facing Pricing Card Preview:</span>
                    <div className="max-w-md p-6 bg-white rounded-2xl border-2 border-[#047857] shadow-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#047857]">
                            {managedPlan.name}
                          </span>
                          <h4 className="text-xl font-extrabold text-[#0F172B] mt-2">
                            ₹{managedPlan.monthly_price.toLocaleString()}{' '}
                            <span className="text-xs font-normal text-[#64748B]">/ month</span>
                          </h4>
                          <p className="text-[11px] text-[#047857] font-semibold">
                            Billed annually at ₹{(managedPlan.annual_price / 100000).toFixed(1)}L (Save ₹
                            {(managedPlan.monthly_price * 12 - managedPlan.annual_price).toLocaleString()})
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[#64748B] leading-relaxed">{managedPlan.description}</p>

                      <div className="pt-3 border-t border-[#F1F5F9] space-y-2">
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                          Key Included Entitlements:
                        </span>
                        <div className="space-y-1.5">
                          {managedPlan.features.slice(0, 8).map((fCode) => {
                            const feat = features.find((f) => f.code === fCode);
                            return (
                              <div key={fCode} className="flex items-center gap-2 text-[#334155]">
                                <CheckCircle2 className="h-4 w-4 text-[#047857] flex-shrink-0" />
                                <span className="font-medium">{feat?.name || fCode}</span>
                              </div>
                            );
                          })}
                          {managedPlan.features.length > 8 && (
                            <div className="text-[11px] font-semibold text-[#047857] pt-1">
                              + {managedPlan.features.length - 8} additional capabilities included
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------------
                  SECTION 2: PRICING & ECONOMICS
                 --------------------------------------------------------- */}
              {manageSection === 'pricing' && (
                <div className="space-y-6">
                  {/* Pricing Inputs */}
                  <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#0F172B]">Plan Pricing Configuration</span>
                      <span className="text-[11px] font-semibold text-[#047857]">Currency: Indian Rupee (INR ₹)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-[#334155] block mb-1">
                          Monthly Subscription Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                          <input
                            type="number"
                            value={managedPlan.monthly_price}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const annualCalc = val * 10;
                              setManagedPlan({ ...managedPlan, monthly_price: val, annual_price: annualCalc });
                              platformTierPlansService.updatePlan(managedPlan.id, {
                                monthly_price: val,
                                annual_price: annualCalc,
                              });
                              refreshData();
                            }}
                            className="w-full pl-7 pr-3 py-2 border rounded-xl bg-white text-xs font-semibold"
                          />
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-1">
                          Effective: ₹{Math.round(managedPlan.monthly_price / managedPlan.included_seats)} / seat / month
                        </p>
                      </div>

                      <div>
                        <label className="font-semibold text-[#334155] block mb-1">
                          Annual Subscription Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                          <input
                            type="number"
                            value={managedPlan.annual_price}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setManagedPlan({ ...managedPlan, annual_price: val });
                              platformTierPlansService.updatePlan(managedPlan.id, { annual_price: val });
                              refreshData();
                            }}
                            className="w-full pl-7 pr-3 py-2 border rounded-xl bg-white text-xs font-semibold"
                          />
                        </div>
                        <p className="text-[11px] text-[#047857] font-semibold mt-1">
                          Saves customer ₹{(managedPlan.monthly_price * 12 - managedPlan.annual_price).toLocaleString()} / year (2 Months Free)
                        </p>
                      </div>
                    </div>

                    {/* Overage Policy */}
                    <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#0F172B]">Allow Additional Seat Overage</div>
                        <div className="text-[11px] text-[#64748B]">
                          Allow organizations to add employees beyond {managedPlan.included_seats} seats at a fixed rate
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {managedPlan.allow_overage && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#64748B]">₹</span>
                            <input
                              type="number"
                              value={managedPlan.price_per_additional_seat}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setManagedPlan({ ...managedPlan, price_per_additional_seat: val });
                                platformTierPlansService.updatePlan(managedPlan.id, { price_per_additional_seat: val });
                                refreshData();
                              }}
                              className="w-20 p-1.5 border rounded bg-white text-xs text-center font-bold"
                            />
                            <span className="text-[11px] text-[#64748B]">/ seat / mo</span>
                          </div>
                        )}
                        <Switch
                          checked={managedPlan.allow_overage}
                          onChange={() => {
                            const next = !managedPlan.allow_overage;
                            setManagedPlan({ ...managedPlan, allow_overage: next });
                            platformTierPlansService.updatePlan(managedPlan.id, { allow_overage: next });
                            refreshData();
                          }}
                          label=""
                        />
                      </div>
                    </div>
                  </div>

                  {/* Revenue Cohort Metrics */}
                  <div className="p-5 bg-white rounded-2xl border border-[#E2E8F0] space-y-3">
                    <span className="font-bold text-sm text-[#0F172B]">Financial Performance & Revenue Metrics</span>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                        <span className="text-[#64748B] block text-[11px]">Active MRR</span>
                        <strong className="text-base text-[#047857] block mt-1">
                          ₹{((managedPlan.monthly_price * managedPlan.tenant_count) / 100000).toFixed(2)} Lakhs
                        </strong>
                      </div>
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                        <span className="text-[#64748B] block text-[11px]">Annualized Run-Rate</span>
                        <strong className="text-base text-[#0F172B] block mt-1">
                          ₹{((managedPlan.monthly_price * 12 * managedPlan.tenant_count) / 100000).toFixed(2)} Lakhs
                        </strong>
                      </div>
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border">
                        <span className="text-[#64748B] block text-[11px]">Average Rev Per Tenant</span>
                        <strong className="text-base text-[#0F172B] block mt-1">
                          ₹{managedPlan.monthly_price.toLocaleString()} / mo
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------------
                  SECTION 3: FEATURES & ENTITLEMENTS (RICH HUB)
                 --------------------------------------------------------- */}
              {manageSection === 'features' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-[#0F172B]">Included Feature Capabilities</span>
                      <p className="text-[11px] text-[#64748B]">
                        Select capabilities included in {managedPlan.name}. Toggles update immediately in real time.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                      {managedPlan.features.length} of {features.length} Features Enabled
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {features.map((feat) => {
                      const isIncluded = managedPlan.features.includes(feat.code);
                      return (
                        <div
                          key={feat.id}
                          onClick={() => {
                            const nextFeatures = isIncluded
                              ? managedPlan.features.filter((f) => f !== feat.code)
                              : [...managedPlan.features, feat.code];
                            setManagedPlan({ ...managedPlan, features: nextFeatures });
                            platformTierPlansService.updatePlan(managedPlan.id, { features: nextFeatures });
                            refreshData();
                          }}
                          className={cn(
                            'p-3.5 rounded-xl border flex items-start justify-between cursor-pointer transition-all hover:shadow-sm',
                            isIncluded
                              ? 'bg-[#F0FDF4] border-[#86EFAC]'
                              : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
                          )}
                        >
                          <div className="space-y-1 pr-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[#0F172B]">{feat.name}</span>
                              {feat.is_high_value && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                                  ★ HIGH VALUE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#475569] leading-snug">{feat.description}</p>
                            <div className="flex items-center gap-2 pt-0.5">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#475569] font-medium border">
                                {feat.category}
                              </span>
                              <span className="text-[10px] text-[#94A3B8] font-mono">{feat.code}</span>
                            </div>
                          </div>

                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              readOnly
                              className="h-4 w-4 rounded text-[#047857] focus:ring-[#047857] border-gray-300"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------------
                  SECTION 4: LIMITS & QUOTAS (RICH DASHBOARD)
                 --------------------------------------------------------- */}
              {manageSection === 'limits' && (
                <div className="space-y-6">
                  <div>
                    <span className="font-bold text-sm text-[#0F172B]">Resource Limits & Usage Quotas</span>
                    <p className="text-[11px] text-[#64748B]">
                      Define the hard operational limits for organizations subscribed to {managedPlan.name}.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Quota 1: Employee Seats */}
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#0F172B]">
                          <Users className="h-4 w-4 text-[#047857]" />
                          <span>Included Employee Seats</span>
                        </div>
                        <span className="text-[10px] text-[#64748B]">Employees</span>
                      </div>
                      <input
                        type="number"
                        value={managedPlan.quotas.max_employees}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...managedPlan.quotas, max_employees: val };
                          setManagedPlan({ ...managedPlan, quotas: updated, included_seats: val, max_seats: val });
                          platformTierPlansService.updatePlan(managedPlan.id, { quotas: updated, included_seats: val, max_seats: val });
                          refreshData();
                        }}
                        className="w-full p-2 border rounded-xl bg-white text-xs font-bold"
                      />
                      <p className="text-[10px] text-[#64748B]">
                        Baseline employee records included in standard subscription fee.
                      </p>
                    </div>

                    {/* Quota 2: Locations & Branches */}
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#0F172B]">
                          <Building2 className="h-4 w-4 text-[#047857]" />
                          <span>Max Physical Locations</span>
                        </div>
                        <span className="text-[10px] text-[#64748B]">Branches</span>
                      </div>
                      <input
                        type="number"
                        value={managedPlan.quotas.max_locations}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...managedPlan.quotas, max_locations: val };
                          setManagedPlan({ ...managedPlan, quotas: updated });
                          platformTierPlansService.updatePlan(managedPlan.id, { quotas: updated });
                          refreshData();
                        }}
                        className="w-full p-2 border rounded-xl bg-white text-xs font-bold"
                      />
                      <p className="text-[10px] text-[#64748B]">
                        Number of geofenced branches, offices, or plant facilities.
                      </p>
                    </div>

                    {/* Quota 3: Biometric Devices */}
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#0F172B]">
                          <Cpu className="h-4 w-4 text-[#047857]" />
                          <span>Biometric Hardware Terminals</span>
                        </div>
                        <span className="text-[10px] text-[#64748B]">Terminals</span>
                      </div>
                      <input
                        type="number"
                        value={managedPlan.quotas.max_biometric_devices}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...managedPlan.quotas, max_biometric_devices: val };
                          setManagedPlan({ ...managedPlan, quotas: updated });
                          platformTierPlansService.updatePlan(managedPlan.id, { quotas: updated });
                          refreshData();
                        }}
                        className="w-full p-2 border rounded-xl bg-white text-xs font-bold"
                      />
                      <p className="text-[10px] text-[#64748B]">
                        Connected turnstiles and biometric push daemon adapters.
                      </p>
                    </div>

                    {/* Quota 4: API Requests */}
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#0F172B]">
                          <Globe className="h-4 w-4 text-[#047857]" />
                          <span>API Requests / Month</span>
                        </div>
                        <span className="text-[10px] text-[#64748B]">Calls / Mo</span>
                      </div>
                      <input
                        type="number"
                        value={managedPlan.quotas.max_api_requests_per_month}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...managedPlan.quotas, max_api_requests_per_month: val };
                          setManagedPlan({ ...managedPlan, quotas: updated });
                          platformTierPlansService.updatePlan(managedPlan.id, { quotas: updated });
                          refreshData();
                        }}
                        className="w-full p-2 border rounded-xl bg-white text-xs font-bold"
                      />
                      <p className="text-[10px] text-[#64748B]">
                        Rate-limited REST API requests and webhook transmissions.
                      </p>
                    </div>

                    {/* Quota 5: Storage */}
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#0F172B]">
                          <HardDrive className="h-4 w-4 text-[#047857]" />
                          <span>Cloud Document Storage</span>
                        </div>
                        <span className="text-[10px] text-[#64748B]">GB</span>
                      </div>
                      <input
                        type="number"
                        value={managedPlan.quotas.max_storage_gb}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...managedPlan.quotas, max_storage_gb: val };
                          setManagedPlan({ ...managedPlan, quotas: updated });
                          platformTierPlansService.updatePlan(managedPlan.id, { quotas: updated });
                          refreshData();
                        }}
                        className="w-full p-2 border rounded-xl bg-white text-xs font-bold"
                      />
                      <p className="text-[10px] text-[#64748B]">
                        Secure encrypted storage for contracts, KYC, and payslips.
                      </p>
                    </div>

                    {/* Quota 6: WhatsApp Messages */}
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#0F172B]">
                          <MessageSquare className="h-4 w-4 text-[#047857]" />
                          <span>WhatsApp Messages / Month</span>
                        </div>
                        <span className="text-[10px] text-[#64748B]">Messages / Mo</span>
                      </div>
                      <input
                        type="number"
                        value={managedPlan.quotas.max_whatsapp_messages_per_month}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...managedPlan.quotas, max_whatsapp_messages_per_month: val };
                          setManagedPlan({ ...managedPlan, quotas: updated });
                          platformTierPlansService.updatePlan(managedPlan.id, { quotas: updated });
                          refreshData();
                        }}
                        className="w-full p-2 border rounded-xl bg-white text-xs font-bold"
                      />
                      <p className="text-[10px] text-[#64748B]">
                        WhatsApp Cloud API payslip deliveries and OTP notifications.
                      </p>
                    </div>
                  </div>

                  {/* Tier Comparison Reference Table */}
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3">
                    <span className="font-bold text-xs text-[#0F172B]">Plan-to-Plan Quotas Comparison Reference:</span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b text-[#64748B] font-semibold">
                            <th className="py-2 px-3">Quota Resource</th>
                            <th className="py-2 px-3">Starter</th>
                            <th className="py-2 px-3">Professional</th>
                            <th className="py-2 px-3">Business</th>
                            <th className="py-2 px-3">Enterprise</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] font-mono">
                          <tr>
                            <td className="py-2 px-3 font-sans font-medium text-[#0F172B]">Max Employees</td>
                            <td className="py-2 px-3">50</td>
                            <td className="py-2 px-3">200</td>
                            <td className="py-2 px-3">500</td>
                            <td className="py-2 px-3 text-[#047857] font-bold">5,000+</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-sans font-medium text-[#0F172B]">Biometric Terminals</td>
                            <td className="py-2 px-3">0</td>
                            <td className="py-2 px-3">5</td>
                            <td className="py-2 px-3">20</td>
                            <td className="py-2 px-3 text-[#047857] font-bold">100</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-sans font-medium text-[#0F172B]">WhatsApp Messages</td>
                            <td className="py-2 px-3">0</td>
                            <td className="py-2 px-3">2,000 / mo</td>
                            <td className="py-2 px-3">10,000 / mo</td>
                            <td className="py-2 px-3 text-[#047857] font-bold">50,000 / mo</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-sans font-medium text-[#0F172B]">Support SLA</td>
                            <td className="py-2 px-3">48 Hours</td>
                            <td className="py-2 px-3">12 Hours</td>
                            <td className="py-2 px-3">4 Hours</td>
                            <td className="py-2 px-3 text-[#047857] font-bold">15 Mins (24/7)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------------
                  SECTION 5: HISTORY
                 --------------------------------------------------------- */}
              {manageSection === 'history' && (
                <div className="space-y-4">
                  <div>
                    <span className="font-bold text-sm text-[#0F172B]">Plan Modification Audit Trail</span>
                    <p className="text-[11px] text-[#64748B]">
                      Tamper-evident record of all price, feature, and quota modifications.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {managedPlan.history.map((h) => (
                      <div key={h.id} className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] text-xs space-y-1.5">
                        <div className="flex justify-between font-mono text-[10px] text-[#64748B]">
                          <span>{h.timestamp}</span>
                          <span className="font-semibold text-[#0F172B]">{h.actor}</span>
                        </div>
                        <div className="font-bold text-xs text-[#0F172B]">{h.change_summary}</div>
                        {h.before_value && (
                          <div className="text-[11px] text-[#475569] bg-white p-2 rounded-lg border font-mono">
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
          CREATE PLAN MODAL (5-Step Production Wizard)
         --------------------------------------------------------- */}
      {isCreatePlanOpen && (
        <CreatePlanWizardModal
          features={features}
          plans={activePlans}
          onClose={() => setIsCreatePlanOpen(false)}
          onCreated={(newPlan) => {
            setIsCreatePlanOpen(false);
            refreshData();
            if (newPlan) {
              setManagedPlan(newPlan);
              setManageSection('overview');
            }
          }}
        />
      )}

      {/* ---------------------------------------------------------
          CREATE FEATURE DRAWER (4-Section Guided Capability Builder)
         --------------------------------------------------------- */}
      {isCreateFeatureOpen && (
        <CreateFeatureDrawer
          features={features}
          plans={activePlans}
          onClose={() => setIsCreateFeatureOpen(false)}
          onCreated={(newFeat) => {
            setIsCreateFeatureOpen(false);
            refreshData();
            if (newFeat) {
              setInspectedFeature(newFeat);
            }
          }}
        />
      )}

      {/* ---------------------------------------------------------
          FEATURE INSPECTOR DRAWER (7-Tab Enterprise Inspector)
         --------------------------------------------------------- */}
      {inspectedFeature && (
        <FeatureInspectorDrawer
          feature={inspectedFeature}
          plans={activePlans}
          features={features}
          onClose={() => setInspectedFeature(null)}
          onEdit={(feat) => setEditingFeature(feat)}
          onDuplicate={(feat) => handleDuplicateFeature(feat.id)}
          onArchive={(feat) => {
            handleArchiveFeature(feat.id);
            setInspectedFeature(null);
          }}
          onDelete={async (feat) => {
            await platformTierPlansService.deleteFeature(feat.id);
            refreshData();
            setInspectedFeature(null);
          }}
          onTogglePlanEntitlement={handleTogglePlanEntitlement}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* ---------------------------------------------------------
          EDIT FEATURE DRAWER
         --------------------------------------------------------- */}
      {editingFeature && (
        <EditFeatureDrawer
          feature={editingFeature}
          features={features}
          onClose={() => setEditingFeature(null)}
          onSaved={(updated) => {
            setEditingFeature(null);
            refreshData();
            setInspectedFeature(updated);
          }}
        />
      )}

      {/* ---------------------------------------------------------
          COMPARE PLANS & PRICING MODAL (WORLD-CLASS MATRIX)
         --------------------------------------------------------- */}
      {isCompareOpen && (
        <ComparePlansModal
          plans={activePlans}
          features={features}
          onClose={() => setIsCompareOpen(false)}
        />
      )}
    </div>
  );
};

/**
 * Compare Plans & Pricing Modal (World-Class Comprehensive SaaS Matrix)
 */
const ComparePlansModal: React.FC<{
  plans: TierPlan[];
  features: PlanFeatureItem[];
  onClose: () => void;
}> = ({ plans, features, onClose }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const categories: FeatureCategory[] = [
    'Core HR',
    'Attendance',
    'Leave',
    'Payroll',
    'WhatsApp & Messaging',
    'Recruitment',
    'Performance',
    'AI & Copilot',
    'Integrations & Security',
    'Support & SLAs',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-6xl w-full shadow-2xl border border-[#CBD5E1] flex flex-col max-h-[92vh] overflow-hidden text-xs">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F8FAFC] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-[#0F172B] tracking-tight">
                Compare WorkForceOS Subscription Plans & Entitlements
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                4 Tier Plans Active
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Side-by-side comparison of pricing, operational capacity, resource quotas, and capability entitlements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Monthly / Annual Toggle */}
            <div className="flex items-center bg-[#E2E8F0] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  billingCycle === 'monthly' ? 'bg-white text-[#0F172B] shadow-xs' : 'text-[#64748B] hover:text-[#0F172B]'
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  billingCycle === 'annual' ? 'bg-[#047857] text-white shadow-xs' : 'text-[#64748B] hover:text-[#0F172B]'
                )}
              >
                Annual <span className="bg-[#A7F3D0] text-[#065F46] text-[9px] px-1.5 py-0.2 rounded font-extrabold">Save 17%</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#E2E8F0] rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Unified Scrollable Table with Solid Sticky Thead */}
        <div className="overflow-x-auto overflow-y-auto flex-1 p-6">
          <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              {/* Sticky Solid Table Header */}
              <thead className="sticky top-0 z-30 bg-[#F8FAFC] shadow-sm border-b border-[#E2E8F0]">
                <tr className="bg-[#F8FAFC]">
                  <th className="p-4 w-1/5 bg-[#F8FAFC] align-top">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Plan Matrix</span>
                    <h3 className="text-sm font-bold text-[#0F172B]">Plan Tiers & Economics</h3>
                    <p className="text-[11px] text-[#64748B] font-normal mt-0.5">Feature unlocks & capacity comparison</p>
                  </th>
                  {plans.map((p) => {
                    const isPro = p.name === 'Professional';
                    const price = billingCycle === 'annual' ? Math.round(p.annual_price / 12) : p.monthly_price;
                    return (
                      <th
                        key={p.id}
                        className={cn(
                          'p-4 w-1/5 text-center align-top relative transition-all border-l border-[#E2E8F0]',
                          isPro ? 'bg-[#F0FDF4]' : 'bg-[#F8FAFC]'
                        )}
                      >
                        {isPro && (
                          <div className="mb-1">
                            <span className="bg-[#047857] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                              ★ Most Popular
                            </span>
                          </div>
                        )}
                        <div className="font-extrabold text-sm text-[#0F172B]">{p.name}</div>
                        <div className="text-lg font-extrabold text-[#0F172B] mt-0.5">
                          ₹{Math.round(price / 1000)}k
                          <span className="text-[10px] font-normal text-[#64748B]"> / mo</span>
                        </div>
                        <div className="text-[10px] text-[#047857] font-semibold mt-0.5">
                          ₹{Math.round(price / p.included_seats)} / seat / mo
                        </div>
                        <div className="text-[10px] text-[#64748B] font-normal mt-0.5">
                          Max {p.max_seats === -1 ? 'Unlimited' : `${p.max_seats} Seats`}
                        </div>
                        <div className="text-[10px] text-[#475569] font-medium mt-1 pt-1 border-t border-[#CBD5E1]">
                          {p.tenant_count} Active Tenants
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {/* Section 1: Resource Quotas Header */}
                <tr className="bg-[#F1F5F9] font-bold text-xs text-[#0F172B]">
                  <td colSpan={5} className="py-2.5 px-4 bg-[#F1F5F9]">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-[#047857]" />
                      <span>Operational Resource Quotas & Limits</span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F172B]">Included Employee Capacity</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-2.5 px-4 text-center font-mono font-bold text-[#0F172B] border-l border-[#F1F5F9]">
                      {p.included_seats} Employees
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F172B]">Physical Locations / Branches</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-2.5 px-4 text-center font-mono border-l border-[#F1F5F9]">
                      {p.quotas.max_locations} Locations
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F172B]">Biometric Turnstile Terminals</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-2.5 px-4 text-center font-mono border-l border-[#F1F5F9]">
                      {p.quotas.max_biometric_devices === 0 ? (
                        <span className="text-[#CBD5E1] font-bold">—</span>
                      ) : (
                        <span className="text-[#047857] font-bold">{p.quotas.max_biometric_devices} Terminals</span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F172B]">Monthly API Gateway Requests</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-2.5 px-4 text-center font-mono border-l border-[#F1F5F9]">
                      {(p.quotas.max_api_requests_per_month / 1000).toLocaleString()}k Calls / mo
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F172B]">Cloud Document Storage</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-2.5 px-4 text-center font-mono border-l border-[#F1F5F9]">
                      {p.quotas.max_storage_gb} GB
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F172B]">WhatsApp Cloud Messages / Month</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-2.5 px-4 text-center font-mono border-l border-[#F1F5F9]">
                      {p.quotas.max_whatsapp_messages_per_month === 0 ? (
                        <span className="text-[#CBD5E1] font-bold">—</span>
                      ) : (
                        <span className="text-[#047857] font-bold">
                          {(p.quotas.max_whatsapp_messages_per_month / 1000).toLocaleString()}k / mo
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F172B]">Support Response SLA</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-2.5 px-4 text-center font-semibold text-[#047857] border-l border-[#F1F5F9]">
                      {p.quotas.support_sla_hours === 0.25 ? '15m 24/7 Hotline' : `${p.quotas.support_sla_hours}h SLA`}
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F172B]">Data Retention & Audit History</td>
                  {plans.map((p) => (
                    <td key={p.id} className="py-2.5 px-4 text-center font-mono text-[#334155] border-l border-[#F1F5F9]">
                      {p.quotas.data_retention_years || 1} Years
                    </td>
                  ))}
                </tr>

                {/* Section 2: Grouped Feature Capabilities Matrix */}
                {categories.map((cat) => {
                  const catFeatures = features.filter((f) => f.category === cat);
                  if (catFeatures.length === 0) return null;
                  return (
                    <React.Fragment key={cat}>
                      <tr className="bg-[#F8FAFC] font-bold text-xs text-[#0F172B] border-t-2 border-[#E2E8F0]">
                        <td colSpan={5} className="py-2.5 px-4 bg-[#F8FAFC]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#047857]">●</span>
                            <span>{cat}</span>
                            <span className="text-[10px] text-[#64748B] font-normal">({catFeatures.length} capabilities)</span>
                          </div>
                        </td>
                      </tr>

                      {catFeatures.map((f) => (
                        <tr key={f.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-[#0F172B] flex items-center gap-1.5">
                              <span>{f.name}</span>
                              {f.is_high_value && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                                  ★ HIGH VALUE
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#64748B] line-clamp-1">{f.description}</p>
                          </td>

                          {plans.map((p) => {
                            const hasFeat = p.features.includes(f.code);
                            return (
                              <td key={p.id} className="py-2.5 px-4 text-center border-l border-[#F1F5F9]">
                                {hasFeat ? (
                                  <div className="h-5 w-5 rounded-full bg-[#ECFDF5] text-[#047857] flex items-center justify-center mx-auto border border-[#A7F3D0]">
                                    <Check className="h-3 w-3" />
                                  </div>
                                ) : (
                                  <span className="text-[#CBD5E1] font-bold">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC] flex-shrink-0">
          <div className="text-[11px] text-[#64748B]">
            All prices listed in Indian Rupees (INR ₹), excluding applicable statutory GST.
          </div>
          <Button variant="primary" size="sm" onClick={onClose} className="bg-[#047857] hover:bg-[#036246] text-white font-semibold">
            Done Reviewing Matrix
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================
 * WORKFORCEOS — 5-STEP GUIDED SUBSCRIPTION PLAN CREATION WIZARD
 * Full-Stack Plan Creation with Pricing, Entitlements, & Quotas
 * ============================================================
 */
interface CreatePlanWizardModalProps {
  features: PlanFeatureItem[];
  plans: TierPlan[];
  onClose: () => void;
  onCreated: (newPlan?: TierPlan) => void;
}

const CreatePlanWizardModal: React.FC<CreatePlanWizardModalProps> = ({
  features,
  plans,
  onClose,
  onCreated,
}) => {
  // Wizard Steps
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<TierPlan | null>(null);

  // -------------------------------------------------------------
  // STEP 1: BASICS
  // -------------------------------------------------------------
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [category, setCategory] = useState('Professional');
  const [targetSegment, setTargetSegment] = useState('Growing Business');
  const [isRecommended, setIsRecommended] = useState(false);
  const [sortOrder, setSortOrder] = useState(2);

  // -------------------------------------------------------------
  // STEP 2: PRICING & CAPACITY
  // -------------------------------------------------------------
  const [billingModel, setBillingModel] = useState('Per Seat');
  const [currency, setCurrency] = useState('INR');
  const [monthlyPrice, setMonthlyPrice] = useState(45000);
  const [annualPrice, setAnnualPrice] = useState(450000);
  const [isAnnualPriceOverridden, setIsAnnualPriceOverridden] = useState(false);
  const [billingInterval, setBillingInterval] = useState('Both');
  const [includedSeats, setIncludedSeats] = useState(200);
  const [minSeats, setMinSeats] = useState(25);
  const [unlimitedSeats, setUnlimitedSeats] = useState(false);
  const [maxSeats, setMaxSeats] = useState(200);
  const [allowOverage, setAllowOverage] = useState(true);
  const [pricePerAdditionalSeat, setPricePerAdditionalSeat] = useState(150);
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialDays, setTrialDays] = useState(14);
  const [setupFee, setSetupFee] = useState(0);

  // -------------------------------------------------------------
  // STEP 3: FEATURES & ENTITLEMENTS
  // -------------------------------------------------------------
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'CORE_EMPLOYEE_DIR',
    'ESS_PORTAL',
    'TEAM_LEAD_PORTAL',
    'ATTENDANCE_BASIC',
    'ATTENDANCE_GPS',
    'LEAVE_BASIC',
    'PAYROLL_STANDARD',
    'PAYROLL_STATUTORY',
  ]);
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState('All');

  // -------------------------------------------------------------
  // STEP 4: LIMITS & USAGE QUOTAS
  // -------------------------------------------------------------
  const [maxEmployees, setMaxEmployees] = useState(200);
  const [maxLocations, setMaxLocations] = useState(10);
  const [maxBiometricDevices, setMaxBiometricDevices] = useState(5);
  const [maxApiRequests, setMaxApiRequests] = useState(50000);
  const [maxStorageGb, setMaxStorageGb] = useState(50);
  const [maxWhatsapp, setMaxWhatsapp] = useState(2500);
  const [supportSlaHours, setSupportSlaHours] = useState(12);
  const [dataRetentionYears, setDataRetentionYears] = useState(3);
  const [overagePolicy, setOveragePolicy] = useState('Allow and Bill');

  // Categories list
  const categoriesList: FeatureCategory[] = useMemo(() => [
    'Core HR',
    'Employee Self-Service',
    'Attendance',
    'Leave',
    'Payroll',
    'WhatsApp & Messaging',
    'Recruitment',
    'Performance',
    'AI & Copilot',
    'Biometrics & Hardware',
    'Integrations & Security',
    'Support & SLAs',
  ], []);

  // Real-time Plan Code availability check
  const codeStatus = useMemo(() => {
    if (!code.trim()) return null;
    return platformTierPlansService.checkPlanCodeAvailability(code);
  }, [code]);

  // Auto-sync code from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isCodeManuallyEdited) {
      const generated = val
        .toUpperCase()
        .replace(/[^A-Z0-9\s_]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      setCode(generated);
    }
  };

  // Auto-sync monthly to annual calculation (10 months = 2 months free ~16.7% discount)
  const handleMonthlyPriceChange = (val: number) => {
    setMonthlyPrice(val);
    if (!isAnnualPriceOverridden) {
      setAnnualPrice(val * 10);
    }
  };

  // Copy feature entitlements from an existing plan
  const handleCopyFromPlan = (sourcePlanId: string) => {
    const src = plans.find((p) => p.id === sourcePlanId || p.code === sourcePlanId);
    if (src) {
      setSelectedFeatures([...src.features]);
    }
  };

  // Bulk category toggling
  const handleToggleCategoryFeatures = (cat: string) => {
    const catFeats = features.filter((f) => f.category === cat).map((f) => f.code);
    const allSelected = catFeats.every((c) => selectedFeatures.includes(c));

    if (allSelected) {
      setSelectedFeatures(selectedFeatures.filter((c) => !catFeats.includes(c)));
    } else {
      const merged = new Set([...selectedFeatures, ...catFeats]);
      setSelectedFeatures(Array.from(merged));
    }
  };

  // Step Validation Logic
  const isStep1Valid = name.trim().length >= 3 && code.trim().length >= 2 && (codeStatus?.available ?? false);
  const isStep2Valid = monthlyPrice >= 0 && annualPrice >= 0 && includedSeats >= minSeats;
  const isStep3Valid = selectedFeatures.length > 0;
  const isStep4Valid = maxEmployees >= 1;

  // Final Submission
  const handleCreatePlan = async (status: PlanStatus = 'Draft') => {
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newPlan = await platformTierPlansService.createPlan({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || `Enterprise subscription tier for ${name}`,
        internal_notes: internalNotes.trim(),
        category,
        target_company_size: targetSegment,
        target_segment: targetSegment,
        status,
        currency,
        monthly_price: monthlyPrice,
        annual_price: annualPrice,
        min_seats: minSeats,
        included_seats: includedSeats,
        max_seats: unlimitedSeats ? -1 : maxSeats,
        unlimited_seats: unlimitedSeats,
        allow_overage: allowOverage,
        price_per_additional_seat: pricePerAdditionalSeat,
        trial_enabled: trialEnabled,
        trial_days: trialDays,
        setup_fee: setupFee,
        features: selectedFeatures,
        quotas: {
          max_employees: maxEmployees,
          max_locations: maxLocations,
          max_biometric_devices: maxBiometricDevices,
          max_api_requests_per_month: maxApiRequests,
          max_storage_gb: maxStorageGb,
          max_whatsapp_messages_per_month: maxWhatsapp,
          support_sla_hours: supportSlaHours,
          data_retention_years: dataRetentionYears,
        },
      });

      setCreatedResult(newPlan);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create subscription plan.');
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
  };

  // Filtered features list
  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
        f.code.toLowerCase().includes(featureSearch.toLowerCase());
      const matchesCat = featureCategoryFilter === 'All' || f.category === featureCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [features, featureSearch, featureCategoryFilter]);

  // Annual savings calculation
  const annualSavings = monthlyPrice * 12 - annualPrice;
  const annualDiscountPct = monthlyPrice * 12 > 0 ? Math.round((annualSavings / (monthlyPrice * 12)) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E2E8F0] overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <div>
            <h3 className="text-lg font-bold text-[#0F172B]">Create Subscription Plan</h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Define pricing, capacity, features, and usage rules for a new WorkForceOS subscription tier.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 5-Step Progress Indicator */}
        {!createdResult && (
          <div className="px-6 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { s: 1, label: 'Basics' },
                { s: 2, label: 'Pricing' },
                { s: 3, label: 'Features' },
                { s: 4, label: 'Limits' },
                { s: 5, label: 'Review' },
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
                        'flex items-center gap-1.5 text-xs font-semibold select-none',
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
                          'flex-1 h-0.5 mx-2.5 transition-colors',
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
                <h4 className="text-xl font-bold text-[#0F172B]">Subscription Plan Created</h4>
                <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                  <strong>{createdResult.name} ({createdResult.code})</strong> has been successfully configured and registered in the platform catalog.
                </p>
              </div>

              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="text-[#64748B]">Plan Code:</span>
                  <span className="font-mono font-bold text-[#0F172B]">{createdResult.code}</span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="text-[#64748B]">Pricing:</span>
                  <span className="font-bold text-[#047857]">
                    ₹{createdResult.monthly_price.toLocaleString()}/mo • ₹{createdResult.annual_price.toLocaleString()}/yr
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                  <span className="text-[#64748B]">Included Capacity:</span>
                  <span className="font-semibold text-[#0F172B]">{createdResult.included_seats} Employee Seats</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Entitlements:</span>
                  <span className="font-semibold text-[#047857]">{createdResult.features.length} Capabilities Included</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onCreated(createdResult)}
                  className="bg-[#047857] hover:bg-[#036246] text-white px-4 cursor-pointer"
                >
                  Manage Plan Details →
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetForAnother}
                  className="border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  + Create Another Plan
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-[#64748B] hover:text-[#0F172B] cursor-pointer"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] flex items-center justify-between gap-3 text-xs text-[#991B1B]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#DC2626] flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button onClick={() => setErrorMessage(null)} className="text-[#DC2626] font-bold hover:underline">
                    Dismiss
                  </button>
                </div>
              )}

              {/* ---------------------------------------------------
                  STEP 1: BASICS
                 --------------------------------------------------- */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Plan Name */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">
                        Plan Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Growth Pro"
                        value={name}
                        onChange={handleNameChange}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:border-[#047857] outline-none"
                      />
                      <span className="text-[11px] text-[#64748B] block">Customer-facing plan name.</span>
                    </div>

                    {/* Internal Code */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#0F172B] block">
                          Internal Code <span className="text-[#DC2626]">*</span>
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
                        placeholder="e.g. GROWTH_PRO"
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value.toUpperCase());
                          setIsCodeManuallyEdited(true);
                        }}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold focus:border-[#047857] outline-none"
                      />
                      <span className="text-[11px] text-[#64748B] block">Unique machine-readable identifier.</span>
                    </div>
                  </div>

                  {/* Customer-Facing Description */}
                  <div className="space-y-1">
                    <label className="font-bold text-[#0F172B] block">
                      Display Description <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="For growing organizations requiring advanced workforce management, GPS attendance and statutory compliance."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:border-[#047857] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Plan Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs focus:border-[#047857] outline-none cursor-pointer"
                      >
                        {['Starter', 'Professional', 'Business', 'Enterprise', 'Custom'].map((c) => (
                          <option key={c} value={c}>
                            {c} Tier
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Segment */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Target Customer Segment</label>
                      <select
                        value={targetSegment}
                        onChange={(e) => setTargetSegment(e.target.value)}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs focus:border-[#047857] outline-none cursor-pointer"
                      >
                        {['Small Business (10-50)', 'Growing Business (50-200)', 'Mid-Market (200-500)', 'Enterprise (500+)', 'Custom Contract'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Recommended Badge & Sort Order */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <strong className="text-xs text-[#0F172B] block">Recommended Badge</strong>
                        <span className="text-[10px] text-[#64748B]">Highlight as most popular choice</span>
                      </div>
                      <Switch checked={isRecommended} onChange={(e) => setIsRecommended(e.target.checked)} />
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <strong className="text-xs text-[#0F172B] block">Display Sort Order</strong>
                        <span className="text-[10px] text-[#64748B]">Position in pricing matrices</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={sortOrder}
                        onChange={(e) => setSortOrder(Number(e.target.value))}
                        className="w-16 p-1.5 border rounded-lg bg-white text-center font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------
                  STEP 2: PRICING & CAPACITY
                 --------------------------------------------------- */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Monthly Price */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Monthly Price (INR ₹)</label>
                      <input
                        type="number"
                        value={monthlyPrice}
                        onChange={(e) => handleMonthlyPriceChange(Number(e.target.value))}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold focus:border-[#047857] outline-none"
                      />
                    </div>

                    {/* Annual Price */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Annual Price (INR ₹)</label>
                      <input
                        type="number"
                        value={annualPrice}
                        onChange={(e) => {
                          setAnnualPrice(Number(e.target.value));
                          setIsAnnualPriceOverridden(true);
                        }}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold focus:border-[#047857] outline-none"
                      />
                    </div>

                    {/* Currency */}
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs focus:border-[#047857] outline-none cursor-pointer"
                      >
                        <option value="INR">INR (₹ Indian Rupee)</option>
                        <option value="USD">USD ($ US Dollar)</option>
                        <option value="EUR">EUR (€ Euro)</option>
                        <option value="GBP">GBP (£ British Pound)</option>
                      </select>
                    </div>
                  </div>

                  {/* Pricing Preview Box */}
                  <div className="p-4 bg-[#ECFDF5] rounded-2xl border border-[#A7F3D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#047857] tracking-wider block">Live Pricing Preview</span>
                      <div className="text-base font-bold text-[#0F172B] mt-0.5">
                        ₹{monthlyPrice.toLocaleString()} <span className="text-xs font-normal text-[#64748B]">/ month</span> • ₹{annualPrice.toLocaleString()} <span className="text-xs font-normal text-[#64748B]">/ year</span>
                      </div>
                    </div>
                    {annualSavings > 0 && (
                      <span className="px-3 py-1.5 rounded-full bg-[#10B981] text-white text-xs font-bold shadow-xs whitespace-nowrap">
                        Save ₹{annualSavings.toLocaleString()} annually ({annualDiscountPct}%)
                      </span>
                    )}
                  </div>

                  {/* Seat Capacity */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Included Seats</label>
                      <input
                        type="number"
                        value={includedSeats}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setIncludedSeats(v);
                          setMaxEmployees(v);
                        }}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Minimum Seats</label>
                      <input
                        type="number"
                        value={minSeats}
                        onChange={(e) => setMinSeats(Number(e.target.value))}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-[#0F172B] block">Maximum Seats</label>
                        <label className="text-[10px] text-[#047857] flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={unlimitedSeats}
                            onChange={(e) => setUnlimitedSeats(e.target.checked)}
                          />
                          <span>Unlimited</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        disabled={unlimitedSeats}
                        value={unlimitedSeats ? 99999 : maxSeats}
                        onChange={(e) => setMaxSeats(Number(e.target.value))}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-bold outline-none disabled:bg-[#F1F5F9]"
                      />
                    </div>
                  </div>

                  {/* Overage & Trial Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-[#0F172B]">Seat Overage Billing</strong>
                        <Switch checked={allowOverage} onChange={(e) => setAllowOverage(e.target.checked)} />
                      </div>
                      {allowOverage && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] text-[#64748B]">Additional Seat Price:</span>
                          <input
                            type="number"
                            value={pricePerAdditionalSeat}
                            onChange={(e) => setPricePerAdditionalSeat(Number(e.target.value))}
                            className="w-24 p-1.5 border rounded-lg bg-white text-xs font-bold"
                          />
                          <span className="text-[10px] text-[#64748B]">/seat/mo</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-[#0F172B]">Free Trial Period</strong>
                        <Switch checked={trialEnabled} onChange={(e) => setTrialEnabled(e.target.checked)} />
                      </div>
                      {trialEnabled && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] text-[#64748B]">Trial Length:</span>
                          <input
                            type="number"
                            value={trialDays}
                            onChange={(e) => setTrialDays(Number(e.target.value))}
                            className="w-20 p-1.5 border rounded-lg bg-white text-xs font-bold"
                          />
                          <span className="text-[10px] text-[#64748B]">Days</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------
                  STEP 3: FEATURES & ENTITLEMENTS
                 --------------------------------------------------- */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Top Bar: Search + Copy From Plan */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1">
                        <Search className="h-3.5 w-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search capabilities..."
                          value={featureSearch}
                          onChange={(e) => setFeatureSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 border border-[#CBD5E1] rounded-lg bg-white text-xs outline-none focus:border-[#047857]"
                        />
                      </div>

                      <select
                        value={featureCategoryFilter}
                        onChange={(e) => setFeatureCategoryFilter(e.target.value)}
                        className="p-1.5 border border-[#CBD5E1] rounded-lg bg-white text-xs outline-none"
                      >
                        <option value="All">All Categories</option>
                        {categoriesList.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Copy from Plan */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#64748B] whitespace-nowrap">Copy from:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleCopyFromPlan(e.target.value);
                        }}
                        className="p-1.5 border border-[#047857] text-[#047857] font-semibold rounded-lg bg-white text-xs outline-none cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select Plan...
                        </option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.features.length} feats)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="text-[11px] font-semibold text-[#047857] flex items-center justify-between">
                    <span>● {selectedFeatures.length} of {features.length} capabilities selected for this plan</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedFeatures.length === features.length) {
                          setSelectedFeatures([]);
                        } else {
                          setSelectedFeatures(features.map((f) => f.code));
                        }
                      }}
                      className="text-xs text-[#047857] hover:underline font-bold cursor-pointer"
                    >
                      {selectedFeatures.length === features.length ? 'Clear All' : 'Select All Capabilities'}
                    </button>
                  </div>

                  {/* Grouped Features Matrix */}
                  <div className="max-h-[360px] overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y divide-[#F1F5F9]">
                    {categoriesList.map((cat) => {
                      const catFeats = filteredFeatures.filter((f) => f.category === cat);
                      if (catFeats.length === 0) return null;

                      const allCatSelected = catFeats.every((f) => selectedFeatures.includes(f.code));

                      return (
                        <div key={cat} className="space-y-1">
                          <div className="bg-[#F8FAFC] px-4 py-2 flex items-center justify-between border-b border-[#E2E8F0]">
                            <span className="font-bold text-xs text-[#0F172B]">{cat}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleCategoryFeatures(cat)}
                              className="text-[11px] text-[#047857] font-semibold hover:underline cursor-pointer"
                            >
                              {allCatSelected ? 'Deselect Category' : 'Select Category'}
                            </button>
                          </div>

                          <div className="divide-y divide-[#F1F5F9]">
                            {catFeats.map((f) => {
                              const isChecked = selectedFeatures.includes(f.code);
                              return (
                                <label
                                  key={f.id}
                                  className={cn(
                                    'flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors',
                                    isChecked ? 'bg-[#ECFDF5]/40 hover:bg-[#ECFDF5]/70' : 'hover:bg-[#F8FAFC]'
                                  )}
                                >
                                  <div className="space-y-0.5 pr-4">
                                    <div className="font-bold text-xs text-[#0F172B] flex items-center gap-2">
                                      <span>{f.name}</span>
                                      {f.is_high_value && (
                                        <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                                          ★ HIGH VALUE
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-[#64748B] line-clamp-1">{f.description}</p>
                                  </div>

                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedFeatures(
                                        isChecked
                                          ? selectedFeatures.filter((x) => x !== f.code)
                                          : [...selectedFeatures, f.code]
                                      );
                                    }}
                                    className="h-4 w-4 text-[#047857] accent-[#047857] cursor-pointer"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------
                  STEP 4: LIMITS & USAGE QUOTAS
                 --------------------------------------------------- */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                      <label className="font-bold text-xs text-[#0F172B] block">Max Employee Accounts</label>
                      <input
                        type="number"
                        value={maxEmployees}
                        onChange={(e) => setMaxEmployees(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg bg-white text-xs font-bold"
                      />
                      <span className="text-[10px] text-[#64748B]">Active tenant headcount capacity.</span>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                      <label className="font-bold text-xs text-[#0F172B] block">Office Branch Locations</label>
                      <input
                        type="number"
                        value={maxLocations}
                        onChange={(e) => setMaxLocations(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg bg-white text-xs font-bold"
                      />
                      <span className="text-[10px] text-[#64748B]">Geofenced multi-branch sites.</span>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                      <label className="font-bold text-xs text-[#0F172B] block">Biometric Turnstiles & Devices</label>
                      <input
                        type="number"
                        value={maxBiometricDevices}
                        onChange={(e) => setMaxBiometricDevices(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg bg-white text-xs font-bold"
                      />
                      <span className="text-[10px] text-[#64748B]">Hardware adapter connections allowed.</span>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                      <label className="font-bold text-xs text-[#0F172B] block">Monthly API Requests</label>
                      <input
                        type="number"
                        value={maxApiRequests}
                        onChange={(e) => setMaxApiRequests(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg bg-white text-xs font-bold"
                      />
                      <span className="text-[10px] text-[#64748B]">API gateway calls per billing cycle.</span>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                      <label className="font-bold text-xs text-[#0F172B] block">Document Cloud Storage (GB)</label>
                      <input
                        type="number"
                        value={maxStorageGb}
                        onChange={(e) => setMaxStorageGb(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg bg-white text-xs font-bold"
                      />
                      <span className="text-[10px] text-[#64748B]">Encrypted document storage quota.</span>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                      <label className="font-bold text-xs text-[#0F172B] block">Monthly WhatsApp Messages</label>
                      <input
                        type="number"
                        value={maxWhatsapp}
                        onChange={(e) => setMaxWhatsapp(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg bg-white text-xs font-bold"
                      />
                      <span className="text-[10px] text-[#64748B]">Cloud API payslip notifications.</span>
                    </div>
                  </div>

                  {/* Support SLA & Retention */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Support Response SLA</label>
                      <select
                        value={supportSlaHours}
                        onChange={(e) => setSupportSlaHours(Number(e.target.value))}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs outline-none cursor-pointer"
                      >
                        <option value={48}>48 Hours (Standard Ticket Desk)</option>
                        <option value={12}>12 Hours (Priority Email Desk)</option>
                        <option value={4}>4 Hours (Dedicated Account Lead)</option>
                        <option value={0.25}>15 Minutes (24/7 Enterprise Hotline)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Audit Log Data Retention</label>
                      <select
                        value={dataRetentionYears}
                        onChange={(e) => setDataRetentionYears(Number(e.target.value))}
                        className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs outline-none cursor-pointer"
                      >
                        <option value={1}>1 Year Basic Audit Trail</option>
                        <option value={3}>3 Years Statutory Retention</option>
                        <option value={5}>5 Years Financial Compliance</option>
                        <option value={7}>7 Years Forensic SOC 2 Audit</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------
                  STEP 5: REVIEW & PUBLISH
                 --------------------------------------------------- */}
              {step === 5 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Basics Summary */}
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <span className="font-bold text-[#047857] uppercase text-[10px] tracking-wider block">Plan Identity</span>
                      <div className="text-sm font-bold text-[#0F172B]">{name}</div>
                      <div className="font-mono text-[11px] text-[#64748B]">{code}</div>
                      <div className="text-[11px] text-[#475569]">{description}</div>
                      <div className="text-[11px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                        Category: <strong>{category}</strong> • Target: <strong>{targetSegment}</strong>
                      </div>
                    </div>

                    {/* Pricing Summary */}
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <span className="font-bold text-[#047857] uppercase text-[10px] tracking-wider block">Pricing & Economics</span>
                      <div className="font-bold text-sm text-[#047857]">
                        ₹{monthlyPrice.toLocaleString()} <span className="text-xs font-normal text-[#64748B]">/ month</span>
                      </div>
                      <div>Annual: <strong>₹{annualPrice.toLocaleString()}/yr</strong></div>
                      <div>Included Seats: <strong>{includedSeats}</strong> {unlimitedSeats ? '(Unlimited Max)' : `(Max: ${maxSeats})`}</div>
                      <div>Overage: <strong>{allowOverage ? `₹${pricePerAdditionalSeat}/seat` : 'Blocked'}</strong></div>
                      <div>Trial: <strong>{trialEnabled ? `${trialDays} Days Free` : 'No Trial'}</strong></div>
                    </div>

                    {/* Features Summary */}
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <span className="font-bold text-[#047857] uppercase text-[10px] tracking-wider block">
                        Included Entitlements ({selectedFeatures.length})
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {selectedFeatures.slice(0, 4).map((c) => {
                          const f = features.find((x) => x.code === c);
                          return (
                            <div key={c} className="flex items-center gap-1.5 text-[11px] text-[#334155]">
                              <Check className="h-3 w-3 text-[#047857]" />
                              <span>{f?.name || c}</span>
                            </div>
                          );
                        })}
                        {selectedFeatures.length > 4 && (
                          <div className="text-[10px] text-[#64748B] font-semibold">
                            + {selectedFeatures.length - 4} more capabilities included
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quotas Summary */}
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                      <span className="font-bold text-[#047857] uppercase text-[10px] tracking-wider block">Quotas & Governance</span>
                      <div>Locations: <strong>{maxLocations}</strong> • Turnstiles: <strong>{maxBiometricDevices}</strong></div>
                      <div>API Rate: <strong>{maxApiRequests.toLocaleString()} req/mo</strong></div>
                      <div>Storage: <strong>{maxStorageGb} GB</strong> • WhatsApp: <strong>{maxWhatsapp.toLocaleString()}/mo</strong></div>
                      <div>SLA: <strong>{supportSlaHours === 0.25 ? '15m 24/7' : `${supportSlaHours}h response`}</strong></div>
                    </div>
                  </div>

                  {/* Safety Notice */}
                  <div className="p-3.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] flex items-center gap-2.5 text-xs text-[#1E40AF]">
                    <Shield className="h-4 w-4 text-[#2563EB] flex-shrink-0" />
                    <span>
                      Creating this plan registers it in the platform catalog. Existing client contracts will remain completely unmodified.
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

            {step < 5 ? (
              <Button
                variant="primary"
                size="sm"
                disabled={step === 1 ? !isStep1Valid : step === 2 ? !isStep2Valid : step === 3 ? !isStep3Valid : !isStep4Valid}
                onClick={() => setStep((step + 1) as any)}
                className="bg-[#047857] hover:bg-[#036246] text-white flex items-center gap-1.5 px-4 cursor-pointer disabled:opacity-50"
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting || !isStep1Valid || !isStep2Valid}
                  onClick={() => handleCreatePlan('Draft')}
                  className="border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Save as Draft'}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !isStep1Valid || !isStep2Valid}
                  onClick={() => handleCreatePlan('Active')}
                  className="bg-[#047857] hover:bg-[#036246] text-white flex items-center gap-1.5 px-5 font-bold cursor-pointer disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {isSubmitting ? 'Publishing Plan...' : 'Create & Publish Plan'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * -------------------------------------------------------------
 * CREATE FEATURE DRAWER (4-Section Enterprise Capability Builder)
 * -------------------------------------------------------------
 */
const CreateFeatureDrawer: React.FC<{
  features: PlanFeatureItem[];
  plans: TierPlan[];
  onClose: () => void;
  onCreated: (newFeat: PlanFeatureItem) => void;
}> = ({ features, onClose, onCreated }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Section 1: Identity
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [codeStatus, setCodeStatus] = useState<{ available: boolean; reason?: string } | null>(null);
  const [shortDescription, setShortDescription] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');

  // Section 2: Product Placement
  const [module, setModule] = useState('Core HR');
  const [category, setCategory] = useState<FeatureCategory>('Core HR');
  const [type, setType] = useState<FeatureType>('Boolean');
  const [valueClassification, setValueClassification] = useState<FeatureClassification>('Standard');
  const [minTierName, setMinTierName] = useState<'Starter' | 'Professional' | 'Business' | 'Enterprise'>('Starter');

  // Section 3: Entitlement & Usage Defaults
  const [accessModel, setAccessModel] = useState<FeatureAccessModel>('Boolean Access');
  const [isMetered, setIsMetered] = useState(false);
  const [usageResourceCode, setUsageResourceCode] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('count');
  const [defaultPeriod, setDefaultPeriod] = useState('monthly');
  const [defaultLimit, setDefaultLimit] = useState<number | undefined>(undefined);
  const [defaultOveragePolicy, setDefaultOveragePolicy] = useState<FeatureOveragePolicy>('Block');
  const [defaultOveragePrice, setDefaultOveragePrice] = useState<number | undefined>(undefined);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

  // HRMS Modules Catalog
  const moduleOptions = [
    'Core HR',
    'Employee Self-Service',
    'Attendance',
    'Shift & Scheduling',
    'Leave',
    'Payroll',
    'Recruitment',
    'Performance',
    'LMS',
    'Travel & Expense',
    'Communication',
    'AI & Copilot',
    'Biometrics & Hardware',
    'Analytics',
    'Documents',
    'Integrations',
    'Security',
    'Administration',
  ];

  // Auto-generate code from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isCodeManuallyEdited) {
      const generated = val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const prefix = module.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const finalCode = generated ? `${prefix}.${generated}` : '';
      setCode(finalCode.toUpperCase());
      if (finalCode) {
        setCodeStatus(platformTierPlansService.checkFeatureCodeAvailability(finalCode.toUpperCase()));
      } else {
        setCodeStatus(null);
      }
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_.]/g, '');
    setCode(val);
    setIsCodeManuallyEdited(true);
    if (val) {
      setCodeStatus(platformTierPlansService.checkFeatureCodeAvailability(val));
    } else {
      setCodeStatus(null);
    }
  };

  const isStep1Valid = name.trim().length >= 3 && code.trim().length >= 3 && (!codeStatus || codeStatus.available) && shortDescription.trim().length >= 5;
  const isStep2Valid = !!module && !!category;
  const isStep3Valid = !isMetered || (!!usageResourceCode && !!defaultUnit);

  const handleCreate = async (status: 'Draft' | 'Active') => {
    if (!isStep1Valid) {
      setErrorMessage('Please fill out all required identity fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const newFeat = await platformTierPlansService.createFeature({
        name: name.trim(),
        code: code.trim(),
        module,
        category,
        type,
        value_classification: valueClassification,
        min_tier_name: minTierName,
        is_high_value: valueClassification === 'High Value' || valueClassification === 'Strategic',
        description: shortDescription.trim(),
        short_description: shortDescription.trim(),
        detailed_description: detailedDescription.trim() || undefined,
        access_model: accessModel,
        is_metered: isMetered,
        usage_resource_code: isMetered ? usageResourceCode : undefined,
        default_unit: isMetered ? defaultUnit : undefined,
        default_period: isMetered ? defaultPeriod : undefined,
        default_limit: isMetered ? defaultLimit : undefined,
        default_overage_policy: isMetered ? defaultOveragePolicy : undefined,
        default_overage_price: isMetered ? defaultOveragePrice : undefined,
        dependencies: selectedDependencies,
        status,
        lifecycle_status: status,
      });

      onCreated(newFeat);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create feature capability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white h-full max-w-2xl w-full shadow-2xl border-l border-[#E2E8F0] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-[#ECFDF5] text-[#047857]">
                <Layers className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-[#0F172B]">Create Feature Capability</h3>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Define a canonical WorkForceOS capability for plan entitlements and rollout controls.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4-Step Progress Navigation */}
        <div className="px-5 py-3 border-b border-[#E2E8F0] bg-white flex items-center justify-between text-[11px]">
          {[
            { num: 1, label: 'Identity' },
            { num: 2, label: 'Placement' },
            { num: 3, label: 'Entitlements & Usage' },
            { num: 4, label: 'Review' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => {
                if (s.num === 1) setStep(1);
                else if (s.num === 2 && isStep1Valid) setStep(2);
                else if (s.num === 3 && isStep1Valid && isStep2Valid) setStep(3);
                else if (s.num === 4 && isStep1Valid && isStep2Valid && isStep3Valid) setStep(4);
              }}
              className={cn(
                'flex items-center gap-1.5 font-bold cursor-pointer transition-colors',
                step === s.num
                  ? 'text-[#047857]'
                  : step > s.num
                  ? 'text-[#334155]'
                  : 'text-[#94A3B8]'
              )}
            >
              <span
                className={cn(
                  'h-5 w-5 rounded-full flex items-center justify-center text-[10px]',
                  step === s.num
                    ? 'bg-[#047857] text-white'
                    : step > s.num
                    ? 'bg-[#ECFDF5] text-[#047857]'
                    : 'bg-[#F1F5F9] text-[#94A3B8]'
                )}
              >
                {step > s.num ? <Check className="h-3 w-3" /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] flex items-center gap-2 text-[#991B1B]">
              <AlertTriangle className="h-4 w-4 text-[#DC2626] flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* -------------------------------------------------------
              SECTION 1: IDENTITY
             ------------------------------------------------------- */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <label className="font-bold text-[#0F172B] block">
                  Feature Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. GPS Geofence Clock-in"
                  value={name}
                  onChange={handleNameChange}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:border-[#047857] outline-none"
                />
                <span className="text-[11px] text-[#64748B] block">Customer-facing capability name.</span>
              </div>

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
                          <Check className="h-3 w-3" /> Code available
                        </>
                      ) : (
                        codeStatus.reason
                      )}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. ATTENDANCE.GPS_GEOFENCE"
                  value={code}
                  onChange={handleCodeChange}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold focus:border-[#047857] outline-none"
                />
                <span className="text-[11px] text-[#64748B] block">Unique machine-safe identifier.</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0F172B] block">
                  Short Description <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Geofenced mobile check-ins with radius validation for remote and field teams."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:border-[#047857] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0F172B] block">Detailed Functional Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Explains what the feature accomplishes, required permissions, and business problems solved."
                  value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs focus:border-[#047857] outline-none"
                />
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              SECTION 2: PRODUCT PLACEMENT
             ------------------------------------------------------- */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[#0F172B] block">HRMS Module *</label>
                  <select
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs outline-none cursor-pointer"
                  >
                    {moduleOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0F172B] block">Product Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs outline-none cursor-pointer"
                  >
                    {[
                      'Core HR',
                      'Employee Self-Service',
                      'Attendance',
                      'Leave',
                      'Payroll',
                      'WhatsApp & Messaging',
                      'Biometrics & Hardware',
                      'Recruitment',
                      'Performance',
                      'AI & Copilot',
                      'Integrations & Security',
                      'Support & SLAs',
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[#0F172B] block">Feature Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs outline-none cursor-pointer"
                  >
                    <option value="Boolean">Boolean (On / Off Flag)</option>
                    <option value="Quota">Quota / Metered Consumption</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#0F172B] block">Value Classification</label>
                  <select
                    value={valueClassification}
                    onChange={(e) => setValueClassification(e.target.value as any)}
                    className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs outline-none cursor-pointer"
                  >
                    <option value="Standard">Standard Capability</option>
                    <option value="High Value">★ High Value Tier Driver</option>
                    <option value="Strategic">Strategic Competitive Advantage</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#0F172B] block">Suggested Minimum Tier (Display Helper)</label>
                <select
                  value={minTierName}
                  onChange={(e) => setMinTierName(e.target.value as any)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs outline-none cursor-pointer"
                >
                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Business">Business</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <span className="text-[11px] text-[#64748B] block">
                  Note: Commercial plan access is determined by actual plan entitlement records.
                </span>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              SECTION 3: ENTITLEMENT & USAGE DEFAULTS
             ------------------------------------------------------- */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <label className="font-bold text-[#0F172B] block">Access Model</label>
                <select
                  value={accessModel}
                  onChange={(e) => setAccessModel(e.target.value as any)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs outline-none cursor-pointer"
                >
                  <option value="Boolean Access">Boolean Access (Included / Excluded)</option>
                  <option value="Quantity Based">Quantity Based (e.g. Storage GB, Devices)</option>
                  <option value="Usage Based">Usage Based (e.g. API Calls, WhatsApp)</option>
                  <option value="Tiered">Tiered Quotas</option>
                  <option value="Add-on">Optional Commercial Add-on</option>
                </select>
              </div>

              {/* Metered Toggle */}
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#0F172B]">Usage Metering Engine</div>
                    <div className="text-[11px] text-[#64748B]">Track real-time tenant consumption and overages.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMetered}
                    onChange={(e) => setIsMetered(e.target.checked)}
                    className="h-4 w-4 text-[#047857] rounded border-[#CBD5E1] cursor-pointer"
                  />
                </div>

                {isMetered && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Usage Resource Code</label>
                      <input
                        type="text"
                        placeholder="e.g. whatsapp.messages"
                        value={usageResourceCode}
                        onChange={(e) => setUsageResourceCode(e.target.value)}
                        className="w-full p-2 border border-[#CBD5E1] rounded-xl bg-white text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Unit</label>
                      <input
                        type="text"
                        placeholder="e.g. messages / requests"
                        value={defaultUnit}
                        onChange={(e) => setDefaultUnit(e.target.value)}
                        className="w-full p-2 border border-[#CBD5E1] rounded-xl bg-white text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Default Limit (Optional)</label>
                      <input
                        type="number"
                        placeholder="e.g. 10000"
                        value={defaultLimit || ''}
                        onChange={(e) => setDefaultLimit(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full p-2 border border-[#CBD5E1] rounded-xl bg-white text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-[#0F172B] block">Default Overage Policy</label>
                      <select
                        value={defaultOveragePolicy}
                        onChange={(e) => setDefaultOveragePolicy(e.target.value as any)}
                        className="w-full p-2 border border-[#CBD5E1] rounded-xl bg-white text-xs"
                      >
                        <option value="Block">Block Further Usage</option>
                        <option value="Warn">Warn Tenant Admin</option>
                        <option value="Allow">Allow (No Charge)</option>
                        <option value="Allow & Bill">Allow & Bill Overage</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Dependencies Picker */}
              <div className="space-y-2">
                <label className="font-bold text-[#0F172B] block">Prerequisite Feature Dependencies</label>
                <div className="p-3 border border-[#CBD5E1] rounded-xl max-h-36 overflow-y-auto space-y-1.5 bg-white">
                  {features
                    .filter((f) => f.code !== code)
                    .map((f) => {
                      const isSelected = selectedDependencies.includes(f.code);
                      return (
                        <label
                          key={f.code}
                          className={cn(
                            'flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors text-[11px]',
                            isSelected ? 'bg-[#ECFDF5] text-[#047857]' : 'hover:bg-[#F8FAFC] text-[#334155]'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDependencies([...selectedDependencies, f.code]);
                              } else {
                                setSelectedDependencies(selectedDependencies.filter((c) => c !== f.code));
                              }
                            }}
                            className="h-3.5 w-3.5 text-[#047857] rounded"
                          />
                          <span className="font-bold">{f.name}</span>
                          <span className="font-mono text-[10px] text-[#64748B]">({f.code})</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              SECTION 4: REVIEW & CONFIRM
             ------------------------------------------------------- */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-[#0F172B]">{name}</span>
                  {valueClassification !== 'Standard' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                      {valueClassification.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] text-[#64748B]">{code}</div>
                <p className="text-xs text-[#475569]">{shortDescription}</p>

                <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-2 gap-2 text-[11px]">
                  <div>Module: <strong>{module}</strong></div>
                  <div>Category: <strong>{category}</strong></div>
                  <div>Min Tier: <strong>{minTierName}</strong></div>
                  <div>Access Model: <strong>{accessModel}</strong></div>
                  <div>Metering: <strong>{isMetered ? `Metered (${defaultUnit})` : 'Boolean'}</strong></div>
                  <div>Dependencies: <strong>{selectedDependencies.length} capability(ies)</strong></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF] flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#2563EB] flex-shrink-0" />
                <span>
                  This capability will be created in <strong>Draft</strong> status. You can immediately assign it to commercial plans in the Feature Inspector.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-white">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((step - 1) as any)}
              className="border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
            >
              ← Back
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]"
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
              className="bg-[#047857] hover:bg-[#036246] text-white flex items-center gap-1.5 px-4 disabled:opacity-50"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleCreate('Draft')}
                className="border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
              >
                {isSubmitting ? 'Saving...' : 'Save as Draft'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleCreate('Active')}
                className="bg-[#047857] hover:bg-[#036246] text-white font-bold px-5"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {isSubmitting ? 'Creating Capability...' : 'Create Feature Capability'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * -------------------------------------------------------------
 * FEATURE INSPECTOR DRAWER (7-Tab Enterprise Architecture)
 * -------------------------------------------------------------
 */
const FeatureInspectorDrawer: React.FC<{
  feature: PlanFeatureItem;
  plans: TierPlan[];
  features: PlanFeatureItem[];
  onClose: () => void;
  onEdit: (feat: PlanFeatureItem) => void;
  onDuplicate: (feat: PlanFeatureItem) => void;
  onArchive: (feat: PlanFeatureItem) => void;
  onDelete: (feat: PlanFeatureItem) => Promise<void>;
  onTogglePlanEntitlement: (featureCode: string, planId: string, isAssigned: boolean) => Promise<void>;
  onNavigateTab?: (tab: any) => void;
}> = ({
  feature,
  plans,
  features,
  onClose,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onTogglePlanEntitlement,
  onNavigateTab,
}) => {
  const [inspectorTab, setInspectorTab] = useState<
    'overview' | 'entitlements' | 'usage' | 'dependencies' | 'rollout' | 'tenants' | 'audit'
  >('overview');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const assignedPlans = useMemo(() => plans.filter((p) => p.features.includes(feature.code)), [plans, feature.code]);
  const references = useMemo(() => platformTierPlansService.checkFeatureReferences(feature.code), [feature.code]);

  const handleDelete = async () => {
    if (deleteConfirmationText !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(feature);
    } catch (err: any) {
      setDeleteError(err.message || 'Unable to delete feature.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white h-full max-w-2xl w-full shadow-2xl border-l border-[#E2E8F0] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#0F172B]">{feature.name}</h2>
                <span
                  className={cn(
                    'text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider',
                    feature.status === 'Active'
                      ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                      : feature.status === 'Draft'
                      ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                      : feature.status === 'Beta'
                      ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                      : 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]'
                  )}
                >
                  ● {feature.status}
                </span>
                {feature.is_high_value && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    HIGH VALUE
                  </span>
                )}
              </div>
              <div className="font-mono text-xs text-[#64748B]">{feature.code}</div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(feature)}
                className="text-xs border-[#CBD5E1] text-[#0F172B] hover:bg-[#F1F5F9]"
              >
                <Edit className="h-3 w-3 mr-1 text-[#64748B]" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDuplicate(feature)}
                className="text-xs border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC]"
              >
                <Copy className="h-3 w-3 mr-1 text-[#64748B]" /> Duplicate
              </Button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#F1F5F9] cursor-pointer ml-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 7 Inspector Tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1 border-t border-[#E2E8F0] pt-3">
            {[
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'entitlements', label: `Entitlements (${assignedPlans.length})`, icon: ShieldCheck },
              { id: 'usage', label: 'Usage & Limits', icon: Activity },
              { id: 'dependencies', label: `Dependencies (${feature.dependencies?.length || 0})`, icon: Sliders },
              { id: 'rollout', label: 'Rollout & Flags', icon: GitBranch },
              { id: 'tenants', label: 'Tenant Overrides', icon: Users },
              { id: 'audit', label: 'Audit History', icon: History },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setInspectorTab(t.id as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer text-xs',
                    inspectorTab === t.id
                      ? 'bg-[#047857] text-white shadow-xs'
                      : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172B]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* -------------------------------------------------------
              TAB 1: OVERVIEW
             ------------------------------------------------------- */}
          {inspectorTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">Description</span>
                <p className="text-xs text-[#334155] leading-relaxed">{feature.description}</p>
                {feature.detailed_description && (
                  <p className="text-xs text-[#64748B] leading-relaxed pt-2 border-t border-[#E2E8F0]">
                    {feature.detailed_description}
                  </p>
                )}
              </div>

              {/* Specification Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <span className="text-[10px] text-[#64748B] block font-semibold">HRMS Module</span>
                  <span className="font-bold text-[#0F172B]">{feature.module || feature.category}</span>
                </div>

                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <span className="text-[10px] text-[#64748B] block font-semibold">Category</span>
                  <span className="font-bold text-[#0F172B]">{feature.category}</span>
                </div>

                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <span className="text-[10px] text-[#64748B] block font-semibold">Min Tier</span>
                  <span className="font-bold text-[#0F172B]">{feature.min_tier_name || 'Starter'}</span>
                </div>

                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <span className="text-[10px] text-[#64748B] block font-semibold">Access Model</span>
                  <span className="font-bold text-[#0F172B]">{feature.access_model || 'Boolean Access'}</span>
                </div>

                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <span className="text-[10px] text-[#64748B] block font-semibold">Metering</span>
                  <span className="font-bold text-[#0F172B]">{feature.is_metered ? 'Metered' : 'Not Metered'}</span>
                </div>

                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                  <span className="text-[10px] text-[#64748B] block font-semibold">Last Modified</span>
                  <span className="font-bold text-[#0F172B]">{feature.updated_at || 'Today'}</span>
                </div>
              </div>

              {/* Commercial & Technical Summary */}
              <div className="p-4 rounded-2xl border border-[#E2E8F0] bg-white space-y-3">
                <div className="font-bold text-xs text-[#0F172B]">Platform Capability Health & Footprint</div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-base font-black text-[#047857]">{assignedPlans.length}</div>
                    <div className="text-[10px] text-[#64748B]">Active Plans</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-base font-black text-[#2563EB]">100%</div>
                    <div className="text-[10px] text-[#64748B]">GA Rollout</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="text-base font-black text-[#D97706]">0</div>
                    <div className="text-[10px] text-[#64748B]">Tenant Overrides</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              TAB 2: ENTITLEMENTS (PLAN MATRIX)
             ------------------------------------------------------- */}
          {inspectorTab === 'entitlements' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0F172B]">Plan Entitlement Access Matrix</div>
                  <p className="text-[11px] text-[#64748B]">
                    Enable or disable this product capability across commercial subscription plans.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                      <th className="py-3 px-4">Plan Name</th>
                      <th className="py-3 px-4">Monthly Price</th>
                      <th className="py-3 px-4">Access Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {plans.map((p) => {
                      const isAssigned = p.features.includes(feature.code);
                      return (
                        <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#0F172B]">{p.name}</td>
                          <td className="py-3 px-4 text-[#64748B]">₹{p.monthly_price.toLocaleString()}/mo</td>
                          <td className="py-3 px-4">
                            {isAssigned ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                                ✓ Included
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                                — Excluded
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onTogglePlanEntitlement(feature.code, p.id, isAssigned)}
                              className={cn(
                                'text-[11px] h-7 px-2.5 font-bold cursor-pointer',
                                isAssigned
                                  ? 'border-[#FCA5A5] text-[#DC2626] hover:bg-[#FEF2F2]'
                                  : 'border-[#A7F3D0] text-[#047857] hover:bg-[#ECFDF5]'
                              )}
                            >
                              {isAssigned ? 'Remove from Plan' : 'Include in Plan'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              TAB 3: USAGE & LIMITS
             ------------------------------------------------------- */}
          {inspectorTab === 'usage' && (
            <div className="space-y-4 animate-in fade-in">
              {feature.is_metered ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3">
                    <div className="font-bold text-xs text-[#0F172B]">Metered Usage Configuration</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>Resource Code: <strong>{feature.usage_resource_code || 'N/A'}</strong></div>
                      <div>Unit: <strong>{feature.default_unit || 'count'}</strong></div>
                      <div>Period: <strong>{feature.default_period || 'monthly'}</strong></div>
                      <div>Default Limit: <strong>{feature.default_limit?.toLocaleString() || 'Unlimited'}</strong></div>
                      <div>Overage Policy: <strong>{feature.default_overage_policy || 'Block'}</strong></div>
                      <div>Overage Price: <strong>₹{feature.default_overage_price || 0} / unit</strong></div>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] space-y-2">
                    <div className="font-bold text-xs text-[#0F172B]">Aggregated Tenant Utilization</div>
                    <div className="text-xs text-[#64748B]">Telemetry active across all provisioned organizations.</div>
                    <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden mt-2">
                      <div className="bg-[#047857] h-full w-[42%]" />
                    </div>
                    <div className="flex justify-between text-[11px] text-[#64748B] pt-1">
                      <span>42% Aggregated Capacity</span>
                      <span>Healthy Telemetry</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0] space-y-2">
                  <Activity className="h-8 w-8 text-[#94A3B8] mx-auto" />
                  <div className="font-bold text-sm text-[#0F172B]">Boolean Access Capability</div>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    This capability is governed purely by plan tier membership and does not consume discrete metered quotas.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------
              TAB 4: DEPENDENCIES
             ------------------------------------------------------- */}
          {inspectorTab === 'dependencies' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="font-bold text-xs text-[#0F172B]">Required Prerequisite Capabilities</div>
              {feature.dependencies && feature.dependencies.length > 0 ? (
                <div className="space-y-2">
                  {feature.dependencies.map((depCode) => {
                    const depFeat = features.find((f) => f.code === depCode);
                    return (
                      <div
                        key={depCode}
                        className="p-3 bg-white rounded-xl border border-[#E2E8F0] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-[#047857]" />
                          <div>
                            <div className="font-bold text-[#0F172B]">{depFeat?.name || depCode}</div>
                            <div className="font-mono text-[10px] text-[#64748B]">{depCode}</div>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#ECFDF5] text-[#047857] font-bold">
                          Required Prerequisite
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-white rounded-2xl border border-[#E2E8F0] text-xs text-[#64748B]">
                  No prerequisites required. This is a standalone root capability.
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------
              TAB 5: ROLLOUT & FLAGS
             ------------------------------------------------------- */}
          {inspectorTab === 'rollout' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-[#0F172B]">Feature Flag Integration</div>
                    <div className="font-mono text-[11px] text-[#64748B]">{feature.code.toLowerCase()}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                    ● 100% Production Rollout
                  </span>
                </div>

                <p className="text-xs text-[#475569]">
                  Technical canary rollouts, kill switches, and environment staging flags are managed in the Feature Flags control plane.
                </p>

                {onNavigateTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateTab('feature-flags')}
                    className="text-xs border-[#CBD5E1] text-[#047857] font-bold hover:bg-[#ECFDF5]"
                  >
                    Manage Rollout in Feature Flags →
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              TAB 6: TENANTS
             ------------------------------------------------------- */}
          {inspectorTab === 'tenants' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="font-bold text-xs text-[#0F172B]">Active Tenant Overrides</div>
              <div className="p-6 text-center bg-white rounded-2xl border border-[#E2E8F0] text-xs text-[#64748B] space-y-2">
                <Users className="h-6 w-6 text-[#94A3B8] mx-auto" />
                <div>No custom tenant overrides active for this feature.</div>
                <div className="text-[11px] text-[#94A3B8]">
                  All client access is currently dictated strictly by plan tier entitlements.
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------
              TAB 7: AUDIT
             ------------------------------------------------------- */}
          {inspectorTab === 'audit' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="font-bold text-xs text-[#0F172B]">Immutable Capability Audit Log</div>
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white flex items-start gap-2.5">
                  <History className="h-4 w-4 text-[#047857] mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#0F172B]">Capability Registered in Catalog</div>
                    <div className="text-[11px] text-[#64748B]">Created by Super Admin • {feature.created_at || 'Active'}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-[#2563EB] mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#0F172B]">Entitlements Synchronized</div>
                    <div className="text-[11px] text-[#64748B]">
                      Assigned to {assignedPlans.length} plan(s): {assignedPlans.map((p) => p.name).join(', ') || 'None'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            {feature.status === 'Archived' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onArchive(feature)}
                className="text-xs text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5]"
              >
                Restore to Draft
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onArchive(feature)}
                className="text-xs text-[#D97706] border-[#FDE68A] hover:bg-[#FFFBEB]"
              >
                Archive Capability
              </Button>
            )}

            {references.canDelete && feature.status === 'Draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="text-xs text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEF2F2]"
              >
                <Trash2 className="h-3 w-3 mr-1" /> Delete Draft
              </Button>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
            className="bg-[#0F172B] hover:bg-[#1E293B] text-white px-4"
          >
            Done
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 text-xs">
            <div className="flex items-center gap-2 text-[#DC2626] font-bold text-base">
              <AlertTriangle className="h-5 w-5" /> Permanently Delete Draft Feature?
            </div>
            <p className="text-xs text-[#475569]">
              This capability has 0 active plan references. To confirm permanent deletion, type <strong>DELETE</strong>:
            </p>
            <input
              type="text"
              placeholder="DELETE"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs font-mono font-bold"
            />
            {deleteError && <div className="text-xs text-[#DC2626]">{deleteError}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="border-[#CBD5E1] text-[#64748B]"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={deleteConfirmationText !== 'DELETE' || isDeleting}
                onClick={handleDelete}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * -------------------------------------------------------------
 * EDIT FEATURE DRAWER
 * -------------------------------------------------------------
 */
const EditFeatureDrawer: React.FC<{
  feature: PlanFeatureItem;
  features: PlanFeatureItem[];
  onClose: () => void;
  onSaved: (updated: PlanFeatureItem) => void;
}> = ({ feature, features, onClose, onSaved }) => {
  const [name, setName] = useState(feature.name);
  const [shortDescription, setShortDescription] = useState(feature.short_description || feature.description);
  const [detailedDescription, setDetailedDescription] = useState(feature.detailed_description || '');
  const [module, setModule] = useState(feature.module || feature.category);
  const [category, setCategory] = useState<FeatureCategory>(feature.category);
  const [type, setType] = useState<FeatureType>(feature.type);
  const [valueClassification, setValueClassification] = useState<FeatureClassification>(feature.value_classification || 'Standard');
  const [minTierName, setMinTierName] = useState<'Starter' | 'Professional' | 'Business' | 'Enterprise'>(feature.min_tier_name || 'Starter');
  const [status, setStatus] = useState<any>(feature.status);
  const [isMetered, setIsMetered] = useState(!!feature.is_metered);
  const [usageResourceCode, setUsageResourceCode] = useState(feature.usage_resource_code || '');
  const [defaultUnit, setDefaultUnit] = useState(feature.default_unit || 'count');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSubmitting(true);
    try {
      const updated = await platformTierPlansService.updateFeature(feature.id, {
        name,
        description: shortDescription,
        short_description: shortDescription,
        detailed_description: detailedDescription,
        module,
        category,
        type,
        value_classification: valueClassification,
        is_high_value: valueClassification === 'High Value' || valueClassification === 'Strategic',
        min_tier_name: minTierName,
        status,
        lifecycle_status: status,
        is_metered: isMetered,
        usage_resource_code: isMetered ? usageResourceCode : undefined,
        default_unit: isMetered ? defaultUnit : undefined,
      });
      onSaved(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update feature');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white h-full max-w-2xl w-full shadow-2xl border-l border-[#E2E8F0] flex flex-col overflow-hidden text-xs">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h3 className="text-base font-bold text-[#0F172B]">Edit Feature Capability</h3>
            <div className="font-mono text-[11px] text-[#64748B] mt-0.5">{feature.code} (Immutable Code)</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172B] hover:bg-[#F1F5F9] cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-1">
            <label className="font-bold text-[#0F172B] block">Feature Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs outline-none focus:border-[#047857]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-[#0F172B] block">Short Description</label>
            <textarea
              rows={2}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs outline-none focus:border-[#047857]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-[#0F172B] block">Detailed Functional Description</label>
            <textarea
              rows={3}
              value={detailedDescription}
              onChange={(e) => setDetailedDescription(e.target.value)}
              className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs outline-none focus:border-[#047857]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#0F172B] block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs"
              >
                {[
                  'Core HR',
                  'Employee Self-Service',
                  'Attendance',
                  'Leave',
                  'Payroll',
                  'WhatsApp & Messaging',
                  'Biometrics & Hardware',
                  'Recruitment',
                  'Performance',
                  'AI & Copilot',
                  'Integrations & Security',
                  'Support & SLAs',
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#0F172B] block">Lifecycle Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs"
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Beta">Beta</option>
                <option value="Deprecated">Deprecated</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-[#0F172B] block">Minimum Tier</label>
              <select
                value={minTierName}
                onChange={(e) => setMinTierName(e.target.value as any)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs"
              >
                <option value="Starter">Starter</option>
                <option value="Professional">Professional</option>
                <option value="Business">Business</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#0F172B] block">Value Classification</label>
              <select
                value={valueClassification}
                onChange={(e) => setValueClassification(e.target.value as any)}
                className="w-full p-2.5 border border-[#CBD5E1] rounded-xl bg-white text-xs"
              >
                <option value="Standard">Standard</option>
                <option value="High Value">★ High Value</option>
                <option value="Strategic">Strategic</option>
              </select>
            </div>
          </div>
        </form>

        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <Button variant="outline" size="sm" onClick={onClose} className="border-[#CBD5E1] text-[#64748B]">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            onClick={handleSave}
            className="bg-[#047857] hover:bg-[#036246] text-white font-bold px-5"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};


