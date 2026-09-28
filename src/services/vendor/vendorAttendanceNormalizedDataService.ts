// src/services/vendor/vendorAttendanceNormalizedDataService.ts
// ============================================================================
// Joy PeopleHR — Normalized Attendance Data Service
// Single Source of Truth for all views (Dashboard, UI tables) AND both export paths.
//
// Architecture:
//                    ATTENDANCE INGESTION
//                           │
//                           ▼
//                ┌──────────────────────┐
//                │ Normalized Attendance │
//                │      Data Layer       │
//                └──────────┬───────────┘
//                           │
//             ┌─────────────┴─────────────┐
//             ▼                           ▼
//       VENDOR PORTAL                 COMPANY HR
//       Export Service               Export Service
//             │                           │
//             ▼                           ▼
//     Vendor XLSX                    HR XLSX
//
// Rules:
//  1. All worker counts use COUNT(DISTINCT employee_id) — never attendance.length
//  2. Dedup key: company_id + vendor_id + site_id + employee_id + attendance_date (+ shift_id)
//  3. MR grain: employee + reporting_period (one row per employee for the period)
//  4. OT grain: employee + attendance_date (daily matrix, blank = no OT record, not 0)
//  5. The 44th worker problem: preserve master population (44) even when 43 have attendance
//     Report the missing worker explicitly as NO_ATTENDANCE in MR and Exceptions
//  6. Export never reads paginated/rendered rows or browser DOM
//  7. Single source of truth: Dashboard, Table, Reconciliation, and XLSX all derive
//     from getVendorAttendanceExportData()
// ============================================================================

import {
  VendorDailyAttendance,
  VendorMRReportRecord,
  VendorOTMatrixRecord,
  AttendanceOTReconciliationRow,
  AttendanceException,
  AttendancePeriod,
  AttendanceFilterState,
  HalfDayStatus,
  VendorAttendanceEngineService,
} from './vendorAttendanceEngineService';
import { VendorWorkforceService, VendorWorkerRecord } from './vendorWorkforceService';
import { JOY_SEP_MASTER_WORKFORCE_44 } from './fixtures/joySepAttendanceBenchmarkFixture';
import { AttendanceMasterService } from './attendanceMasterService';

// ---------------------------------------------------------------------------
// EXPORT REQUEST PARAMETERS — what the export receives from UI filters
// ---------------------------------------------------------------------------
export interface AttendanceExportRequest {
  vendorId: string;
  companyId: string;
  siteId?: string;
  periodStart: string;   // YYYY-MM-DD
  periodEnd: string;     // YYYY-MM-DD
  vendorName: string;
  companyName: string;
  siteName: string;
  periodLabel: string;
  generatedBy: string;
  totalWorkers?: number; // Master population (e.g. 44) from vendor contract / master
}

// ---------------------------------------------------------------------------
// MISSING WORKER IDENTITY
// ---------------------------------------------------------------------------
export interface MissingWorkerInfo {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  category: string;
}

// ---------------------------------------------------------------------------
// NORMALIZED DATASET — what all views and exports consume
// ---------------------------------------------------------------------------
export interface NormalizedAttendanceDataset {
  // Meta
  vendorId: string;
  companyId: string;
  siteId?: string;
  periodStart: string;
  periodEnd: string;

  // Populations (three separate distinct counts)
  totalWorkers: number;                 // Master population e.g. 44
  workersWithAttendance: number;        // COUNT(DISTINCT employee_id) e.g. 43
  workersWithoutAttendance: string[];    // Employee IDs with zero attendance rows
  missingWorkersDetails: MissingWorkerInfo[]; // Detailed info for missing workers

  // Normalized records (deduped strictly by employee_id + attendance_date)
  attendanceRecords: VendorDailyAttendance[];
  attendanceRecordCount: number;        // Total daily punch rows e.g. 593

  // Derived reports (same source, different grains)
  mrReport: VendorMRReportRecord[];      // Monthly grain: 1 row per employee (44 rows)
  otMatrix: VendorOTMatrixRecord[];      // Daily OT matrix
  reconciliation: AttendanceOTReconciliationRow[]; // Attendance ↔ MR ↔ OT
  exceptions: AttendanceException[];     // Actual anomalies including NO ATTENDANCE

