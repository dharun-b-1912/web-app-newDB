// src/services/vendor/universalSheetParsers/otReportParser.ts
// ============================================================================
// Joy PeopleHR — Dedicated Overtime Matrix (OT) Sheet Parser
// Extracts Employee × Date OT values, preserves null/blank distinction, eliminates double-counting
// ============================================================================

import {
  OTMatrixRecord,
  OTReportKPIs,
  SheetParseResult,
  DataQualitySummary,
  SerialGap,
  normalizeEmployeeId,
} from './types';

export class OTReportParser {
  /**
   * Parse an Overtime Matrix / Log worksheet
   */
  public static parse(matrix: any[][], sheetName: string): SheetParseResult {
    const { headerRowIndex, headers, colMap, dateCols } = this.locateHeaders(matrix);

    const records: OTMatrixRecord[] = [];
    const serialEntries: { sno: number; row: number; empId: string }[] = [];
    const warnings: string[] = [];

    let totalOtSum = 0;
    let otGte4hTotal = 0;
    let otGte8hTotal = 0;
    let totalOtDaysSum = 0;

    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      const firstCell = String(row[0] || '').trim().toLowerCase();
      const secondCell = String(row[1] || '').trim().toLowerCase();
      if (firstCell.includes('total') || firstCell.includes('grand') || secondCell.includes('total')) {
        continue;
      }

      const rawEmpId = colMap.empId !== undefined ? row[colMap.empId] : row[1];
      if (rawEmpId === undefined || rawEmpId === null || String(rawEmpId).trim() === '') continue;

      const employeeId = normalizeEmployeeId(rawEmpId);
      if (employeeId.toLowerCase() === 'emp id' || employeeId.toLowerCase() === 'employee no') continue;

      const sourceRowNumber = r + 1;
      const rawSno = colMap.sNo !== undefined ? row[colMap.sNo] : row[0];
      const parsedSno = typeof rawSno === 'number' ? rawSno : parseInt(String(rawSno || '').trim(), 10);
      const sourceSerialNumber = !isNaN(parsedSno) && parsedSno > 0 ? parsedSno : null;

      if (sourceSerialNumber !== null) {
        serialEntries.push({ sno: sourceSerialNumber, row: sourceRowNumber, empId: employeeId });
      }

      const employeeName = colMap.empName !== undefined && row[colMap.empName] ? String(row[colMap.empName]).trim() : `Worker ${employeeId}`;
      const category = colMap.category !== undefined && row[colMap.category] ? String(row[colMap.category]).trim() : 'Contractor';
      const department = colMap.dept !== undefined && row[colMap.dept] ? String(row[colMap.dept]).trim() : 'Operations';
      const subCategory = colMap.subCategory !== undefined && row[colMap.subCategory] ? String(row[colMap.subCategory]).trim() : undefined;

      // Extract daily OT cells across date columns
      const dailyOt: Record<string, number | null> = {};
      let rowOtSum = 0;
      let rowGte4hCount = 0;
      let rowOtDays = 0;

      dateCols.forEach(({ colIdx, dateLabel }) => {
        const val = row[colIdx];
        if (val === undefined || val === null || String(val).trim() === '') {
          dailyOt[dateLabel] = null; // Blank cell is null (no OT), NOT zero
        } else {
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && num > 0) {
            dailyOt[dateLabel] = num;
            rowOtSum += num;
            rowOtDays++;
            if (num >= 4) rowGte4hCount++;
            if (num >= 8) otGte8hTotal++;
          } else {
            dailyOt[dateLabel] = 0;
          }
        }
      });

      // Total OT hours from source column or calculated row sum
      const sourceTotalOt = colMap.totalOt !== undefined && row[colMap.totalOt] !== undefined && row[colMap.totalOt] !== null && row[colMap.totalOt] !== ''
        ? this.parseNum(row[colMap.totalOt])
        : null;
      const finalTotalOt = sourceTotalOt !== null ? sourceTotalOt : Math.round(rowOtSum * 10) / 10;

      const sourceGte4h = colMap.gte4h !== undefined && row[colMap.gte4h] !== undefined
        ? this.parseNum(row[colMap.gte4h])
        : rowGte4hCount;

      totalOtSum += finalTotalOt;
      otGte4hTotal += sourceGte4h;
      totalOtDaysSum += rowOtDays;

