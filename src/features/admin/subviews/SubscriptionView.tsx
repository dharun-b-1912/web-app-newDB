// src/features/admin/subviews/SubscriptionView.tsx
// ============================================================
// Joy PeopleHR — Tenant Subscription Plan & Feature Entitlements Console
// Controls plan tiers, included modules, add-ons, and real-time portal visibility
// ============================================================

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Cpu,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Layers,
  RefreshCw,
  Clock,
  Briefcase,
  Award,
  GraduationCap,
  Plane,
  BarChart3,
  Users,
  Receipt,
  MapPin,
  FileCheck2,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import {
  featureEntitlementService,
  PlanTier,
  TenantFeatureKey,
  FEATURE_DISPLAY_NAMES,
} from '../../../services/tenant/featureEntitlementService';

interface CommercialModuleCard {
  key: TenantFeatureKey;
  name: string;
  category: string;
  minPlan: PlanTier;
  icon: React.ElementType;
  description: string;
}

const COMMERCIAL_MODULE_CATALOGUE: CommercialModuleCard[] = [
  {
    key: 'recruitment',
    name: 'Recruitment & ATS Suite',
    category: 'Talent Acquisition',
    minPlan: 'Business',
    icon: Briefcase,
    description: 'Requisition approvals, job boards, candidate Kanban pipeline, automated offers & interviews.',
  },
  {
    key: 'performance',
    name: 'Performance & 360° Appraisals',
    category: 'Talent Development',
    minPlan: 'Enterprise',
    icon: Award,
    description: 'Goals, OKRs, KPI library, 360° reviews, calibration matrix, and continuous feedback.',
  },
  {
    key: 'lms',
    name: 'Learning & Development (LMS)',
    category: 'Talent Development',
    minPlan: 'Business',
    icon: GraduationCap,
    description: 'Video courses, SCORM compliance quizzes, certifications, and automated skill gap tracks.',
  },
  {
    key: 'travel_expense',
    name: 'Travel & Expense Desk',
    category: 'Finance & Reimbursements',
    minPlan: 'Business',
    icon: Plane,
    description: 'Multi-currency expense claims, receipt OCR, policy audits, and direct payroll reimbursement.',
  },
  {
    key: 'vendor_management',
    name: 'Vendor Workforce & Procurement',
    category: 'External Workforce',
    minPlan: 'Enterprise',
    icon: Users,
    description: 'Contractor management, purchase orders, 3-way match, contractor attendance & statutory compliance.',
  },
  {
    key: 'client_billing',
    name: 'Client Wage Billing & Invoicing',
    category: 'Commercial Billing',
    minPlan: 'Enterprise',
    icon: Receipt,
    description: 'Client wage invoicing, commercial markup formulas, billable runs, and multi-sheet GST billing.',
  },
  {
    key: 'biometric',
    name: 'Biometric Hardware Push Gateway',
    category: 'Hardware & IoT',
    minPlan: 'Enterprise',
    icon: Cpu,
    description: 'Direct daemon push gateway for Mantra, eSSL, Suprema, and ZKTeco biometrics & turnstiles.',
  },
  {
    key: 'analytics',
    name: 'Advanced BI Analytics & Reports',
    category: 'Intelligence & Insights',
    minPlan: 'Business',
    icon: BarChart3,
    description: 'Interactive executive HR & finance dashboards, retention heatmaps, and custom report builder.',
  },
  {
    key: 'shifts',
    name: 'Shift Scheduling & Roster Matrix',
    category: 'Workforce Operations',
    minPlan: 'Professional',
    icon: Clock,
    description: 'Complex rotational shifts, night allowance calculations, overtime requests, and auto-rosters.',
  },
  {
    key: 'gps',
    name: 'GPS & Mobile Geofence Clocking',
    category: 'Field Operations',
    minPlan: 'Professional',
    icon: MapPin,
    description: 'Geofenced mobile check-ins with radius validation and field force location tracking.',
  },
  {
    key: 'onboarding',
    name: 'Onboarding & Document Collection',
    category: 'Core HR Lifecycle',
    minPlan: 'Professional',
    icon: FileCheck2,
    description: 'Digital pre-boarding candidate conversion, statutory document upload, and automated welcome kits.',
  },
];

