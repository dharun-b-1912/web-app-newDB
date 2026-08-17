import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Calendar, AlertCircle, CheckCircle2, X, Clock, ArrowRight } from 'lucide-react';
import { LeaveType, LeaveEntitlement, LeaveRequest } from '../../../types/leave';
import { Employee, User } from '../../../types';
import { leaveApi } from '../../../services/leaveApi';
import { hrEventBus } from '../../../services/hrEventBus';
import { useToast } from '../../../components/ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  user: User;
  entitlements: LeaveEntitlement[];
  onSubmitted: () => void;
}

export const WorkspaceApplyLeaveModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  user,
  entitlements,
  onSubmitted,
}) => {
  const { showToast } = useToast();
  const [selectedTypeId, setSelectedTypeId] = useState<string>('lt-cl');
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentEntitlement = entitlements.find((e) => e.leave_type_id === selectedTypeId);
  const availableDays = currentEntitlement ? (currentEntitlement.available_balance ?? 6) : 6;

  // Calculate requested days
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const remainingAfter = availableDays - diffDays;
  const approverName = employee?.employment?.reporting_manager_name || 'Anand Viswanathan';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please provide a brief reason for your leave request.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const typeName = selectedTypeId === 'lt-cl' ? 'Casual Leave' : selectedTypeId === 'lt-sl' ? 'Sick Leave' : 'Privilege Leave';
      const created = leaveApi.submitLeaveRequest({
        employee_id: employee?.id || user.employee_id || user.id,
        employee_name: employee ? `${employee.first_name} ${employee.last_name}` : user.name,
        department_name: employee?.department_name || 'Engineering',
        leave_type_id: selectedTypeId,
        leave_type_name: typeName,
        from_date: fromDate,
        to_date: toDate,
        total_calendar_days: diffDays,
        working_days: diffDays,
        leave_days_deducted: diffDays,
        reason,
        manager_name: approverName,
      });

      hrEventBus.publish('leave.submitted', created, { actorId: user.id });
      showToast(`Leave request submitted for ${diffDays} day(s) successfully.`, 'success');
      onSubmitted();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit leave request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#07563D] flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Apply for Leave</h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Submit request to {approverName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Leave Type Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 block">Leave Category</label>
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-800 focus:outline-none focus:border-[#07563D]"
            >
              <option value="lt-cl">Casual Leave (CL)</option>
              <option value="lt-sl">Sick / Medical Leave (SL)</option>
              <option value="lt-pl">Privilege / Annual Earned Leave (PL)</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-gray-800 font-medium focus:outline-none focus:border-[#07563D]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block">To Date</label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-gray-800 font-medium focus:outline-none focus:border-[#07563D]"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 block">Reason for Leave *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a brief context for your supervisor..."
              className="w-full p-2.5 rounded-xl border border-gray-200 text-gray-800 font-medium focus:outline-none focus:border-[#07563D] resize-none"
            />
          </div>

          {/* Balance Preview Card */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Available Balance:</span>
              <strong className="text-gray-900 font-black">{availableDays} days</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Days Requested:</span>
              <strong className="text-emerald-700 font-black">{diffDays} day(s)</strong>
            </div>
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-200">
              <span className="text-gray-700 font-bold">Remaining After Request:</span>
              <strong className={`font-black ${remainingAfter < 0 ? 'text-rose-600' : 'text-[#07563D]'}`}>
                {remainingAfter} days
              </strong>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button size="md" variant="secondary" onClick={onClose} type="button" className="text-xs font-bold">
              Cancel
            </Button>
            <Button
              size="md"
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold px-5"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