      records.push({
        rowNumber: records.length + 1,
        sourceRowNumber,
        sourceSerialNumber,
        employeeId,
        employeeName,
        category,
        department,
        subCategory,
        dailyOt,
        totalOtHours: finalTotalOt,
        otGte4hCount: sourceGte4h,
        otDaysCount: rowOtDays,
        validationStatus: 'VALID',
        provenance: {
          employeeId: 'SOURCE',
          totalOtHours: sourceTotalOt !== null ? 'SOURCE' : 'CALCULATED',
          dailyOt: 'SOURCE',
        },
      });
    }

    // Sequence Gap Detection in source S.No
    const serialGaps: SerialGap[] = [];
    serialEntries.sort((a, b) => a.row - b.row);
    for (let i = 0; i < serialEntries.length - 1; i++) {
      const cur = serialEntries[i];
      const next = serialEntries[i + 1];
      if (next.sno > cur.sno + 1) {
        for (let missing = cur.sno + 1; missing < next.sno; missing++) {
          serialGaps.push({
            missingSerial: missing,
            afterRow: cur.row,
            afterSerial: cur.sno,
            beforeRow: next.row,
            beforeSerial: next.sno,
            description: `Serial number ${missing} is absent from source sequence in ${sheetName} (between S.No ${cur.sno} at Row ${cur.row} and S.No ${next.sno} at Row ${next.row}).`,
          });
        }
      }
    }

    if (serialGaps.length > 0) {
      warnings.push(
        `Source serial sequence notice: S.No ${serialGaps.map(g => g.missingSerial).join(', ')} absent from ${sheetName}. Physical employees: ${records.length}, highest serial: S.No ${serialEntries[serialEntries.length - 1]?.sno}.`
      );
    }

    // Check duplicate employee IDs
    const uniqueEmpSet = new Set<string>();
    let duplicateEmployees = 0;
    records.forEach((rec) => {
      if (uniqueEmpSet.has(rec.employeeId)) {
        rec.validationStatus = 'DUPLICATE';
        duplicateEmployees++;
        warnings.push(`Duplicate Employee ID "${rec.employeeId}" detected at Row ${rec.sourceRowNumber}.`);
      } else {
        uniqueEmpSet.add(rec.employeeId);
        rec.validationStatus = 'VALID';
      }
    });

    const qualitySummary: DataQualitySummary = {
      sourceRowCount: records.length,
      uniqueEmployeeCount: uniqueEmpSet.size,
      validMappedCount: records.filter(r => r.validationStatus === 'VALID').length,
      duplicateCount: duplicateEmployees,
      warningCount: warnings.length,
      errorCount: records.filter(r => r.validationStatus === 'ERROR').length,
      serialGaps,
      minSerial: serialEntries.length > 0 ? serialEntries[0].sno : null,
      maxSerial: serialEntries.length > 0 ? serialEntries[serialEntries.length - 1].sno : null,
    };

    const kpis: OTReportKPIs = {
      totalOtWorkers: uniqueEmpSet.size,
      totalOtHours: Math.round(totalOtSum * 10) / 10,
      totalOtDays: totalOtDaysSum,
      otGte4hCount: otGte4hTotal,
      otGte8hCount: otGte8hTotal,
      duplicateOtCount: duplicateEmployees,
      approvalStatus: 'VERIFIED',
    };

    return {
      sheetName,
      classification: 'OT_REPORT',
      headerRowIndex,
      rawHeaders: headers,
      mappedColumns: {
        workerCode: headers[colMap.empId ?? -1] || 'EMP ID',
        workerName: headers[colMap.empName ?? -1] || 'EMPLOYEE NAME',
        department: headers[colMap.dept ?? -1] || 'DEPARTMENT',
        otHours: headers[colMap.totalOt ?? -1] || 'TOTAL OT HR',
      },
      rowCount: records.length,
      otData: {
        records,
        dateHeaders: dateCols.map((d) => d.dateLabel),
        kpis,
      },
      warnings,
      anomaliesCount: warnings.length,
      qualitySummary,
    };
  }

  private static locateHeaders(matrix: any[][]): {
    headerRowIndex: number;
    headers: string[];
    colMap: Record<string, number>;
    dateCols: { colIdx: number; dateLabel: string }[];
  } {
    let bestRowIdx = 5;
    const colMap: Record<string, number> = {};
    let bestHeaders: string[] = [];
    const dateCols: { colIdx: number; dateLabel: string }[] = [];

    const searchLimit = Math.min(matrix.length, 10);
    for (let r = 0; r < searchLimit; r++) {
      const row = matrix[r] || [];
      const rowStr = row.map((c: any) => String(c || '').trim().toLowerCase());

      if (rowStr.includes('emp id') && (rowStr.includes('total ot hr') || rowStr.includes('over time') || rowStr.some((c: string) => /^\d{1,2}$/.test(c)))) {
        bestRowIdx = r;
        bestHeaders = row.map((c: any) => String(c || '').trim());

        row.forEach((cell: any, idx: number) => {
          const val = String(cell || '').trim();
          const low = val.toLowerCase();

          if (low === 's.no' || low === 's no' || low === 'sl no' || low === 'sl.no' || low === 'sno') colMap.sNo = idx;
          else if (low === 'emp id' || low === 'employee no' || low === 'worker id') colMap.empId = idx;
          else if (low === 'employee name' || low === 'name') colMap.empName = idx;
          else if (low === 'category') colMap.category = idx;
          else if (low === 'department' || low === 'dept') colMap.dept = idx;
          else if (low === 'sub-category' || low === 'sub category') colMap.subCategory = idx;
          else if (low === 'total ot hr' || low === 'total ot' || low === 'total ot hours' || low === 'total') colMap.totalOt = idx;
          else if (low.includes('4 hrs and above') || low.includes('4 hrs') || low.includes('>= 4')) colMap.gte4h = idx;
          else if (/^\d{1,2}$/.test(val) || /^\d{1,2}-[a-z]{3}$/i.test(val)) {
            // Numeric day header like 26, 27, ..., 1, 2, ...
            dateCols.push({ colIdx: idx, dateLabel: val });
          }
        });

        break;
      }
    }

    return {
      headerRowIndex: bestRowIdx,
      headers: bestHeaders,
      colMap,
      dateCols,
    };
  }

  private static parseNum(val: any): number {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
}
