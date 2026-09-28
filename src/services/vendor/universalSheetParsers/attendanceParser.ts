// src/services/vendor/universalSheetParsers/attendanceParser.ts
// ============================================================================
// Joy PeopleHR — Dedicated Attendance & Daily IN/OUT Punch Sheet Parser
// Handles grouped & flat punch files, S1/S2 to 1st/2nd half, carry-forward attribution
// ============================================================================

import {
  DailyAttendanceRecord,
  AttendanceSheetKPIs,
  SheetParseResult,
  DataQualitySummary,
  SerialGap,
  normalizeEmployeeId,
} from './types';

export class AttendanceParser {
  /**
   * Parse an IN&OUT or Attendance Punch worksheet
   */
  public static parse(matrix: any[][], sheetName: string): SheetParseResult {
    // 1. Locate header row
    const { headerRowIndex, headers, colMap } = this.locateHeaders(matrix);

    const records: DailyAttendanceRecord[] = [];
    const uniqueEmployees = new Set<string>();

    // Track employees and serial numbers
    const serialEntries: { sno: number; row: number; empId: string }[] = [];
    const employeeFirstRow = new Map<string, { row: number; sno: number | null }>();
    const warnings: string[] = [];

    let currentSno: number | null = null;
    let currentDept = 'Operations';
    let currentEmpId = '';
    let currentEmpName = '';

    let totalWorkedHoursSum = 0;
    let totalOtSum = 0;
    let latePunchesCount = 0;
    let earlyOutPunchesCount = 0;
    let missingPunchesCount = 0;
    let presentHalfUnits = 0;

    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.length === 0) continue;

