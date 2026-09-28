const { jsPDF } = require('jspdf');
const fs = require('fs');

function testGeneratePdf() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  
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
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('ENTERPRISE WORKFORCE MANAGEMENT & AUDIT SYSTEM', margin, y + 5);

  // Top Right Meta Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pageWidth - margin - 60, y - 4, 60, 16, 2, 2, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('REPORT DATE:', pageWidth - margin - 56, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text('19 Sep 2026', pageWidth - margin - 22, y + 2);

  doc.setFont('helvetica', 'bold');
  doc.text('GENERATED:', pageWidth - margin - 56, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text('09:00 AM', pageWidth - margin - 22, y + 7);

  y += 18;

  // Title Banner
  doc.setFillColor(6, 78, 59);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('DAILY ATTENDANCE MISS & EXCEPTION ESCALATION REPORT', margin + 6, y + 9);

  y += 20;

  // Executive Summary KPI Cards (2 rows of 4)
  const kpis = [
    { label: 'Scheduled', val: '128', bg: [241, 245, 249], text: [15, 23, 42] },
    { label: 'Recorded', val: '118', bg: [236, 253, 245], text: [4, 120, 87] },
    { label: 'Att. Missing', val: '10', bg: [254, 242, 242], text: [220, 38, 38] },
    { label: 'Missing Check-In', val: '3', bg: [255, 247, 237], text: [194, 65, 12] },
    { label: 'Missing Check-Out', val: '4', bg: [254, 243, 199], text: [180, 83, 9] },
    { label: 'Late Attendance', val: '8', bg: [254, 240, 138], text: [161, 98, 7] },
    { label: 'Pending Review', val: '4', bg: [238, 242, 255], text: [67, 56, 202] },
    { label: 'Approved Exceptions', val: '2', bg: [240, 253, 244], text: [22, 101, 52] },
  ];

  const cardW = (contentWidth - 9) / 4; // 4 cards per row, 3mm gaps
  const cardH = 13;

  kpis.forEach((kpi, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const cardX = margin + col * (cardW + 3);
    const cardY = y + row * (cardH + 3);

    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.val, cardX + 4, cardY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cardX + 4, cardY + 10);
  });

  y += (cardH * 2) + 10;

  // Department Section
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DEPARTMENT: ENGINEERING   |   MANAGER: RAJ KUMAR   |   TEAM LEAD: PRIYA SHARMA', margin + 4, y + 4.8);

  y += 9;

  // Table Headers
  const colWidths = [32, 34, 30, 26, 34, 26]; // Total = 182
  const headers = ['EMPLOYEE', 'DESIGNATION', 'SCHEDULED', 'ACTUAL', 'CASE TYPE', 'STATUS'];
  
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let curX = margin;
  headers.forEach((h, i) => {
    doc.text(h, curX + 2, y + 4.5);
    curX += colWidths[i];
  });

  y += 6.5;

  // Dummy Rows
  const dummyRows = [
    { emp: 'Arun V (EMP-1042)', des: 'Frontend Dev', sch: '09:00 - 18:00', act: '--:-- / --:--', case: 'Case 3: Both Missing', st: 'Pending Review', note: 'Observation: Absent 2 consecutive days. Needs immediate TL call.' },
    { emp: 'Divya M (EMP-1088)', des: 'QA Engineer', sch: '09:00 - 18:00', act: '--:-- / 18:05', case: 'Case 1: Missing Check-In', st: 'Remark Added', note: 'Remark: Divya reported biometric kiosk tap failed in morning.' },
    { emp: 'Karthik S (EMP-1102)', des: 'Backend Dev', sch: '09:00 - 18:00', act: '09:02 / --:--', case: 'Case 2: Missing Check-Out', st: 'Pending Review', note: 'Observation: Left office during power maintenance.' },
    { emp: 'Sneha R (EMP-1145)', des: 'UI/UX Designer', sch: '09:30 - 18:30', act: '10:14 / 18:32', case: 'Case 4: Late Check-In', st: 'Resolved', note: 'Observation: 44 mins late. Commute delay verified and approved.' }
  ];

  dummyRows.forEach((r, idx) => {
    // Row background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 12, 'F');
    }
    
    // Borders
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 12, margin + contentWidth, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    let cx = margin;
    doc.text(r.emp, cx + 2, y + 4.5);
    cx += colWidths[0];

    doc.setFont('helvetica', 'normal');
    doc.text(r.des, cx + 2, y + 4.5);
    cx += colWidths[1];

    doc.text(r.sch, cx + 2, y + 4.5);
    cx += colWidths[2];

    doc.text(r.act, cx + 2, y + 4.5);
    cx += colWidths[3];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(194, 65, 12);
    doc.text(r.case, cx + 2, y + 4.5);
    cx += colWidths[4];

    doc.setTextColor(30, 58, 138);
    doc.text(r.st, cx + 2, y + 4.5);

    // Sub note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(r.note, margin + 4, y + 9);

    y += 12;
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
    doc.text('Joy People HR SaaS • Attendance Exception & Audit System • Confidential', margin, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 16, pageHeight - 7);
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync('scratch/test_report.pdf', pdfBuffer);
  console.log('PDF generated successfully, size:', pdfBuffer.length);
}

testGeneratePdf();
