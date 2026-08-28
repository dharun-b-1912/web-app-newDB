// src/features/platform/components/tenants/AccessCustomerModal.tsx
// ============================================================
// Joy PeopleHR — Temporary Support Access Confirmation Modal
// ============================================================

import React, { useState } from 'react';
import {
  Shield,
  Clock,
  User,
  AlertTriangle,
  X,
  Zap,
  Lock,
  FileText,
  KeyRound,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { SupportAccessMode } from '../../../../services/platform/platformSupportAccessService';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';

export interface AccessCustomerModalProps {
  isOpen: boolean;
  organization: OrganizationRecord;
  onClose: () => void;
  onStartSession: (params: {
    accessMode: SupportAccessMode;
    durationMinutes: number;
    reason: string;
    supportCaseId?: string;
  }) => Promise<void>;
}

export const AccessCustomerModal: React.FC<AccessCustomerModalProps> = ({
  isOpen,
  organization: org,
  onClose,
  onStartSession,
}) => {
  const [accessMode, setAccessMode] = useState<SupportAccessMode>('SUPPORT ACCESS');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [reason, setReason] = useState<string>('Investigating support issue');
  const [supportCaseId, setSupportCaseId] = useState<string>('SUP-10482');
  const [customReason, setCustomReason] = useState<string>('');
  const [isStarting, setIsStarting] = useState<boolean>(false);

  const reasonOptions = [
    'Investigating support issue',
    'Troubleshooting configuration',
    'Checking subscription setup',
    'Testing customer workflow',
    'Customer requested assistance',
    'Other',
  ];

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStarting) return;

    setIsStarting(true);
    try {
      await onStartSession({
        accessMode,
        durationMinutes,
        reason: reason === 'Other' ? (customReason || 'Administrative assistance') : reason,
        supportCaseId: supportCaseId || undefined,
      });
      onClose();
    } finally {
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Access Customer Account</h3>
              <p className="text-xs text-gray-500">Launch a temporary, server-side audited support session.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleStart} className="space-y-4">
          {/* Identity Confirmation Pill */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Your Identity:</span>
              <strong className="text-gray-900 font-bold">Thirumalai R K (Platform Admin)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Target Organization:</span>
              <strong className="text-purple-700 font-bold">{org.legal_name}</strong>
            </div>
          </div>

          {/* Access Mode Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1.5">Support Access Mode *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['VIEW ONLY', 'SUPPORT ACCESS', 'FULL SUPPORT ACCESS'] as SupportAccessMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAccessMode(mode)}
                  className={cn(
                    'p-2.5 rounded-xl border font-bold text-[11px] text-center transition cursor-pointer',
                    accessMode === mode
                      ? 'border-[#047857] bg-emerald-50 text-[#047857] ring-1 ring-[#047857]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Session Duration Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1.5">Session Duration (Auto-Expires) *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '15 Minutes', val: 15 },
                { label: '30 Minutes', val: 30 },
                { label: '1 Hour', val: 60 },
              ].map((d) => (
                <button
                  key={d.val}
                  type="button"
                  onClick={() => setDurationMinutes(d.val)}
                  className={cn(
                    'p-2.5 rounded-xl border font-bold text-xs text-center transition cursor-pointer',
                    durationMinutes === d.val
                      ? 'border-[#047857] bg-emerald-50 text-[#047857] ring-1 ring-[#047857]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Dropdown */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Access Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs font-semibold text-gray-800"
            >
              {reasonOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {reason === 'Other' && (
            <div>
              <label className="block font-bold text-gray-700 mb-1">Explain Reason *</label>
              <input
                type="text"
                required
                placeholder="Specific operational justification..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
              />
            </div>
          )}

          {/* Support Case ID (Optional) */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Linked Support Ticket # (Optional)</label>
            <input
              type="text"
              placeholder="e.g. SUP-10482"
              value={supportCaseId}
              onChange={(e) => setSupportCaseId(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
            />
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              All actions performed during this support session will be permanently attributed to <strong>Thirumalai R K</strong> in the audit ledger. Customer credentials are never shared.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isStarting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isStarting}
              className="bg-[#047857] hover:bg-[#036246] text-white font-bold cursor-pointer"
            >
              {isStarting ? 'Starting Session...' : 'Launch Support Access'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
