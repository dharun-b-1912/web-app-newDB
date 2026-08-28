// src/features/platform/components/PrivilegedActionModal.tsx
// ============================================================
// Joy PeopleHR — Privileged Action Confirmation Modal
// ============================================================

import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, Lock, CheckCircle2 } from 'lucide-react';

export interface PrivilegedActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  actionLabel: string;
  targetName: string;
  severity?: 'High' | 'Critical';
  requiredConfirmationText?: string;
  description: string;
}

export const PrivilegedActionModal: React.FC<PrivilegedActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionLabel,
  targetName,
  severity = 'High',
  requiredConfirmationText,
  description,
}) => {
  const [reason, setReason] = useState('');
  const [typedConfirm, setTypedConfirm] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isCritical = severity === 'Critical';
  const requiresTypeMatch = Boolean(requiredConfirmationText);
  const isTypeMatchValid = !requiresTypeMatch || typedConfirm.trim() === requiredConfirmationText;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A valid operational reason is required for compliance and audit logging.');
      return;
    }
    if (requiresTypeMatch && !isTypeMatchValid) {
      setError(`Please type "${requiredConfirmationText}" exactly to confirm.`);
      return;
    }

    onConfirm(reason);
    setReason('');
    setTypedConfirm('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className={`p-5 flex items-start gap-3.5 border-b ${isCritical ? 'bg-red-50/80 border-red-200' : 'bg-amber-50/80 border-amber-200'}`}>
          <div className={`p-2.5 rounded-xl ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
            {isCritical ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isCritical ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'}`}>
                {severity} Privileged Action
              </span>
            </div>
            <h3 className="text-base font-black text-gray-900 mt-1">{title}</h3>
            <p className="text-xs text-gray-600 mt-0.5">Target: <strong className="text-gray-900">{targetName}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs text-gray-700 leading-relaxed">
            {description}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Operational Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={e => { setReason(e.target.value); setError(''); }}
              placeholder="Provide a specific audit justification for this privileged operation..."
              className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-hidden"
            />
          </div>

          {requiresTypeMatch && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Type <span className="font-mono text-red-600 font-black">{requiredConfirmationText}</span> to confirm:
              </label>
              <input
                type="text"
                required
                value={typedConfirm}
                onChange={e => { setTypedConfirm(e.target.value); setError(''); }}
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-gray-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-hidden"
              />
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={requiresTypeMatch && !isTypeMatchValid}
              className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                isCritical
                  ? 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                  : 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              {actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
