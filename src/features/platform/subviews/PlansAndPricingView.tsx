// src/features/platform/subviews/PlansAndPricingView.tsx
// ============================================================================
// Joy PeopleHR — SaaS Commercial Plans & Pricing Console
// Master control plane for Tier Pricing, Volume Bands, and Entitlements
// ============================================================================

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import {
  CommercialPlan,
  PlanTierCode,
  BillingCycle,
  CustomerCommercialOverride,
} from '../../../types/saasCatalogue';
import { saasPricingEngine } from '../../../services/platform/saasPricingEngine';
import { saasCatalogueService } from '../../../services/platform/saasCatalogueService';

interface PlansAndPricingViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const PlansAndPricingView: React.FC<PlansAndPricingViewProps> = ({ onNavigateTab }) => {
  const [plans, setPlans] = useState<CommercialPlan[]>(() => saasPricingEngine.getPlans());
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Annual'>('Monthly');
  const [activeTab, setActiveTab] = useState<'plans' | 'volume' | 'overrides'>('plans');

  // Plan Edit Drawer State
  const [editingPlan, setEditingPlan] = useState<CommercialPlan | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3>(1);

  // Customer Overrides
  const [overrides, setOverrides] = useState<CustomerCommercialOverride[]>(() =>
    saasCatalogueService.getCustomerOverrides()
  );

  const totalMRR = '₹8.42L';
  const totalARR = '₹1.01Cr';
  const activeSubscriptions = 127;

  const handleOpenEdit = (plan: CommercialPlan) => {
    setEditingPlan({ ...plan });
    setBuilderStep(1);
    setIsBuilderOpen(true);
  };

  const handleSavePlan = () => {
    if (!editingPlan) return;
    saasPricingEngine.updatePlan(editingPlan);
    setPlans([...saasPricingEngine.getPlans()]);
    setIsBuilderOpen(false);
    setEditingPlan(null);
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
          <div className="mt-2 text-2xl font-bold text-slate-900">{activeSubscriptions} Tenants</div>
          <p className="text-[11.5px] text-blue-600 font-medium mt-1">68 on Professional (53%)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Recurring (MRR)</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalMRR}</div>
          <p className="text-[11.5px] text-emerald-600 font-medium mt-1">+14.2% MoM growth</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Enterprise Commercial Customer Overrides</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Special commercial agreements overriding standard catalogue pricing, seat limits, and module access.
              </p>
            </div>
          </div>

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
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span>Workforce: <strong className="text-slate-800">{override.customEmployeeCount.toLocaleString('en-IN')} seats</strong></span>
                    <span>Term: <strong className="text-slate-800">{override.startDate} → {override.endDate}</strong></span>
                    <span>Approved By: <strong className="text-slate-800">{override.approvedBy}</strong></span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xl font-black text-slate-900">
                    ₹{override.customContractPriceMonthly.toLocaleString('en-IN')}
                    <span className="text-xs text-slate-500 font-normal"> / mo</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    Active Multi-Year Contract
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Plan Builder Drawer / Modal ───────────────────────────────────── */}
      {isBuilderOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingPlan.id.startsWith('plan-') && editingPlan.id.length > 20 ? 'Create Commercial Plan' : `Edit Plan: ${editingPlan.name}`}
                </h3>
                <p className="text-xs text-slate-500">Step {builderStep} of 3</p>
              </div>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Basic Information */}
            {builderStep === 1 && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Plan Display Name</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Commercial Tagline</label>
                  <input
                    type="text"
                    value={editingPlan.tagline}
                    onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Audience</label>
                  <input
                    type="text"
                    value={editingPlan.targetAudience}
                    onChange={(e) => setEditingPlan({ ...editingPlan, targetAudience: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Pricing & Volume Details */}
            {builderStep === 2 && (
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Base Monthly Price (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingPlan.baseMonthlyPrice}
                      onChange={(e) => setEditingPlan({ ...editingPlan, baseMonthlyPrice: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Included Employees</label>
                    <input
                      type="number"
                      min={1}
                      value={editingPlan.includedEmployees}
                      onChange={(e) => setEditingPlan({ ...editingPlan, includedEmployees: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Additional Employee PEPM (₹/emp/mo)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingPlan.additionalEmployeePrice}
                    onChange={(e) => setEditingPlan({ ...editingPlan, additionalEmployeePrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Default rate charged for workforce count exceeding the included allowance.
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Quotas & Limits */}
            {builderStep === 3 && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Max Locations</label>
                    <input
                      type="number"
                      value={editingPlan.quotas.maxLocations}
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
                    <label className="font-semibold text-slate-700 block mb-1">Max Biometric Turnstiles</label>
                    <input
                      type="number"
                      value={editingPlan.quotas.maxBiometricDevices}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          quotas: { ...editingPlan.quotas, maxBiometricDevices: parseInt(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Included Monthly WhatsApp Messages</label>
                  <input
                    type="number"
                    value={editingPlan.quotas.includedWhatsAppMessagesPerMonth}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        quotas: { ...editingPlan.quotas, includedWhatsAppMessagesPerMonth: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Support Level SLA</label>
                  <input
                    type="text"
                    value={editingPlan.quotas.supportSla}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        quotas: { ...editingPlan.quotas, supportSla: e.target.value },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            )}

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              {builderStep > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBuilderStep((prev) => (prev - 1) as any)}
                >
                  Previous
                </Button>
              ) : (
                <div />
              )}

              {builderStep < 3 ? (
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
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Save Commercial Plan
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
