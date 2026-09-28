// src/services/vendor/universalSheetParsers/index.ts
// ============================================================================
// Joy PeopleHR — Master Multi-Sheet Workbook Inspector & Orchestrator
// Analyzes every worksheet independently, classifies, validates, and reconciles
// ============================================================================

import * as XLSX from 'xlsx';
import {
  WorkbookInspectionSummary,
  SheetParseResult,
  SheetClassification,
} from './types';
import { AttendanceParser } from './attendanceParser';
import { MRReportParser } from './mrReportParser';
import { OTReportParser } from './otReportParser';
import { ReconciliationEngine } from './reconciliationEngine';

export * from './types';
export * from './attendanceParser';
export * from './mrReportParser';
export * from './otReportParser';
export * from './reconciliationEngine';

export class UniversalWorkbookInspector {
  /**
   * Inspects and parses an uploaded workbook across all constituent worksheets
   */
  public static async inspectWorkbook(file: File): Promise<WorkbookInspectionSummary> {
    const arrayBuffer = await file.arrayBuffer();
    const reader = (XLSX as any).readFile ? XLSX : (XLSX as any).default || XLSX;
    const wb = reader.read(arrayBuffer, {
      type: 'array',
      cellDates: false, // keep raw serials or strings for precision
      cellNF: true,
      cellText: false,
    });

    const sheetNames = wb.SheetNames || [];
    if (sheetNames.length === 0) {
      throw new Error('The uploaded file does not contain any readable sheets.');
    }

    const sheets: Record<string, SheetParseResult> = {};

    for (const sheetName of sheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      const matrix: any[][] = reader.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!matrix || matrix.length === 0) continue;

      const classification = this.classifySheet(sheetName, matrix);

      let parsed: SheetParseResult;
      switch (classification) {
        case 'ATTENDANCE':
          parsed = AttendanceParser.parse(matrix, sheetName);
          break;
        case 'MR_REPORT':
          parsed = MRReportParser.parse(matrix, sheetName);
          break;
        case 'OT_REPORT':
          parsed = OTReportParser.parse(matrix, sheetName);
          break;
        default:
          // Default to Attendance or MR based on keywords
          parsed = AttendanceParser.parse(matrix, sheetName);
          break;
      }

      sheets[sheetName] = parsed;
    }

    // Run cross-sheet 3-way reconciliation
    const reconciliation = ReconciliationEngine.reconcile(sheets);

    return {
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      sheetNames,
      sheets,
      reconciliation,
    };
  }

  /**
   * Classify sheet by both Sheet Name and Header/Content Fingerprint
   */
  public static classifySheet(sheetName: string, matrix: any[][]): SheetClassification {
    const sName = sheetName.toLowerCase().trim();

    // 1. Sheet name high-confidence heuristics
    if (sName.includes('in&out') || sName.includes('in_out') || sName.includes('in & out') || sName.includes('punch')) {
      return 'ATTENDANCE';
    }
    if (sName.includes('mr report') || sName.includes('mr') || sName.includes('muster')) {
      return 'MR_REPORT';
    }
    if (sName === 'ot' || sName.includes('overtime') || sName.includes('over time')) {
      return 'OT_REPORT';
    }

    // 2. Content fingerprint scanning top 10 rows
    const searchLimit = Math.min(matrix.length, 10);
    let hasPunchHeaders = false;
    let hasMrHeaders = false;
    let hasOtMatrixHeaders = false;

    for (let r = 0; r < searchLimit; r++) {
      const row = matrix[r] || [];
      const rowStr = row.map((c: any) => String(c || '').trim().toLowerCase()).join(' ');

      if (rowStr.includes('s1') && rowStr.includes('s2') && (rowStr.includes('in') || rowStr.includes('total hours'))) {
        hasPunchHeaders = true;
      }
      if (rowStr.includes('present days') || (rowStr.includes('w/off') && rowStr.includes('shifts'))) {
        hasMrHeaders = true;
      }
      if (rowStr.includes('total ot hr') || (rowStr.includes('emp id') && row.some((c: any) => /^\d{1,2}$/.test(String(c))))) {
        hasOtMatrixHeaders = true;
      }
    }

    if (hasPunchHeaders) return 'ATTENDANCE';
    if (hasMrHeaders) return 'MR_REPORT';
    if (hasOtMatrixHeaders) return 'OT_REPORT';

    return 'ATTENDANCE';
  }
}

export { UniversalWorkbookInspector as UniversalworkbookInspector };

