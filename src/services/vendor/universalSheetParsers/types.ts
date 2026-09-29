    // src/services/vendor/universalSheetParsers/types.ts
// ============================================================================
// Joy PeopleHR — Universal Multi-Sheet Attendance / MR / OT Ingestion Types
// Strict deterministic domain models separating Raw Source, Normalized, and Reconciled
// ============================================================================

export type SheetClassification =
  | 'ATTENDANCE'       // Daily punch logs, IN/OUT, S1/S2 (1st/2nd half)
  | 'MR_REPORT'        // Monthly Muster Roll, Present Days, NFH, W/Off, Leaves, Shifts
  | 'OT_REPORT'        // Overtime matrix or log (Employee × Date)
  | 'WAGE_MUSTER'      // Manpower Workings / Statutory Wage Billing
  | 'GENERIC';

export type ValueProvenance = 'SOURCE' | 'CALCULATED' | 'DERIVED' | 'MAPPED' | 'UNAVAILABLE';

export interface SerialGap {
  missingSerial: number;
  afterRow: number;
  afterSerial: number;
  beforeRow: number;
  beforeSerial: number;
  description: string;
}

export interface DataQualitySummary {
  sourceRowCount: number;       // Physical employee/attendance rows present in source sheet
  uniqueEmployeeCount: number;  // Distinct valid normalized employee IDs
  validMappedCount: number;     // Successfully mapped to workforce records
  duplicateCount: number;       // Duplicate employee rows
  warningCount: number;         // Warning records
  errorCount: number;           // Blocking errors (e.g. missing employee ID)
  serialGaps: SerialGap[];      // Gaps detected in S.No sequence
  minSerial?: number | null;
  maxSerial?: number | null;
}

export function normalizeEmployeeId(raw: any): string {
  if (raw === null || raw === undefined) return '';
  let str = String(raw).trim();
  str = str.replace(/[\u200B-\u200D\uFEFF]/g, '');
  return str;
}

export interface DailyAttendanceRecord {
  rowNumber: number;
  sourceRowNumber: number;        // Physical Excel row index (1-indexed)
  sourceSerialNumber?: number | null; // S.No if provided
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;            // Normalized YYYY-MM-DD or DD-MMM-YYYY
  rawDate: any;
  shift: string;
  firstHalf: string;       // Normalized from S1 / Session 1 / AM
  secondHalf: string;      // Normalized from S2 / Session 2 / PM
  inTime: string | null;
  outTime: string | null;
  lateInMinutes: number | null;
  earlyOutMinutes: number | null;
  totalHours: string | null;
  otHours: number;
  hasMissingPunch: boolean;
  validationStatus: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE' | 'UNMAPPED' | 'OUT_OF_PERIOD';
  provenance: Record<string, ValueProvenance>;
}

export interface MRReportRecord {
  rowNumber: number;
  sourceRowNumber: number;        // Physical Excel row index (1-indexed)
  sourceSerialNumber?: number | null; // S.No if provided
  employeeId: string;
  employeeName: string;
  category: string;
  department: string;
  presentDays: number;
  nfh: number;             // National & Festival Holidays
  weeklyOff: number;       // W/Off
  cl: number;              // Casual Leave
  pl: number;              // Privilege Leave
  lop: number;             // Loss of Pay
  shiftsG: number;         // General Shift
  shiftsI: number;         // Shift 1
  shiftsII: number;        // Shift 2
  shiftsIII: number;       // Shift 3
  totalShifts: number;
  otHours: number;         // Overtime hours in MR
  otGte4hDays: number;     // Days OT >= 4H
  otGte8hDays: number;     // Days OT >= 8H in W/Off
  faQualifyingDays: number; // Food Allowance qualifying days (OT >= 4H)
  faAmount: number;        // Food Allowance amount (FA days * 20 or source)
  naQualifyingDays: number; // Night/Sunday Allowance qualifying days (OT >= 8H in W-Off)
  naAmount: number;        // Night Allowance amount (NA days * 45 or source)
  uan?: string;            // Universal Account Number
  esiNumber?: string;      // ESI IP Number
  canteenDeduction?: number;
  roomAllowance?: number;
  rate: number | null;
  wages: number | null;
  hasWageData: boolean;
  validationStatus: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE' | 'UNMAPPED' | 'OUT_OF_PERIOD';
  provenance: Record<string, ValueProvenance>;
}

export interface OTMatrixRecord {
  rowNumber: number;
  sourceRowNumber: number;        // Physical Excel row index (1-indexed)
  sourceSerialNumber?: number | null; // S.No if provided
  employeeId: string;
  employeeName: string;
  category: string;
  department: string;
  subCategory?: string;
  dailyOt: Record<string, number | null>; // dateKey -> otHours (null if blank)
  totalOtHours: number;
  otGte4hCount: number;
  otDaysCount: number;
  validationStatus: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE' | 'UNMAPPED' | 'OUT_OF_PERIOD';
  provenance: Record<string, ValueProvenance>;
}

