// src/services/leave/leaveReportExportService.ts
// ============================================================================
// Joy Corporate Solutions Pvt. Ltd. — Enterprise Leave Reporting Engine
// Multi-Format Professional Excel (.xlsx) & CSV Generator
// 100% Real-Time Supabase Data Binding — Multi-Tenant Scoped
// ============================================================================

import ExcelJS from 'exceljs';
import { LeaveRequest, LeaveEntitlement, LeaveType, LeaveException } from '../../types/leave';

const BRAND_DARK_GREEN = '07563D';
const BRAND_LIGHT_GREEN = 'E8F5E9';
const BRAND_ACCENT = '2E7D32';
const GRAY_BORDER = 'E0E0E0';

function applyHeaderStyle(row: ExcelJS.Row, fillColor = BRAND_DARK_GREEN, textColor = 'FFFFFF') {
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillColor },
    };
    cell.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: textColor },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: GRAY_BORDER } },
      left: { style: 'thin', color: { argb: GRAY_BORDER } },
      bottom: { style: 'medium', color: { argb: BRAND_ACCENT } },
      right: { style: 'thin', color: { argb: GRAY_BORDER } },
    };
  });
}

function applyDataRowStyle(row: ExcelJS.Row, isEven: boolean) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 9 };
    cell.alignment = { vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: GRAY_BORDER } },
      left: { style: 'thin', color: { argb: GRAY_BORDER } },
      bottom: { style: 'thin', color: { argb: GRAY_BORDER } },
      right: { style: 'thin', color: { argb: GRAY_BORDER } },
    };
    if (isEven) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F9FAFB' },
      };
    }
  });
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 12;
    if (column.eachCell) {
      column.eachCell({ includeEmpty: false }, (cell) => {
        const cellVal = cell.value ? cell.value.toString() : '';
        if (cellVal.length > maxLength) {
          maxLength = Math.min(cellVal.length, 45);
        }
      });
    }
    column.width = maxLength + 3;
  });
}

export interface LeaveExportData {
  requests: LeaveRequest[];
  entitlements: LeaveEntitlement[];
  leaveTypes: LeaveType[];
  exceptions: LeaveException[];
}

export interface LeaveExportOptions {
  selectedMonth?: string;
  selectedDept?: string;
  organizationName?: string;
}

