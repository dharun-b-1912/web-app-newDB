import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveRequest, LeaveType } from '../../../types/leave';
import { calculateLeaveDuration, validateLeaveRequest } from '../../../lib/leave/leaveEngine';
import { Badge } from '../../../components/ui/Badge';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Paperclip,
  Phone,
  Search,
  Filter,
} from 'lucide-react';

interface LeaveRequestsViewProps {
  onOpenRequestDetails?: (req: LeaveRequest) => void;
}

export const LeaveRequestsView: React.FC<LeaveRequestsViewProps> = ({ onOpenRequestDetails }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Form State
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string>('lt-cl');
  const [fromDate, setFromDate] = useState<string>('2026-08-20');
  const [toDate, setToDate] = useState<string>('2026-08-21');
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('+91 98765 43210');
  const [attachmentName, setAttachmentName] = useState<string>('');

  useEffect(() => {
    setRequests(leaveApi.getLeaveRequests());
    setLeaveTypes(leaveApi.getLeaveTypes().filter(t => t.is_active));
  }, []);

  const selectedLeaveType = leaveTypes.find(t => t.id === selectedLeaveTypeId) || leaveTypes[0];

  // Live Engine Calculation
  const durationResult = selectedLeaveType
    ? calculateLeaveDuration(
        fromDate,
        toDate,
        isHalfDay,
        selectedLeaveType,
        undefined, // Policy rules
        leaveApi.getHolidayCalendars()[0]
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
        'emp-101'
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
    if (!validationResult.isValid) return;

    leaveApi.submitLeaveRequest({
      employee_id: 'emp-101',
      employee_name: 'Rajesh Kumar',
      department_name: 'Engineering',
      company_id: 'comp-01',
      leave_type_id: selectedLeaveType.id,
      leave_type_name: selectedLeaveType.name,
      leave_type_code: selectedLeaveType.code,
      leave_category: selectedLeaveType.category,
      from_date: fromDate,
      to_date: toDate,
      total_calendar_days: durationResult.totalCalendarDays,
      working_days: durationResult.workingDays,
      holiday_days: durationResult.holidayDays,
      weekly_off_days: durationResult.weeklyOffDays,
      leave_days_deducted: durationResult.leaveDaysDeducted,
      is_half_day: isHalfDay,
      reason: reason,
      contact_number: contactNumber,
      attachment_url: attachmentName || undefined,
      daily_breakdown: durationResult.dailyBreakdown,
      is_lop: validationResult.isLop,
    });

    setRequests(leaveApi.getLeaveRequests());
    setIsApplyModalOpen(false);
    setReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#07563D]" />
            <span>Leave Requests & Self-Service Portal</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Submit leave applications with live working-day calculation, policy validation, and attachment checks
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* Requests History Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Request Code</th>
              <th className="p-4">Employee</th>
              <th className="p-4">Leave Type</th>
              <th className="p-4">Dates & Duration</th>
              <th className="p-4 text-center">Days Deducted</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-900">{req.request_code}</td>
                <td className="p-4 font-extrabold text-gray-900">
                  {req.employee_name}
                  <span className="block text-[11px] text-gray-400 font-normal">{req.department_name}</span>
                </td>
                <td className="p-4 font-bold text-gray-800">
                  {req.leave_type_name}
                  <span className="block text-[10px] text-gray-400 font-normal">{req.leave_category}</span>
                </td>
                <td className="p-4">
                  <div className="font-bold text-gray-900">
                    {req.from_date} to {req.to_date}
                  </div>
                  <span className="text-[10px] text-gray-400">Total Calendar: {req.total_calendar_days}d</span>
                </td>
                <td className="p-4 text-center font-mono font-black text-emerald-800 bg-emerald-50/50 rounded-lg">
                  {req.leave_days_deducted} d
                </td>
                <td className="p-4 text-center">
                  <Badge
                    variant={
                      req.status === 'Approved'
                        ? 'emerald'
                        : req.status === 'Pending'
                        ? 'amber'
                        : req.status === 'Rejected'
                        ? 'rose'
                        : 'gray'
                    }
                    size="sm"
                  >
                    {req.status}
                  </Badge>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => onOpenRequestDetails && onOpenRequestDetails(req)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">Submit Leave Application</h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">Select Leave Type *</label>
                  <select
                    value={selectedLeaveTypeId}
                    onChange={e => setSelectedLeaveTypeId(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-gray-300 rounded-xl text-xs font-bold"
                  >
                    {leaveTypes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Emergency Contact Number</label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">From Date *</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">To Date *</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-bold font-mono"
                  />
                </div>
              </div>

              {selectedLeaveType?.allow_half_day && (
                <label className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={isHalfDay}
                    onChange={e => setIsHalfDay(e.target.checked)}
                    className="rounded text-[#07563D]"
                  />
                  <span>Apply as Half-Day Leave</span>
                </label>
              )}

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">Live Calculation Preview</h4>
                <div className="grid grid-cols-4 gap-2 text-[11px] text-emerald-800 font-bold">
                  <div>Calendar: {durationResult.totalCalendarDays}d</div>
                  <div>Working: {durationResult.workingDays}d</div>
                  <div>Holidays: {durationResult.holidayDays}d</div>
                  <div className="text-[#07563D] font-extrabold font-mono">Deducted: {durationResult.leaveDaysDeducted}d</div>
                </div>
                <div className="text-[11px] text-emerald-900 font-medium pt-1 border-t border-emerald-200/60 flex items-center justify-between">
                  <span>Available Balance: {validationResult.availableBalance} days</span>
                  <span className="font-bold">Balance After Request: {validationResult.balanceAfterRequest} days</span>
                </div>
              </div>

              {/* Warnings and Errors */}
              {validationResult.errors.map((err, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}

              {validationResult.warnings.map((warn, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}

              <div>
                <label className="text-xs font-bold text-gray-700">Reason for Leave *</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Provide brief details for your leave request..."
                  className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Attachment (Optional / Required for SL &gt; 2d)</label>
                <input
                  type="text"
                  placeholder="e.g. medical_certificate.pdf"
                  value={attachmentName}
                  onChange={e => setAttachmentName(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!validationResult.isValid}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs ${
                    validationResult.isValid ? 'bg-[#07563D] hover:bg-[#05402e]' : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
