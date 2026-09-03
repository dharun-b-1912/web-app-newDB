// src/features/manpower/ManpowerWorkspace.tsx
// ============================================================
// Joy PeopleHR — Enterprise Manpower & Contractor Suite (Flagship)
// Workspaces: [ Partners ] [ Deployment ] [ Settlement (3-Way Match) ] [ Client Billing ] [ Compliance ]
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  MapPin,
  Sparkles,
  Receipt,
  ShieldCheck,
  Building2,
  Users,
  Scale,
  Calendar,
} from 'lucide-react';
import { VendorsView } from '../organization/VendorsView';
import { VendorMasterModule } from '../vendor/VendorMasterModule';
import { ClientBillingMasterModule } from '../clientBilling/ClientBillingMasterModule';
import { cn } from '../../lib/utils';

export type ManpowerTab =
  | 'partners'
  | 'deployment'
  | 'settlement'
  | 'billing'
  | 'compliance';

interface ManpowerWorkspaceProps {
  initialTab?: ManpowerTab;
  onNavigate?: (route: string) => void;
}

export const ManpowerWorkspace: React.FC<ManpowerWorkspaceProps> = ({
  initialTab = 'settlement',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<ManpowerTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 pb-24">
      {/* Workspace Header */}
      <div className="bg-gradient-to-r from-[#064E3B] via-[#07563D] to-[#043629] p-6 sm:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-300" />
              <span>Enterprise Commercials</span>
              <span>•</span>
              <span>Manpower & Vendor Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Manpower, Vendor Settlement & Client Billing
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Flagship 3-Way Match Reconciliation: Match Biometric Contractor Attendance against Purchase Orders and Vendor Invoices, automate client billing, and verify PF/ESIC statutory compliance.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">3-Way Match Engine</span>
              <span className="text-sm font-black font-mono">100% Reconciled</span>
            </div>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('settlement')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'settlement'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>3-Way Settlement Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('partners')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'partners'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>Agency Partners & CLRA</span>
          </button>

          <button
            onClick={() => setActiveTab('deployment')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'deployment'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <MapPin className="w-4 h-4" />
            <span>Contractor Deployment</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'billing'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Receipt className="w-4 h-4" />
            <span>Client Wage Invoicing</span>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'compliance'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Vendor Compliance & ECR</span>
          </button>
        </div>
      </div>

      {/* Subviews */}
      <div className="transition-all duration-200">
        {activeTab === 'settlement' && (
          <VendorMasterModule initialTab="vendor-settlement-workspace" />
        )}
        {activeTab === 'partners' && (
          <VendorsView />
        )}
        {activeTab === 'deployment' && (
          <VendorMasterModule initialTab="assignments" />
        )}
        {activeTab === 'billing' && (
          <ClientBillingMasterModule />
        )}
        {activeTab === 'compliance' && (
          <VendorMasterModule initialTab="compliance-calendar" />
        )}
      </div>
    </div>
  );
};
