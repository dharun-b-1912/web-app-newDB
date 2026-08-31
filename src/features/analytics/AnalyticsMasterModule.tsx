import React, { useState, useEffect } from 'react';
import { AnalyticsOverviewView } from './subviews/AnalyticsOverviewView';
import { HrDashboardView } from './subviews/HrDashboardView';
import { CeoDashboardView } from './subviews/CeoDashboardView';
import { FinanceDashboardView } from './subviews/FinanceDashboardView';
import { RecruitmentAnalyticsView } from './subviews/RecruitmentAnalyticsView';
import { AttendanceAnalyticsView } from './subviews/AttendanceAnalyticsView';
import { LeaveAnalyticsView } from './subviews/LeaveAnalyticsView';
import { PayrollAnalyticsView } from './subviews/PayrollAnalyticsView';
import { PerformanceAnalyticsView } from './subviews/PerformanceAnalyticsView';
import { TrainingAnalyticsView } from './subviews/TrainingAnalyticsView';
import { AttritionAnalyticsView } from './subviews/AttritionAnalyticsView';
import { WorkforceAnalyticsView } from './subviews/WorkforceAnalyticsView';
import { CostAnalyticsView } from './subviews/CostAnalyticsView';
import { CustomReportsView } from './subviews/CustomReportsView';
import { AnalyticsSettingsView } from './subviews/AnalyticsSettingsView';

import {
  BarChart3,
  Users,
  Sparkles,
  CircleDollarSign,
  Activity,
  Clock,
  Calendar,
  Award,
  GraduationCap,
  TrendingUp,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';

interface AnalyticsMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'analytics') return 'overview';
  const clean = route.replace(/^(analytics-|report-)/, '');
  if (clean === 'hr' || clean === 'hr-dashboard') return 'hr';
  if (clean === 'ceo' || clean === 'ceo-dashboard') return 'ceo';
  if (clean === 'finance' || clean === 'finance-dashboard') return 'finance';
  if (clean === 'recruitment' || clean === 'ats') return 'recruitment';
  if (clean === 'attendance') return 'attendance';
  if (clean === 'leave') return 'leave';
  if (clean === 'payroll' || clean === 'compensation') return 'payroll';
  if (clean === 'performance' || clean === 'ratings') return 'performance';
  if (clean === 'training' || clean === 'lms') return 'training';
  if (clean === 'attrition' || clean === 'exits') return 'attrition';
  if (clean === 'workforce' || clean === 'headcount') return 'workforce';
  if (clean === 'cost' || clean === 'expenses') return 'cost';
  if (clean === 'reports' || clean === 'builder' || clean === 'custom') return 'reports';
  if (clean === 'settings') return 'settings';
  return 'overview';
};

export const AnalyticsMasterModule: React.FC<AnalyticsMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const tabs = [
    { id: 'overview', label: 'Analytics Overview', icon: BarChart3 },
    { id: 'hr', label: 'HR Dashboard', icon: Users },
    { id: 'ceo', label: 'CEO Dashboard', icon: Sparkles },
    { id: 'finance', label: 'Finance Dashboard', icon: CircleDollarSign },
    { id: 'recruitment', label: 'Recruitment Analytics', icon: Activity },
    { id: 'attendance', label: 'Attendance Analytics', icon: Clock },
    { id: 'leave', label: 'Leave Analytics', icon: Calendar },
    { id: 'payroll', label: 'Payroll Analytics', icon: CircleDollarSign },
    { id: 'performance', label: 'Performance Analytics', icon: Award },
    { id: 'training', label: 'Training Analytics', icon: GraduationCap },
    { id: 'attrition', label: 'Attrition Analytics', icon: TrendingUp },
    { id: 'workforce', label: 'Workforce Analytics', icon: Users },
    { id: 'cost', label: 'Cost Analytics', icon: CircleDollarSign },
    { id: 'reports', label: 'Custom Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Analytics Settings', icon: Settings },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>Joy PeopleHR — HR & Payroll SaaS</span>
            <span>•</span>
            <span>Analytics & Management Master Engine v5.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Analytics & Decision Support Platform</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Unified HR intelligence layer aggregating live transactional metrics across Core HR, Recruitment, Attendance, Leave, Payroll, LMS & Operations.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Data Freshness</span>
            <span className="text-sm font-black font-mono">Live Sync (0s delay)</span>
          </div>
        </div>
      </div>



      {/* Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'overview' && <AnalyticsOverviewView onNavigateTab={tabKey => setActiveTab(tabKey)} />}
        {activeTab === 'hr' && <HrDashboardView />}
        {activeTab === 'ceo' && <CeoDashboardView />}
        {activeTab === 'finance' && <FinanceDashboardView />}
        {activeTab === 'recruitment' && <RecruitmentAnalyticsView />}
        {activeTab === 'attendance' && <AttendanceAnalyticsView />}
        {activeTab === 'leave' && <LeaveAnalyticsView />}
        {activeTab === 'payroll' && <PayrollAnalyticsView />}
        {activeTab === 'performance' && <PerformanceAnalyticsView />}
        {activeTab === 'training' && <TrainingAnalyticsView />}
        {activeTab === 'attrition' && <AttritionAnalyticsView />}
        {activeTab === 'workforce' && <WorkforceAnalyticsView />}
        {activeTab === 'cost' && <CostAnalyticsView />}
        {activeTab === 'reports' && <CustomReportsView />}
        {activeTab === 'settings' && <AnalyticsSettingsView />}
      </div>
    </div>
  );
};
