// src/features/platform/components/PlatformNotFoundView.tsx
// ============================================================================
// Joy PeopleHR — Platform Administrative 404 Route Fallback
// Explicit, informative 404 error page preventing silent fallback to Control Center
// ============================================================================

import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  LayoutDashboard,
  Layers,
  Sparkles,
  Calculator,
  FileText,
  CreditCard,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface PlatformNotFoundViewProps {
  attemptedRoute?: string;
  onNavigateHome?: (route: string) => void;
}

export const PlatformNotFoundView: React.FC<PlatformNotFoundViewProps> = ({
  attemptedRoute = 'unknown',
  onNavigateHome,
}) => {
  const navigate = (route: string) => {
    if (onNavigateHome) {
      onNavigateHome(route);
    } else {
      window.location.href = route.startsWith('/') ? route : `/${route}`;
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-10 text-center">
        {/* Error Badge & Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 font-black text-[11px] uppercase tracking-wider mb-2">
          HTTP 404 — Platform Route Not Found
        </span>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Unrecognized Administrative Module
        </h1>

        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
          The requested route <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs font-bold border border-slate-200">/{attemptedRoute}</code> is not registered in the Joy PeopleHR Control Plane.
        </p>

        {/* Available Valid Destinations */}
        <div className="mt-8 text-left border-t border-slate-100 pt-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Authorized Platform Destinations:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('platform-dashboard')}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left text-xs group cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">Platform Control Center</div>
                <div className="text-[11px] text-slate-400">/platform (Operational Telemetry)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('platform-plans')}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left text-xs group cursor-pointer"
            >
              <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">Plans & Pricing</div>
                <div className="text-[11px] text-slate-400">/platform/plans (Tiers & Entitlements)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('platform-addons')}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left text-xs group cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">Add-ons Catalogue</div>
                <div className="text-[11px] text-slate-400">/platform-addons (Capabilities & Meters)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('platform-pricing-calculator')}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left text-xs group cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">SaaS Pricing Calculator</div>
                <div className="text-[11px] text-slate-400">/platform-pricing-calculator</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('platform-quotations')}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left text-xs group cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">Commercial Quotations</div>
                <div className="text-[11px] text-slate-400">/platform/quotations (Proposals)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('platform-invoices')}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left text-xs group cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">Invoices & Billing</div>
                <div className="text-[11px] text-slate-400">/platform/invoices (GST SAC 998313)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('platform-catalogue')}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left text-xs group cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">Feature Catalogue</div>
                <div className="text-[11px] text-slate-400">/platform/feature-catalogue (16 Modules)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('platform-features')}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left text-xs group cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-slate-800 group-hover:text-emerald-800">Feature Flags</div>
                <div className="text-[11px] text-slate-400">/platform/features (Release Controls)</div>
              </div>
            </button>
          </div>
        </div>

        {/* Back to Control Center Action */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('platform-dashboard')}
            className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs font-bold gap-2 rounded-xl shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Platform Command Center
          </Button>
        </div>
      </div>
    </div>
  );
};
