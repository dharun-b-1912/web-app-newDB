import React, { useState, useEffect } from 'react';
import { PerformanceDashboardView } from './subviews/PerformanceDashboardView';
import { GoalsView } from './subviews/GoalsView';
import { OkrView } from './subviews/OkrView';
import { KpiView } from './subviews/KpiView';
import { KraView } from './subviews/KraView';
import { ReviewCyclesView } from './subviews/ReviewCyclesView';
import { ReviewsView } from './subviews/ReviewsView';
import { RatingsView } from './subviews/RatingsView';
import { DevelopmentView } from './subviews/DevelopmentView';
import { PromotionView } from './subviews/PromotionView';
import { PipView } from './subviews/PipView';
import { PerformanceReportsView } from './subviews/PerformanceReportsView';

import {
  LayoutDashboard,
  Target,
  Layers,
  BarChart3,
  RefreshCw,
  Award,
  Star,
  GraduationCap,
  UserCheck,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface PerformanceMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'performance') return 'dashboard';
  const clean = route.replace(/^performance-/, '');
  if (clean === 'goals' || clean === 'my-goals' || clean === 'team-goals' || clean === 'company-goals') return 'goals';
  if (clean === 'okr' || clean === 'okrs' || clean === 'key-results') return 'okr';
  if (clean === 'kpi' || clean === 'kpis') return 'kpi';
  if (clean === 'kra' || clean === 'kras') return 'kra';
  if (clean === 'cycles' || clean === 'review-cycles' || clean === 'periods' || clean === 'templates') return 'cycles';
  if (clean === 'reviews' || clean === 'self-review' || clean === 'manager-review' || clean === '360') return 'reviews';
  if (clean === 'ratings' || clean === 'calibration' || clean === '9box') return 'ratings';
  if (clean === 'development' || clean === 'dev-plans' || clean === 'career') return 'development';
  if (clean === 'promotion' || clean === 'promotions') return 'promotion';
  if (clean === 'pip' || clean === 'pips') return 'pip';
  if (clean === 'reports') return 'reports';
  return 'dashboard';
};

export const PerformanceMasterModule: React.FC<PerformanceMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'Performance Dashboard', icon: LayoutDashboard },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'okr', label: 'OKR Objectives', icon: Target },
    { id: 'kpi', label: 'KPI Library', icon: BarChart3 },
    { id: 'kra', label: 'KRA Framework', icon: Layers },
    { id: 'cycles', label: 'Review Cycles', icon: RefreshCw },
    { id: 'reviews', label: 'Reviews & 360°', icon: Award },
    { id: 'ratings', label: 'Ratings & Calibration', icon: Star },
    { id: 'development', label: 'Development Plans', icon: GraduationCap },
    { id: 'promotion', label: 'Promotions', icon: UserCheck },
    { id: 'pip', label: 'PIP Engine', icon: AlertTriangle },
    { id: 'reports', label: 'Performance Reports', icon: FileSpreadsheet },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>WorkForceOS Enterprise Suite</span>
            <span>•</span>
            <span>Performance Engine v4.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Performance Management Master Module</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Centralized goal cascading, OKRs, KPIs, KRAs, 360° appraisals, formula rating engine, calibration sessions, promotion workflows, and PIP recovery tracking.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Active Appraisal Cycle</span>
            <span className="text-sm font-black font-mono">Q3 2026 (Open)</span>
          </div>
        </div>
      </div>



      {/* Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && <PerformanceDashboardView onNavigateTab={tabKey => setActiveTab(tabKey)} />}
        {activeTab === 'goals' && <GoalsView />}
        {activeTab === 'okr' && <OkrView />}
        {activeTab === 'kpi' && <KpiView />}
        {activeTab === 'kra' && <KraView />}
        {activeTab === 'cycles' && <ReviewCyclesView />}
        {activeTab === 'reviews' && <ReviewsView />}
        {activeTab === 'ratings' && <RatingsView />}
        {activeTab === 'development' && <DevelopmentView />}
        {activeTab === 'promotion' && <PromotionView />}
        {activeTab === 'pip' && <PipView />}
        {activeTab === 'reports' && <PerformanceReportsView />}
      </div>
    </div>
  );
};
