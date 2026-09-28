// src/services/__tests__/universalAttendanceSheetEngine.test.ts
// ============================================================================
// Joy PeopleHR — Test Suite: Universal Attendance & Wage Sheet Analysis Engine
// Validates multi-sheet Excel parsing, header synonym matching (Image 2 & Image 3),
// anomaly auditing, and token-boundary accuracy.
// ============================================================================

import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { UniversalAttendanceSheetEngine } from '../vendor/universalAttendanceSheetEngine';

describe('Universal Attendance & Wage Sheet Analysis Engine', () => {
  it('1. Parses Image 2 format (Joy Manpower Workings with multi-sheet workbook)', () => {
    // Generate template workbook matching Image 2
    const { blob } = UniversalAttendanceSheetEngine.generateTemplate('MANPOWER_WORKINGS');
    expect(blob.size).toBeGreaterThan(100);

    // Create a mock File
    const file = new File([blob], 'joy_manpower_wages_july_2026.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Read the arrayBuffer
    const arrayBuffer = (file as any).arrayBuffer
      ? null
      : new Uint8Array([1, 2, 3]).buffer;

    // Use XLSX directly to simulate the workbook
    const wsData = [
      ['', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['JOY MANPOWER SERVICE WAGES FOR THE MONTH OF JULY 2026'],
      ['S N', 'PUNCHING NO', 'NAME', 'DEPT', 'D WAG', 'PAY DAYS', 'Wages', 'OT', 'OT STIPEND', 'GROSS', 'PF 12%', 'ESI 0.75%', 'NET AMOUNT'],
      [1, 'AJ001', 'LALHRIA TPULA', 'BCM', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
      [2, 'AJ002', 'RANJIT MUHTO', 'FO', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
      [3, 'AJ003', 'RAM VIJAY KUMAR', 'BCM', 620, 4.5, 2790, 19, 1473, 4263, 335, 21, 3907],
      [4, 'AJ013', 'DHIRAM MAHALI', 'PP3', 620, 3.5, 2170, 15, 1163, 3333, 260, 17, 3056],
      [5, 'AJ018', 'AYUSH PASWAN', 'HERBAL', 620, 2.0, 1240, 7, 543, 1783, 149, 10, 1624],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const result = UniversalAttendanceSheetEngine.analyzeWorksheet(
      worksheet,
      'joy_manpower_wages.xlsx',
      'EXCEL',
      ['INVOICE', 'Breakup', 'Workings', 'Allowance'],
      'Workings'
    );

    expect(result.recognizedFormat).toBe('MANPOWER_WORKINGS_MUSTER');
    expect(result.headerRowIndex).toBe(2); // Row 3 in 1-indexed Excel
    expect(result.totalWorkers).toBe(5);
    expect(result.totalPayDays).toBe(19.0); // 4.5 + 4.5 + 4.5 + 3.5 + 2.0
    expect(result.totalRegularWages).toBe(11780);
    expect(result.totalOtHours).toBe(79); // 19 + 19 + 19 + 15 + 7
    expect(result.totalOtStipend).toBe(6125);
    expect(result.totalGrossWages).toBe(17905);
    expect(result.totalEmployeePf).toBe(1414);
    expect(result.totalEmployeeEsi).toBe(90);
    expect(result.totalNetPayable).toBe(16401);
    expect(result.totalAnomalies).toBe(0);

    // Verify individual worker mapping
    const firstWorker = result.rows[0];
    expect(firstWorker.workerCode).toBe('AJ001');
    expect(firstWorker.workerName).toBe('LALHRIA TPULA');
    expect(firstWorker.department).toBe('BCM');
    expect(firstWorker.dailyWage).toBe(620);
    expect(firstWorker.payDays).toBe(4.5);
    expect(firstWorker.regularWages).toBe(2790);
    expect(firstWorker.otHours).toBe(19);
    expect(firstWorker.otStipend).toBe(1473);
    expect(firstWorker.grossWages).toBe(4263);
    expect(firstWorker.deductions.employeePf).toBe(335);
    expect(firstWorker.deductions.employeeEsi).toBe(21);
    expect(firstWorker.netPayable).toBe(3907);
    expect(firstWorker.hasAnomaly).toBe(false);
  });

  it('2. Parses Image 3 format (Statutory Multi-Column Muster)', () => {
    const wsData = [
      [
        'Sl no', 'Emp ID', 'Name', 'Pay Month', 'Paid W.Ds', 'W Days', 'N/H', 'CO', 'OD', 'Sundays', 'PL', 'CL', 'SL',
        'Payable Ds', 'Basic', 'DA', 'HRA', 'CA', 'Food/Meal', 'Night Allow', 'OT Hrs', 'OT Wages',
        'Attendance', 'Arrears', 'Holiday Wg', 'Sunday Wg', 'Leave Wag', 'Room Allow', 'Production', 'Medical All',
        'Gross Earn', 'PF Deduct', 'ESI Deduct', 'Profession', 'LWF', 'Canteen', 'Snacks', 'Rent', 'Advance', 'Others', 'TDS', 'Medical Ins',
        'Total Dedu', 'Net Payable'
      ],
      [
        1, 'EMP001', 'Murugan Perumal', '2026-08', 22, 22, 1, 0, 0, 4, 1, 0, 0,
        26, 16900, 0, 0, 1000, 500, 400, 16, 1300,
        500, 0, 0, 0, 0, 1300, 0, 0,
        21900, 2028, 165, 200, 20, 600, 0, 0, 0, 0, 0, 0,
        3013, 18887
      ],
      [
        2, 'EMP002', 'Anand Kumar', '2026-08', 21, 21, 1, 0, 0, 4, 0, 0, 0,
        26, 16120, 0, 0, 1000, 500, 0, 12, 975,
        500, 0, 0, 0, 0, 1300, 0, 0,
        20395, 1934, 153, 200, 20, 500, 0, 0, 0, 0, 0, 0,
        2807, 17588
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const result = UniversalAttendanceSheetEngine.analyzeWorksheet(
      worksheet,
      'statutory_contractor_muster.xlsx',
      'EXCEL',
      ['Statutory Muster'],
      'Statutory Muster'
    );

    expect(result.recognizedFormat).toBe('COMPREHENSIVE_STATUTORY_MUSTER');
    expect(result.headerRowIndex).toBe(0);
    expect(result.totalWorkers).toBe(2);
    expect(result.totalPayDays).toBe(52); // 26 + 26
    expect(result.totalRegularWages).toBe(33020); // 16900 + 16120
    expect(result.totalOtHours).toBe(28); // 16 + 12
    expect(result.totalOtStipend).toBe(2275); // 1300 + 975
    expect(result.totalGrossWages).toBe(42295); // 21900 + 20395
    expect(result.totalEmployeePf).toBe(3962); // 2028 + 1934
    expect(result.totalEmployeeEsi).toBe(318); // 165 + 153
    expect(result.totalPt).toBe(400); // 200 + 200
    expect(result.totalDeductions).toBe(5820); // 3013 + 2807
    expect(result.totalNetPayable).toBe(36475); // 18887 + 17588

    // Verify statutory allowance parsing on first worker
    const worker1 = result.rows[0];
    expect(worker1.workerCode).toBe('EMP001');
    expect(worker1.workerName).toBe('Murugan Perumal');
    expect(worker1.allowances.ca).toBe(1000);
    expect(worker1.allowances.food).toBe(500);
    expect(worker1.allowances.nightShift).toBe(400);
    expect(worker1.allowances.attendanceBonus).toBe(500);
    expect(worker1.allowances.room).toBe(1300);
    expect(worker1.deductions.professionalTax).toBe(200);
    expect(worker1.deductions.lwf).toBe(20);
    expect(worker1.deductions.canteen).toBe(600);
    expect(worker1.hasAnomaly).toBe(false);
  });

  it('3. Token boundary prevents false positives (Total is not OT, Canteen is not CA)', () => {
    const wsData = [
      ['Employee ID', 'Name', 'Total Days', 'Canteen Expense', 'Department Code'],
      ['EMP01', 'Kavitha S', 26, 450, 'DEPT-HR'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const result = UniversalAttendanceSheetEngine.analyzeWorksheet(
      worksheet,
      'custom_sheet.xlsx',
      'EXCEL',
      ['Sheet1'],
      'Sheet1'
    );

    // 'Total Days' should map to payDays, NOT otHours!
    expect(result.mappedColumns.payDays).toBe('Total Days');
    expect(result.mappedColumns.otHours).toBeUndefined();

    // 'Canteen Expense' should map to canteenDeduct, NOT conveyance/ca!
    expect(result.mappedColumns.canteenDeduct).toBe('Canteen Expense');
    expect(result.mappedColumns.ca).toBeUndefined();
  });

  it('4. Detects mathematical variances and calculation discrepancies', () => {
    const wsData = [
      ['PUNCHING NO', 'NAME', 'D WAG', 'PAY DAYS', 'Wages', 'OT', 'OT STIPEND', 'GROSS', 'PF 12%', 'ESI 0.75%', 'NET AMOUNT'],
      // Deliberate error: 620 * 4.5 = 2790, but wages entered as 3500!
      ['AJ099', 'Error Worker', 620, 4.5, 3500, 10, 800, 4300, 420, 32, 3848],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const result = UniversalAttendanceSheetEngine.analyzeWorksheet(
      worksheet,
      'test_error.xlsx',
      'EXCEL',
      ['Workings'],
      'Workings'
    );

    expect(result.totalAnomalies).toBe(1);
    expect(result.rows[0].hasAnomaly).toBe(true);
    expect(result.rows[0].anomalies[0]).toContain('Rate × Days');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
