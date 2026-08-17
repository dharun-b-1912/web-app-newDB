// src/features/platform/components/billing/IssueRefundModal.tsx
// ============================================================
// WorkForceOS — Issue Financial Refund Modal
// ============================================================

import React, { useState } from 'react';
import {
  DollarSign,
  X,
  AlertTriangle,
} from 'lucide-react';
import { DetailedInvoice, platformBillingService } from '../../../../services/platform/platformBillingService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';

export interface IssueRefundModalProps {
  isOpen: boolean;
  invoice: DetailedInvoice;
  onClose: () => void;
  onRefundIssued: () => void;
}

export const IssueRefundModal: React.FC<IssueRefundModalProps> = ({
  isOpen,
  invoice: inv,
  onClose,
  onRefundIssued,
}) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<number>(inv.amount_paid);
  const [reason, setReason] = useState<string>('Billing adjustment / Subscription cancellation');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > inv.amount_paid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await platformBillingService.issueRefund({
        invoiceId: inv.id,
        amount,
        reason,
      });

      showToast(`Refund of ₹${amount.toLocaleString('en-IN')} processed successfully`, 'success');
      onRefundIssued();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Refund failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Issue Payment Refund</h3>
            <p className="text-xs text-gray-500">{inv.invoice_number} • {inv.tenant_name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Paid Amount:</span>
              <strong className="text-emerald-700 font-mono">₹{inv.amount_paid.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Maximum Refundable:</span>
              <strong className="text-gray-900 font-mono">₹{inv.amount_paid.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Refund Amount (₹) *</label>
            <input
              type="number"
              required
              max={inv.amount_paid}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Reason for Refund *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSubmitting || amount <= 0 || amount > inv.amount_paid}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
