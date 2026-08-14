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
  Sliders,
  FileCheck,
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
} from 'lucide-react';

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

export const LeaveManagementModule: React.FC<LeaveManagementModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));
  const [selectedRequestForDrawer, setSelectedRequestForDrawer] = useState<LeaveRequest | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'types', label: 'Leave Types', icon: Sliders },
    { id: 'policies', label: 'Policies', icon: FileCheck },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'balances', label: 'Balances & Ledger', icon: Layers },
    { id: 'requests', label: 'Leave Requests', icon: FileText },
    { id: 'approvals', label: 'Approval Desk', icon: CheckCircle },
    { id: 'holidays', label: 'Holidays', icon: CalendarDays },
    { id: 'compoff', label: 'Comp-Off', icon: Gift },
    { id: 'encashment', label: 'Encashment', icon: Coins },
    { id: 'adjustments', label: 'Adjustments', icon: Sliders },
    { id: 'accrual', label: 'Accrual Engine', icon: Zap },
    { id: 'exceptions', label: 'Exceptions', icon: ShieldAlert },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const handleKpiFilterSelect = (filterKey: string) => {
    if (filterKey === 'pending-requests' || filterKey === 'approved-requests' || filterKey === 'rejected-requests') {
      setActiveTab('requests');
    } else if (filterKey === 'upcoming-holidays') {
      setActiveTab('holidays');
    } else if (filterKey === 'comp-off-balance') {
      setActiveTab('compoff');
    } else if (filterKey === 'encashment-pending') {
      setActiveTab('encashment');
    } else {
      setActiveTab('requests');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>WorkForceOS Enterprise Suite</span>
            <span>•</span>
            <span>Policy Engine v3.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Leave Management Master Module</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Centralized leave policy definition, immutable transaction ledger, working-day duration calculator, and real-time attendance & payroll synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Current Period</span>
            <span className="text-sm font-black font-mono">FY 2026-27</span>
          </div>
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
          <LeaveRequestsView onOpenRequestDetails={req => setSelectedRequestForDrawer(req)} />
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