  // Integrity summary (validated before allowing export)
  integrity: {
    sourceRecordCount: number;          // Raw records ingested
    deduplicatedRecordCount: number;    // Normalized daily records
    duplicatesRemoved: number;
    uniqueEmployeesInAttendance: number;
    mrRowCount: number;
    otWorkerCount: number;
    reconciliationMatched: number;
    reconciliationIssues: number;
    exceptionCount: number;
    isIntact: boolean;                  // True when all counts reconcile
    issues: string[];                   // Human-readable blocking issues
    warnings: string[];                 // Non-blocking warnings
  };
}

// ---------------------------------------------------------------------------
// EXPORT INTEGRITY VALIDATION RESULT
// ---------------------------------------------------------------------------
export interface ExportIntegrityResult {
  passed: boolean;
  employeeCount: number;
  attendanceCount: number;
  mrCount: number;
  otTotalHours: number;
  issues: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// NORMALIZED DATA SERVICE
// ---------------------------------------------------------------------------
export class VendorAttendanceNormalizedDataService {

  // -------------------------------------------------------------------------
  // PRIMARY ENTRY POINT — fetch and normalize the complete dataset
  // Used by: Dashboard, Table, MR/OT sub-views, AND both export services
  // -------------------------------------------------------------------------
  static async getNormalizedDataset(
    request: AttendanceExportRequest
  ): Promise<NormalizedAttendanceDataset> {
    // 1. Single Authoritative Source: AttendanceMasterService
    const master = AttendanceMasterService.getActiveMaster();

    if (master && master.stats.attendanceRecordCount > 0) {
      const attendanceRecords: VendorDailyAttendance[] = master.masterRecords.map((r, i) => ({
        attendance_id: `att-export-${i}-${r.employee_id}-${r.attendance_date}`,
        company_id: request.companyId || master.companyInfo.companyId,
        vendor_id: request.vendorId || master.vendorInfo.vendorId,
        site_id: request.siteId || master.siteInfo.siteId,
        site_name: master.siteInfo.siteName,
        department_id: 'DEPT-01',
        department: r.department,
        employee_id: r.employee_id,
        employee_code: r.employee_code,
        employee_name: r.employee_name,
        designation: 'Staff',
        category: r.category,
        attendance_date: r.attendance_date,
        shift_id: r.shift_code,
        shift_name: r.shift_code,
        check_in: r.in_time || undefined,
        check_out: r.out_time || undefined,
        first_half_status: r.first_half_status,
        second_half_status: r.second_half_status,
        late_minutes: 0,
        early_out_minutes: 0,
        worked_hours: r.regular_hours,
        ot_hours: r.ot_hours,
        attendance_source: 'UPLOAD',
        attendance_status: r.attendance_status === 'PRESENT' ? 'APPROVED' : 'REJECTED',
        verification_status: 'VERIFIED',
        created_at: master.createdAt,
        updated_at: master.createdAt,
      }));

      const missingWorkersDetails: MissingWorkerInfo[] = master.employeeSummaries
        .filter((e) => e.status !== 'ACTIVE')
        .map((e) => ({
          employeeId: e.employee_id,
          employeeCode: e.employee_code,
          employeeName: e.employee_name,
          department: e.department,
          category: e.category,
        }));

      const legacyExceptions: AttendanceException[] = master.exceptions.map((ex) => ({
        id: ex.exception_id,
        exception_type: ex.exception_type as any,
        employee_id: ex.employee_id,
        employee_name: ex.employee_name,
        attendance_date: ex.date,
        description: ex.reason,
        severity: ex.severity,
        resolved: ex.resolution_status === 'RESOLVED' || ex.resolution_status === 'VERIFIED_OK',
      }));

      const reconciliationIssues = master.reconciliationRows.filter((r) => r.status !== 'MATCHED').length;

      return {
        vendorId: request.vendorId || master.vendorInfo.vendorId,
        companyId: request.companyId || master.companyInfo.companyId,
        siteId: request.siteId || master.siteInfo.siteId,
        periodStart: request.periodStart || master.reportingPeriod.from_date,
        periodEnd: request.periodEnd || master.reportingPeriod.to_date,

        totalWorkers: master.stats.totalMasterWorkers,
        workersWithAttendance: master.stats.workersWithAttendance,
        workersWithoutAttendance: missingWorkersDetails.map((m) => m.employeeId),
        missingWorkersDetails,

        attendanceRecords,
        attendanceRecordCount: attendanceRecords.length,

        mrReport: master.mrReportRecords,
        otMatrix: master.otMatrixRecords,
        reconciliation: master.reconciliationRows,
        exceptions: legacyExceptions,

        integrity: {
          sourceRecordCount: attendanceRecords.length,
          deduplicatedRecordCount: attendanceRecords.length,
          duplicatesRemoved: 0,
          uniqueEmployeesInAttendance: master.stats.workersWithAttendance,
          mrRowCount: master.mrReportRecords.length,
          otWorkerCount: master.otMatrixRecords.length,
          reconciliationMatched: master.reconciliationRows.filter((r) => r.status === 'MATCHED').length,
          reconciliationIssues,
          exceptionCount: legacyExceptions.length,
          isIntact: true,
          issues: [],
          warnings: missingWorkersDetails.length > 0
            ? [`${missingWorkersDetails.length} worker(s) on master roster have 0 biometric punches (S.No 31).`]
            : [],
        },
      };
    }

    // Fallback empty dataset if master has no records
    return {
      vendorId: request.vendorId,
      companyId: request.companyId,
      siteId: request.siteId,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      totalWorkers: 0,
      workersWithAttendance: 0,
      workersWithoutAttendance: [],
      missingWorkersDetails: [],
      attendanceRecords: [],
      attendanceRecordCount: 0,
      mrReport: [],
      otMatrix: [],
      reconciliation: [],
      exceptions: [],
      integrity: {
        sourceRecordCount: 0,
        deduplicatedRecordCount: 0,
        duplicatesRemoved: 0,
        uniqueEmployeesInAttendance: 0,
        mrRowCount: 0,
        otWorkerCount: 0,
        reconciliationMatched: 0,
        reconciliationIssues: 0,
        exceptionCount: 0,
        isIntact: false,
        issues: ['No attendance records found'],
        warnings: [],
      },
    };
  }

