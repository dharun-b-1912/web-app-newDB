// src/features/platform/subviews/PlansAndPricingView.tsx
// ============================================================================
// Joy PeopleHR — SaaS Commercial Plans & Pricing Console
// Master control plane for Tier Pricing, Volume Bands, and Entitlements
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Edit2,
  Copy,
  Archive,
  Check,
  Building2,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Percent,
  Calculator,
  ShieldCheck,
  Eye,
  Sliders,
  SlidersHorizontal,
  Info,
  Calendar,
  Zap,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  CheckSquare,
  Square,
  Settings,
  HardDrive,
  Smartphone,
  MessageSquare,
  Shield,
  HelpCircle,
  Boxes,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import {
  CommercialPlan,
  PlanTierCode,
  BillingCycle,
  CustomerCommercialOverride,
  VolumePricingBand,
} from '../../../types/saasCatalogue';
import { saasPricingEngine } from '../../../services/platform/saasPricingEngine';
import { saasCatalogueService } from '../../../services/platform/saasCatalogueService';
import { platformSubscriptionService } from '../../../services/platform/platformSubscriptionService';
import { saasCommercialService } from '../../../services/platform/saasCommercialService';

interface PlansAndPricingViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const PlansAndPricingView: React.FC<PlansAndPricingViewProps> = ({ onNavigateTab }) => {
  const [plans, setPlans] = useState<CommercialPlan[]>(() => saasPricingEngine.getPlans());
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Annual'>('Monthly');
  const [activeTab, setActiveTab] = useState<'plans' | 'volume' | 'overrides'>('plans');

  // Master Modules & Add-ons Catalogue
  const allModules = useMemo(() => saasCatalogueService.getModules(), []);
  const allAddons = useMemo(() => saasCatalogueService.getAddons(), []);

  // Plan Edit Drawer State
  const [editingPlan, setEditingPlan] = useState<CommercialPlan | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3 | 4>(1);
  const [moduleSearch, setModuleSearch] = useState('');
  const [expandedModuleKey, setExpandedModuleKey] = useState<string | null>(null);
  const [pricingModelType, setPricingModelType] = useState<'VOLUME_PEPM' | 'BASE_PLUS_PEPM' | 'FLAT_ENTERPRISE'>('VOLUME_PEPM');

  // Customer Overrides
  const [overrides, setOverrides] = useState<CustomerCommercialOverride[]>(() =>
    saasCatalogueService.getCustomerOverrides()
  );
  const [overrideAddons, setOverrideAddons] = useState<string[]>(['vendor_workforce_mgmt']);
  const [overrideBillingFreq, setOverrideBillingFreq] = useState<BillingCycle>('Annual');

  // Dynamic Live Metrics from Subscriptions & Commercial Client Accounts
  const subscriptions = useMemo(() => platformSubscriptionService.getSubscriptions(), []);
  const clients = useMemo(() => saasCommercialService.getClients(), []);

  const activeSubs = useMemo(
    () => subscriptions.filter((s) => s.status === 'Active' || String(s.status).toUpperCase() === 'ACTIVE'),
    [subscriptions]
  );

  const totalMRRNum = useMemo(() => {
    const sum = activeSubs.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    return sum > 0 ? sum : subscriptions.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  }, [activeSubs, subscriptions]);

  const totalARRNum = totalMRRNum * 12;

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const totalMRR = formatCurrency(totalMRRNum);
  const totalARR = formatCurrency(totalARRNum);
  const activeSubscriptions = subscriptions.length;

  const proCount = subscriptions.filter(
    (s) => s.plan === 'Professional' || s.plan_id === 'plan-professional'
  ).length;
  const proPct = subscriptions.length > 0 ? Math.round((proCount / subscriptions.length) * 100) : 0;

