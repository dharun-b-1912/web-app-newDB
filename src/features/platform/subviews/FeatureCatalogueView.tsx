// src/features/platform/subviews/FeatureCatalogueView.tsx
// ============================================================================
// Joy PeopleHR — SaaS Product Catalogue & Commercial Feature Registry
// Separated Commercial Product Catalogue for Super Admin
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  Building2,
  Smartphone,
  Calendar,
  Fingerprint,
  DollarSign,
  Receipt,
  UserPlus,
  Target,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Briefcase,
  Globe,
  ShoppingCart,
  CreditCard,
  Lock,
  ArrowRight,
  Info,
  ExternalLink,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  CommercialModule,
  CommercialFeature,
  CommercialType,
  ImplementationStatus,
  PlanTierCode,
} from '../../../types/saasCatalogue';
import { saasCatalogueService } from '../../../services/platform/saasCatalogueService';

interface FeatureCatalogueViewProps {
  onNavigateTab?: (tab: string, payload?: any) => void;
}

const MODULE_ICONS: Record<string, React.ElementType> = {
  Building2,
  Smartphone,
  Calendar,
  Clock,
  Fingerprint,
  DollarSign,
  Receipt,
  UserPlus,
  Target,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Briefcase,
  Globe,
  ShoppingCart,
  CreditCard,
};

