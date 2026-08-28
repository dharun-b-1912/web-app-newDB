import React, { useState, useEffect } from 'react';
import { OtherDashboardView } from './subviews/OtherDashboardView';
import { TravelExpenseView } from './subviews/TravelExpenseView';
import { PoshView } from './subviews/PoshView';
import { GrievanceDisciplineView } from './subviews/GrievanceDisciplineView';
import { EngagementView } from './subviews/EngagementView';
import { HelpdeskView } from './subviews/HelpdeskView';
import { CommunicationHubView } from './subviews/CommunicationHubView';

import {
  LayoutDashboard,
  Plane,
  ShieldAlert,
  MessageSquare,
  HeartHandshake,
  LifeBuoy,
  Megaphone,
} from 'lucide-react';

interface OtherMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'other') return 'dashboard';
  const clean = route.replace(/^(other-|hr-)/, '');
  if (clean === 'travel' || clean === 'expense' || clean === 'reimbursement') return 'travel';
  if (clean === 'posh' || clean === 'harassment') return 'posh';
  if (clean === 'grievance' || clean === 'grievances' || clean === 'discipline') return 'grievances';
  if (clean === 'engagement' || clean === 'surveys' || clean === 'polls' || clean === 'recognition') return 'engagement';
  if (clean === 'helpdesk' || clean === 'tickets' || clean === 'kb') return 'helpdesk';
  if (clean === 'communication' || clean === 'announcements' || clean === 'logs') return 'communication';
  return 'dashboard';
};

export const OtherMasterModule: React.FC<OtherMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'travel', label: 'Travel & Expense', icon: Plane },
    { id: 'posh', label: 'POSH Compliance', icon: ShieldAlert },
    { id: 'grievances', label: 'Grievance & Discipline', icon: MessageSquare },
    { id: 'engagement', label: 'Employee Engagement', icon: HeartHandshake },
    { id: 'helpdesk', label: 'HR Helpdesk', icon: LifeBuoy },
    { id: 'communication', label: 'Communication Hub', icon: Megaphone },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>Joy PeopleHR Enterprise Suite</span>
            <span>•</span>
            <span>HR Operations & Communication Hub</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">HR Operations & Employee Experience Master Module</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Specialized operational workflows for Travel & Expense, POSH Committee, Grievances, Employee Pulse Surveys, HR Helpdesk Tickets & Multi-Channel Broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">System SLA</span>
            <span className="text-sm font-black font-mono">98.4% On Track</span>
          </div>
        </div>
      </div>



      {/* Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && <OtherDashboardView onNavigateTab={tabKey => setActiveTab(tabKey)} />}
        {activeTab === 'travel' && <TravelExpenseView />}
        {activeTab === 'posh' && <PoshView />}
        {activeTab === 'grievances' && <GrievanceDisciplineView />}
        {activeTab === 'engagement' && <EngagementView />}
        {activeTab === 'helpdesk' && <HelpdeskView />}
        {activeTab === 'communication' && <CommunicationHubView />}
      </div>
    </div>
  );
};