      // Check for department category section headers like ["Assembly"] or ["IMD"]
      const nonEmptyCells = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonEmptyCells.length === 1 && typeof nonEmptyCells[0] === 'string') {
        const candidateDept = String(nonEmptyCells[0]).trim();
        const low = candidateDept.toLowerCase();
        if (
          !low.includes('total') &&
          !low.includes('page') &&
          !low.includes('watertec') &&
          !low.includes('form') &&
          candidateDept.length < 50
        ) {
          currentDept = candidateDept;
          continue;
        }
      }

      // Check for summary or total rows
      const rowStr = row.map((c) => String(c || '').trim().toLowerCase()).join(' ');
      if (rowStr.includes('total') || rowStr.includes('grand total') || rowStr.includes('summary')) {
        continue;
      }

      // Read raw cell values using mapped column indices
      const rawSno = colMap.sNo !== undefined ? row[colMap.sNo] : undefined;
      const rawEmpId = colMap.empId !== undefined ? row[colMap.empId] : undefined;
      const rawEmpName = colMap.empName !== undefined ? row[colMap.empName] : undefined;
      const rawDept = colMap.dept !== undefined ? row[colMap.dept] : undefined;
      const rawDate = colMap.date !== undefined ? row[colMap.date] : undefined;
      const rawShift = colMap.shift !== undefined ? row[colMap.shift] : undefined;
      const rawS1 = colMap.s1 !== undefined ? row[colMap.s1] : undefined;
      const rawS2 = colMap.s2 !== undefined ? row[colMap.s2] : undefined;
      const rawIn = colMap.inTime !== undefined ? row[colMap.inTime] : undefined;
      const rawOut = colMap.outTime !== undefined ? row[colMap.outTime] : undefined;
      const rawLate = colMap.lateIn !== undefined ? row[colMap.lateIn] : undefined;
      const rawEarly = colMap.earlyOut !== undefined ? row[colMap.earlyOut] : undefined;
      const rawTotalHrs = colMap.totalHrs !== undefined ? row[colMap.totalHrs] : undefined;
      const rawOt = colMap.otHrs !== undefined ? row[colMap.otHrs] : undefined;

      // Parse S.No if present on this row
      if (rawSno !== undefined && rawSno !== null && String(rawSno).trim() !== '') {
        const parsed = typeof rawSno === 'number' ? rawSno : parseInt(String(rawSno).trim(), 10);
        if (!isNaN(parsed) && parsed > 0) {
          currentSno = parsed;
        }
      }

      // Forward-fill employee ID & Name when row has a new employee
      if (rawEmpId !== undefined && rawEmpId !== null && String(rawEmpId).trim() !== '') {
        const normId = normalizeEmployeeId(rawEmpId);
        if (normId && normId !== currentEmpId) {
          currentEmpId = normId;
          if (currentSno !== null) {
            serialEntries.push({ sno: currentSno, row: r + 1, empId: currentEmpId });
          }
          if (!employeeFirstRow.has(currentEmpId)) {
            employeeFirstRow.set(currentEmpId, { row: r + 1, sno: currentSno });
          }
        }
      }
      if (rawEmpName !== undefined && rawEmpName !== null && String(rawEmpName).trim() !== '') {
        currentEmpName = String(rawEmpName).trim();
      }
      if (rawDept !== undefined && rawDept !== null && String(rawDept).trim() !== '') {
        currentDept = String(rawDept).trim();
      }

      // A valid attendance row MUST have an employee and a date/shift
      if (!currentEmpId) continue;
      if (rawDate === undefined || rawDate === null || String(rawDate).trim() === '') continue;

      uniqueEmployees.add(currentEmpId);

      // Format date
      const formattedDate = this.formatDate(rawDate);

      // First Half (S1) & Second Half (S2)
      const firstHalf = rawS1 !== undefined && rawS1 !== null ? String(rawS1).trim().toUpperCase() : '';
      const secondHalf = rawS2 !== undefined && rawS2 !== null ? String(rawS2).trim().toUpperCase() : '';

      if (firstHalf === 'P' || firstHalf === 'PRESENT' || firstHalf === 'WP') presentHalfUnits++;
      if (secondHalf === 'P' || secondHalf === 'PRESENT' || secondHalf === 'WP') presentHalfUnits++;

      // Times
      const inTime = rawIn !== undefined && rawIn !== null && String(rawIn).trim() !== '' ? this.formatTime(rawIn) : null;
      const outTime = rawOut !== undefined && rawOut !== null && String(rawOut).trim() !== '' ? this.formatTime(rawOut) : null;

      const hasMissingPunch = (inTime !== null && outTime === null) || (inTime === null && outTime !== null);
      if (hasMissingPunch) missingPunchesCount++;

      // Late & Early
      const lateInMinutes = this.parseNumeric(rawLate);
      const earlyOutMinutes = this.parseNumeric(rawEarly);
      if (lateInMinutes !== null && lateInMinutes > 0) latePunchesCount++;
      if (earlyOutMinutes !== null && earlyOutMinutes > 0) earlyOutPunchesCount++;

      // Total Worked Hours
      const totalHours = rawTotalHrs !== undefined && rawTotalHrs !== null && String(rawTotalHrs).trim() !== ''
        ? this.formatDuration(rawTotalHrs)
        : null;
      const numericWorkedHours = this.parseDurationToDecimal(totalHours || inTime && outTime ? this.diffTime(inTime!, outTime!) : '0');
      totalWorkedHoursSum += numericWorkedHours;

      // OT Hours
      const otHours = this.parseNumeric(rawOt) || 0;
      totalOtSum += otHours;

      records.push({
        rowNumber: records.length + 1,
        sourceRowNumber: r + 1,
        sourceSerialNumber: currentSno,
        employeeId: currentEmpId,
        employeeName: currentEmpName || `Employee ${currentEmpId}`,
        department: currentDept,
        date: formattedDate,
        rawDate,
        shift: rawShift !== undefined && rawShift !== null ? String(rawShift).trim() : 'G1',
        firstHalf: firstHalf || (inTime ? 'P' : 'A'),
        secondHalf: secondHalf || (outTime ? 'P' : 'A'),
        inTime,
        outTime,
        lateInMinutes,
        earlyOutMinutes,
        totalHours,
        otHours,
        hasMissingPunch,
        validationStatus: hasMissingPunch ? 'WARNING' : 'VALID',
        provenance: {
          employeeId: 'SOURCE',
          date: 'SOURCE',
          firstHalf: rawS1 !== undefined ? 'SOURCE' : 'DERIVED',
          secondHalf: rawS2 !== undefined ? 'SOURCE' : 'DERIVED',
          inTime: inTime ? 'SOURCE' : 'UNAVAILABLE',
          outTime: outTime ? 'SOURCE' : 'UNAVAILABLE',
          totalHours: totalHours ? 'SOURCE' : 'CALCULATED',
          otHours: rawOt !== undefined ? 'SOURCE' : 'UNAVAILABLE',
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
        `Source serial sequence notice: S.No ${serialGaps.map(g => g.missingSerial).join(', ')} absent from ${sheetName}. Physical employees: ${uniqueEmployees.size}, highest serial: S.No ${serialEntries[serialEntries.length - 1]?.sno}.`
      );
    }

    // Check duplicate employee punch dates
    const punchKeySet = new Set<string>();
    let duplicatePunches = 0;
    records.forEach((rec) => {
      const pKey = `${rec.employeeId}_${rec.date}`;
      if (punchKeySet.has(pKey)) {
        rec.validationStatus = 'DUPLICATE';
        duplicatePunches++;
      } else {
        punchKeySet.add(pKey);
      }
    });

    const qualitySummary: DataQualitySummary = {
      sourceRowCount: records.length,
      uniqueEmployeeCount: uniqueEmployees.size,
      validMappedCount: uniqueEmployees.size,
      duplicateCount: duplicatePunches,
      warningCount: missingPunchesCount + warnings.length,
      errorCount: 0,
      serialGaps,
      minSerial: serialEntries.length > 0 ? serialEntries[0].sno : null,
      maxSerial: serialEntries.length > 0 ? serialEntries[serialEntries.length - 1].sno : null,
    };

    const calculatedPresentDays = Math.round((presentHalfUnits / 2) * 10) / 10;

    const kpis: AttendanceSheetKPIs = {
      uniqueWorkers: uniqueEmployees.size,
      totalRecords: records.length,
      presentDays: calculatedPresentDays > 0 ? calculatedPresentDays : null,
      totalWorkedHours: Math.round(totalWorkedHoursSum * 10) / 10,
      latePunches: latePunchesCount,
      earlyOutPunches: earlyOutPunchesCount,
      totalOtHours: Math.round(totalOtSum * 10) / 10,
      missingPunches: missingPunchesCount,
    };

    return {
      sheetName,
      classification: 'ATTENDANCE',
      headerRowIndex,
      rawHeaders: headers,
      mappedColumns: {
        workerCode: headers[colMap.empId ?? -1] || 'Employee No',
        workerName: headers[colMap.empName ?? -1] || 'Name',
        date: headers[colMap.date ?? -1] || 'Date',
        shift: headers[colMap.shift ?? -1] || 'Shift',
        firstHalf: headers[colMap.s1 ?? -1] || 'S1',
        secondHalf: headers[colMap.s2 ?? -1] || 'S2',
        checkIn: headers[colMap.inTime ?? -1] || 'IN',
        checkOut: headers[colMap.outTime ?? -1] || 'OUT',
        lateMinutes: headers[colMap.lateIn ?? -1] || 'Late IN(Min)',
        earlyMinutes: headers[colMap.earlyOut ?? -1] || 'Early Out(Min)',
        totalHours: headers[colMap.totalHrs ?? -1] || 'Total Hours',
        otHours: headers[colMap.otHrs ?? -1] || 'OT Hours',
      },
      rowCount: records.length,
      attendanceData: {
        records,
        kpis,
      },
      warnings,
      anomaliesCount: missingPunchesCount,
      qualitySummary,
    };
  }

  private static locateHeaders(matrix: any[][]): {
    headerRowIndex: number;
    headers: string[];
    colMap: Record<string, number>;
  } {
    let bestRowIdx = 0;
    let bestScore = -1;
    let bestMap: Record<string, number> = {};
    let bestHeaders: string[] = [];

    const searchLimit = Math.min(matrix.length, 12);
    for (let r = 0; r < searchLimit; r++) {
      const row = matrix[r] || [];
      const colMap: Record<string, number> = {};
      let score = 0;

      row.forEach((cell: any, idx: number) => {
        const val = String(cell || '').trim().toLowerCase();
        if (!val) return;

        if (val === 'employee no' || val === 'emp id' || val === 'emp no' || val === 'worker id' || val === 'punching no' || val === 'code') {
          colMap.empId = idx;
          score += 3;
        } else if (val === 'name' || val === 'employee name' || val === 'worker name') {
          colMap.empName = idx;
          score += 3;
        } else if (val === 'date' || val === 'attendance date' || val === 'work date') {
          colMap.date = idx;
          score += 3;
        } else if (val === 's1' || val === 'session 1' || val === '1st half' || val === 'first half') {
          colMap.s1 = idx;
          score += 4;
        } else if (val === 's2' || val === 'session 2' || val === '2nd half' || val === 'second half') {
          colMap.s2 = idx;
          score += 4;
        } else if (val === 'in' || val === 'in time' || val === 'punch in' || val === 'in punch') {
          colMap.inTime = idx;
          score += 3;
        } else if (val === 'out' || val === 'out time' || val === 'punch out' || val === 'out punch') {
          colMap.outTime = idx;
          score += 3;
        } else if (val.includes('late in') || val.includes('late')) {
          colMap.lateIn = idx;
          score += 2;
        } else if (val.includes('early out') || val.includes('early')) {
          colMap.earlyOut = idx;
          score += 2;
        } else if (val.includes('total hours') || val.includes('total hrs') || val === 'total_hours') {
          colMap.totalHrs = idx;
          score += 2;
        } else if (val === 'ot hours' || val === 'ot hrs' || val === 'overtime' || val === 'ot') {
          colMap.otHrs = idx;
          score += 2;
        } else if (val === 'shift' || val === 'shift code') {
          colMap.shift = idx;
          score += 1;
        } else if (val === 'department' || val === 'dept') {
          colMap.dept = idx;
          score += 1;
        } else if (val === 's.no' || val === 's no' || val === 'sl no') {
          colMap.sNo = idx;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestRowIdx = r;
        bestMap = colMap;
        bestHeaders = row.map((c: any) => String(c || '').trim());
      }
    }

    return {
      headerRowIndex: bestRowIdx,
      headers: bestHeaders,
      colMap: bestMap,
    };
  }

  private static formatDate(val: any): string {
    if (!val) return '';
    if (typeof val === 'number') {
      // Excel serial date (e.g. 46260)
      const jsDate = new Date((val - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().split('T')[0];
      }
    }
    const str = String(val).trim();
    return str;
  }

  private static formatTime(val: any): string {
    if (typeof val === 'number') {
      // Fractional day time
      const totalSeconds = Math.round(val * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return String(val).trim();
  }

  private static formatDuration(val: any): string {
    if (typeof val === 'number') {
      return this.formatTime(val);
    }
    return String(val).trim();
  }

  private static parseNumeric(val: any): number | null {
    if (val === undefined || val === null || val === '') return null;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  private static parseDurationToDecimal(timeStr: string): number {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':').map((p) => parseFloat(p) || 0);
    return parts[0] + parts[1] / 60;
  }

  private static diffTime(inTime: string, outTime: string): string {
    const inDec = this.parseDurationToDecimal(inTime);
    const outDec = this.parseDurationToDecimal(outTime);
    const diff = Math.max(0, outDec - inDec);
    const h = Math.floor(diff);
    const m = Math.round((diff - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
