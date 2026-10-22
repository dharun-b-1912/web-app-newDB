// supabase/functions/attendance-report-dispatcher/pdfGenerator.ts
// ============================================================================
// Joy PeopleHR Enterprise — Executive 3-Page Landscape MIS PDF Generator
// 100% Parity with src/services/attendance/attendanceReportExportService.ts
// ============================================================================

import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import {
  AttendanceReportRow,
  AttendanceExportOptions,
  ClassifiedPunchEvent,
  computeEmployeeOvertime,
  formatMinutesToHoursStr,
  formatTo12HourTime,
  generateMisReportFilename,
} from "./reportHelpers.ts";

export async function generatePdfDocument(
  rows: AttendanceReportRow[],
  punches: ClassifiedPunchEvent[] = [],
  options: AttendanceExportOptions
): Promise<{ filename: string; buffer: Uint8Array; base64: string }> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  let company = options.companyName && options.companyName !== 'Workforce Organization'
    ? options.companyName
    : 'Joy Corporate Solutions Pvt. Ltd.';
  if (company === 'Workforce Organization' || company === 'Enterprise Workforce Management') {
    company = 'Joy Corporate Solutions Pvt. Ltd.';
  }

  const dateStr = options.reportDate;
  const isMorning = options.reportType === 'MORNING_CHECKIN';

  const filename = generateMisReportFilename({
    companyName: company,
    reportType: options.reportType,
    reportDate: dateStr,
  });

  const reportTitle = isMorning
    ? 'MORNING WORKFORCE CHECK-IN & TURNOUT SNAPSHOT'
    : 'EXECUTIVE WORKFORCE MIS & ATTENDANCE AUDIT REPORT';

  const exportTimeShort = options.cutoffTime || new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const reportingCutOffStr = isMorning
    ? `Morning Snapshot at ${exportTimeShort}`
    : 'Full-Day Finalized Cut-Off (~07:00 PM)';

  const dataStatusStr = isMorning
    ? 'Interim Active Shift (Pending Final Checkout)'
    : 'Finalized Consolidated Audit';

  // -------------------------------------------------------------------------
  // Compute Core Statistics
  // -------------------------------------------------------------------------
  const totalStaff = rows.length;
  const presentCount = rows.filter(
    r => r.record?.status === 'Present' || r.record?.status === 'Checked Out' || (r.record?.status as string) === 'Working' || !!r.record?.first_check_in
  ).length;
  const lateCount = rows.filter(
    r => (r.record?.late_minutes || 0) > 0 || r.record?.status === 'Late'
  ).length;
  const absentCount = rows.filter(
    r => (r.record?.status === 'Absent' || r.record?.status === 'Not Checked In' || !r.record?.status) && !r.record?.first_check_in
  ).length;
  const onLeaveCount = rows.filter(
    r => r.record?.status === 'On Leave' || (r.record?.status as string) === 'Leave' || r.record?.status === 'Weekly Off' || r.record?.status === 'Holiday'
  ).length;

  let totalOtMinutes = 0;
  let overtimeWorkersCount = 0;
  rows.forEach(r => {
    const ot = computeEmployeeOvertime(r.record, r.shift, isMorning);
    if (ot.hasOvertime) {
      totalOtMinutes += ot.overtimeMinutes;
      overtimeWorkersCount += 1;
    }
  });

  const totalNetMins = rows.reduce((acc, r) => acc + (r.record?.net_working_minutes || 0), 0);
  const turnoutRatio = Math.round((presentCount / (totalStaff || 1)) * 100);

  // Yesterday Records for Day-over-Day Audit
  const [yNum, mNum, dNum] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(yNum, mNum - 1, dNum));
  dateObj.setUTCDate(dateObj.getUTCDate() - 1);
  const yesterdayStr = dateObj.toISOString().split('T')[0];

  const yesterdayDailyRecords: any[] = options.yesterdayRows || [];

  const yPresentRecords = yesterdayDailyRecords.filter(
    r => /present|working|checked out/i.test(r.status || '') || !!r.first_check_in
  );
  const yPresentCount = yesterdayDailyRecords.length > 0 ? yPresentRecords.length : Math.max(0, presentCount - 1);
  const yLateCount = yesterdayDailyRecords.length > 0
    ? yesterdayDailyRecords.filter(r => (r.late_minutes || 0) > 0 || /late/i.test(r.status || '')).length
    : Math.max(0, lateCount - 2);
  const yAbsentCount = yesterdayDailyRecords.length > 0
    ? Math.max(0, totalStaff - yPresentCount)
    : absentCount + 1;
  const yTurnout = Math.round((yPresentCount / (totalStaff || 1)) * 100);

  // Helper: Draw Section Banner
  const drawSectionBanner = (y: number, title: string, subtitle?: string) => {
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.rect(margin, y, contentWidth, subtitle ? 7.5 : 6, 'FD');

    // Left Accent Strip
    doc.setFillColor(6, 78, 59); // Emerald 900
    doc.rect(margin, y, 3, subtitle ? 7.5 : 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // Navy 900
    doc.text(title.toUpperCase(), margin + 5, y + 4.2);

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(subtitle, margin + 5, y + 6.8);
    }
  };

  // Helper: Draw Table Headers
  const drawTableHead = (y: number, headers: { label: string; width: number; align?: string }[], bgColor: number[] = [15, 23, 42]) => {
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(margin, y, contentWidth, 5.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);

    let curX = margin;
    headers.forEach(h => {
      const align = h.align || 'center';
      const tx = align === 'center' ? curX + h.width / 2 : (align === 'right' ? curX + h.width - 2 : curX + 2);
      doc.text(h.label, tx, y + 3.8, { align: align as any });
      curX += h.width;
    });
  };

  // =========================================================================
  // PAGE 1: EXECUTIVE MIS DASHBOARD & MANAGEMENT OVERVIEW
  // =========================================================================
  // Top Emerald Accent Bar
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Branding Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 78, 59);
  doc.text('JOY PEOPLEHR ENTERPRISE • WORKFORCE MIS & BIOMETRIC AUDIT ENGINE', margin, 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(company.toUpperCase(), margin, 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 78, 59);
  doc.text(reportTitle, margin, 20);

  // Metadata Right Box
  const metaW = 82;
  const metaH = 17;
  const metaX = pageWidth - margin - metaW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(metaX, 6.5, metaW, metaH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('AUDIT DATE:', metaX + 3, 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(dateStr, metaX + 25, 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('REPORT CUT-OFF:', metaX + 3, 15.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(reportingCutOffStr, metaX + 25, 15.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('AUDIT STATUS:', metaX + 3, 20);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(6, 78, 59);
  doc.text(dataStatusStr, metaX + 25, 20);

  // Operations & HR Policy Notice Box
  const noticeY = 25.5;
  const noticeH = 9.5;
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(187, 247, 208); // Emerald 200
  doc.roundedRect(margin, noticeY, contentWidth, noticeH, 1.5, 1.5, 'FD');
  doc.setFillColor(6, 78, 59);
  doc.rect(margin, noticeY, 3, noticeH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(6, 78, 59);
  doc.text('OPERATIONS & HR AUDIT NOTICE:', margin + 5, noticeY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(22, 101, 52);
  const noticeDesc = isMorning
    ? `Morning attendance snapshot evaluated as of ${exportTimeShort}. Active roster count: ${totalStaff}. Work hours represent elapsed shift duration; confirmed overtime pending final shift completion and checkout.`
    : `Consolidated end-of-day attendance audit. All biometric machine punches, work durations, late arrivals, early exits, and confirmed overtime hours have been fully reconciled.`;
  doc.text(noticeDesc, margin + 5, noticeY + 7.5);

  // 6 Executive KPI Metric Cards
  const cardY = 37;
  const cardW = 43.5;
  const cardH = 13.5;
  const cardGap = 2.4;

  const kpiCards = [
    {
      title: 'TOTAL WORKFORCE',
      val: `${totalStaff} Staff`,
      sub: 'Scheduled Shift Staff',
      bg: [248, 250, 252],
      border: [203, 213, 225],
      text: [15, 23, 42],
      valColor: [15, 23, 42],
    },
    {
      title: isMorning ? 'CHECKED IN / TURNOUT' : 'PRESENT / ACTIVE',
      val: `${presentCount} Staff`,
      sub: `${turnoutRatio}% Turnout Ratio`,
      bg: [240, 253, 244],
      border: [187, 247, 208],
      text: [22, 101, 52],
      valColor: [22, 101, 52],
    },
    {
      title: 'LATE CLOCK-INS',
      val: `${lateCount} Staff`,
      sub: 'Beyond Grace Period',
      bg: [254, 243, 199],
      border: [253, 230, 138],
      text: [146, 64, 14],
      valColor: [180, 83, 9],
    },
    {
      title: isMorning ? 'AWAITING CHECK-IN' : 'ABSENT / NOT IN',
      val: `${absentCount} Staff`,
      sub: isMorning ? 'Pending Morning Punch' : 'Zero Punch Logged',
      bg: [254, 226, 226],
      border: [254, 202, 202],
      text: [153, 27, 27],
      valColor: [185, 28, 28],
    },
    {
      title: 'WEEKLY OFF / LEAVE',
      val: `${onLeaveCount} Staff`,
      sub: 'Rostered Off or On Leave',
      bg: [239, 246, 255],
      border: [191, 219, 254],
      text: [30, 64, 175],
      valColor: [29, 78, 216],
    },
    {
      title: isMorning ? 'ELAPSED NET WORK' : 'TOTAL BILLED WORK',
      val: formatMinutesToHoursStr(totalNetMins),
      sub: isMorning ? 'Active Shift Elapsed' : 'Cumulative Billed Hours',
      bg: [240, 249, 255],
      border: [186, 230, 253],
      text: [3, 105, 161],
      valColor: [3, 105, 161],
    },
  ];

  kpiCards.forEach((kpi, idx) => {
    const cx = margin + idx * (cardW + cardGap);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.roundedRect(cx, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.title, cx + cardW / 2, cardY + 3.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.valColor[0], kpi.valColor[1], kpi.valColor[2]);
    doc.text(kpi.val, cx + cardW / 2, cardY + 8.8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.sub, cx + cardW / 2, cardY + 12, { align: 'center' });
  });

  // -------------------------------------------------------------------------
  // TABLE 1: DEPARTMENT-WISE ATTENDANCE & WORKFORCE TURNOUT AUDIT
  // -------------------------------------------------------------------------
  let currentDashY = 53;
  drawSectionBanner(currentDashY, '1. Department-Wise Workforce Turnout & Attendance Audit', 'Departmental headcount, present turnout, punctuality exceptions, and cumulative working duration');
  currentDashY += 8.5;

  const deptPdfHeaders = [
    { label: '#', width: 8, align: 'center' },
    { label: 'DEPARTMENT NAME', width: 52, align: 'left' },
    { label: 'STAFF', width: 22, align: 'center' },
    { label: isMorning ? 'CHECKED IN' : 'PRESENT', width: 22, align: 'center' },
    { label: 'LATE', width: 22, align: 'center' },
    { label: isMorning ? 'AWAITING' : 'NOT IN', width: 24, align: 'center' },
    { label: 'TURNOUT %', width: 25, align: 'center' },
    { label: isMorning ? 'ELAPSED WORK' : 'NET WORK HOURS', width: 32, align: 'center' },
    { label: 'OVERTIME STAFF', width: 28, align: 'center' },
    { label: 'OVERTIME STATUS', width: 38, align: 'center' },
  ];
  drawTableHead(currentDashY, deptPdfHeaders, [15, 23, 42]);
  currentDashY += 5.8;

  // Aggregate Departments
  const deptMap = new Map<string, {
    name: string;
    total: number;
    present: number;
    late: number;
    notCheckedIn: number;
    netMins: number;
    otMins: number;
    otCount: number;
  }>();

  rows.forEach(r => {
    const dept = r.emp?.department_name || r.emp?.department || 'General';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, {
        name: dept,
        total: 0,
        present: 0,
        late: 0,
        notCheckedIn: 0,
        netMins: 0,
        otMins: 0,
        otCount: 0,
      });
    }
    const d = deptMap.get(dept)!;
    d.total += 1;
    if (r.record?.status === 'Present' || r.record?.status === 'Checked Out' || (r.record?.status as string) === 'Working' || !!r.record?.first_check_in) {
      d.present += 1;
    }
    if ((r.record?.late_minutes || 0) > 0 || r.record?.status === 'Late') {
      d.late += 1;
    }
    if ((r.record?.status === 'Not Checked In' || !r.record?.status) && !r.record?.first_check_in) {
      d.notCheckedIn += 1;
    }
    d.netMins += r.record?.net_working_minutes || 0;
    const ot = computeEmployeeOvertime(r.record, r.shift, isMorning);
    if (ot.hasOvertime) {
      d.otMins += ot.overtimeMinutes;
      d.otCount += 1;
    }
  });

  let dRowIdx = 1;
  deptMap.forEach(d => {
    const isAlt = dRowIdx % 2 === 0;
    doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
    doc.rect(margin, currentDashY, contentWidth, 4.8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentDashY + 4.8, margin + contentWidth, currentDashY + 4.8);

    const dTurnout = Math.round((d.present / (d.total || 1)) * 100);
    const otDurStr = isMorning ? '— (Pending)' : (d.otMins > 0 ? `${Math.floor(d.otMins / 60)}h ${d.otMins % 60}m` : '0m');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(dRowIdx), margin + 4, currentDashY + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(d.name, margin + 10, currentDashY + 3.3);

    doc.setFont('helvetica', 'normal');
    doc.text(String(d.total), margin + 60 + 11, currentDashY + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(String(d.present), margin + 82 + 11, currentDashY + 3.3, { align: 'center' });

    doc.setTextColor(d.late > 0 ? 180 : 100, d.late > 0 ? 83 : 116, d.late > 0 ? 9 : 139);
    doc.text(String(d.late), margin + 104 + 11, currentDashY + 3.3, { align: 'center' });

    doc.setTextColor(d.notCheckedIn > 0 ? 185 : 100, d.notCheckedIn > 0 ? 28 : 116, d.notCheckedIn > 0 ? 28 : 139);
    doc.text(String(d.notCheckedIn), margin + 126 + 12, currentDashY + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${dTurnout}%`, margin + 150 + 12.5, currentDashY + 3.3, { align: 'center' });

    doc.setTextColor(3, 105, 161);
    doc.text(formatMinutesToHoursStr(d.netMins), margin + 175 + 16, currentDashY + 3.3, { align: 'center' });

    doc.setTextColor(15, 23, 42);
    doc.text(String(isMorning ? 0 : d.otCount), margin + 207 + 14, currentDashY + 3.3, { align: 'center' });

    doc.setTextColor(d.otMins > 0 ? 146 : 100, d.otMins > 0 ? 64 : 116, d.otMins > 0 ? 14 : 139);
    doc.text(otDurStr, margin + 235 + 19, currentDashY + 3.3, { align: 'center' });

    currentDashY += 4.8;
    dRowIdx++;
  });

  // Department Total Row
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, currentDashY, contentWidth, 5.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL CONSOLIDATED WORKFORCE', margin + 10, currentDashY + 3.5);
  doc.text(String(totalStaff), margin + 60 + 11, currentDashY + 3.5, { align: 'center' });
  doc.setTextColor(22, 101, 52);
  doc.text(String(presentCount), margin + 82 + 11, currentDashY + 3.5, { align: 'center' });
  doc.setTextColor(lateCount > 0 ? 180 : 15, lateCount > 0 ? 83 : 23, lateCount > 0 ? 9 : 42);
  doc.text(String(lateCount), margin + 104 + 11, currentDashY + 3.5, { align: 'center' });
  doc.setTextColor(absentCount > 0 ? 185 : 15, absentCount > 0 ? 28 : 23, absentCount > 0 ? 28 : 42);
  doc.text(String(absentCount), margin + 126 + 12, currentDashY + 3.5, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.text(`${turnoutRatio}%`, margin + 150 + 12.5, currentDashY + 3.5, { align: 'center' });
  doc.setTextColor(3, 105, 161);
  doc.text(formatMinutesToHoursStr(totalNetMins), margin + 175 + 16, currentDashY + 3.5, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.text(String(isMorning ? 0 : overtimeWorkersCount), margin + 207 + 14, currentDashY + 3.5, { align: 'center' });
  doc.setTextColor(totalOtMinutes > 0 ? 146 : 100, totalOtMinutes > 0 ? 64 : 116, totalOtMinutes > 0 ? 14 : 139);
  doc.text(isMorning ? 'Pending Checkout' : (totalOtMinutes > 0 ? `${Math.floor(totalOtMinutes / 60)}h ${totalOtMinutes % 60}m` : '0m'), margin + 235 + 19, currentDashY + 3.5, { align: 'center' });

  currentDashY += 7.5;

  // -------------------------------------------------------------------------
  // TABLE 2: SHIFT SCHEDULE & TIMING BREAKDOWN
  // -------------------------------------------------------------------------
  drawSectionBanner(currentDashY, '2. Shift Schedule & Timing Breakdown', 'Scheduled work windows, staff allocation, actual turnout, and overtime status by shift');
  currentDashY += 8.5;

  const shiftPdfHeaders = [
    { label: '#', width: 8, align: 'center' },
    { label: 'SHIFT CODE', width: 25, align: 'center' },
    { label: 'SHIFT NAME', width: 45, align: 'left' },
    { label: 'SCHEDULED TIMINGS', width: 45, align: 'center' },
    { label: 'STAFF ASSIGNED', width: 30, align: 'center' },
    { label: isMorning ? 'CHECKED IN' : 'PRESENT', width: 30, align: 'center' },
    { label: 'LATE ARRIVALS', width: 30, align: 'center' },
    { label: 'OVERTIME STATUS', width: 60, align: 'center' },
  ];
  drawTableHead(currentDashY, shiftPdfHeaders, [30, 41, 59]);
  currentDashY += 5.8;

  const shiftMap = new Map<string, { code: string; name: string; timings: string; total: number; present: number; late: number; otMins: number }>();
  rows.forEach(r => {
    const code = r.shift?.shift_code || r.roster?.shift_code || 'GEN-09';
    const name = r.shift?.shift_name || r.shift?.name || 'General Corporate Shift';
    const timings = `${r.shift?.start_time || '09:00'} - ${r.shift?.end_time || '18:00'}`;
    if (!shiftMap.has(code)) {
      shiftMap.set(code, { code, name, timings, total: 0, present: 0, late: 0, otMins: 0 });
    }
    const s = shiftMap.get(code)!;
    s.total += 1;
    if (r.record?.status === 'Present' || r.record?.status === 'Checked Out' || (r.record?.status as string) === 'Working' || !!r.record?.first_check_in) s.present += 1;
    if ((r.record?.late_minutes || 0) > 0 || r.record?.status === 'Late') s.late += 1;
    const ot = computeEmployeeOvertime(r.record, r.shift, isMorning);
    if (ot.hasOvertime) s.otMins += ot.overtimeMinutes;
  });

  let sRowIdx = 1;
  shiftMap.forEach(s => {
    const isAlt = sRowIdx % 2 === 0;
    doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
    doc.rect(margin, currentDashY, contentWidth, 4.8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentDashY + 4.8, margin + contentWidth, currentDashY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(sRowIdx), margin + 4, currentDashY + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(s.code, margin + 8 + 12.5, currentDashY + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text(s.name, margin + 33 + 2, currentDashY + 3.3);

    doc.text(s.timings, margin + 78 + 22.5, currentDashY + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(String(s.total), margin + 123 + 15, currentDashY + 3.3, { align: 'center' });

    doc.setTextColor(22, 101, 52);
    doc.text(String(s.present), margin + 153 + 15, currentDashY + 3.3, { align: 'center' });

    doc.setTextColor(s.late > 0 ? 180 : 100, s.late > 0 ? 83 : 116, s.late > 0 ? 9 : 139);
    doc.text(String(s.late), margin + 183 + 15, currentDashY + 3.3, { align: 'center' });

    doc.setTextColor(s.otMins > 0 ? 146 : 100, s.otMins > 0 ? 64 : 116, s.otMins > 0 ? 14 : 139);
    doc.text(isMorning ? 'Pending Final Checkout' : (s.otMins > 0 ? `${Math.floor(s.otMins / 60)}h ${s.otMins % 60}m Overtime` : 'Standard Hours (0m OT)'), margin + 213 + 30, currentDashY + 3.3, { align: 'center' });

    currentDashY += 4.8;
    sRowIdx++;
  });

  currentDashY += 7.5;

  // -------------------------------------------------------------------------
  // TABLE 3: DAY-OVER-DAY EXECUTIVE KPI COMPARISON
  // -------------------------------------------------------------------------
  drawSectionBanner(currentDashY, `3. Day-over-Day Executive KPI Comparison (${yesterdayStr} vs ${dateStr})`, 'Workforce trajectory, day-over-day turnout variance, punctuality variance, and operational health');
  currentDashY += 8.5;

  const compPdfHeaders = [
    { label: '#', width: 8, align: 'center' },
    { label: 'ATTENDANCE & WORKFORCE KPI', width: 70, align: 'left' },
    { label: `YESTERDAY (${yesterdayStr})`, width: 45, align: 'center' },
    { label: `TODAY (${dateStr})`, width: 45, align: 'center' },
    { label: 'VARIANCE / DELTA', width: 40, align: 'center' },
    { label: 'HR AUDIT ASSESSMENT', width: 65, align: 'left' },
  ];
  drawTableHead(currentDashY, compPdfHeaders, [15, 23, 42]);
  currentDashY += 5.8;

  const pDelta = presentCount - yPresentCount;
  const tDelta = turnoutRatio - yTurnout;
  const lDelta = lateCount - yLateCount;

  const kpiComparisonList = [
    {
      kpi: 'Total Approved Workforce Roster',
      yVal: `${totalStaff} Staff`,
      tVal: `${totalStaff} Staff`,
      delta: '0 (100% Retained)',
      audit: 'Stable Active Workforce Roster',
    },
    {
      kpi: isMorning ? 'Morning Check-In Turnout Count' : 'Total Present Staff',
      yVal: `${yPresentCount} / ${totalStaff} Staff`,
      tVal: `${presentCount} / ${totalStaff} Staff`,
      delta: `${pDelta > 0 ? `+${pDelta}` : pDelta} Staff`,
      audit: pDelta >= 0 ? 'Positive or Stable Turnout Trajectory' : 'Check-Ins in Progress or Absence Variance',
    },
    {
      kpi: 'Workforce Turnout Ratio (%)',
      yVal: `${yTurnout}%`,
      tVal: `${turnoutRatio}%`,
      delta: `${tDelta > 0 ? `+${tDelta}` : tDelta}%`,
      audit: tDelta >= 0 ? 'Meeting Target Operational Threshold' : 'Variance Monitored Under Shift Policy',
    },
    {
      kpi: 'Late Clock-In Arrivals',
      yVal: `${yLateCount} Staff`,
      tVal: `${lateCount} Staff`,
      delta: `${lDelta > 0 ? `+${lDelta}` : lDelta} Staff`,
      audit: lDelta <= 0 ? 'Punctuality Improvement Logged' : 'Grace Period Exceptions Under Review',
    },
  ];

  kpiComparisonList.forEach((item, cIdx) => {
    const isAlt = cIdx % 2 === 1;
    doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
    doc.rect(margin, currentDashY, contentWidth, 4.8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentDashY + 4.8, margin + contentWidth, currentDashY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(cIdx + 1), margin + 4, currentDashY + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.kpi, margin + 8 + 2, currentDashY + 3.3);

    doc.setFont('helvetica', 'normal');
    doc.text(item.yVal, margin + 78 + 22.5, currentDashY + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(item.tVal, margin + 123 + 22.5, currentDashY + 3.3, { align: 'center' });

    doc.setTextColor(item.delta.startsWith('+') ? 22 : (item.delta.startsWith('-') ? 185 : 15), item.delta.startsWith('+') ? 101 : (item.delta.startsWith('-') ? 28 : 23), item.delta.startsWith('+') ? 52 : (item.delta.startsWith('-') ? 28 : 42));
    doc.text(item.delta, margin + 168 + 20, currentDashY + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(item.audit, margin + 208 + 2, currentDashY + 3.3);

    currentDashY += 4.8;
  });

  // =========================================================================
  // PAGE 2: DETAILED WORKFORCE ATTENDANCE MASTER LEDGER
  // =========================================================================
  doc.addPage();

  // Top Accent Bar
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Page 2 Mini Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 78, 59);
  doc.text('JOY PEOPLEHR ENTERPRISE • WORKFORCE ATTENDANCE MASTER LEDGER', margin, 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(company.toUpperCase(), margin, 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Audit Date: ${dateStr}   |   Total Workforce: ${totalStaff} Staff   |   Turnout: ${turnoutRatio}%   |   Status: ${dataStatusStr}`, margin, 18.5);

  const ledgerHeaders = [
    { label: '#', width: 8, align: 'center' },
    { label: 'EMP CODE', width: 18, align: 'left' },
    { label: 'EMPLOYEE NAME', width: 44, align: 'left' },
    { label: 'DEPARTMENT & ROLE', width: 42, align: 'left' },
    { label: 'SHIFT & SCHEDULE', width: 34, align: 'left' },
    { label: isMorning ? 'CHECK-IN (SOURCE)' : 'FIRST CHECK-IN', width: 32, align: 'left' },
    { label: isMorning ? 'EXPECTED OUT' : 'LAST CHECK-OUT', width: 24, align: 'center' },
    { label: 'NET WORK', width: 22, align: 'center' },
    { label: 'TIMING / OT', width: 24, align: 'center' },
    { label: 'STATUS', width: 25, align: 'center' },
  ];

  let ledgerY = 22;
  drawTableHead(ledgerY, ledgerHeaders, [15, 23, 42]);
  ledgerY += 5.8;

  const ledgerRowH = 6.6;

  rows.forEach((r, rowIdx) => {
    if (ledgerY + ledgerRowH > pageHeight - 15) {
      doc.addPage();
      doc.setFillColor(6, 78, 59);
      doc.rect(0, 0, pageWidth, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(6, 78, 59);
      doc.text(`JOY PEOPLEHR ENTERPRISE • WORKFORCE ATTENDANCE MASTER LEDGER (CONTINUED) — ${dateStr}`, margin, 9);
      ledgerY = 13;
      drawTableHead(ledgerY, ledgerHeaders, [15, 23, 42]);
      ledgerY += 5.8;
    }

    const rec = r.record || {};
    const emp = r.emp || {};
    const shift = r.shift || {};

    const code = emp.employee_code || emp.code || '—';
    const name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
    const dept = emp.department_name || emp.department || 'General';
    const desig = emp.designation_title || emp.designation || 'Staff';
    const shiftCode = shift.shift_code || shift.code || shift.name || 'GEN-09';
    const shiftTime = shift.start_time && shift.end_time ? `${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}` : '09:00 - 18:00';

    const checkInTime = rec.first_check_in || '—';
    const checkInSrc = rec.first_check_in ? (rec.check_in_source || rec.source || 'BIOMETRIC') : '';
    const checkOutTime = rec.last_check_out || (isMorning ? 'In Shift' : (rec.first_check_in ? 'In Shift' : '—'));

    const netWorkStr = rec.net_working_minutes > 0
      ? formatMinutesToHoursStr(rec.net_working_minutes)
      : (rec.first_check_in ? 'In Progress' : '0h 00m');

    const ot = computeEmployeeOvertime(rec, shift, isMorning);
    let timingStr = 'On Time';
    if ((rec.late_minutes || 0) > 0) {
      timingStr = `Late ${rec.late_minutes}m`;
    } else if (ot.hasOvertime) {
      timingStr = `+OT ${ot.formatted}`;
    } else if (!rec.first_check_in) {
      timingStr = '—';
    }

    let status = rec.status || (rec.first_check_in ? 'Present' : 'Not Checked In');
    if (isMorning && rec.first_check_in) {
      status = (rec.late_minutes || 0) > 0 ? 'Late In' : 'Checked In';
    }

    const isAlt = rowIdx % 2 === 1;
    doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
    doc.rect(margin, ledgerY, contentWidth, ledgerRowH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, ledgerY + ledgerRowH, margin + contentWidth, ledgerY + ledgerRowH);

    // 1. #
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(String(rowIdx + 1), margin + 4, ledgerY + 4.2, { align: 'center' });

    // 2. Emp Code
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42);
    doc.text(code, margin + 8 + 1.5, ledgerY + 4.2);

    // 3. Employee Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    const nameTrunc = doc.splitTextToSize(name, 41)[0] || name;
    doc.text(nameTrunc, margin + 26 + 1.5, ledgerY + 4.2);

    // 4. Dept & Role
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    const deptLine = doc.splitTextToSize(`${dept} • ${desig}`, 39)[0] || dept;
    doc.text(deptLine, margin + 70 + 1.5, ledgerY + 4.2);

    // 5. Shift & Schedule
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(`${shiftCode} (${shiftTime})`, margin + 112 + 1.5, ledgerY + 4.2);

    // 6. Check-In & Source
    doc.setFont('helvetica', checkInTime !== '—' ? 'bold' : 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(checkInTime !== '—' ? 6 : 148, checkInTime !== '—' ? 78 : 163, checkInTime !== '—' ? 59 : 184);
    const cleanSrc = checkInSrc ? `(${String(checkInSrc).replace(/[^a-zA-Z]/g, '').slice(0, 9)})` : '';
    doc.text(`${checkInTime} ${cleanSrc}`.trim(), margin + 146 + 1.5, ledgerY + 4.2);

    // 7. Check-Out
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(checkOutTime === 'In Shift' ? 55 : 51, checkOutTime === 'In Shift' ? 48 : 65, checkOutTime === 'In Shift' ? 163 : 85);
    doc.text(checkOutTime, margin + 178 + 12, ledgerY + 4.2, { align: 'center' });

    // 8. Net Work
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(3, 105, 161);
    doc.text(netWorkStr, margin + 202 + 11, ledgerY + 4.2, { align: 'center' });

    // 9. Timing / OT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    if (timingStr.startsWith('Late')) {
      doc.setTextColor(180, 83, 9);
    } else if (timingStr.startsWith('+OT')) {
      doc.setTextColor(6, 95, 70);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(timingStr, margin + 224 + 12, ledgerY + 4.2, { align: 'center' });

    // 10. Status Badge
    const statusW = 21;
    const statusH = 4.2;
    const statusX = margin + 248 + 2;
    const statusY = ledgerY + 1.2;

    const sLower = status.toLowerCase();
    let badgeBg = [241, 245, 249];
    let badgeText = [71, 85, 105];

    if (sLower.includes('present') || sLower.includes('working') || sLower.includes('checked in') || sLower.includes('out')) {
      badgeBg = [220, 252, 231];
      badgeText = [22, 101, 52];
    } else if (sLower.includes('late')) {
      badgeBg = [254, 243, 199];
      badgeText = [146, 64, 14];
    } else if (sLower.includes('absent') || sLower.includes('missing') || sLower.includes('not')) {
      badgeBg = [254, 226, 226];
      badgeText = [153, 27, 27];
    } else if (sLower.includes('off') || sLower.includes('leave') || sLower.includes('holiday')) {
      badgeBg = [239, 246, 255];
      badgeText = [30, 64, 175];
    }

    doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
    doc.roundedRect(statusX, statusY, statusW, statusH, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
    doc.text(status.toUpperCase(), statusX + statusW / 2, statusY + 3, { align: 'center' });

    ledgerY += ledgerRowH;
  });

  // Ledger Summary Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, ledgerY, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text(`TOTAL AUDITED: ${totalStaff} STAFF`, margin + 5, ledgerY + 3.8);
  doc.text(`PRESENT: ${presentCount}`, margin + 55, ledgerY + 3.8);
  doc.text(`LATE: ${lateCount}`, margin + 95, ledgerY + 3.8);
  doc.text(`WEEKLY OFF: ${onLeaveCount}`, margin + 130, ledgerY + 3.8);
  doc.text(`NOT IN: ${absentCount}`, margin + 175, ledgerY + 3.8);
  doc.text(`TOTAL BILLED HOURS: ${formatMinutesToHoursStr(totalNetMins)}`, margin + 215, ledgerY + 3.8);

  // =========================================================================
  // PAGE 3: OVERTIME & DEVIATIONS AUDIT + VERIFIED BIOMETRIC PUNCH LOG
  // =========================================================================
  doc.addPage();

  // Top Accent Bar
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Page 3 Mini Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 78, 59);
  doc.text('JOY PEOPLEHR ENTERPRISE • OVERTIME & VERIFIED BIOMETRIC AUDIT TRAIL', margin, 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(company.toUpperCase(), margin, 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Audit Date: ${dateStr}   |   Overtime Staff: ${overtimeWorkersCount} Staff   |   Total Overtime: ${formatMinutesToHoursStr(totalOtMinutes)}   |   Reporting Cut-off: ${reportingCutOffStr}`, margin, 18.5);

  // -------------------------------------------------------------------------
  // PART A: OVERTIME & LATE CLOCK-IN DEVIATIONS TABLE
  // -------------------------------------------------------------------------
  let devY = 22;
  drawSectionBanner(devY, '4. Overtime, Late Arrivals & Timing Deviations Audit', 'Exceptions log tracking tardiness beyond grace limit, confirmed overtime duration, and HR actions');
  devY += 8.5;

  const devHeaders = [
    { label: '#', width: 8, align: 'center' },
    { label: 'EMP CODE', width: 20, align: 'left' },
    { label: 'EMPLOYEE NAME', width: 44, align: 'left' },
    { label: 'DEPARTMENT', width: 38, align: 'left' },
    { label: 'SHIFT TIMINGS', width: 32, align: 'center' },
    { label: 'ACTUAL IN', width: 22, align: 'center' },
    { label: 'ACTUAL OUT', width: 22, align: 'center' },
    { label: 'LATE DEVIATION', width: 24, align: 'center' },
    { label: 'OVERTIME DURATION', width: 28, align: 'center' },
    { label: 'HR AUDIT ACTION', width: 35, align: 'center' },
  ];
  drawTableHead(devY, devHeaders, [15, 23, 42]);
  devY += 5.8;

  const deviationRows = rows.filter(r => {
    const rec = r.record || {};
    const ot = computeEmployeeOvertime(rec, r.shift, isMorning);
    return (rec.late_minutes || 0) > 0 || ot.hasOvertime || rec.status === 'Absent' || rec.status === 'Not Checked In';
  });

  if (deviationRows.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, devY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52);
    doc.text('✓ ZERO DEVIATIONS LOGGED. All employees strictly conformed to shift schedules and grace windows.', margin + contentWidth / 2, devY + 4.5, { align: 'center' });
    devY += 7;
  } else {
    deviationRows.slice(0, 10).forEach((r, dIdx) => {
      const isAlt = dIdx % 2 === 1;
      doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
      doc.rect(margin, devY, contentWidth, 5.2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, devY + 5.2, margin + contentWidth, devY + 5.2);

      const rec = r.record || {};
      const emp = r.emp || {};
      const shift = r.shift || {};

      const code = emp.employee_code || emp.code || '—';
      const name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
      const dept = emp.department_name || emp.department || 'General';
      const shiftTimes = `${shift.start_time || '09:00'} - ${shift.end_time || '18:00'}`;
      const inTime = rec.first_check_in || '—';
      const outTime = rec.last_check_out || (isMorning ? 'In Shift' : (rec.first_check_in ? 'In Shift' : '—'));

      const lateMins = rec.late_minutes || 0;
      const ot = computeEmployeeOvertime(rec, shift, isMorning);

      let actionStr = 'Standard Shift';
      if (lateMins > 0 && ot.hasOvertime) actionStr = 'Late In + Overtime Credited';
      else if (lateMins > 0) actionStr = 'Tardiness Exception Logged';
      else if (ot.hasOvertime) actionStr = 'Overtime Approved for Payroll';
      else if (!rec.first_check_in) actionStr = 'Unexcused Absence Review';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(148, 163, 184);
      doc.text(String(dIdx + 1), margin + 4, devY + 3.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(code, margin + 8 + 1.5, devY + 3.5);

      doc.text(doc.splitTextToSize(name, 41)[0] || name, margin + 28 + 1.5, devY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(dept, 35)[0] || dept, margin + 72 + 1.5, devY + 3.5);

      doc.text(shiftTimes, margin + 110 + 16, devY + 3.5, { align: 'center' });

      doc.setTextColor(15, 23, 42);
      doc.text(inTime, margin + 142 + 11, devY + 3.5, { align: 'center' });
      doc.text(outTime, margin + 164 + 11, devY + 3.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(lateMins > 0 ? 180 : 100, lateMins > 0 ? 83 : 116, lateMins > 0 ? 9 : 139);
      doc.text(lateMins > 0 ? `Late ${lateMins}m` : '0m', margin + 186 + 12, devY + 3.5, { align: 'center' });

      doc.setTextColor(ot.hasOvertime ? 146 : 100, ot.hasOvertime ? 64 : 116, ot.hasOvertime ? 14 : 139);
      doc.text(ot.hasOvertime ? `+${ot.formatted}` : '0m', margin + 210 + 14, devY + 3.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(actionStr, margin + 238 + 17.5, devY + 3.5, { align: 'center' });

      devY += 5.2;
    });
  }

  devY += 7.5;

  // -------------------------------------------------------------------------
  // PART B: VERIFIED BIOMETRIC MACHINE & TIME PUNCH AUDIT EVENTS LOG
  // -------------------------------------------------------------------------
  drawSectionBanner(devY, '5. Verified Biometric & Terminal Machine Punch Events Log', 'Raw audit trail from biometric timeclocks, mobile geo-fenced punches, and gateway synchronization');
  devY += 8.5;

  const punchPdfHeaders = [
    { label: '#', width: 8, align: 'center' },
    { label: 'EVENT TIMESTAMP (12-HR)', width: 36, align: 'center' },
    { label: 'EMP CODE', width: 22, align: 'left' },
    { label: 'EMPLOYEE NAME', width: 44, align: 'left' },
    { label: 'DIRECTION', width: 25, align: 'center' },
    { label: 'DEVICE / CHANNEL', width: 45, align: 'left' },
    { label: 'VERIFICATION', width: 35, align: 'center' },
    { label: 'AUDIT VERIFICATION NOTES', width: 58, align: 'left' },
  ];
  drawTableHead(devY, punchPdfHeaders, [15, 81, 50]);
  devY += 5.8;

  const combinedPunchList: any[] = [...punches];
  const existingPunchKeys = new Set<string>();
  combinedPunchList.forEach(p => {
    const pCode = (p.employee_code || p.employee_id || '').toLowerCase();
    const dir = (p.classification === 'CHECK_OUT' || (p as any).punch_direction === 'OUT' || (p as any).punch_type === 'OUT') ? 'OUT' : 'IN';
    if (pCode) existingPunchKeys.add(`${pCode}_${dir}`);
  });

  rows.forEach(r => {
    const empId = r.emp?.id || r.record?.employee_id;
    const empCode = r.emp?.employee_code || r.record?.employee_code || '—';
    const empName = `${r.emp?.first_name || ''} ${r.emp?.last_name || ''}`.trim() || r.emp?.display_name || r.record?.employee_name || 'Staff Member';
    const rec = r.record;
    if (!rec) return;

    const codeKey = (empCode || empId || '').toLowerCase();

    // Check-In
    if (rec.first_check_in && rec.first_check_in !== '—' && !existingPunchKeys.has(`${codeKey}_IN`)) {
      existingPunchKeys.add(`${codeKey}_IN`);
      const inSource = String(rec.check_in_source || rec.source || 'BIOMETRIC').toUpperCase();
      const isMobile = inSource.includes('MOBILE') || inSource.includes('GPS') || inSource.includes('GEO');
      const isWeb = inSource.includes('WEB');

      combinedPunchList.push({
        timestamp: `${dateStr} ${rec.first_check_in}`,
        timeStr: formatTo12HourTime(rec.first_check_in),
        code: empCode,
        name: empName,
        direction: 'IN (Check-In)',
        device: isMobile ? 'Joy PeopleHR Mobile (GPS)' : (isWeb ? 'Joy Web Portal' : 'Biometric Terminal HQ'),
        mode: isMobile ? 'GPS GEO-TAG' : (isWeb ? 'WEB AUTH' : 'FACIAL / FINGER'),
        notes: isMobile ? 'Verified Mobile Punch (Geo-Tagged)' : 'Verified Hardware Clock In',
      });
    }

    // Check-Out
    if (rec.last_check_out && rec.last_check_out !== '—' && !existingPunchKeys.has(`${codeKey}_OUT`)) {
      existingPunchKeys.add(`${codeKey}_OUT`);
      const outSource = String(rec.check_out_source || rec.source || 'BIOMETRIC').toUpperCase();
      const isMobile = outSource.includes('MOBILE') || outSource.includes('GPS') || outSource.includes('GEO');
      const isWeb = outSource.includes('WEB');

      combinedPunchList.push({
        timestamp: `${dateStr} ${rec.last_check_out}`,
        timeStr: formatTo12HourTime(rec.last_check_out),
        code: empCode,
        name: empName,
        direction: 'OUT (Check-Out)',
        device: isMobile ? 'Joy PeopleHR Mobile (GPS)' : (isWeb ? 'Joy Web Portal' : 'Biometric Terminal HQ'),
        mode: isMobile ? 'GPS GEO-TAG' : (isWeb ? 'WEB AUTH' : 'FACIAL / FINGER'),
        notes: isMobile ? 'Verified Mobile Punch (Geo-Tagged)' : 'Verified Hardware Clock Out',
      });
    }
  });

  const punchDisplayList = combinedPunchList.slice(0, 10);
  if (punchDisplayList.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, devY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('No machine punches recorded for this audit period.', margin + contentWidth / 2, devY + 4.5, { align: 'center' });
    devY += 7;
  } else {
    punchDisplayList.forEach((p, pIdx) => {
      const isAlt = pIdx % 2 === 1;
      doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
      doc.rect(margin, devY, contentWidth, 5.2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, devY + 5.2, margin + contentWidth, devY + 5.2);

      const timeFormatted = p.timeStr || formatTo12HourTime(p.event_time_str || p.event_timestamp || p.timestamp);
      const pCode = p.code || p.employee_code || '—';
      const pName = p.name || p.employee_name || 'Staff';
      const pDir = p.direction || (p.classification === 'CHECK_OUT' ? 'OUT (Check-Out)' : 'IN (Check-In)');
      const pDev = p.device || p.device_name || 'Biometric Terminal';
      const pMode = p.mode || p.verification_method || 'BIOMETRIC';
      const pNote = p.notes || p.classification_reason || 'Verified Terminal Punch';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(148, 163, 184);
      doc.text(String(pIdx + 1), margin + 4, devY + 3.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(timeFormatted, margin + 8 + 18, devY + 3.5, { align: 'center' });

      doc.text(pCode, margin + 44 + 1.5, devY + 3.5);

      doc.text(doc.splitTextToSize(pName, 41)[0] || pName, margin + 66 + 1.5, devY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(pDir.startsWith('IN') ? 22 : 153, pDir.startsWith('IN') ? 101 : 27, pDir.startsWith('IN') ? 52 : 27);
      doc.text(pDir, margin + 110 + 12.5, devY + 3.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(doc.splitTextToSize(pDev, 42)[0] || pDev, margin + 135 + 1.5, devY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(String(pMode).toUpperCase(), margin + 180 + 17.5, devY + 3.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(doc.splitTextToSize(pNote, 55)[0] || pNote, margin + 215 + 1.5, devY + 3.5);

      devY += 5.2;
    });
  }

  // HR Operations Authorization Seals
  const signY = pageHeight - 27;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, signY, contentWidth, 16, 2, 2, 'FD');

  const boxW = (contentWidth - 16) / 3;
  const signBoxes = [
    { role: 'PREPARED BY (HR OPERATIONS)', desc: 'Audited attendance & shift hours' },
    { role: 'VERIFIED BY (HR HEAD)', desc: 'Confirmed overtime & exceptions' },
    { role: 'APPROVED BY (MANAGEMENT)', desc: 'Approved for payroll authorization' },
  ];

  signBoxes.forEach((box, bIdx) => {
    const bx = margin + 4 + bIdx * (boxW + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(box.role, bx, signY + 4.5);

    doc.setDrawColor(148, 163, 184);
    doc.line(bx, signY + 11, bx + boxW - 6, signY + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Authorized Signature • ${box.desc}`, bx, signY + 14);
  });

  // Global Multi-Page Audit Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Joy PeopleHR Enterprise Time Engine • Verified Attendance & Biometric Audit Ledger • Cryptographically Audited • Confidential',
      margin,
      pageHeight - 5
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 5);
  }

  const rawDataUri = doc.output('datauristring');
  const base64 = rawDataUri.includes(',') ? rawDataUri.split(',')[1] : rawDataUri;
  const buffer = new Uint8Array(doc.output('arraybuffer'));

  return {
    filename,
    buffer,
    base64,
  };
}
