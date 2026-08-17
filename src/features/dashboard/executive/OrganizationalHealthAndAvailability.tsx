import React from 'react';
import { Card } from '../../../components/ui/Card';
import { ShieldCheck, CheckCircle, Clock, CalendarOff, AlertTriangle } from 'lucide-react';
import { ExecutiveSummaryMetrics } from '../../../services/executiveAnalyticsService';

interface Props {
  metrics: ExecutiveSummaryMetrics;
  onNavigate: (route: string) => void;
}

export const OrganizationalHealthAndAvailability: React.FC<Props> = ({ metrics, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Organizational Health & Governance */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Organizational Health & Governance
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Structure governance, supervisory hierarchy & profile completeness
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
            Governance Matrix
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Manager Coverage</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-gray-900">{metrics.managerCoveragePct}%</p>
            <p className="text-[10px] text-gray-400">Staff with active reporting leads</p>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Profile Completion</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-xl font-black text-gray-900">{metrics.profileCompletionPct}%</p>
            <p className="text-[10px] text-gray-400">Statutory info & emergency contacts</p>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Critical Vacancies</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xl font-black text-amber-900">{metrics.openPositionsCount}</p>
            <p className="text-[10px] text-gray-400">Key business requisitions open</p>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Compliance Index</span>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <p className="text-xl font-black text-indigo-900">{metrics.complianceRiskScore}/100</p>
            <p className="text-[10px] text-gray-400">Statutory audit health score</p>
          </div>
        </div>
      </Card>

      {/* 2. Workforce Availability & Absence Impact */}
      <Card className="p-5 space-y-4 border border-gray-100 shadow-sm bg-white">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-blue-600" />
              Workforce Availability & Absence
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Productive workforce capacity and attendance impact
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
            Attendance Live
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Attendance Rate</span>
            <p className="text-xl font-black text-emerald-900">{metrics.attendanceRatePct}%</p>
            <p className="text-[10px] text-emerald-600">On Duty / Present</p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 space-y-1">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Leave Rate</span>
            <p className="text-xl font-black text-amber-900">{metrics.leaveRatePct}%</p>
            <p className="text-[10px] text-amber-600">Approved Leave</p>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 space-y-1">
            <span className="text-[10px] font-bold text-rose-700 uppercase">Absence Rate</span>
            <p className="text-xl font-black text-rose-900">{metrics.absenceRatePct}%</p>
            <p className="text-[10px] text-rose-600">Unexcused</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-700">Planned vs Unplanned Absence Ratio</span>
          </div>
          <span className="font-black text-gray-900">
            {metrics.leaveRatePct > 0 ? `${metrics.leaveRatePct}% Planned` : 'Balanced'}
          </span>
        </div>
      </Card>
    </div>
  );
};