export const SubscriptionView: React.FC = () => {
  const { showToast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<PlanTier>(() =>
    featureEntitlementService.getCurrentTenantPlan()
  );
  const [features, setFeatures] = useState<Record<TenantFeatureKey, boolean>>(() =>
    featureEntitlementService.getTenantFeatures()
  );
  const [subInfo, setSubInfo] = useState(() => adminApi.getSubscription());

  const reloadEntitlements = () => {
    const plan = featureEntitlementService.getCurrentTenantPlan();
    setCurrentPlan(plan);
    setFeatures(featureEntitlementService.getTenantFeatures());
    setSubInfo(adminApi.getSubscription());
  };

  useEffect(() => {
    const handleUpdate = () => reloadEntitlements();
    window.addEventListener('tenant:plan_updated', handleUpdate);
    window.addEventListener('tenant:features_updated', handleUpdate);
    window.addEventListener('tenant:addons_updated', handleUpdate);

    return () => {
      window.removeEventListener('tenant:plan_updated', handleUpdate);
      window.removeEventListener('tenant:features_updated', handleUpdate);
      window.removeEventListener('tenant:addons_updated', handleUpdate);
    };
  }, []);

  const handleSelectPlan = (newPlan: PlanTier) => {
    featureEntitlementService.setTenantPlan(newPlan);
    reloadEntitlements();
    showToast(`Switched active subscription plan to ${newPlan}. Portal navigation & page access updated.`);
  };

  const handleToggleAddon = (featureKey: TenantFeatureKey, currentlyEnabled: boolean) => {
    const nextState = !currentlyEnabled;
    featureEntitlementService.setFeatureOverride(featureKey, nextState);
    reloadEntitlements();
    showToast(
      nextState
        ? `Added ${FEATURE_DISPLAY_NAMES[featureKey]} add-on. Module is now visible in the portal.`
        : `Removed ${FEATURE_DISPLAY_NAMES[featureKey]} add-on. Module is now hidden.`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-white via-emerald-50/20 to-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-100/70 text-[#07563D]">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              Subscription Plan & Commercial Entitlements
            </h2>
          </div>
          <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
            Modules and tables in the portal are dynamically rendered based on your active subscription plan and purchased add-ons.
            Unsubscribed modules are hidden from navigation and guarded against unauthorized access.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge
            variant={
              currentPlan === 'Enterprise'
                ? 'emerald'
                : currentPlan === 'Business'
                ? 'purple'
                : currentPlan === 'Professional'
                ? 'amber'
                : 'gray'
            }
            className="text-xs px-3 py-1 font-black uppercase tracking-wider"
          >
            {currentPlan} Tier Active
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={reloadEntitlements}
            className="border-gray-200 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync
          </Button>
        </div>
      </div>

      {/* Plan Tier Selector (Interactive Simulation / Upgrade Switcher) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Select Active Plan Tier</span>
            </h3>
            <p className="text-xs text-gray-500">
              Switching plans immediately reconfigures portal navigation visibility and access permissions across all client users.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {(['Starter', 'Professional', 'Business', 'Enterprise'] as PlanTier[]).map((plan) => {
            const isSelected = currentPlan === plan;
            return (
              <button
                key={plan}
                type="button"
                onClick={() => handleSelectPlan(plan)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'border-[#07563D] bg-emerald-50/40 ring-2 ring-[#07563D]/20 shadow-xs'
                    : 'border-gray-200/90 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#07563D] text-white">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
                <div className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                  <span>{plan}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                  {plan === 'Starter' && 'Core HR, ESS, Basic Attendance & Standard Payroll.'}
                  {plan === 'Professional' && 'Adds Shift Rostering, GPS Geofencing & Statutory Payroll.'}
                  {plan === 'Business' && 'Adds ATS Recruitment, LMS Training, Expense Desk & BI.'}
                  {plan === 'Enterprise' && 'Unlimited: Vendor Workforce, Biometric Push, 360 Appraisals.'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Headcount Capacity & Plan Health */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">License Capacity</span>
          <div className="text-2xl font-black text-gray-900 mt-1">
            {subInfo.active_employees} <span className="text-xs font-semibold text-gray-400">/ {subInfo.employee_limit} Seats</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-[#07563D] h-full transition-all duration-500"
              style={{ width: `${Math.min(100, (subInfo.active_employees / subInfo.employee_limit) * 100)}%` }}
            />
          </div>
        </div>

        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Commercial Billing Cycle</span>
          <div className="text-base font-black text-gray-900 mt-1 flex items-center gap-2">
            <span>{subInfo.billing_cycle} Subscription</span>
            <Badge variant="emerald" className="text-[10px]">Active</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">Next scheduled renewal: {subInfo.renewal_date}</p>
        </div>

        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Multi-Entity & Domain Scope</span>
          <div className="text-base font-black text-gray-900 mt-1">
            Production SaaS Tenant
          </div>
          <p className="text-xs text-emerald-800 font-medium mt-1">
            ✓ Automated statutory compliance & daily audit logs enabled
          </p>
        </div>
      </div>

      {/* Module Entitlement & Visibility Matrix */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Commercial Modules & Live Portal Visibility Matrix</span>
            </h3>
            <p className="text-xs text-gray-500">
              Green badges indicate active modules visible in your portal navigation. Gray modules are hidden for this tenant.
            </p>
          </div>
          <span className="text-[11px] font-bold text-gray-500">
            {Object.values(features).filter(Boolean).length} Active Capabilities
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {COMMERCIAL_MODULE_CATALOGUE.map((mod) => {
            const isEnabled = features[mod.key] ?? false;
            const Icon = mod.icon;

            return (
              <div
                key={mod.key}
                className={`p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-4 ${
                  isEnabled
                    ? 'border-emerald-200/90 bg-emerald-50/20 shadow-2xs'
                    : 'border-gray-200/80 bg-gray-50/40 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isEnabled ? 'bg-emerald-100 text-[#07563D]' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-gray-900 tracking-tight">{mod.name}</h4>
                      {isEnabled ? (
                        <Badge variant="emerald" className="text-[10px] px-2 py-0.5 font-bold">
                          Visible in Portal
                        </Badge>
                      ) : (
                        <Badge variant="gray" className="text-[10px] px-2 py-0.5 font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Hidden in Portal
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">{mod.description}</p>
                    <div className="mt-2 text-[10px] text-gray-400 font-semibold flex items-center gap-2">
                      <span>Baseline Tier: <strong className="text-gray-700">{mod.minPlan}+</strong></span>
                      <span>•</span>
                      <span>Category: <span className="text-gray-600">{mod.category}</span></span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  <Button
                    size="sm"
                    variant={isEnabled ? 'outline' : 'primary'}
                    onClick={() => handleToggleAddon(mod.key, isEnabled)}
                    className={`text-[11px] font-bold px-3 py-1 rounded-xl cursor-pointer ${
                      isEnabled
                        ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                        : 'bg-[#07563D] hover:bg-[#0b7a57] text-white shadow-xs'
                    }`}
                  >
                    {isEnabled ? 'Disable Add-on' : 'Enable Add-on'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
