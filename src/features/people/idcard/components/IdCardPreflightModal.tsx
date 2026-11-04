// src/features/people/idcard/components/IdCardPreflightModal.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Preflight Quality & Print Check Modal
// ============================================================================

import React from 'react';
import { PreflightIssue } from '../idCardTypes';
import { X, ShieldCheck, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface IdCardPreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: PreflightIssue[];
}

export const IdCardPreflightModal: React.FC<IdCardPreflightModalProps> = ({
  isOpen,
  onClose,
  issues,
}) => {
  if (!isOpen) return null;

  const fixes = issues.filter(i => i.lv === 'fix');
  const checks = issues.filter(i => i.lv === 'check');
  const oks = issues.filter(i => i.lv === 'ok');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-xl bg-[#13171c] border border-[#252d37] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] text-[#e6eaee] overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-[#252d37] px-6 flex items-center justify-between shrink-0 bg-[#181d24]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/70 border border-blue-600/50 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Preflight Print Quality Report</h3>
              <p className="text-[11px] text-gray-400">
                Commercial press checklist: bleed, safe zones, photos, and DPI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#111418] hover:bg-[#252d37] border border-[#2c3642] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Summary Badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">{fixes.length}</div>
                <div className="text-[10px] text-rose-300">Errors to Fix</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">{checks.length}</div>
                <div className="text-[10px] text-amber-300">Warnings</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">{oks.length}</div>
                <div className="text-[10px] text-emerald-300">Passed Checks</div>
              </div>
            </div>
          </div>

          {/* Issue List */}
          <div className="space-y-2">
            {issues.map((iss, idx) => (
              <div
                key={`${iss.key}_${idx}`}
                className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                  iss.lv === 'fix'
                    ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                    : iss.lv === 'check'
                    ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                    : 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300'
                }`}
              >
                {iss.lv === 'fix' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                {iss.lv === 'check' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                {iss.lv === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}

                <div className="flex-1">
                  <div className="font-semibold">{iss.t}</div>
                  {iss.dpi && (
                    <div className="text-[10px] font-mono mt-0.5 opacity-80">
                      Calculated image resolution: {iss.dpi} DPI (Standard minimum: 300 DPI)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-[#252d37] px-6 flex items-center justify-end shrink-0 bg-[#181d24]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
