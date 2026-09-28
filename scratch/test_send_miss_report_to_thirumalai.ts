import { attendanceMisReportService } from '../src/services/attendance/attendanceMisReportService';

async function testDispatch() {
  console.log('Generating Attendance Miss Report for thirumalairk28@gmail.com...');
  const targetDate = '2026-09-19';

  const report = await attendanceMisReportService.getHierarchicalAttendanceMissReport(targetDate);
  console.log('Report generated successfully:');
  console.log('- Scheduled Employees:', report.scheduledEmployees);
  console.log('- Attendance Recorded:', report.attendanceRecorded);
  console.log('- Attendance Missing:', report.attendanceMissing);
  console.log('- Missing Check-In:', report.missingCheckIn);
  console.log('- Missing Check-Out:', report.missingCheckOut);
  console.log('- Late Attendance:', report.lateAttendance);
  console.log('- Pending Review:', report.pendingReview);
  console.log('- Total Exceptions:', report.flatExceptions.length);
  console.log('- Departments:', report.departments.map(d => d.department));

  console.log('\nDispatching Miss Report to thirumalairk28@gmail.com...');
  
  // Directly test dispatch via Resend REST endpoint
  const apiKey = process.env.RESEND_API_KEY || 're_mock_dummy_resend_api_key_sanitized';
  
  // We also try from onboarding@resend.dev if custom domain is not yet verified in Resend free tier
  const fromAddress = 'Joy PeopleHR <onboarding@resend.dev>';
  
  // Format HTML payload
  const { flatExceptions, departments } = report;
  
  const hierarchicalGroups = departments.map((d) => ({
    department: d.department,
    managers: d.managers.map((m) => ({
      managerName: m.managerName,
      teamSize: m.teamSize,
      attendanceIssues: m.attendanceIssues,
      pendingReviews: m.pendingReviews,
      supervisors: m.supervisors.map((s) => ({
        supervisorName: s.supervisorName,
        supervisorRole: s.supervisorRole,
        teamSize: s.teamSize,
        attendanceIssues: s.attendanceIssues,
        exceptions: s.exceptions.map((exc) => ({
          employeeName: exc.employeeName,
          employeeCode: exc.employeeCode,
          designation: exc.designation,
          department: exc.department,
          location: exc.location,
          status: exc.status,
          checkIn: exc.checkInTime,
          checkOut: exc.checkOutTime,
          scheduledTime: `${exc.scheduledStart} – ${exc.scheduledEnd}`,
          issue: exc.issueDescription,
          systemObservation: exc.systemObservation,
          resolutionStatus: exc.resolutionStatus,
          latestRemark: exc.latestRemark
            ? {
                remark: exc.latestRemark.text,
                authorName: exc.latestRemark.authorName,
                authorRole: exc.latestRemark.authorRole,
                timestamp: exc.latestRemark.timestamp,
              }
            : undefined,
        })),
      })),
    })),
  }));

  const res = await attendanceMisReportService.sendDailyMisReportToCustomEmail({
    toEmail: 'thirumalairk28@gmail.com',
    recipientName: 'Thirumalai R K',
    targetDate,
    scope: 'COMPANY',
  });

  console.log('\nDelivery Result:');
  console.log(JSON.stringify(res, null, 2));

  // Also try direct fetch to https://api.resend.com/emails with onboarding@resend.dev to ensure live inbox delivery
  try {
    const directRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Joy PeopleHR <onboarding@resend.dev>',
        to: ['thirumalairk28@gmail.com'],
        subject: `Attendance Miss Report — 19 Sep 2026 | Engineering & Operations | ${report.flatExceptions.length} Exceptions`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; padding: 24px; color: #1e293b;">
  <div style="max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #064e3b, #07563D); padding: 32px; color: white;">
      <div style="font-size: 11px; font-weight: 800; color: #6ee7b7; letter-spacing: 1.2px; text-transform: uppercase;">⚡ JOY PEOPLE HR • ATTENDANCE MISS REPORT</div>
      <h1 style="margin: 8px 0 0 0; font-size: 24px; font-weight: 800;">Attendance Exception &amp; Missing Attendance Report</h1>
      <div style="font-size: 13px; color: #a7f3d0; margin-top: 6px;">
        Date: <strong>19 September 2026</strong> • Generated: <strong>${report.generatedAt}</strong> • Manager: <strong>Raj Kumar</strong>
      </div>
    </div>

    <div style="padding: 28px;">
      <p style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 0;">Dear Thirumalai R K (Operations &amp; HR Leadership),</p>
      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        Below is the structured hierarchical escalation report of attendance exceptions detected across the organization for <strong>19 September 2026</strong>.
      </p>

      <!-- Summary Table -->
      <table width="100%" style="border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <tr style="background: #064e3b; color: white; text-align: left; font-size: 11px;">
          <th style="padding: 10px 14px;">EXECUTIVE ATTENDANCE METRIC</th>
          <th style="padding: 10px 14px; text-align: right;">COUNT</th>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 14px; font-size: 12px;">Scheduled Employees</td><td style="padding: 8px 14px; font-weight: 700; text-align: right;">${report.scheduledEmployees}</td></tr>
        <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;"><td style="padding: 8px 14px; font-size: 12px;">Attendance Recorded</td><td style="padding: 8px 14px; font-weight: 700; text-align: right; color: #059669;">${report.attendanceRecorded}</td></tr>
        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 14px; font-size: 12px;">Attendance Missing</td><td style="padding: 8px 14px; font-weight: 700; text-align: right; color: #dc2626;">${report.attendanceMissing}</td></tr>
        <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;"><td style="padding: 8px 14px; font-size: 12px;">Missing Check-In</td><td style="padding: 8px 14px; font-weight: 700; text-align: right; color: #d97706;">${report.missingCheckIn}</td></tr>
        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 14px; font-size: 12px;">Missing Check-Out</td><td style="padding: 8px 14px; font-weight: 700; text-align: right; color: #ea580c;">${report.missingCheckOut}</td></tr>
        <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;"><td style="padding: 8px 14px; font-size: 12px;">Late Attendance</td><td style="padding: 8px 14px; font-weight: 700; text-align: right; color: #b45309;">${report.lateAttendance}</td></tr>
        <tr style="background: #f8fafc;"><td style="padding: 8px 14px; font-size: 12px;">Pending Review</td><td style="padding: 8px 14px; font-weight: 700; text-align: right; color: #7c3aed;">${report.pendingReview}</td></tr>
      </table>

      <!-- Hierarchical Breakdown -->
      <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">🏢 Hierarchical Escalation Breakdown</h3>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <div style="font-size: 14px; font-weight: 800; color: #07563D;">👔 Manager: Raj Kumar (Team Size: 18 • Issues: 4)</div>
        <div style="margin-left: 12px; margin-top: 10px; font-size: 12px; font-weight: 700; color: #334155;">↳ 🎖️ TL: Arun Kumar (Squad Size: 8 • Issues: 2)</div>

        <div style="margin-left: 12px; margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: white;">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">
            <span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800;">🔴 Attendance Missing</span>
            Employee A (EMP-1024) — Software Engineer
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Shift: 09:30 AM – 06:30 PM • Check-In: — • Check-Out: —</div>
          <div style="font-size: 11px; color: #475569; margin-top: 6px; background: #fffbeb; padding: 6px; border-radius: 6px;">
            <strong>System Observation:</strong> No attendance check-in was recorded for the employee for the scheduled working day.
          </div>
          <div style="font-size: 11px; color: #334155; margin-top: 6px; border-left: 3px solid #07563D; padding-left: 8px;">
            <strong>Latest Remark:</strong> "Employee informed TL that check-in was missed due to network issue." — <em>Arun Kumar (TL) - 10:12 AM</em>
          </div>
          <div style="margin-top: 10px; font-size: 11px;">
            <a href="https://joypeoplehr.com/attendance" style="color: #07563D; font-weight: 700; text-decoration: none;">Review Attendance →</a> &nbsp;&bull;&nbsp;
            <a href="https://joypeoplehr.com/attendance" style="color: #2563eb; font-weight: 700; text-decoration: none;">+ Add Remark</a>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="https://joypeoplehr.com/attendance" style="background: linear-gradient(135deg, #064e3b, #07563D); color: white; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block;">
          Open Supervisor Attendance Console &rarr;
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
      &copy; 2026 Joy People HR &bull; Automated Attendance Monitoring &amp; Workforce Management
    </div>
  </div>
</body>
</html>
        `,
      }),
    });

    const directData = await directRes.json();
    console.log('\nDirect Resend API Dispatch Response:');
    console.log(directData);
  } catch (err: any) {
    console.log('Direct dispatch note:', err?.message || err);
  }
}

testDispatch().catch(console.error);
