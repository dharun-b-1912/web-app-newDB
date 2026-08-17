import React from 'react';
import { Card } from '../../../components/ui/Card';
import {
  Users,
  TrendingUp,
  UserMinus,
  DollarSign,
  UserPlus,
  Briefcase,
  ShieldAlert,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';
import { ExecutiveSummaryMetrics } from '../../../services/executiveAnalyticsService';

interface Props {
  metrics: ExecutiveSummaryMetrics;
  onNavigate: (route: string) => void;
}

export const ExecutiveKpiCards: React.FC<Props> = ({ metrics, onNavigate }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {/* 1. Total Workforce */}
      <Card
        onClick={() => onNavigate('people')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-300 shadow-sm cursor-pointer transition-all hover:shadow-md group bg-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Headcount
          </span>
          <div className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center flex-shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-gray-900 block">{metrics.totalWorkforce}</span>
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
            {metrics.activeWorkforce} Active Staff
          </span>
        </div>
      </Card>

      {/* 2. Workforce Growth */}
      <Card
        onClick={() => onNavigate('workforce-overview')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-300 shadow-sm cursor-pointer transition-all hover:shadow-md group bg-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Growth Rate
          </span>
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-emerald-900 block">
            {metrics.workforceGrowthPct !== null ? `${metrics.workforceGrowthPct > 0 ? '+' : ''}${metrics.workforceGrowthPct}%` : '0.0%'}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
            Net Cohort
          </span>
        </div>
      </Card>

      {/* 3. Attrition Rate */}
      <Card
        onClick={() => onNavigate('offboarding')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-300 shadow-sm cursor-pointer transition-all hover:shadow-md group bg-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Attrition Rate
          </span>
          <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0">
            <UserMinus className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-rose-900 block">
            {metrics.attritionRatePct !== null ? `${metrics.attritionRatePct}%` : '0.0%'}
          </span>
          <span className="text-[10px] text-rose-700 font-bold block mt-0.5">
            {metrics.exitsCount} Separations
          </span>
        </div>
      </Card>

      {/* 4. People / Workforce Cost */}
      <Card
        onClick={() => onNavigate('payroll')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-300 shadow-sm cursor-pointer transition-all hover:shadow-md group bg-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            People Cost
          </span>
          <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          {metrics.workforceCostTotal !== null ? (
            <span className="text-xl font-black text-teal-900 block">₹{(metrics.workforceCostTotal / 100000).toFixed(1)}L</span>
          ) : (
            <span className="text-xs font-bold text-amber-700 block py-1">Setup Payroll</span>
          )}
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
            Monthly Expense
          </span>
        </div>
      </Card>

      {/* 5. Hiring Velocity */}
      <Card
        onClick={() => onNavigate('onboarding')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-300 shadow-sm cursor-pointer transition-all hover:shadow-md group bg-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            New Hires
          </span>
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-blue-900 block">+{metrics.newHiresCount}</span>
          <span className="text-[10px] text-blue-700 font-bold block mt-0.5">This Period</span>
        </div>
      </Card>

      {/* 6. Exits / Separation */}
      <Card
        onClick={() => onNavigate('offboarding')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-300 shadow-sm cursor-pointer transition-all hover:shadow-md group bg-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Exits / Notice
          </span>
          <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <UserMinus className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-amber-900 block">{metrics.exitsCount}</span>
          <span className="text-[10px] text-amber-700 font-bold block mt-0.5">Pipeline</span>
        </div>
      </Card>

      {/* 7. Open Positions */}
      <Card
        onClick={() => onNavigate('talent-recruitment')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-300 shadow-sm cursor-pointer transition-all hover:shadow-md group bg-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Openings
          </span>
          <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-purple-900 block">{metrics.openPositionsCount}</span>
          <span className="text-[10px] text-purple-700 font-bold block mt-0.5">Requisitions</span>
        </div>
      </Card>

      {/* 8. Compliance / HR Risk */}
      <Card
        onClick={() => onNavigate('compliance')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-300 shadow-sm cursor-pointer transition-all hover:shadow-md group bg-white"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Health Score
          </span>
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-indigo-900 block">{metrics.complianceRiskScore}%</span>
          <span className="text-[10px] text-indigo-700 font-bold block mt-0.5">
            {metrics.criticalRisksCount === 0 ? 'Compliant' : `${metrics.criticalRisksCount} Action Items`}
          </span>
        </div>
      </Card>
    </div>
  );
};