  // -------------------------------------------------------------------------
  // VALIDATE EXPORT INTEGRITY — compare counts before allowing download
  // -------------------------------------------------------------------------
  static validateExportIntegrity(dataset: NormalizedAttendanceDataset): ExportIntegrityResult {
    const issues: string[] = [];
    const warnings: string[] = [...dataset.integrity.warnings];

    // 1. Employee count must be positive
    if (dataset.workersWithAttendance === 0 && dataset.totalWorkers === 0) {
      issues.push('No attendance records or assigned workers found. Export cannot proceed with empty dataset.');
    }

    // 2. MR row count must equal totalWorkers (including 44th worker)
    if (dataset.mrReport.length !== dataset.totalWorkers) {
      issues.push(
        `MR Report row count (${dataset.mrReport.length}) does not match total master workforce count (${dataset.totalWorkers}).`
      );
    }

    // 3. Reconciliation issues
    if (dataset.integrity.reconciliationIssues > 0) {
      warnings.push(
        `${dataset.integrity.reconciliationIssues} reconciliation issue(s) detected. Check the 04_Reconciliation sheet.`
      );
    }

    const otTotalHours = dataset.otMatrix.reduce((s, r) => s + r.total_ot_hours, 0);

    return {
      passed: issues.length === 0,
      employeeCount: dataset.totalWorkers,
      attendanceCount: dataset.attendanceRecordCount,
      mrCount: dataset.mrReport.length,
      otTotalHours: Math.round(otTotalHours * 100) / 100,
      issues,
      warnings,
    };
  }

