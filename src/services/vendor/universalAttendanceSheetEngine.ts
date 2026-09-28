// src/services/vendor/universalAttendanceSheetEngine.ts
// ============================================================================
// Joy PeopleHR — Universal Attendance & Contractor Muster Analysis Engine
// Analyzes heterogeneous Excel (.xlsx, .xls) and CSV sheets across companies
// with fuzzy synonym mapping, multi-sheet detection, and mathematical validation.
// Supports both daily shift punch sheets and monthly contractor muster workbooks.
// Covers Image 2 (Workings / Allowance) and Image 3 (Comprehensive Statutory Muster).
// ============================================================================

import * as XLSX from 'xlsx';
import { UniversalAttendanceTemplateService } from './universalAttendanceTemplateService';
import { VendorMappingProfileService } from './vendorMappingProfileService';
import {
  UniversalWorkbookInspector,
  WorkbookInspectionSummary,
  SheetParseResult,
  SheetClassification,
  CrossSheetReconciliationSummary,
  DataQualitySummary,
} from './universalSheetParsers';

export * from './universalSheetParsers';

export interface DailyPunchDetails {
  date: string;
  shift: string;
  firstHalf: string;
  secondHalf: string;
  checkIn: string;
  checkOut: string;
  lateMinutes: number;
  earlyMinutes: number;
  totalHours: number;
  otHours: number;
}

export interface NormalizedMusterRow {
  rowNumber: number;
  sourceRowNumber?: number;
  sourceSerialNumber?: number | null;
  validationStatus?: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE' | 'UNMAPPED' | 'OUT_OF_PERIOD';
  workerCode: string;
  workerName: string;
  department: string;
  designation?: string;
  payMonth?: string;
  payDays: number;

  // Daily Attendance details (when uploaded from Universal Attendance / IN-OUT file)
  dailyPunch?: DailyPunchDetails;

  // Days breakdown (Image 3)
  days: {
    payDays: number;
    paidWDays: number;
    workingDays: number;
    nationalHolidays: number;
    compOff: number;
    onDuty: number;
    sundays: number;
    paidLeaves: number;
  };

  // Base wage metrics
  dailyWage: number;
  basic: number;
  da: number;
  regularWages: number;

  // Overtime
  otHours: number;
  otStipend: number;

  // Detailed allowances (Image 2 & Image 3)
  allowances: {
    hra: number;
    ca: number;
    transport: number;
    food: number;
    nightShift: number;
    attendanceBonus: number;
    holidaySunday: number;
    leaveWages: number;
    room: number;
    production: number;
    medical: number;
    arrears: number;
    other: number;
    total: number;
  };

  grossWages: number;

  // Detailed deductions (Image 2 & Image 3)
  deductions: {
    employeePf: number;
    employeeEsi: number;
    professionalTax: number;
    lwf: number;
    canteen: number;
    snacks: number;
    rent: number;
    advance: number;
    tds: number;
    medicalIns: number;
    other: number;
    total: number;
  };

  netPayable: number;

  // Mathematical validations
  anomalies: string[];
  hasAnomaly: boolean;
  rawRowData: Record<string, any>;
}

export interface SheetHeaderMapping {
  // Identification
  workerCode?: string;      // PUNCHING NO / Emp ID / Worker Code / Sl No
  workerName?: string;      // NAME / Worker Name / Full Name
  department?: string;      // DEPT / Department
  designation?: string;     // Designation / Skill Level / Role

  // Daily Attendance (IN/OUT, S1/S2, 1st/2nd Half)
  date?: string;            // Date / Attendance Date / Work Date
  shift?: string;           // Shift / Shift Code / Duty Shift
  firstHalf?: string;       // 1st Half / First Half / S1 / Session 1 / AM / FN
  secondHalf?: string;      // 2nd Half / Second Half / S2 / Session 2 / PM / AN
  checkIn?: string;         // IN / In Time / Punch In / Check In
  checkOut?: string;        // OUT / Out Time / Punch Out / Check Out
  lateMinutes?: string;     // Late IN (Min) / Late Minutes
  earlyMinutes?: string;    // Early Out (Min) / Early Minutes
  totalHours?: string;      // Total Hours / Worked Hours

  // Days breakdown
  payMonth?: string;        // Pay Month
  paidWDays?: string;       // Paid W.Ds / Paid WDs / Paid W.Days
  workingDays?: string;     // W Days / W.Days / Working Days
  nationalHolidays?: string;// N/H / NH / Holidays
  compOff?: string;         // CO / Comp Off
  onDuty?: string;          // OD / On Duty
  sundays?: string;         // Sundays
  privilegeLeave?: string;  // PL / EL
  casualLeave?: string;     // CL
  sickLeave?: string;       // SL
  payDays?: string;         // PAY DAYS / Payable Ds / Payable Days

  // Wage rates & Base earnings
  dailyWage?: string;       // D WAG / Daily Wage / Wage Rate
  basic?: string;           // Basic / Basic Pay / Basic Wage
  da?: string;              // DA / Dearness Allowance
  regularWages?: string;    // Wages / Regular Wages / Basic+DA

  // Overtime
  otHours?: string;         // OT / OT Hrs / Overtime Hours
  otStipend?: string;       // OT STIPEND / OT Wages / Overtime Pay

  // Allowances (Image 2 & Image 3)
  hra?: string;             // HRA / House Rent Allowance
  ca?: string;              // CA / Conveyance Allowance / Transport
  foodAllowance?: string;   // Food/Meal / Food Allow / Canteen Allow
  nightShiftAllowance?: string; // Night Allow / Night Shift / NSA
  attendanceAllowance?: string; // Attendance / Att Allow / Att Bonus
  holidayWages?: string;    // Holiday Wg / Sunday Wg
  leaveWages?: string;      // Leave Wag / Leave Wages
  roomAllowance?: string;   // Room Allow / Accommodation / Rent Allow
  productionIncentive?: string; // Production / Production All / Incentive
  medicalAllowance?: string;// Medical All / Medical Allowance
  arrears?: string;         // Arrears

  // Gross Earnings
  grossWages?: string;      // GROSS / Gross Earn / Gross Due / Gross Earnings

  // Deductions (Image 2 & Image 3)
  pfDeduct?: string;        // PF 12% / PF Deduct / EPF
  esiDeduct?: string;       // ESI 0.75% / ESI Deduct / ESIC
  ptDeduct?: string;        // Profession / Professional Tax / PT
  lwfDeduct?: string;       // LWF / Labour Welfare Fund
  canteenDeduct?: string;   // Canteen / Mess
  snacksDeduct?: string;    // Snacks
  rentDeduct?: string;      // Rent / Accommodation Deduct
  advanceDeduct?: string;   // Advance / Salary Advance
  otherDeduct?: string;     // Others / Other Deductions
  tdsDeduct?: string;       // TDS / Tax Deduct
  medicalInsDeduct?: string;// Medical Ins / Medical Insurance
  totalDeductions?: string; // Total Dedu / Total Deductions

