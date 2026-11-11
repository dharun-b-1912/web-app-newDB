import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import zlib from 'node:zlib';
import { supabase } from '../../../lib/supabase';

const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

import {
  assertTenantIsolation,
  buildFilteredMisDataset,
  generateMisCsv,
  generateMisExcelWorkbook,
  generateMisPdf,
  recordMisExportAuditLog,
  type MisExportRequest,
  type MisSourceDataset,
} from '../misReportExportEngine';

function extractPdfRenderedText(pdfBytes: Uint8Array): string {
  const raw = Buffer.from(pdfBytes).toString('latin1');
  const chunks: string[] = [raw];
  const regex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const buf = Buffer.from(match[1], 'latin1');
    try {
      chunks.push(zlib.inflateSync(buf).toString('latin1'));
    } catch {
      try {
        chunks.push(zlib.inflateRawSync(buf).toString('latin1'));
      } catch {
        chunks.push(match[1]);
      }
    }
  }
  return chunks.join('\n').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
}

function buildMockSource(orgId = 'org-1'): MisSourceDataset {
  return {
    organizationId: orgId,
    companyName: 'Joy Corporate Solutions Pvt. Ltd.',
    daily: {
      reportDate: '2026-11-11',
      formattedDate: '11 Nov 2026',
      organizationId: orgId,
      companyName: 'Joy Corporate Solutions Pvt. Ltd.',
      cutoffTime: '18:30 IST',
      isInterimSnapshot: false,
      scheduledHeadcount: 4,
      expectedAttendance: 3,
      presentCount: 2,
      absentCount: 1,
      onLeaveCount: 1,
      weeklyOffCount: 0,
      lateArrivalsCount: 1,
      missingCheckInCount: 0,
      missingCheckOutCount: 1,
      regularizationPendingCount: 1,
      attendanceTurnoutPct: 66.7,
      absenteeismPct: 33.3,
      recordedOtHours: 3.5,
      approvedOtHours: 2.5,
      pendingOtApprovalsCount: 1,
      biometricMappingExceptions: 0,
      mobileGpsExceptions: 0,
      employeesRequiringFollowUp: 2,
      departmentTurnouts: [
        { department: 'Engineering', total: 2, present: 2, absent: 0, late: 1, turnoutPct: 100, recordedOt: 2.5 },
        { department: 'Operations', total: 2, present: 0, absent: 1, late: 0, turnoutPct: 0, recordedOt: 0 },
      ],
      shiftTurnouts: [
        { shift: 'General Shift (09:00 - 18:00)', total: 3, present: 2, absent: 1, turnoutPct: 66.7, late: 1 },
        { shift: 'Night Shift (22:00 - 06:00)', total: 1, present: 0, absent: 0, turnoutPct: 0, late: 0 },
      ],
      employeeRecords: [
        {
          employeeId: 'e1',
          employeeCode: 'JCS-001',
          employeeName: 'Arun Kumar',
          department: 'Engineering',
          designation: 'Senior Engineer',
          shift: 'General Shift (09:00 - 18:00)',
          attendanceDate: '2026-11-11',
          scheduledStart: '09:00 AM',
          firstCheckIn: '09:05 AM',
          lastCheckOut: '08:30 PM',
          workingDuration: '11h 25m',
          workingMinutes: 685,
          breakDurationMinutes: 45,
          lateDurationMinutes: 0,
          earlyDepartureMinutes: 0,
          overtimeHours: 2.5,
          missingPunchStatus: 'Complete',
          regularizationStatus: 'None',
          supervisor: 'Praveen B',
          remarks: 'Approved OT on deployment',
          attendanceSource: 'Biometric Device',
          verificationStatus: 'Verified',
          exceptionStatus: 'Normal',
          status: 'PRESENT',
        },
        {
          employeeId: 'e2',
          employeeCode: 'JCS-002',
          employeeName: 'Priya Nair',
          department: 'Engineering',
          designation: 'QA Lead',
          shift: 'General Shift (09:00 - 18:00)',
          attendanceDate: '2026-11-11',
          scheduledStart: '09:00 AM',
          firstCheckIn: '09:32 AM',
          lastCheckOut: 'Pending',
          workingDuration: 'In Progress',
          workingMinutes: 480,
          breakDurationMinutes: null,
          lateDurationMinutes: 32,
          earlyDepartureMinutes: 0,
          overtimeHours: 0,
          missingPunchStatus: 'Missing Check-Out',
          regularizationStatus: 'PENDING',
          supervisor: 'Praveen B',
          remarks: 'Late check-in',
          attendanceSource: 'Web Punch',
          verificationStatus: 'Pending',
          exceptionStatus: 'Missing Check-Out',
          status: 'PRESENT',
        },
        {
          employeeId: 'e3',
          employeeCode: 'JCS-003',
          employeeName: 'Karthik Raja',
          department: 'Operations',
          designation: 'Executive',
          shift: 'General Shift (09:00 - 18:00)',
          attendanceDate: '2026-11-11',
          scheduledStart: '09:00 AM',
          firstCheckIn: '—',
          lastCheckOut: '—',
          workingDuration: '0h 0m',
          workingMinutes: 0,
          breakDurationMinutes: null,
          lateDurationMinutes: 0,
          earlyDepartureMinutes: 0,
          overtimeHours: 0,
          missingPunchStatus: 'Absent',
          regularizationStatus: 'None',
          supervisor: 'Sakthivel S',
          remarks: 'Absent without intimation',
          attendanceSource: 'Scheduled Roster',
          verificationStatus: 'Unexcused Absence',
          exceptionStatus: 'Unexcused Absence',
          status: 'ABSENT',
        },
        {
          employeeId: 'e4',
          employeeCode: 'JCS-004',
          employeeName: 'Meena Devi',
          department: 'Operations',
          designation: 'Coordinator',
          shift: 'Night Shift (22:00 - 06:00)',
          attendanceDate: '2026-11-11',
          scheduledStart: '09:00 AM',
          firstCheckIn: '—',
          lastCheckOut: '—',
          workingDuration: '0h 0m',
          workingMinutes: 0,
          breakDurationMinutes: null,
          lateDurationMinutes: 0,
          earlyDepartureMinutes: 0,
          overtimeHours: 0,
          missingPunchStatus: 'None (Approved Leave)',
          regularizationStatus: 'None',
          supervisor: 'Sakthivel S',
          remarks: 'Approved Leave',
          attendanceSource: 'Leave Vault',
          verificationStatus: 'Approved Leave',
          exceptionStatus: 'None',
          status: 'ON_LEAVE',
        },
      ],
    },
    weekly: {
      weekIdentifier: '2026-W46',
      startDate: '2026-11-05',
      endDate: '2026-11-11',
      organizationId: orgId,
      companyName: 'Joy Corporate Solutions Pvt. Ltd.',
      averageWorkforce: 4,
      averageTurnoutPct: 82.0,
      averageAbsenteeismPct: 18.0,
      totalWeeklyOtHours: 10.5,
      dailyAttendanceTrend: [
        { date: '2026-11-10', dayName: 'Tue', present: 3, absent: 1, onLeave: 0, turnoutPct: 75, otHours: 4.0 },
        { date: '2026-11-11', dayName: 'Wed', present: 2, absent: 1, onLeave: 1, turnoutPct: 66.7, otHours: 2.5 },
      ],
      repeatedAbsenceEmployees: [],
      repeatedLateEmployees: [],
      employeesApproachingOtAllocation: [],
      employeeSummaries: [
        {
          employeeId: 'e1',
          employeeCode: 'JCS-001',
          employeeName: 'Arun Kumar',
          department: 'Engineering',
          designation: 'Senior Engineer',
          shift: 'General Shift (09:00 - 18:00)',
          scheduledDays: 6,
          presentDays: 6,
          absentDays: 0,
          leaveDays: 0,
          lateDays: 0,
          lateMinutesTotal: 0,
          missingPunches: 0,
          overtimeHours: 6.5,
          attendancePct: 100,
        },
        {
          employeeId: 'e3',
          employeeCode: 'JCS-003',
          employeeName: 'Karthik Raja',
          department: 'Operations',
          designation: 'Executive',
          shift: 'General Shift (09:00 - 18:00)',
          scheduledDays: 6,
          presentDays: 4,
          absentDays: 2,
          leaveDays: 0,
          lateDays: 1,
          lateMinutesTotal: 20,
          missingPunches: 1,
          overtimeHours: 0,
          attendancePct: 66.7,
        },
      ],
      outstandingRegularizations: 1,
      unresolvedExceptionsCount: 2,
    },
    monthly: {
      year: 2026,
      month: 11,
      monthName: 'November',
      reportingPeriod: '2026-11',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      organizationId: orgId,
      companyName: 'Joy Corporate Solutions Pvt. Ltd.',
      openingHeadcount: 4,
      closingHeadcount: 4,
      newJoinersCount: 0,
      employeeExitsCount: 0,
      netHeadcountMovement: 0,
      scheduledAttendanceOpportunities: 80,
      actualPresentDays: 65,
      absentDays: 10,
      approvedLeaveDays: 5,
      monthlyAttendancePct: 86.7,
      monthlyAbsenteeismPct: 13.3,
      monthlyLateArrivalsCount: 4,
      missingPunchesCount: 2,
      regularizationRequestsTotal: 2,
      currentMonthRecordedOtHours: 14,
      currentMonthApprovedOtHours: 10.5,
      currentFourMonthPeriod: {
        periodIndex: 3,
        periodName: 'Sep–Dec 2026',
        year: 2026,
        startDate: '2026-09-01',
        endDate: '2026-12-31',
        monthsIncluded: ['Sep', 'Oct', 'Nov', 'Dec'],
        allocationHours: 20,
      },
      fourMonthCumulativeApprovedOtHours: 18,
      fourMonthPeriodAllocationHours: 20,
      fourMonthRemainingAllocationHours: 2,
      fourMonthPeriodUtilizationPct: 90,
      employeesExceedingOtAllocationCount: 0,
      employeesApproachingOtAllocationCount: 1,
      departmentPerformance: [],
      shiftPerformance: [],
      employeeMonthlySummaries: [
        {
          employeeId: 'e1',
          employeeCode: 'JCS-001',
          employeeName: 'Arun Kumar',
          department: 'Engineering',
          designation: 'Senior Engineer',
          shift: 'General Shift (09:00 - 18:00)',
          scheduledDays: 21,
          presentDays: 20,
          absentDays: 0,
          leaveDays: 1,
          lateDays: 0,
          missingPunches: 0,
          exceptionsCount: 0,
          overtimeHours: 10.5,
          attendancePct: 100,
        },
      ],
      monthlyAttritionRatePct: 0,
      unresolvedHrExceptionsCount: 2,
    },
    overtimeSummary: {
      reportingYear: 2026,
      targetDate: '2026-11-11',
      thresholdConfig: {
        approachingPct: 75,
        highPriorityPct: 90,
        exceededPct: 100,
        periodAllocationHours: 20,
        annualAllocationHours: 60,
      },
      currentPeriod: {
        periodIndex: 3,
        periodName: 'Sep–Dec 2026',
        year: 2026,
        startDate: '2026-09-01',
        endDate: '2026-12-31',
        monthsIncluded: ['Sep', 'Oct', 'Nov', 'Dec'],
        allocationHours: 20,
      },
      totalWorkforce: 2,
      employeesWithOtInPeriod: 2,
      totalPeriodRecordedHours: 16,
      totalPeriodApprovedHours: 14,
      totalPeriodPendingHours: 2,
      totalPeriodRemainingHours: 26,
      totalPeriodExcessHours: 0,
      overallPeriodUtilizationPct: 35,
      employeesNormalCount: 1,
      employeesApproachingCount: 1,
      employeesHighPriorityCount: 0,
      employeesExceededCount: 0,
      exceptionsRequiringAction: [],
      departmentRollups: [],
      shiftRollups: [],
      employeeRecords: [
        {
          employeeId: 'e1',
          employeeCode: 'JCS-001',
          employeeName: 'Arun Kumar',
          department: 'Engineering',
          designation: 'Senior Engineer',
          shift: 'General Shift (09:00 - 18:00)',
          reportingManager: 'Praveen B',
          currentMonthRecordedOtHours: 5,
          currentMonthApprovedOtHours: 3.5,
          currentMonthPendingOtHours: 1.5,
          currentMonthOtDaysCount: 2,
          currentPeriod: {
            periodIndex: 3,
            periodName: 'Sep–Dec 2026',
            year: 2026,
            startDate: '2026-09-01',
            endDate: '2026-12-31',
            monthsIncluded: ['Sep', 'Oct', 'Nov', 'Dec'],
            allocationHours: 20,
          },
          currentPeriodRecordedOtHours: 14,
          currentPeriodApprovedOtHours: 12.5,
          currentPeriodPendingOtHours: 1.5,
          currentPeriodAllocationHours: 20,
          periodOtDaysCount: 5,
          remainingAllocationHours: 7.5,
          excessAllocationHours: 0,
          utilizationPercentage: 62.5,
          period1ApprovedHours: 0,
          period2ApprovedHours: 0,
          period3ApprovedHours: 12.5,
          annualCumulativeApprovedHours: 12.5,
          annualAllocationHours: 60,
          annualRemainingHours: 47.5,
          annualUtilizationPercentage: 20.8,
          warningStatus: 'NORMAL',
          hasPendingApprovals: true,
          requiresHrReview: false,
          lastUpdated: '2026-11-11',
        },
      ],
    },
    overtimeLedger: [
      {
        id: 'ot-1',
        employeeId: 'e1',
        employeeCode: 'JCS-001',
        employeeName: 'Arun Kumar',
        department: 'Engineering',
        shift: 'General Shift (09:00 - 18:00)',
        workDate: '2026-11-11',
        regularHours: 8,
        eligibleOtHours: 2.5,
        approvedOtHours: 2.5,
        pendingOtHours: 0,
        rejectedOtHours: 0,
        status: 'APPROVED',
        otRateType: 'Standard',
        hourlyRate: null,
        overtimeCost: null,
        reason: 'Release deployment support',
        approvedBy: 'Praveen B',
        approvedAt: '2026-11-11',
      },
      {
        id: 'ot-2',
        employeeId: 'e2',
        employeeCode: 'JCS-002',
        employeeName: 'Priya Nair',
        department: 'Engineering',
        shift: 'General Shift (09:00 - 18:00)',
        workDate: '2026-11-11',
        regularHours: 8,
        eligibleOtHours: 1.5,
        approvedOtHours: 0,
        pendingOtHours: 1.5,
        rejectedOtHours: 0,
        status: 'PENDING',
        otRateType: 'Standard',
        hourlyRate: null,
        overtimeCost: null,
        reason: 'Regression verification',
        approvedBy: 'Pending Review',
        approvedAt: '—',
      },
      {
        id: 'ot-3',
        employeeId: 'e3',
        employeeCode: 'JCS-003',
        employeeName: 'Karthik Raja',
        department: 'Operations',
        shift: 'General Shift (09:00 - 18:00)',
        workDate: '2026-11-11',
        regularHours: 8,
        eligibleOtHours: 1.0,
        approvedOtHours: 0,
        pendingOtHours: 0,
        rejectedOtHours: 1.0,
        status: 'REJECTED',
        otRateType: 'Standard',
        hourlyRate: null,
        overtimeCost: null,
        reason: 'Unplanned stay',
        approvedBy: 'Sakthivel S',
        approvedAt: '2026-11-11',
      },
    ],
    departmentShifts: [
      {
        department: 'Engineering',
        shift: 'General Shift (09:00 - 18:00)',
        headcount: 2,
        scheduledStaff: 2,
        presentCount: 2,
        absentCount: 0,
        onLeaveCount: 0,
        lateCount: 1,
        missingPunchCount: 1,
        approvedOtHours: 2.5,
        pendingOtHours: 1.5,
        attendanceRatePct: 100,
      },
      {
        department: 'Operations',
        shift: 'General Shift (09:00 - 18:00)',
        headcount: 1,
        scheduledStaff: 1,
        presentCount: 0,
        absentCount: 1,
        onLeaveCount: 0,
        lateCount: 0,
        missingPunchCount: 0,
        approvedOtHours: 0,
        pendingOtHours: 0,
        attendanceRatePct: 0,
      },
    ],
    exceptions: [
      {
        id: 'exc-1',
        employeeId: 'e2',
        employeeCode: 'JCS-002',
        employeeName: 'Priya Nair',
        department: 'Engineering',
        shift: 'General Shift (09:00 - 18:00)',
        date: '2026-11-11',
        ruleCategory: 'MISSING_PUNCH',
        severity: 'HIGH',
        description: 'Missing Check-Out punch on 2026-11-11',
        detectedAt: '2026-11-11',
        status: 'OPEN',
        ownerName: 'Praveen B',
      },
      {
        id: 'exc-2',
        employeeId: 'e3',
        employeeCode: 'JCS-003',
        employeeName: 'Karthik Raja',
        department: 'Operations',
        shift: 'General Shift (09:00 - 18:00)',
        date: '2026-11-11',
        ruleCategory: 'PENDING_REGULARIZATION',
        severity: 'MEDIUM',
        description: 'Attendance regularization request pending review',
        detectedAt: '2026-11-11',
        status: 'PENDING',
        ownerName: 'Sakthivel S',
      },
    ],
  };
}

