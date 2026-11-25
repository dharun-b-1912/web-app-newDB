// src/features/work/TenantOvertimeApprovalQueueView.tsx
// ============================================================================
// JOY PeopleHR — Tenant Overtime HR Verification & Multi-Tier Approval Queue
// Verification of Mode B Fallbacks, Policy Conflicts, & Mandatory Reason Audits
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import { useTenant } from '../../hooks/useTenant';
import { useAuth } from '../../hooks/useAuth';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  Eye,
  Sliders,
  FileText,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  tenantOvertimeEngineService,
} from '../../services/attendance/tenantOvertimeEngineService';
import {
  OtRecordStatus,
  TenantOtApprovalAction,
} from '../../types/tenantOvertime';

export const TenantOvertimeApprovalQueueView: React.FC = () => {
  const { showToast } = useToast();
  const { organization } = useTenant();
  const { user } = useAuth();
  const activeOrgId = organization?.id || '0c621892-e938-4707-9957-13534ea32c19';
  const currentActorId = user?.id || 'usr-hr-lead-01';
  const currentActorName = user?.email?.split('@')[0] || 'HR Administrator';

  // Filters State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<OtRecordStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Records & Summary State
  const [data, setData] = useState<{ records: any[]; summary: any }>(() =>
    tenantOvertimeEngineService.getOvertimeRecords({
      organizationId: activeOrgId,
      startDate,
      endDate,
      status: statusFilter,
      employeeQuery: searchQuery,
    })
  );

  // Modal / Drawer States
  const [selectedRecordForEvidence, setSelectedRecordForEvidence] = useState<any | null>(null);
  const [adjustModalRecord, setAdjustModalRecord] = useState<any | null>(null);
  const [adjustedMinutes, setAdjustedMinutes] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshData = () => {
    const res = tenantOvertimeEngineService.getOvertimeRecords({
      organizationId: activeOrgId,
      startDate,
      endDate,
      status: statusFilter,
      employeeQuery: searchQuery,
    });
    setData(res);
  };

  useEffect(() => {
    refreshData();
  }, [activeOrgId, startDate, endDate, statusFilter, searchQuery]);

  const handleApprove = async (recordId: string) => {
    const action: TenantOtApprovalAction = {
      recordId,
      actorId: currentActorId,
      actorName: currentActorName,
      actorRole: 'HR Manager',
      action: 'APPROVE',
      timestamp: new Date().toISOString(),
    };

    const res = await tenantOvertimeEngineService.processApprovalAction(activeOrgId, action);
    if (res.success) {
      showToast('✓ Overtime hours approved and authorized for payroll.');
      refreshData();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleReject = async (recordId: string) => {
    const action: TenantOtApprovalAction = {
      recordId,
      actorId: currentActorId,
      actorName: currentActorName,
      actorRole: 'HR Manager',
      action: 'REJECT',
      comment: 'Rejected during HR verification audit',
      timestamp: new Date().toISOString(),
    };

    const res = await tenantOvertimeEngineService.processApprovalAction(activeOrgId, action);
    if (res.success) {
      showToast('Overtime record rejected.');
      refreshData();
    } else {
      showToast(res.message, 'error');
    }
  };

  const openAdjustModal = (rec: any) => {
    setAdjustModalRecord(rec);
    setAdjustedMinutes(rec.calculatedMinutes || 0);
    setAdjustmentReason('');
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentReason.trim()) {
      showToast('Mandatory adjustment reason is required by SaaS governance.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const action: TenantOtApprovalAction = {
        recordId: adjustModalRecord.id,
        actorId: currentActorId,
        actorName: currentActorName,
        actorRole: 'HR Manager',
        action: 'ADJUST',
        adjustedMinutes,
        adjustmentReason: adjustmentReason.trim(),
        timestamp: new Date().toISOString(),
      };

      const res = await tenantOvertimeEngineService.processApprovalAction(activeOrgId, action);
      if (res.success) {
        showToast('✓ Overtime hours adjusted and approved with audit logging.');
        setAdjustModalRecord(null);
        refreshData();
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
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
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending HR Verification</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{data.summary.pendingReviewCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">{data.summary.totalPendingHours} hrs potential OT</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Approved for Payroll</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{data.summary.approvedCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">{data.summary.totalApprovedHours} hrs approved</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Policy Conflicts</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{data.summary.policyConflictCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Flagged for HR resolution</div>
        </Card>

        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Policy Missing (Mode B)</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{data.summary.policyMissingCount}</div>
          <div className="text-xs text-gray-500 mt-0.5">Zero rate guessing fallback</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_HR_REVIEW">Pending HR Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CONFLICT">Policy Conflict</option>
            </select>
          </div>
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 bg-white"
          />
        </div>
      </div>

      {/* Main Table */}
      <Card className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {data.records.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-gray-700">No Overtime Records in Selected Range</h4>
            <p className="text-xs text-gray-400 mt-1">
              Attendance check-outs and daily calculations will automatically populate this verification queue.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee &amp; ID</TableHead>
                <TableHead>Date &amp; Shift</TableHead>
                <TableHead>Attendance Evidence</TableHead>
                <TableHead>Policy &amp; Mode</TableHead>
                <TableHead>OT Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.records.map((rec) => {
                const isPending = rec.status === 'PENDING_HR_REVIEW' || rec.status === 'PENDING_MANAGER_REVIEW';
                const isConflict = rec.status === 'CONFLICT';

                return (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <div className="font-bold text-gray-900 text-xs">
                        {rec.evidence?.employeeName || rec.employeeId}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {rec.employeeId} • {rec.evidence?.departmentName || 'General'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-gray-800">{rec.attendanceDate}</div>
                      <div className="text-[10px] text-gray-500">
                        {rec.evidence?.shiftName || 'Standard Roster'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-mono text-gray-700">
                        {rec.evidence?.actualCheckInMinutes !== null
                          ? `${Math.floor(rec.evidence.actualCheckInMinutes / 60)}:${String(rec.evidence.actualCheckInMinutes % 60).padStart(2, '0')}`
                          : '--'} - {rec.evidence?.actualCheckOutMinutes !== null
                          ? `${Math.floor(rec.evidence.actualCheckOutMinutes / 60)}:${String(rec.evidence.actualCheckOutMinutes % 60).padStart(2, '0')}`
                          : '--'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Net: {formatMins(rec.evidence?.netWorkMinutes || 0)} (Break: {rec.evidence?.breakMinutesDeducted || 0}m)
                      </div>
                    </TableCell>

                    <TableCell>
                      {rec.hasConflict ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                          Conflict Detected
                        </span>
                      ) : rec.isPolicyMissing ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                          Policy Not Configured
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {rec.policyName || 'Standard Policy'}
                        </span>
                      )}
                      <div className="text-[10px] text-gray-400 mt-0.5">Mode: {rec.mode}</div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-black text-gray-900">
                        {formatMins(rec.calculatedMinutes)}
                      </div>
                      {rec.status === 'APPROVED' && (
                        <div className="text-[10px] text-emerald-600 font-bold">
                          Approved: {formatMins(rec.approvedMinutes)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        rec.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : rec.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : rec.status === 'CONFLICT'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {rec.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedRecordForEvidence(rec)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View calculation evidence"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApprove(rec.id)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Approve full hours"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openAdjustModal(rec)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Adjust hours with reason"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(rec.id)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Reject record"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Calculation Evidence Drawer Modal */}
      {selectedRecordForEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Overtime Calculation Evidence</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {selectedRecordForEvidence.employeeId} • {selectedRecordForEvidence.attendanceDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecordForEvidence(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1">
                <div className="font-bold text-gray-800">Shift &amp; Schedule Evidence:</div>
                <div className="text-gray-600">Scheduled: {formatMins(selectedRecordForEvidence.evidence?.scheduledDurationMinutes || 0)}</div>
                <div className="text-gray-600">Gross Worked: {formatMins(selectedRecordForEvidence.evidence?.grossMinutes || 0)}</div>
                <div className="text-gray-600">Break Deducted: {selectedRecordForEvidence.evidence?.breakMinutesDeducted || 0} mins</div>
                <div className="text-gray-600 font-bold">Net Worked: {formatMins(selectedRecordForEvidence.evidence?.netWorkMinutes || 0)}</div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1">
                <div className="font-bold text-gray-800">Policy Resolution Evidence:</div>
                <div className="text-gray-600">Applied Scope: {selectedRecordForEvidence.scopeLevel || 'None'}</div>
                <div className="text-gray-600">Policy Name: {selectedRecordForEvidence.policyName || 'None (Mode B Fallback)'}</div>
                <div className="text-gray-600">Unrounded OT: {selectedRecordForEvidence.evidence?.unroundedOtMinutes} mins</div>
                <div className="text-gray-600">Rounded OT: {selectedRecordForEvidence.evidence?.roundedOtMinutes} mins</div>
                <div className="text-gray-600 font-bold text-emerald-700">Capped Final OT: {selectedRecordForEvidence.calculatedMinutes} mins</div>
              </div>

              {selectedRecordForEvidence.evidence?.notes?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                  <div className="font-bold">System Governance Notes:</div>
                  {selectedRecordForEvidence.evidence.notes.map((note: string, idx: number) => (
                    <div key={idx}>• {note}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button size="sm" variant="outline" onClick={() => setSelectedRecordForEvidence(null)}>
                Close Evidence
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Hours with Mandatory Reason Modal */}
      {adjustModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Adjust &amp; Authorize Overtime</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {adjustModalRecord.employeeId} • {adjustModalRecord.attendanceDate}
                </p>
              </div>
              <button
                onClick={() => setAdjustModalRecord(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  System Calculated: {formatMins(adjustModalRecord.calculatedMinutes)}
                </label>
                <div className="text-[11px] text-gray-400 mb-2">
                  Enter approved overtime duration in minutes
                </div>
                <input
                  type="number"
                  min={0}
                  max={720}
                  step={15}
                  required
                  value={adjustedMinutes}
                  onChange={(e) => setAdjustedMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold text-sm text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Mandatory Adjustment Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Explain why the calculated overtime was altered (e.g. Authorized emergency line breakdown extension, manual punch clock error, etc.)"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button size="sm" variant="outline" type="button" onClick={() => setAdjustModalRecord(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" isLoading={isSubmitting}>
                  Confirm &amp; Authorize
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
