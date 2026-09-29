// src/services/vendor/universalSheetParsers/mrReportParser.ts
// ============================================================================
// Joy PeopleHR — Dedicated Monthly Muster Roll (MR REPORT) Parser
// Preserves full statutory source columns: Present Days, NFH, W/Off, Leaves, Shifts, OT
// ============================================================================

import {
  MRReportRecord,
  MRReportKPIs,
  SheetParseResult,
  DataQualitySummary,
  SerialGap,
  normalizeEmployeeId,
} from './types';

export class MRReportParser {
  /**
   * Parse an MR REPORT / Monthly Manpower Muster worksheet
   */
  public static parse(matrix: any[][], sheetName: string): SheetParseResult {
    const { headerRowIndex, headers, colMap } = this.locateHeaders(matrix);

    const records: MRReportRecord[] = [];
    const serialEntries: { sno: number; row: number; empId: string }[] = [];
    const warnings: string[] = [];

    let totalPresentDaysSum = 0;
    let totalWoffSum = 0;
    let totalNfhSum = 0;
    let totalPaidLeavesSum = 0;
    let totalLopSum = 0;
    let totalShiftsSum = 0;
    let totalOtHoursSum = 0;
    let totalWagesSum = 0;
    let hasAnyWageData = false;

    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      // Skip row if it looks like a sub-header (e.g. Row 6 with "G.SHIFT", "SHIFT I")
      const firstCell = String(row[0] || '').trim().toLowerCase();
      const secondCell = String(row[1] || '').trim().toLowerCase();
      if (
        firstCell.includes('shift') ||
        secondCell.includes('shift') ||
        firstCell.includes('total') ||
        firstCell.includes('grand') ||
        secondCell.includes('total')
      ) {
        continue;
      }

      // Check for valid employee ID
      const rawEmpId = colMap.empId !== undefined ? row[colMap.empId] : row[1];
      if (rawEmpId === undefined || rawEmpId === null || String(rawEmpId).trim() === '') continue;

      const employeeId = normalizeEmployeeId(rawEmpId);
      // Ensure it's not a header repeat
      if (employeeId.toLowerCase() === 'emp id' || employeeId.toLowerCase() === 'employee no') continue;

      const sourceRowNumber = r + 1; // 1-indexed Excel row
      const rawSno = colMap.sno !== undefined ? row[colMap.sno] : row[0];
      const parsedSno = typeof rawSno === 'number' ? rawSno : parseInt(String(rawSno || '').trim(), 10);
      const sourceSerialNumber = !isNaN(parsedSno) && parsedSno > 0 ? parsedSno : null;

      if (sourceSerialNumber !== null) {
        serialEntries.push({ sno: sourceSerialNumber, row: sourceRowNumber, empId: employeeId });
      }

      const employeeName = colMap.empName !== undefined && row[colMap.empName] ? String(row[colMap.empName]).trim() : `Worker ${employeeId}`;
      const category = colMap.category !== undefined && row[colMap.category] ? String(row[colMap.category]).trim() : 'Contractor';
      const department = colMap.dept !== undefined && row[colMap.dept] ? String(row[colMap.dept]).trim() : 'Operations';

      const presentDays = this.parseNum(colMap.presentDays !== undefined ? row[colMap.presentDays] : 0);
      const nfh = this.parseNum(colMap.nfh !== undefined ? row[colMap.nfh] : 0);
      const weeklyOff = this.parseNum(colMap.woff !== undefined ? row[colMap.woff] : 0);
      const cl = this.parseNum(colMap.cl !== undefined ? row[colMap.cl] : 0);
      const pl = this.parseNum(colMap.pl !== undefined ? row[colMap.pl] : 0);
      const lop = this.parseNum(colMap.lop !== undefined ? row[colMap.lop] : 0);

      const shiftsG = this.parseNum(colMap.shiftsG !== undefined ? row[colMap.shiftsG] : 0);
      const shiftsI = this.parseNum(colMap.shiftsI !== undefined ? row[colMap.shiftsI] : 0);
      const shiftsII = this.parseNum(colMap.shiftsII !== undefined ? row[colMap.shiftsII] : 0);
      const shiftsIII = this.parseNum(colMap.shiftsIII !== undefined ? row[colMap.shiftsIII] : 0);
      const totalShifts = shiftsG + shiftsI + shiftsII + shiftsIII || presentDays;

      const otHours = this.parseNum(colMap.otHours !== undefined ? row[colMap.otHours] : 0);
      const otGte4hDays = this.parseNum(colMap.otGte4h !== undefined ? row[colMap.otGte4h] : 0);
      const otGte8hDays = this.parseNum(colMap.otGte8h !== undefined ? row[colMap.otGte8h] : 0);

      // FA (Food Allowance) extraction: col 16/17 (days or amount)
      const rawFa = colMap.fa !== undefined ? row[colMap.fa] : 0;
      const parsedFa = this.parseNum(rawFa);
      let faQualifyingDays = 0;
      let faAmount = 0;
      if (otGte4hDays > 0) {
        faQualifyingDays = otGte4hDays;
        faAmount = parsedFa > 0 ? parsedFa : Math.round(faQualifyingDays * 20);
      } else if (parsedFa > 0) {
        if (parsedFa <= 31) {
          faQualifyingDays = parsedFa;
          faAmount = Math.round(faQualifyingDays * 20);
        } else {
          faAmount = parsedFa;
          faQualifyingDays = Math.round(parsedFa / 20);
        }
      }

      // NA (Night / W-Off Allowance) extraction: col 18 (days or amount)
      const rawNa = colMap.na !== undefined ? row[colMap.na] : 0;
      const parsedNa = this.parseNum(rawNa);
      let naQualifyingDays = 0;
      let naAmount = 0;
      if (parsedNa > 0) {
        if (parsedNa <= 31) {
          naQualifyingDays = parsedNa;
          naAmount = Math.round(naQualifyingDays * 45);
        } else {
          naAmount = parsedNa;
          naQualifyingDays = Math.round(parsedNa / 45);
        }
      }

      const uan = colMap.uan !== undefined && row[colMap.uan] ? String(row[colMap.uan]).trim() : undefined;
      const esiNumber = colMap.esi !== undefined && row[colMap.esi] ? String(row[colMap.esi]).trim() : undefined;
      const canteenDeduction = colMap.canteen !== undefined ? this.parseNum(row[colMap.canteen]) : undefined;
      const roomAllowance = colMap.rent !== undefined ? this.parseNum(row[colMap.rent]) : undefined;

      const rawWage = colMap.wages !== undefined ? row[colMap.wages] : undefined;
      const wages = rawWage !== undefined && rawWage !== null && rawWage !== '' ? this.parseNum(rawWage) : null;
      if (wages !== null) {
        hasAnyWageData = true;
        totalWagesSum += wages;
      }

      totalPresentDaysSum += presentDays;
      totalWoffSum += weeklyOff;
      totalNfhSum += nfh;
      totalPaidLeavesSum += (cl + pl);
      totalLopSum += lop;
      totalShiftsSum += totalShifts;
      totalOtHoursSum += otHours;

      records.push({
        rowNumber: records.length + 1,
        sourceRowNumber,
        sourceSerialNumber,
        employeeId,
        employeeName,
        category,
        department,
        presentDays,
        nfh,
        weeklyOff,
        cl,
        pl,
        lop,
        shiftsG,
        shiftsI,
        shiftsII,
        shiftsIII,
        totalShifts,
        otHours,
        otGte4hDays,
        otGte8hDays,
        faQualifyingDays,
        faAmount,
        naQualifyingDays,
        naAmount,
        uan,
        esiNumber,
        canteenDeduction,
        roomAllowance,
        rate: null,
        wages,
        hasWageData: wages !== null,
        validationStatus: 'VALID',
        provenance: {
          employeeId: 'SOURCE',
          presentDays: 'SOURCE',
          weeklyOff: 'SOURCE',
          nfh: 'SOURCE',
          leaves: 'SOURCE',
          otHours: 'SOURCE',
          wages: wages !== null ? 'SOURCE' : 'UNAVAILABLE',
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
            description: `Serial number ${missing} is absent from the source sequence (jumped from S.No ${cur.sno} at Row ${cur.row} to S.No ${next.sno} at Row ${next.row}).`,
          });
        }
      }
    }

    if (serialGaps.length > 0) {
      warnings.push(
        `Source serial sequence notice: S.No ${serialGaps.map(g => g.missingSerial).join(', ')} is absent from the sheet. Physical employee records: ${records.length}, highest serial number: S.No ${serialEntries[serialEntries.length - 1]?.sno}.`
      );
    }

    // Unique Employee ID check & Duplicate flagging
    const uniqueEmpSet = new Set<string>();
    let duplicateCount = 0;
    records.forEach((rec) => {
      if (uniqueEmpSet.has(rec.employeeId)) {
        duplicateCount++;
        rec.validationStatus = 'DUPLICATE';
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
      duplicateCount,
      warningCount: warnings.length,
      errorCount: records.filter(r => r.validationStatus === 'ERROR').length,
      serialGaps,
      minSerial: serialEntries.length > 0 ? serialEntries[0].sno : null,
      maxSerial: serialEntries.length > 0 ? serialEntries[serialEntries.length - 1].sno : null,
    };

    const kpis: MRReportKPIs = {
      totalWorkers: qualitySummary.uniqueEmployeeCount,
      totalPresentDays: Math.round(totalPresentDaysSum * 10) / 10,
      totalWeeklyOff: totalWoffSum,
      totalNFH: totalNfhSum,
      totalPaidLeaves: totalPaidLeavesSum,
      totalLOP: totalLopSum,
      totalShifts: totalShiftsSum,
      totalOtHours: Math.round(totalOtHoursSum * 10) / 10,
      totalWages: hasAnyWageData ? Math.round(totalWagesSum) : null,
    };

    return {
      sheetName,
      classification: 'MR_REPORT',
      headerRowIndex,
      rawHeaders: headers,
      mappedColumns: {
        workerCode: headers[colMap.empId ?? -1] || 'EMP ID',
        workerName: headers[colMap.empName ?? -1] || 'EMPLOYEE NAME',
        department: headers[colMap.dept ?? -1] || 'DEPARTMENT',
        payDays: headers[colMap.presentDays ?? -1] || 'PRESENT DAYS',
        otHours: headers[colMap.otHours ?? -1] || 'OVERTIME',
      },
      rowCount: records.length,
      mrData: {
        records,
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
  } {
    let bestRowIdx = 5;
    const colMap: Record<string, number> = {};
    let bestHeaders: string[] = [];

    // Scan rows 0 to 10
    const searchLimit = Math.min(matrix.length, 10);
    for (let r = 0; r < searchLimit; r++) {
      const row = matrix[r] || [];
      const rowLower = row.map((c: any) => String(c || '').trim().toLowerCase());

      if (rowLower.includes('emp id') || rowLower.includes('employee name') || rowLower.includes('present days')) {
        bestRowIdx = r;
        bestHeaders = row.map((c: any) => String(c || '').trim());

        rowLower.forEach((val: string, idx: number) => {
          if (val === 's.no' || val === 'sno' || val === 'sl no' || val === 'sl.no' || val === 's no' || val === 'sn' || val === '#') colMap.sno = idx;
          else if (val === 'emp id' || val === 'employee no' || val === 'emp code' || val === 'worker code') colMap.empId = idx;
          else if (val === 'employee name' || val === 'name') colMap.empName = idx;
          else if (val === 'category') colMap.category = idx;
          else if (val === 'department' || val === 'dept') colMap.dept = idx;
          else if (val === 'present days' || val === 'payable days') colMap.presentDays = idx;
          else if (val === 'nfh' || val === 'n/h' || val === 'holidays') colMap.nfh = idx;
          else if (val === 'w/off' || val === 'weekly off' || val === 'woff') colMap.woff = idx;
          else if (val === 'cl') colMap.cl = idx;
          else if (val === 'pl') colMap.pl = idx;
          else if (val === 'lop') colMap.lop = idx;
          else if (val === 'overtime' || val === 'ot' || val === 'ot hours') colMap.otHours = idx;
          else if (val.includes('more than 4') || val.includes('4 hrs') || val === 'fa') colMap.otGte4h = idx;
          else if (val.includes('8 hrs') || val === 'na') colMap.otGte8h = idx;
          else if (val === 'fa' || val === 'f.allow' || val === 'f.allowance' || val === 'food allow') colMap.fa = idx;
          else if (val === 'na' || val === 'n.allow' || val === 'n.allowance' || val === 'night allow') colMap.na = idx;
          else if (val.includes('uan')) colMap.uan = idx;
          else if (val.includes('esi number') || val === 'esi no' || val === 'esic') colMap.esi = idx;
          else if (val.includes('canteen')) colMap.canteen = idx;
          else if (val.includes('rent') || val.includes('room allow')) colMap.rent = idx;
          else if (val === 'wages' || val === 'gross wages' || val === 'salary') colMap.wages = idx;
        });

        if (colMap.sno === undefined && (colMap.empId ?? 1) > 0) {
          colMap.sno = 0;
        }

        // Check next row (r + 1) for shift sub-headers (G.SHIFT, SHIFT I, etc.) and FA / NA
        const nextRow = matrix[r + 1] || [];
        nextRow.forEach((c: any, nIdx: number) => {
          const nVal = String(c || '').trim().toLowerCase();
          if (nVal === 'g.shift' || nVal === 'general') colMap.shiftsG = nIdx;
          else if (nVal === 'shift i' || nVal === 'shift 1') colMap.shiftsI = nIdx;
          else if (nVal === 'shift ii' || nVal === 'shift 2') colMap.shiftsII = nIdx;
          else if (nVal === 'shift iii' || nVal === 'shift 3') colMap.shiftsIII = nIdx;
          else if (nVal === 'fa' || nVal === 'f.allow' || nVal === 'f.allowance') colMap.fa = nIdx;
          else if (nVal === 'na' || nVal === 'n.allow' || nVal === 'n.allowance') colMap.na = nIdx;
        });

        break;
      }
    }

    return {
      headerRowIndex: bestRowIdx,
      headers: bestHeaders,
      colMap,
    };
  }

  private static parseNum(val: any): number {
    if (val === undefined || val === null || val === '') return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
}
