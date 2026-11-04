import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  UserPlus,
  Database,
  FileUp,
  Sparkles,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';
import { hrEventBus } from '../../../services/hrEventBus';
import { attendanceApi } from '../../../services/attendanceApi';
import { api, ensureUUID } from '../../../services/api';
import masterEmployeesData from '../../../services/excelMasterData.json';

interface AttendanceBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  currentYear?: number;
  currentMonthIndex?: number;
  dailyRecords?: any[];
  onSuccess?: () => void;
}

export interface ParsedAttendanceRow {
  rowNum: number;
  rawEmpId: string;
  rawEmpName?: string;
  rawDept?: string;
  rawDesignation?: string;
  matchedEmployee?: any;
  isAutoProvision?: boolean;
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
  const masterFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentMonthIndex);

  // Authoritative monthly recorded data from database
  const [activeDailyRecords, setActiveDailyRecords] = useState<any[]>(dailyRecords);
  const [isLoadingMonthData, setIsLoadingMonthData] = useState<boolean>(false);

  // Workforce merging
  const [allDbEmployees, setAllDbEmployees] = useState<any[]>([]);
  const [extraMergedEmployees, setExtraMergedEmployees] = useState<any[]>([]);
  const [autoProvisionMissing, setAutoProvisionMissing] = useState<boolean>(true);

  // Workbook & Sheets
  const [fileName, setFileName] = useState<string>('');
  const [parsedWorkbook, setParsedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('');

  const [parsedRows, setParsedRows] = useState<ParsedAttendanceRow[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'NEW_STAFF' | 'ERRORS'>('ALL');
  const [detectedFormat, setDetectedFormat] = useState<'MATRIX' | 'LIST' | null>(null);

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

  // 1. Fetch Authoritative Attendance Records for Selected Month & Year
  useEffect(() => {
    let isMounted = true;
    const fetchMonthRecords = async () => {
      setIsLoadingMonthData(true);
      try {
        const start = `${monthKey}-01`;
        const end = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`;
        if (isSupabaseEnabled && supabase) {
          const { data: dbRecords, error: dbErr } = await supabase
            .from('attendance_daily')
            .select('*')
            .gte('attendance_date', start)
            .lte('attendance_date', end);

          if (!dbErr && dbRecords && isMounted) {
            setActiveDailyRecords(dbRecords);
            return;
          }
        }
        // Fallback filter
        const filtered = (dailyRecords || []).filter(r => {
          const d = r.attendance_date || r.date;
          return d && d.startsWith(monthKey);
        });
        if (isMounted) setActiveDailyRecords(filtered);
      } catch (err) {
        console.warn('[AttendanceBulkUploadModal] Notice loading month attendance:', err);
      } finally {
        if (isMounted) setIsLoadingMonthData(false);
      }
    };

    fetchMonthRecords();
    return () => { isMounted = false; };
  }, [selectedYear, selectedMonthIndex, monthKey, daysInMonth]);

  // 2. Fetch all employees across the organization from Supabase for maximum match coverage
  useEffect(() => {
    let isMounted = true;
    api.getEmployees().then(allEmps => {
      if (allEmps && allEmps.length > 0 && isMounted) {
        setAllDbEmployees(allEmps);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // 3. Authoritative Combined Workforce Master (Props + All DB + Pre-loaded Master + Uploaded Master)
  const combinedWorkforce = useMemo(() => {
    const list: any[] = [];
    const seenCodes = new Set<string>();

    const addEmp = (emp: any) => {
      if (!emp) return;
      const code = (emp.employee_code || emp.id || '').toString().toLowerCase().trim();
      const normCode = code.replace(/[^a-z0-9]/g, '');
      if (code && !seenCodes.has(code) && !seenCodes.has(normCode)) {
        seenCodes.add(code);
        if (normCode) seenCodes.add(normCode);
        list.push(emp);
      }
    };

    // 1. Current active employees passed from view
    (employees || []).forEach(addEmp);
    // 2. All DB employees across all companies/branches
    (allDbEmployees || []).forEach(addEmp);
    // 3. User-uploaded extra merged employees from separate master file
    (extraMergedEmployees || []).forEach(addEmp);
    // 4. Preloaded master employees from excelMasterData.json (48 real workforce employees from Master Data Final)
    ((masterEmployeesData as any[]) || []).forEach(me => {
      addEmp({
        id: ensureUUID(`master-${(me.employee_code || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`),
        employee_code: me.employee_code,
        first_name: me.first_name,
        last_name: me.last_name,
        display_name: me.display_name,
        department_name: me.department_name,
        designation_title: me.designation_title,
        work_location: me.work_location,
        isMasterData: true,
      });
    });

    return list;
  }, [employees, allDbEmployees, extraMergedEmployees]);

  // Build employee lookup maps for instant matching
  const employeeLookup = useMemo(() => {
    const codeMap = new Map<string, any>();
    const idMap = new Map<string, any>();
    const nameMap = new Map<string, any>();

    combinedWorkforce.forEach(emp => {
      if (emp.id) {
        idMap.set(String(emp.id).toLowerCase(), emp);
      }
      if (emp.employee_code) {
        const rawCode = String(emp.employee_code).toLowerCase().trim();
        const normCode = rawCode.replace(/[^a-z0-9]/g, '');
        codeMap.set(rawCode, emp);
        if (normCode) codeMap.set(normCode, emp);
      }
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name;
      if (fullName) {
        nameMap.set(fullName.toLowerCase().trim(), emp);
      }
    });

    return { codeMap, idMap, nameMap };
  }, [combinedWorkforce]);

  if (!isOpen) return null;

  // Helper: Universal Date Parser (Supports Excel Serial Numbers, ISO Dates, Formatted Strings, and Day Numbers)
  const parseAnyDate = (val: any): string | null => {
    if (val === null || val === undefined || val === '') return null;

    // 1. Numeric Excel serial date (e.g. 46260 -> 2026-08-26)
    if (typeof val === 'number' || (!isNaN(val) && String(val).trim().length >= 4 && !String(val).includes('-') && !String(val).includes('/'))) {
      const num = Number(val);
      if (num > 30000 && num < 60000) {
        const parsed = XLSX.SSF.parse_date_code(num);
        if (parsed) {
          return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
      }
    }

    const str = String(val).trim();

    // 2. ISO format YYYY-MM-DD
    const isoMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    // 3. DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyyMatch) {
      return `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2].padStart(2, '0')}-${ddmmyyyyMatch[1].padStart(2, '0')}`;
    }

    // 4. DD-MMM-YYYY e.g. 26-Aug-2026, 01-Oct-2026
    const ddMmmYyyyMatch = str.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{4})$/);
    if (ddMmmYyyyMatch) {
      const day = ddMmmYyyyMatch[1].padStart(2, '0');
      const monthStr = ddMmmYyyyMatch[2].toLowerCase();
      const year = ddMmmYyyyMatch[3];
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const mIdx = months.indexOf(monthStr);
      if (mIdx !== -1) {
        return `${year}-${String(mIdx + 1).padStart(2, '0')}-${day}`;
      }
    }

    // 5. Day number fallback e.g. "1", "01", "Day 1", "01 (Sun)" mapped to target month
    const dayNumMatch = str.match(/(?:day\s*)?0?(\d{1,2})(?:\s*\(|$)/i);
    if (dayNumMatch) {
      const dInt = parseInt(dayNumMatch[1], 10);
      if (dInt >= 1 && dInt <= daysInMonth) {
        return `${monthKey}-${String(dInt).padStart(2, '0')}`;
      }
    }

    return null;
  };

  // Helper: Normalize Status (Returns null for empty cells so they are never fabricated as 'P')
  const normalizeStatus = (raw: string): { status: ParsedAttendanceRow['normalizedStatus']; payable: number } | null => {
    const s = (raw || '').toUpperCase().trim();
    if (!s || s === '-' || s === '—' || s === 'NA' || s === 'N/A' || s === 'NULL' || s === 'UNDEFINED') {
      return null;
    }
    if (s === 'A' || s === 'ABSENT' || s === '0' || s === 'LOP' || s === 'AB') {
      return { status: 'ABSENT', payable: 0.0 };
    }
    if (s === 'HD' || s === 'HALF DAY' || s === 'HALF_DAY' || s === '0.5' || s === 'HF') {
      return { status: 'HALF_DAY', payable: 0.5 };
    }
    if (s === 'OD' || s === 'ON DUTY' || s === 'DUTY') {
      return { status: 'ON_DUTY', payable: 1.0 };
    }
    if (s === 'WFH' || s === 'REMOTE' || s === 'WORK FROM HOME') {
      return { status: 'WORK_FROM_HOME', payable: 1.0 };
    }
    if (s === 'PL' || s === 'LEAVE' || s === 'L' || s === 'PAID LEAVE' || s === 'CL' || s === 'SL') {
      return { status: 'ON_LEAVE', payable: 1.0 };
    }
    if (s === 'WO' || s === 'OFF' || s === 'WEEKLY OFF' || s === 'W/OFF' || s === 'SUNDAY' || s === 'REST DAY') {
      return { status: 'WEEKLY_OFF', payable: 1.0 };
    }
    if (s === 'P' || s === 'PRESENT' || s === '1' || s === 'PR') {
      return { status: 'PRESENT', payable: 1.0 };
    }
    return null;
  };

  // =========================================================================
  // 1. Download Master Monthly Timesheet Template
  // Strictly follows selectedYear & selectedMonthIndex with Live Workforce
  // =========================================================================
  const handleDownloadTemplate = async () => {
    try {
      // Row 1: Company & Month Top Title
      const headerRow1: any[] = [`JOY CORPORATE SOLUTIONS PVT LTD - MONTHLY ATTENDANCE REGISTER - ${monthName.toUpperCase()} ${selectedYear}`];
      // Row 2: Subtitle Metadata
      const headerRow2: any[] = [
        `Workforce: ${combinedWorkforce.length} Active Employees | Month: ${monthName} ${selectedYear} (${daysInMonth} Days) | Authoritative Monthly Timesheet & Payroll Ledger (Pure SQL Sync)`
      ];

      // Row 3: Week Groups Header (Row Index 2 in 0-based)
      const headerRow3: any[] = ['Emp ID', 'Employee Name', 'Department', 'Designation'];
      // Row 4: Detailed Day Columns with Weekday and ISO Date (Row Index 3 in 0-based)
      const headerRow4: any[] = ['Emp ID', 'Employee Name', 'Department', 'Designation'];

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(selectedYear, selectedMonthIndex, day);
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
      headerRow3.push('MONTHLY SUMMARY & STATUTORY ANALYSIS', '', '', '', '', '', '', '', '', '');
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
      combinedWorkforce.forEach(emp => {
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

          // Check authoritative recorded attendance in SQL database for this employee on this date
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
            st = '';
          }

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
      for (let day = 1; day <= daysInMonth; day++) {
        colWidths.push({ wch: 16 });
      }
      for (let s = 0; s < 10; s++) {
        colWidths.push({ wch: 18 });
      }
      ws['!cols'] = colWidths;

      const totalCols = headerRow4.length;
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
        { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
        { s: { r: 2, c: 4 }, e: { r: 2, c: Math.min(10, 3 + daysInMonth) } },
        ...(daysInMonth >= 8 ? [{ s: { r: 2, c: 11 }, e: { r: 2, c: Math.min(17, 3 + daysInMonth) } }] : []),
        ...(daysInMonth >= 15 ? [{ s: { r: 2, c: 18 }, e: { r: 2, c: Math.min(24, 3 + daysInMonth) } }] : []),
        ...(daysInMonth >= 22 ? [{ s: { r: 2, c: 25 }, e: { r: 2, c: Math.min(31, 3 + daysInMonth) } }] : []),
        ...(daysInMonth >= 29 ? [{ s: { r: 2, c: 32 }, e: { r: 2, c: 3 + daysInMonth } }] : []),
        { s: { r: 2, c: 4 + daysInMonth }, e: { r: 2, c: 4 + daysInMonth + 9 } },
      ];

      const instructions = [
        { 'Guide': 'JOY PeopleHR - Complete Monthly Attendance Master Register Specification' },
        { 'Guide': '========================================================================================' },
        { 'Guide': `Active Month: ${monthName} ${selectedYear} (${daysInMonth} Total Calendar Days)` },
        { 'Guide': `Workforce: ${combinedWorkforce.length} active employees (loaded directly from SQL Database + Master Registry).` },
        { 'Guide': '' },
        { 'Guide': 'ALLOWED ATTENDANCE STATUS CODES FOR ANY DAY CELL:' },
        { 'Guide': '  • P    = Present & Full Working Day (1.0 Paid Day credited)' },
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
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructions);
      wsInstructions['!cols'] = [{ wch: 100 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${selectedYear}`);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions & Legend');

      const targetFileName = `JOY_Monthly_Attendance_${monthName}_${selectedYear}_Template.xlsx`;
      XLSX.writeFile(wb, targetFileName);
      showToast(`Downloaded ${monthName} ${selectedYear} timesheet for ${combinedWorkforce.length} employees!`);
    } catch (err: any) {
      console.error('Download template error:', err);
      showToast('Failed to generate template.', 'error');
    }
  };

  // =========================================================================
  // 2. Separate Master Employee Excel Upload & Merge
  // =========================================================================
  const handleUploadMasterExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const mergedList: any[] = [];

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (rows.length < 2) return;

          // Find header row in first 10 rows
          let headerRowIdx = -1;
          for (let r = 0; r < Math.min(10, rows.length); r++) {
            const row = rows[r];
            if (row.some((c: any) => /emp\s*id|employee\s*code|employee\s*no|staff\s*id|code/i.test(String(c)))) {
              headerRowIdx = r;
              break;
            }
          }
          if (headerRowIdx === -1) return;

          const header = rows[headerRowIdx];
          const findCol = (regex: RegExp) => header.findIndex((h: any) => regex.test(String(h)));
          const empIdIdx = findCol(/emp\s*id|employee\s*code|employee\s*no|staff\s*id|code/i);
          const nameIdx = findCol(/name|employee\s*name|staff\s*name|full\s*name/i);
          const deptIdx = findCol(/department|dept/i);
          const desigIdx = findCol(/designation|occupation|role|job|position/i);
          const locIdx = findCol(/location|branch|site/i);

          for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || empIdIdx === -1 || !row[empIdIdx]) continue;
            const empCode = String(row[empIdIdx]).trim();
            if (!empCode || /total|summary/i.test(empCode)) continue;

            const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
            const nameParts = rawName ? rawName.split(' ') : [];
            const firstName = nameParts[0] || empCode;
            const lastName = nameParts.slice(1).join(' ') || '.';

            mergedList.push({
              id: ensureUUID(`master-${empCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`),
              employee_code: empCode,
              first_name: firstName,
              last_name: lastName,
              display_name: rawName || empCode,
              department_name: deptIdx !== -1 ? String(row[deptIdx] || 'Operations').trim() : 'Operations',
              designation_title: desigIdx !== -1 ? String(row[desigIdx] || 'Staff').trim() : 'Staff',
              work_location: locIdx !== -1 ? String(row[locIdx] || 'Coimbatore').trim() : 'Coimbatore',
              source: `Separate Master (${sheetName})`,
            });
          }
        });

        if (mergedList.length > 0) {
          setExtraMergedEmployees(prev => [...prev, ...mergedList]);
          showToast(`Successfully merged ${mergedList.length} employee records from '${file.name}'!`);
          // If attendance file is already uploaded, re-parse to match new employees
          if (parsedWorkbook && activeSheetName) {
            parseSheet(parsedWorkbook.Sheets[activeSheetName], mergedList);
          }
        } else {
          showToast(`Could not detect employee columns in '${file.name}'.`, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      console.error('Error merging master excel:', err);
      showToast('Failed to merge employee master file.', 'error');
    }
  };

  // =========================================================================
  // 3. Parse Worksheet Logic (Supports Both Matrix & Punch List)
  // =========================================================================
  const parseSheet = (worksheet: XLSX.WorkSheet, dynamicExtraEmployees?: any[]) => {
    setIsProcessing(true);
    try {
      const rawAoA: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rawAoA || rawAoA.length === 0) {
        showToast('Selected spreadsheet appears to be empty.', 'error');
        setIsProcessing(false);
        return;
      }

      // Build active lookup maps including any newly merged employees
      const activeCombined = dynamicExtraEmployees
        ? [...combinedWorkforce, ...dynamicExtraEmployees]
        : combinedWorkforce;

      const codeMap = new Map<string, any>();
      const idMap = new Map<string, any>();
      const nameMap = new Map<string, any>();

      activeCombined.forEach(emp => {
        if (emp.id) idMap.set(String(emp.id).toLowerCase(), emp);
        if (emp.employee_code) {
          const rawCode = String(emp.employee_code).toLowerCase().trim();
          const normCode = rawCode.replace(/[^a-z0-9]/g, '');
          codeMap.set(rawCode, emp);
          if (normCode) codeMap.set(normCode, emp);
        }
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.display_name || emp.name;
        if (fullName) {
          nameMap.set(fullName.toLowerCase().trim(), emp);
        }
      });

      // Step A: Detect Matrix Header Row (Search up to 25 rows)
      let matrixHeaderRowIdx = -1;
      let dayCols: { colIndex: number; dateStr: string }[] = [];
      let empIdColIdx = 0;
      let empNameColIdx = 1;
      let deptColIdx = 2;
      let desigColIdx = 3;

      for (let rIdx = 0; rIdx < Math.min(25, rawAoA.length); rIdx++) {
        const row = rawAoA[rIdx];
        if (!row || !Array.isArray(row)) continue;

        // Count columns that look like day columns
        const tempDayCols: { colIndex: number; dateStr: string }[] = [];
        row.forEach((cell, cIdx) => {
          const s = String(cell).trim();
          if (!s) return;

          // Ignore standard non-day headers
          if (/^(s\.?no|sl\.?no|emp|employee|name|dept|department|designation|occupation|total|present|absent|working|paid|nfh|ot|gross|deduction|net|category|uan|esi|pan|bank|aadhar)/i.test(s)) {
            return;
          }

          // Test full date in brackets [YYYY-MM-DD]
          const bracketDate = s.match(/\[(\d{4}-\d{2}-\d{2})\]/);
          if (bracketDate) {
            tempDayCols.push({ colIndex: cIdx, dateStr: bracketDate[1] });
            return;
          }

          // Test ISO YYYY-MM-DD
          const isoDate = s.match(/^(\d{4}-\d{2}-\d{2})$/);
          if (isoDate) {
            tempDayCols.push({ colIndex: cIdx, dateStr: isoDate[1] });
            return;
          }

          // Test DD-MM-YYYY or DD/MM/YYYY
          const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
          if (ddmmyyyy) {
            tempDayCols.push({ colIndex: cIdx, dateStr: `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}` });
            return;
          }

          // Test pure day number (1..31) or Day string like "01 (Thu)" or "1"
          const dayNumMatch = s.match(/(?:day\s*)?0?(\d{1,2})(?:\s*\(|$)/i);
          if (dayNumMatch) {
            const dInt = parseInt(dayNumMatch[1], 10);
            if (dInt >= 1 && dInt <= daysInMonth) {
              tempDayCols.push({ colIndex: cIdx, dateStr: `${monthKey}-${String(dInt).padStart(2, '0')}` });
            }
          }
        });

        // If row has >= 5 day columns, it is definitively a Monthly Attendance Matrix!
        if (tempDayCols.length >= 5) {
          matrixHeaderRowIdx = rIdx;
          dayCols = tempDayCols;

          // Identify column indices from this row or prior row
          const headerScanRows = [row, rawAoA[Math.max(0, rIdx - 1)]];
          headerScanRows.forEach(hRow => {
            if (!hRow) return;
            hRow.forEach((c: any, cIdx: number) => {
              const str = String(c).toLowerCase().trim();
              if (/emp\s*id|employee\s*code|employee\s*no|staff\s*id|punching\s*no|code/i.test(str)) {
                empIdColIdx = cIdx;
              } else if (/name|employee\s*name|staff\s*name|full\s*name/i.test(str)) {
                empNameColIdx = cIdx;
              } else if (/dept|department/i.test(str)) {
                deptColIdx = cIdx;
              } else if (/designation|occupation|role|position/i.test(str)) {
                desigColIdx = cIdx;
              }
            });
          });

          // Special check: If col 0 is S.No (serial numbers 1,2,3...) and col 1 has employee codes, adjust
          if (empIdColIdx === 0 && rawAoA.length > rIdx + 1) {
            const firstData = rawAoA[rIdx + 1];
            if (firstData && /^\d+$/.test(String(firstData[0]).trim()) && firstData[1]) {
              empIdColIdx = 1;
              empNameColIdx = 2;
            }
          }
          break;
        }
      }

      const rows: ParsedAttendanceRow[] = [];

      if (matrixHeaderRowIdx !== -1 && dayCols.length > 0) {
        // ===================================================================
        // FORMAT A: MONTHLY MATRIX SHEET DETECTED
        // ===================================================================
        setDetectedFormat('MATRIX');
        let processedRowNum = 1;

        for (let rIdx = matrixHeaderRowIdx + 1; rIdx < rawAoA.length; rIdx++) {
          const rowData = rawAoA[rIdx];
          if (!rowData || !Array.isArray(rowData)) continue;

          const rawEmp = String(rowData[empIdColIdx] || '').trim();
          if (!rawEmp || /total|summary|grand\s*total/i.test(rawEmp)) continue;

          const rawEmpName = empNameColIdx !== -1 ? String(rowData[empNameColIdx] || '').trim() : '';
          const rawDept = deptColIdx !== -1 ? String(rowData[deptColIdx] || '').trim() : '';
          const rawDesig = desigColIdx !== -1 ? String(rowData[desigColIdx] || '').trim() : '';

          // Match Employee against master workforce
          const cleanedCode = rawEmp.toLowerCase();
          const alphanumericCode = cleanedCode.replace(/[^a-z0-9]/g, '');
          let matched =
            codeMap.get(cleanedCode) ||
            codeMap.get(alphanumericCode) ||
            idMap.get(cleanedCode) ||
            (rawEmpName ? nameMap.get(rawEmpName.toLowerCase().trim()) : null);

          let isAutoProvision = false;
          if (!matched && autoProvisionMissing) {
            // Auto-provision candidate
            matched = {
              id: ensureUUID(`auto-${alphanumericCode}`),
              employee_code: rawEmp,
              first_name: rawEmpName ? rawEmpName.split(' ')[0] : rawEmp,
              last_name: rawEmpName && rawEmpName.includes(' ') ? rawEmpName.split(' ').slice(1).join(' ') : '.',
              display_name: rawEmpName || rawEmp,
              department_name: rawDept || 'Operations',
              designation_title: rawDesig || 'Staff',
              isAutoProvision: true,
            };
            isAutoProvision = true;
          }

          // Extract day cells
          dayCols.forEach(dayCol => {
            const cellVal = String(rowData[dayCol.colIndex] || '').trim();
            if (!cellVal) return; // Clean skip: empty cell, no punch to create

            const norm = normalizeStatus(cellVal);
            if (!norm) return;
            const { status: normStatus, payable } = norm;

            let isValid = true;
            let validationError: string | undefined;

            if (!matched) {
              isValid = false;
              validationError = `Employee ID '${rawEmp}' not found in active workforce.`;
            }

            const workMins = normStatus === 'ABSENT' || normStatus === 'WEEKLY_OFF' ? 0 : 540;

            rows.push({
              rowNum: processedRowNum++,
              rawEmpId: rawEmp,
              rawEmpName: rawEmpName || matched?.display_name,
              rawDept,
              rawDesignation: rawDesig,
              matchedEmployee: matched,
              isAutoProvision,
              dateStr: dayCol.dateStr,
              rawStatus: cellVal,
              normalizedStatus: normStatus,
              payableStatus: payable,
              inTime: normStatus !== 'ABSENT' ? '09:30' : '',
              outTime: normStatus !== 'ABSENT' ? '18:30' : '',
              reason: 'Monthly Matrix Attendance Reconciliation',
              workMinutes: workMins,
              isValid,
              validationError,
            });
          });
        }
      } else {
        // ===================================================================
        // FORMAT B: FLAT ROW LIST / IN&OUT PUNCH LOG (with Block grouping support)
        // ===================================================================
        setDetectedFormat('LIST');

        // Locate header row in rawAoA
        let listHeaderRowIdx = 0;
        let empIdKeyIdx = -1;
        let nameKeyIdx = -1;
        let dateKeyIdx = -1;
        let statusKeyIdx = -1;
        let inKeyIdx = -1;
        let outKeyIdx = -1;
        let reasonKeyIdx = -1;

        for (let r = 0; r < Math.min(15, rawAoA.length); r++) {
          const row = rawAoA[r];
          if (!row || !Array.isArray(row)) continue;

          row.forEach((cell, cIdx) => {
            const str = String(cell).toLowerCase().trim();
            if (/emp\s*id|employee\s*no|employee\s*code|staff\s*id|code/i.test(str)) empIdKeyIdx = cIdx;
            else if (/name|employee\s*name|staff\s*name/i.test(str)) nameKeyIdx = cIdx;
            else if (/date|attendance\s*date|day|work\s*date/i.test(str)) dateKeyIdx = cIdx;
            else if (/status|present\s*absent|mark|s1|s2/i.test(str)) statusKeyIdx = cIdx;
            else if (/in\s*time|check\s*in|in|punch\s*in/i.test(str)) inKeyIdx = cIdx;
            else if (/out\s*time|check\s*out|out|punch\s*out/i.test(str)) outKeyIdx = cIdx;
            else if (/reason|remarks|note|comment/i.test(str)) reasonKeyIdx = cIdx;
          });

          if (dateKeyIdx !== -1 && (empIdKeyIdx !== -1 || inKeyIdx !== -1)) {
            listHeaderRowIdx = r;
            break;
          }
        }

        let currentEmpId = '';
        let currentEmpName = '';
        let processedRowNum = 1;

        for (let r = listHeaderRowIdx + 1; r < rawAoA.length; r++) {
          const row = rawAoA[r];
          if (!row || !Array.isArray(row)) continue;

          // Extract emp id or carry forward from block group (like in WATERTEC IN&OUT)
          const rowEmpId = empIdKeyIdx !== -1 ? String(row[empIdKeyIdx] || '').trim() : '';
          const rowEmpName = nameKeyIdx !== -1 ? String(row[nameKeyIdx] || '').trim() : '';

          if (rowEmpId && !/total|summary|assembly|imd|sub/i.test(rowEmpId)) {
            currentEmpId = rowEmpId;
            currentEmpName = rowEmpName || currentEmpName;
          }

          if (!currentEmpId) continue;

          // Parse date
          const rawDate = dateKeyIdx !== -1 ? row[dateKeyIdx] : null;
          const normalizedDateStr = parseAnyDate(rawDate) || `${monthKey}-01`;

          // Extract status / in-out
          const rawSt = statusKeyIdx !== -1 ? String(row[statusKeyIdx] || '').trim() : '';
          const rawIn = inKeyIdx !== -1 ? String(row[inKeyIdx] || '').trim() : '';
          const rawOut = outKeyIdx !== -1 ? String(row[outKeyIdx] || '').trim() : '';
          const reasonStr = reasonKeyIdx !== -1 ? String(row[reasonKeyIdx] || '').trim() : 'Excel Bulk Upload';

          // Determine status
          let norm = normalizeStatus(rawSt);
          if (!norm) {
            // Infer from In/Out times
            if (rawIn && rawIn !== '-' && rawIn !== '00:00') {
              norm = { status: 'PRESENT', payable: 1.0 };
            } else if (/wo|off/i.test(rawSt)) {
              norm = { status: 'WEEKLY_OFF', payable: 1.0 };
            } else {
              norm = { status: 'ABSENT', payable: 0.0 };
            }
          }
          const { status: normStatus, payable } = norm;

          // Match Employee
          const cleanedCode = currentEmpId.toLowerCase();
          const alphanumericCode = cleanedCode.replace(/[^a-z0-9]/g, '');
          let matched =
            codeMap.get(cleanedCode) ||
            codeMap.get(alphanumericCode) ||
            idMap.get(cleanedCode) ||
            (currentEmpName ? nameMap.get(currentEmpName.toLowerCase().trim()) : null);

          let isAutoProvision = false;
          if (!matched && autoProvisionMissing) {
            matched = {
              id: ensureUUID(`auto-${alphanumericCode}`),
              employee_code: currentEmpId,
              first_name: currentEmpName ? currentEmpName.split(' ')[0] : currentEmpId,
              last_name: currentEmpName && currentEmpName.includes(' ') ? currentEmpName.split(' ').slice(1).join(' ') : '.',
              display_name: currentEmpName || currentEmpId,
              department_name: 'Operations',
              designation_title: 'Staff',
              isAutoProvision: true,
            };
            isAutoProvision = true;
          }

          const workMins = normStatus === 'ABSENT' || normStatus === 'WEEKLY_OFF' ? 0 : 540;
          let isValid = true;
          let validationError: string | undefined;

          if (!matched) {
            isValid = false;
            validationError = `Employee ID '${currentEmpId}' not found in active workforce.`;
          }

          rows.push({
            rowNum: processedRowNum++,
            rawEmpId: currentEmpId,
            rawEmpName: currentEmpName || matched?.display_name,
            matchedEmployee: matched,
            isAutoProvision,
            dateStr: normalizedDateStr,
            rawStatus: rawSt || (normStatus === 'PRESENT' ? 'P' : 'A'),
            normalizedStatus: normStatus,
            payableStatus: payable,
            inTime: rawIn || (normStatus !== 'ABSENT' ? '09:30' : ''),
            outTime: rawOut || (normStatus !== 'ABSENT' ? '18:30' : ''),
            reason: reasonStr,
            workMinutes: workMins,
            isValid,
            validationError,
          });
        }
      }

      setParsedRows(rows);
      showToast(`Parsed ${rows.length} total attendance records. Mode: ${matrixHeaderRowIdx !== -1 ? 'Monthly Matrix' : 'Flat Punch List'}.`);
    } catch (err: any) {
      console.error('Error parsing worksheet:', err);
      showToast(err.message || 'Failed to parse sheet.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // 4. File Selector Handler (Reads Workbook & Identifies Sheets)
  // =========================================================================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setParsedWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Auto-select preferred attendance sheet
        let preferredSheet = wb.SheetNames[0];
        const monthPattern = new RegExp(monthName, 'i');
        for (const name of wb.SheetNames) {
          if (monthPattern.test(name) || /attendance|in.?out|muster|daily|timesheet|register/i.test(name)) {
            preferredSheet = name;
            break;
          }
        }

        setActiveSheetName(preferredSheet);
        parseSheet(wb.Sheets[preferredSheet]);
      } catch (err: any) {
        console.error('Error reading excel file:', err);
        showToast(err.message || 'Failed to read Excel file.', 'error');
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Switch sheet from dropdown
  const handleSheetChange = (sheetName: string) => {
    setActiveSheetName(sheetName);
    if (parsedWorkbook && parsedWorkbook.Sheets[sheetName]) {
      parseSheet(parsedWorkbook.Sheets[sheetName]);
    }
  };

  // Metrics
  const totalRows = parsedRows.length;
  const validRows = parsedRows.filter(r => r.isValid);
  const errorRows = parsedRows.filter(r => !r.isValid);
  const autoProvisionRows = parsedRows.filter(r => r.isAutoProvision);
  const matchedEmpCount = new Set(validRows.map(r => r.matchedEmployee?.id)).size;
  const newStaffToCreateCount = new Set(autoProvisionRows.map(r => r.rawEmpId)).size;

  const presentCount = validRows.filter(r => r.normalizedStatus === 'PRESENT' || r.normalizedStatus === 'ON_DUTY' || r.normalizedStatus === 'WORK_FROM_HOME').length;
  const absentCount = validRows.filter(r => r.normalizedStatus === 'ABSENT').length;
  const halfDayCount = validRows.filter(r => r.normalizedStatus === 'HALF_DAY').length;
  const weeklyOffCount = validRows.filter(r => r.normalizedStatus === 'WEEKLY_OFF').length;

  const filteredDisplayRows = parsedRows.filter(r => {
    if (filterMode === 'VALID') return r.isValid;
    if (filterMode === 'NEW_STAFF') return r.isAutoProvision;
    if (filterMode === 'ERRORS') return !r.isValid;
    return true;
  });

  // =========================================================================
  // 5. Apply & Synchronize to Database & Payroll
  // Auto-Provisions New Employees and Saves Daily Records via Pure SQL
  // =========================================================================
  const handleApplySync = async () => {
    if (validRows.length === 0) {
      showToast('No valid attendance records to apply.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const orgId = employees[0]?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
      const companyId = employees[0]?.company_id || '2030277f-a6a1-427f-beaf-4fc677a3bae2';

      // Step A: Auto-provision any new employees detected in the sheet
      const uniqueNewEmployeesMap = new Map<string, any>();
      validRows.forEach(r => {
        if (r.isAutoProvision && r.matchedEmployee) {
          uniqueNewEmployeesMap.set(r.rawEmpId.toLowerCase(), r.matchedEmployee);
        }
      });

      const newlyProvisionedList: any[] = [];
      for (const [, newEmp] of uniqueNewEmployeesMap.entries()) {
        try {
          const created = await api.createEmployee({
            id: newEmp.id,
            employee_code: newEmp.employee_code,
            organization_id: orgId,
            company_id: companyId,
            first_name: newEmp.first_name,
            last_name: newEmp.last_name,
            display_name: newEmp.display_name,
            department_name: newEmp.department_name || 'Operations',
            designation_title: newEmp.designation_title || 'Staff',
            work_location: 'Coimbatore HQ',
            employment_type: 'Full Time',
            status: 'Active',
            employment_source: 'DIRECT',
          });
          newlyProvisionedList.push(created);
        } catch (empCreateErr) {
          console.warn('[AttendanceBulkUploadModal] Notice creating employee:', empCreateErr);
        }
      }

      // Step B: Prepare daily records matching database schema
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

      // Step C: Prepare audit regularizations
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
        // Chunk upserts in batches of 50
        const chunkSize = 50;
        for (let i = 0; i < dailyPayloads.length; i += chunkSize) {
          const chunk = dailyPayloads.slice(i, i + chunkSize);
          const { error: upsertErr } = await supabase
            .from('attendance_daily')
            .upsert(chunk, { onConflict: 'employee_id,attendance_date' });

          if (upsertErr) {
            console.warn('[AttendanceBulkUploadModal] Chunk upsert notice, trying individual rows:', upsertErr);
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
          console.warn('[AttendanceBulkUploadModal] Regularizations audit notice:', regErr);
        }
      }

      // Invalidate attendanceApi cache
      attendanceApi.invalidateCache();

      // Dispatch global events
      if (newlyProvisionedList.length > 0) {
        hrEventBus.emit('employee.created', { count: newlyProvisionedList.length });
      }
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
                Week-by-Week Headers • Master Workforce Sync ({combinedWorkforce.length} Staff) • Pure Database Sync & Working Days Analysis
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
                  {isLoadingMonthData && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Fetching DB...
                    </span>
                  )}
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
                  Downloads full <strong>{monthName} {selectedYear}</strong> calendar with <strong>Week 1 to Week 5 headers</strong>, exact day dates, and active workforce ({combinedWorkforce.length} employees). Pure SQL attendance data is reflected while unrecorded days remain completely blank for clean data entry without mock values.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="mt-3 w-full py-2.5 px-3 bg-white hover:bg-emerald-100/60 text-emerald-950 font-bold text-xs rounded-xl border border-emerald-300 shadow-2xs transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Download {monthName} {selectedYear} Timesheet ({combinedWorkforce.length} Staff)</span>
              </button>
            </div>

            {/* Step 2: Upload File Zone with Multi-Sheet support */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-gray-800 text-xs uppercase tracking-wider">
                  <span className="w-5 h-5 rounded-full bg-gray-700 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                  Upload Edited Monthly Spreadsheet
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload the downloaded sheet or your existing attendance muster roll. Supports <code className="text-emerald-700 font-semibold">.xlsx</code>, <code className="text-emerald-700 font-semibold">.xls</code>, <code className="text-emerald-700 font-semibold">.csv</code>.
                </p>

                {/* Multi-Sheet Selector Dropdown */}
                {sheetNames.length > 1 && (
                  <div className="mt-2.5 p-2 bg-white rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-900 shrink-0 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      Select Sheet:
                    </span>
                    <select
                      value={activeSheetName}
                      onChange={e => handleSheetChange(e.target.value)}
                      className="px-2 py-1 bg-emerald-50/70 border border-emerald-300 text-emerald-950 rounded text-xs font-semibold focus:ring-1 focus:ring-emerald-500 cursor-pointer w-full max-w-xs"
                    >
                      {sheetNames.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                <span>{fileName ? `Replace: ${fileName} (${activeSheetName || 'Sheet 1'})` : 'Choose Attendance File to Upload'}</span>
              </button>
            </div>
          </div>

          {/* Master Workforce Reconciliation & Separate Excel Merge Banner */}
          <div className="p-3.5 bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 rounded-xl border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                  <span>Workforce Matching & Separate Excel Merge</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-bold border border-indigo-200">
                    {combinedWorkforce.length} Total Master Staff
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Matches your attendance codes against the live DB + 48 Master Employees. You can also merge a separate employee list.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Auto-provision toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={autoProvisionMissing}
                  onChange={e => {
                    setAutoProvisionMissing(e.target.checked);
                    // Re-trigger parsing if file is loaded
                    if (parsedWorkbook && activeSheetName) {
                      parseSheet(parsedWorkbook.Sheets[activeSheetName]);
                    }
                  }}
                  className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Auto-provision new staff</span>
              </label>

              {/* Upload separate master file */}
              <input
                ref={masterFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleUploadMasterExcel}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => masterFileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-900 text-xs font-bold rounded-lg border border-indigo-300 shadow-2xs transition-colors flex items-center gap-1.5"
                title="Upload a separate Excel file with employee master data"
              >
                <FileUp className="w-3.5 h-3.5 text-indigo-600" />
                <span>Merge Master Excel</span>
              </button>
            </div>
          </div>

          {/* Reconciliation Metric Cards */}
          {totalRows > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <div className="text-[10px] font-semibold text-gray-500 uppercase">Total Day Records</div>
                <div className="text-base font-bold font-mono text-gray-900 mt-0.5">{totalRows}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{matchedEmpCount} Employees</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <div className="text-[10px] font-semibold text-emerald-700 uppercase">Present Days (P)</div>
                <div className="text-base font-bold font-mono text-emerald-800 mt-0.5">+{presentCount}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">1.0 Paid Days</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <div className="text-[10px] font-semibold text-rose-700 uppercase">Absent Days (A)</div>
                <div className="text-base font-bold font-mono text-rose-800 mt-0.5">{absentCount}</div>
                <div className="text-[10px] text-rose-600 mt-0.5">Loss of Pay (LOP)</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <div className="text-[10px] font-semibold text-amber-700 uppercase">Half Days (HD)</div>
                <div className="text-base font-bold font-mono text-amber-800 mt-0.5">{halfDayCount}</div>
                <div className="text-[10px] text-amber-600 mt-0.5">0.5 Paid Days</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <div className="text-[10px] font-semibold text-gray-600 uppercase">Weekly Offs (WO)</div>
                <div className="text-base font-bold font-mono text-gray-800 mt-0.5">{weeklyOffCount}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Rest Days</div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                <div className="text-[10px] font-semibold text-indigo-700 uppercase">Auto-Merged Staff</div>
                <div className="text-base font-bold font-mono text-indigo-800 mt-0.5">+{newStaffToCreateCount}</div>
                <div className="text-[10px] text-indigo-600 mt-0.5">Ready to Provision</div>
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
                    {detectedFormat === 'MATRIX' ? 'Monthly Timesheet Matrix Mode' : 'Row Punch List Mode'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['ALL', 'VALID', 'NEW_STAFF', 'ERRORS'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setFilterMode(m)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                        filterMode === m
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {m === 'ALL'
                        ? `All (${totalRows})`
                        : m === 'VALID'
                        ? `Valid (${validRows.length})`
                        : m === 'NEW_STAFF'
                        ? `New Staff (${autoProvisionRows.length})`
                        : `Errors (${errorRows.length})`}
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
                      <th className="p-2.5">In / Out Times</th>
                      <th className="p-2.5 text-center">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-mono text-[11px]">
                    {filteredDisplayRows.slice(0, 300).map(r => {
                      const empName = r.matchedEmployee
                        ? `${r.matchedEmployee.first_name || ''} ${r.matchedEmployee.last_name || ''}`.trim() || r.matchedEmployee.display_name || r.matchedEmployee.name
                        : r.rawEmpName || '—';

                      return (
                        <tr key={`${r.rawEmpId}-${r.dateStr}-${r.rowNum}`} className={!r.isValid ? 'bg-rose-50/50' : r.isAutoProvision ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}>
                          <td className="p-2 pl-3 text-gray-400 font-semibold">{r.rowNum}</td>
                          <td className="p-2 font-sans font-semibold text-gray-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-emerald-800 font-bold">{r.rawEmpId}</span>
                              <span className="text-gray-600 font-normal text-xs">({empName})</span>
                              {r.isAutoProvision && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                                  + Auto-Provision
                                </span>
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
                          <td className="p-2 font-mono text-gray-600 text-[10px]">
                            {r.inTime && r.outTime ? `${r.inTime} - ${r.outTime}` : r.inTime ? `In: ${r.inTime}` : '—'}
                          </td>
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
            <span>Reconciles all working days, credits present days, and syncs directly to SQL & Payroll Ledger.</span>
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
