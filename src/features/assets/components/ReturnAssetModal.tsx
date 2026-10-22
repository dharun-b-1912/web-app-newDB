// src/features/assets/components/ReturnAssetModal.tsx
// ============================================================================
// Joy PeopleHR — Asset Return & Clearance Modal
// Records Return Date, Condition Inspection, and Damage/Payroll Deduction Settlement
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { assetAssignmentService } from '../../../services/asset/assetAssignmentService';
import { AssetAssignment, UniversalAsset, AssetCondition } from '../../../types';
import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ReturnAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: AssetAssignment | null;
  asset?: UniversalAsset | null;
}

export const ReturnAssetModal: React.FC<ReturnAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  asset,
}) => {
  const { showToast } = useToast();

  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [conditionAtReturn, setConditionAtReturn] = useState<AssetCondition>('GOOD');
  const [deductionStatus, setDeductionStatus] = useState<
    'NO_DEDUCTION' | 'DEDUCTED_PAYROLL' | 'DEPOSIT_HELD' | 'WAIVED' | 'REFUNDED'
  >('NO_DEDUCTION');
  const [deductionCharged, setDeductionCharged] = useState<string>(
    String(assignment?.deduction_amount || 0)
  );
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await assetAssignmentService.returnAsset({
        assignmentId: assignment.id,
        assetId: assignment.asset_id,
        returnDate,
        conditionAtReturn,
        deductionStatus,
        deductionCharged: Number(deductionCharged) || 0,
        remarks,
      });

      showToast(`Asset return processed with status: ${deductionStatus}!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to process return in database.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return & Clear Asset Custody" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Custody Info Card */}
        <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-500 uppercase tracking-wider">Custodian</span>
            <span className="font-bold text-gray-900">{assignment.target_name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-500 uppercase tracking-wider">Asset</span>
            <span className="font-bold text-gray-900 font-mono">
              {asset?.asset_code || 'AST'} — {asset?.asset_name || 'Asset Item'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-200">
            <span className="text-gray-500">Issued On</span>
            <span className="font-semibold text-gray-700">{assignment.assigned_at?.slice(0, 10)}</span>
          </div>
        </div>

        {/* Return Date */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Actual Return Date *
          </label>
          <input
            type="date"
            required
            value={returnDate}
            onChange={e => setReturnDate(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Return Condition */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Condition at Return *
          </label>
          <select
            value={conditionAtReturn}
            onChange={e => {
              const val = e.target.value as AssetCondition;
              setConditionAtReturn(val);
              if (val === 'DAMAGED' || val === 'CRITICAL') {
                setDeductionStatus('DEDUCTED_PAYROLL');
              } else {
                setDeductionStatus('NO_DEDUCTION');
              }
            }}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          >
            <option value="EXCELLENT">Excellent — Like New</option>
            <option value="GOOD">Good — Normal Wear</option>
            <option value="FAIR">Fair — Serviceable</option>
            <option value="DAMAGED">Damaged — Needs Repair / Deduction</option>
            <option value="CRITICAL">Lost / Damaged Beyond Repair</option>
          </select>
        </div>

        {/* Deduction Settlement Card */}
        <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-3">
          <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
            Deduction & Clearance Settlement
          </label>
          <select
            value={deductionStatus}
            onChange={e => setDeductionStatus(e.target.value as any)}
            className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          >
            <option value="NO_DEDUCTION">No Deduction — Full Clearance Issued</option>
            <option value="DEDUCTED_PAYROLL">Deduct from Employee Monthly Payroll</option>
            <option value="DEPOSIT_HELD">Security Deposit Retained / Adjusted</option>
            <option value="REFUNDED">Security Deposit Refunded to Employee</option>
            <option value="WAIVED">Waived by Management Discretion</option>
          </select>

          {deductionStatus === 'DEDUCTED_PAYROLL' && (
            <div className="pt-2 flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-amber-900">Deduction Recovery Amount:</span>
              <div className="w-32 relative">
                <span className="absolute left-2.5 top-1.5 text-xs text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  value={deductionCharged}
                  onChange={e => setDeductionCharged(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg pl-6 pr-2 py-1 text-xs font-bold text-gray-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Inspection Remarks / Notes
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="e.g. Asset inspected by stores in-charge. All accessories received."
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
          >
            {isSubmitting ? 'Processing...' : 'Complete Return & Clearance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
