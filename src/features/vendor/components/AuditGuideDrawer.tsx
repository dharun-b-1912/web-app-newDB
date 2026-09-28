// src/features/vendor/components/AuditGuideDrawer.tsx
// ============================================================================
// Joy PeopleHR — Interactive Attendance Ingestion & Audit Guide Slide-Over Drawer
// Explains the 8-step pipeline, 4 validation layers, provenance guarantees,
// and "What the system does NOT do" for HR and vendor compliance audits.
// ============================================================================

import React from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Layers,
  Sparkles,
  GitCompare,
  Database,
  Check,
} from 'lucide-react';

export interface AuditGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditGuideDrawer: React.FC<AuditGuideDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-gray-200">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <HelpCircle className="w-6 h-6 text-emerald-200" />
              </div>
              <div>
                <h2 className="text-base font-bold">How Attendance Ingestion Works</h2>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Universal Multi-Sheet Pipeline &amp; 4-Layer Audit Architecture
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-700">
            {/* Introductory Overview */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Enterprise Attendance &amp; Statutory Audit
              </div>
              <p className="text-emerald-900 leading-relaxed">
                Joy PeopleHR processes multi-sheet attendance workbooks through a deterministic 8-step pipeline.
                Original raw cell data is preserved with full cell-level provenance, ensuring every calculation
                is defensible during statutory Form 25B, Form B, and vendor billing audits.
              </p>
            </div>

            {/* The 8 Ingestion Steps */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                The 8-Step Processing Pipeline
              </h3>

              {/* Step 01 */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                    01
                  </span>
                  <span className="font-bold text-gray-900 text-xs">Upload Attendance Workbook</span>
                </div>
                <p className="text-gray-600 pl-7 leading-relaxed">
                  Upload Excel (.xlsx, .xls) or CSV files. The parser reads raw sheets into memory using streaming buffers without altering your original files.
                </p>
              </div>

              {/* Step 02 */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                    02
                  </span>
                  <span className="font-bold text-gray-900 text-xs">Identify Attendance Sources</span>
                </div>
                <p className="text-gray-600 pl-7 leading-relaxed">
                  The system detects sheet roles based on header heuristics and row structures:
                </p>
                <div className="grid grid-cols-3 gap-2 pl-7 pt-1 font-mono text-[11px]">
                  <div className="p-2 bg-white rounded border border-gray-200 text-gray-800">
                    <strong className="text-emerald-800 block font-sans">IN&amp;OUT</strong>
                    Daily punch logs
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-200 text-gray-800">
                    <strong className="text-blue-800 block font-sans">MR REPORT</strong>
                    Monthly Muster Roll
                  </div>
                  <div className="p-2 bg-white rounded border border-gray-200 text-gray-800">
                    <strong className="text-amber-800 block font-sans">OT REPORT</strong>
                    Overtime matrix
                  </div>
                </div>
              </div>

              {/* Step 03 */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                    03
                  </span>
                  <span className="font-bold text-gray-900 text-xs">Map Column Names</span>
                </div>
                <p className="text-gray-600 pl-7 leading-relaxed">
                  Different vendors use varying header terms. The engine automatically maps vendor headers to canonical fields:
                </p>
                <div className="pl-7 pt-1">
                  <table className="w-full text-left text-[11px] border border-gray-200 rounded overflow-hidden">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="py-1 px-2">Your Excel Header</th>
                        <th className="py-1 px-2">Joy PeopleHR Field</th>
                        <th className="py-1 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-gray-800">
                      <tr>
                        <td className="py-1 px-2 font-mono">Employee No / Emp ID</td>
                        <td className="py-1 px-2 font-semibold">Employee ID</td>
                        <td className="py-1 px-2 text-emerald-700 font-bold">✓ Auto</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">Name / Worker Name</td>
                        <td className="py-1 px-2 font-semibold">Employee Name</td>
                        <td className="py-1 px-2 text-emerald-700 font-bold">✓ Auto</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">Date / Punch Date</td>
                        <td className="py-1 px-2 font-semibold">Attendance Date</td>
                        <td className="py-1 px-2 text-emerald-700 font-bold">✓ Auto</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-mono">IN / Check-In</td>
                        <td className="py-1 px-2 font-semibold">Punch IN</td>
                        <td className="py-1 px-2 text-emerald-700 font-bold">✓ Auto</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 04 */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                    04
                  </span>
                  <span className="font-bold text-gray-900 text-xs">Normalize Data (Deterministic Context-Fill)</span>
                </div>
                <p className="text-gray-600 pl-7 leading-relaxed">
                  In many vendor workbooks, the employee ID and name appear only once on the first date row, with subsequent date rows left blank.
                  Our parser carries employee context forward safely within the employee block without bleeding IDs across workers.
                </p>
              </div>

              {/* Step 05 */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                    05
                  </span>
                  <span className="font-bold text-gray-900 text-xs">Calculate Attendance Rules</span>
                </div>
                <p className="text-gray-600 pl-7 leading-relaxed">
                  The engine distinguishes session codes: <span className="font-semibold text-emerald-800">P (Present)</span>, <span className="font-semibold text-indigo-800">OD (On Duty)</span>, <span className="font-semibold text-slate-800">WO (Weekly Off)</span>, and <span className="font-semibold text-amber-800">H (Holiday / NFH)</span>.
                </p>
                <div className="pl-7 pt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-medium">
                  Important: Blank IN/OUT punch cells are not blindly converted into absences.
                  If an employee was marked On-Duty (OD) or Weekly Off (WO), that designation is preserved.
                </div>
              </div>

              {/* Step 06 */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                    06
                  </span>
                  <span className="font-bold text-gray-900 text-xs">Read MR &amp; OT Independently</span>
                </div>
                <p className="text-gray-600 pl-7 leading-relaxed">
                  If the MR Report sheet states 25 present days in cell <code className="bg-gray-100 px-1 py-0.5 rounded font-bold text-indigo-700">MR REPORT!F19</code>, the system preserves that exact value and does not silently rewrite it with IN&amp;OUT numbers.
                </p>
              </div>

              {/* Step 07 */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                    07
                  </span>
                  <span className="font-bold text-gray-900 text-xs">Cross-Sheet 4-Layer Audit</span>
                </div>
                <div className="pl-7 space-y-2 pt-1">
                  <div className="p-2 bg-white border border-gray-200 rounded">
                    <strong>Layer A — File Structure Audit:</strong> Validates workbook syntax, sheets, and headers.
                  </div>
                  <div className="p-2 bg-white border border-gray-200 rounded">
                    <strong>Layer B — Record Integrity Audit:</strong> Verifies 0 records were lost, dropped, or duplicated (Zero-Drop guarantee).
                  </div>
                  <div className="p-2 bg-white border border-gray-200 rounded">
                    <strong>Layer C — Cross-Sheet Calculation Audit:</strong> Compares IN&amp;OUT vs MR REPORT vs OT Matrix with difference tracking.
                  </div>
                  <div className="p-2 bg-white border border-gray-200 rounded">
                    <strong>Layer D — Formula &amp; Provenance Audit:</strong> Records mathematical rules used to calculate Net Days and OT.
                  </div>
                </div>
              </div>

              {/* Step 08 */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                    08
                  </span>
                  <span className="font-bold text-gray-900 text-xs">Root Cause Diagnosis</span>
                </div>
                <p className="text-gray-600 pl-7 leading-relaxed">
                  Every discrepancy is categorized into actionable classifications:
                </p>
                <div className="pl-7 space-y-1.5 pt-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">MATCHED</span>
                    <span>Both sheets reconcile 1:1.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold shrink-0">POLICY DIFFERENCE</span>
                    <span>MR includes On-Duty (OD) in Present Days (e.g. 11 P + 14 OD = 25).</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold shrink-0">SOURCE CONFLICT</span>
                    <span>Excel sheets genuinely contain contradictory values.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* "What the system does NOT do" - Trust & Compliance Box */}
            <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl space-y-2.5 shadow-md">
              <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                What Joy PeopleHR Does NOT Do
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>We do <strong>NOT</strong> overwrite or alter your uploaded Excel file data.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>We do <strong>NOT</strong> silently modify MR Report values to artificially force a match.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>We do <strong>NOT</strong> treat blank punches as unexcused absences without checking session status codes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>We do <strong>NOT</strong> label an audit "VERIFIED" when unresolved calculation mismatches exist.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>We preserve exact Excel cell coordinates (<code className="text-emerald-300">MR REPORT!F19</code>) for every audit finding.</span>
                </li>
              </ul>
            </div>

            {/* Practical Example Reconciliation */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-gray-900">Example: SAKTHI S (20385) Reconciliation</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-white rounded border border-gray-200">
                  <div className="text-gray-500 font-sans font-bold">IN&amp;OUT Sheet:</div>
                  <div>11 biometric (P) days</div>
                  <div>14 On-Duty (OD) days</div>
                  <div className="font-bold text-emerald-700">Qualifying: 25 days</div>
                </div>
                <div className="p-2 bg-white rounded border border-gray-200">
                  <div className="text-gray-500 font-sans font-bold">MR REPORT Sheet:</div>
                  <div>Source cell: F19</div>
                  <div className="font-bold text-emerald-700">Present Days: 25</div>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Result: <strong className="text-amber-800">POLICY DIFFERENCE</strong>.
                The system reports the difference transparently; it does not automatically force one number over the other.
              </p>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              Got it, close guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
