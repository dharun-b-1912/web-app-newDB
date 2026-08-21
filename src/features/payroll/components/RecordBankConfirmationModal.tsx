import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Globe,
  FileSpreadsheet,
  Check,
  Calendar,
  Building,
  UserCheck,
  Info,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { payrollApi } from '../../../services/payrollApi';
import { BankDisbursementBatch } from '../../../types/payroll';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../lib/utils';

export interface RecordBankConfirmationModalProps {
  batch: BankDisbursementBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedBatch: BankDisbursementBatch) => void;
}

export const RecordBankConfirmationModal: React.FC<RecordBankConfirmationModalProps> = ({
  batch,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [channel, setChannel] = useState<'Email' | 'Phone' | 'NetBanking' | 'BankStatement' | 'FileImport' | 'DirectManual'>('Email');
  const [bankUtr, setBankUtr] = useState<string>('');
  const [confirmedByName, setConfirmedByName] = useState<string>(user?.name || 'HR Administrator');
  const [confirmationDate, setConfirmationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [confirmationNotes, setConfirmationNotes] = useState<string>('');
  const [hasExceptions, setHasExceptions] = useState<boolean>(false);
  const [selectedFailedEmpIds, setSelectedFailedEmpIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !batch) return null;

  const items = batch.items || [];

  const handleToggleFailedEmployee = (empId: string) => {
    setSelectedFailedEmpIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSubmit = () => {
    if (!bankUtr.trim()) {
      showToast('Please enter the Bank Transaction / UTR / Reference Number', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = payrollApi.recordManualBankSettlement(batch.id, {
        confirmation_channel: channel,
        bank_reference_utr: bankUtr.trim(),
        confirmed_by_name: confirmedByName,
        confirmation_notes: confirmationNotes || `Bank confirmed settlement via ${channel} on ${confirmationDate}`,
        failed_employee_ids: hasExceptions ? selectedFailedEmpIds : [],
      });

      setIsSubmitting(false);
      showToast(`✓ Bank settlement recorded! Batch status updated to ${updated.status}.`);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      showToast(err.message || 'Failed to record bank settlement', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#07563D] to-[#0a7a57] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 border border-white/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Record Bank Payout Confirmation</h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Update batch to Settled after receiving email, phone, or portal confirmation from the bank
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-gray-50/50 text-xs">

          {/* Batch Summary Pill */}
          <div className="p-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Disbursement Target</span>
              <strong className="text-sm font-bold text-gray-900 font-mono">{batch.batch_number}</strong>
              <span className="text-gray-500 text-xs block mt-0.5">{batch.pay_period} • {batch.total_transactions} Employees</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Net Amount</span>
              <strong className="text-base font-black text-[#07563D] font-mono">₹{batch.total_amount.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* 1. Channel Selector */}
          <div>
            <label className="font-bold text-gray-700 block mb-1.5">How did the bank contact / confirm the payout?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Email', label: 'Bank Email', icon: Mail, desc: 'From Bank RM / Desk' },
                { id: 'Phone', label: 'Phone Call', icon: Phone, desc: 'Verbal RM Confirmation' },
                { id: 'NetBanking', label: 'NetBanking Portal', icon: Globe, desc: 'Corporate Portal Statement' },
                { id: 'BankStatement', label: 'Bank Advice / Doc', icon: FileSpreadsheet, desc: 'Bank Statement / Report' },
              ].map(c => {
                const Icon = c.icon;
                const isSelected = channel === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setChannel(c.id as any)}
                    className={cn(
                      "p-3 rounded-xl border text-left cursor-pointer transition-all select-none",
                      isSelected ? "bg-emerald-50 border-[#07563D] ring-1 ring-[#07563D] shadow-2xs" : "bg-white border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 mb-0.5">
                      <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-[#07563D]" : "text-gray-500")} />
                      <span>{c.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block leading-tight">{c.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Bank UTR / Reference Number */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">
              Bank Transaction Reference / UTR Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-HDFC-20260831-9821 or CMS-REF-18920"
              value={bankUtr}
              onChange={e => setBankUtr(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Reference number provided by your bank RM or extracted from the debit advice.
            </span>
          </div>

          {/* 3. Confirmed By & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Confirmed By (HR / Finance)</label>
              <input
                type="text"
                value={confirmedByName}
                onChange={e => setConfirmedByName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Confirmation Date</label>
              <input
                type="date"
                value={confirmationDate}
                onChange={e => setConfirmationDate(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#07563D]"
              />
            </div>
          </div>

          {/* 4. Notes */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">Confirmation / Bank RM Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Confirmed with HDFC Relationship Manager Mr. Rajesh; all salaries processed successfully."
              value={confirmationNotes}
              onChange={e => setConfirmationNotes(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            />
          </div>

          {/* 5. Any Specific Account Failures Flagged? */}
          <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-gray-900 block text-xs">Were there any returned / failed accounts?</strong>
                <span className="text-gray-500 text-[11px]">Leave unchecked if all employees received salary without returns.</span>
              </div>
              <input
                type="checkbox"
                id="has-exceptions"
                checked={hasExceptions}
                onChange={e => setHasExceptions(e.target.checked)}
                className="w-4 h-4 rounded text-[#07563D] focus:ring-[#07563D]"
              />
            </div>

            {hasExceptions && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <span className="font-bold text-gray-700 block text-[11px]">Select employees whose accounts bounced / failed:</span>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {items.map(it => {
                    const isChecked = selectedFailedEmpIds.includes(it.id) || selectedFailedEmpIds.includes(it.employee_id);
                    return (
                      <div
                        key={it.id}
                        onClick={() => handleToggleFailedEmployee(it.id)}
                        className={cn(
                          "p-2 rounded-lg border flex items-center justify-between cursor-pointer select-none",
                          isChecked ? "bg-rose-50 border-rose-300" : "bg-gray-50 border-gray-200"
                        )}
                      >
                        <div>
                          <strong className="text-gray-900 block">{it.employee_name} ({it.employee_code})</strong>
                          <span className="text-[10px] text-gray-500 font-mono">{it.account_number_masked} • ₹{it.amount.toLocaleString('en-IN')}</span>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          isChecked ? "bg-rose-100 text-rose-800" : "bg-gray-200 text-gray-600"
                        )}>
                          {isChecked ? 'Flagged as Failed' : 'Settled'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-white border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs font-semibold"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !bankUtr.trim()}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl text-xs shadow-xs"
          >
            {isSubmitting ? 'Recording Settlement...' : '✓ Confirm Bank Settlement & Settle Batch'}
          </Button>
        </div>

      </div>
    </div>
  );
};
