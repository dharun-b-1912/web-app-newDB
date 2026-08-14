import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveRequest, HolidayCalendar, LeaveEntitlement } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Users,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertCircle,
  Calendar,
  Gift,
  Coins,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';

interface LeaveDashboardViewProps {
  onSelectKpiFilter?: (filterKey: string) => void;
  onOpenRequestDetails?: (request: LeaveRequest) => void;
}

export const LeaveDashboardView: React.FC<LeaveDashboardViewProps> = ({
  onSelectKpiFilter,
  onOpenRequestDetails,
}) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);

  useEffect(() => {
    setRequests(leaveApi.getLeaveRequests());
    setCalendars(leaveApi.getHolidayCalendars());
    setEntitlements(leaveApi.getEntitlements());
  }, []);

  // KPI Calculations
  const totalEmployees = 428;
  const onLeaveToday = requests.filter(r => r.status === 'Approved' && r.from_date <= '2026-08-12' && r.to_date >= '2026-08-12').length + 3;
  const pendingRequests = requests.filter(r => r.status === 'Pending').length;
  const approvedRequests = requests.filter(r => r.status === 'Approved').length;
  const rejectedRequests = requests.filter(r => r.status === 'Rejected').length;
  const monthLeaveDays = requests.filter(r => r.status === 'Approved').reduce((acc, curr) => acc + curr.leave_days_deducted, 0) + 14;
  const leaveBalancePending = 18;
  const lopDays = 4;
  const compOffBalance = 12;
  const encashmentPending = leaveApi.getEncashments().filter(e => e.status === 'Submitted').length;
  const upcomingHolidays = calendars.flatMap(c => c.holidays).filter(h => h.date >= '2026-08-12').length;
  const returningToday = 2;
  const goingTomorrow = 4;

  const kpis = [
    { key: 'total-employees', label: 'Total Headcount', value: totalEmployees, icon: Users, color: 'text-gray-900', bg: 'bg-gray-100' },
    { key: 'on-leave-today', label: 'On Leave Today', value: onLeaveToday, icon: UserX, color: 'text-amber-700', bg: 'bg-amber-50' },
    { key: 'pending-requests', label: 'Pending Requests', value: pendingRequests, icon: Clock, color: 'text-blue-700', bg: 'bg-blue-50' },
    { key: 'approved-requests', label: 'Approved Requests', value: approvedRequests, icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { key: 'rejected-requests', label: 'Rejected Requests', value: rejectedRequests, icon: XCircle, color: 'text-rose-700', bg: 'bg-rose-50' },
    { key: 'month-leave-days', label: 'Leave Days (Aug)', value: monthLeaveDays, icon: CalendarDays, color: 'text-purple-700', bg: 'bg-purple-50' },
    { key: 'lop-days', label: 'LOP Days', value: lopDays, icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50' },
    { key: 'comp-off-balance', label: 'Comp Off Pool', value: compOffBalance, icon: Gift, color: 'text-teal-700', bg: 'bg-teal-50' },
    { key: 'encashment-pending', label: 'Encashment Requests', value: encashmentPending, icon: Coins, color: 'text-amber-700', bg: 'bg-amber-50' },
    { key: 'upcoming-holidays', label: 'Upcoming Holidays', value: upcomingHolidays, icon: Calendar, color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { key: 'returning-today', label: 'Returning Today', value: returningToday, icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { key: 'going-tomorrow', label: 'On Leave Tomorrow', value: goingTomorrow, icon: ArrowUpRight, color: 'text-[#07563D]', bg: 'bg-emerald-50/60' },
  ];

  // Chart Mock Datasets
  const leaveByTypeData = [
    { name: 'Privilege Leave', value: 45, color: '#07563D' },
    { name: 'Casual Leave', value: 28, color: '#059669' },
    { name: 'Sick Leave', value: 18, color: '#3B82F6' },
    { name: 'Comp Off', value: 6, color: '#0D9488' },
    { name: 'Maternity/Paternity', value: 3, color: '#8B5CF6' },
  ];

  const leaveByDeptData = [
    { dept: 'Engineering', count: 38 },
    { dept: 'Product', count: 18 },
    { dept: 'Sales', count: 24 },
    { dept: 'HR & Operations', count: 12 },
    { dept: 'Customer Success', count: 15 },
  ];

  const leaveTrendData = [
    { month: 'Mar', leaveDays: 42, lopDays: 2, compOff: 5 },
    { month: 'Apr', leaveDays: 58, lopDays: 3, compOff: 8 },
    { month: 'May', leaveDays: 64, lopDays: 1, compOff: 12 },
    { month: 'Jun', leaveDays: 51, lopDays: 4, compOff: 6 },
    { month: 'Jul', leaveDays: 72, lopDays: 2, compOff: 9 },
    { month: 'Aug', leaveDays: 61, lopDays: 4, compOff: 7 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards Strip (Grid of Clickable Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.key}
              onClick={() => onSelectKpiFilter && onSelectKpiFilter(kpi.key)}
              className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md hover:border-[#07563D]/30 transition-all text-left flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#07563D] transition-colors" />
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-gray-900 tracking-tight">{kpi.value}</div>
                <div className="text-[11px] font-bold text-gray-500 mt-0.5 line-clamp-1">{kpi.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Charts Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leave Trend & LOP Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <LineChart className="w-4 h-4 text-[#07563D]" />
                <span>Monthly Leave & LOP Trend</span>
              </h3>
              <p className="text-xs text-gray-500">6-Month comparison of approved leave days vs loss of pay</p>
            </div>
            <Badge variant="emerald" size="sm">
              Current Period 2026
            </Badge>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={leaveTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="leaveDays" name="Paid Leave Days" stroke="#07563D" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="lopDays" name="LOP Days" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="compOff" name="Comp Off Used" stroke="#0d9488" strokeWidth={2} strokeDasharray="4 4" />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leave Type Share Pie */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#07563D]" />
              <span>Leave Type Breakdown</span>
            </h3>
          </div>
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leaveByTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {leaveByTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
            {leaveByTypeData.map(item => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600 font-medium truncate">{item.name}</span>
                <span className="font-bold text-gray-900 ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Row: Department Utilization & Actionable Pending List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave by Department Bar */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#07563D]" />
              <span>Leave Consumption by Department</span>
            </h3>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveByDeptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#07563D" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Requests Direct Queue */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#07563D]" />
                <span>Pending Approvals Queue</span>
              </h3>
              <Badge variant="amber" size="sm">
                {pendingRequests} Action Required
              </Badge>
            </div>
            <div className="divide-y divide-gray-100 mt-2">
              {requests
                .filter(r => r.status === 'Pending')
                .slice(0, 3)
                .map(req => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          req.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(req.employee_name)}&background=07563D&color=fff`
                        }
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{req.employee_name}</h4>
                        <p className="text-[11px] text-gray-500">
                          {req.leave_type_name} • {req.leave_days_deducted} Day(s) ({req.from_date})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenRequestDetails && onOpenRequestDetails(req)}
                      className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-[#07563D] hover:text-white border border-gray-200 text-xs font-bold transition-all text-gray-700"
                    >
                      Review
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
