import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { offboardingService } from '../../../services/offboardingService';
import { EmployeeSeparation } from '../../../types';
import { Calendar, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface NoticeModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  separation: EmployeeSeparation | null;
}

export const NoticeModificationModal: React.FC<NoticeModificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  separation,
}) => {
  const { showToast } = useToast();
  const [approvedLwd, setApprovedLwd] = useState<string>(
    separation?.approved_last_working_date || separation?.expected_last_working_date || ''
  );
  const [noticeWaiverDays, setNoticeWaiverDays] = useState<number>(separation?.notice_waiver_days || 0);
  const [noticeBuyoutDays, setNoticeBuyoutDays] = useState<number>(separation?.notice_buyout_days || 0);
  const [isEarlyRelease, setIsEarlyRelease] = useState<boolean>(separation?.is_early_release || false);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!separation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('A formal justification reason is required for notice period modifications.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await offboardingService.updateNoticePeriod(separation.id, {
        approved_last_working_date: approvedLwd,
        notice_waiver_days: Number(noticeWaiverDays),
        notice_buyout_days: Number(noticeBuyoutDays),
        is_early_release: isEarlyRelease,
        reason,
      });

      showToast('Notice period and LWD updated successfully.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update notice period.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modify Notice Period & Last Working Date" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Policy Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">HR Head Authority Required:</span> Any early release, notice waiver, or buyout
            will update F&F calculations and be immutably recorded in the separation audit ledger.
          </div>
        </div>

        {/* Current State Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs grid grid-cols-2 gap-2 text-gray-700">
          <div>
            <span className="text-gray-400 block font-medium">Original Calculated LWD:</span>
            <span className="font-bold text-gray-900">{separation.expected_last_working_date}</span>
          </div>
          <div>
            <span className="text-gray-400 block font-medium">Standard Notice Days:</span>
            <span className="font-bold text-gray-900">{separation.notice_period_days} Days</span>
          </div>
        </div>

        {/* Modified LWD */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Approved Last Working Date (LWD) *
          </label>
          <input
            type="date"
            value={approvedLwd}
            onChange={e => setApprovedLwd(e.target.value)}
            required
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Notice Adjustments */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Notice Waiver (Days)
            </label>
            <input
              type="number"
              min={0}
              max={90}
              value={noticeWaiverDays}
              onChange={e => setNoticeWaiverDays(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Notice Buyout (Days)
            </label>
            <input
              type="number"
              min={0}
              max={90}
              value={noticeBuyoutDays}
              onChange={e => setNoticeBuyoutDays(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Early Release Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="earlyReleaseCheck"
            checked={isEarlyRelease}
            onChange={e => setIsEarlyRelease(e.target.checked)}
            className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] h-4 w-4"
          />
          <label htmlFor="earlyReleaseCheck" className="text-xs font-bold text-gray-800 cursor-pointer">
            Grant Formal Early Release Exemption
          </label>
        </div>

        {/* Mandatory Reason */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Modification Justification / Business Reason *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
            placeholder="Document reason for waiver, buyout, or early release approved by management..."
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !approvedLwd || !reason.trim()}
            className="bg-[#07563D] hover:bg-[#064e37] text-white"
          >
            {isSubmitting ? 'Saving...' : 'Confirm Notice Modification'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
