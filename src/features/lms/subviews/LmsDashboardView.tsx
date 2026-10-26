import React, { useState, useEffect } from 'react';
import {
  lmsRealtimeService,
  LmsDashboardRealtimeData,
} from '../../../services/lms/lmsRealtimeService';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  AlertTriangle,
  Users,
  ChevronRight,
  Sparkles,
  BarChart3,
  RefreshCw,
  Play,
  Check,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface LmsDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const LmsDashboardView: React.FC<LmsDashboardViewProps> = ({ onNavigateTab }) => {
  const [roleScope, setRoleScope] = useState<'HRHead' | 'Manager' | 'Employee'>('HRHead');
  const [metrics, setMetrics] = useState<LmsDashboardRealtimeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadRealtimeMetrics = async () => {
    setLoading(true);
    try {
      const data = await lmsRealtimeService.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('[LmsDashboard] Error fetching realtime metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealtimeMetrics();
  }, [roleScope]);

  // Dynamic KPIs depending on user role scope
  const kpis =
    roleScope === 'Employee'
      ? [
          {
            key: 'courses',
            label: 'My Enrolled Courses',
            value: metrics?.employeeMetrics?.enrolledCount ?? 0,
            sub: 'Assigned Modules',
            icon: BookOpen,
            color: 'text-emerald-700',
            bg: 'bg-emerald-50',
          },
          {
            key: 'courses',
            label: 'Completed Courses',
            value: metrics?.employeeMetrics?.completedCount ?? 0,
            sub: 'Verified Certifications',
            icon: CheckCircle2,
            color: 'text-emerald-800',
            bg: 'bg-emerald-100/60',
          },
          {
            key: 'courses',
            label: 'In Progress / Watching',
            value: metrics?.employeeMetrics?.inProgressCount ?? 0,
            sub: 'Active Video Playback',
            icon: Clock,
            color: 'text-amber-700',
            bg: 'bg-amber-50',
          },
          {
            key: 'assessments',
            label: 'Average Score',
            value: `${metrics?.employeeMetrics?.avgScore ?? 0}%`,
            sub: 'Assessment Results',
            icon: Award,
            color: 'text-purple-700',
            bg: 'bg-purple-50',
          },
          {
            key: 'mandatory',
            label: 'My Completion Rate',
            value: `${
              metrics?.employeeMetrics?.enrolledCount
                ? Math.round(
                    ((metrics.employeeMetrics.completedCount || 0) / metrics.employeeMetrics.enrolledCount) * 100
                  )
                : 0
            }%`,
            sub: 'Training Progress',
            icon: Award,
            color: 'text-blue-700',
            bg: 'bg-blue-50',
          },
          {
            key: 'certifications',
            label: 'Action Required',
            value:
              (metrics?.employeeMetrics?.enrolledCount ?? 0) - (metrics?.employeeMetrics?.completedCount ?? 0),
            sub: 'Pending Completion',
            icon: AlertTriangle,
            color: 'text-rose-700',
            bg: 'bg-rose-50',
          },
        ]
      : [
          {
            key: 'courses',
            label: 'Active LMS Courses',
            value: metrics?.totalCourses ?? 0,
            sub: 'Live Supabase Catalog',
            icon: BookOpen,
            color: 'text-emerald-700',
            bg: 'bg-emerald-50',
          },
          {
            key: 'programs',
            label: 'Active Programs',
            value: metrics?.activePrograms ?? 0,
            sub: 'Category Tracks',
            icon: GraduationCap,
            color: 'text-[#07563D]',
            bg: 'bg-emerald-50/70',
          },
          {
            key: 'enrollment',
            label: 'Total Enrollments',
            value: metrics?.totalEnrollments ?? 0,
            sub: 'Active Employee Learners',
            icon: Users,
            color: 'text-blue-700',
            bg: 'bg-blue-50',
          },
          {
            key: 'mandatory',
            label: 'Mandatory Compliance',
            value: metrics?.mandatoryCompliance ?? '0%',
            sub: 'Live Audit Telemetry',
            icon: CheckCircle2,
            color: 'text-purple-700',
            bg: 'bg-purple-50',
          },
          {
            key: 'certifications',
            label: 'Pending Action',
            value: metrics?.expiringCerts ?? 0,
            sub: 'Uncompleted Learner Tasks',
            icon: AlertTriangle,
            color: 'text-amber-700',
            bg: 'bg-amber-50',
          },
          {
            key: 'skills',
            label: 'Overall Completion Rate',
            value: metrics?.completionRate ?? '0%',
            sub: `Avg Assessment Score: ${metrics?.averageScore ?? 0}%`,
            icon: Award,
            color: 'text-rose-700',
            bg: 'bg-rose-50',
          },
        ];

  return (
    <div className="space-y-6">
      {/* Role Switcher Header & Live Refresh */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-[#07563D]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-gray-900">Learning & LMS Intelligence Dashboard</h2>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-[#07563D] px-2 py-0.5 rounded-full">
                LIVE PRODUCTION
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              {roleScope === 'HRHead'
                ? 'Enterprise-wide compliance, course completions, and assessment metrics from Supabase'
                : roleScope === 'Manager'
                ? 'Departmental employee watch progress and test verification telemetry'
                : 'Personal learning path, video watch verification, and assessment scores'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {(['HRHead', 'Manager', 'Employee'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleScope(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  roleScope === role ? 'bg-[#07563D] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {role === 'HRHead' ? 'HR Head View' : role === 'Manager' ? 'Manager View' : 'Employee Self View'}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadRealtimeMetrics}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Sync
          </Button>
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
              className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 transition-colors" />
              </div>
              <div className="mt-3">
                <span className="text-[11px] font-bold text-gray-500 block truncate">{kpi.label}</span>
                <span className="text-base font-black text-gray-900 font-mono tracking-tight block mt-0.5">
                  {loading ? '...' : kpi.value}
                </span>
                <span className="text-[10px] text-gray-400 font-medium truncate block mt-0.5">{kpi.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Chart & Live Course Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#07563D]" />
              <span>Realtime Course Completion Analytics</span>
            </h3>
            <p className="text-[11px] text-gray-500">
              Live comparison of total enrolled vs completed learners across active courses
            </p>
          </div>
          <Badge variant="emerald">Live Telemetry</Badge>
        </div>

        {loading ? (
          <div className="h-64 w-full flex items-center justify-center text-xs text-gray-400 animate-pulse">
            Loading real-time course analytics...
          </div>
        ) : !metrics || metrics.courseCompletionData.length === 0 ? (
          <div className="h-64 w-full flex flex-col items-center justify-center text-xs text-gray-400 space-y-2 border border-dashed border-gray-200 rounded-xl">
            <BookOpen className="w-8 h-8 text-gray-300" />
            <p className="font-semibold text-gray-600">No LMS courses published yet</p>
            <Button size="sm" onClick={() => onNavigateTab?.('courses')}>
              Go to Courses & Player
            </Button>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.courseCompletionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none',
                  }}
                />
                <Bar dataKey="enrolled" name="Total Enrolled" fill="#CBD5E1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#07563D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Employee Personal Progress List (When in Employee View) */}
      {roleScope === 'Employee' && metrics?.employeeMetrics && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#07563D]" />
                <span>My Course Modules & Verification Status</span>
              </h3>
              <p className="text-[11px] text-gray-500">Live progress tracking and assessment scores</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {metrics.employeeMetrics.myCourses.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No courses assigned to your account.</div>
            ) : (
              metrics.employeeMetrics.myCourses.map((c) => (
                <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50/80 transition-colors">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-[#07563D] uppercase bg-emerald-50 px-2 py-0.5 rounded">
                      {c.category}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900">{c.title}</h4>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#07563D] rounded-full" style={{ width: `${c.progress}%` }} />
                      </div>
                      <span className="font-mono text-[10px] font-bold text-gray-600">{c.progress}%</span>
                    </div>

                    <div className="font-mono font-bold text-xs">
                      {c.score !== null ? (
                        <span className="text-emerald-700">{c.score}%</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>

                    <div>
                      {c.status === 'COMPLETED' ? (
                        <Badge variant="emerald">Completed</Badge>
                      ) : (
                        <Badge variant="amber">Pending</Badge>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigateTab?.('courses')}
                      leftIcon={<Play className="w-3 h-3 text-[#07563D]" />}
                      className="text-[11px] h-7 px-2"
                    >
                      {c.status === 'COMPLETED' ? 'Review' : 'Resume'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
