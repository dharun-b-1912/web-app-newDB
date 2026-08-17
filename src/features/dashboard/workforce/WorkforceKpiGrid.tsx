import React from 'react';
import { Card } from '../../../components/ui/Card';
import {
  Users,
  UserCheck,
  CalendarOff,
  UserX,
  UserPlus,
  FileWarning,
  Briefcase,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export interface WorkforceKpiData {
  totalWorkforce: number;
  activeCount: number;
  presentCount: number;
  presentRatePct: number;
  onLeaveCount: number;
  absentCount: number;
  newJoinersThisMonth: number;
  exitsCount: number;
  openPositionsCount: number;
  growthPct?: number;
}

interface Props {
  data: WorkforceKpiData;
  onNavigate?: (route: string) => void;
}

export const WorkforceKpiGrid: React.FC<Props> = ({ data, onNavigate }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {/* 1. Total Workforce */}
      <Card
        onClick={() => onNavigate?.('people')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Total
          </span>
          <div className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center flex-shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-gray-900 block">{data.totalWorkforce}</span>
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
            {data.totalWorkforce === 0 ? 'No staff added' : `${data.totalWorkforce} Employees`}
          </span>
        </div>
      </Card>

      {/* 2. Active */}
      <Card
        onClick={() => onNavigate?.('people')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Active
          </span>
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-gray-900 block">{data.activeCount}</span>
          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">Confirmed Staff</span>
        </div>
      </Card>

      {/* 3. Present Today */}
      <Card
        onClick={() => onNavigate?.('attendance')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Present
          </span>
          <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-teal-900 block">{data.presentCount}</span>
          <span className="text-[10px] text-teal-700 font-bold block mt-0.5">
            {data.presentRatePct}% marked
          </span>
        </div>
      </Card>

      {/* 4. On Leave */}
      <Card
        onClick={() => onNavigate?.('leave-dashboard')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            On Leave
          </span>
          <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0">
            <CalendarOff className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-gray-900 block">{data.onLeaveCount}</span>
          <span className="text-[10px] text-rose-600 font-bold block mt-0.5">Approved</span>
        </div>
      </Card>

      {/* 5. Absent */}
      <Card
        onClick={() => onNavigate?.('attendance')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Absent
          </span>
          <div className="w-6 h-6 rounded-lg bg-red-50 text-red-700 flex items-center justify-center flex-shrink-0">
            <UserX className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-gray-900 block">{data.absentCount}</span>
          <span className="text-[10px] text-red-600 font-bold block mt-0.5">Unexcused</span>
        </div>
      </Card>

      {/* 6. New Joiners */}
      <Card
        onClick={() => onNavigate?.('onboarding')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            New Joiners
          </span>
          <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-blue-900 block">+{data.newJoinersThisMonth}</span>
          <span className="text-[10px] text-blue-700 font-bold block mt-0.5">This Month</span>
        </div>
      </Card>

      {/* 7. Exit / Notice */}
      <Card
        onClick={() => onNavigate?.('offboarding')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
            Exit / Notice
          </span>
          <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <FileWarning className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <span className="text-xl font-black text-amber-900 block">{data.exitsCount}</span>
          <span className="text-[10px] text-amber-700 font-bold block mt-0.5">Separation</span>
        </div>
      </Card>

      {/* 8. Open Positions */}
      <Card
        onClick={() => onNavigate?.('talent-recruitment')}
        className="p-3.5 space-y-2 border border-gray-100 hover:border-gray-200 shadow-sm cursor-pointer transition-all hover:shadow-md group"
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
          <span className="text-xl font-black text-purple-900 block">{data.openPositionsCount}</span>
          <span className="text-[10px] text-purple-700 font-bold block mt-0.5">Active Requisitions</span>
        </div>
      </Card>
    </div>
  );
};