export const leaveReportExportService = {
  /**
   * Generates a 5-sheet corporate Master Excel (.xlsx) workbook for Leave Management
   */
  async exportComprehensiveWorkbook(
    data: LeaveExportData,
    options: LeaveExportOptions = {},
    filenamePrefix = 'Joy_Corporate_Leave_Master_Report'
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = options.organizationName || 'Joy Corporate Solutions Pvt. Ltd.';
    workbook.lastModifiedBy = 'Joy HR Operations';
    workbook.created = new Date();

    const todayStr = new Date().toISOString().split('T')[0];
    const monthFilter = options.selectedMonth && options.selectedMonth !== 'All' ? options.selectedMonth : null;
    const deptFilter = options.selectedDept && options.selectedDept !== 'All' ? options.selectedDept : null;

    // Filter requests
    const filteredRequests = data.requests.filter((r) => {
      const matchMonth = !monthFilter || (r.from_date && r.from_date.startsWith(monthFilter)) || (r.to_date && r.to_date.startsWith(monthFilter));
      const matchDept = !deptFilter || r.department_name === deptFilter;
      return matchMonth && matchDept;
    });

    // Filter entitlements
    const filteredEntitlements = data.entitlements.filter((e) => {
      return !deptFilter || e.department_name === deptFilter;
    });

    // =========================================================================
    // SHEET 1: Detailed Monthly Leave Register (Who Took Leave & Absenteeism)
    // =========================================================================
    const sheet1 = workbook.addWorksheet('Detailed Leave Register', {
      views: [{ state: 'frozen', ySplit: 3, showGridLines: true }],
    });

    sheet1.mergeCells('A1:L1');
    const titleCell1 = sheet1.getCell('A1');
    titleCell1.value = `${(options.organizationName || 'JOY CORPORATE SOLUTIONS PVT. LTD.').toUpperCase()} — DETAILED LEAVE REGISTER (WHO TOOK LEAVE)`;
    titleCell1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK_GREEN } };
    titleCell1.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(1).height = 36;

    sheet1.mergeCells('A2:L2');
    const subCell1 = sheet1.getCell('A2');
    subCell1.value = `Official Employee Leave Register | Scope: ${monthFilter || 'Full Year 2026'} | Department: ${deptFilter || 'All Departments'} | Total Requests: ${filteredRequests.length}`;
    subCell1.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '374151' } };
    subCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT_GREEN } };
    subCell1.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(2).height = 20;

    sheet1.addRow([
      'Request Code',
      'Employee Code',
      'Employee Name',
      'Department',
      'Designation',
      'Leave Type',
      'From Date',
      'To Date',
      'Duration (Days)',
      'Reason',
      'Approval Status',
      'Approver / Authority',
    ]);
    applyHeaderStyle(sheet1.getRow(3));

    filteredRequests.forEach((r, idx) => {
      const row = sheet1.addRow([
        r.request_code || `LR-${r.id.slice(0, 6)}`,
        r.employee_code || 'EMP',
        r.employee_name,
        r.department_name,
        r.designation || 'Staff',
        `${r.leave_type_name} (${r.leave_type_code})`,
        r.from_date,
        r.to_date,
        r.leave_days_deducted || r.total_calendar_days,
        r.reason || 'Not specified',
        r.status,
        r.approved_by_name || r.manager_name || 'Management',
      ]);
      applyDataRowStyle(row, idx % 2 === 1);

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'center' };
      row.getCell(9).alignment = { horizontal: 'right' };
      row.getCell(11).alignment = { horizontal: 'center' };

      const statusCell = row.getCell(11);
      if (r.status === 'Approved') {
        statusCell.font = { color: { argb: '2E7D32' }, bold: true };
      } else if (r.status === 'Pending') {
        statusCell.font = { color: { argb: 'D97706' }, bold: true };
      } else if (r.status === 'Rejected') {
        statusCell.font = { color: { argb: 'DC2626' }, bold: true };
      }
    });

    autoFitColumns(sheet1);

    // =========================================================================
    // SHEET 2: Department-Wise Breakdown & Absence Summary Rollup
    // =========================================================================
    const sheet2 = workbook.addWorksheet('Department Absence Rollup', {
      views: [{ state: 'frozen', ySplit: 3, showGridLines: true }],
    });

    sheet2.mergeCells('A1:I1');
    const titleCell2 = sheet2.getCell('A1');
    titleCell2.value = `${(options.organizationName || 'JOY CORPORATE SOLUTIONS PVT. LTD.').toUpperCase()} — DEPARTMENT-WISE LEAVE BREAKDOWN & ABSENCE SUMMARY`;
    titleCell2.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK_GREEN } };
    titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet2.getRow(1).height = 36;

    sheet2.mergeCells('A2:I2');
    const subCell2 = sheet2.getCell('A2');
    subCell2.value = `Department Headcount, Casual/Sick/Earned Leave Consumption, Average Days per Employee, and Available Reserves`;
    subCell2.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '374151' } };
    subCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT_GREEN } };
    subCell2.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet2.getRow(2).height = 20;

    sheet2.addRow([
      'Department Name',
      'Active Headcount',
      'CL Taken (Days)',
      'SL Taken (Days)',
      'EL Taken (Days)',
      'Total Leave Days Taken',
      'Avg Leave Days / Employee',
      'Total Available Reserves',
      'Department Capacity Status',
    ]);
    applyHeaderStyle(sheet2.getRow(3));

    const allDepts = Array.from(new Set([
      ...filteredEntitlements.map((e) => e.department_name),
      ...filteredRequests.map((r) => r.department_name),
    ])).filter(Boolean).sort();

    allDepts.forEach((dept, idx) => {
      const deptEnts = filteredEntitlements.filter((e) => e.department_name === dept);
      const deptReqs = filteredRequests.filter((r) => r.department_name === dept);
      const empIds = new Set(deptEnts.map((e) => e.employee_id));
      const headcount = empIds.size || 1;

      const cl = deptReqs.filter((r) => r.status === 'Approved' && (r.leave_type_code || '').toUpperCase() === 'CL').reduce((s, r) => s + (r.leave_days_deducted || 0), 0);
      const sl = deptReqs.filter((r) => r.status === 'Approved' && (r.leave_type_code || '').toUpperCase() === 'SL').reduce((s, r) => s + (r.leave_days_deducted || 0), 0);
      const el = deptReqs.filter((r) => r.status === 'Approved' && (r.leave_type_code || '').toUpperCase() === 'EL').reduce((s, r) => s + (r.leave_days_deducted || 0), 0);
      const totalTaken = cl + sl + el;
      const avg = headcount > 0 ? (totalTaken / headcount).toFixed(1) : '0.0';
      const totalAvail = deptEnts.reduce((s, e) => s + (e.available_balance || 0), 0);

      const row = sheet2.addRow([
        dept,
        headcount,
        cl,
        sl,
        el,
        totalTaken,
        avg,
        totalAvail,
        totalTaken === 0 ? 'Optimal (0 Absences)' : totalTaken > 5 ? 'High Absence Alert' : 'Normal Operations',
      ]);
      applyDataRowStyle(row, idx % 2 === 1);

      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'right' };
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(7).alignment = { horizontal: 'right' };
      row.getCell(8).alignment = { horizontal: 'right' };
      row.getCell(9).alignment = { horizontal: 'center' };

      row.getCell(6).font = { bold: true, color: { argb: totalTaken > 0 ? 'DC2626' : '374151' } };
      row.getCell(8).font = { bold: true, color: { argb: '07563D' } };
    });

    autoFitColumns(sheet2);

    // =========================================================================
    // SHEET 3: Employee-Wise Summary Matrix (CL, SL, EL Taken & Available)
    // =========================================================================
    const sheet3 = workbook.addWorksheet('Employee Summary Matrix', {
      views: [{ state: 'frozen', ySplit: 3, showGridLines: true }],
    });

    sheet3.mergeCells('A1:H1');
    const titleCell3 = sheet3.getCell('A1');
    titleCell3.value = `${(options.organizationName || 'JOY CORPORATE SOLUTIONS PVT. LTD.').toUpperCase()} — EMPLOYEE-WISE LEAVE SUMMARY MATRIX`;
    titleCell3.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK_GREEN } };
    titleCell3.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet3.getRow(1).height = 36;

    sheet3.mergeCells('A2:H2');
    const subCell3 = sheet3.getCell('A2');
    subCell3.value = `Consolidated Employee Leave Utilization across CL, SL, and EL`;
    subCell3.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '374151' } };
    subCell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT_GREEN } };
    subCell3.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet3.getRow(2).height = 20;

    sheet3.addRow([
      'Employee Code',
      'Employee Name',
      'Department',
      'CL Taken (Days)',
      'SL Taken (Days)',
      'EL Taken (Days)',
      'Total Leave Days Taken',
      'Total Available Balance',
    ]);
    applyHeaderStyle(sheet3.getRow(3));

    const empMap = new Map<string, { code: string; name: string; dept: string; cl: number; sl: number; el: number; totalTaken: number; totalAvail: number }>();

    filteredEntitlements.forEach((e) => {
      const empId = e.employee_id;
      if (!empMap.has(empId)) {
        empMap.set(empId, {
          code: e.employee_code || 'EMP',
          name: e.employee_name,
          dept: e.department_name,
          cl: 0,
          sl: 0,
          el: 0,
          totalTaken: 0,
          totalAvail: 0,
        });
      }
      const item = empMap.get(empId)!;
      const code = (e.leave_type_code || '').toUpperCase();
      if (code === 'CL') item.cl += e.used;
      else if (code === 'SL') item.sl += e.used;
      else if (code === 'EL') item.el += e.used;
      item.totalTaken += e.used;
      item.totalAvail += e.available_balance;
    });

    let s3Idx = 0;
    empMap.forEach((val) => {
      const row = sheet3.addRow([
        val.code,
        val.name,
        val.dept,
        val.cl,
        val.sl,
        val.el,
        val.totalTaken,
        val.totalAvail,
      ]);
      applyDataRowStyle(row, s3Idx % 2 === 1);
      s3Idx++;

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(7).alignment = { horizontal: 'right' };
      row.getCell(8).alignment = { horizontal: 'right' };

      row.getCell(7).font = { bold: true, color: { argb: val.totalTaken > 0 ? 'DC2626' : '374151' } };
      row.getCell(8).font = { bold: true, color: { argb: '07563D' } };
    });

    autoFitColumns(sheet3);

    // =========================================================================
    // SHEET 4: Balance & Closing Ledger
    // =========================================================================
    const sheet4 = workbook.addWorksheet('Balance & Closing Ledger', {
      views: [{ state: 'frozen', ySplit: 3, showGridLines: true }],
    });

    sheet4.mergeCells('A1:J1');
    const titleCell4 = sheet4.getCell('A1');
    titleCell4.value = `${(options.organizationName || 'JOY CORPORATE SOLUTIONS PVT. LTD.').toUpperCase()} — LIVE LEAVE BALANCE & CLOSING LEDGER (2026)`;
    titleCell4.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK_GREEN } };
    titleCell4.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet4.getRow(1).height = 36;

    sheet4.mergeCells('A2:J2');
    const subCell4 = sheet4.getCell('A2');
    subCell4.value = `Opening, Accrued, Consumed, and Current Available Balance per Employee & Leave Type | Fiscal Year 2026`;
    subCell4.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '374151' } };
    subCell4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT_GREEN } };
    subCell4.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet4.getRow(2).height = 20;

    sheet4.addRow([
      'Employee Code',
      'Employee Name',
      'Department',
      'Leave Type',
      'Annual Quota',
      'Opening Balance',
      'Accrued YTD',
      'Consumed YTD',
      'Pending Requests',
      'Available Balance',
    ]);
    applyHeaderStyle(sheet4.getRow(3));

    filteredEntitlements.forEach((e, idx) => {
      const row = sheet4.addRow([
        e.employee_code || 'EMP',
        e.employee_name,
        e.department_name,
        `${e.leave_type_name} (${e.leave_type_code || ''})`,
        e.granted || e.opening_balance,
        e.opening_balance,
        e.accrued,
        e.used,
        e.pending,
        e.available_balance,
      ]);
      applyDataRowStyle(row, idx % 2 === 1);

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(7).alignment = { horizontal: 'right' };
      row.getCell(8).alignment = { horizontal: 'right' };
      row.getCell(9).alignment = { horizontal: 'right' };
      row.getCell(10).alignment = { horizontal: 'right' };

      const availCell = row.getCell(10);
      availCell.font = { bold: true, color: { argb: e.available_balance <= 2 ? 'DC2626' : '07563D' } };
    });

    autoFitColumns(sheet4);

    // =========================================================================
    // SHEET 5: Year-End Carry Forward & Encashment Audit
    // =========================================================================
    const sheet5 = workbook.addWorksheet('Carry Forward & Encashment Audit', {
      views: [{ state: 'frozen', ySplit: 3, showGridLines: true }],
    });

    sheet5.mergeCells('A1:K1');
    const titleCell5 = sheet5.getCell('A1');
    titleCell5.value = `${(options.organizationName || 'JOY CORPORATE SOLUTIONS PVT. LTD.').toUpperCase()} — YEAR-END CARRY FORWARD & ENCASHMENT AUDIT`;
    titleCell5.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK_GREEN } };
    titleCell5.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet5.getRow(1).height = 36;

    sheet5.mergeCells('A2:K2');
    const subCell5 = sheet5.getCell('A2');
    subCell5.value = `Statutory Carry Forward Limits: CL (Max 6 days), SL (No Carry Forward), EL (Max 15 days, Encashable)`;
    subCell5.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: '374151' } };
    subCell5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT_GREEN } };
    subCell5.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet5.getRow(2).height = 20;

    sheet5.addRow([
      'Employee Code',
      'Employee Name',
      'Department',
      'Leave Type',
      'Available Balance',
      'Carry-Forward Allowed',
      'Max CF Limit',
      'Eligible Carry-Forward',
      'Lapsed / Forfeited Days',
      'Encashable Allowed',
      'Audit Compliance Status',
    ]);
    applyHeaderStyle(sheet5.getRow(3));

    filteredEntitlements.forEach((e, idx) => {
      const isCf = e.is_carry_forward_allowed !== false;
      const maxCf = e.max_carry_forward_days || 0;
      const eligibleCf = e.carry_forward_eligible ?? (isCf ? Math.min(e.available_balance, maxCf) : 0);
      const lapsed = e.lapsed_days ?? (isCf ? Math.max(0, e.available_balance - maxCf) : e.available_balance);
      const isEncashable = Boolean(e.is_encashable);

      const row = sheet5.addRow([
        e.employee_code || 'EMP',
        e.employee_name,
        e.department_name,
        `${e.leave_type_name} (${e.leave_type_code || ''})`,
        e.available_balance,
        isCf ? 'YES' : 'NO',
        isCf ? `${maxCf} days` : '0 days (Lapses)',
        eligibleCf,
        lapsed,
        isEncashable ? 'YES (Encashable)' : 'NO',
        lapsed > 0 ? `${lapsed} days lapse on Dec 31` : 'Compliant',
      ]);
      applyDataRowStyle(row, idx % 2 === 1);

      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'right' };
      row.getCell(9).alignment = { horizontal: 'right' };
      row.getCell(10).alignment = { horizontal: 'center' };
      row.getCell(11).alignment = { horizontal: 'center' };

      const cfCell = row.getCell(8);
      cfCell.font = { bold: true, color: { argb: '2E7D32' } };

      const lapsedCell = row.getCell(9);
      if (lapsed > 0) {
        lapsedCell.font = { bold: true, color: { argb: 'DC2626' } };
      }
    });

    autoFitColumns(sheet5);

    // =========================================================================
    // Trigger Browser Download
    // =========================================================================
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanPeriod = monthFilter || 'FY_2026';
    a.download = `${filenamePrefix}_${cleanPeriod}_${todayStr}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Generates a clean, corporate-formatted CSV export for any selected leave report
   */
  exportToCSV(
    reportId: string,
    data: LeaveExportData,
    options: LeaveExportOptions = {},
    filenamePrefix = 'leave_report'
  ): void {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthFilter = options.selectedMonth && options.selectedMonth !== 'All' ? options.selectedMonth : null;
    const deptFilter = options.selectedDept && options.selectedDept !== 'All' ? options.selectedDept : null;

    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (reportId === 'rep-02') {
      // Detailed Leave Register
      headers = [
        'Request Code',
        'Employee Code',
        'Employee Name',
        'Department',
        'Designation',
        'Leave Type',
        'From Date',
        'To Date',
        'Total Days',
        'Reason',
        'Status',
        'Approver',
      ];
      const filtered = data.requests.filter((r) => {
        const matchMonth = !monthFilter || (r.from_date && r.from_date.startsWith(monthFilter)) || (r.to_date && r.to_date.startsWith(monthFilter));
        const matchDept = !deptFilter || r.department_name === deptFilter;
        return matchMonth && matchDept;
      });

      rows = filtered.map((r) => [
        `"${r.request_code || ''}"`,
        `"${r.employee_code || ''}"`,
        `"${r.employee_name}"`,
        `"${r.department_name}"`,
        `"${r.designation || 'Staff'}"`,
        `"${r.leave_type_name} (${r.leave_type_code})"`,
        `"${r.from_date}"`,
        `"${r.to_date}"`,
        r.leave_days_deducted || r.total_calendar_days,
        `"${(r.reason || '').replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${r.approved_by_name || r.manager_name || 'Management'}"`,
      ]);
    } else if (reportId === 'rep-10') {
      // Department-Wise Breakdown
      headers = [
        'Department Name',
        'Active Headcount',
        'CL Taken (Days)',
        'SL Taken (Days)',
        'EL Taken (Days)',
        'Total Leave Days Taken',
        'Avg Days / Employee',
        'Total Available Reserves',
      ];
      const filteredEnts = data.entitlements.filter((e) => !deptFilter || e.department_name === deptFilter);
      const filteredReqs = data.requests.filter((r) => {
        const matchMonth = !monthFilter || (r.from_date && r.from_date.startsWith(monthFilter));
        const matchDept = !deptFilter || r.department_name === deptFilter;
        return matchMonth && matchDept;
      });

      const depts = Array.from(new Set([
        ...filteredEnts.map((e) => e.department_name),
        ...filteredReqs.map((r) => r.department_name),
      ])).filter(Boolean).sort();

      rows = depts.map((dept) => {
        const dEnts = filteredEnts.filter((e) => e.department_name === dept);
        const dReqs = filteredReqs.filter((r) => r.department_name === dept);
        const empIds = new Set(dEnts.map((e) => e.employee_id));
        const headcount = empIds.size || 1;

        const cl = dReqs.filter((r) => r.status === 'Approved' && (r.leave_type_code || '').toUpperCase() === 'CL').reduce((s, r) => s + (r.leave_days_deducted || 0), 0);
        const sl = dReqs.filter((r) => r.status === 'Approved' && (r.leave_type_code || '').toUpperCase() === 'SL').reduce((s, r) => s + (r.leave_days_deducted || 0), 0);
        const el = dReqs.filter((r) => r.status === 'Approved' && (r.leave_type_code || '').toUpperCase() === 'EL').reduce((s, r) => s + (r.leave_days_deducted || 0), 0);
        const totalTaken = cl + sl + el;
        const avg = headcount > 0 ? (totalTaken / headcount).toFixed(1) : '0.0';
        const totalAvail = dEnts.reduce((s, e) => s + (e.available_balance || 0), 0);

        return [
          `"${dept}"`,
          headcount,
          cl,
          sl,
          el,
          totalTaken,
          avg,
          totalAvail,
        ];
      });
    } else if (reportId === 'rep-06') {
      // Year-End Carry Forward & Encashment Audit
      headers = [
        'Employee Code',
        'Employee Name',
        'Department',
        'Leave Type',
        'Available Balance',
        'Carry-Forward Allowed',
        'Max CF Limit',
        'Eligible Carry-Forward',
        'Lapsed Days',
        'Encashable',
      ];
      const filteredEnts = data.entitlements.filter((e) => !deptFilter || e.department_name === deptFilter);
      rows = filteredEnts.map((e) => {
        const isCf = e.is_carry_forward_allowed !== false;
        const maxCf = e.max_carry_forward_days || 0;
        const eligibleCf = e.carry_forward_eligible ?? (isCf ? Math.min(e.available_balance, maxCf) : 0);
        const lapsed = e.lapsed_days ?? (isCf ? Math.max(0, e.available_balance - maxCf) : e.available_balance);
        return [
          `"${e.employee_code || ''}"`,
          `"${e.employee_name}"`,
          `"${e.department_name}"`,
          `"${e.leave_type_name} (${e.leave_type_code || ''})"`,
          e.available_balance,
          isCf ? 'YES' : 'NO',
          maxCf,
          eligibleCf,
          lapsed,
          e.is_encashable ? 'YES' : 'NO',
        ];
      });
    } else if (reportId === 'rep-14') {
      // Exceptions
      headers = ['Exception ID', 'Employee Name', 'Department', 'Type', 'Severity', 'Title', 'Status', 'Flagged Date'];
      const filteredExc = data.exceptions.filter((e) => !deptFilter || e.department_name === deptFilter);
      rows = filteredExc.map((e) => [
        `"${e.id}"`,
        `"${e.employee_name}"`,
        `"${e.department_name}"`,
        `"${e.type}"`,
        `"${e.severity}"`,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${e.status}"`,
        `"${e.flagged_at}"`,
      ]);
    } else {
      // Balance Ledger (rep-01, rep-03, and general)
      headers = [
        'Employee Code',
        'Employee Name',
        'Department',
        'Leave Type',
        'Annual Quota',
        'Opening Balance',
        'Accrued YTD',
        'Consumed YTD',
        'Pending Requests',
        'Available Balance',
        'Period',
      ];
      const filteredEnts = data.entitlements.filter((e) => !deptFilter || e.department_name === deptFilter);
      rows = filteredEnts.map((e) => [
        `"${e.employee_code || ''}"`,
        `"${e.employee_name}"`,
        `"${e.department_name}"`,
        `"${e.leave_type_name} (${e.leave_type_code || ''})"`,
        e.granted || e.opening_balance,
        e.opening_balance,
        e.accrued,
        e.used,
        e.pending,
        e.available_balance,
        `"${e.period}"`,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filenamePrefix}_${reportId}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
