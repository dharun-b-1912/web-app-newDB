// src/services/vendor/universalAttendanceTemplateService.ts
// ============================================================================
// Joy PeopleHR — Universal Attendance / IN-OUT Upload Template Generator
// Generates official 4-sheet contract workbook for Company <-> Vendor attendance ingestion
// Exactly reproduces the openpyxl template specification in TypeScript with ExcelJS
// ============================================================================

import ExcelJS from 'exceljs';

export class UniversalAttendanceTemplateService {
  /**
   * Generates the canonical Joy PeopleHR Universal Attendance IN-OUT Upload Template (.xlsx)
   */
  public static async generateTemplateWorkbook(): Promise<{
    blob: Blob;
    fileName: string;
    buffer: Uint8Array;
  }> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Joy PeopleHR';
    wb.title = 'Joy PeopleHR Universal Attendance IN-OUT Upload Template';
    wb.subject = 'Company/Vendor attendance ingestion and normalization';
    wb.created = new Date();
    wb.modified = new Date();

    const COLORS = {
      NAVY: 'FF14213D',
      GREEN: 'FF087F5B',
      LIGHT_GREEN: 'FFE8F7F1',
      BLUE: 'FFEAF2FF',
      AMBER: 'FFFFF4D6',
      RED: 'FFFDECEC',
      GRAY: 'FFF3F5F7',
      DARK_GRAY: 'FF5B6573',
      WHITE: 'FFFFFFFF',
      BORDER: 'FFD9DEE7',
    };

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: COLORS.BORDER } },
      bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
      left: { style: 'thin', color: { argb: COLORS.BORDER } },
      right: { style: 'thin', color: { argb: COLORS.BORDER } },
    };

    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'medium', color: { argb: COLORS.NAVY } },
      bottom: { style: 'medium', color: { argb: COLORS.NAVY } },
      left: { style: 'thin', color: { argb: COLORS.BORDER } },
      right: { style: 'thin', color: { argb: COLORS.BORDER } },
    };

    // Helper: Style Title
    const styleTitle = (ws: ExcelJS.Worksheet, range: string, text: string, fillHex = COLORS.NAVY) => {
      ws.mergeCells(range);
      const startCell = range.split(':')[0];
      const c = ws.getCell(startCell);
      c.value = text;
      c.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: COLORS.WHITE } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillHex } };
      c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    };

    // Helper: Style Subtitle
    const styleSubtitle = (ws: ExcelJS.Worksheet, range: string, text: string) => {
      ws.mergeCells(range);
      const startCell = range.split(':')[0];
      const c = ws.getCell(startCell);
      c.value = text;
      c.font = { name: 'Segoe UI', size: 9.5, color: { argb: COLORS.DARK_GRAY } };
      c.alignment = { wrapText: true, vertical: 'middle', indent: 1 };
    };

    // ========================================================================
    // SHEET 1: 00_README
    // ========================================================================
    const readme = wb.addWorksheet('00_README', {
      views: [{ showGridLines: false, state: 'frozen', xSplit: 0, ySplit: 4 }],
    });

    styleTitle(readme, 'A1:H1', 'Joy PeopleHR — Universal Attendance / IN-OUT Upload Template');
    styleSubtitle(
      readme,
      'A2:H2',
      'Purpose: a common upload contract for Company → Vendor attendance exchange. ' +
      'The application accepts diverse company/vendor Excel layouts and maps their headers into this canonical structure before saving attendance.'
    );
    readme.getRow(1).height = 28;
    readme.getRow(2).height = 36;

    readme.getCell('A4').value = 'UPLOAD WORKFLOW';
    readme.getCell('A4').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLORS.NAVY } };
    readme.getRow(4).height = 22;

    const workflow = [
      ['1', "Download this template or use the company's existing attendance file."],
      ['2', 'If using an existing file, the system detects the header row and matches known header synonyms.'],
      ['3', 'Map unmatched columns once; save the mapping as a company/vendor template profile.'],
      ['4', 'Validate employee ID, date, IN/OUT, shift and 1st/2nd-half values.'],
      ['5', 'Preview parsed rows and exceptions before importing.'],
      ['6', 'Only confirmed rows are written to the attendance database.'],
    ];

    workflow.forEach(([step, text], idx) => {
      const r = 5 + idx;
      readme.getCell(`A${r}`).value = step;
      readme.getCell(`A${r}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLORS.GREEN } };
      readme.getCell(`A${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
      readme.getCell(`B${r}`).value = text;
      readme.getCell(`B${r}`).font = { name: 'Segoe UI', size: 9.5 };
      readme.getCell(`B${r}`).alignment = { wrapText: true, vertical: 'middle' };
      readme.getRow(r).height = 20;
    });

    readme.getCell('A12').value = '';
    readme.getCell('A13').value = 'CANONICAL ATTENDANCE FIELDS';
    readme.getCell('A13').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: COLORS.NAVY } };
    readme.getRow(13).height = 22;

    const canonical = [
      ['Employee ID', 'Required', 'Stable employee/workman identifier used for reconciliation.'],
      ['Employee Name', 'Recommended', 'Name from the source sheet; employee master remains the source of truth.'],
      ['Department', 'Recommended', 'Department / section / cost centre if supplied.'],
      ['Date', 'Required', 'Attendance/work date (e.g. YYYY-MM-DD or 26-Aug-2026).'],
      ['Shift', 'Recommended', 'Shift code such as G1, G2, A, B, General.'],
      ['1st Half', 'Required*', 'Present/Absent/Leave/WO/Holiday etc. UI label; legacy S1 maps here.'],
      ['2nd Half', 'Required*', 'Present/Absent/Leave/WO/Holiday etc. UI label; legacy S2 maps here.'],
      ['IN', 'Required for punch files', 'First valid IN punch for the attendance date (HH:MM).'],
      ['OUT', 'Required for punch files', 'Last valid OUT punch for the attendance date (HH:MM).'],
      ['Late IN (Min)', 'Optional', 'Late arrival minutes if source already calculates it.'],
      ['Early Out (Min)', 'Optional', 'Early departure minutes if source already calculates it.'],
      ['Total Hours', 'Optional', 'Worked hours if source already calculates it; otherwise system calculates.'],
      ['OT Hours', 'Optional', 'Approved / source OT hours; must not be invented.'],
    ];

    canonical.forEach((row, idx) => {
      const r = 14 + idx;
      row.forEach((val, cIdx) => {
        const c = readme.getCell(r, cIdx + 1);
        c.value = val;
        c.font = { name: 'Segoe UI', size: 9, bold: cIdx === 0 };
        c.alignment = { wrapText: true, vertical: 'top' };
        c.border = { bottom: { style: 'thin', color: { argb: COLORS.BORDER } } };
      });
      readme.getRow(r).height = 20;
    });

    readme.getCell('A29').value = 'IMPORTANT';
    readme.getCell('A29').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF9C6500' } };
    readme.getCell('B29').value =
      'Do not rename fields in the application database to match every vendor file. ' +
      'Normalize incoming files to the canonical model. Vendor/company-specific aliases belong in the mapping profile.';
    readme.getCell('B29').font = { name: 'Segoe UI', size: 9.5, italic: true };
    readme.getCell('B29').alignment = { wrapText: true };
    readme.getRow(29).height = 28;

    readme.getColumn(1).width = 18;
    readme.getColumn(2).width = 72;
    for (let c = 3; c <= 8; c++) readme.getColumn(c).width = 18;

    // ========================================================================
    // SHEET 2: 01_Attendance_Upload (Primary Upload Sheet)
    // ========================================================================
    const ws = wb.addWorksheet('01_Attendance_Upload', {
      views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 7 }],
    });

    styleTitle(ws, 'A1:M1', 'Joy PeopleHR — Attendance Upload (IN / OUT)');
    styleSubtitle(
      ws,
      'A2:M2',
      'Enter one attendance record per employee per date. For direct punch files, IN/OUT are the primary fields. ' +
      'Legacy S1/S2 values are mapped automatically to 1st Half / 2nd Half by the import engine.'
    );
    ws.getRow(1).height = 28;
    ws.getRow(2).height = 36;
    ws.getRow(3).height = 8; // spacing

    // Metadata row (Row 4)
    const meta = [
      { col: 1, label: 'Company', valCol: 2 },
      { col: 4, label: 'Vendor', valCol: 5 },
      { col: 7, label: 'Site', valCol: 8 },
      { col: 10, label: 'Reporting Period', valCol: 11 },
    ];

    meta.forEach((m) => {
      const lCell = ws.getCell(4, m.col);
      lCell.value = m.label;
      lCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: COLORS.NAVY } };
      lCell.alignment = { vertical: 'middle', horizontal: 'left' };

      const vCell = ws.getCell(4, m.valCol);
      vCell.value = '[Enter / system populated]';
      vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GRAY } };
      vCell.font = { name: 'Segoe UI', size: 8.5, color: { argb: COLORS.DARK_GRAY } };
      vCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      vCell.border = thinBorder;
    });
    ws.getRow(4).height = 22;
    ws.getRow(5).height = 6;
    ws.getRow(6).height = 6;

    const headers = [
      'Employee ID', 'Employee Name', 'Department', 'Date', 'Shift',
      '1st Half', '2nd Half', 'IN', 'OUT', 'Late IN (Min)',
      'Early Out (Min)', 'Total Hours', 'OT Hours'
    ];
    const headerRow = 7;

    // Generate 100 blank rows ready for user data
    const blankRows: any[][] = [];
    for (let r = 8; r <= 107; r++) {
      blankRows.push([null, null, null, null, null, null, null, null, null, null, null, null, null]);
    }

    // Add Table
    ws.addTable({
      name: 'AttendanceUploadTable',
      ref: 'A7',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
      columns: headers.map((h) => ({ name: h, filterButton: true })),
      rows: blankRows,
    });

    // Style Table Header (Row 7)
    ws.getRow(headerRow).height = 32;
    for (let c = 1; c <= headers.length; c++) {
      const cell = ws.getCell(headerRow, c);
      cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: COLORS.WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = headerBorder;
    }

    // Number formats and validations on table data rows (rows 8 to 107)
    for (let r = 8; r <= 107; r++) {
      ws.getRow(r).height = 20;
      for (let c = 1; c <= 13; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { name: 'Segoe UI', size: 9 };
        cell.border = { bottom: { style: 'thin', color: { argb: COLORS.BORDER } } };
      }
      ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(r, 4).numFmt = 'dd-mmm-yyyy';
      ws.getCell(r, 4).alignment = { horizontal: 'center', vertical: 'middle' };

      // Shift list validation
      const shiftCell = ws.getCell(r, 5);
      shiftCell.alignment = { horizontal: 'center', vertical: 'middle' };
      shiftCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ["'03_Validation_Lists'!$B$2:$B$10"],
        showErrorMessage: true,
        errorTitle: 'Invalid shift',
        error: 'Choose a valid shift code from the dropdown list.',
      };

      // 1st Half validation
      const half1Cell = ws.getCell(r, 6);
      half1Cell.alignment = { horizontal: 'center', vertical: 'middle' };
      half1Cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ["'03_Validation_Lists'!$A$2:$A$8"],
        showErrorMessage: true,
        errorTitle: 'Invalid attendance status',
        error: 'Choose a valid attendance status.',
      };

      // 2nd Half validation
      const half2Cell = ws.getCell(r, 7);
      half2Cell.alignment = { horizontal: 'center', vertical: 'middle' };
      half2Cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ["'03_Validation_Lists'!$A$2:$A$8"],
        showErrorMessage: true,
        errorTitle: 'Invalid attendance status',
        error: 'Choose a valid attendance status.',
      };

      ws.getCell(r, 8).numFmt = 'hh:mm';
      ws.getCell(r, 8).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(r, 9).numFmt = 'hh:mm';
      ws.getCell(r, 9).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(r, 10).numFmt = '#,##0';
      ws.getCell(r, 10).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(r, 11).numFmt = '#,##0';
      ws.getCell(r, 11).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(r, 12).numFmt = '0.00';
      ws.getCell(r, 12).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(r, 13).numFmt = '0.00';
      ws.getCell(r, 13).alignment = { horizontal: 'right', vertical: 'middle' };

      // Decimal validation for minutes and hours (cols 10 to 13)
      for (let c = 10; c <= 13; c++) {
        ws.getCell(r, c).dataValidation = {
          type: 'decimal',
          operator: 'greaterThanOrEqual',
          allowBlank: true,
          formulae: [0],
          showErrorMessage: true,
          errorTitle: 'Invalid numeric value',
          error: 'Must be a positive decimal number.',
        };
      }
    }

    // Column widths
    const uploadWidths = [17, 28, 22, 14, 12, 14, 14, 11, 11, 15, 17, 14, 12];
    uploadWidths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });

    // Page setup
    ws.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:7',
    };
    ws.headerFooter = {
      oddFooter: '&LJoy PeopleHR • Attendance Upload&CPage &P of &N&RConfidential',
    };

    // ========================================================================
    // SHEET 3: 02_Field_Mapping (Mapping Guide & Synonym Dictionary)
    // ========================================================================
    const mapWs = wb.addWorksheet('02_Field_Mapping', {
      views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 5 }],
    });

    styleTitle(mapWs, 'A1:F1', 'Universal Header Mapping & Normalization Guide');
    styleSubtitle(
      mapWs,
      'A2:F2',
      'The import engine recognizes common company/vendor header variations and maps them to canonical Joy PeopleHR fields. ' +
      'Unmatched headers are presented to the user for one-time confirmation and saved into the vendor mapping profile.'
    );
    mapWs.getRow(1).height = 28;
    mapWs.getRow(2).height = 36;
    mapWs.getRow(3).height = 6;
    mapWs.getRow(4).height = 6;

    const mapHeaders = [
      'Canonical Field', 'Required', 'Common Source Headers / Synonyms',
      'Example Source Meaning', 'Normalization Rule', 'Confidence'
    ];
    const mapHeaderRow = 5;

    const mappingRows = [
      ['Employee ID', 'Yes', 'Employee ID; EMP ID; Emp No; Employee No; Worker ID; Code; Badge No; Card No; PUNCHING NO', '20385', 'Trim text; preserve leading zeros', 'High'],
      ['Employee Name', 'Recommended', 'Name; Employee Name; Worker Name; Staff Name; Name of Employee', 'SAKTHI S', 'Trim spaces; preserve source name', 'High'],
      ['Department', 'Recommended', 'Department; Dept; Section; Division; Cost Centre; Process', 'Assembly', 'Normalize against company master when available', 'High'],
      ['Date', 'Yes', 'Date; Attendance Date; Work Date; Day; Shift Date', '26-Aug-2026', 'Parse Excel date / recognized date text', 'High'],
      ['Shift', 'Recommended', 'Shift; Shift Code; Shift Name; Duty Shift; Shift Type', 'G1', 'Trim and map to shift master (General, G1, C1, etc.)', 'High'],
      ['1st Half', 'Conditional', 'S1; Session 1; First Half; 1st Half; AM; FN', 'P', 'Map status codes through status dictionary (P, A, WO, H)', 'High'],
      ['2nd Half', 'Conditional', 'S2; Session 2; Second Half; 2nd Half; PM; AN', 'P', 'Map status codes through status dictionary (P, A, WO, H)', 'High'],
      ['IN', 'Conditional', 'IN; In Time; Punch In; Time In; In Punch; Check In; First In', '08:58', 'Parse time (HH:MM); retain original value in audit log', 'High'],
      ['OUT', 'Conditional', 'OUT; Out Time; Punch Out; Time Out; Out Punch; Check Out; Last Out', '17:36', 'Parse time (HH:MM); retain original value in audit log', 'High'],
      ['Late IN (Min)', 'Optional', 'Late IN; Late In(Min); Late Minutes; Late; Late Arrival', '0', 'Numeric minutes arrival variance', 'High'],
      ['Early Out (Min)', 'Optional', 'Early Out; Early Out(Min); Early Minutes; Early; Early Dep', '0', 'Numeric minutes early departure variance', 'High'],
      ['Total Hours', 'Optional', 'Total Hours; Worked Hours; Work Hrs; Hours Worked; Duration', '08:38', 'Parse duration; normalize to decimal hours internally', 'High'],
      ['OT Hours', 'Optional', 'OT; OT Hours; Overtime; Overtime Hrs; OT(Hrs); Approved OT', '4.00', 'Normalize to decimal hours; verify against shift policy', 'High'],
    ];

    mapWs.addTable({
      name: 'FieldMappingTable',
      ref: 'A5',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium4',
        showRowStripes: true,
      },
      columns: mapHeaders.map((h) => ({ name: h, filterButton: true })),
      rows: mappingRows,
    });

    mapWs.getRow(mapHeaderRow).height = 26;
    for (let c = 1; c <= mapHeaders.length; c++) {
      const cell = mapWs.getCell(mapHeaderRow, c);
      cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: COLORS.WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = headerBorder;
    }

    mappingRows.forEach((row, idx) => {
      const r = 6 + idx;
      mapWs.getRow(r).height = 22;
      for (let c = 1; c <= row.length; c++) {
        const cell = mapWs.getCell(r, c);
        cell.font = { name: 'Segoe UI', size: 9, bold: c === 1 };
        cell.alignment = { wrapText: true, vertical: 'top' };
        cell.border = { bottom: { style: 'thin', color: { argb: COLORS.BORDER } } };
      }
    });

    const mapWidths = [22, 14, 62, 28, 52, 14];
    mapWidths.forEach((w, i) => {
      mapWs.getColumn(i + 1).width = w;
    });

    // ========================================================================
    // SHEET 4: 03_Validation_Lists (Lookup tables)
    // ========================================================================
    const listWs = wb.addWorksheet('03_Validation_Lists', {
      views: [{ showGridLines: true }],
    });
    listWs.state = 'hidden';

    listWs.getCell('A1').value = 'Attendance Status';
    listWs.getCell('A1').font = { name: 'Segoe UI', size: 9.5, bold: true };
    const statuses = ['Present', 'Absent', 'Half Day', 'Leave', 'Weekly Off', 'Holiday', 'Not Marked'];
    statuses.forEach((s, idx) => {
      listWs.getCell(`A${idx + 2}`).value = s;
    });

    listWs.getCell('B1').value = 'Shift';
    listWs.getCell('B1').font = { name: 'Segoe UI', size: 9.5, bold: true };
    const shifts = ['General', 'G1', 'G2', 'G3', 'Shift I', 'Shift II', 'Shift III', 'A', 'B'];
    shifts.forEach((sh, idx) => {
      listWs.getCell(`B${idx + 2}`).value = sh;
    });

    listWs.getCell('C1').value = 'Source Status Alias';
    listWs.getCell('C1').font = { name: 'Segoe UI', size: 9.5, bold: true };
    const aliases = ['P', 'A', 'WO', 'W/O', 'H', 'CL', 'PL', 'LOP', 'NFH', 'NA'];
    aliases.forEach((al, idx) => {
      listWs.getCell(`C${idx + 2}`).value = al;
    });

    listWs.getColumn(1).width = 22;
    listWs.getColumn(2).width = 22;
    listWs.getColumn(3).width = 22;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = 'Joy_PeopleHR_Universal_Attendance_InOut_Template.xlsx';
    return { blob, fileName, buffer: new Uint8Array(buffer) };
  }
}