export interface WageMusterRecord {
  rowNumber: number;
  employeeId: string;
  employeeName: string;
  department: string;
  dailyWage: number;
  payDays: number;
  regularWages: number;
  otHours: number;
  otStipend: number;
  grossWages: number;
  employeePf: number;
  employeeEsi: number;
  netPayable: number;
}

export interface AttendanceSheetKPIs {
  uniqueWorkers: number;
  totalRecords: number;
  presentDays: number | null;
  totalWorkedHours: number;
  latePunches: number;
  earlyOutPunches: number;
  totalOtHours: number;
  missingPunches: number;
}

export interface MRReportKPIs {
  totalWorkers: number;
  totalPresentDays: number;
  totalWeeklyOff: number;
  totalNFH: number;
  totalPaidLeaves: number;
  totalLOP: number;
  totalShifts: number;
  totalOtHours: number;
  totalFaAmount?: number;
  totalNaAmount?: number;
  totalWages: number | null;
}

export interface OTReportKPIs {
  totalOtWorkers: number;
  totalOtHours: number;
  totalOtDays: number;
  otGte4hCount: number;
  otGte8hCount: number;
  duplicateOtCount: number;
  approvalStatus: 'VERIFIED' | 'PENDING';
}

export interface WageMusterKPIs {
  totalWorkers: number;
  totalPayDays: number;
  totalRegularWages: number;
  totalOtStipend: number;
  totalGrossWages: number;
  totalPfEsi: number;
  totalNetPayable: number;
}

export interface SheetParseResult {
  sheetName: string;
  classification: SheetClassification;
  headerRowIndex: number;
  rawHeaders: string[];
  mappedColumns: Record<string, string>;
  rowCount: number;
  attendanceData?: {
    records: DailyAttendanceRecord[];
    kpis: AttendanceSheetKPIs;
  };
  mrData?: {
    records: MRReportRecord[];
    kpis: MRReportKPIs;
  };
  otData?: {
    records: OTMatrixRecord[];
    dateHeaders: string[];
    kpis: OTReportKPIs;
  };
  wageData?: {
    records: WageMusterRecord[];
    kpis: WageMusterKPIs;
  };
  warnings: string[];
  anomaliesCount: number;
  qualitySummary?: DataQualitySummary;
}

export type ReconciliationRootCause =
  | 'VALID'
  | 'POLICY_DIFFERENCE'
  | 'SOURCE_DATA_CONFLICT'
  | 'PARSER_ERROR'
  | 'CALCULATION_ERROR'
  | 'MAPPING_ERROR'
  | 'DUPLICATE_DATA'
  | 'MISSING_DATA';

export interface InOutAttendanceBreakdown {
  biometricPresentDays: number;
  onDutyDays: number;
  weeklyOffDays: number;
  holidayDays: number;
  absentDays: number;
  totalRecords: number;
  qualifyingDays: number; // biometricPresentDays + onDutyDays
}

export interface CrossSheetReconciliationRow {
  employeeId: string;
  employeeName: string;
  department: string;
  attendanceDays: number | null;
  mrPresentDays: number | null;
  daysVariance: number;
  attendanceOtHours: number | null;
  mrOtHours: number | null;
  otMatrixHours: number | null;
  otVariance: number;
  status:
    | 'MATCHED'
    | 'PRESENT_DAY_MISMATCH'
    | 'OT_MISMATCH'
    | 'MISSING_IN_ATTENDANCE'
    | 'MISSING_IN_MR'
    | 'MISSING_IN_OT'
    | 'DUPLICATE_SOURCE';
  remarks: string;
  // Audit provenance & 4-layer diagnostic trace
  mrSourceCell?: string;
  inOutBreakdown?: InOutAttendanceBreakdown;
  rootCause: ReconciliationRootCause;
  rootCauseTitle: string;
  rootCauseDescription: string;
  recommendedAction: string;
}

export interface CrossSheetReconciliationSummary {
  totalMatched: number;
  totalDaysMismatches: number;
  totalOtMismatches: number;
  missingInAttendance: number;
  missingInMr: number;
  missingInOt: number;
  rootCauseCounts: Record<ReconciliationRootCause, number>;
  rows: CrossSheetReconciliationRow[];
}

export interface WorkbookInspectionSummary {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  sheetNames: string[];
  sheets: Record<string, SheetParseResult>;
  reconciliation: CrossSheetReconciliationSummary;
}
