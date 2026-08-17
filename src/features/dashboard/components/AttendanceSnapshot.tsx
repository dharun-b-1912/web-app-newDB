import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  UserCheck,
  UserX,
  Clock,
  CalendarOff,
  Laptop,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

export interface AttendanceBreakdownData {
  totalCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onLeaveCount: number;
  wfhCount: number;
  notMarkedCount: number;
  presentRatePct: number;
}

interface Props {
  data: AttendanceBreakdownData;
  onViewAttendance: () => void;
}

export const AttendanceSnapshot: React.FC<Props> = ({ data, onViewAttendance }) => {
  const items = [
    { label: 'Present', count: data.presentCount, color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: UserCheck },
    { label: 'Late Arrival', count: data.lateCount, color: 'text-amber-700 bg-amber-50 border-amber-100', icon: Clock },
    { label: 'On Leave', count: data.onLeaveCount, color: 'text-rose-700 bg-rose-50 border-rose-100', icon: CalendarOff },
    { label: 'Remote / WFH', count: data.wfhCount, color: 'text-blue-700 bg-blue-50 border-blue-100', icon: Laptop },
    { label: 'Absent', count: data.absentCount, color: 'text-red-700 bg-red-50 border-red-100', icon: UserX },
    { label: 'Not Marked', count: data.notMarkedCount, color: 'text-gray-700 bg-gray-50 border-gray-100', icon: HelpCircle },
  ];

  return (
    <Card className="p-6 space-y-4 border border-gray-100/90 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-gray-900 tracking-tight">
            Today's Workforce Attendance
          </h2>
          <p className="text-xs text-gray-500">Live check-in and shift reconciliation</p>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-[#07563D]">
            {data.presentRatePct}%
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-400">
            Attendance Rate
          </span>
        </div>
      </div>

      {/* Progress Bar Visual */}
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
        {data.totalCount > 0 && (
          <>
            <div
              style={{ width: `${(data.presentCount / data.totalCount) * 100}%` }}
              className="bg-emerald-600 h-full"
              title={`Present: ${data.presentCount}`}
            />
            <div
              style={{ width: `${(data.lateCount / data.totalCount) * 100}%` }}
              className="bg-amber-500 h-full"
              title={`Late: ${data.lateCount}`}
            />
            <div
              style={{ width: `${(data.wfhCount / data.totalCount) * 100}%` }}
              className="bg-blue-500 h-full"
              title={`WFH: ${data.wfhCount}`}
            />
            <div
              style={{ width: `${(data.onLeaveCount / data.totalCount) * 100}%` }}
              className="bg-rose-500 h-full"
              title={`On Leave: ${data.onLeaveCount}`}
            />
            <div
              style={{ width: `${(data.absentCount / data.totalCount) * 100}%` }}
              className="bg-red-500 h-full"
              title={`Absent: ${data.absentCount}`}
            />
          </>
        )}
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.label}
              className={`p-3 rounded-xl border ${it.color} flex items-center justify-between`}
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-bold block truncate">{it.label}</span>
                <span className="text-base font-black block">{it.count}</span>
              </div>
              <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-gray-100">
        <Button
          size="sm"
          variant="secondary"
          onClick={onViewAttendance}
          className="w-full text-xs font-bold text-gray-700 hover:text-gray-900 justify-center"
        >
          View Attendance Master Logs
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </Card>
  );
};