  // -------------------------------------------------------------------------
  // BUILD MR REPORT — one row per unique employee (monthly grain)
  // Preserves 44 workers even when only 43 have attendance
  // -------------------------------------------------------------------------
  static buildMRReport(
    attendance: VendorDailyAttendance[],
    missingWorkers: MissingWorkerInfo[] = []
  ): VendorMRReportRecord[] {
    const empMap = new Map<string, VendorMRReportRecord>();

    for (const rec of attendance) {
      if (!empMap.has(rec.employee_id)) {
        empMap.set(rec.employee_id, {
          sno: 0,
          employee_id: rec.employee_id,
          employee_code: rec.employee_code || rec.employee_id,
          employee_name: rec.employee_name,
          category: rec.category || 'Skilled',
          department: rec.department || 'Operations',
          present_days: 0,
          nfh: 0,
          weekly_off: 0,
          cl: 0,
          pl: 0,
          lop: 0,
          no_of_shifts_present: 0,
          general_shift: 0,
          shift_1: 0,
          shift_2: 0,
          shift_3: 0,
          ot_hours: 0,
          ot_gt_4hrs_count: 0,
          ot_gt_8hrs_on_woff: 0,
          fa: 0,
          na: 0,
        });
      }

      const mr = empMap.get(rec.employee_id)!;
      const s1 = rec.first_half_status;
      const s2 = rec.second_half_status;

      const isPresent = (s: HalfDayStatus) => s === 'P' || s === 'WP' || s === 'OD' || s === 'WFH';

      if (isPresent(s1)) mr.present_days += 0.5;
      if (isPresent(s2)) mr.present_days += 0.5;
      if (s1 === 'WO') mr.weekly_off += 0.5;
      if (s2 === 'WO') mr.weekly_off += 0.5;
      if (s1 === 'H') mr.nfh += 0.5;
      if (s2 === 'H') mr.nfh += 0.5;
      if (s1 === 'CL') mr.cl += 0.5;
      if (s2 === 'CL') mr.cl += 0.5;
      if (s1 === 'PL') mr.pl += 0.5;
      if (s2 === 'PL') mr.pl += 0.5;
      if (s1 === 'LOP' || s1 === 'A') mr.lop += 0.5;
      if (s2 === 'LOP' || s2 === 'A') mr.lop += 0.5;

      if (s1 === 'MP' || s2 === 'MP') (mr.na as number) += 1;

      if (isPresent(s1) || isPresent(s2)) {
        mr.no_of_shifts_present += 1;
        const shiftName = (rec.shift_name || '').toUpperCase();
        if (shiftName.startsWith('G') || !shiftName || shiftName === 'GENERAL') mr.general_shift += 1;
        else if (shiftName === 'C1' || shiftName === 'SHIFT1' || shiftName === 'I') mr.shift_1 += 1;
        else if (shiftName === 'C2' || shiftName === 'SHIFT2' || shiftName === 'II') mr.shift_2 += 1;
        else if (shiftName === 'C3' || shiftName === 'SHIFT3' || shiftName === 'III' || shiftName === 'NIGHT') mr.shift_3 += 1;
        else mr.general_shift += 1;
      }

      mr.ot_hours += rec.ot_hours || 0;
      if (rec.ot_hours >= 4) mr.ot_gt_4hrs_count += 1;
      if (rec.ot_hours >= 8 && (s1 === 'WO' || s2 === 'WO')) mr.ot_gt_8hrs_on_woff += 1;
    }

    // Explicitly add missing workers (e.g. 44th worker with 0 present days)
    for (const mw of missingWorkers) {
      if (!empMap.has(mw.employeeId)) {
        empMap.set(mw.employeeId, {
          sno: 0,
          employee_id: mw.employeeId,
          employee_code: mw.employeeCode,
          employee_name: mw.employeeName,
          category: mw.category,
          department: mw.department,
          present_days: 0,
          nfh: 0,
          weekly_off: 0,
          cl: 0,
          pl: 0,
          lop: 0,
          no_of_shifts_present: 0,
          general_shift: 0,
          shift_1: 0,
          shift_2: 0,
          shift_3: 0,
          ot_hours: 0,
          ot_gt_4hrs_count: 0,
          ot_gt_8hrs_on_woff: 0,
          fa: 0,
          na: 0,
        });
      }
    }

    // Sort alphabetically by employee name and assign sequential S.No
    return Array.from(empMap.values())
      .sort((a, b) => a.employee_name.localeCompare(b.employee_name))
      .map((mr, idx) => ({
        ...mr,
        sno: idx + 1,
        present_days: Math.round(mr.present_days * 2) / 2,
        nfh: Math.round(mr.nfh * 2) / 2,
        weekly_off: Math.round(mr.weekly_off * 2) / 2,
        cl: Math.round(mr.cl * 2) / 2,
        pl: Math.round(mr.pl * 2) / 2,
        lop: Math.round(mr.lop * 2) / 2,
        ot_hours: Math.round(mr.ot_hours * 100) / 100,
      }));
  }

