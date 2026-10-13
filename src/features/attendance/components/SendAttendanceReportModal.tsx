// src/features/attendance/components/SendAttendanceReportModal.tsx
// ============================================================================
// Joy PeopleHR Enterprise — Send Attendance & Punching Report Modal
// Allows HR to specify recipients, report scope, inclusions, and dispatch via email
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Mail,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Eye,
  Building2,
  Clock,
  Users,
  Check,
  Download,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { AttendanceReportRow, attendanceReportExportService } from '../../../services/attendance/attendanceReportExportService';
import { attendanceReportEmailService } from '../../../services/attendance/attendanceReportEmailService';
import { ClassifiedPunchEvent } from '../../../services/attendance/attendanceClassificationEngine';
import { formatMinutesToHoursStr } from '../../../lib/attendance/attendanceEngine';

export interface SendAttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredRows: AttendanceReportRow[];
  allRows: AttendanceReportRow[];
  selectedIds?: Set<string>;
  reportDate: string;
  companyName?: string;
  punches?: ClassifiedPunchEvent[];
}

export const SendAttendanceReportModal: React.FC<SendAttendanceReportModalProps> = ({
  isOpen,
  onClose,
  filteredRows,
  allRows,
  selectedIds = new Set(),
  reportDate,
  companyName = 'Joy Corporate Solutions',
  punches = [],
}) => {
  const { showToast } = useToast();

  // Quick recipient options
  const defaultRecipients = ['mari@joypeoplehr.com'];
  const [recipients, setRecipients] = useState<string[]>(defaultRecipients);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [ccEmail, setCcEmail] = useState('thirumalairk28@gmail.com');

  // Scope: 'FILTERED' | 'ALL' | 'SELECTED'
  const hasSelected = selectedIds.size > 0;
  const [scope, setScope] = useState<'FILTERED' | 'ALL' | 'SELECTED'>(hasSelected ? 'SELECTED' : 'FILTERED');

  // Inclusions
  const [includePunches, setIncludePunches] = useState(true);
  const [includeShiftBreakdown, setIncludeShiftBreakdown] = useState(true);
  const [attachExcel, setAttachExcel] = useState(true);
  const [attachCsv, setAttachCsv] = useState(true);

  // Message & Subject
  const [subject, setSubject] = useState(
    `[Joy PeopleHR] Daily Attendance & Punching Audit Report — ${reportDate} (${companyName})`
  );
  const [customNote, setCustomNote] = useState(
    'Please review the daily workforce attendance summary and verified biometric machine punch logs. All shifts and check-in variances have been audited.'
  );

  // Modal State
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'PREVIEW'>('DISPATCH');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState<{ id: string; deliveredAt: string; recipients: string[] } | null>(null);

  // Target data based on chosen scope
  const targetRows = useMemo(() => {
    if (scope === 'SELECTED' && selectedIds.size > 0) {
      return allRows.filter(r => selectedIds.has(r.emp.id));
    }
    if (scope === 'ALL') {
      return allRows;
    }
    return filteredRows;
  }, [scope, selectedIds, filteredRows, allRows]);

  if (!isOpen) return null;

  // Add email helper
  const handleAddEmail = (emailToAdd: string) => {
    const trimmed = emailToAdd.trim();
    if (!trimmed) return;
    // Handle comma-separated list
    const parts = trimmed.split(/[,;\s]+/).filter(Boolean);
    const valid = parts.filter(p => p.includes('@'));
    if (valid.length === 0) {
      showToast('Please enter a valid email address (e.g. hr@company.com)', 'error');
      return;
    }
    setRecipients(prev => Array.from(new Set([...prev, ...valid])));
    setNewEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setRecipients(prev => prev.filter(e => e !== emailToRemove));
  };

  // Quick preset chips
  const quickRecipients = [
    { label: 'Mari Muthu (HR Head)', email: 'mari@joypeoplehr.com' },
    { label: 'Operations HR', email: 'hr@joycorporatesolutions.com' },
    { label: 'Management Desk', email: 'admin@joycorporatesolutions.com' },
    { label: 'Thirumalai (Auditor)', email: 'thirumalairk28@gmail.com' },
  ];

  // Calculate metrics for active scope
  const totalHeadcount = targetRows.length;
  const presentCount = targetRows.filter(
    r => r.record.status === 'Present' || r.record.status === 'Checked Out' || !!r.record.first_check_in
  ).length;
  const lateCount = targetRows.filter(r => (r.record.late_minutes || 0) > 0 || r.record.status === 'Late').length;
  const notCheckedInCount = targetRows.filter(
    r => (r.record.status === 'Not Checked In' || !r.record.status) && !r.record.first_check_in
  ).length;
  const totalNetMinutes = targetRows.reduce((acc, r) => acc + (r.record.net_working_minutes || 0), 0);
  const totalOtMinutes = targetRows.reduce((acc, r) => acc + (r.record.overtime_minutes || 0), 0);

  // Local immediate download actions
  const handleDownloadExcel = async () => {
    try {
      showToast('Generating formatted Excel (.xlsx) workbook...', 'info');
      const res = await attendanceReportExportService.generateExcelWorkbook(targetRows, punches, {
        companyName,
        reportDate,
        includePunches,
      });
      attendanceReportExportService.downloadFile(
        res.buffer,
        res.filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      showToast(`✓ Downloaded ${res.filename}`, 'success');
    } catch (err: any) {
      showToast(`Error downloading Excel: ${err.message}`, 'error');
    }
  };

  const handleDownloadCsv = () => {
    try {
      const csvStr = attendanceReportExportService.generateCsvContent(targetRows);
      const safeComp = companyName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeComp}_Daily_Attendance_${reportDate}.csv`;
      attendanceReportExportService.downloadFile(csvStr, filename, 'text/csv;charset=utf-8;');
      showToast(`✓ Downloaded ${filename}`, 'success');
    } catch (err: any) {
      showToast(`Error downloading CSV: ${err.message}`, 'error');
    }
  };

  // Main Email Send Action
  const handleSendEmail = async () => {
    if (recipients.length === 0) {
      showToast('Please specify at least one recipient email address to send the report.', 'error');
      return;
    }

    setIsSending(true);
    setSentSuccess(null);

    try {
      showToast(`Generating report package and dispatching to ${recipients.join(', ')}...`, 'info');

      const allTargets = [...recipients];
      if (ccEmail && ccEmail.includes('@') && !allTargets.includes(ccEmail.trim())) {
        allTargets.push(ccEmail.trim());
      }

      const res = await attendanceReportEmailService.sendReportToHR({
        to: recipients,
        cc: ccEmail && ccEmail.includes('@') ? ccEmail.trim() : undefined,
        companyName,
        reportDate,
        rows: targetRows,
        punches,
        customMessage: customNote,
        subject,
        attachExcel,
        attachCsv,
      });

      if (res.success) {
        setSentSuccess({
          id: res.id || `msg-${Date.now()}`,
          deliveredAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
          recipients: allTargets,
        });
        showToast(`✓ Attendance and Punch Report dispatched successfully to ${recipients.length} recipients!`, 'success');
      } else {
        throw new Error(res.error || 'Failed to dispatch report email');
      }
    } catch (err: any) {
      showToast(`Email dispatch error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064E3B] to-[#047857] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">Send Attendance &amp; Punch Report to HR</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Dual-Engine Email
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                {companyName} &bull; Date: {reportDate} ({totalHeadcount} Employees)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="border-b border-gray-200 bg-gray-50/70 px-6 pt-3 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('DISPATCH')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'DISPATCH'
                ? 'border-[#064E3B] text-[#064E3B]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Recipient &amp; Delivery Settings
          </button>
          <button
            onClick={() => setActiveTab('PREVIEW')}
            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'PREVIEW'
                ? 'border-[#064E3B] text-[#064E3B]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Report Data Preview ({totalHeadcount})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {sentSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-[#07563D] shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-emerald-950">Report Dispatched Successfully!</h4>
                <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                  The complete attendance ledger and verified punch report have been sent via secure email gateway.
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border border-emerald-200/80 text-left max-w-md mx-auto space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-semibold">Delivered At:</span>
                  <span className="font-bold text-gray-900">{sentSuccess.deliveredAt}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-semibold">Recipients:</span>
                  <span className="font-bold text-gray-900 truncate max-w-[240px]">
                    {sentSuccess.recipients.join(', ')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500 font-semibold">Attachments Included:</span>
                  <span className="font-bold text-emerald-700">Excel (.xlsx) &bull; CSV</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSentSuccess(null)}>
                  Send Another Report
                </Button>
                <Button size="sm" onClick={onClose} className="bg-[#07563D] hover:bg-[#064e37]">
                  Done
                </Button>
              </div>
            </div>
          ) : activeTab === 'DISPATCH' ? (
            <>
              {/* 1. Who to send to */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    Who to Send Report to: <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500">Press Enter or click chip to add</span>
                </div>

                {/* Quick chip presets */}
                <div className="flex flex-wrap gap-1.5">
                  {quickRecipients.map(qr => {
                    const isSelected = recipients.includes(qr.email);
                    return (
                      <button
                        key={qr.email}
                        type="button"
                        onClick={() => {
                          if (isSelected) handleRemoveEmail(qr.email);
                          else handleAddEmail(qr.email);
                        }}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                        {qr.label}
                      </button>
                    );
                  })}
                </div>

                {/* Recipient tags & input */}
                <div className="border border-gray-300 rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 bg-white min-h-[46px] flex flex-wrap items-center gap-1.5">
                  {recipients.map(r => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-md font-semibold"
                    >
                      <span>{r}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-rose-600"
                        onClick={() => handleRemoveEmail(r)}
                      />
                    </span>
                  ))}
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={e => setNewEmailInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddEmail(newEmailInput);
                      }
                    }}
                    onBlur={() => {
                      if (newEmailInput.trim()) handleAddEmail(newEmailInput);
                    }}
                    placeholder={recipients.length === 0 ? 'Type email and press Enter (e.g. hr@company.com)...' : 'Add another email...'}
                    className="outline-hidden text-xs text-gray-800 flex-1 min-w-[180px] py-1 bg-transparent"
                  />
                </div>

                {/* CC input */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-gray-500 w-10">CC:</span>
                  <input
                    type="email"
                    value={ccEmail}
                    onChange={e => setCcEmail(e.target.value)}
                    placeholder="Optional CC email (e.g. auditor@company.com)..."
                    className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-800 flex-1 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 2. Scope of Report */}
              <div className="space-y-2 bg-gray-50/80 border border-gray-200 rounded-xl p-3.5">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  Workforce Scope to Include:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                      scope === 'FILTERED'
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportScope"
                      checked={scope === 'FILTERED'}
                      onChange={() => setScope('FILTERED')}
                      className="accent-[#07563D]"
                    />
                    <div>
                      <div>Filtered Set</div>
                      <div className="text-[10px] text-gray-500 font-normal">{filteredRows.length} employees</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                      scope === 'ALL'
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportScope"
                      checked={scope === 'ALL'}
                      onChange={() => setScope('ALL')}
                      className="accent-[#07563D]"
                    />
                    <div>
                      <div>All Active Staff</div>
                      <div className="text-[10px] text-gray-500 font-normal">{allRows.length} employees</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                      !hasSelected
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400'
                        : scope === 'SELECTED'
                        ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportScope"
                      disabled={!hasSelected}
                      checked={scope === 'SELECTED'}
                      onChange={() => setScope('SELECTED')}
                      className="accent-[#07563D]"
                    />
                    <div>
                      <div>Selected ({selectedIds.size})</div>
                      <div className="text-[10px] text-gray-500 font-normal">Checked in table</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Inclusions & Attachment Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  Report Sections &amp; Attachments:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePunches}
                      onChange={e => setIncludePunches(e.target.checked)}
                      className="accent-[#07563D] rounded-sm"
                    />
                    <span className="font-semibold text-gray-800">Detailed Biometric &amp; Machine Punch Log</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeShiftBreakdown}
                      onChange={e => setIncludeShiftBreakdown(e.target.checked)}
                      className="accent-[#07563D] rounded-sm"
                    />
                    <span className="font-semibold text-gray-800">Shift Timings &amp; Variance Breakdown</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachExcel}
                      onChange={e => setAttachExcel(e.target.checked)}
                      className="accent-[#07563D] rounded-sm"
                    />
                    <span className="font-semibold text-gray-800">Attach Multi-Sheet Excel Workbook (.xlsx)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachCsv}
                      onChange={e => setAttachCsv(e.target.checked)}
                      className="accent-[#07563D] rounded-sm"
                    />
                    <span className="font-semibold text-gray-800">Attach Comma-Separated Values (.csv)</span>
                  </label>
                </div>
              </div>

              {/* 4. Subject & Operations Note */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Email Subject:</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">HR &amp; Operations Note:</label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    placeholder="Enter notes to HR (e.g. All gate biometric punches verified; 2 late arrivals flagged)..."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </>
          ) : (
            /* PREVIEW TAB */
            <div className="space-y-4">
              {/* Executive KPI summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-extrabold uppercase text-emerald-800">Total Workforce</div>
                  <div className="text-xl font-black text-emerald-950 mt-1">{totalHeadcount}</div>
                  <div className="text-[10px] text-emerald-700">Employees</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-extrabold uppercase text-emerald-800">Present / Working</div>
                  <div className="text-xl font-black text-[#07563D] mt-1">{presentCount}</div>
                  <div className="text-[10px] text-emerald-700">Active Checked In</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-extrabold uppercase text-amber-800">Late Arrivals</div>
                  <div className="text-xl font-black text-amber-950 mt-1">{lateCount}</div>
                  <div className="text-[10px] text-amber-700">Past Grace Time</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                  <div className="text-[10px] font-extrabold uppercase text-rose-800">Not Checked In</div>
                  <div className="text-xl font-black text-rose-950 mt-1">{notCheckedInCount}</div>
                  <div className="text-[10px] text-rose-700">Pending / Absent</div>
                </div>
              </div>

              {/* Sample preview table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-700 flex justify-between items-center">
                  <span>Workforce Attendance Ledger Preview ({targetRows.length} Rows)</span>
                  <span className="text-[10px] text-gray-500 font-normal">Excel will contain full multi-sheet dataset</span>
                </div>
                <div className="max-h-[260px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Employee</th>
                        <th className="py-2 px-2">Shift</th>
                        <th className="py-2 px-2 text-center">In</th>
                        <th className="py-2 px-2 text-center">Out</th>
                        <th className="py-2 px-2 text-center">Net</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {targetRows.map((r, i) => {
                        const emp = r.emp;
                        const rec = r.record;
                        const shift = r.shift;
                        const name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name;
                        const code = emp.employee_code || rec.employee_code || '—';
                        const shiftCode = shift?.shift_code || r.roster?.shift_code || 'GEN-09';
                        const checkIn = rec.first_check_in || '—';
                        const checkOut = rec.last_check_out || '—';
                        const netStr = rec.net_working_minutes > 0 ? formatMinutesToHoursStr(rec.net_working_minutes) : (rec.first_check_in && !rec.last_check_out ? 'In Progress' : '—');
                        const statusStr = rec.status || 'Not Checked In';

                        return (
                          <tr key={emp.id || i} className="hover:bg-gray-50">
                            <td className="py-2 px-3">
                              <div className="font-bold text-gray-900">{name}</div>
                              <div className="text-[10px] text-gray-500">{code} &bull; {emp.department_name || emp.department || 'General'}</div>
                            </td>
                            <td className="py-2 px-2">
                              <span className="font-semibold text-gray-800">{shiftCode}</span>
                              <div className="text-[10px] text-gray-500">{shift?.start_time || '09:30'} - {shift?.end_time || '18:30'}</div>
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-emerald-800">{checkIn}</td>
                            <td className="py-2 px-2 text-center font-bold text-gray-800">{checkOut}</td>
                            <td className="py-2 px-2 text-center font-semibold text-sky-700">{netStr}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                statusStr === 'Present' || (statusStr as string) === 'Working'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : statusStr === 'Late'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {statusStr}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!sentSuccess && (
          <div className="border-t border-gray-200 bg-gray-50/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={handleDownloadExcel}
                leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />}
                className="text-xs font-bold"
              >
                Download Excel (.xlsx)
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={handleDownloadCsv}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                Download CSV
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSending}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendEmail}
                disabled={isSending || recipients.length === 0}
                leftIcon={isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
              >
                {isSending ? 'Dispatching Report...' : `Send Report (${recipients.length} Recipient${recipients.length === 1 ? '' : 's'})`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
