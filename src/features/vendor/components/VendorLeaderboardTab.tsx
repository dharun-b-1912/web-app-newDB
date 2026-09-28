// src/features/vendor/components/VendorLeaderboardTab.tsx
// ============================================================================
// Joy PeopleHR — Transparent Workforce Performance & Attendance Analytics Workspace
// Multi-factor attendance rates, punctuality, work-hour compliance, and OT segregation
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Filter,
  Search,
  Eye,
  X,
  TrendingUp,
  Calendar,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  VendorPerformanceService,
  WorkerAttendanceMetric,
  PerformanceSummaryOverview,
} from '../../../services/vendor/vendorPerformanceService';

interface Props {
  vendorId?: string;
  siteId?: string;
}

export const VendorLeaderboardTab: React.FC<Props> = ({
  vendorId,
  siteId,
}) => {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<PerformanceSummaryOverview | null>(null);
  const [records, setRecords] = useState<WorkerAttendanceMetric[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'SCORE' | 'ATTENDANCE' | 'ON_TIME' | 'OT'>('SCORE');
  const [selectedWorker, setSelectedWorker] = useState<WorkerAttendanceMetric | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  useEffect(() => {
    if (!vendorId) {
      setOverview({
        totalWorkers: 0,
        averageAttendanceRate: 0,
        averageOnTimeRate: 0,
        averageWorkHourCompliance: 0,
        totalApprovedOtHours: 0,
        totalUnapprovedOtHours: 0,
        totalExceptions: 0,
        dataFreshnessTimestamp: new Date().toISOString(),
        isDemoMode: false,
      });
      setRecords([]);
      return;
    }
    const loadPerformance = async () => {
      setLoading(true);
      const data = await VendorPerformanceService.getWorkforcePerformanceMetrics({
        vendorId,
        siteId,
      });
      setOverview(data.overview);
      setRecords(data.records);
      setLoading(false);
    };
    loadPerformance();
  }, [vendorId, siteId]);

  const filteredRecords = records
    .filter((r) => {
      const matchesSearch =
        r.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.workerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesShift = shiftFilter === 'ALL' || r.shift.toLowerCase().includes(shiftFilter.toLowerCase());
      return matchesSearch && matchesShift;
    })
    .sort((a, b) => {
      if (sortBy === 'SCORE') return b.overallScore - a.overallScore;
      if (sortBy === 'ATTENDANCE') return b.attendanceRatePct - a.attendanceRatePct;
      if (sortBy === 'ON_TIME') return b.onTimeRatePct - a.onTimeRatePct;
      if (sortBy === 'OT') return b.approvedOtHours - a.approvedOtHours;
      return 0;
    });

  const handleExportCsv = () => {
    const headers = [
      'Worker Code',
      'Worker Name',
      'Role',
      'Shift',
      'Present Days',
      'Scheduled Days',
      'Attendance %',
      'On-Time %',
      'Late Minutes',
      'Worked Hours',
      'Approved OT (Hrs)',
      'Unapproved OT (Hrs)',
      'Data Completeness %',
      'Composite Score',
    ];
    const rows = filteredRecords.map((r) => [
      r.workerCode,
      `"${r.workerName}"`,
      `"${r.role}"`,
      `"${r.shift}"`,
      r.presentDays,
      r.scheduledDays,
      `${r.attendanceRatePct}%`,
      `${r.onTimeRatePct}%`,
      r.totalLateMinutes,
      r.actualWorkedHours,
      r.approvedOtHours,
      r.unapprovedOtHours,
      `${r.dataCompletenessPct}%`,
      r.overallScore,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `workforce_performance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Workforce Performance &amp; Attendance Analytics</h2>
            <span className="bg-emerald-50 text-[#047857] border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              Live Production Rules
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Mathematical scoring transparently derived from verified clocking records: Attendance Rate (40%) + On-Time Punctuality (25%) + Work Hours Compliance (20%) + Task Completion (15%). Unapproved overtime is strictly segregated.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#047857] hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Analytics CSV
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Attendance Rate</span>
              <Users className="w-5 h-5 text-[#047857]" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {overview.averageAttendanceRate}%
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Across {overview.totalWorkers} Deployed Workers
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">On-Time Punctuality</span>
              <Clock className="w-5 h-5 text-[#047857]" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {overview.averageOnTimeRate}%
            </div>
            <div className="text-[11px] text-gray-500 mt-1">15-Minute Grace Period Applied</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Approved Overtime</span>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {overview.totalApprovedOtHours} hrs
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-1">
              + {overview.totalUnapprovedOtHours} hrs pending verification
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Exceptions Flagged</span>
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {overview.totalExceptions}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Missing in/out punches &amp; tardiness</div>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by worker name, code, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#047857]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Shift:</span>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-800 font-medium cursor-pointer focus:border-[#047857]"
            >
              <option value="ALL">All Shifts</option>
              <option value="Morning">Morning Shift</option>
              <option value="General">General Shift</option>
              <option value="Night">Night Shift</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-800 font-medium cursor-pointer focus:border-[#047857]"
            >
              <option value="SCORE">Highest Composite Score</option>
              <option value="ATTENDANCE">Attendance Rate</option>
              <option value="ON_TIME">On-Time Punctuality</option>
              <option value="OT">Highest Overtime Hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Analytics Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/75 text-gray-500 border-b border-gray-200 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Worker Code &amp; Name</th>
                <th className="py-3 px-4">Role &amp; Shift</th>
                <th className="py-3 px-4 text-center">Attendance (Days)</th>
                <th className="py-3 px-4 text-center">On-Time %</th>
                <th className="py-3 px-4 text-center">Late (Mins)</th>
                <th className="py-3 px-4 text-center">Work Hours</th>
                <th className="py-3 px-4 text-center">Overtime</th>
                <th className="py-3 px-4 text-center">Data Health</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    No workforce performance records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((row) => (
                  <tr key={row.workerId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{row.workerName}</div>
                      <div className="font-mono text-[11px] text-[#047857]">{row.workerCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{row.role}</div>
                      <div className="text-[11px] text-gray-400">{row.shift.split('(')[0].trim()}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="font-semibold">{row.presentDays} / {row.scheduledDays}</div>
                      <div className={`text-[10px] font-bold ${
                        row.attendanceRatePct >= 95
                          ? 'text-emerald-600'
                          : row.attendanceRatePct >= 85
                          ? 'text-emerald-700'
                          : 'text-amber-600'
                      }`}>
                        {row.attendanceRatePct}% Rate
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        row.onTimeRatePct >= 95
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : row.onTimeRatePct >= 85
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {row.onTimeRatePct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.totalLateMinutes > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          {row.totalLateMinutes}m ({row.latePunches}x)
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">0m</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="font-mono text-xs">{row.actualWorkedHours}h</div>
                      <div className="text-[10px] text-gray-400">Target: {row.scheduledWorkHours}h</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-emerald-600 font-bold font-mono">
                        {row.approvedOtHours}h Approved
                      </div>
                      {row.unapprovedOtHours > 0 && (
                        <div className="text-[10px] text-amber-600">
                          {row.unapprovedOtHours}h Unverified
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[11px] font-medium ${
                        row.dataCompletenessPct === 100 ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {row.dataCompletenessPct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
                        <Award className="w-3 h-3 text-[#047857]" />
                        {row.overallScore}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedWorker(row);
                          setIsDetailDrawerOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker Detail Inspection Drawer */}
      {isDetailDrawerOpen && selectedWorker && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 flex justify-end">
          <div className="w-full max-w-lg bg-white border-l border-gray-200 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedWorker.workerName}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#047857] border border-emerald-200">
                    {selectedWorker.workerCode}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedWorker.role} · {selectedWorker.department}
                </p>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-700">
              {/* Score Breakdown Section */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-900">
                    Transparent Performance Composite
                  </span>
                  <span className="text-lg font-black text-[#047857]">
                    {selectedWorker.overallScore} / 100
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Attendance Factor (Weight 40%):</span>
                    <span className="font-bold">{selectedWorker.attendanceRatePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Punctuality Factor (Weight 25%):</span>
                    <span className="font-bold">{selectedWorker.onTimeRatePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Work-Hours Compliance (Weight 20%):</span>
                    <span className="font-bold">{selectedWorker.workHourCompliancePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Operational Task Completion (Weight 15%):</span>
                    <span className="font-bold">
                      {Math.round((selectedWorker.tasksCompleted / selectedWorker.tasksAssigned) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance & Shift Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                  Shift Schedule &amp; Clocking Matrix
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Assigned Shift</span>
                    <span className="font-semibold text-gray-800">{selectedWorker.shift}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Scheduled Start</span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {selectedWorker.scheduledStart} (+{selectedWorker.gracePeriodMinutes}m grace)
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Present / Scheduled</span>
                    <span className="font-bold text-gray-800">
                      {selectedWorker.presentDays} / {selectedWorker.scheduledDays} Days
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Late Minutes</span>
                    <span className="font-bold text-amber-600">
                      {selectedWorker.totalLateMinutes} minutes ({selectedWorker.latePunches} tardy shifts)
                    </span>
                  </div>
                </div>
              </div>

              {/* Overtime Segregation Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
                  Overtime Audit (Strictly Segregated)
                </h4>
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-emerald-900">
                      Verified &amp; Approved Overtime:
                    </span>
                    <span className="font-bold font-mono text-emerald-700 text-sm">
                      {selectedWorker.approvedOtHours} Hours
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200/60">
                    <span className="text-amber-800">
                      Unapproved / Pending Verification Overtime:
                    </span>
                    <span className="font-bold font-mono text-amber-700 text-sm">
                      {selectedWorker.unapprovedOtHours} Hours
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 pt-1">
                    * Policy Gate: Unapproved overtime is never credited towards regular wages or billable vendor invoice totals until verified by Site Operations.
                  </p>
                </div>
              </div>

              {/* Deployment & Assignment Info */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-500">Operational Site:</span>
                  <span className="font-semibold">{selectedWorker.siteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Employer Organization:</span>
                  <span className="font-semibold">{selectedWorker.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Manager Performance Rating:</span>
                  <span className="font-bold text-[#047857]">{selectedWorker.managerRating} / 5.0 ★</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="px-4 py-2 bg-[#047857] hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
