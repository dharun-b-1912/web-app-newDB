import React, { useState } from 'react';
import { LeaveRequest } from '../../types/leave';
import { LeaveDashboardView } from './subviews/LeaveDashboardView';
import { LeaveTypesView } from './subviews/LeaveTypesView';
import { LeavePoliciesView } from './subviews/LeavePoliciesView';
import { LeaveCalendarView } from './subviews/LeaveCalendarView';
import { LeaveBalanceView } from './subviews/LeaveBalanceView';
import { LeaveRequestsView } from './subviews/LeaveRequestsView';
import { ApprovalCenterView } from './subviews/ApprovalCenterView';
import { HolidayCalendarView } from './subviews/HolidayCalendarView';
import { CompOffView } from './subviews/CompOffView';
import { EncashmentView } from './subviews/EncashmentView';
import { AdjustmentsView } from './subviews/AdjustmentsView';
import { AccrualEngineView } from './subviews/AccrualEngineView';
import { LeaveExceptionsView } from './subviews/LeaveExceptionsView';
import { LeaveReportsView } from './subviews/LeaveReportsView';
import { LeaveRequestDetailDrawer } from './components/LeaveRequestDetailDrawer';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  FileText,
  CheckCircle,
  Gift,
  Coins,
  ShieldAlert,
  Zap,
  BarChart3,
  CalendarDays,
  History,
  SlidersHorizontal,
  FileCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface LeaveManagementModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'leave') return 'dashboard';
  const clean = route.replace(/^leave-/, '');
  if (clean === 'approval') return 'approvals';
  if (clean === 'balance') return 'balances';
  return clean;
};

interface SubNavGroup {
  name: 'Overview' | 'Operations' | 'Configuration' | 'Insights';
  items: { id: string; label: string; icon: React.ElementType }[];
}

export const LeaveManagementModule: React.FC<LeaveManagementModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));
  const [selectedRequestForDrawer, setSelectedRequestForDrawer] = useState<LeaveRequest | null>(null);
  const [activeFilterParam, setActiveFilterParam] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const lifecycleGroups: SubNavGroup[] = [
    {
      name: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'balances', label: 'Balance & Ledger', icon: Layers },
      ],
    },
    {
      name: 'Operations',
      items: [
        { id: 'requests', label: 'Requests', icon: FileText },
        { id: 'approvals', label: 'Approvals', icon: CheckCircle },
        { id: 'compoff', label: 'Comp-Off', icon: Gift },
        { id: 'adjustments', label: 'Adjustments', icon: History },
        { id: 'exceptions', label: 'Exceptions', icon: ShieldAlert },
      ],
    },
    {
      name: 'Configuration',
      items: [
        { id: 'types', label: 'Leave Types', icon: SlidersHorizontal },
        { id: 'policies', label: 'Policies', icon: FileCheck },
        { id: 'accrual', label: 'Accrual', icon: Zap },
        { id: 'holidays', label: 'Holidays', icon: CalendarDays },
        { id: 'encashment', label: 'Encashment', icon: Coins },
      ],
    },
    {
      name: 'Insights',
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3 },
      ],
    },
  ];

  const handleKpiFilterSelect = (filterKey: string) => {
    setActiveFilterParam(filterKey);
    if (filterKey === 'pending-requests' || filterKey === 'approved-requests' || filterKey === 'rejected-requests') {
      setActiveTab('requests');
    } else if (filterKey === 'on-leave-today') {
      setActiveTab('calendar');
    } else if (filterKey === 'upcoming-holidays') {
      setActiveTab('holidays');
    } else if (filterKey === 'comp-off-balance') {
      setActiveTab('compoff');
    } else if (filterKey === 'encashment-pending') {
      setActiveTab('encashment');
    } else if (filterKey === 'exceptions') {
      setActiveTab('exceptions');
    } else if (filterKey === 'low-balance') {
      setActiveTab('balances');
    } else {
      setActiveTab('requests');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20">
      {/* Top Banner with Global Period Context */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>Joy PeopleHR — HR & Payroll SaaS</span>
            <span>•</span>
            <span>Policy Engine v3.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Leave Management Master Module</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Configure → Plan → Request → Approve → Calculate → Adjust → Report. Tenant-isolated rules, automated working day calculator, immutable ledger, and live attendance synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Leave Year Context</span>
            <span className="text-sm font-black font-mono">FY 2026-27 (Apr–Mar)</span>
          </div>
        </div>
      </div>

      {/* Structured Lifecycle Navigation Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between px-2 pb-2 border-b border-gray-100">
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span>Lifecycle Stages:</span>
            <span className="text-emerald-700 font-extrabold">Configure</span>
            <span>→</span>
            <span className="text-emerald-700 font-extrabold">Plan</span>
            <span>→</span>
            <span className="text-emerald-700 font-extrabold">Request</span>
            <span>→</span>
            <span className="text-emerald-700 font-extrabold">Approve</span>
            <span>→</span>
            <span className="text-emerald-700 font-extrabold">Calculate</span>
            <span>→</span>
            <span className="text-emerald-700 font-extrabold">Adjust</span>
            <span>→</span>
            <span className="text-emerald-700 font-extrabold">Report</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {lifecycleGroups.map((group) => (
            <div key={group.name} className="space-y-1 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider px-1">
                {group.name}
              </div>
              <div className="flex flex-wrap gap-1">
                {group.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setActiveFilterParam(undefined);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        isActive
                          ? 'bg-[#07563D] text-white shadow-2xs scale-[1.02]'
                          : 'bg-white text-gray-700 border border-gray-200/80 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-gray-500')} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && (
          <LeaveDashboardView
            onSelectKpiFilter={handleKpiFilterSelect}
            onOpenRequestDetails={req => setSelectedRequestForDrawer(req)}
          />
        )}
        {activeTab === 'types' && <LeaveTypesView />}
        {activeTab === 'policies' && <LeavePoliciesView />}
        {activeTab === 'calendar' && <LeaveCalendarView />}
        {activeTab === 'balances' && <LeaveBalanceView />}
        {activeTab === 'requests' && (
          <LeaveRequestsView
            onOpenRequestDetails={req => setSelectedRequestForDrawer(req)}
            initialFilter={activeFilterParam}
          />
        )}
        {activeTab === 'approvals' && (
          <ApprovalCenterView onOpenRequestDetails={req => setSelectedRequestForDrawer(req)} />
        )}
        {activeTab === 'holidays' && <HolidayCalendarView />}
        {activeTab === 'compoff' && <CompOffView />}
        {activeTab === 'encashment' && <EncashmentView />}
        {activeTab === 'adjustments' && <AdjustmentsView />}
        {activeTab === 'accrual' && <AccrualEngineView />}
        {activeTab === 'exceptions' && <LeaveExceptionsView />}
        {activeTab === 'reports' && <LeaveReportsView />}
      </div>

      {/* Detail Slide-Over Drawer */}
      <LeaveRequestDetailDrawer
        request={selectedRequestForDrawer}
        onClose={() => setSelectedRequestForDrawer(null)}
        onActionComplete={() => setSelectedRequestForDrawer(null)}
      />
    </div>
  );
};
