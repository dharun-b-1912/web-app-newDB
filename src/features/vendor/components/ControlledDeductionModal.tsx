// src/features/vendor/components/ControlledDeductionModal.tsx
// ============================================================================
// Joy PeopleHR — Governed Deduction & Controlled Recovery Manager
// Spec Section 10: Enforces auditability and prevents unverified deduction entries
// (Requires Deduction Type, Amount, Reason, Reference, Source, Entered By, Approved By)
// ============================================================================

import React, { useState } from 'react';
import {
  Lock,
  Plus,
  CheckCircle2,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  UserCheck,
  X,
  UploadCloud
} from 'lucide-react';
import { ControlledDeductionRecord, ControlledDeductionCategory } from '../../../types/payrollAudit';
import { VendorAssetService } from '../../../services/vendor/vendorAssetService';

function fmtINR(n: number): string {
  if (n === 0) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export const SAMPLE_CONTROLLED_DEDUCTIONS: ControlledDeductionRecord[] = [];

interface ControlledDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeductionsUpdated?: (deductions: ControlledDeductionRecord[]) => void;
}

export function ControlledDeductionModal({
  isOpen,
  onClose,
  onDeductionsUpdated,
}: ControlledDeductionModalProps) {
  const [deductions, setDeductions] = useState<ControlledDeductionRecord[]>(() =>
    VendorAssetService.getControlledDeductions()
  );
  const [isAdding, setIsAdding] = useState(false);

  // Form State: clean initial state without mock data
  const [employeeCode, setEmployeeCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [category, setCategory] = useState<ControlledDeductionCategory>('UNIFORM');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [source, setSource] = useState<ControlledDeductionRecord['source']>('HR_WELFARE_LEDGER');
  const [enteredBy, setEnteredBy] = useState('Vendor Payroll Team');
  const [approvedBy, setApprovedBy] = useState('HR Lead');

  if (!isOpen) return null;

  const handleCreateDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (!reason.trim() || !reference.trim() || !employeeName.trim()) return;

    const newRecord: ControlledDeductionRecord = {
      id: `DED-REC-${Date.now().toString().slice(-4)}`,
      employeeId: `EMP-${employeeCode || 'EXT'}`,
      employeeCode: employeeCode || `WRK-${Date.now().toString().slice(-4)}`,
      employeeName,
      category,
      amount: Number(amount),
      reason,
      referenceNumber: reference,
      source,
      enteredBy,
      approvedBy,
      supportingDocRef: `${reference}.pdf`,
      effectivePeriod: '2026-09',
      createdAt: new Date().toISOString(),
      status: 'APPROVED',
    };

    const updated = [newRecord, ...deductions];
    setDeductions(updated);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('workforceos_controlled_deductions_v1', JSON.stringify(updated));
      }
    } catch (_) {}

    if (onDeductionsUpdated) onDeductionsUpdated(updated);
    setIsAdding(false);

    // Reset fields
    setEmployeeCode('');
    setEmployeeName('');
    setAmount('');
    setReason('');
    setReference('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-gray-900">Controlled Deductions & Recoveries Ledger</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Spec Section 10
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Governance guardrails: Every deduction requires typed reason, reference, approver, and ledger source
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAdding ? (
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#07563D] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Governed Deduction</span>
              </button>
            ) : (
              <button
                onClick={() => setIsAdding(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={14} />
                <span>Cancel Entry</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 rounded-lg hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Anti-tampering Warning Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <ShieldCheck size={20} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-0.5">
              <strong className="font-bold text-amber-900 block">Strict Auditability Requirement</strong>
              <p className="leading-relaxed">
                Ad-hoc deductions without reference numbers and HR authorization are strictly prohibited. Every deduction impacts employee Net Pay and must be traceable in the Master Audit Log.
              </p>
            </div>
          </div>

          {/* Form when adding */}
          {isAdding && (
            <form onSubmit={handleCreateDeduction} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="font-black text-gray-900 text-sm">New Governed Deduction Entry</span>
                <span className="text-[10px] text-gray-400">All fields mandatory</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Employee Name</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Deduction Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="UNIFORM">Uniform Recovery</option>
                    <option value="SAFETY_SHOE">Safety Shoe</option>
                    <option value="CANTEEN">Canteen Recovery</option>
                    <option value="ACCOMMODATION_RENT">Accommodation / Rent</option>
                    <option value="SALARY_ADVANCE">Salary Advance</option>
                    <option value="FOOD_RECOVERY">Food Recovery</option>
                    <option value="MARRIAGE_WELFARE">Marriage Welfare Fund</option>
                    <option value="OTHER_GOVERNED_DEDUCTION">Other Governed Deduction</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Recovery Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-red-700"
                    placeholder="e.g. 500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-blue-900 font-bold"
                    placeholder="e.g. UNIFORM-SEP-20385"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Business Reason & Context</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  placeholder="Detailed justification for this recovery"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Authoritative Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="HR_WELFARE_LEDGER">HR Welfare Ledger</option>
                    <option value="BIOMETRIC_CANTEEN">Biometric Canteen</option>
                    <option value="ADVANCE_REGISTER">Advance Register</option>
                    <option value="MANUAL_AUTHORIZED">Manual Authorized Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Entered By</label>
                  <input
                    type="text"
                    value={enteredBy}
                    onChange={(e) => setEnteredBy(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Authorized By</label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#07563D] hover:bg-emerald-800 text-white rounded-xl font-bold transition-all shadow-xs"
                >
                  Authorize & Append to Deduction Register
                </button>
              </div>
            </form>
          )}

          {/* Existing Deductions Ledger Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
              <span className="font-black text-gray-900 uppercase tracking-wider">
                Audited Deduction Entries ({deductions.length})
              </span>
              <span className="font-bold text-red-700 font-mono">
                Total Recoveries: {fmtINR(deductions.reduce((s, d) => s + d.amount, 0))}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Reference No</th>
                    <th className="py-2.5 px-3">Authorizer</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {deductions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="font-bold text-gray-700 text-sm">No controlled deductions recorded yet</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                          Click &ldquo;+ Append Controlled Deduction&rdquo; to add an audited deduction or issue non-returnable equipment with wage recovery in Asset Management.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    deductions.map((d) => (
                      <tr key={d.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-800">{d.employeeCode}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">{d.employeeName}</td>
                        <td className="py-2.5 px-3 text-gray-600 font-semibold">{d.category.replace(/_/g, ' ')}</td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-red-700">{fmtINR(d.amount)}</td>
                        <td className="py-2.5 px-3 text-gray-700 max-w-xs truncate" title={d.reason}>{d.reason}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{d.referenceNumber}</td>
                        <td className="py-2.5 px-3 text-emerald-800 font-bold">{d.approvedBy}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Exported to sheet <span className="font-mono font-bold text-gray-700">04_Deductions</span> and company salary statement
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
