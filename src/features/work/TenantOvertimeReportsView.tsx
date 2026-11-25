// src/features/work/TenantOvertimeReportsView.tsx
// ============================================================================
// JOY PeopleHR — Tenant Overtime Intelligence & Statutory MIS Reports View
// Daily, Weekly, Monthly Audits • Exportable MIS • Department & Shift Breakdown
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useTenant } from '../../hooks/useTenant';
import { useToast } from '../../components/ui/Toast';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  Building2,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { tenantOvertimeEngineService } from '../../services/attendance/tenantOvertimeEngineService';
import { OtRecordStatus } from '../../types/tenantOvertime';

export const TenantOvertimeReportsView: React.FC = () => {
  const { showToast } = useToast();
  const { organization } = useTenant();
  const activeOrgId = organization?.id || '0c621892-e938-4707-9957-13534ea32c19';
  const orgName = organization?.name || 'Active Organization';

  // Date Range Quick Select
  const [rangePreset, setRangePreset] = useState<'today' | 'this_week' | 'this_month' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<OtRecordStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handlePresetChange = (preset: 'today' | 'this_week' | 'this_month' | 'custom') => {
    setRangePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_week') {
      const day = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1);
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  const reportData = useMemo(() => {
    return tenantOvertimeEngineService.getOvertimeRecords({
      organizationId: activeOrgId,
      startDate,
      endDate,
      department: deptFilter,
      shift: shiftFilter,
      status: statusFilter,
      employeeQuery: searchQuery,
    });
  }, [activeOrgId, startDate, endDate, deptFilter, shiftFilter, statusFilter, searchQuery]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    reportData.records.forEach((r) => {
      if (r.evidence?.departmentName) depts.add(r.evidence.departmentName);
    });
    return ['ALL', ...Array.from(depts)];
  }, [reportData.records]);

  const shifts = useMemo(() => {
    const s = new Set<string>();
    reportData.records.forEach((r) => {
      if (r.evidence?.shiftName) s.add(r.evidence.shiftName);
    });
    return ['ALL', ...Array.from(s)];
  }, [reportData.records]);

  const exportCSV = () => {
    if (reportData.records.length === 0) {
      showToast('No records to export in the selected range', 'info');
      return;
    }

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Shift',
      'Date',
      'Scheduled Mins',
      'Gross Mins',
      'Break Mins',
      'Net Mins',
      'Calculated OT Mins',
      'Approved OT Mins',
      'Status',
      'Policy Reference',
      'Adjustment Reason',
    ];

    const rows = reportData.records.map((r) => [
      r.employeeId,
      r.evidence?.employeeName || r.employeeId,
      r.evidence?.departmentName || 'General',
      r.evidence?.shiftName || 'Standard',
      r.attendanceDate,
      r.evidence?.scheduledDurationMinutes || 0,
      r.evidence?.grossMinutes || 0,
      r.evidence?.breakMinutesDeducted || 0,
      r.evidence?.netWorkMinutes || 0,
      r.calculatedMinutes || 0,
      r.approvedMinutes || 0,
      r.status,
      r.policyName || (r.isPolicyMissing ? 'POLICY_NOT_CONFIGURED' : 'None'),
      `"${(r.adjustmentReason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Overtime_Report_${orgName.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported Overtime MIS CSV report successfully.');
  };

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Organization Overtime MIS Reports</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              {orgName}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Deterministic audit ledger scoped strictly to {orgName}. Tracks calculated vs approved hours, policy missing fallbacks, and payroll integration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={exportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Calculated OT</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{reportData.summary.totalCalculatedHours} hrs</div>
          <div className="text-xs text-gray-500 mt-0.5">Across {reportData.summary.recordsCount} shifts</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Approved &amp; Payable</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{reportData.summary.totalApprovedHours} hrs</div>
          <div className="text-xs text-emerald-600 mt-0.5">{reportData.summary.approvedCount} approved records</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending HR Review</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{reportData.summary.totalPendingHours} hrs</div>
          <div className="text-xs text-amber-600 mt-0.5">{reportData.summary.pendingReviewCount} in review queue</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Rejected / Excluded</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{reportData.summary.totalRejectedHours} hrs</div>
          <div className="text-xs text-rose-500 mt-0.5">Excluded from payroll</div>
        </Card>
      </div>

      {/* Filter and Cadence Selector */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'this_week', 'this_month', 'custom'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetChange(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                rangePreset === preset
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              {preset === 'today'
                ? 'Today'
                : preset === 'this_week'
                ? 'This Week'
                : preset === 'this_month'
                ? 'This Month'
                : 'Custom'}
            </button>
          ))}

          {rangePreset === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 bg-white"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 bg-white"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {departments.length > 2 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          )}

          {shifts.length > 2 && (
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white"
            >
              {shifts.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'All Shifts' : s}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved Only</option>
            <option value="PENDING_HR_REVIEW">Pending Review</option>
            <option value="REJECTED">Rejected</option>
            <option value="CONFLICT">Conflict</option>
          </select>
        </div>
      </div>

      {/* Main Report Table */}
      <Card className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {reportData.records.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-gray-700">No Overtime Data in Range</h4>
            <p className="text-xs text-gray-400 mt-1">
              Select another date range or verify punches in Employee Attendance view.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date &amp; Shift</TableHead>
                <TableHead>Clocked Working Duration</TableHead>
                <TableHead>Calculated OT</TableHead>
                <TableHead>Approved OT</TableHead>
                <TableHead>Policy Reference</TableHead>
                <TableHead>Approval &amp; Payroll Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-bold text-gray-900 text-xs">
                      {r.evidence?.employeeName || r.employeeId}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {r.employeeId} • {r.evidence?.departmentName || 'General'}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-semibold text-gray-800">{r.attendanceDate}</div>
                    <div className="text-[10px] text-gray-500">{r.evidence?.shiftName || 'Standard'}</div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-mono text-gray-700">
                      Gross: {formatMins(r.evidence?.grossMinutes || 0)} (Break: {r.evidence?.breakMinutesDeducted || 0}m)
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold">
                      Net: {formatMins(r.evidence?.netWorkMinutes || 0)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-black text-gray-900">{formatMins(r.calculatedMinutes)}</div>
                    <div className="text-[10px] text-gray-400">Mode: {r.mode}</div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-black text-emerald-700">{formatMins(r.approvedMinutes)}</div>
                    {r.adjustmentReason && (
                      <div className="text-[10px] text-blue-600 truncate max-w-[150px]" title={r.adjustmentReason}>
                        Adj: {r.adjustmentReason}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    {r.hasConflict ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                        Conflict
                      </span>
                    ) : r.isPolicyMissing ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                        Policy Missing
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-gray-800">
                        {r.policyName || 'Standard Policy'}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      r.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : r.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : r.status === 'CONFLICT'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
