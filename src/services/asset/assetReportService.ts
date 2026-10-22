// src/services/asset/assetReportService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Asset Allocation, Return & Deduction Report Engine
// Generates Professional Day-Wise & Monthly Excel Spreadsheets with Styled Tables
// ============================================================================

import ExcelJS from 'exceljs';
import { AssetAssignment, UniversalAsset, Employee } from '../../types';

export interface AssetReportOptions {
  reportType: 'DAY_WISE' | 'MONTHLY';
  startDate?: string;
  endDate?: string;
  month?: number; // 1 - 12
  year?: number;
  companyName?: string;
}

export const assetReportService = {
  /**
   * Export Day-Wise or Monthly Asset Allocation & Return Audit Report to Excel (.xlsx)
   */
  async exportExcelReport(
    assignments: AssetAssignment[],
    assets: UniversalAsset[],
    employees: Employee[],
    options: AssetReportOptions
  ): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Joy PeopleHR Enterprise';
    wb.created = new Date();

    const company = options.companyName || 'Joy Corporate Solutions Pvt Ltd';
    const assetMap = new Map<string, UniversalAsset>();
    assets.forEach(a => assetMap.set(a.id, a));

    const empMap = new Map<string, Employee>();
    employees.forEach(e => empMap.set(e.id, e));

    if (options.reportType === 'DAY_WISE') {
      await this.buildDayWiseSheet(wb, assignments, assetMap, empMap, options, company);
    } else {
      await this.buildMonthlySheet(wb, assignments, assetMap, empMap, options, company);
    }

    // Trigger Browser Download
    const rawBuffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([rawBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = options.reportType === 'DAY_WISE'
      ? `Asset_Allocation_DayWise_Report_${timestamp}.xlsx`
      : `Asset_Custody_Monthly_Report_${options.year || new Date().getFullYear()}_${timestamp}.xlsx`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Build Day-Wise Allocation & Return Audit Sheet
   */
  async buildDayWiseSheet(
    wb: ExcelJS.Workbook,
    assignments: AssetAssignment[],
    assetMap: Map<string, UniversalAsset>,
    empMap: Map<string, Employee>,
    options: AssetReportOptions,
    company: string
  ) {
    const ws = wb.addWorksheet('Day-Wise Allocation & Return', {
      views: [{ showGridLines: true }],
    });

    // 1. Enterprise Title Header
    ws.mergeCells('A1:L1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `${company.toUpperCase()} — ASSET ALLOCATION & DEDUCTION AUDIT`;
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF07563D' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 36;

    // 2. Sub-header & Scope
    ws.mergeCells('A2:L2');
    const subCell = ws.getCell('A2');
    const dateScope = options.startDate && options.endDate
      ? `Period: ${options.startDate} to ${options.endDate}`
      : `Generated On: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    subCell.value = `${dateScope}  |  Tracking: Custody, Returnable Status & Payroll Deductions`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF374151' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 22;

    // 3. Table Column Headers
    const headers = [
      'S.No',
      'Assigned Date',
      'Returned Date',
      'Employee Code & Name',
      'Department',
      'Asset Code',
      'Asset Name & Category',
      'Returnable?',
      'Status',
      'Deduction Amount (₹)',
      'Deduction Status',
      'Condition / Remarks',
    ];

    ws.getRow(4).values = headers;
    ws.getRow(4).height = 26;

    headers.forEach((_, idx) => {
      const cell = ws.getRow(4).getCell(idx + 1);
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });

    // 4. Data Rows
    let totalDeductions = 0;
    let rowIndex = 5;

    // Filter by date range if provided
    let list = [...assignments];
    if (options.startDate) {
      list = list.filter(a => (a.assigned_at || '').slice(0, 10) >= options.startDate!);
    }
    if (options.endDate) {
      list = list.filter(a => (a.assigned_at || '').slice(0, 10) <= options.endDate!);
    }

    list.forEach((asgn, i) => {
      const asset = assetMap.get(asgn.asset_id);
      const emp = asgn.employee_id ? empMap.get(asgn.employee_id) : undefined;

      const empDisplay = emp
        ? `${emp.employee_code || (emp as any).employee_id || emp.id.slice(0, 6)} - ${emp.first_name} ${emp.last_name || ''}`.trim()
        : asgn.target_name || 'Assigned Employee';

      const deptDisplay = (emp as any)?.department_name || (emp as any)?.department || 'Operations';
      const isReturnable = asgn.is_returnable !== false ? 'YES (Returnable)' : 'NO (Consumable)';
      const deduction = Number(asgn.deduction_amount) || 0;
      totalDeductions += deduction;

      const conditionNotes = [
        asgn.condition_at_assign ? `Issue: ${asgn.condition_at_assign}` : '',
        asgn.condition_at_return ? `Return: ${asgn.condition_at_return}` : '',
        asgn.notes ? `Notes: ${asgn.notes}` : '',
      ].filter(Boolean).join(' | ') || 'Normal Condition';

      const rowValues = [
        i + 1,
        asgn.assigned_at ? asgn.assigned_at.slice(0, 10) : '-',
        asgn.actual_return_date ? asgn.actual_return_date.slice(0, 10) : '-',
        empDisplay,
        deptDisplay,
        asset?.asset_code || '-',
        `${asset?.asset_name || 'Asset'} (${asset?.category || 'General'})`,
        isReturnable,
        asgn.status === 'RETURNED' ? 'RETURNED' : 'ACTIVE IN CUSTODY',
        deduction,
        asgn.deduction_status || (deduction > 0 ? 'DEPOSIT HELD' : 'CLEARED'),
        conditionNotes,
      ];

      const row = ws.getRow(rowIndex);
      row.values = rowValues;
      row.height = 22;

      // Formatting & Zebra stripes
      const isZebra = i % 2 === 1;
      rowValues.forEach((_, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.font = { name: 'Calibri', size: 9 };
        cell.alignment = { vertical: 'middle', horizontal: cIdx === 0 || cIdx === 1 || cIdx === 2 || cIdx === 7 || cIdx === 8 ? 'center' : cIdx === 9 ? 'right' : 'left' };
        if (isZebra) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };

        if (cIdx === 9) {
          cell.numFmt = '₹#,##0.00';
        }
      });

      rowIndex++;
    });

    // 5. Total Summary Row
    const totalRow = ws.getRow(rowIndex);
    totalRow.values = [
      '',
      '',
      '',
      'TOTAL SUMMARY',
      '',
      '',
      '',
      '',
      `Count: ${list.length} Records`,
      totalDeductions,
      '',
      '',
    ];
    totalRow.height = 26;

    for (let c = 1; c <= 12; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF111827' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      cell.border = { top: { style: 'double' }, bottom: { style: 'double' } };
      if (c === 10) cell.numFmt = '₹#,##0.00';
    }

    // Set Column Widths
    ws.columns = [
      { width: 8 },  // S.No
      { width: 14 }, // Assigned Date
      { width: 14 }, // Returned Date
      { width: 28 }, // Employee
      { width: 18 }, // Dept
      { width: 16 }, // Asset Code
      { width: 32 }, // Asset Name
      { width: 18 }, // Returnable
      { width: 18 }, // Status
      { width: 18 }, // Deduction Amt
      { width: 18 }, // Deduction Status
      { width: 35 }, // Remarks
    ];
  },

  /**
   * Build Monthly Reconciliation Sheet
   */
  async buildMonthlySheet(
    wb: ExcelJS.Workbook,
    assignments: AssetAssignment[],
    assetMap: Map<string, UniversalAsset>,
    empMap: Map<string, Employee>,
    options: AssetReportOptions,
    company: string
  ) {
    const ws = wb.addWorksheet('Monthly Custody & Deductions', {
      views: [{ showGridLines: true }],
    });

    const targetYear = options.year || new Date().getFullYear();

    // Title
    ws.mergeCells('A1:G1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `${company.toUpperCase()} — MONTHLY ASSET & DEDUCTION LEDGER (${targetYear})`;
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF07563D' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 34;

    const headers = [
      'Month',
      'Total Assets Allocated',
      'Total Returnable Issued',
      'Non-Returnable (Consumables)',
      'Total Returned to Store',
      'Active Custody at Month End',
      'Total Deduction / Deposits (₹)',
    ];

    ws.getRow(3).values = headers;
    ws.getRow(3).height = 24;

    headers.forEach((_, idx) => {
      const cell = ws.getRow(3).getCell(idx + 1);
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    let rowIdx = 4;
    let sumTotalAllocated = 0;
    let sumTotalDeductions = 0;

    months.forEach((mName, mIdx) => {
      const monthPrefix = `${targetYear}-${String(mIdx + 1).padStart(2, '0')}`;
      const monthAssignments = assignments.filter(a => (a.assigned_at || '').startsWith(monthPrefix));

      const totalAllocated = monthAssignments.length;
      const returnableCount = monthAssignments.filter(a => a.is_returnable !== false).length;
      const consumableCount = monthAssignments.filter(a => a.is_returnable === false).length;
      const returnedCount = monthAssignments.filter(a => a.status === 'RETURNED').length;
      const activeCustody = totalAllocated - returnedCount;
      const monthDeduction = monthAssignments.reduce((acc, a) => acc + (Number(a.deduction_amount) || 0), 0);

      sumTotalAllocated += totalAllocated;
      sumTotalDeductions += monthDeduction;

      const rValues = [
        mName,
        totalAllocated,
        returnableCount,
        consumableCount,
        returnedCount,
        activeCustody,
        monthDeduction,
      ];

      const row = ws.getRow(rowIdx);
      row.values = rValues;
      row.height = 20;

      rValues.forEach((_, c) => {
        const cell = row.getCell(c + 1);
        cell.font = { name: 'Calibri', size: 9 };
        cell.alignment = { horizontal: c === 0 ? 'left' : c === 6 ? 'right' : 'center', vertical: 'middle' };
        if (c === 6) cell.numFmt = '₹#,##0.00';
      });

      rowIdx++;
    });

    // Summary Row
    const sumRow = ws.getRow(rowIdx);
    sumRow.values = ['FULL YEAR TOTAL', sumTotalAllocated, '', '', '', '', sumTotalDeductions];
    sumRow.height = 24;
    for (let c = 1; c <= 7; c++) {
      const cell = sumRow.getCell(c);
      cell.font = { name: 'Calibri', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      if (c === 7) cell.numFmt = '₹#,##0.00';
    }

    ws.columns = [
      { width: 18 }, // Month
      { width: 22 }, // Total Allocated
      { width: 22 }, // Returnable
      { width: 26 }, // Non-Returnable
      { width: 22 }, // Returned
      { width: 26 }, // Active Custody
      { width: 26 }, // Deductions
    ];
  },
};
