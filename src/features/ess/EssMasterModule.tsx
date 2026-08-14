import React, { useState, useEffect } from 'react';
import { EssDashboardView } from './subviews/EssDashboardView';
import { EssAttendanceView } from './subviews/EssAttendanceView';
import { EssLeaveView } from './subviews/EssLeaveView';
import { EssPayrollView } from './subviews/EssPayrollView';
import { EssRequestsView } from './subviews/EssRequestsView';
import { EssPerformanceView } from './subviews/EssPerformanceView';
import { EssLearningView } from './subviews/EssLearningView';
import { EssDocumentsView } from './subviews/EssDocumentsView';
import { EssCommunicationView } from './subviews/EssCommunicationView';
import { EssProfileView } from './subviews/EssProfileView';

import {
  LayoutDashboard,
  Clock,
  Calendar,
  CircleDollarSign,
  Plus,
  Award,
  GraduationCap,
  FileText,
  Megaphone,
  UserCheck,
} from 'lucide-react';

interface EssMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'ess' || route === 'workspace' || route === 'my-workspace') return 'dashboard';
  const clean = route.replace(/^ess-/, '');
  if (clean === 'attendance') return 'attendance';
  if (clean === 'leave') return 'leave';
  if (clean === 'payroll' || clean === 'payslips') return 'payroll';
  if (clean === 'requests' || clean === 'my-requests') return 'requests';
  if (clean === 'performance' || clean === 'okr') return 'performance';
  if (clean === 'learning' || clean === 'courses') return 'learning';
  if (clean === 'documents' || clean === 'my-docs') return 'documents';
  if (clean === 'communication' || clean === 'announcements') return 'communication';
  if (clean === 'profile' || clean === 'my-profile') return 'profile';
  return 'dashboard';
};

export const EssMasterModule: React.FC<EssMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'ESS Home', icon: LayoutDashboard },
    { id: 'attendance', label: 'My Attendance', icon: Clock },
    { id: 'leave', label: 'My Leave', icon: Calendar },
    { id: 'payroll', label: 'My Payroll', icon: CircleDollarSign },
    { id: 'requests', label: 'My Requests', icon: Plus },
    { id: 'performance', label: 'My Performance', icon: Award },
    { id: 'learning', label: 'My Learning', icon: GraduationCap },
    { id: 'documents', label: 'My Documents', icon: FileText },
    { id: 'communication', label: 'Communication', icon: Megaphone },
    { id: 'profile', label: 'My Profile', icon: UserCheck },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">


      {/* Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && <EssDashboardView onNavigateTab={tabKey => setActiveTab(tabKey)} />}
        {activeTab === 'attendance' && <EssAttendanceView />}
        {activeTab === 'leave' && <EssLeaveView />}
        {activeTab === 'payroll' && <EssPayrollView />}
        {activeTab === 'requests' && <EssRequestsView />}
        {activeTab === 'performance' && <EssPerformanceView />}
        {activeTab === 'learning' && <EssLearningView />}
        {activeTab === 'documents' && <EssDocumentsView />}
        {activeTab === 'communication' && <EssCommunicationView />}
        {activeTab === 'profile' && <EssProfileView />}
      </div>
    </div>
  );
};
