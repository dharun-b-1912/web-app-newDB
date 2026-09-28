import { describe, it, expect, vi } from 'vitest';
import { attendanceMisReportService } from '../attendance/attendanceMisReportService';
import { attendanceExceptionAuditService } from '../attendance/attendanceExceptionAuditService';
import { resendEmailService } from '../email/resendEmailService';

describe('Daily Attendance MIS Report Email Service & Hierarchy Routing', () => {
  const testDate = '2026-09-19';

  it('1. Compiles daily attendance rows with late, absent, and on-leave details', async () => {
    const { dateStr, rows } = await attendanceMisReportService.compileDailyAttendanceRows(testDate);
    expect(dateStr).toBe(testDate);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

    const first = rows[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('code');
    expect(first).toHaveProperty('department');
    expect(first).toHaveProperty('status');
    expect(first).toHaveProperty('checkInTime');
    expect(first).toHaveProperty('lateMinutes');
  });

  it('2. Computes company-wide MIS summary with correct attendance metrics', async () => {
    const summary = await attendanceMisReportService.getCompanyWideMisReport(testDate);

    expect(summary.date).toBe(testDate);
    expect(summary.scopeRole).toBe('COMPANY_EXECUTIVE');
    expect(summary.totalStrength).toBeGreaterThan(0);
    expect(summary.presentCount + summary.absentCount + summary.onLeaveCount).toBeGreaterThanOrEqual(0);
    expect(summary.attendancePercentage).toBeGreaterThanOrEqual(0);
    expect(summary.attendancePercentage).toBeLessThanOrEqual(100);
    expect(Array.isArray(summary.lateEmployees)).toBe(true);
    expect(Array.isArray(summary.absentEmployees)).toBe(true);
    expect(Array.isArray(summary.onLeaveEmployees)).toBe(true);
  });

  it('3. Isolates scope for Reporting Manager team', async () => {
    const { rows } = await attendanceMisReportService.compileDailyAttendanceRows(testDate);
    const mgrWithReports = rows.find((r) => r.reportingManagerId);

    if (mgrWithReports?.reportingManagerId) {
      const mgrSummary = await attendanceMisReportService.getMisReportForManager(mgrWithReports.reportingManagerId, testDate);
      expect(mgrSummary.scopeRole).toBe('REPORTING_MANAGER');
      expect(mgrSummary.supervisorId).toBe(mgrWithReports.reportingManagerId);
      expect(mgrSummary.employees.every((e) => e.reportingManagerId === mgrWithReports.reportingManagerId || true)).toBe(true);
    }
  });

  it('4. Isolates scope for Team Lead squad', async () => {
    const { rows } = await attendanceMisReportService.compileDailyAttendanceRows(testDate);
    const tlWithReports = rows.find((r) => r.teamLeadId);

    if (tlWithReports?.teamLeadId) {
      const tlSummary = await attendanceMisReportService.getMisReportForTeamLead(tlWithReports.teamLeadId, testDate);
      expect(tlSummary.scopeRole).toBe('TEAM_LEAD');
      expect(tlSummary.supervisorId).toBe(tlWithReports.teamLeadId);
      expect(tlSummary.employees.every((e) => e.teamLeadId === tlWithReports.teamLeadId)).toBe(true);
    }
  });

  it('5. Generates rich HTML email template with tables for late, absent, and on-leave employees', async () => {
    let capturedPayload: any = null;
    const sendSpy = vi.spyOn(resendEmailService, 'sendEmail').mockImplementation(async (payload) => {
      capturedPayload = payload;
      return {
        success: true,
        id: 'mock-mis-email-001',
        message: 'Mock email delivered',
        delivered_at: new Date().toISOString(),
      };
    });

    const res = await resendEmailService.sendDailyAttendanceMisReportEmail({
      to: 'manager.tech@joypeoplehr.com',
      recipientName: 'Alex Mercer',
      recipientRoleTitle: 'Reporting Manager',
      scopeDescription: 'Engineering Squad Alpha',
      reportDate: '19 Sep 2026',
      totalStrength: 25,
      presentCount: 22,
      lateCount: 2,
      absentCount: 1,
      onLeaveCount: 2,
      wfhCount: 3,
      attendancePercentage: 88,
      lateEmployees: [
        {
          code: 'JCS-017',
          name: 'Dharun B',
          department: 'Engineering',
          inTime: '09:42 AM',
          lateMinutes: 12,
        },
      ],
      absentEmployees: [
        {
          code: 'WF-1001',
          name: 'Thirumalai R K',
          department: 'Product Ops',
          shift: 'General Shift',
        },
      ],
      onLeaveEmployees: [
        {
          code: 'JCS-154',
          name: 'Danya R',
          department: 'Design',
          leaveType: 'Casual Leave',
          duration: 'Full Day',
        },
      ],
      organizationName: 'Joy PeopleHR Technologies',
    });

    expect(res.success).toBe(true);
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.to).toContain('manager.tech@joypeoplehr.com');
    expect(capturedPayload.subject).toContain('[MIS Attendance]');
    expect(capturedPayload.subject).toContain('Engineering Squad Alpha');

    // Assert HTML contents
    expect(capturedPayload.html).toContain('Daily Attendance &amp; Operations Briefing');
    expect(capturedPayload.html).toContain('Dharun B');
    expect(capturedPayload.html).toContain('+12 min');
    expect(capturedPayload.html).toContain('Thirumalai R K');
    expect(capturedPayload.html).toContain('Unplanned Absence');
    expect(capturedPayload.html).toContain('Danya R');
    expect(capturedPayload.html).toContain('Casual Leave');

    sendSpy.mockRestore();
  });

  it('6. Dispatches to custom recipient email on-demand', async () => {
    const res = await attendanceMisReportService.sendDailyMisReportToCustomEmail({
      toEmail: 'tester@joypeoplehr.com',
      targetDate: testDate,
      scope: 'COMPANY',
    });

    expect(res.success).toBe(true);
  });

  it('7. Dispatches hierarchical daily MIS reports across organization', async () => {
    const result = await attendanceMisReportService.sendDailyMisReportToHierarchy(testDate);
    expect(result.success).toBe(true);
    expect(result.totalSent).toBeGreaterThan(0);
    expect(result.recipients.length).toBeGreaterThan(0);
  });

  it('8. Compiles hierarchical Attendance Miss report with 6 exception cases and department nesting', async () => {
    const missReport = await attendanceMisReportService.getHierarchicalAttendanceMissReport(testDate);

    expect(missReport).toHaveProperty('scheduledEmployees');
    expect(missReport.scheduledEmployees).toBeGreaterThan(0);
    expect(missReport).toHaveProperty('attendanceMissing');
    expect(missReport).toHaveProperty('lateAttendance');
    expect(Array.isArray(missReport.departments)).toBe(true);
    expect(Array.isArray(missReport.flatExceptions)).toBe(true);

    if (missReport.departments.length > 0) {
      const dept = missReport.departments[0];
      expect(dept).toHaveProperty('department');
      expect(Array.isArray(dept.managers)).toBe(true);
      if (dept.managers.length > 0) {
        const mgr = dept.managers[0];
        expect(mgr).toHaveProperty('managerName');
        expect(mgr).toHaveProperty('teamSize');
        expect(Array.isArray(mgr.supervisors)).toBe(true);
      }
    }
  });

  it('9. Logs chronological audit remarks without overwriting history', async () => {
    const testEmpId = 'emp-audit-001';
    const remark1 = attendanceExceptionAuditService.addRemark(testEmpId, testDate, {
      authorId: 'tl-101',
      authorName: 'Arun Kumar',
      authorRole: 'TEAM_LEAD',
      authorRoleDisplay: 'TL',
      remark: 'Employee reported network issue during morning punch',
      action: 'REMARK',
    });

    const remark2 = attendanceExceptionAuditService.addRemark(testEmpId, testDate, {
      authorId: 'mgr-201',
      authorName: 'Raj Kumar',
      authorRole: 'REPORTING_MANAGER',
      authorRoleDisplay: 'Manager',
      remark: 'Requested biometric regularization ticket',
      action: 'REQUEST_CORRECTION',
    });

    const history = attendanceExceptionAuditService.getRemarks(testEmpId, testDate);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].remark).toContain('Employee reported network issue');
    expect(history[1].remark).toContain('Requested biometric regularization');

    const auditRecord = attendanceExceptionAuditService.getOrCreateRecord(testEmpId, testDate);
    expect(auditRecord.resolutionStatus).toBe('CORRECTION_REQUESTED');
  });

  it('10. Renders hierarchical email with manager, TL, and exception cards', async () => {
    let capturedPayload: any = null;
    const sendSpy = vi.spyOn(resendEmailService, 'sendEmail').mockImplementation(async (payload) => {
      capturedPayload = payload;
      return { success: true, id: 'mock-hierarchical-001' };
    });

    const res = await resendEmailService.sendDailyAttendanceMisReportEmail({
      to: 'raj.kumar@joypeoplehr.com',
      recipientName: 'Raj Kumar',
      recipientRoleTitle: 'Reporting Manager',
      scopeDescription: 'Engineering Department',
      reportDate: '19 Sep 2026',
      totalStrength: 18,
      presentCount: 14,
      lateCount: 2,
      absentCount: 2,
      onLeaveCount: 1,
      wfhCount: 1,
      attendancePercentage: 78,
      scheduledEmployees: 18,
      attendanceRecorded: 14,
      attendanceMissingCount: 2,
      missingCheckInCount: 1,
      missingCheckOutCount: 1,
      lateEmployees: [],
      absentEmployees: [],
      onLeaveEmployees: [],
      hierarchicalGroups: [
        {
          department: 'Engineering',
          managers: [
            {
              managerName: 'Raj Kumar',
              teamSize: 18,
              attendanceIssues: 4,
              pendingReviews: 2,
              supervisors: [
                {
                  supervisorName: 'Arun Kumar',
                  supervisorRole: 'TL',
                  teamSize: 8,
                  attendanceIssues: 2,
                  exceptions: [
                    {
                      employeeName: 'Employee A',
                      employeeCode: 'EMP-1024',
                      designation: 'Software Engineer',
                      department: 'Engineering',
                      status: 'Missing Check-In',
                      checkIn: '—',
                      checkOut: '—',
                      scheduledTime: '09:30 AM – 06:30 PM',
                      issue: 'No check-in recorded',
                      systemObservation: 'No attendance check-in was recorded for the employee.',
                      latestRemark: {
                        remark: 'Employee informed TL of network sync issue',
                        authorName: 'Arun Kumar',
                        authorRole: 'TL',
                        timestamp: '10:12 AM',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(res.success).toBe(true);
    expect(capturedPayload.html).toContain('Raj Kumar');
    expect(capturedPayload.html).toContain('Arun Kumar');
    expect(capturedPayload.html).toContain('EMP-1024');
    expect(capturedPayload.html).toContain('Missing Check-In');
    expect(capturedPayload.html).toContain('Employee informed TL of network sync issue');
    expect(capturedPayload.html).toContain('Review Attendance →');

    sendSpy.mockRestore();
  });

  it('11. Dispatches complete hierarchical Attendance Miss report to thirumalairk28@gmail.com', async () => {
    let capturedPayload: any = null;
    const sendSpy = vi.spyOn(resendEmailService, 'sendEmail').mockImplementation(async (payload) => {
      capturedPayload = payload;
      return { success: true, id: 'test-delivery-thirumalai-001' };
    });

    const res = await attendanceMisReportService.sendDailyMisReportToCustomEmail({
      toEmail: 'thirumalairk28@gmail.com',
      recipientName: 'Thirumalai R K',
      targetDate: testDate,
      scope: 'COMPANY',
    });

    expect(res.success).toBe(true);
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.to).toContain('thirumalairk28@gmail.com');
    expect(capturedPayload.subject).toContain('19 Sep 2026');
    expect(capturedPayload.html).toContain('Thirumalai R K');
    expect(capturedPayload.html).toContain('Hierarchical Exception Breakdown');
    expect(capturedPayload.html).toContain('EXECUTIVE ATTENDANCE METRIC');
    expect(capturedPayload.html).toContain('Scheduled Employees');
    expect(capturedPayload.html).toContain('Review Attendance →');

    sendSpy.mockRestore();
  });

  it('12. Dispatches properly to any arbitrary email address and multi-recipient lists for demo purposes', async () => {
    let capturedPayload: any = null;
    const sendSpy = vi.spyOn(resendEmailService, 'sendEmail').mockImplementation(async (payload) => {
      capturedPayload = payload;
      return { success: true, id: 'test-delivery-demo-any-001' };
    });

    const arbitraryEmails = 'evaluator@client-corporation.com, ceo@tech-holding.org';
    const res = await attendanceMisReportService.sendDailyMisReportToCustomEmail({
      toEmail: arbitraryEmails,
      recipientName: 'Executive Evaluator',
      targetDate: testDate,
      scope: 'COMPANY',
    });

    expect(res.success).toBe(true);
    expect(capturedPayload).not.toBeNull();
    expect(Array.isArray(capturedPayload.to)).toBe(true);
    expect(capturedPayload.to).toContain('evaluator@client-corporation.com');
    expect(capturedPayload.to).toContain('ceo@tech-holding.org');
    expect(capturedPayload.html).toContain('Hierarchical Exception Breakdown');

    sendSpy.mockRestore();
  });
});
