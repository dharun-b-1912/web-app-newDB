import React, { useCallback, useEffect, useState } from 'react';
import {
  Factory,
  LayoutDashboard,
  Users,
  Scissors,
  ClipboardCheck,
  Wallet,
  IndianRupee,
  BarChart3,
  Settings,
  Lock,
  Sparkles,
  RefreshCw,
  X,
  UserCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { getPrimaryRole } from '../../lib/rbac/permissionEngine';
import { garmentEntitlementService } from '../../services/garment/garmentEntitlementService';
import { garmentMasterService } from '../../services/garment/garmentMasterService';
import { garmentOperationsService } from '../../services/garment/garmentOperationsService';
import { garmentPayrollService } from '../../services/garment/garmentPayrollService';
import {
  GarmentOrgSettings,
  OrganizationAddonEntitlement,
  PieceRateCalculationMode,
  RejectedPaymentRule,
  ReworkPaymentRule,
  SharedSplitMethod,
} from '../../types/garment';
import { GarmentWorkspaceData } from './types';
import { GarmentDashboardView } from './subviews/GarmentDashboardView';
import { GarmentUnitsView } from './subviews/GarmentUnitsView';
import { GarmentWorkersWageView } from './subviews/GarmentWorkersWageView';
import { GarmentCatalogRatesView } from './subviews/GarmentCatalogRatesView';
import { GarmentFloorOpsView } from './subviews/GarmentFloorOpsView';
import { GarmentIncentivesAdvancesView } from './subviews/GarmentIncentivesAdvancesView';
import { GarmentPayrollView } from './subviews/GarmentPayrollView';
import { GarmentReportsView } from './subviews/GarmentReportsView';
import { GarmentWorkerEssView } from './subviews/GarmentWorkerEssView';

interface GarmentMasterModuleProps {
  initialTab?: string;
  onNavigateTab?: (route: string) => void;
}

function resolveTab(route?: string, isWorkerOnly = false): string {
  if (isWorkerOnly) return 'my-earnings';
  if (!route) return 'dashboard';
  const r = route.replace(/^\/?garment[-/]?/, '').toLowerCase();
  if (r === 'units' || r === 'lines' || r === 'teams') return 'units';
  if (r === 'wages' || r === 'workers') return 'wages';
  if (r === 'catalog' || r === 'styles' || r === 'orders' || r === 'rates') return 'catalog';
  if (r === 'operations' || r === 'attendance' || r === 'qc') return 'operations';
  if (r === 'advances' || r === 'incentives') return 'advances';
  if (r === 'payroll') return 'payroll';
  if (r === 'reports') return 'reports';
  if (r === 'my-earnings') return 'my-earnings';
  return 'dashboard';
}

export const GarmentMasterModule: React.FC<GarmentMasterModuleProps> = ({ initialTab, onNavigateTab }) => {
  const { user } = useAuth();
  const { organization } = useTenant();
  const orgId = organization?.id || (user as any)?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
  const primaryRole = getPrimaryRole(user);
  const isWorkerOnly = primaryRole === 'Employee';
  const isAdmin = ['Super Admin', 'Organization Admin', 'Company Admin', 'HR Head', 'HR Admin'].includes(primaryRole);

  const [activeTab, setActiveTab] = useState(() => resolveTab(initialTab, isWorkerOnly));
  const [entitlement, setEntitlement] = useState<OrganizationAddonEntitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GarmentWorkspaceData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<GarmentOrgSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setActiveTab(resolveTab(initialTab, isWorkerOnly));
  }, [initialTab, isWorkerOnly]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const ent = await garmentEntitlementService.getEntitlement(orgId, true);
      setEntitlement(ent);

      if (!ent?.is_enabled) {
        setData(null);
        return;
      }

      const [
        settings,
        units,
        teams,
        workers,
        wageAssignments,
        styles,
        operations,
        orders,
        rateCards,
        incentiveRules,
        incentiveAwards,
        advances,
        attendance,
        productionEntries,
        allocations,
        cycles,
        corrections,
        empRes,
        wlRes,
        shiftRes,
        vendorRes,
      ] = await Promise.all([
        garmentMasterService.getSettings(orgId),
        garmentMasterService.listUnits(orgId),
        garmentMasterService.listTeams(orgId),
        garmentMasterService.listWorkerProfiles(orgId),
        garmentMasterService.listWageAssignments(orgId),
        garmentMasterService.listStyles(orgId),
        garmentMasterService.listOperations(orgId),
        garmentMasterService.listOrders(orgId),
        garmentMasterService.listRateCards(orgId),
        garmentMasterService.listIncentiveRules(orgId),
        garmentOperationsService.listIncentiveAwards(orgId),
        garmentOperationsService.listAdvancesLedger(orgId),
        garmentOperationsService.listFloorAttendance({ organizationId: orgId }),
        garmentOperationsService.listProductionEntries({ organizationId: orgId }),
        garmentOperationsService.listProductionAllocations({ organizationId: orgId }),
        garmentPayrollService.listCycles(orgId),
        garmentOperationsService.listCorrectionRequests(orgId),
        supabase.from('employees').select('*').eq('organization_id', orgId),
        supabase.from('work_locations').select('*').eq('organization_id', orgId),
        supabase.from('shifts').select('id, name, code, start_time, end_time').eq('organization_id', orgId),
        supabase.from('vendors').select('*'),
      ]);

      const employees = ((empRes.data || []) as any[]).map((e) => ({
        ...e,
        department: e.department || e.department_name || '',
        designation: e.designation || e.designation_title || '',
        employment_status: e.employment_status || e.status || '',
      }));
      const empNameMap: Record<string, string> = {};
      employees.forEach((e) => {
        empNameMap[e.id] = e.display_name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_code || e.id;
      });

      const workLocations = ((wlRes.data || []) as any[]).map((w) => ({
        id: w.id,
        name: w.name,
        city: w.city ?? null,
      }));

      const vendors = ((vendorRes.data || []) as any[])
        .filter((v) => !v.organization_id || v.organization_id === orgId)
        .map((v) => ({
          id: v.id,
          name: v.display_name || v.legal_name || v.name || v.vendor_code || v.id,
        }));

      setSettingsDraft(settings);
      setData({
        orgId,
        currency: settings.currency_code || 'INR',
        settings,
        units,
        teams,
        workers,
        wageAssignments,
        styles,
        operations,
        orders,
        rateCards,
        incentiveRules,
        incentiveAwards,
        advances,
        attendance,
        productionEntries,
        allocations,
        cycles,
        corrections,
        employees,
        workLocations,
        shifts: (shiftRes.data || []) as any[],
        vendors,
        empNameMap,
      });
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleToggleAddon = async (enable: boolean) => {
    setSavingSettings(true);
    try {
      await garmentEntitlementService.setEnabled(orgId, enable);
      await loadWorkspace();
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsDraft) return;
    setSavingSettings(true);
    try {
      await garmentMasterService.saveSettings(settingsDraft);
      setSettingsOpen(false);
      await loadWorkspace();
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading && !data && !entitlement) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Loading Garment Workforce SaaS Add-On...
      </div>
    );
  }

  // Strictly block workspace when tenant add-on is disabled
  if (!entitlement?.is_enabled) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-5 shadow-xs">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Garment &amp; Piece-Rate Workforce Add-On is Not Enabled</h2>
          <p className="mt-2 text-sm text-slate-600">
            This optional SaaS add-on manages factories, sewing lines, daily/hourly/piece-rate/hybrid wages, QC output verification, floor mobile sync, and automated piece-rate payroll.
          </p>
        </div>
        {isAdmin ? (
          <button
            disabled={savingSettings}
            onClick={() => handleToggleAddon(true)}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Enable Garment Workforce Add-On for {organization?.name || 'Organization'}
          </button>
        ) : (
          <p className="text-xs text-amber-700 font-semibold">Contact your Organization Administrator to activate this add-on.</p>
        )}
      </div>
    );
  }

  if (!data) return null;

  const tabs = isWorkerOnly
    ? [{ id: 'my-earnings', label: 'My Garment Earnings', icon: UserCheck }]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'units', label: 'Units & Teams', icon: Factory },
        { id: 'wages', label: 'Workers & Wages', icon: Users },
        { id: 'catalog', label: 'Styles, Ops & Rates', icon: Scissors },
        { id: 'operations', label: 'Floor Ops & QC', icon: ClipboardCheck },
        { id: 'advances', label: 'Incentives & Advances', icon: Wallet },
        { id: 'payroll', label: 'Payroll Runs', icon: IndianRupee },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'my-earnings', label: 'My Worker ESS', icon: UserCheck },
      ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onNavigateTab) {
      onNavigateTab(tabId === 'dashboard' ? 'garment-dashboard' : `garment-${tabId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Garment &amp; Clothing Workforce Suite</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                SaaS Add-On Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Multi-method factory payroll (Daily • Hourly • Piece-Rate • Hybrid) &amp; QC production floor sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadWorkspace} className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {isAdmin && (
            <button onClick={() => setSettingsOpen(true)} className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Policy &amp; Add-On Controls
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-2xl border border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${active ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Subview Content */}
      {activeTab === 'dashboard' && <GarmentDashboardView data={data} onRefresh={loadWorkspace} onNavigateTab={handleTabClick} />}
      {activeTab === 'units' && <GarmentUnitsView data={data} onRefresh={loadWorkspace} onNavigateTab={handleTabClick} />}
      {activeTab === 'wages' && <GarmentWorkersWageView data={data} onRefresh={loadWorkspace} onNavigateTab={handleTabClick} />}
      {activeTab === 'catalog' && <GarmentCatalogRatesView data={data} onRefresh={loadWorkspace} onNavigateTab={handleTabClick} />}
      {activeTab === 'operations' && <GarmentFloorOpsView data={data} onRefresh={loadWorkspace} onNavigateTab={handleTabClick} />}
      {activeTab === 'advances' && <GarmentIncentivesAdvancesView data={data} onRefresh={loadWorkspace} onNavigateTab={handleTabClick} />}
      {activeTab === 'payroll' && <GarmentPayrollView data={data} onRefresh={loadWorkspace} onNavigateTab={handleTabClick} />}
      {activeTab === 'reports' && <GarmentReportsView data={data} onRefresh={loadWorkspace} onNavigateTab={handleTabClick} />}
      {activeTab === 'my-earnings' && <GarmentWorkerEssView data={data} onRefresh={loadWorkspace} onNavigateTab={handleTabClick} />}

      {/* Settings & Tenant Add-On Control Modal */}
      {settingsOpen && settingsDraft && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Garment Tenant Policy &amp; SaaS Entitlement</h4>
              <button type="button" onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Piece-Rate Mode</label>
                <select
                  value={settingsDraft.piece_rate_calculation_mode}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, piece_rate_calculation_mode: e.target.value as PieceRateCalculationMode })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="CONFIGURABLE_PER_ORDER">CONFIGURABLE_PER_ORDER</option>
                  <option value="INDIVIDUAL_OPERATION">INDIVIDUAL_OPERATION</option>
                  <option value="SHARED_LINE_OUTPUT">SHARED_LINE_OUTPUT</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Shared Split Method</label>
                <select
                  value={settingsDraft.default_shared_split_method}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, default_shared_split_method: e.target.value as SharedSplitMethod })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="EQUAL">EQUAL</option>
                  <option value="BY_HOURS">BY_HOURS</option>
                  <option value="BY_SKILL_WEIGHT">BY_SKILL_WEIGHT</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">QC Rework Payment Rule</label>
                <select
                  value={settingsDraft.default_rework_payment_rule}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, default_rework_payment_rule: e.target.value as ReworkPaymentRule })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="ACCEPTED_ONLY">ACCEPTED_ONLY</option>
                  <option value="ACCEPTED_PLUS_REWORK_ACCEPTED">ACCEPTED_PLUS_REWORK_ACCEPTED</option>
                  <option value="PROPORTIONAL_REWORK">PROPORTIONAL_REWORK</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Rejected Payment Rule</label>
                <select
                  value={settingsDraft.rejected_payment_rule}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, rejected_payment_rule: e.target.value as RejectedPaymentRule })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option value="NEVER_PAY">NEVER_PAY</option>
                  <option value="PARTIAL_OVERRIDE">PARTIAL_OVERRIDE</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Statutory Min Daily Wage Floor</label>
                <input
                  type="number"
                  step="0.01"
                  value={settingsDraft.statutory_minimum_daily_wage}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, statutory_minimum_daily_wage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Currency Code</label>
                <input
                  value={settingsDraft.currency_code}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, currency_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  handleToggleAddon(false);
                }}
                className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 font-semibold hover:bg-rose-50"
              >
                Disable Garment Add-On for Tenant
              </button>
              <button disabled={savingSettings} type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Save Policy Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

