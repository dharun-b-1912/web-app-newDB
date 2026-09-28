// src/services/vendor/universalSheetParsers/reconciliationEngine.ts
// ============================================================================
// Joy PeopleHR — Cross-Sheet 3-Way Reconciliation Engine
// Performs deterministic 3-way reconciliation: Attendance ↔ MR Report ↔ OT Report
// ============================================================================

import {
  SheetParseResult,
  CrossSheetReconciliationRow,
  CrossSheetReconciliationSummary,
  InOutAttendanceBreakdown,
  ReconciliationRootCause,
} from './types';

export class ReconciliationEngine {
  /**
   * Reconcile parsed sheets across the workbook
   */
  public static reconcile(sheets: Record<string, SheetParseResult>): CrossSheetReconciliationSummary {
    let attendanceResult: SheetParseResult | undefined;
    let mrResult: SheetParseResult | undefined;
    let otResult: SheetParseResult | undefined;

    Object.values(sheets).forEach((s) => {
      if (s.classification === 'ATTENDANCE') attendanceResult = s;
      else if (s.classification === 'MR_REPORT') mrResult = s;
      else if (s.classification === 'OT_REPORT') otResult = s;
    });

    const attendanceRecords = attendanceResult?.attendanceData?.records || [];
    const mrRecords = mrResult?.mrData?.records || [];
    const otRecords = otResult?.otData?.records || [];

    // Map by employee ID
    // 1. Group attendance records by employeeId with fine-grained status breakdown
    const attMap = new Map<
      string,
      {
        days: number;
        ot: number;
        name: string;
        dept: string;
        breakdown: InOutAttendanceBreakdown;
      }
    >();

    attendanceRecords.forEach((r) => {
      const existing = attMap.get(r.employeeId) || {
        days: 0,
        ot: 0,
        name: r.employeeName,
        dept: r.department,
        breakdown: {
          biometricPresentDays: 0,
          onDutyDays: 0,
          weeklyOffDays: 0,
          holidayDays: 0,
          absentDays: 0,
          totalRecords: 0,
          qualifyingDays: 0,
        },
      };

      existing.breakdown.totalRecords++;

      const s1 = (r.firstHalf || '').trim().toUpperCase();
      const s2 = (r.secondHalf || '').trim().toUpperCase();

      const isBiometricP1 = s1 === 'P' || s1 === 'PRESENT' || s1 === 'WP';
      const isBiometricP2 = s2 === 'P' || s2 === 'PRESENT' || s2 === 'WP';
      const isOD1 = s1 === 'OD';
      const isOD2 = s2 === 'OD';
      const isWO1 = s1 === 'WO' || s1 === 'W/OFF' || s1 === 'OFF';
      const isWO2 = s2 === 'WO' || s2 === 'W/OFF' || s2 === 'OFF';
      const isH1 = s1 === 'H' || s1 === 'NFH' || s1 === 'HOLIDAY';
      const isH2 = s2 === 'H' || s2 === 'NFH' || s2 === 'HOLIDAY';

      let pUnits = 0;
      if (isBiometricP1) pUnits += 0.5;
      if (isBiometricP2) pUnits += 0.5;
      if (pUnits === 0 && r.inTime && r.outTime && r.inTime !== '—' && r.outTime !== '—') {
        pUnits = 1.0;
      }
      existing.days += pUnits;
      existing.breakdown.biometricPresentDays += pUnits;

      let odUnits = 0;
      if (isOD1) odUnits += 0.5;
      if (isOD2) odUnits += 0.5;
      existing.breakdown.onDutyDays += odUnits;

      let woUnits = 0;
      if (isWO1) woUnits += 0.5;
      if (isWO2) woUnits += 0.5;
      existing.breakdown.weeklyOffDays += woUnits;

      let hUnits = 0;
      if (isH1) hUnits += 0.5;
      if (isH2) hUnits += 0.5;
      existing.breakdown.holidayDays += hUnits;

      if (pUnits === 0 && odUnits === 0 && woUnits === 0 && hUnits === 0) {
        existing.breakdown.absentDays += 1;
      }

      existing.ot += r.otHours || 0;
      if (!existing.name || existing.name.startsWith('Worker ')) existing.name = r.employeeName;
      if (!existing.dept) existing.dept = r.department;
      attMap.set(r.employeeId, existing);
    });

    // Finalize rounded breakdown metrics
    attMap.forEach((v) => {
      v.breakdown.qualifyingDays = Math.round((v.breakdown.biometricPresentDays + v.breakdown.onDutyDays) * 10) / 10;
      v.breakdown.biometricPresentDays = Math.round(v.breakdown.biometricPresentDays * 10) / 10;
      v.breakdown.onDutyDays = Math.round(v.breakdown.onDutyDays * 10) / 10;
      v.breakdown.weeklyOffDays = Math.round(v.breakdown.weeklyOffDays * 10) / 10;
      v.breakdown.holidayDays = Math.round(v.breakdown.holidayDays * 10) / 10;
      v.breakdown.absentDays = Math.round(v.breakdown.absentDays * 10) / 10;
    });

    // 2. Map MR records with cell coordinate tracking
    const mrMap = new Map<
      string,
      {
        days: number;
        ot: number;
        name: string;
        dept: string;
        sourceCell: string;
        rowNumber: number;
      }
    >();

    mrRecords.forEach((r) => {
      mrMap.set(r.employeeId, {
        days: r.presentDays,
        ot: r.otHours,
        name: r.employeeName,
        dept: r.department,
        sourceCell: `MR REPORT!F${r.sourceRowNumber || r.rowNumber}`,
        rowNumber: r.sourceRowNumber || r.rowNumber,
      });
    });

    // 3. Map OT records
    const otMap = new Map<string, { ot: number; name: string; dept: string }>();
    otRecords.forEach((r) => {
      otMap.set(r.employeeId, {
        ot: r.totalOtHours,
        name: r.employeeName,
        dept: r.department,
      });
    });

    // Collect all unique employee IDs
    const allEmpIds = new Set<string>([
      ...Array.from(attMap.keys()),
      ...Array.from(mrMap.keys()),
      ...Array.from(otMap.keys()),
    ]);

    const rows: CrossSheetReconciliationRow[] = [];
    let totalMatched = 0;
    let totalDaysMismatches = 0;
    let totalOtMismatches = 0;
    let missingInAttendance = 0;
    let missingInMr = 0;
    let missingInOt = 0;

    allEmpIds.forEach((empId) => {
      const att = attMap.get(empId);
      const mr = mrMap.get(empId);
      const ot = otMap.get(empId);

      const employeeName = mr?.name || att?.name || ot?.name || `Employee ${empId}`;
      const department = mr?.dept || att?.dept || ot?.dept || 'Operations';

      const attDays = att ? Math.round(att.days * 10) / 10 : null;
      const mrDays = mr ? Math.round(mr.days * 10) / 10 : null;
      const daysVariance = attDays !== null && mrDays !== null ? Math.round(Math.abs(attDays - mrDays) * 10) / 10 : 0;

      const attOt = att ? Math.round(att.ot * 10) / 10 : null;
      const mrOt = mr ? Math.round(mr.ot * 10) / 10 : null;
      const otMatrixOt = ot ? Math.round(ot.ot * 10) / 10 : null;

      // OT variance is primarily between MR Approved OT and OT Matrix OT
      const otVariance = mrOt !== null && otMatrixOt !== null ? Math.round(Math.abs(mrOt - otMatrixOt) * 10) / 10 : 0;

      let status: CrossSheetReconciliationRow['status'] = 'MATCHED';
      let rootCause: ReconciliationRootCause = 'VALID';
      let rootCauseTitle = 'Reconciled';
      let rootCauseDescription = 'IN&OUT attendance records and MR REPORT reconcile perfectly.';
      let recommendedAction = 'No action required.';
      let remarks = 'Fully verified across active sheets.';

      if (!att && mr) {
        status = 'MISSING_IN_ATTENDANCE';
        rootCause = 'MISSING_DATA';
        rootCauseTitle = 'Missing in Attendance (IN&OUT)';
        rootCauseDescription = `Employee ${empId} exists in MR REPORT (row ${mr.rowNumber}), but has 0 records in IN&OUT daily punch logs.`;
        recommendedAction = 'Verify whether the employee was on leave or omitted from the biometric punch export.';
        remarks = 'Present in MR Report but missing in daily punch logs.';
        missingInAttendance++;
      } else if (att && !mr) {
        status = 'MISSING_IN_MR';
        rootCause = 'MISSING_DATA';
        rootCauseTitle = 'Missing in MR REPORT';
        rootCauseDescription = `Employee ${empId} has ${att.breakdown.totalRecords} daily punch records in IN&OUT, but is absent from MR REPORT.`;
        recommendedAction = 'Verify whether employee joined mid-month or was excluded from monthly muster roll.';
        remarks = 'Punched in daily log but missing in monthly Muster Roll.';
        missingInMr++;
      } else if (daysVariance > 0.5) {
        status = 'PRESENT_DAY_MISMATCH';
        totalDaysMismatches++;

        const qualifying = att?.breakdown.qualifyingDays ?? 0;
        const od = att?.breakdown.onDutyDays ?? 0;
        const bio = att?.breakdown.biometricPresentDays ?? 0;

        if (mrDays !== null && qualifying === mrDays && od > 0) {
          rootCause = 'POLICY_DIFFERENCE';
          rootCauseTitle = 'Policy Difference (On-Duty / OD)';
          rootCauseDescription = `MR REPORT claims ${mrDays} present days (${mr?.sourceCell}), counting ${bio} biometric punches + ${od} approved On-Duty (OD) days. IN&OUT raw punch filter counted ${attDays} physical biometric punches. Both numbers come directly from the source workbook without application alteration.`;
          recommendedAction = 'Standard Indian HR / Form 25B includes On-Duty (OD) in billable Present Days. Confirm with vendor if OD is approved.';
          remarks = `MR REPORT claims ${mrDays} present days (${bio} P + ${od} OD), while IN&OUT punch filter counted ${attDays}d.`;
        } else {
          rootCause = 'SOURCE_DATA_CONFLICT';
          rootCauseTitle = 'Source Data Conflict';
          rootCauseDescription = `MR REPORT claims ${mrDays} present days (${mr?.sourceCell}), while IN&OUT contains ${attDays} qualifying present dates (${att?.breakdown.totalRecords} daily rows). The application did not modify either source value.`;
          recommendedAction = 'Review MR REPORT and IN&OUT source records with vendor.';
          remarks = `Attendance days (${attDays}) differs from MR present days (${mrDays}) by ${daysVariance}d.`;
        }
      } else if (otVariance > 0.5) {
        status = 'OT_MISMATCH';
        rootCause = 'SOURCE_DATA_CONFLICT';
        rootCauseTitle = 'Overtime Variance';
        rootCauseDescription = `MR REPORT states ${mrOt}h OT, while OT Matrix reports ${otMatrixOt}h OT (variance of ${otVariance}h).`;
        recommendedAction = 'Confirm approved OT hours with site supervisor.';
        remarks = `MR OT (${mrOt}h) differs from OT Matrix (${otMatrixOt}h) by ${otVariance}h.`;
        totalOtMismatches++;
      } else if (mr && mr.ot > 0 && !ot) {
        status = 'MISSING_IN_OT';
        rootCause = 'MISSING_DATA';
        rootCauseTitle = 'Missing in OT Matrix';
        rootCauseDescription = `MR indicates ${mr.ot}h OT, but employee is absent from the OT Matrix sheet.`;
        recommendedAction = 'Check if OT entries for this department were tracked on a separate sheet.';
        remarks = `MR indicates ${mr.ot}h OT, but employee is absent from OT Matrix.`;
        missingInOt++;
      } else {
        totalMatched++;
      }

      rows.push({
        employeeId: empId,
        employeeName,
        department,
        attendanceDays: attDays,
        mrPresentDays: mrDays,
        daysVariance,
        attendanceOtHours: attOt,
        mrOtHours: mrOt,
        otMatrixHours: otMatrixOt,
        otVariance,
        status,
        remarks,
        mrSourceCell: mr?.sourceCell,
        inOutBreakdown: att?.breakdown,
        rootCause,
        rootCauseTitle,
        rootCauseDescription,
        recommendedAction,
      });
    });

    // Sort by employee ID ascending
    rows.sort((a, b) => a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true }));

    const rootCauseCounts: Record<ReconciliationRootCause, number> = {
      VALID: 0,
      POLICY_DIFFERENCE: 0,
      SOURCE_DATA_CONFLICT: 0,
      PARSER_ERROR: 0,
      CALCULATION_ERROR: 0,
      MAPPING_ERROR: 0,
      DUPLICATE_DATA: 0,
      MISSING_DATA: 0,
    };
    rows.forEach((r) => {
      rootCauseCounts[r.rootCause]++;
    });

    return {
      totalMatched,
      totalDaysMismatches,
      totalOtMismatches,
      missingInAttendance,
      missingInMr,
      missingInOt,
      rootCauseCounts,
      rows,
    };
  }
}
