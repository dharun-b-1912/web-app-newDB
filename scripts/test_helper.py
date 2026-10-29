import os

def generate_excel_code(is_edge_function=True):
    import_line = 'import ExcelJS from "https://esm.sh/exceljs@4.4.0";' if is_edge_function else 'import ExcelJS from "exceljs";'
    helpers_import = '''import {
  AttendanceReportRow,
  AttendanceExportOptions,
  ClassifiedPunchEvent,
  computeEmployeeOvertime,
  formatDeviationDuration,
  formatMinutesToHoursStr,
  formatTo12HourTime,
  resolveEmploymentSourceLabel,
} from "./reportHelpers.ts";''' if is_edge_function else '''// Uses AttendanceReportRow, AttendanceExportOptions from local types'''

    code = f'''// {"supabase/functions/attendance-report-dispatcher/excelGenerator.ts" if is_edge_function else "src/services/attendance/attendanceReportExportService.ts (Excel section)"}
// ============================================================================
// Joy PeopleHR Enterprise — Multi-Format Executive MIS Excel Workbook Generator
// Distinct, Fully-Styled Workbooks for:
// 1. Daily Attendance MIS (7 Sheets: Dashboard, Turnout, Absentees, Ledger, Deviations, Punches, DoD)
// 2. Weekly HR Intelligence MIS (6 Sheets: Summary, 7-Day Trend, Rep Late, Rep Absences, OT Dist, Master Ledger)
// 3. Monthly Workforce Governance MIS (6 Sheets: Governance, Headcount Mvt, Turnout, Statutory 20h OT, Dept Analytics, Monthly Ledger)
// Multi-Tenant SaaS • Executive Palettes • Auto-Fitted Columns • Complete Parity
// ============================================================================

{import_line}
'''
    return code

print("Helper ready")
