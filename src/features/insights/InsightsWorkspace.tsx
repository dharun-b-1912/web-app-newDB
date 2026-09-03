// src/features/insights/InsightsWorkspace.tsx
// ============================================================
// Joy PeopleHR — Enterprise Insights & Intelligence Workspace
// Tabs: [ Workforce Intelligence ] [ Attendance Analytics ] [ Financial & Cost ] [ Compliance Health ] [ Custom Reports ]
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  BarChart3,
  PieChart,
  ShieldCheck,
  FileSpreadsheet,
  Sparkles,
  TrendingUp,
  Clock,
  CircleDollarSign,
} from 'lucide-react';
import { WorkforceOverviewView } from '../dashboard/WorkforceOverviewView';
import { AnalyticsMasterModule } from '../analytics/AnalyticsMasterModule';
import { ComplianceView } from '../compliance/ComplianceView';
import { cn } from '../../lib/utils';

export type InsightsTab =
  | 'workforce'
  | 'attendance'
  | 'financial'
  | 'compliance'
  | 'reports';

interface InsightsWorkspaceProps {
  initialTab?: InsightsTab;
  onNavigate?: (route: string) => void;
}

export const InsightsWorkspace: React.FC<InsightsWorkspaceProps> = ({
  initialTab = 'workforce',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<InsightsTab>(initialTab);

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
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              <span>Executive Telemetry</span>
              <span>•</span>
              <span>Insights & Business Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Workforce, Cost & Compliance Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Read, understand, and decide: Real-time workforce attrition metrics, attendance velocity, department cost burn, and statutory audit readiness.
            </p>
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="mt-8 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('workforce')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'workforce'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <LineChart className="w-4 h-4" />
            <span>Workforce Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'attendance'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Clock className="w-4 h-4" />
            <span>Attendance & Shift Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('financial')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'financial'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <CircleDollarSign className="w-4 h-4" />
            <span>Cost & Wage Analytics</span>
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
            <span>Statutory Audit Health</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'reports'
                ? 'bg-white text-[#064E3B] shadow-md'
                : 'text-emerald-100/80 hover:text-white hover:bg-white/10'
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Custom Report Builder</span>
          </button>
        </div>
      </div>

      {/* Subviews */}
      <div className="transition-all duration-200">
        {activeTab === 'workforce' && (
          <WorkforceOverviewView onNavigate={onNavigate} />
        )}
        {activeTab === 'attendance' && (
          <AnalyticsMasterModule initialTab="analytics-attendance" />
        )}
        {activeTab === 'financial' && (
          <AnalyticsMasterModule initialTab="analytics-finance" />
        )}
        {activeTab === 'compliance' && (
          <ComplianceView />
        )}
        {activeTab === 'reports' && (
          <AnalyticsMasterModule initialTab="analytics-reports" />
        )}
      </div>
    </div>
  );
};
