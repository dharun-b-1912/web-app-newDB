const apiKey = 're_mock_dummy_resend_api_key_sanitized';
const targetEmail = 'thirumalairk28@gmail.com';

async function sendAttendanceMissReport() {
  console.log(`[DISPATCH] Sending complete Attendance Miss Report to ${targetEmail}...`);

  const reportDate = '19 September 2026';
  const generatedAt = '19 September 2026, 09:00 AM';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attendance Miss Report</title>
</head>
<body style="margin: 0; padding: 28px 0; background-color: #0f172a; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 720px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 18px 40px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1);">
    
    <!-- 4. Report Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #064e3b 0%, #07563D 50%, #022c22 100%); padding: 34px 32px; text-align: left;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <div style="display: inline-block; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.25); border-radius: 999px; padding: 4px 14px; font-size: 11px; font-weight: 800; color: #6ee7b7; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 12px;">
                ⚡ JOY PEOPLE HR • ESCALATION &amp; AUDIT SYSTEM
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                Attendance Miss Report
              </h1>
              <div style="font-size: 13px; font-weight: 600; color: #a7f3d0; margin-top: 6px;">
                Attendance Exception &amp; Missing Attendance Report
              </div>
              
              <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.18); font-size: 11px; color: #d1fae5; line-height: 1.6;">
                <strong>Report Date:</strong> ${reportDate} &nbsp;&bull;&nbsp;
                <strong>Generated At:</strong> ${generatedAt}<br/>
                <strong>Reporting Period:</strong> ${reportDate} &nbsp;&bull;&nbsp;
                <strong>Department:</strong> Engineering &nbsp;&bull;&nbsp;
                <strong>Location:</strong> Coimbatore &nbsp;&bull;&nbsp;
                <strong>Reporting Manager:</strong> Raj Kumar
              </div>
            </td>
            <td align="right" valign="top" style="width: 70px;">
              <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.2); border-radius: 14px; text-align: center; line-height: 50px; font-size: 22px;">
                📊
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Area -->
    <tr>
      <td style="padding: 30px 32px; background: #ffffff;">
        <p style="margin: 0 0 6px 0; font-size: 15px; color: #0f172a; font-weight: 700;">
          Dear Thirumalai R K (Operations &amp; HR Management),
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #475569; line-height: 1.6;">
          Below is the verified hierarchical escalation report of employees whose attendance was not properly recorded for <strong>${reportDate}</strong>.
        </p>

        <!-- 5. Executive Summary -->
        <div style="margin-bottom: 28px;">
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Executive Attendance Summary
          </div>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <thead>
              <tr style="background: #064e3b; color: #ffffff;">
                <th style="padding: 10px 14px; font-size: 11px; text-align: left; font-weight: 800; letter-spacing: 0.5px;">METRIC</th>
                <th style="padding: 10px 14px; font-size: 11px; text-align: right; font-weight: 800; letter-spacing: 0.5px;">COUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Scheduled Employees</td>
                <td style="padding: 9px 14px; font-size: 12px; font-weight: 800; text-align: right; color: #0f172a;">42</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
                <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Attendance Recorded</td>
                <td style="padding: 9px 14px; font-size: 12px; font-weight: 800; text-align: right; color: #059669;">36</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Attendance Missing</td>
                <td style="padding: 9px 14px; font-size: 12px; font-weight: 800; text-align: right; color: #dc2626;">4</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
                <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Missing Check-In</td>
                <td style="padding: 9px 14px; font-size: 12px; font-weight: 800; text-align: right; color: #d97706;">1</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Missing Check-Out</td>
                <td style="padding: 9px 14px; font-size: 12px; font-weight: 800; text-align: right; color: #ea580c;">1</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
                <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Late Attendance</td>
                <td style="padding: 9px 14px; font-size: 12px; font-weight: 800; text-align: right; color: #b45309;">3</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Pending Review</td>
                <td style="padding: 9px 14px; font-size: 12px; font-weight: 800; text-align: right; color: #7c3aed;">2</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td style="padding: 9px 14px; font-size: 12px; color: #334155;">Approved Exceptions (Leaves)</td>
                <td style="padding: 9px 14px; font-size: 12px; font-weight: 800; text-align: right; color: #2563eb;">1</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 6. Hierarchical Breakdown (Crucial UX Requirement - No flat tables) -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; margin-bottom: 4px;">
            🏢 Hierarchical Exception Breakdown
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">
            Department: <strong>Engineering</strong> (Coimbatore)
          </div>

          <!-- Manager Level -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 18px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
              <tr>
                <td>
                  <span style="font-size: 15px; font-weight: 800; color: #0f172a;">👔 Manager: Raj Kumar</span>
                </td>
                <td align="right" style="font-size: 11px; font-weight: 700; color: #475569;">
                  Team Size: <strong style="color: #0f172a;">18</strong> &nbsp;&bull;&nbsp;
                  Attendance Issues: <strong style="color: #dc2626;">4</strong> &nbsp;&bull;&nbsp;
                  Pending Reviews: <strong style="color: #7c3aed;">2</strong>
                </td>
              </tr>
            </table>

            <!-- Team Lead Level -->
            <div style="margin-left: 10px; margin-bottom: 18px;">
              <div style="font-size: 13px; font-weight: 800; color: #07563D; margin-bottom: 10px;">
                ↳ 🎖️ Team Lead (TL): Arun Kumar &nbsp;
                <span style="font-size: 11px; font-weight: 600; color: #64748b;">(Team Size: 8 &bull; Attendance Issues: 2)</span>
              </div>

              <!-- Employee A Card -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <span style="background-color: #fee2e2; color: #dc2626; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; display: inline-block; margin-bottom: 6px;">
                        🔴 Missing Check-In
                      </span>
                      <div style="font-size: 14px; font-weight: 800; color: #0f172a;">Employee A <span style="font-size: 11px; color: #64748b; font-weight: normal;">(EMP-1024)</span></div>
                      <div style="font-size: 11px; color: #64748b;">Software Engineer &bull; Engineering &bull; Coimbatore</div>
                    </td>
                    <td align="right" valign="top" style="font-size: 11px; font-weight: 600; color: #64748b;">
                      Shift: 09:30 AM – 06:30 PM
                    </td>
                  </tr>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px; background: #f8fafc; border-radius: 8px; padding: 8px 12px;">
                  <tr>
                    <td style="font-size: 11px; color: #475569;"><strong>Check-In:</strong> —</td>
                    <td style="font-size: 11px; color: #475569;"><strong>Check-Out:</strong> —</td>
                    <td style="font-size: 11px; color: #dc2626;"><strong>Issue:</strong> No check-in recorded</td>
                    <td style="font-size: 11px; color: #7c3aed;"><strong>Status:</strong> Pending Review</td>
                  </tr>
                </table>

                <div style="margin-top: 8px; font-size: 11px; color: #475569; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 8px 10px;">
                  <strong>System Observation (09:45 AM):</strong> No attendance check-in was recorded for the employee for the scheduled working day.
                </div>

                <!-- 9. Remarks & Audit History -->
                <div style="margin-top: 10px; padding: 8px 12px; background-color: #f8fafc; border-left: 3px solid #07563D; border-radius: 4px; font-size: 11px;">
                  <div style="font-weight: 700; color: #0f172a;">Latest Remark — Arun Kumar (TL) [10:12 AM]:</div>
                  <div style="color: #334155; margin-top: 2px;">"Employee informed supervisor that check-in was missed due to network/device issue."</div>
                  <div style="color: #64748b; font-size: 10px; margin-top: 4px;">10:30 AM — Raj Kumar (Manager): Requested attendance correction</div>
                </div>

                <!-- 17. Actions From Email -->
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #e2e8f0; font-size: 11px;">
                  <a href="https://joypeoplehr.com/attendance" target="_blank" style="color: #07563D; font-weight: 700; text-decoration: none; margin-right: 14px;">Review Attendance &rarr;</a>
                  <a href="https://joypeoplehr.com/attendance" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: none; margin-right: 14px;">+ Add Remark</a>
                  <a href="https://joypeoplehr.com/attendance" target="_blank" style="color: #059669; font-weight: 700; text-decoration: none;">Approve Correction</a>
                </div>
              </div>

              <!-- Employee B Card -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <span style="background-color: #ffedd5; color: #c2410c; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; display: inline-block; margin-bottom: 6px;">
                        🟠 Missing Check-Out
                      </span>
                      <div style="font-size: 14px; font-weight: 800; color: #0f172a;">Employee B <span style="font-size: 11px; color: #64748b; font-weight: normal;">(EMP-1088)</span></div>
                      <div style="font-size: 11px; color: #64748b;">Frontend Developer &bull; Engineering</div>
                    </td>
                    <td align="right" valign="top" style="font-size: 11px; font-weight: 600; color: #64748b;">
                      Shift: 09:30 AM – 06:30 PM
                    </td>
                  </tr>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px; background: #f8fafc; border-radius: 8px; padding: 8px 12px;">
                  <tr>
                    <td style="font-size: 11px; color: #475569;"><strong>Check-In:</strong> 09:12 AM</td>
                    <td style="font-size: 11px; color: #475569;"><strong>Check-Out:</strong> —</td>
                    <td style="font-size: 11px; color: #c2410c;"><strong>Issue:</strong> Checkout missing</td>
                    <td style="font-size: 11px; color: #7c3aed;"><strong>Status:</strong> Pending Review</td>
                  </tr>
                </table>

                <div style="margin-top: 8px; font-size: 11px; color: #475569; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 8px 10px;">
                  <strong>System Observation:</strong> Employee checked in at 09:12 AM but did not record biometric checkout.
                </div>
              </div>
            </div>

            <!-- Supervisor Level -->
            <div style="margin-left: 10px;">
              <div style="font-size: 13px; font-weight: 800; color: #07563D; margin-bottom: 10px;">
                ↳ 🎖️ Supervisor: Priya S &nbsp;
                <span style="font-size: 11px; font-weight: 600; color: #64748b;">(Team Size: 5 &bull; Attendance Issues: 1)</span>
              </div>

              <!-- Employee C Card -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <span style="background-color: #fef9c3; color: #854d0e; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; display: inline-block; margin-bottom: 6px;">
                        🟡 Late Check-In
                      </span>
                      <div style="font-size: 14px; font-weight: 800; color: #0f172a;">Employee C <span style="font-size: 11px; color: #64748b; font-weight: normal;">(EMP-1132)</span></div>
                      <div style="font-size: 11px; color: #64748b;">QA Engineer &bull; Engineering</div>
                    </td>
                    <td align="right" valign="top" style="font-size: 11px; font-weight: 600; color: #64748b;">
                      Shift: 09:30 AM – 06:30 PM
                    </td>
                  </tr>
                </table>

                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px; background: #f8fafc; border-radius: 8px; padding: 8px 12px;">
                  <tr>
                    <td style="font-size: 11px; color: #475569;"><strong>Check-In:</strong> 10:18 AM</td>
                    <td style="font-size: 11px; color: #475569;"><strong>Check-Out:</strong> 06:42 PM</td>
                    <td style="font-size: 11px; color: #b45309;"><strong>Issue:</strong> Late by 48 min</td>
                    <td style="font-size: 11px; color: #059669;"><strong>Status:</strong> Verified</td>
                  </tr>
                </table>
              </div>
            </div>

          </div>
        </div>

        <!-- 17. Main CTA Action Button -->
        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 32px auto 14px auto;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #064e3b, #07563D); border-radius: 12px; box-shadow: 0 6px 18px rgba(7, 86, 61, 0.35);">
              <a href="https://joypeoplehr.com/attendance" target="_blank" style="display: inline-block; padding: 14px 38px; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; letter-spacing: 0.2px;">
                Open Supervisor Attendance Console &rarr;
              </a>
            </td>
          </tr>
        </table>
        <div style="text-align: center; font-size: 11px; color: #94a3b8;">
          Review attendance exceptions, add remarks, or approve regularizations directly from the console.
        </div>
      </td>
    </tr>

    <!-- 24. Final Email Footer -->
    <tr>
      <td style="padding: 22px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0; font-weight: 700; color: #334155;">Joy People HR &bull; Automated Attendance Monitoring &amp; Workforce Management</p>
        <p style="margin: 4px 0 0 0; color: #94a3b8;">
          This is an automated notification generated by Joy People HR.<br/>
          For questions or attendance corrections, please contact your reporting manager or HR/Admin.
        </p>
        <p style="margin: 8px 0 0 0; font-weight: 600; color: #475569;">&copy; ${new Date().getFullYear()} Joy People HR</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Joy PeopleHR <noreply@joypeoplehr.com>',
        to: [targetEmail],
        subject: `Attendance Miss Report — 19 Sep 2026 | Engineering | 4 Exceptions`,
        html,
      }),
    });

    const data = await res.json();
    console.log(`[STATUS]: HTTP ${res.status}`);
    console.log('[RESPONSE]:', JSON.stringify(data, null, 2));

    if (res.ok) {
      console.log(`\n SUCCESS! Attendance Miss Report successfully delivered to ${targetEmail} with Delivery ID: ${data.id}`);
    } else {
      console.error('\n Delivery failed:', data);
    }
  } catch (err) {
    console.error('Fatal dispatch error:', err);
  }
}

sendAttendanceMissReport();
