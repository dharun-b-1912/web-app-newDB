import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ThreeWayMatchResult } from '../../../types/vendorPortal';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ThreeWayMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchResult: ThreeWayMatchResult | null;
  onConfirmSubmit?: () => void;
}

export const ThreeWayMatchModal: React.FC<ThreeWayMatchModalProps> = ({
  isOpen,
  onClose,
  matchResult,
  onConfirmSubmit,
}) => {
  if (!matchResult) return null;

  const isMatched = matchResult.match_status === 'MATCHED';
  const isException = matchResult.match_status === 'EXCEPTION';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="3-Way Matching Engine Verification" maxWidth="lg">
      <div className="space-y-6 p-1">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            isMatched
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : isException
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {isMatched ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            ) : isException ? (
              <XCircle className="w-6 h-6 text-rose-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            )}
            <div>
              <div className="font-bold text-sm">
                3-Way Match Status: {matchResult.match_status.replace(/_/g, ' ')}
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {isMatched
                  ? 'All 3 data sources reconciled with zero material variance. Ready for Finance authorization.'
                  : isException
                  ? 'Discrepancy detected exceeding statutory/PO tolerances. Blocked from auto-approval.'
                  : 'Minor variance detected. Requires secondary finance review.'}
              </p>
            </div>
          </div>
          <Badge
            variant={isMatched ? 'success' : isException ? 'danger' : 'warning'}
            size="md"
          >
            {matchResult.match_status}
          </Badge>
        </div>

        {/* The 3-Way Grid comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Source 1: Purchase Order */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  1. Purchase Order
                </span>
                <Badge variant="outline" size="sm">
                  {matchResult.po_number}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">Available PO Balance</p>
              <div className="text-lg font-bold text-gray-900 font-mono mt-1">
                ₹{matchResult.po_available_balance.toLocaleString()}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-600 flex items-center gap-1">
              {matchResult.is_po_limit_sufficient ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Limit Sufficient
                </span>
              ) : (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Exceeds PO Balance
                </span>
              )}
            </div>
          </div>

          {/* Source 2: Approved Payroll */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                  2. Approved Payroll
                </span>
                <Badge variant="blue" size="sm">
                  {matchResult.period}
                </Badge>
              </div>
              <p className="text-xs text-blue-600">Locked System Payable</p>
              <div className="text-lg font-bold text-blue-900 font-mono mt-1">
                ₹{matchResult.approved_payroll_payable.toLocaleString()}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-blue-200 text-[11px] text-blue-700 flex items-center gap-1">
              {matchResult.is_payroll_matched ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified by HR & Vendor
                </span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Variance with Claim
                </span>
              )}
            </div>
          </div>

          {/* Source 3: Vendor Invoice */}
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  3. Vendor Invoice
                </span>
                <Badge variant="outline" size="sm">
                  {matchResult.invoice_number}
                </Badge>
              </div>
              <p className="text-xs text-indigo-600">Claimed Gross Value</p>
              <div className="text-lg font-bold text-indigo-900 font-mono mt-1">
                ₹{matchResult.vendor_invoice_claimed.toLocaleString()}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-indigo-200 text-[11px] text-indigo-700 flex items-center gap-1">
              <span className="font-medium">
                Variance: ₹{Math.abs(matchResult.difference_amount).toLocaleString()} (
                {matchResult.variance_percentage.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Exceptions list if any */}
        {matchResult.exception_notes.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Audit Exceptions & Discrepancy Warnings
            </h4>
            <ul className="list-disc list-inside text-xs text-rose-800 space-y-1">
              {matchResult.exception_notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {onConfirmSubmit && (
            <Button
              variant="primary"
              size="sm"
              onClick={onConfirmSubmit}
              disabled={isException}
            >
              {isException ? 'Blocked Due to Exceptions' : 'Proceed to Finance Outbox'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
