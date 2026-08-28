// src/features/platform/components/billing/CreateCreditNoteModal.tsx
// ============================================================
// Joy PeopleHR — Issue Credit Note Modal
// ============================================================

import React, { useState } from 'react';
import {
  FileText,
  RotateCcw,
  X,
  AlertTriangle,
} from 'lucide-react';
import { DetailedInvoice, platformBillingService } from '../../../../services/platform/platformBillingService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';

export interface CreateCreditNoteModalProps {
  isOpen: boolean;
  invoice: DetailedInvoice;
  onClose: () => void;
  onCreditNoteCreated: () => void;
}

export const CreateCreditNoteModal: React.FC<CreateCreditNoteModalProps> = ({
  isOpen,
  invoice: inv,
  onClose,
  onCreditNoteCreated,
}) => {
  const { showToast } = useToast();
  const [amount, setAmount] = useState<number>(5000);
  const [reason, setReason] = useState<string>('SLA Credit / Downtime adjustment');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await platformBillingService.issueCreditNote({
        invoiceId: inv.id,
        amount,
        reason,
      });

      showToast(`Credit note issued for ₹${amount.toLocaleString('en-IN')}`, 'success');
      onCreditNoteCreated();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Credit note creation failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Issue Credit Note</h3>
            <p className="text-xs text-gray-500">Against {inv.invoice_number} • {inv.tenant_name}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Credit Amount (₹) *</label>
            <input
              type="number"
              required
              max={inv.total}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Reason for Credit *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs font-semibold"
            >
              <option value="SLA Credit / Downtime adjustment">SLA Credit / Downtime adjustment</option>
              <option value="Overcharge correction">Overcharge correction</option>
              <option value="Contractual discount adjustment">Contractual discount adjustment</option>
              <option value="Customer Goodwill">Customer Goodwill</option>
            </select>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
            This will adjust the customer's balance due and post an adjustment entry to the financial ledger.
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
              {isSubmitting ? 'Issuing...' : 'Issue Credit Note'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
