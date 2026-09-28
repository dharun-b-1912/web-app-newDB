const { jsPDF } = require('jspdf');

const apiKey = 're_mock_dummy_resend_api_key_sanitized';
const targetEmail = 'thirumalairk28@gmail.com';

function generatePdfDoc() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  
  let y = margin;

  // 1. Top Brand Accent Line
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Header Area
  y = 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(6, 78, 59);
  doc.text('JOY PEOPLE HR', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ENTERPRISE WORKFORCE MANAGEMENT & AUDIT SYSTEM', margin, y + 4.5);

  // Top Right Meta Box
  const metaBoxW = 66;
  const metaBoxH = 17;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pageWidth - margin - metaBoxW, y - 4, metaBoxW, metaBoxH, 2, 2, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('REPORT DATE:', pageWidth - margin - metaBoxW + 4, y + 1.5);
  doc.setFont('helvetica', 'normal');
  doc.text('19 Sep 2026', pageWidth - margin - 26, y + 1.5);

  doc.setFont('helvetica', 'bold');
  doc.text('GENERATED AT:', pageWidth - margin - metaBoxW + 4, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('09:00 AM', pageWidth - margin - 26, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('AUDIT STATUS:', pageWidth - margin - metaBoxW + 4, y + 11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(194, 65, 12);
  doc.text('EXCEPTIONS FLAGGED', pageWidth - margin - 34, y + 11.5);

  y += 18;

  // Title Banner
  doc.setFillColor(6, 78, 59);
  doc.roundedRect(margin, y, contentWidth, 13, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('DAILY ATTENDANCE MISS & EXCEPTION ESCALATION REPORT', margin + 6, y + 8.5);

  y += 18;

  // Executive Summary KPI Cards (2 rows of 4)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. EXECUTIVE ATTENDANCE METRICS SUMMARY', margin, y);
  y += 4;

  const kpis = [
    { label: 'Scheduled Employees', val: '128', bg: [241, 245, 249], text: [15, 23, 42] },
    { label: 'Attendance Recorded', val: '118', bg: [236, 253, 245], text: [4, 120, 87] },
    { label: 'Attendance Missing', val: '10', bg: [254, 242, 242], text: [220, 38, 38] },
    { label: 'Missing Check-In', val: '3', bg: [255, 247, 237], text: [194, 65, 12] },
    { label: 'Missing Check-Out', val: '4', bg: [254, 243, 199], text: [180, 83, 9] },
    { label: 'Late Attendance', val: '8', bg: [254, 240, 138], text: [161, 98, 7] },
    { label: 'Pending Review', val: '4', bg: [238, 242, 255], text: [67, 56, 202] },
    { label: 'Approved Exceptions', val: '2', bg: [240, 253, 244], text: [22, 101, 52] },
  ];

  const cardW = (contentWidth - 9) / 4;
  const cardH = 13;

  kpis.forEach((kpi, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const cardX = margin + col * (cardW + 3);
    const cardY = y + row * (cardH + 2.5);

    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.val, cardX + 3.5, cardY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cardX + 3.5, cardY + 10);
  });

  y += cardH * 2 + 8;

  // Department Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. HIERARCHICAL AUDIT BREAKDOWN (DEPARTMENT -> MANAGER -> TL)', margin, y);
  y += 5;

  const colWidths = [34, 32, 28, 26, 36, 26];
  const tableHeaders = ['EMPLOYEE', 'DESIGNATION', 'SCHEDULED', 'ACTUAL', 'EXCEPTION CASE', 'AUDIT STATUS'];

  // Squad Header
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('DEPT: ENGINEERING   |   MANAGER: RAJ KUMAR   |   TL: PRIYA SHARMA (4 Issues)', margin + 3, y + 4.8);
  y += 7.5;

  // Header row
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let curX = margin;
  tableHeaders.forEach((h, i) => {
    doc.text(h, curX + 2, y + 4.5);
    curX += colWidths[i];
  });
  y += 6.5;

  const rows = [
    { emp: 'Arun V', code: 'EMP-1042', des: 'Frontend Dev', sch: '09:00 - 18:00', act: '--:-- / --:--', case: 'Case 3: Both Missing', st: 'Pending Review', note: 'System: Absent 2 consecutive days. Needs immediate supervisor call.' },
    { emp: 'Divya M', code: 'EMP-1088', des: 'QA Engineer', sch: '09:00 - 18:00', act: '--:-- / 18:05', case: 'Case 1: Missing Check-In', st: 'Remark Added', note: 'Supervisor Remark (Priya): Divya reported kiosk tap timeout. Working on fix.' },
    { emp: 'Karthik S', code: 'EMP-1102', des: 'Backend Dev', sch: '09:00 - 18:00', act: '09:02 / --:--', case: 'Case 2: Missing Check-Out', st: 'Pending Review', note: 'System: Check-in valid. Missing out-punch. TL follow-up pending.' },
    { emp: 'Sneha R', code: 'EMP-1145', des: 'UI/UX Designer', sch: '09:30 - 18:30', act: '10:14 / 18:32', case: 'Case 4: Late Check-In', st: 'Resolved', note: 'Supervisor Remark (Raj): 44 mins late. Metro transit disruption approved.' }
  ];

  rows.forEach((r, idx) => {
    const rowHeight = 13;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    let cx = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(r.emp, cx + 2, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(r.code, cx + 2, y + 7.5);
    cx += colWidths[0];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(r.des, cx + 2, y + 5.2);
    cx += colWidths[1];

    doc.text(r.sch, cx + 2, y + 5.2);
    cx += colWidths[2];

    const isMiss = r.act.includes('--:--');
    doc.setTextColor(isMiss ? 220 : 15, isMiss ? 38 : 23, 42);
    doc.text(r.act, cx + 2, y + 5.2);
    cx += colWidths[3];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(194, 65, 12);
    doc.text(r.case, cx + 2, y + 5.2);
    cx += colWidths[4];

    doc.setTextColor(r.st === 'Resolved' ? 22 : 67, r.st === 'Resolved' ? 101 : 56, r.st === 'Resolved' ? 52 : 202);
    doc.text(r.st, cx + 2, y + 5.2);

    // Note line
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`* ${r.note}`, margin + 3, y + 10.8);

    y += rowHeight;
  });

  y += 8;

  // Sign-off section
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('3. COMPLIANCE SIGN-OFF & SUPERVISOR VERIFICATION AUDIT', margin + 4, y + 5.5);

  const signBoxW = (contentWidth - 12) / 3;
  const signY = y + 9;
  const roles = [
    { title: 'TEAM LEAD / SUPERVISOR', desc: 'Verified roster & shift entries' },
    { title: 'REPORTING MANAGER', desc: 'Approved attendance exceptions' },
    { title: 'HEAD OF HR / ADMIN', desc: 'Finalized for payroll audit' },
  ];

  roles.forEach((rl, i) => {
    const sx = margin + 3 + i * (signBoxW + 3);
    doc.setDrawColor(203, 213, 225);
    doc.rect(sx, signY, signBoxW, 18, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text(rl.title, sx + 2.5, signY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(rl.desc, sx + 2.5, signY + 7);
    doc.setDrawColor(148, 163, 184);
    doc.line(sx + 2.5, signY + 13.5, sx + signBoxW - 2.5, signY + 13.5);
    doc.setFontSize(5);
    doc.text('Signature & Date Stamp', sx + 2.5, signY + 16.5);
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Joy People HR • Confidential Operational Attendance Miss & Exception Audit Report', margin, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
  }

  return doc;
}

async function sendEmailWithPdfAttachment() {
  console.log(`[DISPATCH] Generating A4 PDF report and sending to ${targetEmail}...`);

  const pdfDoc = generatePdfDoc();
  const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));
  const base64 = pdfBuffer.toString('base64');
  console.log(`[PDF] Generated A4 PDF, size: ${pdfBuffer.length} bytes`);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Attendance Miss Report</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #0f172a; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 720px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 16px 36px rgba(0,0,0,0.25);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #064e3b 0%, #07563D 50%, #022c22 100%); padding: 32px; text-align: left;">
        <div style="display: inline-block; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.25); border-radius: 999px; padding: 4px 14px; font-size: 11px; font-weight: 800; color: #6ee7b7; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 12px;">
          ⚡ JOY PEOPLE HR • ESCALATION &amp; AUDIT SYSTEM
        </div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff;">
          Attendance Miss Report
        </h1>
        <div style="font-size: 13px; font-weight: 600; color: #a7f3d0; margin-top: 6px;">
          Attendance Exception &amp; Missing Attendance Report • 19 Sep 2026
        </div>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 28px 32px;">
        <!-- PDF Attachment Callout -->
        <div style="margin-bottom: 22px; padding: 14px 18px; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 14px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="width: 44px; vertical-align: middle;">
                <div style="width: 40px; height: 40px; background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">
                  📄
                </div>
              </td>
              <td style="padding-left: 14px; vertical-align: middle;">
                <div style="font-size: 13px; font-weight: 800; color: #166534;">
                  📎 Print-Ready PDF Attachment Included (JoyPeopleHR-Attendance-Miss-Report-19-Sep-2026.pdf)
                </div>
                <div style="font-size: 11px; color: #15803d; margin-top: 3px;">
                  An authoritative vector A4 PDF report is attached to this email for instant one-click printing, physical signing, and official audit compliance.
                </div>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #334155; margin: 0 0 18px 0; line-height: 1.5;">
          Dear <strong>Thirumalai R K</strong>,<br/>
          Please find below the consolidated executive miss report for today. An official print-ready PDF document has also been attached to this email for offline review and signature sign-offs.
        </p>

        <!-- Executive Summary Cards -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-collapse: collapse;">
          <tr>
            <td width="24%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #64748b;">SCHEDULED</div>
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">128</div>
            </td>
            <td width="2%"></td>
            <td width="24%" style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #065f46;">RECORDED</div>
              <div style="font-size: 20px; font-weight: 800; color: #047857; margin-top: 4px;">118</div>
            </td>
            <td width="2%"></td>
            <td width="24%" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #991b1b;">MISSING</div>
              <div style="font-size: 20px; font-weight: 800; color: #dc2626; margin-top: 4px;">10</div>
            </td>
            <td width="2%"></td>
            <td width="24%" style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #92400e;">LATE</div>
              <div style="font-size: 20px; font-weight: 800; color: #b45309; margin-top: 4px;">8</div>
            </td>
          </tr>
        </table>

        <!-- Hierarchy Box -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
            🏢 Engineering Squad &bull; Manager: Raj Kumar &bull; TL: Priya Sharma
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
            4 flagged attendance exceptions requiring supervisor attention
          </div>

          <table border="0" cellpadding="8" cellspacing="0" width="100%" style="font-size: 12px; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <tr style="background: #f1f5f9; font-weight: 800; color: #334155; font-size: 11px;">
              <td>EMPLOYEE</td>
              <td>SCHEDULED</td>
              <td>ACTUAL</td>
              <td>CASE TYPE</td>
              <td>STATUS</td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td><strong>Arun V</strong> (EMP-1042)</td>
              <td>09:00 - 18:00</td>
              <td style="color: #dc2626;">--:-- / --:--</td>
              <td><span style="color: #c2410c; font-weight: 700;">Both Missing</span></td>
              <td><span style="color: #4338ca; font-weight: 700;">Pending Review</span></td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td><strong>Divya M</strong> (EMP-1088)</td>
              <td>09:00 - 18:00</td>
              <td style="color: #c2410c;">--:-- / 18:05</td>
              <td><span style="color: #c2410c; font-weight: 700;">Missing Check-In</span></td>
              <td><span style="color: #047857; font-weight: 700;">Remark Added</span></td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td><strong>Karthik S</strong> (EMP-1102)</td>
              <td>09:00 - 18:00</td>
              <td style="color: #c2410c;">09:02 / --:--</td>
              <td><span style="color: #c2410c; font-weight: 700;">Missing Check-Out</span></td>
              <td><span style="color: #4338ca; font-weight: 700;">Pending Review</span></td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td><strong>Sneha R</strong> (EMP-1145)</td>
              <td>09:30 - 18:30</td>
              <td style="color: #b45309;">10:14 / 18:32</td>
              <td><span style="color: #b45309; font-weight: 700;">Late (44m)</span></td>
              <td><span style="color: #15803d; font-weight: 700;">Resolved</span></td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://joypeoplehr.com/attendance" target="_blank" style="display: inline-block; background: #07563D; color: #ffffff; padding: 13px 32px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 10px;">
            Open Attendance Miss Console &rarr;
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 18px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
        &copy; 2026 Joy People HR &bull; Automated Attendance Miss &amp; Audit Escalation Dispatcher
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      from: 'Joy PeopleHR <noreply@joypeoplehr.com>',
      to: [targetEmail],
      subject: '📎 [PDF Attached] Daily Attendance Miss Report — 19 Sep 2026 (Ready for Print)',
      html,
      attachments: [
        {
          filename: 'JoyPeopleHR-Attendance-Miss-Report-19-Sep-2026.pdf',
          content: base64,
        },
      ],
    }),
  });

  const data = await res.json();
  console.log('[STATUS]: HTTP', res.status);
  console.log('[RESPONSE]:', JSON.stringify(data, null, 2));

  if (res.status === 200) {
    console.log(`\n🎉 SUCCESS! Attendance Miss Report with PDF attachment delivered to ${targetEmail}! ID: ${data.id}`);
  } else {
    console.error('Dispatch failed:', data);
  }
}

sendEmailWithPdfAttachment().catch(console.error);
