// src/components/governance/SensitiveChangeModal.tsx
// ============================================================
// Joy PeopleHR — Authority with Accountability Override Modal
// Mandatory Reason Capture & Stakeholder Notification for Level 3 & Level 4 Changes
// ============================================================

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { FieldDiff, DataSensitivityLevel } from '../../services/governance/governanceAuditService';

interface SensitiveChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notifyStakeholders: boolean) => void;
  targetLabel: string;
  sensitivityLevel: DataSensitivityLevel;
  recordOwner: string;
  diffs: FieldDiff[];
  affectedStakeholders: string[];
  isSubmitting?: boolean;
}

export const SensitiveChangeModal: React.FC<SensitiveChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetLabel,
  sensitivityLevel,
  recordOwner,
  diffs,
  affectedStakeholders,
  isSubmitting = false,
}) => {
  const [reason, setReason] = useState<string>('');
  const [notifyStakeholders, setNotifyStakeholders] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isCritical = sensitivityLevel === 4;

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError('Please provide a mandatory reason for this sensitive override.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters long.');
      return;
    }
    setError(null);
    onConfirm(reason.trim(), notifyStakeholders);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCritical ? '⚠️ Critical Financial Override Gate' : '⚠️ Sensitive Record Change Required Reason'}
      size="lg"
    >
      <div className="space-y-5">
        {/* Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            isCritical
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isCritical ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wider">
                {isCritical ? 'Level 4 — Critical / Financial Override' : 'Level 3 — Sensitive Data Governance'}
              </span>
              <Badge variant={isCritical ? 'danger' : 'warning'} size="sm">
                Record Owner: {recordOwner}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              You are modifying {targetLabel}. In accordance with Enterprise Governance & ISO 27001 policies, all sensitive overrides are immutably logged with actor attribution, timestamp, before/after values, and mandatory justification.
            </p>
          </div>
        </div>

        {/* Before vs After Diff Table */}
        <div className="bg-gray-50/80 rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-100/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
            Pending Modifications ({diffs.length} Fields)
          </div>
          <div className="divide-y divide-gray-200/60 max-h-48 overflow-y-auto">
            {diffs.map((diff, idx) => (
              <div key={idx} className="p-3 text-xs flex items-center justify-between gap-4">
                <div className="font-semibold text-gray-800 w-1/3 truncate">
                  {diff.fieldLabel}
                </div>
                <div className="flex items-center gap-2 w-2/3 justify-end font-mono">
                  <span className="text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 line-through">
                    {String(diff.oldValue || '—')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {String(diff.newValue || '—')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mandatory Reason Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-900">
            Mandatory Reason for Override / Modification <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Annual compensation increment approved by Management, IFSC correction from bank statement, Promotion adjustment..."
            rows={3}
            className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
          />
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        {/* Stakeholder Notification Checkbox */}
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <div className="text-xs font-bold text-gray-900">Notify Record Stakeholders</div>
              <div className="text-[11px] text-gray-500">
                Will notify {affectedStakeholders.join(', ') || 'HR & Payroll Administrators'}
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={notifyStakeholders}
            onChange={(e) => setNotifyStakeholders(e.target.checked)}
            className="w-4 h-4 text-[#07563D] rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            loading={isSubmitting}
            className="bg-[#07563D] hover:bg-[#053e2c] text-white"
            leftIcon={<Lock className="w-3.5 h-3.5" />}
          >
            Confirm & Audit Change
          </Button>
        </div>
      </div>
    </Modal>
  );
};
