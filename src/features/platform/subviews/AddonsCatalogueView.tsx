// src/features/platform/subviews/AddonsCatalogueView.tsx
// ============================================================================
// Joy PeopleHR — SaaS Add-ons & Modular Capabilities Management Console
// Full lifecycle governance: Product, Communication, Integrations, Infrastructure, Support & Services
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Edit2,
  Check,
  Building2,
  DollarSign,
  Layers,
  CheckCircle2,
  Zap,
  Globe,
  ShoppingCart,
  CreditCard,
  Lock,
  MessageSquare,
  HardDrive,
  Fingerprint,
  UserPlus,
  Target,
  GraduationCap,
  BarChart3,
  Briefcase,
  ShieldCheck,
  Download,
  Upload,
  ArrowRight,
  Filter,
  Eye,
  X,
  FileText,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { CommercialAddon, PlanTierCode } from '../../../types/saasCatalogue';
import { saasCatalogueService } from '../../../services/platform/saasCatalogueService';

interface AddonsCatalogueViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

type AddonTab = 'overview' | 'catalogue' | 'usage-based' | 'plan-availability' | 'archived';

interface ExtendedAddon extends CommercialAddon {
  code?: string;
  customersUsing?: number;
  billingModel?: string;
  unit?: string;
  pricingModel?: 'FIXED' | 'PER_EMPLOYEE' | 'METERED';
  annualPrice?: number;
  includedQuantity?: number;
  overagePrice?: number;
  taxCategory?: string;
  effectiveDate?: string;
  dependencies?: string[];
  status?: 'Active' | 'Draft' | 'Archived';
}

const CATEGORY_TABS = [
  'All Categories',
  'Product Add-ons',
  'Communication',
  'Integrations',
  'Infrastructure',
  'Support',
  'Services',
];

const BILLING_MODELS = [
  'Flat monthly',
  'Per employee (PEPM)',
  'Per user',
  'Per device',
  'Per company',
  'Per GB',
  'Per API call',
  'Per message',
  'Per transaction',
  'One-time',
  'Custom',
];

