// src/features/platform/components/tenants/CustomerFeaturesTab.tsx
// ============================================================================
// Joy PeopleHR — Tenant Capabilities & Feature Lock / Unlock Management Console
// Provides Platform Super Admins granular per-tenant feature access controls
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sliders,
  Zap,
  Layers,
  MapPin,
  Camera,
  CreditCard,
  MessageSquare,
  Bot,
  FileText,
  Briefcase,
  GraduationCap,
  Cpu,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import {
  platformTenantEntitlementService,
  TenantFeatureCapability,
} from '../../../../services/platform/platformTenantEntitlementService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import { cn } from '../../../../lib/utils';

export interface CustomerFeaturesTabProps {
  organization: OrganizationRecord;
}

export const CustomerFeaturesTab: React.FC<CustomerFeaturesTabProps> = ({ organization: org }) => {
  const { showToast } = useToast();
  const [features, setFeatures] = useState<TenantFeatureCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const data = await platformTenantEntitlementService.getTenantFeatures(org.id, org.plan);
      setFeatures(data);
    } catch (err: any) {
      showToast('Could not load tenant capabilities: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, [org.id, org.plan]);

  const handleToggleFeature = async (feature: TenantFeatureCapability) => {
    const nextState = !feature.isEnabled;
    setUpdatingKey(feature.key);
    try {
      const ok = await platformTenantEntitlementService.setFeatureState(
        org.id,
        feature.key,
        nextState,
        org.plan
      );
      if (ok) {
        setFeatures((prev) =>
          prev.map((f) => (f.key === feature.key ? { ...f, isEnabled: nextState } : f))
        );
        showToast(
          `${nextState ? 'Unlocked' : 'Locked'} "${feature.name}" for ${org.legal_name}.`,
          nextState ? 'success' : 'info'
        );
      } else {
        showToast('Failed to update capability state in database.', 'error');
      }
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleUnlockAll = async () => {
    setLoading(true);
    try {
      const ok = await platformTenantEntitlementService.bulkUnlockAll(org.id, org.plan);
      if (ok) {
        await loadFeatures();
        showToast(`All Enterprise capabilities have been unlocked for ${org.legal_name}.`, 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetToPlanDefaults = async () => {
    setLoading(true);
    try {
      const ok = await platformTenantEntitlementService.resetToPlanDefaults(org.id, org.plan);
      if (ok) {
        await loadFeatures();
        showToast(`Capabilities reset to ${org.plan} Plan baseline defaults.`, 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const totalCount = features.length;
  const unlockedCount = features.filter((f) => f.isEnabled).length;
  const lockedCount = totalCount - unlockedCount;

  // Filtered List
  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      const matchesSearch =
        !search.trim() ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase()) ||
        f.key.toLowerCase().includes(search.toLowerCase());

      const matchesCat = selectedCategory === 'ALL' || f.category === selectedCategory;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'UNLOCKED' && f.isEnabled) ||
        (statusFilter === 'LOCKED' && !f.isEnabled);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [features, search, selectedCategory, statusFilter]);

  const getFeatureIcon = (key: string) => {
    switch (key) {
      case 'face_attend':
        return <Camera className="w-5 h-5 text-emerald-600" />;
      case 'geofencing':
        return <MapPin className="w-5 h-5 text-blue-600" />;
      case 'adaptive_shifts':
        return <Sliders className="w-5 h-5 text-indigo-600" />;
      case 'biometric_hardware':
        return <Cpu className="w-5 h-5 text-purple-600" />;
      case 'payroll_engine':
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'garment_workforce':
        return <Briefcase className="w-5 h-5 text-amber-600" />;
      case 'vendor_governance':
        return <Layers className="w-5 h-5 text-teal-600" />;
      case 'id_card_press':
        return <FileText className="w-5 h-5 text-cyan-600" />;
      case 'asset_management':
        return <Layers className="w-5 h-5 text-orange-600" />;
      case 'lms_learning':
        return <GraduationCap className="w-5 h-5 text-violet-600" />;
      case 'whatsapp_bot':
        return <MessageSquare className="w-5 h-5 text-emerald-600" />;
      case 'ai_copilot':
        return <Bot className="w-5 h-5 text-fuchsia-600" />;
      case 'audit_sentinel':
        return <ShieldCheck className="w-5 h-5 text-emerald-700" />;
      default:
        return <Zap className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------
          1. HEADER & CAPABILITY SUMMARY TILES
         ---------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Multi-Tenant Entitlements Engine
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Live DB Sync Active
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-0.5">
              Product Capabilities & Feature Lock / Unlock Console
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Control granular access to HR, Biometric, Payroll, and AI modules for{' '}
              <strong className="text-gray-800">{org.legal_name}</strong>. Locked features are instantly gated in the customer tenant interface.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToPlanDefaults}
              disabled={loading}
              className="text-xs font-semibold text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-gray-500" />
              Reset Plan Baseline
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUnlockAll}
              disabled={loading}
              className="bg-[#047857] hover:bg-[#036246] text-white text-xs font-semibold shadow-xs"
            >
              <Unlock className="w-3.5 h-3.5 mr-1" />
              Unlock All for Enterprise
            </Button>
          </div>
        </div>

        {/* 4 Entitlement Status Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
            <span className="text-[11px] font-semibold text-gray-400 block">Total Capabilities</span>
            <strong className="text-xl font-bold font-mono text-gray-900">{totalCount} Modules</strong>
            <span className="text-[11px] text-gray-500 block mt-0.5">Modular SaaS catalog</span>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-700 block">Unlocked & Active</span>
            <strong className="text-xl font-bold font-mono text-emerald-800">{unlockedCount} Enabled</strong>
            <span className="text-[11px] text-emerald-600 block mt-0.5">Fully operational for tenant</span>
          </div>

          <div className="p-4 bg-rose-50/40 rounded-2xl border border-rose-100">
            <span className="text-[11px] font-semibold text-rose-700 block">Locked (Restricted)</span>
            <strong className="text-xl font-bold font-mono text-rose-800">{lockedCount} Locked</strong>
            <span className="text-[11px] text-rose-600 block mt-0.5">Requires upgrade or unlock</span>
          </div>

          <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
            <span className="text-[11px] font-semibold text-purple-700 block">Contracted Plan Tier</span>
            <strong className="text-xl font-bold text-purple-900">{org.plan} Plan</strong>
            <span className="text-[11px] text-purple-600 block mt-0.5">Base entitlement baseline</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          2. FILTER & SEARCH TOOLBAR
         ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search capability by name, key or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50/50 font-medium text-gray-700"
          >
            <option value="ALL">All Categories</option>
            <option value="Attendance & Biometrics">Attendance & Biometrics</option>
            <option value="Payroll & Finance">Payroll & Finance</option>
            <option value="Governance & Operations">Governance & Operations</option>
            <option value="AI & Communication">AI & Communication</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50/50 font-medium text-gray-700"
          >
            <option value="ALL">All States</option>
            <option value="UNLOCKED">Unlocked Only</option>
            <option value="LOCKED">Locked Only</option>
          </select>
        </div>
      </div>

      {/* ----------------------------------------------------
          3. FEATURE CARDS GRID
         ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFeatures.map((feat) => {
          const isUpdating = updatingKey === feat.key;
          return (
            <div
              key={feat.key}
              className={cn(
                'p-5 rounded-3xl border transition-all space-y-3.5 relative flex flex-col justify-between',
                feat.isEnabled
                  ? 'bg-white border-emerald-200/80 shadow-xs hover:border-emerald-300'
                  : 'bg-gray-50/70 border-gray-200/80 opacity-90'
              )}
            >
              <div className="space-y-3">
                {/* Header row: Icon, Name, Lock Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border',
                        feat.isEnabled
                          ? 'bg-emerald-50 border-emerald-100'
                          : 'bg-gray-100 border-gray-200 text-gray-400'
                      )}
                    >
                      {getFeatureIcon(feat.key)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{feat.name}</h4>
                        {feat.isAddon && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Add-On
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">{feat.key} • {feat.category}</span>
                    </div>
                  </div>

                  {/* Lock/Unlock Status Pill */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0',
                      feat.isEnabled
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    )}
                  >
                    {feat.isEnabled ? (
                      <>
                        <Unlock className="w-3 h-3 text-emerald-600" /> UNLOCKED
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-rose-600" /> LOCKED
                      </>
                    )}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 leading-relaxed">{feat.description}</p>
              </div>

              {/* Bottom Control Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                <span className="text-[11px] text-gray-500 font-medium">
                  Baseline Tier: <strong className="text-gray-800">{feat.minPlanTier}</strong>
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-gray-600">
                    {feat.isEnabled ? 'Feature Unlocked' : 'Feature Locked'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feat.isEnabled}
                      disabled={isUpdating || loading}
                      onChange={() => handleToggleFeature(feat)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#047857]" />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="p-8 text-center bg-white rounded-3xl border border-gray-200 text-gray-500 text-xs">
          No capabilities match your current search or category filter.
        </div>
      )}

      {/* Guidance Note */}
      <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-900">
        <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold block">Enterprise Multi-Tenant Permission Isolation:</span>
          <span>
            Locking a module immediately removes it from the customer tenant navigation menu and restricts any API calls made with that tenant's credentials. Unlocking immediately provisions default database configurations without requiring customer re-authentication.
          </span>
        </div>
      </div>
    </div>
  );
};