  // Net Payout
  netPayable?: string;      // NET AMOUNT / Net Payable / Net Pay
}

export type RecognizedFormatType =
  | 'UNIVERSAL_ATTENDANCE_IN_OUT'
  | 'MR_REPORT'
  | 'OT_REPORT'
  | 'MANPOWER_WORKINGS_MUSTER'
  | 'COMPREHENSIVE_STATUTORY_MUSTER'
  | 'DAILY_PUNCH_LOG'
  | 'GENERIC_MUSTER';

export interface SheetAnalysisResult {
  fileName: string;
  fileType: 'EXCEL' | 'CSV';
  sheetNames: string[];
  activeSheetName: string;
  headerRowIndex: number;
  headers: string[];
  detectedHeaders: string[];
  mappedColumns: SheetHeaderMapping;
  recognizedFormat: RecognizedFormatType;

  // Data
  rows: NormalizedMusterRow[];
  totalWorkers: number;
  totalPayDays: number;
  totalRegularWages: number;
  totalOtHours: number;
  totalOtStipend: number;
  totalGrossWages: number;
  totalAllowances: number;
  totalEmployeePf: number;
  totalEmployeeEsi: number;
  totalPt: number;
  totalDeductions: number;
  totalNetPayable: number;
  totalAnomalies: number;

  // High-level warnings
  warnings: string[];

  // Multi-Sheet Domain Summary & Cross-Sheet Reconciliation
  workbookSummary?: WorkbookInspectionSummary;
  sheetParseResult?: SheetParseResult;
  qualitySummary?: DataQualitySummary;
}

/**
 * Robust token-boundary matching function
 * Prevents false positives where short acronyms like 'ot' falsely match 'total' or 'ca' matches 'canteen'
 */
function matchHeaderToken(rawHeader: string, synonyms: string[], key?: string): boolean {
  if (!rawHeader) return false;
  const hNorm = rawHeader.toLowerCase().trim();
  const hClean = hNorm.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const hTokens = hClean.split(' ');

  // Guard against cross-contamination:
  // 1. workerCode should NOT match serial numbers like 's n' or 'sl no'
  if (key === 'workerCode' && (hClean === 's n' || hClean === 'sl no' || hClean === 'sr no' || hClean === 's no')) {
    return false;
  }

  // 2. regularWages should NOT match OT Wages, Holiday Wages, Sunday Wages, or Leave Wages
  if (key === 'regularWages' && (hTokens.includes('ot') || hTokens.includes('holiday') || hTokens.includes('sunday') || hTokens.includes('leave'))) {
    return false;
  }

  for (const syn of synonyms) {
    const sNorm = syn.toLowerCase().trim();
    const sClean = sNorm.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Exact raw match (e.g. "PUNCHING NO" === "punching no", "PF 12%" === "pf 12%")
    if (hNorm === sNorm || hClean === sClean) return true;

    // 2. Token match for short acronyms like 'ot', 'ca', 'da', 'pl', 'cl', 'sl', 'pt', 'od', 'co', 'nh'
    const sTokens = sClean.split(' ');
    if (sTokens.length === 1 && sClean.length <= 4) {
      if (hTokens.includes(sClean)) return true;
      continue;
    }

    // 3. Exact word boundary regex for multi-word or longer synonyms
    const escaped = sClean.replace(/\s+/g, '\\s+');
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');
    if (regex.test(hClean)) return true;
  }
  return false;
}

/**
 * Canonical dictionary of synonyms across enterprise contractor & vendor muster sheets
 * Fully covers Image 2 & Image 3 headers
 */