export const AddonsCatalogueView: React.FC<AddonsCatalogueViewProps> = ({ onNavigateTab }) => {
  const [activeTab, setActiveTab] = useState<AddonTab>('catalogue');
  const [addons, setAddons] = useState<ExtendedAddon[]>(() => {
    const raw = saasCatalogueService.getAddons();
    return raw.map((a, idx) => {
      const isPerEmployee = a.pricingModel === 'PER_EMPLOYEE' || a.billingUnit?.toLowerCase().includes('employee');
      const isMetered = a.pricingModel === 'METERED' || a.billingUnit?.toLowerCase().includes('message') || a.billingUnit?.toLowerCase().includes('meter');
      const model: 'FIXED' | 'PER_EMPLOYEE' | 'METERED' = isPerEmployee ? 'PER_EMPLOYEE' : isMetered ? 'METERED' : 'FIXED';
      return {
        ...a,
        pricingModel: model,
        code: a.addonKey.toUpperCase(),
        customersUsing: [42, 28, 19, 36, 12, 54, 8, 23, 14, 31, 9, 17][idx % 12] || 15,
        billingModel: isPerEmployee ? 'Per employee (PEPM)' : isMetered ? 'Per message' : 'Flat monthly',
        unit: isPerEmployee ? 'per employee/mo' : isMetered ? 'per pack' : 'fixed/mo',
        annualPrice: Math.round(a.monthlyPrice * 12 * 0.9), // 10% annual savings
        includedQuantity: isMetered ? 1000 : (a.includedQuantity || 0),
        overagePrice: isMetered ? 0.25 : (a.additionalUsageRate || 0),
        taxCategory: 'SAC 998313 (IT SaaS Services - 18% GST)',
        effectiveDate: '2026-01-01',
        dependencies: a.category === 'Module Add-on' ? ['Core HR'] : [],
        status: 'Active',
      };
    });
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ExtendedAddon | null>(null);
  const [newAddonForm, setNewAddonForm] = useState<Partial<ExtendedAddon>>({
    name: '',
    addonKey: '',
    category: 'Product Add-ons',
    description: '',
    monthlyPrice: 1999,
    annualPrice: 21589,
    billingModel: 'Flat monthly',
    unit: 'per month',
    availableForPlans: ['PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'],
    status: 'Active',
    taxCategory: 'SAC 998313 (IT SaaS - 18% GST)',
  });

  // Top Metrics
  const metrics = useMemo(() => {
    const active = addons.filter((a) => a.status === 'Active');
    const totalCustomers = active.reduce((acc, a) => acc + (a.customersUsing || 0), 0);
    const mrr = active.reduce((acc, a) => acc + a.monthlyPrice * (a.customersUsing ? Math.min(a.customersUsing, 10) : 1), 0);
    const arr = mrr * 12;
    const usageRevenue = active
      .filter((a) => a.pricingModel === 'METERED' || a.billingModel?.includes('Per'))
      .reduce((acc, a) => acc + a.monthlyPrice * 5, 0);

    return {
      activeCount: active.length,
      customersUsingCount: totalCustomers,
      mrr,
      arr,
      usageRevenue,
    };
  }, [addons]);

  // Filtered List
  const filteredAddons = useMemo(() => {
    return addons.filter((a) => {
      // Tab filter
      if (activeTab === 'usage-based' && a.pricingModel !== 'METERED' && !a.billingModel?.includes('Per message') && !a.billingModel?.includes('Per API')) {
        return false;
      }
      if (activeTab === 'archived' && a.status !== 'Archived') {
        return false;
      }
      if (activeTab !== 'archived' && a.status === 'Archived') {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'All Categories') {
        const matchesCategory =
          (categoryFilter === 'Product Add-ons' && (a.category === 'Module Add-on' || a.category === 'Product Add-ons')) ||
          (categoryFilter === 'Communication' && (a.category === 'Communication Meter' || a.category === 'Communication')) ||
          (categoryFilter === 'Integrations' && (a.category === 'Infrastructure & API' || a.category === 'Integrations')) ||
          (categoryFilter === 'Infrastructure' && (a.category === 'Infrastructure & API' || a.category === 'Infrastructure')) ||
          (categoryFilter === 'Support' && (a.category === 'Enterprise Support' || a.category === 'Support')) ||
          (categoryFilter === 'Services' && a.category === 'Services');
        if (!matchesCategory) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.addonKey.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [addons, activeTab, categoryFilter, searchQuery]);

  const handleSaveAddon = () => {
    if (!newAddonForm.name || !newAddonForm.addonKey) return;
    const key = newAddonForm.addonKey.toLowerCase().replace(/\s+/g, '_');
    const addonToSave: ExtendedAddon = {
      id: editingAddon?.id || `addon_${key}`,
      isActive: true,
      iconName: editingAddon?.iconName || 'Sparkles',
      addonKey: key,
      name: newAddonForm.name,
      description: newAddonForm.description || '',
      category: (newAddonForm.category as any) || 'Product Add-ons',
      monthlyPrice: Number(newAddonForm.monthlyPrice) || 0,
      annualPrice: Number(newAddonForm.annualPrice) || Math.round((Number(newAddonForm.monthlyPrice) || 0) * 12 * 0.9),
      pricingModel: newAddonForm.billingModel?.includes('employee') ? 'PER_EMPLOYEE' : newAddonForm.billingModel?.includes('message') ? 'METERED' : 'FIXED',
      availableForPlans: (newAddonForm.availableForPlans as PlanTierCode[]) || ['PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'],
      customersUsing: editingAddon?.customersUsing || 0,
      billingModel: newAddonForm.billingModel || 'Flat monthly',
      billingUnit: newAddonForm.billingModel || 'Per Month',
      unit: newAddonForm.unit || 'per month',
      status: 'Active',
      taxCategory: 'SAC 998313 (IT SaaS - 18% GST)',
      effectiveDate: '2026-10-01',
    };

    if (editingAddon) {
      setAddons((prev) => prev.map((a) => (a.addonKey === editingAddon.addonKey ? { ...a, ...addonToSave } : a)));
      saasCatalogueService.updateAddonPrice(editingAddon.addonKey, addonToSave.monthlyPrice);
    } else {
      setAddons((prev) => [addonToSave, ...prev]);
    }

    setIsCreateModalOpen(false);
    setEditingAddon(null);
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ── 1. Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">Add-ons</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {metrics.activeCount} Add-ons Live
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Extend plans with optional capabilities, usage-based services, infrastructure and premium support.
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
            <DollarSign className="h-4 w-4 text-[#64748B]" />
            Pricing Calculator
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(addons, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute('download', 'joy-peoplehr-addons-catalogue.json');
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <Download className="h-4 w-4 text-[#64748B]" />
            Export
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingAddon(null);
              setNewAddonForm({
                name: '',
                addonKey: '',
                category: 'Product Add-ons',
                description: '',
                monthlyPrice: 1999,
                annualPrice: 21589,
                billingModel: 'Flat monthly',
                unit: 'per month',
                availableForPlans: ['PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'],
                status: 'Active',
                taxCategory: 'SAC 998313 (IT SaaS - 18% GST)',
              });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#036246] text-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            + Create Add-on
          </Button>
        </div>
      </div>

      {/* ── 2. Top Executive Metrics Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Add-ons</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.activeCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Across 6 Categories</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customers Using</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{metrics.customersUsingCount}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-0.5">Attached to Subscriptions</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Add-on MRR</div>
          <div className="text-2xl font-black text-slate-900 mt-1">₹{(metrics.mrr / 1000).toFixed(1)}k</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">+18.4% MoM Expansion</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Add-on ARR</div>
          <div className="text-2xl font-black text-slate-900 mt-1">₹{(metrics.arr / 100000).toFixed(2)}L</div>
          <div className="text-[11px] text-purple-600 font-medium mt-0.5">Contracted Run-rate</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Usage-based Revenue</div>
          <div className="text-2xl font-black text-slate-900 mt-1">₹{(metrics.usageRevenue / 1000).toFixed(1)}k</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">WhatsApp & Storage Meters</div>
        </div>
      </div>

      {/* ── 3. Tabs Navigation ────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 flex items-center gap-2">
        {[
          { id: 'catalogue', label: 'Catalogue', count: addons.filter((a) => a.status !== 'Archived').length },
          { id: 'usage-based', label: 'Usage-Based', count: addons.filter((a) => a.pricingModel === 'METERED' || a.billingModel?.includes('Per message')).length },
          { id: 'plan-availability', label: 'Plan Availability', count: null },
          { id: 'overview', label: 'Overview & Stats', count: null },
          { id: 'archived', label: 'Archived', count: addons.filter((a) => a.status === 'Archived').length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AddonTab)}
              className={`pb-3 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 cursor-pointer ${
                isActive ? 'text-[#047857]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              )}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#047857] rounded-t-full" />}
            </button>
          );
        })}
      </div>

      {/* ── 4. Category Filter & Search Bar ───────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search add-on by name, code, description..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {CATEGORY_TABS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#0F172B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── 5. Main Content Area ──────────────────────────────────────────────── */}
      {filteredAddons.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No add-ons configured yet.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No add-on records match your filter criteria or search query. Create a new modular add-on to expand platform revenue.
          </p>
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Add-on
          </Button>
        </div>
      ) : activeTab === 'plan-availability' ? (
        /* Plan Availability Matrix */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Add-on Capability</th>
                <th className="py-3 px-4">Billing Model</th>
                <th className="py-3 px-4 text-center">Starter</th>
                <th className="py-3 px-4 text-center bg-emerald-50/50 text-emerald-900">Professional (Rec.)</th>
                <th className="py-3 px-4 text-center">Business</th>
                <th className="py-3 px-4 text-center">Enterprise</th>
                <th className="py-3 px-4 text-right">Monthly Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAddons.map((addon) => (
                <tr key={addon.addonKey} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{addon.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{addon.billingModel}</td>
                  <td className="py-3 px-4 text-center">
                    {addon.availableForPlans.includes('STARTER') ? (
                      <span className="text-emerald-600 font-bold">✓ Available</span>
                    ) : (
                      <span className="text-slate-300 font-mono">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center bg-emerald-50/20">
                    {addon.availableForPlans.includes('PROFESSIONAL') ? (
                      <span className="text-emerald-700 font-bold">✓ Available</span>
                    ) : (
                      <span className="text-slate-300 font-mono">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {addon.availableForPlans.includes('BUSINESS') ? (
                      <span className="text-purple-700 font-bold">✓ Available</span>
                    ) : (
                      <span className="text-slate-300 font-mono">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {addon.availableForPlans.includes('ENTERPRISE') ? (
                      <span className="text-blue-700 font-bold">✓ Available</span>
                    ) : (
                      <span className="text-slate-300 font-mono">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    ₹{addon.monthlyPrice.toLocaleString('en-IN')}/mo
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Catalogue Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAddons.map((addon) => (
            <div
              key={addon.addonKey}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{addon.name}</h3>
                      <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                        {addon.code || addon.addonKey}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {addon.category}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-3 leading-relaxed min-h-[36px]">
                  {addon.description}
                </p>

                {/* Plan Tags */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {addon.availableForPlans.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200"
                    >
                      {p === 'PROFESSIONAL' ? 'Pro+' : p}
                    </span>
                  ))}
                  <span className="ml-auto text-[11px] text-slate-400 font-medium">
                    {addon.customersUsing || 0} tenants active
                  </span>
                </div>
              </div>

              {/* Bottom Price & Controls */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-base font-black text-slate-900">
                    ₹{addon.monthlyPrice.toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-slate-400">/{addon.unit || 'mo'}</span>
                  </div>
                  <div className="text-[10.5px] text-emerald-600 font-medium">
                    Annual: ₹{(addon.annualPrice || addon.monthlyPrice * 12).toLocaleString('en-IN')}/yr (-10%)
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingAddon(addon);
                      setNewAddonForm({
                        name: addon.name,
                        addonKey: addon.addonKey,
                        category: addon.category,
                        description: addon.description,
                        monthlyPrice: addon.monthlyPrice,
                        annualPrice: addon.annualPrice,
                        billingModel: addon.billingModel,
                        unit: addon.unit,
                        availableForPlans: addon.availableForPlans,
                        status: addon.status,
                      });
                      setIsCreateModalOpen(true);
                    }}
                    className="p-1.5 h-8 w-8 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-600"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 6. Create / Edit Add-on Modal ────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>{editingAddon ? 'Edit Add-on Configuration' : 'Create New Commercial Add-on'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Add-on Name *</label>
                <input
                  type="text"
                  value={newAddonForm.name || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewAddonForm((prev) => ({
                      ...prev,
                      name,
                      addonKey: prev.addonKey || name.toLowerCase().replace(/\s+/g, '_'),
                    }));
                  }}
                  placeholder="e.g. Dedicated Success Manager"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Add-on Code / Key *</label>
                  <input
                    type="text"
                    disabled={!!editingAddon}
                    value={newAddonForm.addonKey || ''}
                    onChange={(e) => setNewAddonForm({ ...newAddonForm, addonKey: e.target.value })}
                    placeholder="e.g. dedicated_success_mgr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:border-emerald-600 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newAddonForm.category || 'Product Add-ons'}
                    onChange={(e) => setNewAddonForm({ ...newAddonForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Product Add-ons">Product Add-ons</option>
                    <option value="Communication">Communication</option>
                    <option value="Integrations">Integrations</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Support">Support</option>
                    <option value="Services">Services</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newAddonForm.description || ''}
                  onChange={(e) => setNewAddonForm({ ...newAddonForm, description: e.target.value })}
                  placeholder="Commercial value proposition and deliverables..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Billing Model *</label>
                  <select
                    value={newAddonForm.billingModel || 'Flat monthly'}
                    onChange={(e) => setNewAddonForm({ ...newAddonForm, billingModel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  >
                    {BILLING_MODELS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Monthly Price (₹ Pre-tax) *</label>
                  <input
                    type="number"
                    value={newAddonForm.monthlyPrice || 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewAddonForm({
                        ...newAddonForm,
                        monthlyPrice: val,
                        annualPrice: Math.round(val * 12 * 0.9),
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Available For Plans</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['STARTER', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE'] as PlanTierCode[]).map((plan) => {
                    const isChecked = newAddonForm.availableForPlans?.includes(plan);
                    return (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => {
                          const current = newAddonForm.availableForPlans || [];
                          const updated = isChecked ? current.filter((p) => p !== plan) : [...current, plan];
                          setNewAddonForm({ ...newAddonForm, availableForPlans: updated });
                        }}
                        className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20'
                            : 'bg-white text-slate-500 border-slate-200'
                        }`}
                      >
                        {plan === 'PROFESSIONAL' ? 'Professional' : plan}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-600"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAddon}
                className="bg-[#047857] hover:bg-[#036246] text-white font-bold"
              >
                {editingAddon ? 'Save Changes' : 'Create Add-on'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
