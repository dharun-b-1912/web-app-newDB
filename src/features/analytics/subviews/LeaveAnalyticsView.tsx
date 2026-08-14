import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Calendar, CheckCircle2 } from 'lucide-react';

export const LeaveAnalyticsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#07563D]" />
            <span>Leave Utilization & Absence Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Leave utilization rate (78.5%), leave type distribution, and authorized vs unapproved absence breakdown</p>
        </div>
        <Badge variant="emerald">Formula: Leave Taken / Leave Available</Badge>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-gray-900">Leave Type Utilization Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="font-bold text-gray-900 block font-sans">Earned Leave (EL / Privilege)</span>
            <span className="text-lg font-black text-[#07563D]">72.4% Utilized</span>
            <p className="text-[11px] text-gray-500 font-sans">3.2 Days Avg Remaining Balance</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="font-bold text-gray-900 block font-sans">Casual Leave (CL)</span>
            <span className="text-lg font-black text-[#07563D]">84.1% Utilized</span>
            <p className="text-[11px] text-gray-500 font-sans">1.1 Days Avg Remaining Balance</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <span className="font-bold text-gray-900 block font-sans">Sick Leave (SL)</span>
            <span className="text-lg font-black text-[#07563D]">58.9% Utilized</span>
            <p className="text-[11px] text-gray-500 font-sans">4.5 Days Avg Remaining Balance</p>
          </div>
        </div>
      </div>
    </div>
  );
};
