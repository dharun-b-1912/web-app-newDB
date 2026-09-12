// src/features/organization/components/VendorThreeWayMatchModal.tsx
// ============================================================================
// JOY PeopleHR — Visual Centerpiece: Commercial 3-Way Match Reconciler
// Compares: ATTENDANCE (Biometric Days) ↔ CONTRACT / PO ↔ INVOICE
// ============================================================================

import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  ThreeWayMatchResult,
  VendorThreeWayMatchEngine,
} from '../../../services/vendor/vendorThreeWayMatchEngine';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Briefcase,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  XCircle,
} from 'lucide-react';

export interface VendorThreeWayMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchResult: ThreeWayMatchResult;
  onApprove: (result: ThreeWayMatchResult) => void;
  onRequestCorrection: (result: ThreeWayMatchResult) => void;
}

export const VendorThreeWayMatchModal: React.FC<VendorThreeWayMatchModalProps> = ({
  isOpen,
  onClose,
  matchResult,
  onApprove,
  onRequestCorrection,
}) => {
  const isMatched = matchResult.match_status === 'MATCHED';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Commercial 3-Way Match Reconciliation"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Visual Outcome Banner */}
        <div
          className={`p-5 rounded-2xl border flex items-center justify-between shadow-2xs ${
            isMatched
              ? 'bg-emerald-50/80 border-emerald-200 text-[#07563D]'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${
                isMatched ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {isMatched ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  {isMatched ? 'Three-Way Match Reconciled (100% Invariant)' : 'Reconciliation Exception Detected'}
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isMatched ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Variance: {matchResult.variance_percentage}%
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {isMatched
                  ? `Invoice #${matchResult.invoice_number} perfectly reconciles with approved biometric attendance and contract terms.`
                  : `Discrepancies found between invoiced claim and attendance records for ${matchResult.period}.`}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block">Invoiced Total</span>
            <span className="text-lg font-black font-mono">
              ₹{matchResult.claimed_amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* 3 Pillars Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Approved Attendance */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <Clock className="w-4 h-4 text-[#07563D]" />
                <span>1. Attendance Authority</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                Biometric Lock
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Period:</span>
                <span className="font-bold text-gray-800">{matchResult.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Approved Man-Days:</span>
                <span className="font-black text-gray-900 font-mono">{matchResult.attendance_man_days} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Overtime Hours:</span>
                <span className="font-mono text-gray-700">{matchResult.attendance_ot_hours} Hrs</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-400">Base Wages:</span>
                <span className="font-mono font-bold text-[#07563D]">
                  ₹{matchResult.approved_wages_payable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Pillar 2: Contract & PO Authority */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <Briefcase className="w-4 h-4 text-blue-700" />
                <span>2. Contract / PO Terms</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 font-mono">
                {matchResult.po_number}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Daily Rate Card:</span>
                <span className="font-mono text-gray-800">₹{matchResult.contract_daily_rate} / day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">OT Hourly Rate:</span>
                <span className="font-mono text-gray-800">₹{matchResult.contract_ot_hourly_rate} / hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Service Charge:</span>
                <span className="font-mono text-gray-800">{matchResult.contract_service_charge_pct}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-400">PO Balance:</span>
                <span className="font-mono font-bold text-blue-900">
                  ₹{matchResult.po_budget_available.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Vendor Claimed Invoice */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <FileText className="w-4 h-4 text-purple-700" />
                <span>3. Vendor Claim</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 font-mono">
                {matchResult.invoice_number}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Claimed Days:</span>
                <span className="font-mono font-bold text-gray-800">
                  {matchResult.claimed_man_days || matchResult.attendance_man_days} Days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Calculated Total:</span>
                <span className="font-mono text-gray-800">
                  ₹{matchResult.expected_total_amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Variance Amount:</span>
                <span
                  className={`font-mono font-bold ${
                    Math.abs(matchResult.variance_amount) > 1 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  ₹{matchResult.variance_amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-400">Claimed Total:</span>
                <span className="font-mono font-black text-gray-900">
                  ₹{matchResult.claimed_amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Exceptions List if not matched */}
        {matchResult.exception_reasons.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2 text-xs text-rose-900">
            <div className="flex items-center gap-2 font-bold text-rose-800">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>Audit Exception Reasons:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-rose-700">
              {matchResult.exception_reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>

          <div className="flex items-center gap-2">
            {!isMatched && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRequestCorrection(matchResult)}
                leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                Request Invoice Correction
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onApprove(matchResult)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              className="text-xs font-bold bg-[#07563D] hover:bg-[#05432f] text-white"
            >
              {isMatched ? 'Approve & Authorize Settlement' : 'Approve with Exception Override'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