const SYNONYM_DICTIONARY: Record<keyof SheetHeaderMapping, string[]> = {
  workerCode: [
    'punching no', 'punching no.', 'punching_no', 'punch no', 'punching',
    'emp id', 'emp_id', 'employee id', 'employee_id', 'empid', 'emp code', 'emp_code',
    'employee code', 'worker code', 'worker_code', 'worker id', 'staff id', 'badge no',
    'token no'
  ],
  workerName: [
    'name', 'employee name', 'worker name', 'staff name', 'emp name', 'employee_name',
    'full name', 'worker_name', 'name of worker', 'name of employee'
  ],
  department: [
    'dept', 'department', 'cost center', 'cost_center', 'section', 'unit', 'division',
    'process', 'sub dept'
  ],
  designation: [
    'designation', 'desig', 'role', 'skill level', 'category', 'trade', 'job title'
  ],

  // Daily Attendance Synonyms (IN/OUT, S1/S2, 1st/2nd Half)
  date: [
    'date', 'attendance date', 'work date', 'day', 'attendance_date', 'shift date',
    'punch date', 'duty date', 'work_date'
  ],
  shift: [
    'shift', 'shift code', 'shift name', 'duty shift', 'shift type', 'shift_id',
    'shift_code', 'shift_name', 'schedule shift'
  ],
  firstHalf: [
    '1st half', '1st_half', 'first half', 'first_half', 's1', 'session 1',
    'session1', 'am', 'fn', 'forenoon', 'session_1', 'half 1'
  ],
  secondHalf: [
    '2nd half', '2nd_half', 'second half', 'second_half', 's2', 'session 2',
    'session2', 'pm', 'an', 'afternoon', 'session_2', 'half 2'
  ],
  checkIn: [
    'in', 'in time', 'in_time', 'punch in', 'punch_in', 'time in', 'in punch',
    'check in', 'check_in', 'first in', 'in_punch', 'entry time', 'start time'
  ],
  checkOut: [
    'out', 'out time', 'out_time', 'punch out', 'punch_out', 'time out', 'out punch',
    'check out', 'check_out', 'last out', 'out_punch', 'exit time', 'end time'
  ],
  lateMinutes: [
    'late in (min)', 'late in', 'late in(min)', 'late minutes', 'late', 'late arrival',
    'late_minutes', 'late mins', 'late (min)', 'late time'
  ],
  earlyMinutes: [
    'early out (min)', 'early out', 'early out(min)', 'early minutes', 'early',
    'early departure', 'early_out_minutes', 'early mins', 'early (min)', 'early leave'
  ],
  totalHours: [
    'total hours', 'total_hours', 'worked hours', 'work hrs', 'hours worked',
    'duration', 'work hours', 'total hrs', 'hrs worked', 'tot hrs', 'regular hrs'
  ],

  payMonth: [
    'pay month', 'month', 'period', 'salary month', 'wage month'
  ],
  paidWDays: [
    'paid w.ds', 'paid w ds', 'paid wds', 'paid w.days', 'paid working days'
  ],
  workingDays: [
    'w days', 'w.days', 'working days', 'wdays', 'duty days'
  ],
  nationalHolidays: [
    'n/h', 'nh', 'national holiday', 'national holidays', 'holidays', 'n h'
  ],
  compOff: [
    'co', 'comp off', 'compensatory off', 'c off'
  ],
  onDuty: [
    'od', 'on duty', 'o d'
  ],
  sundays: [
    'sundays', 'sunday', 'sun'
  ],
  privilegeLeave: [
    'pl', 'privilege leave', 'el', 'earned leave'
  ],
  casualLeave: [
    'cl', 'casual leave'
  ],
  sickLeave: [
    'sl', 'sick leave', 'medical leave'
  ],
  payDays: [
    'pay days', 'pay day', 'payday', 'pay_days', 'paid days', 'payable days',
    'payable ds', 'payable day', 'present days', 'total days',
    'days worked', 'actual days', 'worked days', 'muster days', 'tot days'
  ],
  dailyWage: [
    'd wag', 'd wage', 'd_wag', 'd_wage', 'daily wage', 'daily wages', 'wage rate',
    'rate', 'daily rate', 'rate/day', 'per day rate', 'wage/day', 'basic rate'
  ],
  basic: [
    'basic', 'basic pay', 'basic wage', 'basic wages', 'earned basic'
  ],
  da: [
    'da', 'd.a.', 'dearness allowance', 'dearness'
  ],
  regularWages: [
    'wages', 'regular wages', 'earned wages', 'basic+da', 'wages earned', 'wages due'
  ],
  otHours: [
    'ot', 'ot hrs', 'ot hours', 'overtime hours', 'ot_hours', 'ot_hrs', 'approved ot',
    'extra hours', 'overtime'
  ],
  otStipend: [
    'ot stipend', 'ot wages', 'ot amount', 'overtime pay', 'ot pay', 'ot_stipend',
    'ot_wages', 'overtime stipend', 'overtime wages', 'ot earned', 'ot payout'
  ],
  hra: [
    'hra', 'h.r.a.', 'house rent allowance', 'house rent'
  ],
  ca: [
    'ca', 'c.a.', 'conveyance allowance', 'conveyance', 'transport allow', 'transport allowance',
    'travel allow', 'bus allow'
  ],
  foodAllowance: [
    'food/meal', 'food meal', 'food allow', 'food allowance', 'canteen allow', 'meal allow', 'mess allow'
  ],
  nightShiftAllowance: [
    'night allow', 'night shift allow', 'nsa', 'night shift', 'night allowance'
  ],
  attendanceAllowance: [
    'attendance', 'attendance allowance', 'att allow', 'attendance bonus', 'good work allowance', 'att bonus'
  ],
  holidayWages: [
    'holiday wg', 'sunday wg', 'holiday wages', 'sunday wages', 'holiday pay'
  ],
  leaveWages: [
    'leave wag', 'leave wages', 'leave pay', 'leave amount'
  ],
  roomAllowance: [
    'room allow', 'room allowance', 'room rent', 'accommodation', 'room', 'room_allow'
  ],
  productionIncentive: [
    'production', 'production all', 'production incentive', 'production bonus', 'incentive'
  ],
  medicalAllowance: [
    'medical all', 'medical allowance', 'medical'
  ],
  arrears: [
    'arrears', 'arrear', 'salary arrears', 'wage arrears'
  ],
  grossWages: [
    'gross', 'gross earn', 'gross wages', 'gross due', 'total gross', 'earned gross',
    'total earnings', 'gross earnings', 'gross amount', 'tot gross'
  ],
  pfDeduct: [
    'pf 12%', 'pf', 'pf deduct', 'epf', 'provident fund', 'employee pf', 'pf deduction',
    'pf_deduct', 'pf 12'
  ],
  esiDeduct: [
    'esi 0.75%', 'esi', 'esi deduct', 'esic', 'employee esi', 'esi deduction',
    'esi_deduct', 'esi 0.75'
  ],
  ptDeduct: [
    'profession', 'professional tax', 'prof tax', 'pt', 'p tax', 'pt deduct'
  ],
  lwfDeduct: [
    'lwf', 'labour welfare fund', 'welfare fund', 'lwf deduct'
  ],
  canteenDeduct: [
    'canteen', 'canteen deduction', 'food deduct', 'canteen charges', 'mess deduction'
  ],
  snacksDeduct: [
    'snacks', 'tea snacks', 'canteen snacks'
  ],
  rentDeduct: [
    'rent', 'room rent deduct', 'hostel rent'
  ],
  advanceDeduct: [
    'advance', 'salary advance', 'loan', 'loan deduction', 'advance deduct', 'festival advance'
  ],
  otherDeduct: [
    'others', 'other', 'other deductions', 'misc deduct'
  ],
  tdsDeduct: [
    'tds', 'tax deducted', 'income tax'
  ],
  medicalInsDeduct: [
    'medical ins', 'medical insurance', 'insurance'
  ],
  totalDeductions: [
    'total deductions', 'total dedu', 'tot ded', 'total deduction', 'tot deductions'
  ],
  netPayable: [
    'net amount', 'net payable', 'net pay', 'take home', 'in hand', 'net wages',
    'net', 'payable amount', 'final net'
  ],
};

export class UniversalAttendanceSheetEngine {
  /**
   * Parse an uploaded File (Excel .xlsx, .xls or .csv)
   */
  public static async analyzeFile(
    file: File,
    preferredSheetName?: string,
    vendorId?: string,
    companyId?: string
  ): Promise<SheetAnalysisResult> {
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    // Run multi-sheet inspection pipeline
    let workbookSummary: WorkbookInspectionSummary | undefined;
    if (!isCsv) {
      try {
        workbookSummary = await UniversalWorkbookInspector.inspectWorkbook(file);
      } catch (inspectErr) {
        console.warn('[UniversalAttendanceSheetEngine] Workbook inspection warning:', inspectErr);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const reader = (XLSX as any).readFile ? XLSX : (XLSX as any).default || XLSX;
    const workbook = reader.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: true,
      cellText: false,
    });

    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      throw new Error('The uploaded spreadsheet contains no readable sheets.');
    }

    // Determine target sheet
    let activeSheet = preferredSheetName && sheetNames.includes(preferredSheetName)
      ? preferredSheetName
      : this.detectPrimarySheet(sheetNames);

    const worksheet = workbook.Sheets[activeSheet];
    if (!worksheet) {
      activeSheet = sheetNames[0];
    }

    // If dedicated sheet parser already produced clean domain data, return it
    if (workbookSummary && workbookSummary.sheets[activeSheet]) {
      const parsedSheet = workbookSummary.sheets[activeSheet];
      const result = this.convertParsedSheetToAnalysisResult(
        parsedSheet,
        file.name,
        sheetNames,
        activeSheet,
        workbookSummary
      );
      return result;
    }