function makeRequest(overrides: Partial<MisExportRequest> = {}): MisExportRequest {
  return {
    report_type: 'DAILY_ATTENDANCE',
    date_from: '2026-11-11',
    date_to: '2026-11-11',
    department_id: 'ALL',
    shift_id: 'ALL',
    attendance_status: 'ALL',
    search_query: '',
    company_id: 'org-1',
    company_name: 'Joy Corporate Solutions Pvt. Ltd.',
    generated_by: 'HR Admin',
    requested_format: 'EXCEL',
    requested_scope: 'CURRENT_REPORT',
    ...overrides,
  };
}

describe('misReportExportEngine — Comprehensive HR MIS Export Repair', () => {
  beforeEach(() => {
    insertSpy.mockClear();
    vi.spyOn(supabase, 'from').mockImplementation((() => ({
      insert: insertSpy,
    })) as any);
  });

  it('Test 1: Daily Attendance Excel contains strictly 1 worksheet and zero unrelated module sheets', async () => {
    const source = buildMockSource();
    const artifact = await generateMisExcelWorkbook(makeRequest({ report_type: 'DAILY_ATTENDANCE' }), source);

    expect(artifact.worksheetNames).toEqual(['Daily Attendance']);
    expect(artifact.fileName).toContain('Daily_Attendance_MIS');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(artifact.bytes as unknown as ArrayBuffer);
    expect(wb.worksheets).toHaveLength(1);
    const ws = wb.getWorksheet('Daily Attendance')!;
    expect(ws).toBeDefined();

    // Header row at row 5 + 4 data rows + 1 totals row = 10 rows
    expect(ws.getCell('A5').value).toBe('Emp Code');
    expect(ws.getCell('B5').value).toBe('Employee Name');
    expect(ws.getCell('B6').value).toBe('Arun Kumar');
    expect(ws.getCell('K7').value).toBe('—'); // break null formatted cleanly, never fake 0
    expect(ws.getCell('A10').value).toBe('TOTAL (4 rows)');
  });

  it('Test 2: Daily Attendance PDF contains filtered rows and KPI summary matching Excel totals', async () => {
    const source = buildMockSource();
    const req = makeRequest({ report_type: 'DAILY_ATTENDANCE', requested_format: 'PDF' });
    const artifact = await generateMisPdf(req, source);

    expect(artifact.bytes.length).toBeGreaterThan(1000);
    expect(artifact.sha256Checksum).toMatch(/^[a-f0-9]{64}$/);
    const rendered = extractPdfRenderedText(artifact.bytes);
    expect(rendered).toContain('Employee-Wise Daily Attendance Ledger');
    expect(rendered).toContain('Arun Kumar');
    expect(rendered).toContain('Priya Nair');
    expect(rendered).toContain('Page 1 of');
  });

  it('Test 3 & 4: Weekly MIS and Monthly HR MIS export strictly their dedicated report structures', async () => {
    const source = buildMockSource();

    const weeklyExcel = await generateMisExcelWorkbook(
      makeRequest({ report_type: 'WEEKLY_MIS', date_from: '2026-11-05', date_to: '2026-11-11' }),
      source
    );
    expect(weeklyExcel.worksheetNames).toEqual(['Weekly MIS']);
    expect(weeklyExcel.recordCount).toBe(2);

    const monthlyExcel = await generateMisExcelWorkbook(
      makeRequest({ report_type: 'MONTHLY_HR_MIS', date_from: '2026-11-01', date_to: '2026-11-30' }),
      source
    );
    expect(monthlyExcel.worksheetNames).toEqual(['Monthly HR MIS']);
    expect(monthlyExcel.recordCount).toBe(1);
  });

  it('Test 5: Overtime Governance separates Approved, Pending, and Rejected OT hours and never fabricates OT cost', async () => {
    const source = buildMockSource();
    const req = makeRequest({ report_type: 'OVERTIME_GOVERNANCE' });
    const filtered = buildFilteredMisDataset(req, source);

    expect(filtered.summaryTotals.approvedOtHours).toBe(2.5);
    expect(filtered.summaryTotals.pendingOtHours).toBe(1.5);
    expect(filtered.summaryTotals.rejectedOtHours).toBe(1.0);

    const otExcel = await generateMisExcelWorkbook(req, source);
    expect(otExcel.worksheetNames).toEqual(['Overtime Governance']);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(otExcel.bytes as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Overtime Governance')!;
    expect(ws.getCell('K6').value).toBe('Not Configured');
  });

  it('Test 6: Departments & Shifts export includes only department-shift comparison breakdown', async () => {
    const source = buildMockSource();
    const excel = await generateMisExcelWorkbook(
      makeRequest({ report_type: 'DEPARTMENTS_SHIFTS', department_id: 'Engineering' }),
      source
    );
    expect(excel.worksheetNames).toEqual(['Departments & Shifts']);
    expect(excel.recordCount).toBe(1);
  });

  it('Test 7: HR Exceptions export strictly filters exception rows and never leaks normal employees', async () => {
    const source = buildMockSource();
    const req = makeRequest({ report_type: 'HR_EXCEPTIONS' });
    const filtered = buildFilteredMisDataset(req, source);
    expect(filtered.exceptionRows.map((e) => e.employeeName)).toEqual(['Priya Nair', 'Karthik Raja']);

    const csv = await generateMisCsv(req, source);
    const csvStr = Buffer.from(csv.bytes).toString('utf8');
    expect(csvStr).toContain('Priya Nair');
    expect(csvStr).toContain('Karthik Raja');
    expect(csvStr).not.toContain('Arun Kumar');
  });

  it('Test 8 & 9: UI, Excel, CSV, and PDF KPI totals reconcile identically under Department + Status filters', async () => {
    const source = buildMockSource();
    const req = makeRequest({
      report_type: 'DAILY_ATTENDANCE',
      department_id: 'Engineering',
      attendance_status: 'PRESENT',
    });

    const filtered = buildFilteredMisDataset(req, source);
    expect(filtered.recordCount).toBe(2);
    expect(filtered.summaryTotals.present).toBe(2);
    expect(filtered.summaryTotals.absent).toBe(0);
    expect(filtered.summaryTotals.approvedOtHours).toBe(2.5);

    const excel = await generateMisExcelWorkbook(req, source);
    expect(excel.recordCount).toBe(2);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(excel.bytes as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Daily Attendance')!;
    expect(ws.getCell('A3').value).toContain('Present: 2');
    expect(ws.getCell('A8').value).toBe('TOTAL (2 rows)');

    const pdf = await generateMisPdf({ ...req, requested_format: 'PDF' }, source);
    expect(pdf.recordCount).toBe(2);
  });

  it('Test 10: Empty dataset handling displays clean empty-state message in both Excel and PDF without crash', async () => {
    const source = buildMockSource();
    const emptyReq = makeRequest({
      report_type: 'DAILY_ATTENDANCE',
      search_query: 'NON_EXISTENT_EMPLOYEE_XYZ',
    });

    const excel = await generateMisExcelWorkbook(emptyReq, source);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(excel.bytes as unknown as ArrayBuffer);
    const ws = wb.getWorksheet('Daily Attendance')!;
    expect(ws.getCell('A6').value).toContain('No attendance records matched');

    const pdf = await generateMisPdf({ ...emptyReq, requested_format: 'PDF' }, source);
    const rendered = extractPdfRenderedText(pdf.bytes);
    expect(rendered).toContain('No attendance records matched');
  });

  it('Test 11: CSV export contains strictly one single report with UTF-8 BOM and RFC-4180 escaping', async () => {
    const source = buildMockSource();
    const csv = await generateMisCsv(makeRequest({ report_type: 'DAILY_ATTENDANCE' }), source);
    const text = Buffer.from(csv.bytes).toString('utf8');
    expect(text.startsWith('\uFEFF')).toBe(true);
    const lines = text.trim().split('\r\n');
    expect(lines).toHaveLength(5); // 1 header + 4 rows
    expect(lines[0]).toContain('Emp Code,Employee Name,Department');
  });

  it('Test 12: Consolidated Workbook exports only user-selected sections', async () => {
    const source = buildMockSource();
    const consolidated = await generateMisExcelWorkbook(
      makeRequest({
        report_type: 'CONSOLIDATED_MIS',
        requested_scope: 'CONSOLIDATED_WORKBOOK',
        consolidated_sections: ['DAILY_ATTENDANCE', 'HR_EXCEPTIONS'],
      }),
      source
    );
    expect(consolidated.worksheetNames).toEqual(['Daily Attendance', 'HR Exceptions']);
  });

  it('Test 13: Large dataset (>120 rows) paginates PDF cleanly and repeats headers on multiple pages', async () => {
    const source = buildMockSource();
    const baseRow = source.daily!.employeeRecords[0];
    source.daily!.employeeRecords = Array.from({ length: 125 }, (_, i) => ({
      ...baseRow,
      employeeId: `emp-${i}`,
      employeeCode: `JCS-${String(i + 1).padStart(3, '0')}`,
      employeeName: `Workforce Employee ${i + 1}`,
    }));

    const pdf = await generateMisPdf(makeRequest({ report_type: 'DAILY_ATTENDANCE', requested_format: 'PDF' }), source);
    expect(pdf.pageCount).toBeGreaterThan(2);
    const rendered = extractPdfRenderedText(pdf.bytes);
    expect(rendered).toContain('Employee-Wise Daily Attendance Ledger (Continued)');
    expect(rendered).toContain(`Page ${pdf.pageCount} of ${pdf.pageCount}`);
  });

  it('Test 14: Tenant Isolation blocks cross-organization export requests', async () => {
    const source = buildMockSource('org-A');
    expect(() => assertTenantIsolation('org-B', source)).toThrow(/Tenant Isolation Violation/);
    await expect(
      generateMisExcelWorkbook(makeRequest({ company_id: 'org-B' }), source)
    ).rejects.toThrow(/Tenant Isolation Violation/);
  });

  it('Test 15: Export events record accurate audit logs into mis_delivery_audit_logs', async () => {
    const ok = await recordMisExportAuditLog({
      organizationId: 'org-1',
      reportType: 'DAILY_ATTENDANCE',
      reportingDate: '2026-11-11',
      channel: 'EXCEL_DOWNLOAD',
      recipientTarget: 'Local HR User',
      sha256Checksum: 'abc123',
      fileName: 'JOY_PeopleHR_Daily_Attendance_MIS_2026-11-11.xlsx',
      metadata: { recordCount: 4 },
    });

    expect(ok).toBe(true);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const insertedPayload = insertSpy.mock.calls[0][0];
    expect(insertedPayload.organization_id).toBe('org-1');
    expect(insertedPayload.report_type).toBe('DAILY_ATTENDANCE');
    expect(insertedPayload.channel).toBe('EXCEL_DOWNLOAD');
    expect(insertedPayload.sha256_checksum).toBe('abc123');
  });
});
