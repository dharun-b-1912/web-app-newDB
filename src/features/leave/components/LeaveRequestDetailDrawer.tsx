import React from 'react';
import { LeaveRequest } from '../../../types/leave';
import { leaveApi } from '../../../services/leaveApi';
import { Badge } from '../../../components/ui/Badge';
import {
  X,
  User,
  Calendar,
  Clock,
  FileText,
  Paperclip,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  Phone,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface LeaveRequestDetailDrawerProps {
  request: LeaveRequest | null;
  onClose: () => void;
  onActionComplete: () => void;
}

export const LeaveRequestDetailDrawer: React.FC<LeaveRequestDetailDrawerProps> = ({
  request,
  onClose,
  onActionComplete,
}) => {
  if (!request) return null;

  const handleApprove = () => {
    leaveApi.approveLeaveRequest(request.id, 'Anand Viswanathan (HR Head)', 'Approved per policy.');
    onActionComplete();
    onClose();
  };

  const handleReject = () => {
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
      leaveApi.rejectLeaveRequest(request.id, 'Anand Viswanathan (HR Head)', reason);
      onActionComplete();
      onClose();
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this leave request?')) {
      leaveApi.cancelLeaveRequest(request.id, request.employee_name, 'Cancelled by user');
      onActionComplete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#07563D]/10 text-[#07563D]">
              <Calendar className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900">{request.request_code}</h2>
                <Badge
                  variant={
                    request.status === 'Approved'
                      ? 'emerald'
                      : request.status === 'Pending' || request.status === 'Submitted'
                      ? 'amber'
                      : request.status === 'Rejected'
                      ? 'rose'
                      : 'neutral'
                  }
                  size="md"
                >
                  {request.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 font-medium">Submitted on {new Date(request.submitted_at).toLocaleDateString()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Employee Header Info */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-4">
            <img
              src={
                request.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(request.employee_name)}&background=07563D&color=fff`
              }
              alt={request.employee_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
            />
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-gray-900">{request.employee_name}</h3>
              <p className="text-xs text-gray-500">{request.department_name} • Manager: {request.manager_name}</p>
              {request.contact_number && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <span>{request.contact_number}</span>
                </p>
              )}
            </div>
          </div>

          {/* Leave Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Leave Type</span>
              <p className="text-sm font-black text-gray-900">{request.leave_type_name}</p>
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-700">
                {request.leave_category}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Duration</span>
              <p className="text-sm font-black text-gray-900">{request.leave_days_deducted} Day(s)</p>
              <p className="text-[11px] text-gray-500">{request.from_date} to {request.to_date}</p>
            </div>
          </div>

          {/* Daily Breakdown Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#07563D]" />
              <span>Daily Breakdown Matrix</span>
            </h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {request.daily_breakdown.map((day, idx) => (
                <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-gray-900">{day.date}</span>
                    {day.is_holiday && (
                      <span className="ml-2 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        Holiday: {day.holiday_name}
                      </span>
                    )}
                    {day.is_weekly_off && (
                      <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        Weekly Off
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono font-bold">
                    {day.is_working_day ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        -{day.leave_count} Leave Day
                      </span>
                    ) : (
                      <span className="text-gray-400">Excluded (0.0)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reason & Attachments */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span>Reason for Leave</span>
            </span>
            <p className="text-xs text-gray-800 leading-relaxed font-medium">{request.reason}</p>
            {request.attachment_url && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#07563D]" />
                <a
                  href={`#${request.attachment_url}`}
                  className="text-xs font-bold text-[#07563D] hover:underline"
                >
                  Attachment: {request.attachment_url}
                </a>
              </div>
            )}
          </div>

          {/* Impact & Audit Timeline */}
          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-[#07563D]" />
              <h5 className="text-xs font-bold">System Integration Safeguards</h5>
            </div>
            <p className="text-[11px] text-emerald-800">
              Upon approval, this leave automatically syncs to Attendance logs as "On Leave" and exposes finalized paid/unpaid day counts to Payroll.
            </p>
          </div>
        </div>

        {/* Drawer Action Controls */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          {request.status === 'Pending' ? (
            <>
              <button
                onClick={handleReject}
                className="flex-1 py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Request</span>
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#07563D] text-white hover:bg-[#05402e] text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve Request</span>
              </button>
            </>
          ) : request.status === 'Approved' ? (
            <button
              onClick={handleCancel}
              className="w-full py-2.5 px-4 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Cancel & Reverse Leave</span>
            </button>
          ) : (
            <div className="text-center w-full text-xs text-gray-500 font-medium py-1">
              This request is finalized as <span className="font-bold text-gray-900">{request.status}</span>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
