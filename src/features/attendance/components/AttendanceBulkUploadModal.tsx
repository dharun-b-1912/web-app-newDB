import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Check,
  Building,
  User,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';
import { hrEventBus } from '../../../services/hrEventBus';
import { attendanceApi } from '../../../services/attendanceApi';

interface AttendanceBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  currentYear?: number;
  currentMonthIndex?: number;
  dailyRecords?: any[];
  onSuccess?: () => void;
}

interface ParsedAttendanceRow {
  rowNum: number;
  rawEmpId: string;
  matchedEmployee?: any;
  dateStr: string;
  rawStatus: string;
  normalizedStatus: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_DUTY' | 'WORK_FROM_HOME' | 'ON_LEAVE' | 'WEEKLY_OFF';
  payableStatus: number;
  inTime: string;
  outTime: string;
  reason: string;
  workMinutes: number;
  isValid: boolean;
  validationError?: string;
}

export const AttendanceBulkUploadModal: React.FC<AttendanceBulkUploadModalProps> = ({
  isOpen,
  onClose,
  employees,
  currentYear = new Date().getFullYear(),
  currentMonthIndex = new Date().getMonth(),
  dailyRecords = [],
  onSuccess,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentMonthIndex);

  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedAttendanceRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');
  const [detectedFormat, setDetectedFormat] = useState<'MATRIX' | 'LIST' | null>(null);

  if (!isOpen) return null;

  const monthName = new Date(selectedYear, selectedMonthIndex, 1).toLocaleString('en-US', { month: 'long' });
  const monthKey = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();

  // Helper to convert column index to Excel column letter (0 -> 'A', 27 -> 'AB')
  const getColLetter = (colIdx: number): string => {
    let temp = '';
    let letter = '';
    let curr = colIdx;
    while (curr >= 0) {
      temp = String.fromCharCode((curr % 26) + 65);
      letter = temp + letter;
      curr = Math.floor(curr / 26) - 1;
    }
    return letter;
  };

  // 1. Download Master Monthly Matrix Attendance Template (Week-by-Week + Full Workforce from SQL, No Fake Pre-filled Data)
  const handleDownloadTemplate = async () => {
    try {
      // Direct SQL fetch from Supabase to get authoritative recorded attendance for this month
      let activeDailyRecords = dailyRecords;
      if (isSupabaseEnabled && supabase) {
        const { data: dbRecords, error: dbErr } = await supabase
          .from('attendance_daily')
          .select('*')
          .gte('attendance_date', `${monthKey}-01`)
          .lte('attendance_date', `${monthKey}-${String(daysInMonth).padStart(2, '0')}`);

        if (!dbErr && dbRecords && dbRecords.length > 0) {
          activeDailyRecords = dbRecords;
        }
      }

      // Row 1: Company & Month Top Title
      const headerRow1: any[] = [`JOY CORPORATE SOLUTIONS PVT LTD - MONTHLY ATTENDANCE REGISTER - ${monthName.toUpperCase()} ${currentYear}`];
      // Row 2: Subtitle Metadata
      const headerRow2: any[] = [`Workforce: ${employees.length} Active Employees | Month: ${monthName} ${currentYear} (${daysInMonth} Days) | Authoritative Monthly Timesheet & Payroll Ledger (Pure SQL Sync)`];

      // Row 3: Week Groups Header (Row Index 2 in 0-based)
      const headerRow3: any[] = ['Emp ID', 'Employee Name', 'Department', 'Designation'];
      // Row 4: Detailed Day Columns with Weekday and ISO Date (Row Index 3 in 0-based)
      const headerRow4: any[] = ['Emp ID', 'Employee Name', 'Department', 'Designation'];

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(currentYear, currentMonthIndex, day);
        const dayStr = String(day).padStart(2, '0');
        const weekdayShort = d.toLocaleDateString('en-US', { weekday: 'short' });
        const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
        const fullDateStr = `${monthKey}-${dayStr}`;

        // Determine Week grouping
        let weekGroup = 'WEEK 1 (Day 01–07)';
        if (day >= 8 && day <= 14) weekGroup = 'WEEK 2 (Day 08–14)';
        else if (day >= 15 && day <= 21) weekGroup = 'WEEK 3 (Day 15–21)';
        else if (day >= 22 && day <= 28) weekGroup = 'WEEK 4 (Day 22–28)';
        else if (day >= 29) weekGroup = `WEEK 5 (Day 29–${daysInMonth})`;

        headerRow3.push(weekGroup);
        headerRow4.push(`${dayStr} ${monthShort} (${weekdayShort}) [${fullDateStr}]`);
      }

      // Summary Header Columns
      headerRow3.push(
        'MONTHLY SUMMARY & STATUTORY ANALYSIS',
        '', '', '', '', '', '', '', '', ''
      );
      headerRow4.push(
        'Total Days',
        'Total Working Days',
        'Present Days (P)',
        'Absent Days (A)',
        'Half Days (HD)',
        'On Duty (OD)',
        'WFH (Remote)',
        'Paid Leave (PL)',
        'Weekly Off (WO)',
        'Final Paid Days'
      );

      const wsData: any[][] = [headerRow1, headerRow2, headerRow3, headerRow4];

      // Build each employee row from real database records (strictly NO fake mock pre-filled data)
      employees.forEach(emp => {
        const empCode = emp.employee_code || `WF-${emp.id}`;
        const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name || 'Employee';
        const dept = emp.department_name || emp.department || 'Operations';
        const designation = emp.designation_title || emp.designation || 'Staff';

        const row: any[] = [empCode, empName, dept, designation];

        let pCount = 0;
        let aCount = 0;
        let hdCount = 0;
        let odCount = 0;
        let wfhCount = 0;
        let plCount = 0;
        let woCount = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const dayStr = String(day).padStart(2, '0');
          const dateStr = `${monthKey}-${dayStr}`;

          // Check if there is an authoritative record in SQL database for this employee on this date
          const rec = activeDailyRecords.find(r =>
            (r.employee_id === emp.id || (r.employee_code && r.employee_code.toLowerCase() === empCode.toLowerCase())) &&
            (r.date === dateStr || r.attendance_date === dateStr)
          );

          let st = '';
          if (rec) {
            const statusUpper = String(rec.status || '').toUpperCase();
            if (statusUpper.includes('LEAVE') || statusUpper === 'L' || statusUpper === 'ON_LEAVE') st = 'PL';
            else if (statusUpper.includes('HALF') || statusUpper === 'HD' || statusUpper === 'HALF_DAY') st = 'HD';
            else if (statusUpper.includes('WFH') || statusUpper === 'WORK_FROM_HOME') st = 'WFH';
            else if (statusUpper.includes('DUTY') || statusUpper === 'OD' || statusUpper === 'ON_DUTY') st = 'OD';
            else if (statusUpper === 'ABSENT' || statusUpper === 'A') st = 'A';
            else if (statusUpper === 'WEEKLY_OFF' || statusUpper === 'WO') st = 'WO';
            else if (statusUpper === 'PRESENT' || statusUpper === 'P') st = 'P';
            else st = 'P';
          } else {
            // Strictly NO artificial pre-filling! Unrecorded days remain completely blank for clean data entry.
            st = '';
          }

          // Accumulate counts for actual records
          if (st === 'P') pCount++;
          else if (st === 'A') aCount++;
          else if (st === 'HD') hdCount++;
          else if (st === 'OD') odCount++;
          else if (st === 'WFH') wfhCount++;
          else if (st === 'PL') plCount++;
          else if (st === 'WO') woCount++;

          row.push(st);
        }

        const excelRowNum = wsData.length + 1; // 1-based row index in Excel
        const firstDayCol = getColLetter(4);
        const lastDayCol = getColLetter(3 + daysInMonth);

        const colTotalDays = getColLetter(4 + daysInMonth);
        const colWorkingDays = getColLetter(4 + daysInMonth + 1);
        const colP = getColLetter(4 + daysInMonth + 2);
        const colA = getColLetter(4 + daysInMonth + 3);
        const colHD = getColLetter(4 + daysInMonth + 4);
        const colOD = getColLetter(4 + daysInMonth + 5);
        const colWFH = getColLetter(4 + daysInMonth + 6);
        const colPL = getColLetter(4 + daysInMonth + 7);
        const colWO = getColLetter(4 + daysInMonth + 8);
        const colPaidDays = getColLetter(4 + daysInMonth + 9);

        const workingDays = Math.max(0, daysInMonth - woCount);
        const totalPaidDays = pCount + odCount + wfhCount + (hdCount * 0.5) + plCount + woCount;

        // Dynamic formula cells with pre-evaluated values
        row.push(
          { t: 'n', v: daysInMonth },
          { t: 'n', v: workingDays, f: `${colTotalDays}${excelRowNum}-${colWO}${excelRowNum}` },
          { t: 'n', v: pCount, f: `COUNTIF(${firstDayCol}${excelRowNum}:${lastDayCol}${excelRowNum},"P")` },
          { t: 'n', v: aCount, f: `COUNTIF(${firstDayCol}${excelRowNum}:${lastDayCol}${excelRowNum},"A")` },
          { t: 'n', v: hdCount, f: `COUNTIF(${firstDayCol}${excelRowNum}:${lastDayCol}${excelRowNum},"HD")` },
          { t: 'n', v: odCount, f: `COUNTIF(${firstDayCol}${excelRowNum}:${lastDayCol}${excelRowNum},"OD")` },
          { t: 'n', v: wfhCount, f: `COUNTIF(${firstDayCol}${excelRowNum}:${lastDayCol}${excelRowNum},"WFH")` },
          { t: 'n', v: plCount, f: `COUNTIF(${firstDayCol}${excelRowNum}:${lastDayCol}${excelRowNum},"PL")` },
          { t: 'n', v: woCount, f: `COUNTIF(${firstDayCol}${excelRowNum}:${lastDayCol}${excelRowNum},"WO")` },
          { t: 'n', v: totalPaidDays, f: `${colP}${excelRowNum}+${colOD}${excelRowNum}+${colWFH}${excelRowNum}+(${colHD}${excelRowNum}*0.5)+${colPL}${excelRowNum}+${colWO}${excelRowNum}` }
        );

        wsData.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Define column widths for readability
      const colWidths: { wch: number }[] = [
        { wch: 14 }, // Emp ID
        { wch: 24 }, // Employee Name
        { wch: 20 }, // Department
        { wch: 24 }, // Designation
      ];
      // Day columns (1..N)
      for (let day = 1; day <= daysInMonth; day++) {
        colWidths.push({ wch: 16 });
      }
      // Summary columns
      for (let s = 0; s < 10; s++) {
        colWidths.push({ wch: 18 });
      }
      ws['!cols'] = colWidths;

      // Header Merges for Professional Visuals
      const totalCols = headerRow4.length;
      ws['!merges'] = [
        // Top Title: Row 0
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        // Subtitle: Row 1
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        // Emp ID, Name, Dept, Designation: Rows 2 and 3
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
        { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
        // Week 1 (Days 1..7 -> cols 4..10)
        { s: { r: 2, c: 4 }, e: { r: 2, c: Math.min(10, 3 + daysInMonth) } },
        // Week 2 (Days 8..14 -> cols 11..17)
        ...(daysInMonth >= 8 ? [{ s: { r: 2, c: 11 }, e: { r: 2, c: Math.min(17, 3 + daysInMonth) } }] : []),
        // Week 3 (Days 15..21 -> cols 18..24)
        ...(daysInMonth >= 15 ? [{ s: { r: 2, c: 18 }, e: { r: 2, c: Math.min(24, 3 + daysInMonth) } }] : []),
        // Week 4 (Days 22..28 -> cols 25..31)
        ...(daysInMonth >= 22 ? [{ s: { r: 2, c: 25 }, e: { r: 2, c: Math.min(31, 3 + daysInMonth) } }] : []),
        // Week 5 (Days 29..N -> cols 32..(3 + daysInMonth))
        ...(daysInMonth >= 29 ? [{ s: { r: 2, c: 32 }, e: { r: 2, c: 3 + daysInMonth } }] : []),
        // Monthly Summary & Statutory Analysis (10 summary columns)
        { s: { r: 2, c: 4 + daysInMonth }, e: { r: 2, c: 4 + daysInMonth + 9 } },
      ];

      // Instructions Sheet
      const instructions = [
        { 'Guide': 'JOY PeopleHR - Complete Monthly Attendance Master Register Specification' },
        { 'Guide': '========================================================================================' },
        { 'Guide': `Active Month: ${monthName} ${currentYear} (${daysInMonth} Total Calendar Days)` },
        { 'Guide': `Workforce: ${employees.length} active employees (loaded directly from SQL Database).` },
        { 'Guide': '' },
        { 'Guide': 'PURE DATABASE SPECIFICATION (ZERO MOCK OR ARTIFICIAL PRE-FILLED DATA):' },
        { 'Guide': '  • Past days show only authoritative records from Supabase SQL.' },
        { 'Guide': '  • Unrecorded days are intentionally left blank so you can enter exact attendance without having to delete fake values.' },
        { 'Guide': '' },
        { 'Guide': 'ALLOWED ATTENDANCE STATUS CODES FOR ANY DAY CELL:' },
        { 'Guide': '  • P    = Present & Full Working Day (1.0 Paid Day credited for salary)' },
        { 'Guide': '  • A    = Absent / Loss of Pay (0.0 Paid Day, deducted in payroll calculation)' },
        { 'Guide': '  • HD   = Half Day (0.5 Paid Day credited)' },
        { 'Guide': '  • OD   = On Duty / Client Site Visit (1.0 Paid Day credited)' },
        { 'Guide': '  • WFH  = Work From Home / Remote (1.0 Paid Day credited)' },
        { 'Guide': '  • PL   = Approved Paid Leave (1.0 Paid Day credited)' },
        { 'Guide': '  • WO   = Weekly Off / Scheduled Rest Day (1.0 Paid Day credited for salary)' },
        { 'Guide': '' },
        { 'Guide': 'HOW TO USE THIS SHEET:' },
        { 'Guide': '  1. Enter attendance status (P, A, HD, OD, WFH, PL, WO) into any day column.' },
        { 'Guide': '  2. The summary columns (Working Days, Present Days, Paid Days) auto-calculate live via Excel formulas.' },
        { 'Guide': '  3. Save the file and upload it back into JOY PeopleHR.' },
        { 'Guide': '  4. The system will auto-detect the monthly matrix and sync directly to Supabase SQL attendance_daily.' },
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructions);
      wsInstructions['!cols'] = [{ wch: 100 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${selectedYear}`);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions & Legend');

      const targetFileName = `JOY_Monthly_Attendance_${monthName}_${selectedYear}_Template.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });

      // Cross-platform bulletproof download for macOS Safari, Chrome, Windows, Linux
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = targetFileName;
        link.setAttribute('download', targetFileName);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 200);
      }

      showToast(`Downloaded ${monthName} ${selectedYear} attendance timesheet with ${employees.length} employees (unrecorded days left clean for entry)!`);
    } catch (err: any) {
      console.error('Download template error:', err);
      showToast('Failed to generate template.', 'error');
    }
  };

  // Helper: Normalize Status (Returns null for empty cells so they are never fabricated as 'P')
  const normalizeStatus = (raw: string): { status: ParsedAttendanceRow['normalizedStatus']; payable: number } | null => {
    const s = (raw || '').toUpperCase().trim();
    if (!s || s === '-' || s === '—' || s === 'NA' || s === 'N/A' || s === 'NULL' || s === 'UNDEFINED' || s === '0' || s === 'REST') {
      if (s === '0') return { status: 'ABSENT', payable: 0.0 };
      if (s === 'REST') return { status: 'WEEKLY_OFF', payable: 1.0 };
      return null;
    }
    if (s === 'A' || s === 'ABSENT' || s === 'LOP' || s === 'AB' || s === 'NO' || s === 'N') {
      return { status: 'ABSENT', payable: 0.0 };
    }
    if (s === 'HD' || s === 'HALF DAY' || s === 'HALF_DAY' || s === '0.5' || s === 'HF' || s === 'H') {
      return { status: 'HALF_DAY', payable: 0.5 };
    }
    if (s === 'OD' || s === 'ON DUTY' || s === 'DUTY') {
      return { status: 'ON_DUTY', payable: 1.0 };
    }
    if (s === 'WFH' || s === 'REMOTE' || s === 'WORK FROM HOME') {
      return { status: 'WORK_FROM_HOME', payable: 1.0 };
    }
    if (s === 'PL' || s === 'LEAVE' || s === 'L' || s === 'PAID LEAVE' || s === 'CL' || s === 'SL' || s === 'EL') {
      return { status: 'ON_LEAVE', payable: 1.0 };
    }
    if (s === 'WO' || s === 'OFF' || s === 'WEEKLY OFF' || s === 'WEEK OFF' || s === 'HOLIDAY' || s === 'HL' || s === 'PH') {
      return { status: 'WEEKLY_OFF', payable: 1.0 };
    }
    if (s === 'P' || s === 'PRESENT' || s === '1' || s === 'PR' || s === 'FD' || s === 'FULL DAY' || s === 'YES' || s === 'Y' || s === 'P/P') {
      return { status: 'PRESENT', payable: 1.0 };
    }
    return null;
  };

  // 2. Parse Uploaded Excel File (Universal Monthly Matrix & Flat Row List Parser)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Read as 2D array
        const rawAoA: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawAoA || rawAoA.length === 0) {
          showToast('Uploaded spreadsheet appears to be empty.', 'error');
          setIsProcessing(false);
          return;
        }

        // Auto-detect target month and year from File Name, Sheet Name, and Header Rows
        const monthNames = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ];
        const combinedContextText = (
          file.name + ' ' + firstSheetName + ' ' +
          rawAoA.slice(0, 5).map(r => (Array.isArray(r) ? r.join(' ') : '')).join(' ')
        ).toLowerCase();

        let effectiveMonthIndex = selectedMonthIndex;
        let effectiveYear = selectedYear;

        monthNames.forEach((m, idx) => {
          if (combinedContextText.includes(m)) {
            effectiveMonthIndex = idx;
          }
        });
        const detectedYrMatch = combinedContextText.match(/\b(202[4-9])\b/);
        if (detectedYrMatch) {
          effectiveYear = parseInt(detectedYrMatch[1], 10);
        }

        if (effectiveMonthIndex !== selectedMonthIndex || effectiveYear !== selectedYear) {
          setSelectedMonthIndex(effectiveMonthIndex);
          setSelectedYear(effectiveYear);
        }

        const effectiveMonthKey = `${effectiveYear}-${String(effectiveMonthIndex + 1).padStart(2, '0')}`;
        const effectiveDaysInMonth = new Date(effectiveYear, effectiveMonthIndex + 1, 0).getDate();

        // Pre-build comprehensive employee lookup maps
        const codeMap = new Map<string, any>();
        const idMap = new Map<string, any>();
        const nameMap = new Map<string, any>();

        employees.forEach(emp => {
          if (emp.id) idMap.set(emp.id.toLowerCase().trim(), emp);
          if (emp.employee_code) {
            const rawCode = emp.employee_code.toLowerCase().trim();
            codeMap.set(rawCode, emp);
            codeMap.set(rawCode.replace(/[^a-z0-9]/g, ''), emp);
            const digits = rawCode.replace(/\D/g, '');
            if (digits) {
              codeMap.set(digits, emp);
              codeMap.set(String(parseInt(digits, 10)), emp);
            }
          }
          const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim().toLowerCase();
          if (fullName) {
            nameMap.set(fullName, emp);
            nameMap.set(fullName.replace(/[^a-z0-9]/g, ''), emp);
          }
          if (emp.display_name) {
            const dn = emp.display_name.trim().toLowerCase();
            nameMap.set(dn, emp);
            nameMap.set(dn.replace(/[^a-z0-9]/g, ''), emp);
          }
        });

        // Scan rows 0 to 12 to find the Matrix Day Header Row
        let matrixHeaderRowIdx = -1;
        let bestDayCols: { colIndex: number; dateStr: string }[] = [];

        for (let i = 0; i < Math.min(12, rawAoA.length); i++) {
          const row = rawAoA[i];
          if (!row || !Array.isArray(row)) continue;

          const dayCols: { colIndex: number; dateStr: string }[] = [];

          row.forEach((cell, colIdx) => {
            const str = String(cell || '').trim();
            if (!str) return;

            // Pattern 1: ISO date [YYYY-MM-DD] or YYYY-MM-DD
            const isoMatch = str.match(/(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) {
              dayCols.push({ colIndex: colIdx, dateStr: isoMatch[1] });
              return;
            }

            // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
            const dmyMatch = str.match(/^0?(\d{1,2})[\/\-]0?(\d{1,2})[\/\-](\d{4})/);
            if (dmyMatch) {
              const d = dmyMatch[1].padStart(2, '0');
              const m = dmyMatch[2].padStart(2, '0');
              const y = dmyMatch[3];
              dayCols.push({ colIndex: colIdx, dateStr: `${y}-${m}-${d}` });
              return;
            }

            // Pattern 3: "01 Oct (Thu)" or "1 Oct" or "01-Oct"
            const monthShortNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const dayMonthMatch = str.match(/^0?(\d{1,2})\s*[\-\s]?([A-Za-z]{3})/i);
            if (dayMonthMatch) {
              const dayInt = parseInt(dayMonthMatch[1], 10);
              const mStr = dayMonthMatch[2].toLowerCase();
              const mIdx = monthShortNames.indexOf(mStr);
              if (dayInt >= 1 && dayInt <= 31 && mIdx !== -1) {
                dayCols.push({
                  colIndex: colIdx,
                  dateStr: `${effectiveYear}-${String(mIdx + 1).padStart(2, '0')}-${String(dayInt).padStart(2, '0')}`,
                });
                return;
              }
            }

            // Pattern 4: Plain day number "1", "01", "2" ... "31" or "1 (Mon)" or "Day 01"
            const plainDayMatch = str.match(/^(?:day\s*)?0?(\d{1,2})(?:\s*\(.*\))?$/i);
            if (plainDayMatch) {
              const dayInt = parseInt(plainDayMatch[1], 10);
              if (dayInt >= 1 && dayInt <= effectiveDaysInMonth) {
                dayCols.push({
                  colIndex: colIdx,
                  dateStr: `${effectiveMonthKey}-${String(dayInt).padStart(2, '0')}`,
                });
              }
            }
          });

          if (dayCols.length >= 3 && dayCols.length > bestDayCols.length) {
            bestDayCols = dayCols;
            matrixHeaderRowIdx = i;
          }
        }

        const rows: ParsedAttendanceRow[] = [];

        if (matrixHeaderRowIdx !== -1 && bestDayCols.length >= 3) {
          // ==========================================
          // FORMAT A: MONTHLY MATRIX SHEET DETECTED
          // ==========================================
          setDetectedFormat('MATRIX');
          const dayColIndices = new Set(bestDayCols.map(d => d.colIndex));

          let processedRowNum = 1;
          for (let rIdx = matrixHeaderRowIdx + 1; rIdx < rawAoA.length; rIdx++) {
            const rowData = rawAoA[rIdx];
            if (!rowData || !Array.isArray(rowData)) continue;

            // Search all non-day columns for employee identification
            let matched: any = null;
            let rawEmp = '';

            for (let cIdx = 0; cIdx < rowData.length; cIdx++) {
              if (dayColIndices.has(cIdx)) continue;
              const cellText = String(rowData[cIdx] || '').trim();
              if (!cellText) continue;

              const clean = cellText.toLowerCase();
              const alnum = clean.replace(/[^a-z0-9]/g, '');

              const candidate =
                codeMap.get(clean) ||
                codeMap.get(alnum) ||
                idMap.get(clean) ||
                nameMap.get(clean) ||
                nameMap.get(alnum);

              if (candidate) {
                matched = candidate;
                rawEmp = cellText;
                break;
              }
            }

            // Fallback: check rowData[0] or rowData[1]
            if (!matched) {
              rawEmp = String(rowData[0] || rowData[1] || '').trim();
              if (!rawEmp || rawEmp.toLowerCase().includes('total') || rawEmp.toLowerCase().includes('summary') || rawEmp.toLowerCase().includes('instructions')) {
                continue;
              }
              const clean = rawEmp.toLowerCase();
              const alnum = clean.replace(/[^a-z0-9]/g, '');
              matched =
                codeMap.get(clean) ||
                codeMap.get(alnum) ||
                idMap.get(clean) ||
                nameMap.get(clean) ||
                nameMap.get(alnum);
            }

            // Skip empty rows with no punches
            const hasAnyCell = bestDayCols.some(dc => Boolean(String(rowData[dc.colIndex] || '').trim()));
            if (!hasAnyCell) continue;

            // Process each day column
            bestDayCols.forEach(dayCol => {
              const cellVal = String(rowData[dayCol.colIndex] || '').trim();
              if (!cellVal) return; // Skip empty cells (no punch to create)

              const norm = normalizeStatus(cellVal);
              if (!norm) return;
              const { status: normStatus, payable } = norm;

              let isValid = true;
              let validationError: string | undefined;

              if (!matched) {
                isValid = false;
                validationError = `Employee '${rawEmp}' not found in active workforce.`;
              }

              const workMins = normStatus === 'ABSENT' || normStatus === 'WEEKLY_OFF' ? 0 : 540;

              rows.push({
                rowNum: processedRowNum++,
                rawEmpId: matched?.employee_code || rawEmp || 'Staff',
                matchedEmployee: matched,
                dateStr: dayCol.dateStr,
                rawStatus: cellVal,
                normalizedStatus: normStatus,
                payableStatus: payable,
                inTime: normStatus !== 'ABSENT' ? '09:30' : '',
                outTime: normStatus !== 'ABSENT' ? '18:30' : '',
                reason: 'Monthly Matrix Attendance Import',
                workMinutes: workMins,
                isValid,
                validationError,
              });
            });
          }
        } else {
          // ==========================================
          // FORMAT B: FLAT ROW-BY-ROW LIST
          // ==========================================
          setDetectedFormat('LIST');

          // Find the row containing Flat List headers (Date, Status, Employee)
          let flatHeaderIdx = 0;
          for (let i = 0; i < Math.min(10, rawAoA.length); i++) {
            const r = rawAoA[i];
            if (Array.isArray(r)) {
              const joined = r.join(' ').toLowerCase();
              if ((joined.includes('date') || joined.includes('day')) && (joined.includes('status') || joined.includes('attendance') || joined.includes('punch'))) {
                flatHeaderIdx = i;
                break;
              }
            }
          }

          const headerRow = rawAoA[flatHeaderIdx] || [];
          const findColIdx = (candidates: string[]) =>
            headerRow.findIndex((col: any) =>
              candidates.some(c => String(col).toLowerCase().replace(/[^a-z0-9]/g, '').includes(c.toLowerCase().replace(/[^a-z0-9]/g, '')))
            );

          const empCol = Math.max(0, findColIdx(['employeeid', 'empid', 'employeecode', 'empcode', 'staffid', 'code', 'employee']));
          const dateCol = Math.max(0, findColIdx(['date', 'attendancedate', 'day', 'workdate']));
          const statusCol = Math.max(0, findColIdx(['status', 'attendancestatus', 'presentabsent', 'mark']));
          const inCol = findColIdx(['intime', 'checkin', 'in', 'punchin', 'start']);
          const outCol = findColIdx(['outtime', 'checkout', 'out', 'punchout', 'end']);
          const reasonCol = findColIdx(['reason', 'remarks', 'remark', 'note', 'comment']);

          for (let idx = flatHeaderIdx + 1; idx < rawAoA.length; idx++) {
            const row = rawAoA[idx];
            if (!row || !Array.isArray(row)) continue;

            const rawEmp = String(row[empCol] || '').trim();
            if (!rawEmp || rawEmp.toLowerCase().includes('total')) continue;

            const rawSt = String(row[statusCol] || '').trim();
            if (!rawSt) continue;

            const norm = normalizeStatus(rawSt);
            if (!norm) continue;
            const { status: normStatus, payable } = norm;

            const cleanedCode = rawEmp.toLowerCase();
            const alphanumericCode = cleanedCode.replace(/[^a-z0-9]/g, '');
            const matched =
              codeMap.get(cleanedCode) ||
              codeMap.get(alphanumericCode) ||
              idMap.get(cleanedCode) ||
              nameMap.get(cleanedCode);

            const rawDate = row[dateCol];
            let normalizedDateStr = String(rawDate || '').trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateStr)) {
              // ISO
            } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(normalizedDateStr)) {
              const parts = normalizedDateStr.split(/[-/]/);
              normalizedDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else {
              normalizedDateStr = `${effectiveMonthKey}-01`;
            }

            const rawIn = inCol !== -1 ? String(row[inCol] || '09:30').trim() : '09:30';
            const rawOut = outCol !== -1 ? String(row[outCol] || '18:30').trim() : '18:30';
            const reasonStr = reasonCol !== -1 ? String(row[reasonCol] || 'Excel Bulk Upload Attendance').trim() : 'Excel Bulk Upload Attendance';

            const workMins = normStatus === 'ABSENT' || normStatus === 'WEEKLY_OFF' ? 0 : 540;

            let isValid = true;
            let validationError: string | undefined;

            if (!matched) {
              isValid = false;
              validationError = `Employee ID '${rawEmp}' not found in active workforce.`;
            }

            rows.push({
              rowNum: idx + 1,
              rawEmpId: rawEmp,
              matchedEmployee: matched,
              dateStr: normalizedDateStr,
              rawStatus: rawSt,
              normalizedStatus: normStatus,
              payableStatus: payable,
              inTime: rawIn || '09:30',
              outTime: rawOut || '18:30',
              reason: reasonStr,
              workMinutes: workMins,
              isValid,
              validationError,
            });
          }
        }

        setParsedRows(rows);
        showToast(`Parsed ${rows.length} total attendance records. Mode: ${matrixHeaderRowIdx !== -1 ? 'Monthly Matrix' : 'Flat List'}.`);
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        showToast(err.message || 'Failed to read Excel file.', 'error');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Metrics
  const totalRows = parsedRows.length;
  const validRows = parsedRows.filter(r => r.isValid);
  const errorRows = parsedRows.filter(r => !r.isValid);
  const matchedEmpCount = new Set(validRows.map(r => r.matchedEmployee?.id)).size;

  const presentCount = validRows.filter(r => r.normalizedStatus === 'PRESENT' || r.normalizedStatus === 'ON_DUTY' || r.normalizedStatus === 'WORK_FROM_HOME').length;
  const absentCount = validRows.filter(r => r.normalizedStatus === 'ABSENT').length;
  const halfDayCount = validRows.filter(r => r.normalizedStatus === 'HALF_DAY').length;
  const weeklyOffCount = validRows.filter(r => r.normalizedStatus === 'WEEKLY_OFF').length;

  const filteredDisplayRows = parsedRows.filter(r => {
    if (filterMode === 'VALID') return r.isValid;
    if (filterMode === 'ERRORS') return !r.isValid;
    return true;
  });

  // 3. Apply & Synchronize to Database & Payroll
  const handleApplySync = async () => {
    if (validRows.length === 0) {
      showToast('No valid attendance records to apply.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const orgId = employees[0]?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';

      // Prepare daily records strictly matching database columns
      const dailyPayloads = validRows.map(r => {
        const emp = r.matchedEmployee;
        const checkInIso = r.normalizedStatus !== 'ABSENT' && r.inTime
          ? new Date(`${r.dateStr}T${r.inTime}:00+05:30`).toISOString()
          : null;
        const checkOutIso = r.normalizedStatus !== 'ABSENT' && r.outTime
          ? new Date(`${r.dateStr}T${r.outTime}:00+05:30`).toISOString()
          : null;

        const dbStatus = r.normalizedStatus === 'ON_DUTY' ? 'PRESENT' : r.normalizedStatus;

        return {
          organization_id: orgId,
          employee_id: emp.id,
          attendance_date: r.dateStr,
          status: dbStatus,
          payable_status: r.payableStatus,
          first_check_in: checkInIso,
          last_check_out: checkOutIso,
          total_work_minutes: r.workMinutes,
          break_minutes: r.normalizedStatus === 'PRESENT' ? 60 : 0,
          late_entry_minutes: 0,
          early_exit_minutes: 0,
          overtime_minutes: 0,
          is_regularized: true,
          unauthorized_checkout_reason: r.reason ? `Bulk Import: ${r.reason}` : 'Monthly Matrix Bulk Import',
          updated_at: new Date().toISOString(),
        };
      });

      // Prepare audit regularizations
      const regPayloads = validRows.map(r => ({
        organization_id: orgId,
        employee_id: r.matchedEmployee.id,
        attendance_date: r.dateStr,
        requested_check_in: r.inTime ? `${r.dateStr}T${r.inTime}:00+05:30` : null,
        requested_check_out: r.outTime ? `${r.dateStr}T${r.outTime}:00+05:30` : null,
        reason: r.reason ? `Excel Bulk Import (${r.normalizedStatus}): ${r.reason}` : `Excel Bulk Import (${r.normalizedStatus})`,
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));

      if (isSupabaseEnabled && supabase) {
        // Chunk upserts in batches of 50 to avoid request payload limits
        const chunkSize = 50;
        for (let i = 0; i < dailyPayloads.length; i += chunkSize) {
          const chunk = dailyPayloads.slice(i, i + chunkSize);
          const { error: upsertErr } = await supabase
            .from('attendance_daily')
            .upsert(chunk, { onConflict: 'employee_id,attendance_date' });

          if (upsertErr) {
            console.warn('[BulkUploadModal] Chunk upsert notice, trying sequential inserts:', upsertErr);
            for (const item of chunk) {
              await supabase
                .from('attendance_daily')
                .upsert(item, { onConflict: 'employee_id,attendance_date' });
            }
          }
        }

        // Insert audit records
        try {
          for (let i = 0; i < regPayloads.length; i += chunkSize) {
            const chunk = regPayloads.slice(i, i + chunkSize);
            await supabase.from('attendance_regularizations').insert(chunk);
          }
        } catch (regErr) {
          console.warn('[BulkUploadModal] Regularizations audit notice:', regErr);
        }
      }

      // Invalidate attendanceApi cache
      attendanceApi.invalidateCache();

      // Dispatch global events
      hrEventBus.emit('attendance.updated', { count: validRows.length, monthKey, periodName: `${monthName} ${selectedYear}` });
      hrEventBus.emit('regularization.updated', { count: validRows.length, monthKey });
      hrEventBus.emit('payroll.period.updated', { monthKey, periodName: `${monthName} ${selectedYear}` });

      showToast(`Successfully applied ${validRows.length} attendance day records for ${monthName} ${selectedYear} across ${matchedEmpCount} employees!`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error applying bulk attendance:', err);
      showToast(err.message || 'Failed to sync bulk attendance.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Complete Monthly Attendance Import & Reconciliation</h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                Week-by-Week Headers • Live Workforce ({employees.length} Staff) • Pure Database Sync & Working Days Analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Payroll Target Month & Year Selector Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                  <span>Target Payroll Period</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/90 text-emerald-900 font-bold border border-emerald-300">
                    {monthName} {selectedYear} ({daysInMonth} Days)
                  </span>
                </div>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Select the payroll cycle you are preparing. Timesheet download and uploaded records will map strictly to this month.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedMonthIndex}
                onChange={e => setSelectedMonthIndex(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const mName = new Date(selectedYear, i, 1).toLocaleString('en-US', { month: 'long' });
                  return (
                    <option key={i} value={i}>
                      {mName}
                    </option>
                  );
                })}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {[2025, 2026, 2027].map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Row: Template Download & File Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Download Complete Monthly Template */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-emerald-800 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                  Download Monthly Timesheet (.xlsx)
                </div>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  Downloads full <strong>{monthName} {selectedYear}</strong> calendar with <strong>Week 1 to Week 5 headers</strong>, day dates, and active workforce ({employees.length} employees). Pure SQL attendance data is reflected while unrecorded days remain completely blank for clean data entry without mock values.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="mt-3 w-full py-2.5 px-3 bg-white hover:bg-emerald-100/60 text-emerald-950 font-bold text-xs rounded-xl border border-emerald-300 shadow-2xs transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Download {monthName} {selectedYear} Timesheet ({employees.length} Staff)</span>
              </button>
            </div>

            {/* Step 2: Upload File Zone */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-gray-800 text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-gray-700 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                  Upload Edited Monthly Spreadsheet
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload the downloaded sheet after making your attendance changes. Supports <code className="text-emerald-700 font-semibold">.xlsx</code>, <code className="text-emerald-700 font-semibold">.xls</code>, <code className="text-emerald-700 font-semibold">.csv</code>.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="mt-3 w-full py-2.5 px-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{fileName ? `Replace: ${fileName}` : 'Choose File to Upload'}</span>
              </button>
            </div>
          </div>

          {/* Reconciliation Metric Cards */}
          {totalRows > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Day Records</div>
                <div className="text-lg font-bold font-mono text-gray-900 mt-0.5">{totalRows}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{matchedEmpCount} Employees</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <div className="text-[11px] font-semibold text-emerald-700 uppercase">Present Days (P)</div>
                <div className="text-lg font-bold font-mono text-emerald-800 mt-0.5">+{presentCount}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">1.0 Paid Days</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <div className="text-[11px] font-semibold text-rose-700 uppercase">Absent Days (A)</div>
                <div className="text-lg font-bold font-mono text-rose-800 mt-0.5">{absentCount}</div>
                <div className="text-[10px] text-rose-600 mt-0.5">Loss of Pay (LOP)</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <div className="text-[11px] font-semibold text-amber-700 uppercase">Half Days (HD)</div>
                <div className="text-lg font-bold font-mono text-amber-800 mt-0.5">{halfDayCount}</div>
                <div className="text-[10px] text-amber-600 mt-0.5">0.5 Paid Days</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <div className="text-[11px] font-semibold text-gray-600 uppercase">Weekly Offs (WO)</div>
                <div className="text-lg font-bold font-mono text-gray-800 mt-0.5">{weeklyOffCount}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Rest Days</div>
              </div>
            </div>
          )}

          {/* Preview Table Header & Filters */}
          {totalRows > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Reconciliation Preview & Verification
                  </h4>
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">
                    {detectedFormat === 'MATRIX' ? 'Monthly Timesheet Matrix Mode' : 'Row List Mode'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['ALL', 'VALID', 'ERRORS'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setFilterMode(m)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                        filterMode === m
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {m === 'ALL' ? `All (${totalRows})` : m === 'VALID' ? `Valid (${validRows.length})` : `Errors (${errorRows.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold sticky top-0 z-10 text-[11px]">
                    <tr>
                      <th className="p-2.5 pl-3">#</th>
                      <th className="p-2.5">Employee ID & Name</th>
                      <th className="p-2.5">Attendance Date</th>
                      <th className="p-2.5 text-center">Status Detected</th>
                      <th className="p-2.5 text-center">Paid Credit</th>
                      <th className="p-2.5">Remarks / Reason</th>
                      <th className="p-2.5 text-center">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-mono text-[11px]">
                    {filteredDisplayRows.slice(0, 300).map(r => {
                      const empName = r.matchedEmployee
                        ? `${r.matchedEmployee.first_name || ''} ${r.matchedEmployee.last_name || ''}`.trim() || r.matchedEmployee.display_name || r.matchedEmployee.name
                        : '—';

                      return (
                        <tr key={`${r.rawEmpId}-${r.dateStr}-${r.rowNum}`} className={!r.isValid ? 'bg-rose-50/50' : 'hover:bg-gray-50'}>
                          <td className="p-2 pl-3 text-gray-400 font-semibold">{r.rowNum}</td>
                          <td className="p-2 font-sans font-semibold text-gray-900">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-emerald-800 font-bold">{r.rawEmpId}</span>
                              {r.matchedEmployee && (
                                <span className="text-gray-600 font-normal text-xs">({empName})</span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-gray-700 font-semibold">{r.dateStr}</td>
                          <td className="p-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                r.normalizedStatus === 'PRESENT' || r.normalizedStatus === 'ON_DUTY' || r.normalizedStatus === 'WORK_FROM_HOME'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.normalizedStatus === 'HALF_DAY'
                                  ? 'bg-amber-100 text-amber-800'
                                  : r.normalizedStatus === 'ON_LEAVE'
                                  ? 'bg-purple-100 text-purple-800'
                                  : r.normalizedStatus === 'WEEKLY_OFF'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {r.normalizedStatus}
                            </span>
                          </td>
                          <td className="p-2 text-center text-gray-700 font-bold">
                            {r.payableStatus}d
                          </td>
                          <td className="p-2 font-sans text-gray-600 truncate max-w-xs">{r.reason}</td>
                          <td className="p-2 text-center">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[10px]" title={r.validationError}>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Unknown ID
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredDisplayRows.length > 300 && (
                <div className="text-[11px] text-gray-400 text-center py-1">
                  Showing first 300 rows (out of {filteredDisplayRows.length} total parsed records)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Reconciles all working days, credits present days, and updates monthly payroll.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200/70 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplySync}
              disabled={isSyncing || validRows.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Syncing to Payroll Ledger...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply & Sync {validRows.length} Day Records</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
