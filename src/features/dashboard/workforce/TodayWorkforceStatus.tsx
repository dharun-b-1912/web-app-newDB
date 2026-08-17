import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { UserCheck, Clock, CalendarOff, Laptop, UserX, HelpCircle, ArrowRight, Compass } from 'lucide-react';

export interface TodayAttendanceSnapshot {
  total: number;
  present: number;
  late: number;
  leave: number;
  wfh: number;
  field: number;
  absent: number;
  notMarked: number;
  presentPct: number;
}

interface Props {
  data: TodayAttendanceSnapshot;
  onOpenAttendance: () => void;
}

export const TodayWorkforceStatus: React.FC<Props> = ({ data, onOpenAttendance }) => {
  return (
    <Card className="p-6 space-y-4 border border-gray-100 shadow-sm bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <h3 className="text-base font-black text-gray-900 tracking-tight">
            Today's Workforce Operational Status
          </h3>
          <p className="text-xs text-gray-500">
            Real-time biometric punch sync, mobile GPS check-ins, and approved absence reconciliation.
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-2xl font-black text-[#07563D]">{data.presentPct}%</span>
          <span className="block text-[10px] uppercase font-bold text-gray-400">Present Rate</span>
        </div>
      </div>

      {/* Progress Breakdown Bar */}
      <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden flex">
        {data.total > 0 && (
          <>
            <div style={{ width: `${(data.present / data.total) * 100}%` }} className="bg-emerald-600 h-full" title={`Present: ${data.present}`} />
            <div style={{ width: `${(data.late / data.total) * 100}%` }} className="bg-amber-500 h-full" title={`Late: ${data.late}`} />
            <div style={{ width: `${(data.wfh / data.total) * 100}%` }} className="bg-blue-500 h-full" title={`WFH: ${data.wfh}`} />
            <div style={{ width: `${(data.field / data.total) * 100}%` }} className="bg-purple-500 h-full" title={`Field: ${data.field}`} />
            <div style={{ width: `${(data.leave / data.total) * 100}%` }} className="bg-rose-500 h-full" title={`Leave: ${data.leave}`} />
            <div style={{ width: `${(data.absent / data.total) * 100}%` }} className="bg-red-600 h-full" title={`Absent: ${data.absent}`} />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
        {[
          { label: 'Present', count: data.present, color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: UserCheck },
          { label: 'Late Punch', count: data.late, color: 'text-amber-700 bg-amber-50 border-amber-100', icon: Clock },
          { label: 'Work From Home', count: data.wfh, color: 'text-blue-700 bg-blue-50 border-blue-100', icon: Laptop },
          { label: 'Field Work', count: data.field, color: 'text-purple-700 bg-purple-50 border-purple-100', icon: Compass },
          { label: 'On Leave', count: data.leave, color: 'text-rose-700 bg-rose-50 border-rose-100', icon: CalendarOff },
          { label: 'Absent', count: data.absent, color: 'text-red-700 bg-red-50 border-red-100', icon: UserX },
          { label: 'Not Marked', count: data.notMarked, color: 'text-gray-700 bg-gray-50 border-gray-100', icon: HelpCircle },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`p-3 rounded-xl border ${item.color} space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold truncate">{item.label}</span>
                <Icon className="w-3.5 h-3.5 opacity-80" />
              </div>
              <span className="text-lg font-black block">{item.count}</span>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-gray-100 flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          onClick={onOpenAttendance}
          className="text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100"
        >
          Open Attendance Master
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </Card>
  );
};
