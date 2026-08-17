import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import {
  Activity,
  UserCheck,
  FileCheck,
  UserPlus,
  ArrowRightLeft,
  DollarSign,
  Clock,
  FileText,
  UserMinus,
  CheckCircle2,
} from 'lucide-react';
import { DashboardEmptyState } from './DashboardEmptyState';

export interface RecentHRActivityItem {
  id: string;
  actorName: string;
  actorAvatar?: string;
  action: string;
  target: string;
  timestamp: string;
  type?: 'employee_joined' | 'leave_approved' | 'attendance_regularized' | 'salary_updated' | 'doc_uploaded' | 'onboarding_done' | 'exit_done' | 'general';
  linkRoute?: string;
}

interface Props {
  activities: RecentHRActivityItem[];
  onNavigate?: (route: string) => void;
  onViewAllLogs: () => void;
}

export const RecentHRActivity: React.FC<Props> = ({
  activities,
  onNavigate,
  onViewAllLogs,
}) => {
  const getActivityIcon = (type?: RecentHRActivityItem['type']) => {
    switch (type) {
      case 'employee_joined':
      case 'onboarding_done':
        return <div className="p-2 rounded-lg bg-emerald-50 text-[#07563D]"><UserPlus className="w-3.5 h-3.5" /></div>;
      case 'leave_approved':
        return <div className="p-2 rounded-lg bg-amber-50 text-amber-700"><FileCheck className="w-3.5 h-3.5" /></div>;
      case 'attendance_regularized':
        return <div className="p-2 rounded-lg bg-teal-50 text-teal-700"><UserCheck className="w-3.5 h-3.5" /></div>;
      case 'salary_updated':
        return <div className="p-2 rounded-lg bg-purple-50 text-purple-700"><DollarSign className="w-3.5 h-3.5" /></div>;
      case 'doc_uploaded':
        return <div className="p-2 rounded-lg bg-blue-50 text-blue-700"><FileText className="w-3.5 h-3.5" /></div>;
      case 'exit_done':
        return <div className="p-2 rounded-lg bg-rose-50 text-rose-700"><UserMinus className="w-3.5 h-3.5" /></div>;
      default:
        return <div className="p-2 rounded-lg bg-gray-50 text-gray-700"><Activity className="w-3.5 h-3.5" /></div>;
    }
  };

  return (
    <Card className="p-6 space-y-4 border border-gray-100/90 shadow-sm bg-white">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight">
              Recent HR Activity Stream
            </h2>
            <p className="text-xs text-gray-500">Live operational audit log of HR lifecycle events</p>
          </div>
        </div>

        <button
          onClick={onViewAllLogs}
          className="text-xs font-bold text-[#07563D] hover:underline"
        >
          View Audit Logs
        </button>
      </div>

      {activities.length === 0 ? (
        <DashboardEmptyState
          icon={CheckCircle2}
          title="No HR activity recorded yet"
          description="Operational events like approvals, employee additions, and status changes will stream here live."
        />
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 6).map((act) => (
            <div
              key={act.id}
              onClick={() => act.linkRoute && onNavigate?.(act.linkRoute)}
              className={`flex items-center justify-between p-3 rounded-xl hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-100 ${
                act.linkRoute ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {getActivityIcon(act.type)}
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-medium text-gray-900">
                    <span className="font-bold text-gray-950">{act.actorName}</span>{' '}
                    <span className="text-gray-600">{act.action}</span>{' '}
                    <span className="font-semibold text-[#07563D]">{act.target}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">
                    {act.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