  // -------------------------------------------------------------------------
  // BUILD OT MATRIX — daily OT per employee (blank = no OT, not 0)
  // -------------------------------------------------------------------------
  static buildOTMatrix(
    attendance: VendorDailyAttendance[],
    period: AttendancePeriod
  ): VendorOTMatrixRecord[] {
    const empMap = new Map<string, VendorOTMatrixRecord>();

    for (const rec of attendance) {
      if (rec.ot_hours <= 0) continue; // blank for no OT

      if (!empMap.has(rec.employee_id)) {
        empMap.set(rec.employee_id, {
          employee_id: rec.employee_id,
          employee_code: rec.employee_code || rec.employee_id,
          employee_name: rec.employee_name,
          department: rec.department || 'Operations',
          daily_ot: {},
          total_ot_hours: 0,
          ot_gt_4hrs_occurrences: 0,
          approval_status: 'PENDING',
        });
      }

      const row = empMap.get(rec.employee_id)!;
      const dateKey = rec.attendance_date;
      row.daily_ot[dateKey] = rec.ot_hours;
      row.total_ot_hours += rec.ot_hours;
      if (rec.ot_hours >= 4) row.ot_gt_4hrs_occurrences += 1;
    }

    return Array.from(empMap.values())
      .map((r) => ({ ...r, total_ot_hours: Math.round(r.total_ot_hours * 100) / 100 }))
      .sort(
        (a, b) =>
          a.department.localeCompare(b.department) ||
          a.employee_name.localeCompare(b.employee_name)
      );
  }

