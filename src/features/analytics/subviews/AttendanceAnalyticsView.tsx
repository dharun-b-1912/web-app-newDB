import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Clock, CheckCircle2 } from 'lucide-react';

export const AttendanceAnalyticsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#07563D]" />
            <span>Attendance & Workforce Time Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Attendance rate (96.4%), absence rate (3.6%), late arrivals, overtime hours, and hybrid WFH roster trends</p>
        </div>
        <Badge variant="emerald">Formula: (Present / Expected Days) * 100</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 block">Attendance Rate</span>
          <span className="text-2xl font-black text-[#07563D] font-mono mt-1 block">96.4%</span>
          <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Excludes Approved Leave</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 block">Absence Rate</span>
          <span className="text-2xl font-black text-amber-700 font-mono mt-1 block">3.6%</span>
          <span className="text-[11px] text-amber-600 font-semibold mt-0.5 block">Unexcused & Sick Absence</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 block">Monthly Overtime Hours</span>
          <span className="text-2xl font-black text-gray-900 font-mono mt-1 block">1,420 Hrs</span>
          <span className="text-[11px] text-gray-500 font-semibold mt-0.5 block">₹4.25L Spend</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 block">Hybrid WFH Days Ratio</span>
          <span className="text-2xl font-black text-blue-700 font-mono mt-1 block">18.5%</span>
          <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">Approved Policy Roster</span>
        </div>
      </div>
    </div>
  );
};