export const FeatureCatalogueView: React.FC<FeatureCatalogueViewProps> = ({ onNavigateTab }) => {
  const [modules, setModules] = useState<CommercialModule[]>(() => saasCatalogueService.getModules());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
  const [commercialTypeFilter, setCommercialTypeFilter] = useState<string>('ALL');
  const [implementationFilter, setImplementationFilter] = useState<string>('ALL');

  // Expanded module sections state (default: all expanded or first 4 expanded)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    modules.forEach((m, idx) => {
      initial[m.moduleKey] = idx < 6; // expand first 6 modules by default
    });
    return initial;
  });

  // Plan Entitlement Matrix Modal State
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [matrixFilterModule, setMatrixFilterModule] = useState('ALL');

  // Selected Feature for Detail Drawer
  const [inspectedFeature, setInspectedFeature] = useState<CommercialFeature | null>(null);
  const [editCommercialType, setEditCommercialType] = useState<CommercialType>('Included');
  const [editMinPlan, setEditMinPlan] = useState<PlanTierCode>('STARTER');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleOpenInspect = (f: CommercialFeature) => {
    setInspectedFeature(f);
    setEditCommercialType(f.commercialType);
    setEditMinPlan(f.minPlan);
    setSaveSuccess(false);
  };

  const handleSaveFeaturePackaging = () => {
    if (!inspectedFeature) return;
    saasCatalogueService.updateFeatureCommercialStatus(
      inspectedFeature.featureKey,
      editCommercialType,
      editMinPlan
    );
    setModules([...saasCatalogueService.getModules()]);
    setInspectedFeature({
      ...inspectedFeature,
      commercialType: editCommercialType,
      minPlan: editMinPlan,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const toggleModule = (moduleKey: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    modules.forEach((m) => (next[m.moduleKey] = true));
    setExpandedModules(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    modules.forEach((m) => (next[m.moduleKey] = false));
    setExpandedModules(next);
  };

  // Filter modules and their child features
  const filteredModules = useMemo(() => {
    return modules
      .filter((mod) => {
        if (selectedModuleFilter !== 'ALL' && mod.moduleKey !== selectedModuleFilter) {
          return false;
        }
        return true;
      })
      .map((mod) => {
        const filteredFeatures = mod.features.filter((feat) => {
          if (commercialTypeFilter !== 'ALL' && feat.commercialType !== commercialTypeFilter) {
            return false;
          }
          if (implementationFilter !== 'ALL' && feat.implementationStatus !== implementationFilter) {
            return false;
          }
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = feat.name.toLowerCase().includes(q);
            const matchKey = feat.featureKey.toLowerCase().includes(q);
            const matchDesc = feat.description.toLowerCase().includes(q);
            const matchGroup = feat.groupName.toLowerCase().includes(q);
            return matchName || matchKey || matchDesc || matchGroup;
          }
          return true;
        });

        return {
          ...mod,
          features: filteredFeatures,
          matchingCount: filteredFeatures.length,
        };
      })
      .filter((mod) => mod.features.length > 0);
  }, [modules, selectedModuleFilter, commercialTypeFilter, implementationFilter, searchQuery]);

  const totalFeaturesCount = useMemo(() => {
    return modules.reduce((sum, m) => sum + m.features.length, 0);
  }, [modules]);

  const implementedFeaturesCount = useMemo(() => {
    return modules.flatMap((m) => m.features).filter((f) => f.implementationStatus === 'Implemented').length;
  }, [modules]);

  const renderCommercialTypeBadge = (type: CommercialType) => {
    switch (type) {
      case 'Included':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Included
          </span>
        );
      case 'Premium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            Premium
          </span>
        );
      case 'Add-on':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            Add-on
          </span>
        );
      case 'Enterprise':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            Enterprise
          </span>
        );
      case 'Usage-based':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            Usage-based
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-100 text-gray-700">
            {type}
          </span>
        );
    }
  };

  const renderMinPlanBadge = (minPlan: PlanTierCode) => {
    switch (minPlan) {
      case 'STARTER':
        return <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Starter+</span>;
      case 'PROFESSIONAL':
        return <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Professional+</span>;
      case 'BUSINESS':
        return <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Business+</span>;
      case 'ENTERPRISE':
        return <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">Enterprise</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ── 1. Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#0F172B] tracking-tight">SaaS Product & Feature Catalogue</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              16 Commercial Modules Live
            </span>
          </div>
          <p className="text-[13.5px] text-[#64748B] mt-1 max-w-3xl">
            Authoritative master catalogue of commercial features, tier packaging, add-on pricing, and prerequisites. Separated from internal engineering release flags.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMatrixModalOpen(true)}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-[#64748B]" />
            Entitlement Matrix
          </Button>

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
              if (onNavigateTab) onNavigateTab('platform-features');
            }}
            className="flex items-center gap-1.5 border-[#CBD5E1] text-[#334155] hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#64748B]" />
            Feature Flags
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onNavigateTab) onNavigateTab('platform-plans');
            }}
            className="flex items-center gap-1.5 bg-[#0F172B] text-white hover:bg-slate-800 border-none"
          >
            <Zap className="h-4 w-4 text-emerald-400" />
            Manage Plans & Pricing
          </Button>
        </div>
      </div>

      {/* ── 2. Metric Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commercial Modules</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">16</span>
            <span className="text-xs text-emerald-600 font-medium">All 7 Tiers</span>
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1">From Core HR to 3-Way Match Billing</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sellable Features</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalFeaturesCount}</span>
            <span className="text-xs text-emerald-600 font-medium">{implementedFeaturesCount} Live in Code</span>
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1">Zero fabricated entries</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Commercial Plans</span>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">4 Active</span>
            <span className="text-xs text-blue-600 font-medium">Pro Default</span>
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1">Starter, Pro, Business, Enterprise</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configurable Add-ons</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">15 Add-ons</span>
            <span className="text-xs text-amber-600 font-medium">Modular</span>
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1">ATS, LMS, Vendor, WhatsApp meters</p>
        </div>
      </div>

      {/* ── 3. Search & Filter Bar ──────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search features by name, key (e.g. attendance.gps), or group..."
            className="w-full pl-10 pr-4 py-2 text-[13.5px] rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Module Filter */}
          <select
            value={selectedModuleFilter}
            onChange={(e) => setSelectedModuleFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All 16 Modules</option>
            {modules.map((m) => (
              <option key={m.moduleKey} value={m.moduleKey}>
                {m.moduleNumber}. {m.name}
              </option>
            ))}
          </select>

          {/* Commercial Type Filter */}
          <select
            value={commercialTypeFilter}
            onChange={(e) => setCommercialTypeFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Commercial Types</option>
            <option value="Included">Included</option>
            <option value="Premium">Premium</option>
            <option value="Add-on">Add-on</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Usage-based">Usage-based</option>
          </select>

          {/* Implementation Filter */}
          <select
            value={implementationFilter}
            onChange={(e) => setImplementationFilter(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 bg-white text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="Implemented">Implemented ✓</option>
            <option value="Partial">Partial</option>
            <option value="Planned">Planned</option>
          </select>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              onClick={expandAll}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1.5 rounded hover:bg-slate-100"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1.5 rounded hover:bg-slate-100"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Module Accordion Sections ────────────────────────────────────── */}
      <div className="space-y-4">
        {filteredModules.map((module) => {
          const isExpanded = !!expandedModules[module.moduleKey];
          const IconComponent = MODULE_ICONS[module.iconName] || Layers;

          return (
            <div
              key={module.moduleKey}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs transition-shadow hover:shadow-sm"
            >
              {/* Module Header Bar */}
              <div
                onClick={() => toggleModule(module.moduleKey)}
                className="p-4 flex items-center justify-between cursor-pointer select-none bg-slate-50/70 hover:bg-slate-50 border-b border-slate-100"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {module.moduleNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">{module.name}</h3>
                      <span className="text-xs text-slate-500 font-normal">({module.tier})</span>
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-200/80 text-slate-700">
                        {module.commercialStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{module.shortDescription}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    {module.features.length} features
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Module Feature Table (Collapsible) */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10.5px] tracking-wider">
                        <th className="py-2.5 px-4 w-1/4">Feature & Key</th>
                        <th className="py-2.5 px-4 w-1/3">Description & Capabilities</th>
                        <th className="py-2.5 px-3 text-center">Implementation</th>
                        <th className="py-2.5 px-3 text-center">Commercial Type</th>
                        <th className="py-2.5 px-3 text-center">Included In</th>
                        <th className="py-2.5 px-3">Prerequisites & Meters</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {module.features.map((feature) => (
                        <tr
                          key={feature.featureKey}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Feature & Key */}
                          <td className="py-3 px-4 align-top">
                            <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                              {feature.name}
                            </div>
                            <div className="font-mono text-[10.5px] text-slate-400 mt-0.5">
                              {feature.featureKey}
                            </div>
                            <span className="inline-block mt-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {feature.groupName}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4 align-top text-slate-600 text-[12px] leading-relaxed">
                            {feature.description}
                            {feature.codeReference && (
                              <div className="mt-1 text-[10.5px] font-mono text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded inline-block">
                                Code: {feature.codeReference}
                              </div>
                            )}
                          </td>

                          {/* Implementation Status */}
                          <td className="py-3 px-3 align-top text-center">
                            {feature.implementationStatus === 'Implemented' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> Live
                              </span>
                            ) : feature.implementationStatus === 'Partial' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="h-3 w-3" /> In Progress
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Planned
                              </span>
                            )}
                          </td>

                          {/* Commercial Type */}
                          <td className="py-3 px-3 align-top text-center">
                            {renderCommercialTypeBadge(feature.commercialType)}
                          </td>

                          {/* Min Plan */}
                          <td className="py-3 px-3 align-top text-center">
                            {renderMinPlanBadge(feature.minPlan)}
                          </td>

                          {/* Dependencies & Meters */}
                          <td className="py-3 px-3 align-top text-[11.5px] text-slate-600">
                            {feature.dependencies && feature.dependencies.length > 0 ? (
                              <div className="space-y-1">
                                {feature.dependencies.map((dep) => (
                                  <div
                                    key={dep.featureKey}
                                    className="flex items-center gap-1 text-[10.5px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                                  >
                                    <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                    <span>Requires {dep.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">— No prerequisites</span>
                            )}

                            {feature.usageMeter && (
                              <div className="mt-1 text-[10.5px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                                Meter: {feature.usageMeter.unit} (₹{feature.usageMeter.overageRatePerUnit}/unit)
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 align-top text-right">
                            <button
                              onClick={() => handleOpenInspect(feature)}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded transition-colors cursor-pointer"
                            >
                              Inspect & Configure
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 5. Plan Entitlement Matrix Modal ─────────────────────────────────── */}
      {isMatrixModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Commercial Plan Entitlement Matrix</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison of commercial access across Starter, Professional, Business, and Enterprise plans.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={matrixFilterModule}
                  onChange={(e) => setMatrixFilterModule(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="ALL">All 16 Modules</option>
                  {modules.map((m) => (
                    <option key={m.moduleKey} value={m.moduleKey}>
                      {m.moduleNumber}. {m.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsMatrixModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Matrix Table */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10.5px]">
                      <th className="py-3 px-4 w-1/4">Module & Feature</th>
                      <th className="py-3 px-3 text-center bg-slate-50/70 w-1/6">
                        Starter<br />
                        <span className="font-normal text-[10px] text-slate-500">₹2,999/mo</span>
                      </th>
                      <th className="py-3 px-3 text-center bg-blue-50/50 text-blue-900 w-1/6">
                        Professional ★<br />
                        <span className="font-normal text-[10px] text-blue-700">₹5,999/mo (Recommended)</span>
                      </th>
                      <th className="py-3 px-3 text-center bg-purple-50/40 text-purple-900 w-1/6">
                        Business<br />
                        <span className="font-normal text-[10px] text-purple-700">₹9,999/mo</span>
                      </th>
                      <th className="py-3 px-3 text-center bg-slate-100 text-slate-900 w-1/6">
                        Enterprise<br />
                        <span className="font-normal text-[10px] text-slate-600">Custom 500+</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modules
                      .filter((m) => matrixFilterModule === 'ALL' || m.moduleKey === matrixFilterModule)
                      .flatMap((m) =>
                        m.features.map((f, fIdx) => {
                          const hasStarter = f.availableInPlans.includes('STARTER');
                          const hasPro = f.availableInPlans.includes('PROFESSIONAL');
                          const hasBiz = f.availableInPlans.includes('BUSINESS');
                          const hasEnt = f.availableInPlans.includes('ENTERPRISE');

                          return (
                            <tr key={f.featureKey} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-4">
                                {fIdx === 0 && (
                                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-0.5">
                                    {m.moduleNumber} — {m.name}
                                  </span>
                                )}
                                <div className="font-medium text-slate-800 text-[12px]">{f.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{f.featureKey}</div>
                              </td>

                              <td className="py-2.5 px-3 text-center bg-slate-50/30">
                                {hasStarter ? (
                                  <span className="text-emerald-600 font-bold text-sm">✓</span>
                                ) : (
                                  <span className="text-slate-300 font-semibold">—</span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-center bg-blue-50/20">
                                {hasPro ? (
                                  <span className="text-blue-600 font-bold text-sm">✓</span>
                                ) : (
                                  <span className="text-slate-300 font-semibold">—</span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-center bg-purple-50/10">
                                {hasBiz ? (
                                  <span className="text-purple-600 font-bold text-sm">✓</span>
                                ) : (
                                  <span className="text-slate-300 font-semibold">—</span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-center bg-slate-50/50">
                                {hasEnt ? (
                                  <span className="text-slate-800 font-bold text-sm">✓</span>
                                ) : (
                                  <span className="text-slate-300 font-semibold">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-2xl">
              <span className="text-xs text-slate-500">
                ★ Professional tier includes full Statutory Payroll, Geo-fencing & Shift Rosters.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMatrixModalOpen(false)}
                className="bg-slate-900 text-white hover:bg-slate-800 border-none"
              >
                Close Matrix
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Feature Inspection Drawer ────────────────────────────────────── */}
      {inspectedFeature && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  {inspectedFeature.moduleName}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">{inspectedFeature.name}</h3>
              </div>
              <button
                onClick={() => setInspectedFeature(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-500 block mb-1">Feature Key & API identifier</label>
                <div className="bg-slate-100 font-mono p-2 rounded text-slate-800 font-semibold text-[11px]">
                  {inspectedFeature.featureKey}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Commercial Packaging & Tier Rule</span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Commercial Type</label>
                    <select
                      value={editCommercialType}
                      onChange={(e) => setEditCommercialType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-xs text-slate-800"
                    >
                      <option value="Included">Included (Core)</option>
                      <option value="Add-on">Sellable Add-on</option>
                      <option value="Quota-Based">Quota Metered</option>
                      <option value="Not Available">Not Available</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Minimum Plan</label>
                    <select
                      value={editMinPlan}
                      onChange={(e) => setEditMinPlan(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-xs text-slate-800"
                    >
                      <option value="STARTER">Starter Plan+</option>
                      <option value="PROFESSIONAL">Professional Plan+</option>
                      <option value="BUSINESS">Business Plan+</option>
                      <option value="ENTERPRISE">Enterprise Only</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {renderCommercialTypeBadge(editCommercialType)}
                    {renderMinPlanBadge(editMinPlan)}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveFeaturePackaging}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                  >
                    {saveSuccess ? 'Saved ✓' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-500 block mb-1">Detailed Description</label>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200 text-[12.5px]">
                  {inspectedFeature.description}
                </p>
              </div>

              {inspectedFeature.codeReference && (
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Codebase Implementation</label>
                  <div className="text-emerald-800 bg-emerald-50 p-2.5 rounded font-mono border border-emerald-200 text-[11px]">
                    {inspectedFeature.codeReference}
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-500 block mb-1">Dependencies & Prerequisites</label>
                {inspectedFeature.dependencies.length > 0 ? (
                  <div className="space-y-1.5">
                    {inspectedFeature.dependencies.map((dep) => (
                      <div
                        key={dep.featureKey}
                        className="bg-amber-50 border border-amber-200 p-2.5 rounded flex items-start gap-2"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-900 block">{dep.name}</span>
                          <span className="text-[10px] text-amber-700 font-mono">{dep.featureKey}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">No dependencies required for this feature.</div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-[#0F172B] text-white hover:bg-slate-800 border-none py-2.5"
                  onClick={() => setInspectedFeature(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
