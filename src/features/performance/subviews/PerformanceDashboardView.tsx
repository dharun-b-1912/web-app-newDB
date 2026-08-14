import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../../services/performanceApi';
import { Goal, ReviewCycle, PerformanceRating } from '../../../types/performance';
import { Badge } from '../../../components/ui/Badge';
import {
  Award,
  Target,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserCheck,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PerformanceDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const PerformanceDashboardView: React.FC<PerformanceDashboardViewProps> = ({ onNavigateTab }) => {
  const [roleScope, setRoleScope] = useState<'HRHead' | 'Manager' | 'Employee'>('HRHead');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [ratings, setRatings] = useState<PerformanceRating[]>([]);

  useEffect(() => {
    setGoals(performanceApi.getGoals());
    setCycles(performanceApi.getReviewCycles());
    setRatings(performanceApi.getRatings());
  }, []);

  const totalHeadcount = 428;
  const inReviewCount = 376;
  const pendingReviews = 52;
  const avgRating = '4.58 / 5.0';
  const goalsOnTrack = goals.filter(g => g.status === 'OnTrack').length + 1200;
  const goalsAtRisk = goals.filter(g => g.status === 'AtRisk').length + 40;
  const activePips = 4;
  const promotionRecs = 64;

  const kpis = [
    { key: 'reviews', label: 'Employees in Review', value: `${inReviewCount} / ${totalHeadcount}`, sub: 'Q3 2026 Appraisal Cycle', icon: Award, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { key: 'goals', label: 'OKRs & Goals On Track', value: goalsOnTrack, sub: '91.4% Target Completion', icon: Target, color: 'text-[#07563D]', bg: 'bg-emerald-50/70' },
    { key: 'ratings', label: 'Average Org Rating', value: avgRating, sub: 'Calibrated Final Rating', icon: TrendingUp, color: 'text-purple-700', bg: 'bg-purple-50' },
    { key: 'reviews', label: 'Pending Manager Reviews', value: pendingReviews, sub: 'Action Required', icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
    { key: 'promotions', label: 'Promotion Candidates', value: promotionRecs, sub: 'HiPo 9-Box Stars', icon: UserCheck, color: 'text-blue-700', bg: 'bg-blue-50' },
    { key: 'pip', label: 'Active PIP Plans', value: activePips, sub: 'Under Active Mentorship', icon: AlertTriangle, color: 'text-rose-700', bg: 'bg-rose-50' },
  ];

  const ratingDistributionData = [
    { rating: '5 - Exceptional (HiPo)', count: 64, fill: '#07563D' },
    { rating: '4 - Exceeds Expectations', count: 184, fill: '#059669' },
    { rating: '3 - Meets Expectations', count: 168, fill: '#3B82F6' },
    { rating: '2 - Needs Improvement', count: 8, fill: '#F59E0B' },
    { rating: '1 - Unsatisfactory (PIP)', count: 4, fill: '#E11D48' },
  ];

  const deptPerfData = [
    { dept: 'Engineering', avgScore: 4.65, goalCompletion: 92 },
    { dept: 'Product & Design', avgScore: 4.58, goalCompletion: 94 },
    { dept: 'Sales & Marketing', avgScore: 4.42, goalCompletion: 88 },
    { dept: 'HR & Ops', avgScore: 4.70, goalCompletion: 96 },
    { dept: 'Finance & Legal', avgScore: 4.51, goalCompletion: 90 },
  ];

  return (
    <div className="space-y-6">
      {/* Role Switcher Header */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#07563D]" />
          <div>
            <h2 className="text-sm font-black text-gray-900">Enterprise Performance Dashboard View</h2>
            <p className="text-[11px] text-gray-500">Perspective switches automatically based on RBAC scope</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {(['HRHead', 'Manager', 'Employee'] as const).map(role => (
            <button
              key={role}
              onClick={() => setRoleScope(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleScope === role ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {role === 'HRHead' ? 'HR Head View' : role === 'Manager' ? 'Manager View' : 'Employee Self View'}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab?.(kpi.key)}
              className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 transition-colors" />
              </div>
              <div className="mt-3">
                <span className="text-[11px] font-bold text-gray-500 block truncate">{kpi.label}</span>
                <span className="text-base font-black text-gray-900 font-mono tracking-tight block mt-0.5">{kpi.value}</span>
                <span className="text-[10px] text-gray-400 font-medium truncate block mt-0.5">{kpi.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Bell Curve Distribution */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#07563D]" />
                <span>Calibrated Performance Rating Distribution (Bell Curve)</span>
              </h3>
              <p className="text-[11px] text-gray-500">Distribution of Q3 2026 finalized employee performance ratings</p>
            </div>
            <Badge variant="emerald">Calibrated (Q3 2026)</Badge>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDistributionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="rating" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="count" fill="#07563D" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Comparison */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#07563D]" />
              <span>Department Goal Completion</span>
            </h3>
            <p className="text-[11px] text-gray-500">Average score & goal achievement per dept</p>
          </div>

          <div className="space-y-3 pt-2">
            {deptPerfData.map((d, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-800">
                  <span>{d.dept}</span>
                  <span className="font-mono text-[#07563D]">{d.goalCompletion}% Achieved ({d.avgScore}/5)</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#07563D]" style={{ width: `${d.goalCompletion}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