  // New Customer Override State & Handlers
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideTenantId, setOverrideTenantId] = useState('');
  const [overrideTenantName, setOverrideTenantName] = useState('');
  const [overrideBasePlan, setOverrideBasePlan] = useState<PlanTierCode>('ENTERPRISE');
  const [overridePrice, setOverridePrice] = useState<number>(125000);
  const [overrideSeats, setOverrideSeats] = useState<number>(500);
  const [overrideStartDate, setOverrideStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [overrideEndDate, setOverrideEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [overrideNotes, setOverrideNotes] = useState('');

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTenantName) return;
    const newOverride: CustomerCommercialOverride = {
      id: `override-${Date.now()}`,
      tenantId: overrideTenantId || `tenant-${Date.now()}`,
      tenantName: overrideTenantName,
      basePlan: overrideBasePlan,
      customContractPriceMonthly: overridePrice,
      customEmployeeCount: overrideSeats,
      includedAddons: overrideAddons,
      featureOverrides: {},
      limitOverrides: { maxEmployees: overrideSeats },
      startDate: overrideStartDate,
      endDate: overrideEndDate,
      billingFrequency: overrideBillingFreq,
      notes: overrideNotes || 'Custom negotiated enterprise commercial agreement with tailored feature access.',
      approvedBy: 'Platform Super Admin',
      approvedAt: new Date().toISOString(),
    };
    saasCatalogueService.saveCustomerOverride(newOverride);
    setOverrides([...saasCatalogueService.getCustomerOverrides()]);
    setIsOverrideModalOpen(false);
  };

  const handleDeleteOverride = (id: string) => {
    saasCatalogueService.deleteCustomerOverride(id);
    setOverrides([...saasCatalogueService.getCustomerOverrides()]);
  };

  const handleOpenEdit = (plan: CommercialPlan) => {
    const model = plan.baseMonthlyPrice > 0 ? 'BASE_PLUS_PEPM' : plan.code === 'ENTERPRISE' ? 'FLAT_ENTERPRISE' : 'VOLUME_PEPM';
    setPricingModelType(model);
    setEditingPlan({
      ...plan,
      includedModules: plan.includedModules || ['core_hr', 'ess', 'leave', 'attendance'],
      includedFeatures: plan.includedFeatures || [],
      volumeBands: plan.volumeBands && plan.volumeBands.length > 0 ? plan.volumeBands.map((b) => ({ ...b })) : [
        { minEmployees: 1, maxEmployees: 50, pepmPrice: plan.additionalEmployeePrice || 65, annualPepmPrice: Math.round((plan.additionalEmployeePrice || 65) * 0.85), onboardingSetupFee: 0, label: '1 – 50 Employees' },
        { minEmployees: 51, maxEmployees: 200, pepmPrice: Math.round((plan.additionalEmployeePrice || 65) * 0.9), annualPepmPrice: Math.round((plan.additionalEmployeePrice || 65) * 0.8), onboardingSetupFee: 4999, label: '51 – 200 Employees' },
        { minEmployees: 201, maxEmployees: 500, pepmPrice: Math.round((plan.additionalEmployeePrice || 65) * 0.8), annualPepmPrice: Math.round((plan.additionalEmployeePrice || 65) * 0.7), onboardingSetupFee: 2999, label: '201 – 500 Employees' },
        { minEmployees: 501, maxEmployees: 999999, pepmPrice: Math.round((plan.additionalEmployeePrice || 65) * 0.7), annualPepmPrice: Math.round((plan.additionalEmployeePrice || 65) * 0.6), onboardingSetupFee: 0, label: '500+ Employees', isCustom: true },
      ],
      quotas: {
        maxEmployees: plan.quotas?.maxEmployees ?? 100,
        maxAdminUsers: plan.quotas?.maxAdminUsers ?? 1,
        maxLocations: plan.quotas?.maxLocations ?? 2,
        maxCompanies: plan.quotas?.maxCompanies ?? 1,
        maxBiometricDevices: plan.quotas?.maxBiometricDevices ?? 1,
        storageGb: plan.quotas?.storageGb ?? 15,
        apiCallsPerDay: plan.quotas?.apiCallsPerDay ?? 5000,
        includedWhatsAppMessagesPerMonth: plan.quotas?.includedWhatsAppMessagesPerMonth ?? 0,
        supportSla: plan.quotas?.supportSla ?? '48-hour email support',
      },
    });
    setBuilderStep(1);
    setModuleSearch('');
    setExpandedModuleKey(null);
    setIsBuilderOpen(true);
  };

  const handleSavePlan = () => {
    if (!editingPlan) return;
    saasPricingEngine.updatePlan(editingPlan);
    setPlans([...saasPricingEngine.getPlans()]);
    setIsBuilderOpen(false);
    setEditingPlan(null);
  };

  const handleToggleModule = (moduleKey: string) => {
    if (!editingPlan) return;
    const exists = (editingPlan.includedModules || []).includes(moduleKey);
    let nextModules: string[];
    let nextFeatures = [...(editingPlan.includedFeatures || [])];

    const targetModule = allModules.find((m) => m.moduleKey === moduleKey);
    const modFeatureKeys = targetModule ? targetModule.features.map((f) => f.featureKey) : [];

    if (exists) {
      nextModules = editingPlan.includedModules.filter((k) => k !== moduleKey);
      nextFeatures = nextFeatures.filter((fk) => !modFeatureKeys.includes(fk));
    } else {
      nextModules = [...(editingPlan.includedModules || []), moduleKey];
      modFeatureKeys.forEach((fk) => {
        if (!nextFeatures.includes(fk)) nextFeatures.push(fk);
      });
    }

    setEditingPlan({
      ...editingPlan,
      includedModules: nextModules,
      includedFeatures: nextFeatures,
    });
  };

  const handleToggleFeature = (featureKey: string, moduleKey: string) => {
    if (!editingPlan) return;
    const exists = (editingPlan.includedFeatures || []).includes(featureKey);
    let nextFeatures: string[];
    let nextModules = [...(editingPlan.includedModules || [])];

    if (exists) {
      nextFeatures = (editingPlan.includedFeatures || []).filter((fk) => fk !== featureKey);
    } else {
      nextFeatures = [...(editingPlan.includedFeatures || []), featureKey];
      if (!nextModules.includes(moduleKey)) {
        nextModules.push(moduleKey);
      }
    }

    setEditingPlan({
      ...editingPlan,
      includedModules: nextModules,
      includedFeatures: nextFeatures,
    });
  };

  const handleSelectAllModules = () => {
    if (!editingPlan) return;
    const allModuleKeys = allModules.map((m) => m.moduleKey);
    const allFeatureKeys = allModules.flatMap((m) => m.features.map((f) => f.featureKey));
    setEditingPlan({
      ...editingPlan,
      includedModules: allModuleKeys,
      includedFeatures: allFeatureKeys,
    });
  };

  const handleResetCoreModules = () => {
    if (!editingPlan) return;
    const coreKeys = ['core_hr', 'ess', 'leave', 'attendance', 'payroll'];
    const coreFeatures = allModules
      .filter((m) => coreKeys.includes(m.moduleKey))
      .flatMap((m) => m.features.map((f) => f.featureKey));
    setEditingPlan({
      ...editingPlan,
      includedModules: coreKeys,
      includedFeatures: coreFeatures,
    });
  };

  const handleUpdateVolumeBand = (bandIdx: number, field: keyof VolumePricingBand, value: any) => {
    if (!editingPlan || !editingPlan.volumeBands) return;
    const nextBands = [...editingPlan.volumeBands];
    nextBands[bandIdx] = {
      ...nextBands[bandIdx],
      [field]: value,
    };
    setEditingPlan({
      ...editingPlan,
      volumeBands: nextBands,
    });
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ── 1. Top Bar & Metrics ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">SaaS Plans & Pricing</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {plans.length} Active Plans Live
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Configure commercial base tiers, included employee allowances, PEPM rates, volume bands, and enterprise customer contract overrides.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('platform-pricing-calculator');
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <Calculator className="h-4 w-4 text-[#64748B]" />
            Pricing Calculator
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('platform-catalogue');
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-[#64748B]" />
            Feature Catalogue
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingPlan({
                id: `plan-${Date.now()}`,
                code: 'PROFESSIONAL',
                name: 'Custom New Plan',
                displayName: 'Custom Tier',
                tagline: 'Tailored commercial plan for specific enterprise segment',
                description: 'Custom configuration of modules and quotas.',
                targetAudience: 'Selected Enterprise Segment',
                status: 'Active',
                baseMonthlyPrice: 7999,
                includedEmployees: 100,
                additionalEmployeePrice: 65,
                volumeBands: plans[1].volumeBands,
                includedModules: ['core_hr', 'ess', 'leave', 'attendance', 'payroll'],
                includedFeatures: [],
                activeSubscriptionsCount: 0,
                mrrFormatted: '₹0',
                quotas: { ...plans[1].quotas },
              });
              setBuilderStep(1);
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#0F172B] text-white hover:bg-slate-800 border-none"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            + Create Plan
          </Button>
        </div>
      </div>

      {/* ── 2. Top Stats Bar ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Commercial Plans</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{plans.length} Tiers</div>
          <p className="text-[11.5px] text-emerald-700 font-medium mt-1">Starter, Pro, Biz, Enterprise</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscriptions</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{activeSubscriptions} {activeSubscriptions === 1 ? 'Tenant' : 'Tenants'}</div>
          <p className="text-[11.5px] text-blue-600 font-medium mt-1">
            {subscriptions.length > 0 ? `${proCount} on Professional (${proPct}%)` : 'Live enterprise tenancies'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Recurring (MRR)</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalMRR}</div>
          <p className="text-[11.5px] text-emerald-600 font-medium mt-1">Live active subscriptions</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Annualized Run Rate (ARR)</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalARR}</div>
          <p className="text-[11.5px] text-purple-600 font-medium mt-1">Contract value run-rate</p>
        </div>
      </div>

      {/* ── 3. Tabs & Billing Frequency Switch ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'plans'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Commercial Plan Cards
          </button>
          <button
            onClick={() => setActiveTab('volume')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'volume'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Volume Pricing Bands
          </button>
          <button
            onClick={() => setActiveTab('overrides')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'overrides'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Customer Overrides ({overrides.length})
          </button>
        </div>

        {activeTab === 'plans' && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setBillingCycle('Monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                billingCycle === 'Monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('Annual')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                billingCycle === 'Annual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                -10%
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── 4. Main Tab Contents ────────────────────────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const isAnnual = billingCycle === 'Annual';
            const price = isAnnual
              ? Math.round(plan.baseMonthlyPrice * 0.9)
              : plan.baseMonthlyPrice;

            return (
              <div
                key={plan.code}
                className={`bg-white rounded-2xl border flex flex-col justify-between transition-all duration-200 shadow-xs ${
                  plan.isPopular
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md relative'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {plan.isPopular && (
                  <div className="bg-blue-600 text-white text-center py-1 text-[11px] font-bold tracking-wider uppercase rounded-t-2xl">
                    ★ Most Popular & Recommended
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Plan Code & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-500">{plan.code}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    </div>

                    {/* Plan Name & Tagline */}
                    <h3 className="text-xl font-bold text-slate-900 mt-2">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {plan.tagline}
                    </p>

                    {/* Price Block */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-baseline gap-1">
                        {plan.baseMonthlyPrice > 0 ? (
                          <>
                            <span className="text-3xl font-black text-slate-900">
                              ₹{price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">/ month</span>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-black text-slate-900">
                              ₹{isAnnual && plan.volumeBands?.[0]?.annualPepmPrice ? plan.volumeBands[0].annualPepmPrice : plan.additionalEmployeePrice}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">/ emp / mo</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 mt-1">
                        {plan.quotas.maxAdminUsers} HR Admin User{plan.quotas.maxAdminUsers > 1 ? 's' : ''} Included
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {plan.baseMonthlyPrice > 0 
                          ? `Up to ${plan.includedEmployees} employees included (+₹${plan.additionalEmployeePrice}/emp)`
                          : `Volume Slabs: 1–50, 51–200, 201–500, 500+ employees`}
                      </div>
                    </div>

                    {/* Included Scope Badges */}
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Modules Included</span>
                        <span className="font-bold text-slate-900">{plan.includedModules.length} Modules</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Commercial Features</span>
                        <span className="font-bold text-slate-900">{plan.includedFeatures.length}+ Features</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Active Subscriptions</span>
                        <span className="font-bold text-slate-900">{plan.activeSubscriptionsCount} tenants</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Generated MRR</span>
                        <span className="font-bold text-emerald-700">{plan.mrrFormatted}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(plan)}
                      className="w-full text-xs font-semibold text-slate-800 border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      Edit Pricing & Quotas
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onNavigateTab) onNavigateTab('platform-pricing-calculator');
                      }}
                      className="w-full text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 flex items-center justify-center gap-1.5"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      Simulate in Calculator
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Volume Pricing Bands Tab ────────────────────────────────────────── */}
      {activeTab === 'volume' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Configurable Employee Volume Pricing Bands</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Large customers automatically receive lower PEPM rates as workforce headcount scales past initial plan thresholds.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10.5px]">
                  <th className="py-3 px-4">Employee Headcount Band</th>
                  <th className="py-3 px-4">Band Range</th>
                  <th className="py-3 px-4 text-center">PEPM Rate (₹/emp/mo)</th>
                  <th className="py-3 px-4">Commercial Behavior</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans[1].volumeBands.map((band, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{band.label}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {band.minEmployees} to {band.maxEmployees > 100000 ? 'Unlimited' : band.maxEmployees} employees
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700 text-sm">
                      {band.isIncluded ? 'Included in Base' : band.isCustom ? 'Custom Enterprise' : `₹${band.pepmPrice}`}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {band.isIncluded
                        ? 'Zero additional seat cost within base plan allowance'
                        : band.isCustom
                        ? 'Special enterprise rate negotiated by sales team'
                        : `Automated volume discounted rate for scale`}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Customer Commercial Overrides Tab ────────────────────────────────── */}
      {activeTab === 'overrides' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Enterprise Commercial Customer Overrides</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Special commercial agreements overriding standard catalogue pricing, seat limits, and module access.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsOverrideModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#0F172B] text-white hover:bg-slate-800 border-none shrink-0"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              + Add Customer Override
            </Button>
          </div>

          {overrides.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <Building2 className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">No Customer Commercial Overrides Active</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Standard catalogue tiers apply to all active client tenancies. Create a customer override to configure bespoke enterprise contract pricing, custom seat allowances, or multi-year terms.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOverrideModalOpen(true)}
                className="mt-4 border-slate-300 text-slate-700 hover:bg-white"
              >
                + Add Customer Override
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {overrides.map((override) => (
                <div
                  key={override.id}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-base font-bold text-slate-900">{override.tenantName}</h4>
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-100 text-purple-800">
                        Base: {override.basePlan}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      {override.notes}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span>Workforce: <strong className="text-slate-800">{override.customEmployeeCount.toLocaleString('en-IN')} seats</strong></span>
                      <span>Term: <strong className="text-slate-800">{override.startDate} → {override.endDate}</strong></span>
                      <span>Approved By: <strong className="text-slate-800">{override.approvedBy}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                    <div className="text-right">
                      <div className="text-xl font-black text-slate-900">
                        ₹{override.customContractPriceMonthly.toLocaleString('en-IN')}
                        <span className="text-xs text-slate-500 font-normal"> / mo</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        Active Multi-Year Contract
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteOverride(override.id)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 p-2 h-auto"
                      title="Delete Customer Override"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Customer Commercial Override Modal ────────────────────────────────── */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Customer Commercial Override</h3>
                <p className="text-xs text-slate-500">Configure special negotiated contract terms and bespoke feature entitlements for an enterprise tenant.</p>
              </div>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Client Organization</label>
                {clients.length > 0 && (
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium mb-1.5 bg-white"
                    onChange={(e) => {
                      const selected = clients.find((c) => c.id === e.target.value);
                      if (selected) {
                        setOverrideTenantId(selected.id);
                        setOverrideTenantName(selected.legalName);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select from Registered Commercial Clients (Optional)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName} ({c.gstin || c.billingAddress?.state || 'Commercial Client'})
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  placeholder="Or enter client legal name directly..."
                  value={overrideTenantName}
                  onChange={(e) => setOverrideTenantName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Base Plan Reference</label>
                  <select
                    value={overrideBasePlan}
                    onChange={(e) => setOverrideBasePlan(e.target.value as PlanTierCode)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="STARTER">Starter Tier</option>
                    <option value="PREMIUM">Premium Tier</option>
                    <option value="PROFESSIONAL">Professional Tier</option>
                    <option value="BUSINESS">Business Tier</option>
                    <option value="ENTERPRISE">Enterprise Tier</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Billing Frequency</label>
                  <select
                    value={overrideBillingFreq}
                    onChange={(e) => setOverrideBillingFreq(e.target.value as BillingCycle)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="Monthly">Monthly Billing</option>
                    <option value="Annual">Annual Billing (Recommended)</option>
                    <option value="Two-Year">Two-Year Agreement</option>
                    <option value="Custom">Custom Enterprise Terms</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contract Price (₹ / month)</label>
                  <input
                    type="number"
                    value={overridePrice}
                    onChange={(e) => setOverridePrice(Number(e.target.value))}
                    min={0}
                    step={1000}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Workforce Seats Entitlement</label>
                  <input
                    type="number"
                    value={overrideSeats}
                    onChange={(e) => setOverrideSeats(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Customer Add-on & Feature Entitlements */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Included Add-on Modules & Special Capabilities
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {allAddons.slice(0, 6).map((addon) => {
                    const isChecked = overrideAddons.includes(addon.addonKey);
                    return (
                      <label
                        key={addon.addonKey}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOverrideAddons([...overrideAddons, addon.addonKey]);
                            } else {
                              setOverrideAddons(overrideAddons.filter((k) => k !== addon.addonKey));
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <div className="truncate">
                          <span className="block truncate text-[11px]">{addon.name}</span>
                          <span className="text-[9.5px] text-slate-400 block">₹{addon.monthlyPrice}/mo</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contract Start Date</label>
                  <input
                    type="date"
                    value={overrideStartDate}
                    onChange={(e) => setOverrideStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contract Renewal Date</label>
                  <input
                    type="date"
                    value={overrideEndDate}
                    onChange={(e) => setOverrideEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Commercial Agreement Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Commercial override approved for 2-year enterprise agreement with custom PEPM and vendor workforce included."
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOverrideModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Save Override Agreement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 5. Plan Builder Drawer / Modal ───────────────────────────────────── */}
      {isBuilderOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header & Clickable Stepper Tabs */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {editingPlan.code ? editingPlan.code.slice(0, 2) : 'PL'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {editingPlan.id.startsWith('plan-') && editingPlan.id.length > 20
                        ? 'Create Commercial Plan'
                        : `Edit Plan: ${editingPlan.name}`}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                        {editingPlan.status || 'Active'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">Configure base pricing, volume slabs, included modules, features, and platform limits.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 4 Interactive Steps */}
              <div className="grid grid-cols-4 gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBuilderStep(1)}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    builderStep === 1
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">1</span>
                  <span className="truncate">Profile & Model</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBuilderStep(2)}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    builderStep === 2
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">2</span>
                  <span className="truncate">Pricing & Slabs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBuilderStep(3)}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    builderStep === 3
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">3</span>
                  <span className="truncate">Modules & Features ({editingPlan.includedModules?.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBuilderStep(4)}
                  className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    builderStep === 4
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">4</span>
                  <span className="truncate">Quotas & Limits</span>
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* ── STEP 1: Basic Profile & Configuration Type ── */}
              {builderStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Plan Display Name</label>
                      <input
                        type="text"
                        value={editingPlan.name}
                        onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-900"
                        placeholder="e.g. Premium"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Plan Tier Code</label>
                      <select
                        value={editingPlan.code}
                        onChange={(e) => setEditingPlan({ ...editingPlan, code: e.target.value as PlanTierCode })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                      >
                        <option value="STARTER">STARTER</option>
                        <option value="PREMIUM">PREMIUM</option>
                        <option value="PROFESSIONAL">PROFESSIONAL</option>
                        <option value="BUSINESS">BUSINESS</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </div>
                  </div>

                  {/* Commercial Configuration / Pricing Model Type */}
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1.5">
                      Commercial Pricing Model & Configuration Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div
                        onClick={() => {
                          setPricingModelType('VOLUME_PEPM');
                          setEditingPlan({ ...editingPlan, baseMonthlyPrice: 0 });
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          pricingModelType === 'VOLUME_PEPM'
                            ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="font-bold text-slate-900 text-xs">Volume Tiered PEPM</div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          No base fee. Charges per employee based on scaling headcount volume slabs.
                        </p>
                      </div>

                      <div
                        onClick={() => {
                          setPricingModelType('BASE_PLUS_PEPM');
                          if (editingPlan.baseMonthlyPrice === 0) {
                            setEditingPlan({ ...editingPlan, baseMonthlyPrice: 19999, includedEmployees: 50 });
                          }
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          pricingModelType === 'BASE_PLUS_PEPM'
                            ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="font-bold text-slate-900 text-xs">Base Fee + PEPM</div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Fixed base monthly fee including N employees, plus overage PEPM for additional headcount.
                        </p>
                      </div>

                      <div
                        onClick={() => {
                          setPricingModelType('FLAT_ENTERPRISE');
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          pricingModelType === 'FLAT_ENTERPRISE'
                            ? 'bg-purple-50/70 border-purple-500 ring-1 ring-purple-500'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="font-bold text-slate-900 text-xs">Flat Enterprise Tier</div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Comprehensive enterprise agreement with custom negotiated contract limits and SLA.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Plan Status</label>
                      <select
                        value={editingPlan.status}
                        onChange={(e) => setEditingPlan({ ...editingPlan, status: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                      >
                        <option value="Active">Active (Available for subscription)</option>
                        <option value="Draft">Draft (Internal preview only)</option>
                        <option value="Archived">Archived (Grandfathered customers only)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editingPlan.isPopular}
                          onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="font-semibold text-slate-800">
                          Highlight as "Most Popular & Recommended" Tier
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Commercial Tagline</label>
                    <input
                      type="text"
                      value={editingPlan.tagline}
                      onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      placeholder="e.g. Recommended: Full India Statutory Payroll + Shift Roster + WhatsApp Bot"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Target Audience</label>
                    <input
                      type="text"
                      value={editingPlan.targetAudience}
                      onChange={(e) => setEditingPlan({ ...editingPlan, targetAudience: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      placeholder="e.g. Mid-market enterprises with 50 – 500 employees"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Plan Description</label>
                    <textarea
                      rows={2}
                      value={editingPlan.description || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      placeholder="Detailed breakdown of plan capabilities..."
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 2: Pricing, Base Rates & Volume Slabs ── */}
              {builderStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Base Monthly Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={editingPlan.baseMonthlyPrice}
                        onChange={(e) => setEditingPlan({ ...editingPlan, baseMonthlyPrice: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-emerald-700"
                      />
                      <span className="text-[10.5px] text-slate-400 mt-1 block">Set ₹0 for pure per-employee volume pricing.</span>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Included Workforce Seats</label>
                      <input
                        type="number"
                        min={0}
                        value={editingPlan.includedEmployees}
                        onChange={(e) => setEditingPlan({ ...editingPlan, includedEmployees: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                      />
                      <span className="text-[10.5px] text-slate-400 mt-1 block">Base headcount included in fee.</span>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Additional PEPM (₹/emp/mo)</label>
                      <input
                        type="number"
                        min={0}
                        value={editingPlan.additionalEmployeePrice}
                        onChange={(e) => setEditingPlan({ ...editingPlan, additionalEmployeePrice: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-blue-700"
                      />
                      <span className="text-[10.5px] text-slate-400 mt-1 block">Rate charged for seats above included limit.</span>
                    </div>
                  </div>

                  {/* Volume Pricing Slabs Table */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">Volume Headcount Pricing Slabs</h4>
                        <p className="text-[11px] text-slate-500">PEPM automatically adjusts based on customer's total active workforce.</p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                            <th className="py-2.5 px-3">Headcount Slab</th>
                            <th className="py-2.5 px-3 text-center">Monthly PEPM (₹)</th>
                            <th className="py-2.5 px-3 text-center">Annual PEPM (₹)</th>
                            <th className="py-2.5 px-3 text-center">Onboarding Fee (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(editingPlan.volumeBands || []).map((band, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {band.minEmployees} – {band.maxEmployees > 100000 ? '500+ (Unlimited)' : band.maxEmployees} Employees
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="inline-flex items-center gap-1 font-bold">
                                  <span>₹</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={band.pepmPrice}
                                    onChange={(e) => handleUpdateVolumeBand(idx, 'pepmPrice', parseInt(e.target.value) || 0)}
                                    className="w-16 px-1.5 py-1 text-center font-bold rounded border border-slate-300 text-emerald-700"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="inline-flex items-center gap-1 font-bold">
                                  <span>₹</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={band.annualPepmPrice ?? Math.round(band.pepmPrice * 0.85)}
                                    onChange={(e) => handleUpdateVolumeBand(idx, 'annualPepmPrice', parseInt(e.target.value) || 0)}
                                    className="w-16 px-1.5 py-1 text-center font-bold rounded border border-slate-300 text-purple-700"
                                  />
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <span>₹</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={band.onboardingSetupFee ?? 0}
                                    onChange={(e) => handleUpdateVolumeBand(idx, 'onboardingSetupFee', parseInt(e.target.value) || 0)}
                                    className="w-20 px-1.5 py-1 text-center rounded border border-slate-300 text-slate-700 font-semibold"
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Included Modules & Commercial Features ── */}
              {builderStep === 3 && (
                <div className="space-y-4">
                  {/* Quick Filter & Bulk Actions Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filter modules or features..."
                          value={moduleSearch}
                          onChange={(e) => setModuleSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs w-56 bg-white"
                        />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        ✓ {(editingPlan.includedModules || []).length} / {allModules.length} Modules Granted
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSelectAllModules}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-[11px] font-semibold"
                      >
                        Select All (16)
                      </button>
                      <button
                        type="button"
                        onClick={handleResetCoreModules}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-[11px] font-semibold"
                      >
                        Core 5 Only
                      </button>
                    </div>
                  </div>

                  {/* 16 Modules Interactive Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allModules
                      .filter((mod) => {
                        if (!moduleSearch) return true;
                        const q = moduleSearch.toLowerCase();
                        return (
                          mod.name.toLowerCase().includes(q) ||
                          mod.moduleKey.toLowerCase().includes(q) ||
                          mod.features.some((f) => f.name.toLowerCase().includes(q) || f.featureKey.toLowerCase().includes(q))
                        );
                      })
                      .map((mod) => {
                        const isModIncluded = (editingPlan.includedModules || []).includes(mod.moduleKey);
                        const isExpanded = expandedModuleKey === mod.moduleKey;
                        const activeFeaturesInMod = mod.features.filter((f) =>
                          (editingPlan.includedFeatures || []).includes(f.featureKey)
                        ).length;

                        return (
                          <div
                            key={mod.moduleKey}
                            className={`rounded-xl border transition-all ${
                              isModIncluded
                                ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                                : 'bg-white border-slate-200 opacity-75 hover:opacity-100'
                            }`}
                          >
                            <div className="p-3 flex items-start justify-between gap-2">
                              <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isModIncluded}
                                  onChange={() => handleToggleModule(mod.moduleKey)}
                                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 text-xs">{mod.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">#{mod.moduleNumber}</span>
                                  </div>
                                  <p className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5">
                                    {mod.shortDescription}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5 text-[10.5px]">
                                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                      {mod.tier.split('—')[1] || mod.tier}
                                    </span>
                                    <span className="text-emerald-700 font-semibold">
                                      {activeFeaturesInMod} of {mod.features.length} features
                                    </span>
                                  </div>
                                </div>
                              </label>

                              <button
                                type="button"
                                onClick={() => setExpandedModuleKey(isExpanded ? null : mod.moduleKey)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition"
                                title="Expand granular features"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </div>

                            {/* Granular Sub-Features Checklist */}
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 bg-white/80 rounded-b-xl space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Granular Feature Capabilities
                                </span>
                                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                  {mod.features.map((feat) => {
                                    const isFeatIncluded = (editingPlan.includedFeatures || []).includes(feat.featureKey);
                                    return (
                                      <label
                                        key={feat.featureKey}
                                        className="flex items-center justify-between gap-2 p-1 rounded hover:bg-slate-100/70 cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isFeatIncluded}
                                            onChange={() => handleToggleFeature(feat.featureKey, mod.moduleKey)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 h-3 w-3"
                                          />
                                          <span className="text-[11px] text-slate-700 font-medium">{feat.name}</span>
                                        </div>
                                        <span className="text-[9.5px] font-mono text-slate-400">{feat.featureKey}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ── STEP 4: Quotas & Entitlement Limits ── */}
              {builderStep === 4 && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 text-xs">Platform Resource Quotas & Operational Limits</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enforced automatically by the Joy PeopleHR policy engine across cloud infrastructure, APIs, and hardware turnstiles.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Max Total Employees (Seats)</label>
                      <input
                        type="number"
                        min={1}
                        value={editingPlan.quotas?.maxEmployees ?? 100}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            quotas: { ...editingPlan.quotas, maxEmployees: parseInt(e.target.value) || 1 },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">HR Admin User Licenses</label>
                      <input
                        type="number"
                        min={1}
                        value={editingPlan.quotas?.maxAdminUsers ?? 1}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            quotas: { ...editingPlan.quotas, maxAdminUsers: parseInt(e.target.value) || 1 },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Max Branch Locations</label>
                      <input
                        type="number"
                        min={1}
                        value={editingPlan.quotas?.maxLocations ?? 1}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            quotas: { ...editingPlan.quotas, maxLocations: parseInt(e.target.value) || 1 },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Max Legal Entities / Companies</label>
                      <input
                        type="number"
                        min={1}
                        value={editingPlan.quotas?.maxCompanies ?? 1}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            quotas: { ...editingPlan.quotas, maxCompanies: parseInt(e.target.value) || 1 },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Max Biometric Turnstiles</label>
                      <input
                        type="number"
                        min={0}
                        value={editingPlan.quotas?.maxBiometricDevices ?? 0}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            quotas: { ...editingPlan.quotas, maxBiometricDevices: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Document Cloud Storage (GB)</label>
                      <input
                        type="number"
                        min={1}
                        value={editingPlan.quotas?.storageGb ?? 15}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            quotas: { ...editingPlan.quotas, storageGb: parseInt(e.target.value) || 1 },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-blue-700"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Daily API Calls Allowance</label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={editingPlan.quotas?.apiCallsPerDay ?? 5000}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            quotas: { ...editingPlan.quotas, apiCallsPerDay: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Included WhatsApp Messages/mo</label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={editingPlan.quotas?.includedWhatsAppMessagesPerMonth ?? 0}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            quotas: { ...editingPlan.quotas, includedWhatsAppMessagesPerMonth: parseInt(e.target.value) || 0 },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Support Level SLA</label>
                      <input
                        type="text"
                        value={editingPlan.quotas?.supportSla ?? '48-hour email'}
                        onChange={(e) =>
                          setEditingPlan({
                            ...editingPlan,
                            quotas: { ...editingPlan.quotas, supportSla: e.target.value },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium"
                        placeholder="e.g. 12-hour business hours SLA"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Navigation Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50/50">
              {builderStep > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBuilderStep((prev) => (prev - 1) as any)}
                >
                  ‹ Previous
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBuilderOpen(false)}
                >
                  Cancel
                </Button>
              )}

              <div className="flex items-center gap-2">
                {builderStep < 4 ? (
                  <Button
                    size="sm"
                    onClick={() => setBuilderStep((prev) => (prev + 1) as any)}
                    className="bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Next Step ›
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSavePlan}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-4"
                  >
                    ✓ Save Commercial Plan
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
