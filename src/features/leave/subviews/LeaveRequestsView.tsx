import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { api } from '../../../services/api';
import { LeaveRequest, LeaveType } from '../../../types/leave';
import { calculateLeaveDuration, validateLeaveRequest } from '../../../lib/leave/leaveEngine';
import { Badge } from '../../../components/ui/Badge';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  X,
  Check,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

import { hrEventBus } from '../../../services/hrEventBus';

interface LeaveRequestsViewProps {
  onOpenRequestDetails?: (req: LeaveRequest) => void;
  initialFilter?: string;
}

export const LeaveRequestsView: React.FC<LeaveRequestsViewProps> = ({
  onOpenRequestDetails,
  initialFilter,
}) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter || 'All');
  const [searchQuery, setSearchQuery] = useState('');

  // Apply Leave Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (initialFilter === 'pending-requests') return 'Pending';
    if (initialFilter === 'approved-requests') return 'Approved';
    if (initialFilter === 'rejected-requests') return 'Rejected';
    return 'All';
  });
  const [typeFilter, setTypeFilter] = useState<string>('All');

  const loadData = () => {
    setRequests(leaveApi.getLeaveRequests());
    const activeTypes = leaveApi.getLeaveTypes().filter(t => t.is_active);
    setLeaveTypes(activeTypes);
    if (activeTypes.length > 0 && !selectedTypeId) {
      setSelectedTypeId(activeTypes[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('leave.*', () => loadData());
    return () => unsub();
  }, []);

  useEffect(() => {
    if (initialFilter === 'pending-requests') setStatusFilter('Pending');
    else if (initialFilter === 'approved-requests') setStatusFilter('Approved');
    else if (initialFilter === 'rejected-requests') setStatusFilter('Rejected');
  }, [initialFilter]);

  const selectedLeaveType = leaveTypes.find(t => t.id === selectedTypeId);

  // Live Engine Calculation
  const durationResult =
    fromDate && toDate && selectedLeaveType
      ? calculateLeaveDuration(
          fromDate,
          toDate,
          isHalfDay,
          selectedLeaveType,
          undefined
        )
      : {
          totalCalendarDays: 0,
          workingDays: 0,
          holidayDays: 0,
          weeklyOffDays: 0,
          leaveDaysDeducted: 0,
          sandwichDaysAdded: 0,
          dailyBreakdown: [],
        };

  const currentUser = api.getCurrentUser();
  const employees = api.getEmployeesSync();
  const currentEmp = employees.find(e => e.id === currentUser?.employee_id || e.work_email === currentUser?.email) || employees[0];
  const targetEmpId = currentEmp?.id || currentUser?.employee_id || 'WF-1001';

  const currentAvailableBalance = 6.0; // Current CL balance for test user
  const validationResult = selectedLeaveType
    ? validateLeaveRequest(
        fromDate,
        toDate,
        durationResult.leaveDaysDeducted,
        selectedLeaveType,
        undefined,
        currentAvailableBalance,
        requests,
        targetEmpId
      )
    : {
        isValid: true,
        errors: [],
        warnings: [],
        requiresAttachment: false,
        availableBalance: 6,
        balanceAfterRequest: 5,
        isLop: false,
      };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationResult.isValid || !selectedLeaveType) return;

    leaveApi.submitLeaveRequest({
      employee_id: targetEmpId,
      employee_name: currentEmp ? (currentEmp.display_name || `${currentEmp.first_name} ${currentEmp.last_name}`.trim()) : (currentUser?.name || 'Authorized Staff'),
      department_name: currentEmp?.department_name || 'Enterprise Operations',
      company_id: currentEmp?.company_id || 'comp-01',
      leave_type_id: selectedLeaveType.id,
      leave_type_name: selectedLeaveType.name,
      leave_type_code: selectedLeaveType.code,
      leave_category: selectedLeaveType.category,
      from_date: fromDate,
      to_date: toDate,
      is_half_day: isHalfDay,
      half_day_session: isHalfDay ? 'FirstHalf' : undefined,
      total_calendar_days: durationResult.totalCalendarDays,
      leave_days_deducted: durationResult.leaveDaysDeducted,
      reason: reason,
      emergency_contact: contactNumber,
      attachment_url: attachmentName || undefined,
      daily_breakdown: durationResult.dailyBreakdown,
      is_lop: validationResult.isLop,
    });

    setRequests(leaveApi.getLeaveRequests());
    setIsApplyModalOpen(false);
    setReason('');
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.request_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.department_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' ||
      req.status === statusFilter ||
      (statusFilter === 'Pending' && (req.status === 'Pending' || req.status === 'Submitted'));
    const matchesType = typeFilter === 'All' || req.leave_type_id === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#07563D]" />
            <span>Leave Requests Desk & Self-Service Portal</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Submit leave applications with live working-day duration calculator, sandwich rule detection, and attachment checks
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, employee, department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-xl text-xs font-bold bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-xl text-xs font-bold bg-white"
          >
            <option value="All">All Leave Types</option>
            {leaveTypes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests History Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Request ID</th>
              <th className="p-4">Employee</th>
              <th className="p-4">Leave Type</th>
              <th className="p-4">Dates & Duration</th>
              <th className="p-4 text-center">Deducted Days</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4">Current Approver</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-xs text-gray-400">
                  No leave requests found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRequests.map(req => (
                <tr
                  key={req.id}
                  onClick={() => onOpenRequestDetails?.(req)}
                  className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
                  <td className="p-4 font-mono font-bold text-gray-900">{req.request_code}</td>
                  <td className="p-4 font-extrabold text-gray-900">
                    {req.employee_name}
                    <span className="block text-[11px] text-gray-400 font-normal">{req.department_name}</span>
                  </td>
                  <td className="p-4 font-bold text-gray-800">
                    {req.leave_type_name}
                    {req.is_half_day && (
                      <span className="block text-[10px] text-amber-600 font-bold">
                        Half Day ({req.half_day_session})
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900 font-mono">
                      {req.from_date} → {req.to_date}
                    </div>
                    <span className="text-[11px] text-gray-400 font-normal">
                      {req.total_calendar_days} Calendar Day(s)
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-gray-900 text-sm">
                    {req.leave_days_deducted} d
                  </td>
                  <td className="p-4 text-center">
                    <Badge
                      variant={
                        req.status === 'Approved'
                          ? 'emerald'
                          : req.status === 'Rejected'
                          ? 'rose'
                          : req.status === 'Pending' || req.status === 'Submitted'
                          ? 'amber'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {req.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-gray-700 text-[11px]">
                    <div className="font-semibold text-gray-900">
                      {req.status === 'Approved' || req.status === 'Rejected'
                        ? (req.current_approver_name || req.manager_name || 'HR Manager')
                        : (req.manager_name || req.current_approver_name || 'Reporting Manager')}
                    </div>
                    <span className="block text-[10px] text-gray-400">
                      {req.status === 'Pending' || req.status === 'Submitted'
                        ? 'Reporting Manager'
                        : req.status === 'Approved'
                        ? 'Approved'
                        : 'Reviewer'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRequestDetails?.(req);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#07563D]" />
                <h3 className="text-sm font-black text-gray-900">Submit Leave Application</h3>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Select Leave Type *</label>
                  <select
                    value={selectedTypeId}
                    onChange={e => setSelectedTypeId(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white"
                  >
                    {leaveTypes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Emergency Contact Number</label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold font-mono bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl font-bold font-mono bg-white"
                  />
                </div>
              </div>

              {selectedLeaveType?.allow_half_day && (
                <label className="flex items-center gap-2 font-bold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHalfDay}
                    onChange={e => setIsHalfDay(e.target.checked)}
                    className="rounded text-[#07563D] w-4 h-4"
                  />
                  <span>Apply as Half-Day Leave</span>
                </label>
              )}

              {/* Interactive Engine Duration & Balance Breakdown */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                    Duration & Balance Impact Analysis
                  </h4>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">
                    Working Day Engine
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[11px] bg-white p-2.5 rounded-xl border border-emerald-100">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Calendar</span>
                    <strong className="font-mono text-gray-800">{durationResult.totalCalendarDays}d</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Weekly Offs</span>
                    <strong className="font-mono text-gray-800">{durationResult.weeklyOffDays}d</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Holidays</span>
                    <strong className="font-mono text-gray-800">{durationResult.holidayDays}d</strong>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-1">
                    <span className="text-emerald-800 font-bold block text-[10px]">Deducted</span>
                    <strong className="font-mono text-sm text-[#07563D]">
                      {durationResult.leaveDaysDeducted}d
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-emerald-950 font-medium pt-1 border-t border-emerald-200/60 flex items-center justify-between">
                  <span>Available Balance: <strong>{validationResult.availableBalance} days</strong></span>
                  <span className="font-bold text-[#07563D]">
                    Projected Closing: {validationResult.balanceAfterRequest} days
                  </span>
                </div>
              </div>

              {/* Validation Feedback */}
              {validationResult.errors.map((err, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}

              {validationResult.warnings.map((warn, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Provide brief details for your leave request..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Attachment (Optional / Required for SL &gt; 2d)</label>
                <input
                  type="text"
                  placeholder="e.g. medical_certificate.pdf"
                  value={attachmentName}
                  onChange={e => setAttachmentName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl font-mono bg-white"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!validationResult.isValid}
                  className={cn(
                    'px-5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer',
                    validationResult.isValid
                      ? 'bg-[#07563D] hover:bg-[#05402e]'
                      : 'bg-gray-400 cursor-not-allowed'
                  )}
                >
                  <Check className="w-4 h-4" />
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
