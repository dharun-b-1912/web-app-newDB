// src/features/platform/components/billing/RecordPaymentModal.tsx
// ============================================================
// WorkForceOS — Record Settlement Payment Modal
// ============================================================

import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { DetailedInvoice, platformBillingService } from '../../../../services/platform/platformBillingService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  invoice: DetailedInvoice;
  onClose: () => void;
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  invoice: inv,
  onClose,
  onPaymentRecorded,
}) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<number>(inv.balance_due || inv.total);
  const [paymentMethod, setPaymentMethod] = useState<'Razorpay (Sandbox)' | 'Stripe' | 'ICICI NetBanking' | 'Bank Wire (RTGS)' | 'Corporate UPI'>('Corporate UPI');
  const [transactionRef, setTransactionRef] = useState<string>(`UTR-BANK-${Date.now().toString().slice(-6)}`);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await platformBillingService.recordPayment({
        invoiceId: inv.id,
        amount,
        paymentMethod,
        transactionRef,
      });

      showToast(`Recorded payment of ₹${amount.toLocaleString('en-IN')} for ${inv.invoice_number}`, 'success');
      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Payment recording failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Record Payment</h3>
            <p className="text-xs text-gray-500">{inv.invoice_number} • {inv.tenant_name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Invoice:</span>
              <strong className="text-gray-900 font-mono">₹{inv.total.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Already Paid:</span>
              <strong className="text-emerald-700 font-mono">₹{inv.amount_paid.toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span className="text-gray-900">Current Balance Due:</span>
              <span className="text-rose-600 font-mono">₹{inv.balance_due.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Payment Amount (₹) *</label>
            <input
              type="number"
              required
              max={inv.balance_due}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Settlement Channel *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs font-bold"
            >
              <option value="Corporate UPI">Corporate UPI</option>
              <option value="Bank Wire (RTGS)">Bank Wire (RTGS / NEFT)</option>
              <option value="ICICI NetBanking">ICICI Direct NetBanking</option>
              <option value="Razorpay (Sandbox)">Razorpay (Sandbox Gateway)</option>
              <option value="Stripe">Stripe Card Payment</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">UTR / Transaction Reference *</label>
            <input
              type="text"
              required
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
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
              disabled={isSubmitting || amount <= 0}
              className="bg-[#047857] hover:bg-[#036246] text-white font-bold cursor-pointer"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Payment Settlement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
