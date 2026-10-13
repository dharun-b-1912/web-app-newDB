// src/features/platform/subviews/PricingCalculatorView.tsx
// ============================================================================
// Joy PeopleHR — Interactive SaaS Pricing & Contract Calculator
// Authoritative pricing model with volume tiers, add-ons and transparent GST breakdown
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Check,
  Sparkles,
  HelpCircle,
  Copy,
  Download,
  Share2,
  DollarSign,
  Users,
  ShieldCheck,
  Building2,
  ArrowRight,
  TrendingDown,
  Percent,
  Receipt,
  Layers,
  CheckCircle2,
  Info,
  FileText,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import {
  PlanTierCode,
  BillingCycle,
  PricingCalculationInput,
  PricingCalculationResult,
} from '../../../types/saasCatalogue';
import { saasPricingEngine } from '../../../services/platform/saasPricingEngine';
import { saasCatalogueService } from '../../../services/platform/saasCatalogueService';

interface PricingCalculatorViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

export const PricingCalculatorView: React.FC<PricingCalculatorViewProps> = ({ onNavigateTab }) => {
  // Input State
  const [customerName, setCustomerName] = useState<string>('Acme Global Enterprises Pvt Ltd');
  const [companiesCount, setCompaniesCount] = useState<number>(1);
  const [locationsCount, setLocationsCount] = useState<number>(5);
  const [selectedPlanCode, setSelectedPlanCode] = useState<PlanTierCode>('PROFESSIONAL'); // Professional recommended default
  const [employeeCount, setEmployeeCount] = useState<number>(350);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('Annual');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['recruitment_suite', 'performance_management']);
  const [extraDevices, setExtraDevices] = useState<number>(5);
  const [extraStorageUnits, setExtraStorageUnits] = useState<number>(0);
  const [monthlyWhatsAppMsgs, setMonthlyWhatsAppMsgs] = useState<number>(5000);
  const [customDiscountPct, setCustomDiscountPct] = useState<number>(0);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isHowCalculatedOpen, setIsHowCalculatedOpen] = useState(false);

  const plans = useMemo(() => saasPricingEngine.getPlans(), []);
  const allAddons = useMemo(() => saasCatalogueService.getAddons(), []);

  // Compute live quote through the engine
  const quoteResult: PricingCalculationResult = useMemo(() => {
    const input: PricingCalculationInput = {
      planCode: selectedPlanCode,
      employeeCount,
      billingCycle,
      selectedAddonKeys: selectedAddons,
      extraBiometricDevices: extraDevices,
      extraStorage100GbUnits: extraStorageUnits,
      monthlyWhatsAppMessages: monthlyWhatsAppMsgs,
      customDiscountPercent: customDiscountPct > 0 ? customDiscountPct : undefined,
    };
    return saasPricingEngine.calculateQuote(input);
  }, [
    selectedPlanCode,
    employeeCount,
    billingCycle,
    selectedAddons,
    extraDevices,
    extraStorageUnits,
    monthlyWhatsAppMsgs,
    customDiscountPct,
  ]);

  const toggleAddon = (addonKey: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonKey) ? prev.filter((k) => k !== addonKey) : [...prev, addonKey]
    );
  };

  const handleCreateQuotation = () => {
    if (onNavigateTab) {
      onNavigateTab('platform-quotations', {
        presetFilter: 'new',
        quotationDraft: {
          clientName: customerName,
          planCode: selectedPlanCode,
          employeeCount,
          billingCycle,
          selectedAddons,
          quoteResult,
        },
      });
    }
  };

  const handleSaveCalculation = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('joy_saved_pricing_calculations') || '[]');
      saved.unshift({
        id: `CALC-${Date.now()}`,
        date: new Date().toISOString(),
        customerName,
        planName: quoteResult.planName,
        employeeCount,
        grandTotal: quoteResult.grandTotal,
        quoteResult,
      });
      localStorage.setItem('joy_saved_pricing_calculations', JSON.stringify(saved.slice(0, 20)));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch {}
  };

  const handleCopySummary = () => {
    const summary = `
Joy PeopleHR SaaS Commercial Quote:
Customer: ${customerName} (Companies: ${companiesCount}, Locations: ${locationsCount})
Plan: ${quoteResult.planName} (${quoteResult.billingCycle})
Employees: ${quoteResult.employeeCount} (Base included: ${quoteResult.includedEmployees} + ${quoteResult.additionalEmployeesCount} additional @ ₹${quoteResult.appliedPepmRate} PEPM)
Add-ons: ${quoteResult.itemizedAddons.map((a) => a.name).join(', ') || 'None'}
Base + Additional Employees: ₹${(quoteResult.baseMonthlyPrice + quoteResult.employeeOverageMonthly).toLocaleString('en-IN')}/mo
Add-ons Subtotal: ₹${quoteResult.addonsMonthlyTotal.toLocaleString('en-IN')}/mo
Pre-tax Contract Value (${quoteResult.cycleMultiplier} mos): ₹${quoteResult.netPreTaxAmount.toLocaleString('en-IN')} (Includes ${quoteResult.cycleDiscountPercent}% Term Savings)
GST (18%): ₹${quoteResult.gstAmount.toLocaleString('en-IN')}
Grand Total Contract Value: ₹${quoteResult.grandTotal.toLocaleString('en-IN')}
Monthly Equivalent Run Rate: ₹${quoteResult.monthlyEquivalent.toLocaleString('en-IN')}/mo
    `.trim();

    navigator.clipboard.writeText(summary);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ── 1. Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">SaaS Subscription & Pricing Calculator</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Volume Tiers Active
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Model accurate enterprise contract values with transparent employee overages, volume discount bands, modular add-ons, and statutory 18% GST.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('platform-plans');
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-[#64748B]" />
            View Plans & Pricing
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 bg-[#0F172B] text-white hover:bg-slate-800 border-none"
          >
            {copiedSuccess ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                Quote Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Quote Summary
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── 2. Two-Column Layout: Inputs (Left) and Live Contract Breakdown (Right) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer / Prospect Configuration Block */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Customer / Prospect Configuration
              </label>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Currency: INR (₹)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Customer / Prospect Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Reliance Retail / Infosys Ltd"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Total Employees</label>
                <input
                  type="number"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Companies / Legal Entities</label>
                <input
                  type="number"
                  value={companiesCount}
                  onChange={(e) => setCompaniesCount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Work Locations</label>
                <input
                  type="number"
                  value={locationsCount}
                  onChange={(e) => setLocationsCount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Step 1: Commercial Plan Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">1</span>
                Select Commercial Plan Tier
              </label>
              <span className="text-xs text-slate-500">Configurable base plans</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {plans.map((p) => {
                const isSelected = selectedPlanCode === p.code;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelectedPlanCode(p.code)}
                    className={`relative p-3.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {p.isPopular && (
                      <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-600 text-white shadow-xs">
                        RECOMMENDED
                      </span>
                    )}
                    <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                    <div className="text-xs font-semibold text-emerald-700 mt-1">
                      ₹{p.baseMonthlyPrice.toLocaleString('en-IN')}
                      <span className="text-[10px] text-slate-500 font-normal">/mo</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Up to {p.includedEmployees} employees
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Employee Count & Volume Band Slider */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">2</span>
                Total Workforce Employees
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-1 text-sm font-bold text-right rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
                />
                <span className="text-xs text-slate-500">Employees</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={10}
              max={2000}
              step={10}
              value={employeeCount}
              onChange={(e) => setEmployeeCount(parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            {/* Volume Tiers Visual Indicators */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-[11.5px] font-semibold text-slate-600 mb-2 flex items-center justify-between">
                <span>Active Volume Band Rate</span>
                <span className="text-emerald-700 font-bold">
                  ₹{quoteResult.appliedPepmRate} PEPM (Per Employee / Month)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                {(plans.find((p) => p.code === selectedPlanCode)?.volumeBands || []).map((band, idx) => {
                  const isActive = employeeCount >= band.minEmployees && employeeCount <= band.maxEmployees;
                  const isAnnual = billingCycle === 'Annual' || billingCycle === 'Two-Year';
                  const rate = isAnnual && band.annualPepmPrice ? band.annualPepmPrice : band.pepmPrice;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="font-bold">{band.label.split('(')[0].trim()}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        ₹{rate} / emp / mo
                      </div>
                      {band.onboardingSetupFee && band.onboardingSetupFee > 0 && isAnnual ? (
                        <div className="text-[9px] text-amber-700 font-medium">
                          +₹{band.onboardingSetupFee.toLocaleString('en-IN')} setup
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 3: Billing Frequency & Contract Term */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">3</span>
                Contract Term & Billing Frequency
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setBillingCycle('Monthly')}
                className={`p-3 rounded-xl text-center border transition-all ${
                  billingCycle === 'Monthly'
                    ? 'border-emerald-600 bg-emerald-50/50 font-bold text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-bold">Monthly</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Standard flexibility</div>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('Annual')}
                className={`p-3 rounded-xl text-center border relative transition-all ${
                  billingCycle === 'Annual'
                    ? 'border-emerald-600 bg-emerald-50/50 font-bold text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-600 text-white">
                  SAVE 10%
                </span>
                <div className="text-sm font-bold">Annual (1 Year)</div>
                <div className="text-[11px] text-emerald-700 font-medium mt-0.5">10% Term Discount</div>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('Two-Year')}
                className={`p-3 rounded-xl text-center border relative transition-all ${
                  billingCycle === 'Two-Year'
                    ? 'border-emerald-600 bg-emerald-50/50 font-bold text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-purple-600 text-white">
                  SAVE 15%
                </span>
                <div className="text-sm font-bold">2-Year Multi-Year</div>
                <div className="text-[11px] text-purple-700 font-medium mt-0.5">15% Term Discount</div>
              </button>
            </div>
          </div>

          {/* Step 4: Modular Add-on Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">4</span>
                Select Modular Add-on Capabilities
              </label>
              <span className="text-xs text-slate-500">Pick any combination</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allAddons.map((addon) => {
                const isChecked = selectedAddons.includes(addon.addonKey);
                return (
                  <div
                    key={addon.addonKey}
                    onClick={() => toggleAddon(addon.addonKey)}
                    className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-start justify-between gap-3 ${
                      isChecked
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{addon.name}</span>
                        {addon.addonKey === 'whatsapp_meter_bundle' && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Exclusive WhatsApp Bot
                          </span>
                        )}
                        {addon.addonKey === 'field_gps_route_tracking' && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            Save 72% vs greytHR (₹140)
                          </span>
                        )}
                        {addon.addonKey === 'assisted_data_migration_concierge' && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            Save ₹40K vs Spine
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{addon.description}</p>
                      <div className="text-xs font-bold text-emerald-700 mt-1">
                        +₹{addon.monthlyPrice.toLocaleString('en-IN')}
                        <span className="text-[10px] text-slate-500 font-normal"> ({addon.billingUnit})</span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Quote Breakdown Card (5 Cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
            {/* Quote Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Live Contract Breakdown
                </span>
                <span className="text-xs text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                  INR (₹) Excl. Tax
                </span>
              </div>
              <h2 className="text-2xl font-bold mt-1 text-white">
                {quoteResult.planName} Tier
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {quoteResult.employeeCount} Employees • {quoteResult.billingCycle} Agreement
              </p>
            </div>

            {/* Line Items */}
            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              {/* Subscription Breakdown */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <span className="font-semibold text-slate-900 block">{quoteResult.planName} Subscription</span>
                  <span className="text-[11px] text-slate-500">
                    {quoteResult.employeeCount} employees @ ₹{quoteResult.appliedPepmRate} PEPM ({quoteResult.appliedVolumeBand})
                  </span>
                </div>
                <span className="font-bold text-slate-900 text-sm">
                  ₹{quoteResult.employeeOverageMonthly.toLocaleString('en-IN')}/mo
                </span>
              </div>

              {/* Setup / Training Fee if applicable */}
              {quoteResult.appliedSetupFee && quoteResult.appliedSetupFee > 0 ? (
                <div className="flex items-center justify-between pb-2 border-b border-amber-100 bg-amber-50/60 px-2 py-1.5 rounded-lg">
                  <div>
                    <span className="font-semibold text-amber-950 block text-xs">Biometric & Onboarding Training Fee</span>
                    <span className="text-[10.5px] text-amber-700">One-time deployment charge</span>
                  </div>
                  <span className="font-bold text-amber-900 text-xs">
                    +₹{quoteResult.appliedSetupFee.toLocaleString('en-IN')}
                  </span>
                </div>
              ) : null}

              {/* Selected Add-ons */}
              {quoteResult.itemizedAddons.length > 0 && (
                <div className="pb-2 border-b border-slate-100 space-y-1.5">
                  <div className="font-semibold text-slate-900">Configured Add-ons ({quoteResult.itemizedAddons.length})</div>
                  {quoteResult.itemizedAddons.map((addon) => (
                    <div key={addon.addonKey} className="flex items-center justify-between text-[11.5px] text-slate-600 pl-2">
                      <span>• {addon.name}</span>
                      <span className="font-medium text-slate-800">
                        +₹{addon.monthlyPrice.toLocaleString('en-IN')}/mo
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Gross Monthly Run Rate */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600">Gross Monthly Run-Rate</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹{quoteResult.grossMonthlyTotal.toLocaleString('en-IN')}/mo
                </span>
              </div>

              {/* Contract Term Subtotal & Savings */}
              {quoteResult.cycleDiscountPercent > 0 && (
                <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-800">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold">{quoteResult.cycleDiscountPercent}% Term Discount</span>
                  </div>
                  <span className="font-bold">
                    -₹{quoteResult.cycleDiscountAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Pre-Tax Amount */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-semibold text-slate-800">
                <span>Taxable Amount ({quoteResult.cycleMultiplier} mos)</span>
                <span>₹{quoteResult.netPreTaxAmount.toLocaleString('en-IN')}</span>
              </div>

              {/* GST 18% */}
              <div className="flex items-center justify-between text-slate-600">
                <span>Goods & Services Tax (18% GST)</span>
                <span className="font-medium">+₹{quoteResult.gstAmount.toLocaleString('en-IN')}</span>
              </div>

              {/* Grand Total */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total Contract Value
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    ₹{quoteResult.grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-right text-[11px] text-emerald-700 font-semibold mt-1">
                  Effective ₹{quoteResult.monthlyEquivalent.toLocaleString('en-IN')}/month all-inclusive
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  onClick={handleCreateQuotation}
                  className="w-full bg-[#047857] hover:bg-[#036246] text-white font-bold py-2.5 text-xs shadow-md flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Create Quotation with this Pricing Snapshot →
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveCalculation}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs py-2"
                  >
                    {savedSuccess ? 'Calculation Saved ✓' : 'Save Calculation'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleCopySummary}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs py-2"
                  >
                    {copiedSuccess ? 'Copied ✓' : 'Copy Quote Text'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Competitor Benchmark & TCO Savings Card (greytHR & Spine HR Suite) */}
          {quoteResult.competitorComparison && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4 rounded-2xl border border-emerald-500/30 text-white shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    TCO Benchmark vs Competitors
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Save up to {Math.max(quoteResult.competitorComparison.savingsPercentVsGreytHr, quoteResult.competitorComparison.savingsPercentVsSpine)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">vs greytHR (Growth)</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    ₹{quoteResult.competitorComparison.greytHrEstimateMonthly.toLocaleString('en-IN')}<span className="text-[10px] font-normal text-slate-400">/mo</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                    Save ₹{quoteResult.competitorComparison.monthlySavingsVsGreytHr.toLocaleString('en-IN')}/mo ({quoteResult.competitorComparison.savingsPercentVsGreytHr}%)
                  </div>
                  <div className="text-[9.5px] text-slate-400 mt-1 leading-snug">
                    greytHR charges +₹50 GPS punch & +₹140 live tracking add-on per user
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">vs Spine HR Suite</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    ₹{quoteResult.competitorComparison.spineEstimateMonthly.toLocaleString('en-IN')}<span className="text-[10px] font-normal text-slate-400">/mo</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                    Save ₹{quoteResult.competitorComparison.monthlySavingsVsSpine.toLocaleString('en-IN')}/mo ({quoteResult.competitorComparison.savingsPercentVsSpine}%)
                  </div>
                  <div className="text-[9.5px] text-slate-400 mt-1 leading-snug">
                    Spine charges ₹50,000 setup fee & requires 12 months advance payout
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200 flex items-center justify-between">
                <span>Estimated Annual Customer Savings:</span>
                <span className="font-bold text-emerald-300 text-xs">
                  ₹{Math.max(quoteResult.competitorComparison.annualSavingsVsGreytHr, quoteResult.competitorComparison.annualSavingsVsSpine).toLocaleString('en-IN')} / year
                </span>
              </div>
            </div>
          )}

          {/* Expandable 10-Point "How was this calculated?" Audit */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2">
            <button
              type="button"
              onClick={() => setIsHowCalculatedOpen(!isHowCalculatedOpen)}
              className="w-full flex items-center justify-between font-bold text-slate-900 text-[11.5px] cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-emerald-600" />
                <span>How was this calculated? (Transparent Commercial Audit)</span>
              </div>
              <span className="text-emerald-700 font-semibold">{isHowCalculatedOpen ? '▲ Hide' : '▼ Expand'}</span>
            </button>

            {isHowCalculatedOpen && (
              <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div>1. Plan Base: <strong>{quoteResult.planName} (₹{quoteResult.baseMonthlyPrice.toLocaleString('en-IN')}/mo)</strong></div>
                  <div>2. Included Employees: <strong>{quoteResult.includedEmployees}</strong></div>
                  <div>3. Additional Employees: <strong>{quoteResult.additionalEmployeesCount}</strong></div>
                  <div>4. Applied PEPM Rate: <strong>₹{quoteResult.appliedPepmRate}/mo</strong></div>
                  <div>5. Volume Tier Band: <strong>{quoteResult.appliedVolumeBand}</strong></div>
                  <div>6. Active Add-ons: <strong>₹{quoteResult.addonsMonthlyTotal.toLocaleString('en-IN')}/mo</strong></div>
                  <div>7. Estimated Usage Meters: <strong>₹{quoteResult.usageMonthlyTotal.toLocaleString('en-IN')}/mo</strong></div>
                  <div>8. Cycle Discount: <strong>{quoteResult.cycleDiscountPercent}% (-₹{quoteResult.cycleDiscountAmount.toLocaleString('en-IN')})</strong></div>
                  <div>9. Statutory GST (18%): <strong>+₹{quoteResult.gstAmount.toLocaleString('en-IN')}</strong></div>
                  <div className="col-span-2 text-slate-900 font-bold border-t border-slate-200 pt-1">
                    10. Final Contract Value: ₹{quoteResult.grandTotal.toLocaleString('en-IN')} ({quoteResult.cycleMultiplier} mos @ ₹{quoteResult.monthlyEquivalent.toLocaleString('en-IN')}/mo)
                  </div>
                </div>

                <div className="space-y-1">
                  {quoteResult.calculationSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold shrink-0">›</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