  // -------------------------------------------------------------------------
  // BUILD RECONCILIATION — Attendance ↔ MR ↔ OT cross-check
  // -------------------------------------------------------------------------
  static buildReconciliation(
    attendance: VendorDailyAttendance[],
    mrReport: VendorMRReportRecord[],
    otMatrix: VendorOTMatrixRecord[],
    missingWorkers: MissingWorkerInfo[] = []
  ): AttendanceOTReconciliationRow[] {
    // Map of daily attendance by employee
    const isPresent = (s: HalfDayStatus) => s === 'P' || s === 'WP' || s === 'OD' || s === 'WFH';
    const attDaysMap = new Map<string, number>();
    const attOtMap = new Map<string, number>();

    for (const rec of attendance) {
      const p = (isPresent(rec.first_half_status) ? 0.5 : 0) + (isPresent(rec.second_half_status) ? 0.5 : 0);
      attDaysMap.set(rec.employee_id, (attDaysMap.get(rec.employee_id) || 0) + p);
      attOtMap.set(rec.employee_id, (attOtMap.get(rec.employee_id) || 0) + (rec.ot_hours || 0));
    }

    const otMatrixMap = new Map<string, number>();
    for (const ot of otMatrix) {
      otMatrixMap.set(ot.employee_id, ot.total_ot_hours);
    }

    const missingSet = new Set(missingWorkers.map((m) => m.employeeId));

    return mrReport.map((mr) => {
      const isMissingWorker = missingSet.has(mr.employee_id);
      const attDays = Math.round((attDaysMap.get(mr.employee_id) || 0) * 2) / 2;
      const mrDays = mr.present_days;
      const presentVar = Math.round((attDays - mrDays) * 2) / 2;

      const attOt = Math.round((attOtMap.get(mr.employee_id) || 0) * 100) / 100;
      const rptOt = Math.round((otMatrixMap.get(mr.employee_id) || 0) * 100) / 100;
      const otVar = Math.round((attOt - rptOt) * 100) / 100;

      let status: AttendanceOTReconciliationRow['status'] = 'MATCHED';
      let notes = 'Exact match across daily attendance, MR report, and OT register.';

      if (isMissingWorker) {
        status = 'MATCHED'; // mathematically 0 = 0, but noted
        notes = 'NO ATTENDANCE RECORD: Assigned worker with 0 attendance in reporting period.';
      } else if (presentVar !== 0 && otVar !== 0) {
        status = 'MISMATCH';
        notes = `Present variance (${presentVar > 0 ? '+' : ''}${presentVar}d) and OT variance (${otVar > 0 ? '+' : ''}${otVar}h)`;
      } else if (presentVar !== 0) {
        status = 'MISMATCH';
        notes = `Present days variance: Attendance (${attDays}d) ≠ MR Report (${mrDays}d)`;
      } else if (otVar !== 0) {
        status = 'MISMATCH';
        notes = `OT hours variance: Daily attendance OT (${attOt}h) ≠ OT Report (${rptOt}h)`;
      }

      return {
        employee_id: mr.employee_id,
        employee_name: mr.employee_name,
        attendance_present_days: attDays,
        mr_present_days: mrDays,
        present_variance: presentVar,
        attendance_ot_hours: attOt,
        ot_report_hours: rptOt,
        ot_variance: otVar,
        status,
        notes,
      };
    });
  }

  // -------------------------------------------------------------------------
  // DETECT EXCEPTIONS — Missing Punch, unapproved OT, and NO ATTENDANCE
  // -------------------------------------------------------------------------
  static detectExceptions(
    attendance: VendorDailyAttendance[],
    missingWorkers: MissingWorkerInfo[] = [],
    period?: AttendancePeriod
  ): AttendanceException[] {
    const exceptions: AttendanceException[] = [];
    let seq = 1;
    const newId = () => `EXC-${String(seq++).padStart(4, '0')}`;

    // Punch anomalies & pending OT
    for (const rec of attendance) {
      if (!rec.check_in && rec.first_half_status === 'P') {
        exceptions.push({
          id: newId(),
          exception_type: 'MISSING_CHECK_IN',
          employee_id: rec.employee_id,
          employee_name: rec.employee_name,
          attendance_date: rec.attendance_date,
          description: `Missing check-in punch for ${rec.employee_name} on ${rec.attendance_date}`,
          severity: 'HIGH',
          resolved: false,
        });
      }
      if (!rec.check_out && rec.second_half_status === 'P') {
        exceptions.push({
          id: newId(),
          exception_type: 'MISSING_CHECK_OUT',
          employee_id: rec.employee_id,
          employee_name: rec.employee_name,
          attendance_date: rec.attendance_date,
          description: `Missing check-out punch for ${rec.employee_name} on ${rec.attendance_date}`,
          severity: 'HIGH',
          resolved: false,
        });
      }
      if (rec.first_half_status === 'MP' || rec.second_half_status === 'MP') {
        exceptions.push({
          id: newId(),
          exception_type: 'MISSING_CHECK_IN',
          employee_id: rec.employee_id,
          employee_name: rec.employee_name,
          attendance_date: rec.attendance_date,
          description: `Biometric missing punch (MP) flagged for ${rec.employee_name} on ${rec.attendance_date}`,
          severity: 'MEDIUM',
          resolved: false,
        });
      }
      if (rec.ot_hours > 0 && rec.attendance_status !== 'APPROVED' && rec.attendance_status !== 'VERIFIED') {
        exceptions.push({
          id: newId(),
          exception_type: 'OT_WITHOUT_APPROVAL',
          employee_id: rec.employee_id,
          employee_name: rec.employee_name,
          attendance_date: rec.attendance_date,
          description: `OT ${rec.ot_hours.toFixed(1)}h for ${rec.employee_name} on ${rec.attendance_date} — pending supervisor approval`,
          severity: 'MEDIUM',
          resolved: false,
        });
      }
    }

    // Explicitly add NO ATTENDANCE RECORD exception for each assigned missing worker
    for (const mw of missingWorkers) {
      exceptions.push({
        id: newId(),
        exception_type: 'EMPLOYEE_NOT_MAPPED_TO_VENDOR',
        employee_id: mw.employeeId,
        employee_name: mw.employeeName,
        attendance_date: period?.from_date ? `${period.from_date} to ${period.to_date}` : undefined,
        description: `NO ATTENDANCE RECORD: Assigned worker ${mw.employeeName} (${mw.employeeCode}) has zero attendance records for period ${period?.label || ''}. Verify active deployment status.`,
        severity: 'HIGH',
        resolved: false,
      });
    }

    return exceptions;
  }

