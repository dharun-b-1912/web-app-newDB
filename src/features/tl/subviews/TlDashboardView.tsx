import React from 'react';
import { tlApi } from '../../../services/tlApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Award,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface TlDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const TlDashboardView: React.FC<TlDashboardViewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const summary = tlApi.getTeamSummary();

  const tlName = user?.name?.split(' ')?.[0] || 'Team Lead';

  const metrics = [
    { label: 'Team Strength', val: summary.total_strength, sub: 'Active Team Members', icon: Users, tab: 'my-team' },
    { label: 'Present Today', val: summary.present_count, sub: 'Geofence Verified', icon: UserCheck, tab: 'attendance' },
    { label: 'Absent Today', val: summary.absent_count, sub: '0 Unexcused', icon: UserX, tab: 'attendance' },
    { label: 'Late Arrival', val: summary.late_count, sub: '> 15 Min Delay', icon: Clock, tab: 'attendance' },
    { label: 'On Approved Leave', val: summary.on_leave_count, sub: '1 Casual Leave', icon: Calendar, tab: 'leave' },
    { label: 'Working WFH', val: summary.wfh_count, sub: 'Hybrid Approved', icon: Laptop, tab: 'attendance' },
    { label: 'Pending Approvals', val: summary.pending_approvals_count, sub: 'Requires Action', icon: CheckCircle2, tab: 'approvals' },
    { label: 'Overdue Tasks', val: summary.overdue_tasks_count, sub: 'Action Needed', icon: AlertTriangle, tab: 'tasks' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Greeting Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>WorkForceOS Team Operations</span>
            <span>•</span>
            <span>{summary.team_name}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Good Morning, {tlName}! (TL Operational Hub)</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
            Real-time team attendance monitoring, approval center, task dispatching, goal tracking & skill gap reviews.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Team Scope Isolation</span>
            <span className="text-sm font-black font-mono">{summary.total_strength} Scope-Bound Members</span>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={i}
              onClick={() => onNavigateTab?.(m.tab)}
              className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D]">
                  <Icon className="w-4 h-4" />
                </span>
                <Badge variant={m.label.includes('Overdue') || m.label.includes('Absent') ? 'amber' : 'emerald'}>
                  Live Data
                </Badge>
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">{m.label}</span>
                <span className="text-xl font-black text-gray-900 font-mono block mt-0.5">{m.val}</span>
                <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">{m.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Alerts */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#07563D]" />
          <span>Team Operations Alerts & Action Items</span>
        </h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-100 flex justify-between items-center cursor-pointer" onClick={() => onNavigateTab?.('approvals')}>
            <div>
              <span className="font-bold text-amber-900 block">5 Pending Team Approvals</span>
              <span className="text-amber-700 font-sans text-[11px]">1 WFH Request, 1 Attendance Regularization, 3 Leave Requests</span>
            </div>
            <Button size="sm" variant="outline">Review Approvals</Button>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 flex justify-between items-center cursor-pointer" onClick={() => onNavigateTab?.('tasks')}>
            <div>
              <span className="font-bold text-rose-900 block">4 Overdue Sprint Tasks</span>
              <span className="text-rose-700 font-sans text-[11px]">Task TSK-ENG-402 is 2 days overdue for Karthik Raja</span>
            </div>
            <Button size="sm" variant="outline">View Overdue Tasks</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
