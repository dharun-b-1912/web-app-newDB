import React from 'react';
import { HRKpiCard } from './HRKpiCard';
import {
  Users,
  Clock,
  UserPlus,
  CalendarOff,
  UserCheck,
  LifeBuoy,
} from 'lucide-react';

export interface HRKpiSummaryData {
  activeWorkforce: number;
  newJoinersCount: number;
  newJoinersGrowthPct?: number;
  pendingApprovalsCount: number;
  onLeaveTodayCount: number;
  presentTodayCount: number;
  presentTodayPct: number;
  openRequestsCount: number;
}

interface Props {
  data: HRKpiSummaryData;
  onNavigate?: (route: string) => void;
  onOpenApprovals?: () => void;
}

export const HRKpiGrid: React.FC<Props> = ({ data, onNavigate, onOpenApprovals }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* 1. Active Workforce */}
      <HRKpiCard
        label="Active Workforce"
        value={data.activeWorkforce}
        subtext="Headcount confirmed"
        badge={
          data.newJoinersCount > 0
            ? { text: `+${data.newJoinersCount} new`, variant: 'positive' }
            : undefined
        }
        icon={Users}
        iconBgColor="bg-emerald-50"
        iconColor="text-[#07563D]"
        onClick={() => onNavigate?.('people')}
      />

      {/* 2. Pending Approvals */}
      <HRKpiCard
        label="Pending Approvals"
        value={data.pendingApprovalsCount}
        subtext={data.pendingApprovalsCount > 0 ? 'Requires action' : 'All clear'}
        badge={
          data.pendingApprovalsCount > 0
            ? { text: 'Action Needed', variant: 'warning' }
            : { text: '0 Pending', variant: 'neutral' }
        }
        icon={Clock}
        iconBgColor="bg-amber-50"
        iconColor="text-amber-700"
        onClick={onOpenApprovals}
      />

      {/* 3. New Joiners */}
      <HRKpiCard
        label="New Joiners"
        value={data.newJoinersCount}
        subtext="Last 30 days cohort"
        badge={data.newJoinersCount > 0 ? { text: 'Active onboarding', variant: 'info' } : undefined}
        icon={UserPlus}
        iconBgColor="bg-blue-50"
        iconColor="text-blue-700"
        onClick={() => onNavigate?.('onboarding')}
      />

      {/* 4. On Leave Today */}
      <HRKpiCard
        label="On Leave Today"
        value={data.onLeaveTodayCount}
        subtext="Approved absences"
        badge={data.onLeaveTodayCount > 0 ? { text: 'Approved', variant: 'warning' } : { text: '0 on leave', variant: 'neutral' }}
        icon={CalendarOff}
        iconBgColor="bg-rose-50"
        iconColor="text-rose-700"
        onClick={() => onNavigate?.('leave-dashboard')}
      />

      {/* 5. Attendance Today */}
      <HRKpiCard
        label="Attendance Today"
        value={`${data.presentTodayCount}`}
        subtext={`${data.presentTodayPct}% marked present`}
        badge={{
          text: `${data.presentTodayPct}%`,
          variant: data.presentTodayPct >= 90 ? 'positive' : 'warning',
        }}
        icon={UserCheck}
        iconBgColor="bg-teal-50"
        iconColor="text-teal-700"
        onClick={() => onNavigate?.('attendance')}
      />

      {/* 6. Open HR Requests */}
      <HRKpiCard
        label="Open HR Requests"
        value={data.openRequestsCount}
        subtext="Employee inquiries"
        badge={data.openRequestsCount > 0 ? { text: 'In Queue', variant: 'info' } : { text: '0 open', variant: 'neutral' }}
        icon={LifeBuoy}
        iconBgColor="bg-purple-50"
        iconColor="text-purple-700"
        onClick={() => onNavigate?.('admin-helpdesk')}
      />
    </div>
  );
};