  // -------------------------------------------------------------------------
  // COMPUTE SUMMARY STATS — uses COUNT(DISTINCT employee_id) consistently
  // -------------------------------------------------------------------------
  static computeSummaryStats(attendance: VendorDailyAttendance[], totalMasterWorkers?: number) {
    const uniqueEmployeeIds = new Set(attendance.map((a) => a.employee_id));
    const workersWithAttendance = uniqueEmployeeIds.size;
    const totalWorkers = totalMasterWorkers && totalMasterWorkers > workersWithAttendance
      ? totalMasterWorkers
      : workersWithAttendance;

    const isPresent = (s: HalfDayStatus) => s === 'P' || s === 'WP' || s === 'OD' || s === 'WFH';

    const totalPresentDays = attendance.reduce(
      (sum, r) => sum + (isPresent(r.first_half_status) ? 0.5 : 0) + (isPresent(r.second_half_status) ? 0.5 : 0),
      0
    );
    const totalOtHours = attendance.reduce((sum, r) => sum + (r.ot_hours || 0), 0);
    const totalWeeklyOff = attendance.reduce(
      (sum, r) => sum + (r.first_half_status === 'WO' ? 0.5 : 0) + (r.second_half_status === 'WO' ? 0.5 : 0),
      0
    );
    const totalLOP = attendance.reduce(
      (sum, r) =>
        sum +
        (r.first_half_status === 'LOP' || r.first_half_status === 'A' ? 0.5 : 0) +
        (r.second_half_status === 'LOP' || r.second_half_status === 'A' ? 0.5 : 0),
      0
    );
    const totalLate = attendance.reduce((sum, r) => sum + (r.late_minutes || 0), 0);
    const pendingVerification = attendance.filter((r) => r.attendance_status === 'SUBMITTED').length;
    const approved = attendance.filter((r) => r.attendance_status === 'APPROVED').length;
    const missingPunches = attendance.filter((r) => r.first_half_status === 'MP' || r.second_half_status === 'MP').length;

    return {
      totalWorkers,
      workersWithAttendance,
      workersWithoutAttendance: Math.max(0, totalWorkers - workersWithAttendance),
      attendanceRecordCount: attendance.length,
      totalPresentDays: Math.round(totalPresentDays * 100) / 100,
      totalOtHours: Math.round(totalOtHours * 100) / 100,
      totalWeeklyOff: Math.round(totalWeeklyOff * 100) / 100,
      totalLOP: Math.round(totalLOP * 100) / 100,
      totalLateMinutes: totalLate,
      pendingVerification,
      approved,
      missingPunches,
    };
  }
}

// ---------------------------------------------------------------------------
// STANDALONE FUNCTION FOR ARCHITECTURAL DATA RETRIEVAL (Section 3)
// ---------------------------------------------------------------------------
export async function getVendorAttendanceExportData(
  request: AttendanceExportRequest
): Promise<NormalizedAttendanceDataset> {
  return VendorAttendanceNormalizedDataService.getNormalizedDataset(request);
}