    const result = this.analyzeWorksheet(
      workbook.Sheets[activeSheet],
      file.name,
      isCsv ? 'CSV' : 'EXCEL',
      sheetNames,
      activeSheet,
      vendorId,
      companyId
    );
    result.workbookSummary = workbookSummary;
    return result;
  }

  /**
   * Instantly switch to another sheet in a multi-sheet workbook using cached parse results (0ms lag)
   */
  public static switchSheetFromSummary(
    workbookSummary: WorkbookInspectionSummary,
    fileName: string,
    sheetNames: string[],
    targetSheet: string
  ): SheetAnalysisResult | null {
    if (workbookSummary && workbookSummary.sheets && workbookSummary.sheets[targetSheet]) {
      return this.convertParsedSheetToAnalysisResult(
        workbookSummary.sheets[targetSheet],
        fileName,
        sheetNames,
        targetSheet,
        workbookSummary
      );
    }
    return null;
  }

  /**
   * Converts a domain SheetParseResult into SheetAnalysisResult
   */
  private static convertParsedSheetToAnalysisResult(
    parsed: SheetParseResult,
    fileName: string,
    sheetNames: string[],
    activeSheetName: string,
    workbookSummary: WorkbookInspectionSummary
  ): SheetAnalysisResult {
    let rows: NormalizedMusterRow[] = [];
    let recognizedFormat: RecognizedFormatType = 'GENERIC_MUSTER';
    let totalWorkers = parsed.rowCount;
    let totalPayDays = 0;
    let totalRegularWages = 0;
    let totalOtHours = 0;
    let totalOtStipend = 0;
    let totalGrossWages = 0;
    let totalEmployeePf = 0;
    let totalEmployeeEsi = 0;
    let totalPt = 0;
    let totalDeductions = 0;
    let totalNetPayable = 0;

    if (parsed.classification === 'ATTENDANCE' && parsed.attendanceData) {
      recognizedFormat = 'UNIVERSAL_ATTENDANCE_IN_OUT';
      const att = parsed.attendanceData;
      totalWorkers = att.kpis.uniqueWorkers;
      totalPayDays = att.kpis.presentDays || 0;
      totalOtHours = att.kpis.totalOtHours;
      // Do NOT invent fake wages or fake PF/ESI for attendance punch files
      totalRegularWages = 0;
      totalOtStipend = 0;
      totalGrossWages = 0;
      totalEmployeePf = 0;
      totalEmployeeEsi = 0;
      totalNetPayable = 0;

      rows = att.records.map((r) => ({
        rowNumber: r.rowNumber,
        sourceRowNumber: r.sourceRowNumber,
        sourceSerialNumber: r.sourceSerialNumber,
        validationStatus: r.validationStatus,
        workerCode: r.employeeId,
        workerName: r.employeeName,
        department: r.department,
        payDays: r.firstHalf === 'P' || r.secondHalf === 'P' ? 1 : 0,
        dailyPunch: {
          date: r.date,
          shift: r.shift,
          firstHalf: r.firstHalf,
          secondHalf: r.secondHalf,
          checkIn: r.inTime || '',
          checkOut: r.outTime || '',
          lateMinutes: r.lateInMinutes || 0,
          earlyMinutes: r.earlyOutMinutes || 0,
          totalHours: parseFloat(r.totalHours || '0') || 0,
          otHours: r.otHours,
        },
        days: {
          payDays: r.firstHalf === 'P' || r.secondHalf === 'P' ? 1 : 0,
          paidWDays: 0,
          workingDays: 1,
          nationalHolidays: 0,
          compOff: 0,
          onDuty: 0,
          sundays: 0,
          paidLeaves: 0,
        },
        dailyWage: 0,
        basic: 0,
        da: 0,
        regularWages: 0,
        otHours: r.otHours,
        otStipend: 0,
        allowances: {
          hra: 0,
          ca: 0,
          transport: 0,
          food: 0,
          nightShift: 0,
          attendanceBonus: 0,
          holidaySunday: 0,
          leaveWages: 0,
          room: 0,
          production: 0,
          medical: 0,
          arrears: 0,
          other: 0,
          total: 0,
        },
        grossWages: 0,
        deductions: {
          employeePf: 0,
          employeeEsi: 0,
          professionalTax: 0,
          lwf: 0,
          canteen: 0,
          snacks: 0,
          rent: 0,
          advance: 0,
          tds: 0,
          medicalIns: 0,
          other: 0,
          total: 0,
        },
        netPayable: 0,
        anomalies: r.hasMissingPunch ? ['Missing Punch (IN without OUT or vice versa)'] : [],
        hasAnomaly: r.hasMissingPunch,
        rawRowData: {},
      }));
    } else if (parsed.classification === 'MR_REPORT' && parsed.mrData) {
      recognizedFormat = 'MR_REPORT';
      const mr = parsed.mrData;
      totalWorkers = mr.kpis.totalWorkers;
      totalPayDays = mr.kpis.totalPresentDays;
      totalOtHours = mr.kpis.totalOtHours;
      totalRegularWages = mr.kpis.totalWages || 0;
      totalGrossWages = mr.kpis.totalWages || 0;
      totalNetPayable = mr.kpis.totalWages || 0;

      rows = mr.records.map((r) => ({
        rowNumber: r.rowNumber,
        sourceRowNumber: r.sourceRowNumber,
        sourceSerialNumber: r.sourceSerialNumber,
        validationStatus: r.validationStatus,
        workerCode: r.employeeId,
        workerName: r.employeeName,
        department: r.department,
        designation: r.category,
        payDays: r.presentDays,
        days: {
          payDays: r.presentDays,
          paidWDays: r.presentDays,
          workingDays: r.presentDays,
          nationalHolidays: r.nfh,
          compOff: 0,
          onDuty: 0,
          sundays: r.weeklyOff,
          paidLeaves: r.cl + r.pl,
        },
        dailyWage: r.rate || 0,
        basic: r.wages || 0,
        da: 0,
        regularWages: r.wages || 0,
        otHours: r.otHours,
        otStipend: 0,
        allowances: {
          hra: 0,
          ca: 0,
          transport: 0,
          food: 0,
          nightShift: 0,
          attendanceBonus: 0,
          holidaySunday: 0,
          leaveWages: 0,
          room: 0,
          production: 0,
          medical: 0,
          arrears: 0,
          other: 0,
          total: 0,
        },
        grossWages: r.wages || 0,
        deductions: {
          employeePf: 0,
          employeeEsi: 0,
          professionalTax: 0,
          lwf: 0,
          canteen: 0,
          snacks: 0,
          rent: 0,
          advance: 0,
          tds: 0,
          medicalIns: 0,
          other: 0,
          total: 0,
        },
        netPayable: r.wages || 0,
        anomalies: [],
        hasAnomaly: false,
        rawRowData: {},
      }));
    } else if (parsed.classification === 'OT_REPORT' && parsed.otData) {
      recognizedFormat = 'OT_REPORT';
      const ot = parsed.otData;
      totalWorkers = ot.kpis.totalOtWorkers;
      totalOtHours = ot.kpis.totalOtHours;
      totalPayDays = 0; // OT sheet does NOT contain pay days
      totalRegularWages = 0;
      totalOtStipend = 0;
      totalGrossWages = 0;
      totalNetPayable = 0;

      rows = ot.records.map((r) => ({
        rowNumber: r.rowNumber,
        sourceRowNumber: r.sourceRowNumber,
        sourceSerialNumber: r.sourceSerialNumber,
        validationStatus: r.validationStatus,
        workerCode: r.employeeId,
        workerName: r.employeeName,
        department: r.department,
        designation: r.category,
        payDays: 0,
        days: {
          payDays: 0,
          paidWDays: 0,
          workingDays: 0,
          nationalHolidays: 0,
          compOff: 0,
          onDuty: 0,
          sundays: 0,
          paidLeaves: 0,
        },
        dailyWage: 0,
        basic: 0,
        da: 0,
        regularWages: 0,
        otHours: r.totalOtHours,
        otStipend: 0,
        allowances: {
          hra: 0,
          ca: 0,
          transport: 0,
          food: 0,
          nightShift: 0,
          attendanceBonus: 0,
          holidaySunday: 0,
          leaveWages: 0,
          room: 0,
          production: 0,
          medical: 0,
          arrears: 0,
          other: 0,
          total: 0,
        },
        grossWages: 0,
        deductions: {
          employeePf: 0,
          employeeEsi: 0,
          professionalTax: 0,
          lwf: 0,
          canteen: 0,
          snacks: 0,
          rent: 0,
          advance: 0,
          tds: 0,
          medicalIns: 0,
          other: 0,
          total: 0,
        },
        netPayable: 0,
        anomalies: [],
        hasAnomaly: false,
        rawRowData: {},
      }));
    }

    const colMapKeys: SheetHeaderMapping = {};
    Object.entries(parsed.mappedColumns).forEach(([k, v]) => {
      colMapKeys[k as keyof SheetHeaderMapping] = v;
    });

    return {
      fileName,
      fileType: 'EXCEL',
      sheetNames,
      activeSheetName,
      headerRowIndex: parsed.headerRowIndex,
      headers: parsed.rawHeaders,
      detectedHeaders: parsed.rawHeaders,
      mappedColumns: colMapKeys,
      recognizedFormat,
      rows,
      totalWorkers,
      totalPayDays,
      totalRegularWages,
      totalOtHours,
      totalOtStipend,
      totalGrossWages,
      totalAllowances: 0,
      totalEmployeePf,
      totalEmployeeEsi,
      totalPt,
      totalDeductions,
      totalNetPayable,
      totalAnomalies: parsed.anomaliesCount,
      warnings: parsed.warnings,
      workbookSummary,
      sheetParseResult: parsed,
      qualitySummary: parsed.qualitySummary,
    };
  }

  /**
   * Automatically detect the most likely master sheet (e.g. "Workings", "Allowance", "Muster", "Attendance")
   */
  private static detectPrimarySheet(sheetNames: string[]): string {
    const priorityKeywords = ['workings', 'working', 'muster', 'attendance', 'wages', 'payroll', 'summary', 'data', 'sheet1'];
    for (const kw of priorityKeywords) {
      const match = sheetNames.find((s) => s.toLowerCase().includes(kw));
      if (match) return match;
    }
    return sheetNames[0];
  }

  /**
   * Process and analyze an XLSX Worksheet
   */
  public static analyzeWorksheet(
    worksheet: XLSX.WorkSheet,
    fileName: string,
    fileType: 'EXCEL' | 'CSV',
    sheetNames: string[],
    activeSheetName: string,
    vendorId?: string,
    companyId?: string
  ): SheetAnalysisResult {
    // Convert to 2D array of rows
    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawMatrix || rawMatrix.length === 0) {
      throw new Error(`Sheet "${activeSheetName}" appears to be empty.`);
    }

    // Find the header row by keyword density (scanning rows 0 to 12)
    const { headerRowIndex, headers, mappedColumns, matchScore } = this.locateHeaderRow(rawMatrix, vendorId, companyId);

    if (matchScore === 0) {
      throw new Error(`Unable to recognize standard attendance or wage headers in sheet "${activeSheetName}". Please ensure headers like Worker ID, Name, Days, or Wages are present.`);
    }

    // Classify format style
    let recognizedFormat: RecognizedFormatType = 'GENERIC_MUSTER';
    if (mappedColumns.firstHalf || mappedColumns.secondHalf || (mappedColumns.checkIn && mappedColumns.checkOut)) {
      recognizedFormat = 'UNIVERSAL_ATTENDANCE_IN_OUT';
    } else if (mappedColumns.dailyWage && mappedColumns.payDays && (mappedColumns.otStipend || mappedColumns.regularWages)) {
      recognizedFormat = 'MANPOWER_WORKINGS_MUSTER'; // Image 2 style
    } else if (mappedColumns.basic || mappedColumns.grossWages || mappedColumns.totalDeductions || mappedColumns.netPayable) {
      recognizedFormat = 'COMPREHENSIVE_STATUTORY_MUSTER'; // Image 3 style
    } else if (mappedColumns.workerCode && (headers.some(h => h.toLowerCase().includes('in') || h.toLowerCase().includes('out')))) {
      recognizedFormat = 'DAILY_PUNCH_LOG'; // Daily Shift punch log
    }

    // Parse data rows
    const rows: NormalizedMusterRow[] = [];
    let totalPayDays = 0;
    let totalRegularWages = 0;
    let totalOtHours = 0;
    let totalOtStipend = 0;
    let totalGrossWages = 0;
    let totalAllowances = 0;
    let totalEmployeePf = 0;
    let totalEmployeeEsi = 0;
    let totalPt = 0;
    let totalDeductionsSum = 0;
    let totalNetPayable = 0;
    let totalAnomalies = 0;
    const warnings: string[] = [];

    // Helper map of normalized field to column index
    const colIdxMap = new Map<keyof SheetHeaderMapping, number>();
    Object.entries(mappedColumns).forEach(([field, headerName]) => {
      const idx = headers.indexOf(headerName as string);
      if (idx !== -1) colIdxMap.set(field as keyof SheetHeaderMapping, idx);
    });

    for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
      const rawRow = rawMatrix[r];
      if (!rawRow || rawRow.length === 0) continue;

      // Extract worker code or check for summary/total rows
      const firstColVal = String(rawRow[0] || '').trim().toLowerCase();
      const secondColVal = String(rawRow[1] || '').trim().toLowerCase();
      if (
        firstColVal.includes('total') || firstColVal.includes('grand total') || firstColVal.includes('summary') ||
        secondColVal.includes('total') || secondColVal.includes('grand total')
      ) {
        continue; // Skip footer totals
      }

      const getVal = (field: keyof SheetHeaderMapping): any => {
        const idx = colIdxMap.get(field);
        return idx !== undefined ? rawRow[idx] : undefined;
      };

      const getNum = (field: keyof SheetHeaderMapping, fallback = 0): number => {
        const val = getVal(field);
        if (val === undefined || val === null || val === '') return fallback;
        const cleaned = String(val).replace(/[^0-9.-]/g, '');
        const n = parseFloat(cleaned);
        return isNaN(n) ? fallback : n;
      };

      const workerCode = String(getVal('workerCode') || rawRow[0] || `VNW-${r}`).trim();
      const workerName = String(getVal('workerName') || rawRow[1] || `Worker ${r}`).trim();

      // If both code and name are essentially blank or numerical zeros, skip
      if (!workerCode && !workerName) continue;
      if (workerCode.toLowerCase() === 'total' || workerName.toLowerCase() === 'total') continue;

      const department = String(getVal('department') || 'Operations').trim();
      const designation = getVal('designation') ? String(getVal('designation')).trim() : undefined;
      const payMonth = getVal('payMonth') ? String(getVal('payMonth')).trim() : undefined;

      // Parse Daily Attendance Punch attributes if available
      let dailyPunch: DailyPunchDetails | undefined;
      const s1 = String(getVal('firstHalf') || '').trim();
      const s2 = String(getVal('secondHalf') || '').trim();
      const checkInVal = String(getVal('checkIn') || '').trim();
      const checkOutVal = String(getVal('checkOut') || '').trim();
      const dateVal = String(getVal('date') || '').trim();
      const shiftVal = String(getVal('shift') || 'GENERAL').trim();

      if (s1 || s2 || checkInVal || checkOutVal || dateVal) {
        dailyPunch = {
          date: dateVal,
          shift: shiftVal,
          firstHalf: s1,
          secondHalf: s2,
          checkIn: checkInVal,
          checkOut: checkOutVal,
          lateMinutes: getNum('lateMinutes', 0),
          earlyMinutes: getNum('earlyMinutes', 0),
          totalHours: getNum('totalHours', 0),
          otHours: getNum('otHours', 0),
        };
      }

      // Calculate pay days
      let payDays = getNum('payDays', 0);
      if (payDays === 0 && dailyPunch) {
        const isPresentHalf = (s: string) => {
          const u = s.toUpperCase();
          return u === 'P' || u === 'PRESENT' || u === 'WP' || u === 'OD' || u === 'WFH';
        };
        if (isPresentHalf(dailyPunch.firstHalf)) payDays += 0.5;
        if (isPresentHalf(dailyPunch.secondHalf)) payDays += 0.5;
        if (payDays === 0 && (dailyPunch.checkIn || dailyPunch.checkOut)) {
          payDays = 1.0;
        }
      }

      // Days breakdown
      const paidWDays = getNum('paidWDays', 0);
      const workingDays = getNum('workingDays', 0);
      const nationalHolidays = getNum('nationalHolidays', 0);
      const compOff = getNum('compOff', 0);
      const onDuty = getNum('onDuty', 0);
      const sundays = getNum('sundays', 0);
      const pl = getNum('privilegeLeave', 0);
      const cl = getNum('casualLeave', 0);
      const sl = getNum('sickLeave', 0);
      const paidLeaves = pl + cl + sl;

      if (payDays === 0) {
        payDays = paidWDays || workingDays || (workingDays + nationalHolidays + sundays + paidLeaves) || 0;
      }

      // Base wage metrics
      const dailyWage = getNum('dailyWage', 620);
      const basic = getNum('basic', 0);
      const da = getNum('da', 0);
      let regularWages = getNum('regularWages', 0);
      if (regularWages === 0) {
        if (basic + da > 0) {
          regularWages = basic + da;
        } else if (payDays > 0 && dailyWage > 0) {
          regularWages = Math.round(payDays * dailyWage);
        }
      }

      // Overtime
      const otHours = getNum('otHours', 0);
      let otStipend = getNum('otStipend', 0);
      if (otStipend === 0 && otHours > 0 && dailyWage > 0) {
        otStipend = Math.round((dailyWage / 8) * otHours);
      }

      // Detailed Allowances
      const hra = getNum('hra', 0);
      const ca = getNum('ca', 0);
      const food = getNum('foodAllowance', 0);
      const nightShift = getNum('nightShiftAllowance', 0);
      const attBonus = getNum('attendanceAllowance', 0);
      const holidaySunday = getNum('holidayWages', 0);
      const leaveWages = getNum('leaveWages', 0);
      const room = getNum('roomAllowance', 0);
      const production = getNum('productionIncentive', 0);
      const medical = getNum('medicalAllowance', 0);
      const arrears = getNum('arrears', 0);
      const otherAllow = 0;

      const totAllowances =
        hra + ca + food + nightShift + attBonus + holidaySunday + leaveWages + room + production + medical + arrears + otherAllow;

      let grossWages = getNum('grossWages', 0);
      if (grossWages === 0) {
        grossWages = regularWages + otStipend + totAllowances;
      }

      // Detailed Deductions
      let pfDeduct = getNum('pfDeduct', 0);
      if (pfDeduct === 0 && regularWages > 0) {
        pfDeduct = Math.round(regularWages * 0.12);
      }

      let esiDeduct = getNum('esiDeduct', 0);
      if (esiDeduct === 0 && grossWages > 0) {
        esiDeduct = Math.ceil(grossWages * 0.0075);
      }

      const ptDeduct = getNum('ptDeduct', 0);
      const lwfDeduct = getNum('lwfDeduct', 0);
      const canteenDeduct = getNum('canteenDeduct', 0);
      const snacksDeduct = getNum('snacksDeduct', 0);
      const rentDeduct = getNum('rentDeduct', 0);
      const advanceDeduct = getNum('advanceDeduct', 0);
      const tdsDeduct = getNum('tdsDeduct', 0);
      const medicalInsDeduct = getNum('medicalInsDeduct', 0);
      const otherDeduct = getNum('otherDeduct', 0);

      let totalDeductions = getNum('totalDeductions', 0);
      if (totalDeductions === 0) {
        totalDeductions =
          pfDeduct +
          esiDeduct +
          ptDeduct +
          lwfDeduct +
          canteenDeduct +
          snacksDeduct +
          rentDeduct +
          advanceDeduct +
          tdsDeduct +
          medicalInsDeduct +
          otherDeduct;
      }

      let netPayable = getNum('netPayable', 0);
      if (netPayable === 0) {
        netPayable = grossWages - totalDeductions;
      }

      // Mathematical Anomaly Auditing
      const anomalies: string[] = [];
      const expectedRegWages = Math.round(dailyWage * payDays);
      if (dailyWage > 0 && payDays > 0 && regularWages > 0 && Math.abs(regularWages - expectedRegWages) > 2) {
        anomalies.push(`Wages (₹${regularWages}) differs from Rate × Days (₹${expectedRegWages})`);
      }

      const expectedGross = regularWages + otStipend + totAllowances;
      if (grossWages > 0 && Math.abs(grossWages - expectedGross) > 2) {
        anomalies.push(`Gross (₹${grossWages}) differs from Sum of Wages+OT+Allowances (₹${expectedGross})`);
      }

      const expectedNet = grossWages - totalDeductions;
      if (netPayable > 0 && Math.abs(netPayable - expectedNet) > 2) {
        anomalies.push(`Net (₹${netPayable}) differs from Gross - Deductions (₹${expectedNet})`);
      }

      if (anomalies.length > 0) totalAnomalies++;

      // Row raw record for full transparency
      const rawRowData: Record<string, any> = {};
      headers.forEach((h, hIdx) => {
        rawRowData[h] = rawRow[hIdx];
      });

      rows.push({
        rowNumber: r + 1,
        workerCode,
        workerName,
        department,
        designation,
        payMonth,
        payDays,
        days: {
          payDays,
          paidWDays,
          workingDays,
          nationalHolidays,
          compOff,
          onDuty,
          sundays,
          paidLeaves,
        },
        dailyWage,
        basic,
        da,
        regularWages,
        otHours,
        otStipend,
        allowances: {
          hra,
          ca,
          transport: ca,
          food,
          nightShift,
          attendanceBonus: attBonus,
          holidaySunday,
          leaveWages,
          room,
          production,
          medical,
          arrears,
          other: otherAllow,
          total: totAllowances,
        },
        grossWages,
        deductions: {
          employeePf: pfDeduct,
          employeeEsi: esiDeduct,
          professionalTax: ptDeduct,
          lwf: lwfDeduct,
          canteen: canteenDeduct,
          snacks: snacksDeduct,
          rent: rentDeduct,
          advance: advanceDeduct,
          tds: tdsDeduct,
          medicalIns: medicalInsDeduct,
          other: otherDeduct,
          total: totalDeductions,
        },
        netPayable,
        anomalies,
        hasAnomaly: anomalies.length > 0,
        rawRowData,
      });

      // Accumulate totals
      totalPayDays += payDays;
      totalRegularWages += regularWages;
      totalOtHours += otHours;
      totalOtStipend += otStipend;
      totalGrossWages += grossWages;
      totalAllowances += totAllowances;
      totalEmployeePf += pfDeduct;
      totalEmployeeEsi += esiDeduct;
      totalPt += ptDeduct;
      totalDeductionsSum += totalDeductions;
      totalNetPayable += netPayable;
    }

    if (totalAnomalies > 0) {
      warnings.push(`Detected ${totalAnomalies} rows with calculation variances. Please inspect the highlighted rows before finalizing.`);
    }

    return {
      fileName,
      fileType,
      sheetNames,
      activeSheetName,
      headerRowIndex,
      headers,
      detectedHeaders: headers,
      mappedColumns,
      recognizedFormat,
      rows,
      totalWorkers: rows.length,
      totalPayDays: Math.round(totalPayDays * 10) / 10,
      totalRegularWages: Math.round(totalRegularWages * 100) / 100,
      totalOtHours: Math.round(totalOtHours * 10) / 10,
      totalOtStipend: Math.round(totalOtStipend * 100) / 100,
      totalGrossWages: Math.round(totalGrossWages * 100) / 100,
      totalAllowances: Math.round(totalAllowances * 100) / 100,
      totalEmployeePf: Math.round(totalEmployeePf * 100) / 100,
      totalEmployeeEsi: Math.round(totalEmployeeEsi * 100) / 100,
      totalPt: Math.round(totalPt * 100) / 100,
      totalDeductions: Math.round(totalDeductionsSum * 100) / 100,
      totalNetPayable: Math.round(totalNetPayable * 100) / 100,
      totalAnomalies,
      warnings,
    };
  }

  /**
   * Scans rows 0 through 12 to find the row with maximum matching keywords using token boundaries
   */
  private static locateHeaderRow(matrix: any[][], vendorId?: string, companyId?: string): {
    headerRowIndex: number;
    headers: string[];
    mappedColumns: SheetHeaderMapping;
    matchScore: number;
  } {
    let bestRowIdx = 0;
    let bestScore = 0;
    let bestMapping: SheetHeaderMapping = {};
    let bestHeaders: string[] = [];

    const maxSearchRow = Math.min(matrix.length, 12);

    for (let r = 0; r < maxSearchRow; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      const stringHeaders = row.map((cell) => String(cell || '').trim());
      const mapping: SheetHeaderMapping = {};
      let score = 0;

      // Check vendor custom mapping profile first
      if (vendorId) {
        const custom = VendorMappingProfileService.getActiveMappingsForVendor(vendorId, companyId);
        Object.entries(custom).forEach(([rawH, canonField]) => {
          const found = stringHeaders.find(h => h.toLowerCase().trim() === rawH.toLowerCase().trim());
          if (found) {
            mapping[canonField as keyof SheetHeaderMapping] = found;
            score += 5; // highest confidence for saved vendor mappings
          }
        });
      }

      // Check each canonical category with robust word-boundary token matching
      for (const [key, synonyms] of Object.entries(SYNONYM_DICTIONARY)) {
        if (mapping[key as keyof SheetHeaderMapping]) continue;
        const found = stringHeaders.find((h) => matchHeaderToken(h, synonyms, key));

        if (found) {
          mapping[key as keyof SheetHeaderMapping] = found;
          score += (key === 'workerCode' || key === 'workerName' || key === 'date' || key === 'firstHalf' || key === 'secondHalf' || key === 'checkIn' || key === 'checkOut' || key === 'payDays' || key === 'dailyWage' || key === 'grossWages' || key === 'netPayable') ? 3 : 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestRowIdx = r;
        bestMapping = mapping;
        bestHeaders = stringHeaders;
      }
    }

    return {
      headerRowIndex: bestRowIdx,
      headers: bestHeaders,
      mappedColumns: bestMapping,
      matchScore: bestScore,
    };
  }

  /**
   * Generates downloadable sample templates (Supports Universal IN-OUT, Workings, and Statutory Muster)
   */
  public static async generateTemplateAsync(format: 'UNIVERSAL_IN_OUT' | 'MANPOWER_WORKINGS' | 'COMPREHENSIVE_MUSTER'): Promise<{
    blob: Blob;
    fileName: string;
  }> {
    if (format === 'UNIVERSAL_IN_OUT') {
      return UniversalAttendanceTemplateService.generateTemplateWorkbook();
    }
    return this.generateTemplate(format as any);
  }
  public static generateTemplate(format: 'MANPOWER_WORKINGS' | 'COMPREHENSIVE_MUSTER'): {
    blob: Blob;
    fileName: string;
  } {
    if (format === 'MANPOWER_WORKINGS') {
      // Style from Image 2 (Joy Manpower Service Wages for the Month of July 2026)
      const data = [
        ['', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['JOY MANPOWER SERVICE WAGES FOR THE MONTH OF JULY 2026'],
        ['S N', 'PUNCHING NO', 'NAME', 'DEPT', 'D WAG', 'PAY DAYS', 'Wages', 'OT', 'OT STIPEND', 'GROSS', 'PF 12%', 'ESI 0.75%', 'NET AMOUNT'],
        [1, 'AJ001', 'LALHRIA TPULA', 'BCM', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [2, 'AJ002', 'RANJIT MUHTO', 'FO', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [3, 'AJ003', 'RAM VIJAY KUMAR', 'BCM', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [4, 'AJ004', 'AKURAI', 'BCM', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [5, 'AJ005', 'CHHOTELAL SOREN', 'FO', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [6, 'AJ006', 'INDRAJIT REANG', 'FO', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [7, 'AJ007', 'UDAI RAM REANG', 'BCM', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [8, 'AJ008', 'KARAN HEMBRAM', 'BCM', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [9, 'AJ009', 'RAKESH SOREN', 'BCM', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [10, 'AJ010', 'BASUDEV SOREN', 'BCM', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [11, 'AJ011', 'CHAKBE JOY RENGA', 'FO', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [12, 'AJ012', 'PRAMOD PRASAD', 'PP3', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [13, 'AJ013', 'DHIRAM MAHALI', 'PP3', 620, 3.5, 2170, 15, 1163, 3333, 260, 17, 3056],
        [14, 'AJ014', 'MAHADEV MURMA', 'PP3', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [15, 'AJ015', 'SUNIL MARANDI', 'HERBAL', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [16, 'AJ016', 'SARVAN KUMAR', 'PP3', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [17, 'AJ017', 'SUNIL TUDU', 'PP3', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
        [18, 'AJ018', 'AYUSH PASWAN', 'HERBAL', 620, 2.0, 1240, 7, 543, 1783, 149, 10, 1624],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();

      // Set up workbook sheets like Image 2: INVOICE, Breakup, Workings, Allowance
      const wsInvoice = XLSX.utils.aoa_to_sheet([
        ['INVOICE SUMMARY — JOY MANPOWER SERVICES'],
        ['Invoice Period', 'JULY 2026'],
        ['Total Deployed Staff', 18],
        ['Gross Wages', 73474],
        ['Service Charge @ 8%', 5877.92],
        ['GST @ 18%', 14283.35],
        ['Total Invoice Amount', 93635.27],
      ]);

      const wsBreakup = XLSX.utils.aoa_to_sheet([
        ['DEPARTMENT-WISE BREAKUP'],
        ['Department', 'Staff Count', 'Total Wages', 'OT Hours'],
        ['BCM', 8, 22320, 152],
        ['FO', 4, 11160, 76],
        ['PP3', 4, 10540, 72],
        ['HERBAL', 2, 4030, 26],
      ]);

      const allowanceData = [
        ['S N', 'PUNCHING NO', 'NAME', 'DEPT', 'WORKING DAYS', 'ROOM ALLOWANCE (₹50/day)', 'TRANSPORT ALLOWANCE (₹30/day)', 'TOTAL ALLOWANCE'],
        [1, 'AJ001', 'LALHRIA TPULA', 'BCM', 4.5, 225, 135, 360],
        [2, 'AJ002', 'RANJIT MUHTO', 'FO', 4.5, 225, 135, 360],
        [3, 'AJ003', 'RAM VIJAY KUMAR', 'BCM', 4.5, 225, 135, 360],
      ];
      const wsAllow = XLSX.utils.aoa_to_sheet(allowanceData);

      XLSX.utils.book_append_sheet(wb, wsInvoice, 'INVOICE');
      XLSX.utils.book_append_sheet(wb, wsBreakup, 'Breakup');
      XLSX.utils.book_append_sheet(wb, ws, 'Workings');
      XLSX.utils.book_append_sheet(wb, wsAllow, 'Allowance');

      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return {
        blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        fileName: 'joy_manpower_wages_workings_template.xlsx',
      };
    } else {
      // Style from Image 3 (Enterprise Multi-Column Statutory Muster)
      const data = [
        [
          'Sl no', 'Emp ID', 'Name', 'Pay Month', 'Paid W.Ds', 'W Days', 'N/H', 'CO', 'OD', 'Sundays', 'PL', 'CL', 'SL',
          'Payable Ds', 'Basic', 'DA', 'HRA', 'CA', 'Food/Meal', 'Night Allow', 'OT Hrs', 'OT Wages',
          'Attendance', 'Arrears', 'Holiday Wg', 'Sunday Wg', 'Leave Wag', 'Room Allow', 'Production', 'Medical All',
          'Gross Earn', 'PF Deduct', 'ESI Deduct', 'Profession', 'LWF', 'Canteen', 'Snacks', 'Rent', 'Advance', 'Others', 'TDS', 'Medical Ins',
          'Total Dedu', 'Net Payable'
        ],
        [
          1, 'EMP001', 'Murugan Perumal', '2026-08', 22, 22, 1, 0, 0, 4, 1, 0, 0,
          26, 16900, 0, 0, 1000, 500, 400, 16, 1300,
          500, 0, 0, 0, 0, 1300, 0, 0,
          21900, 2028, 165, 200, 20, 600, 0, 0, 0, 0, 0, 0,
          3013, 18887
        ],
        [
          2, 'EMP002', 'Anand Kumar', '2026-08', 21, 21, 1, 0, 0, 4, 0, 0, 0,
          26, 16120, 0, 0, 1000, 500, 0, 12, 975,
          500, 0, 0, 0, 0, 1300, 0, 0,
          20395, 1934, 153, 200, 20, 500, 0, 0, 0, 0, 0, 0,
          2807, 17588
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Statutory Muster');

      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return {
        blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        fileName: 'statutory_wage_muster_template.xlsx',
      };
    }
  }
}
