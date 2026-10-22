import { describe, it, expect } from 'vitest';
import { attendanceReportExportService } from '../attendanceReportExportService';
import ExcelJS from 'exceljs';

describe('AttendanceReportExportService — Not Checked In & Absentees Sheet', () => {
  const mockRows = [
    {
      emp: {
        employee_code: 'JCS-001',
        first_name: 'Dharun',
        last_name: 'B',
        department_name: 'Development',
        designation_title: 'Lead Architect',
        reporting_manager_name: 'Prakash V',
        phone: '9944399088',
        work_email: 'dharun@joyglobalcorp.com',
      },
      record: {
        employee_code: 'JCS-001',
        first_check_in: '2026-10-20T09:02:00+05:30',
        status: 'Present',
        late_minutes: 2,
        net_working_minutes: 540,
      },
      shift: {
        shift_code: 'GEN-09',
        shift_name: 'General Shift',
        start_time: '09:00',
        end_time: '18:00',
      },
    },
    {
      emp: {
        employee_code: 'JCS-002',
        first_name: 'Anand',
        last_name: 'Kumar',
        department_name: 'Development',
        designation_title: 'Senior Developer',
        reporting_manager_name: 'Dharun B',
        phone: '9876543210',
        work_email: 'anand@joyglobalcorp.com',
      },
      record: {
        employee_code: 'JCS-002',
        first_check_in: null,
        status: 'Not Checked In',
        late_minutes: 0,
        net_working_minutes: 0,
      },
      shift: {
        shift_code: 'GEN-09',
        shift_name: 'General Shift',
        start_time: '09:00',
        end_time: '18:00',
      },
    },
    {
      emp: {
        employee_code: 'JCS-003',
        first_name: 'Priya',
        last_name: 'Sharma',
        department_name: 'OPERATIONS',
        designation_title: 'Operations Analyst',
        reporting_manager_name: 'Suresh M',
        phone: '9840112233',
        work_email: 'priya@joyglobalcorp.com',
      },
      record: {
        employee_code: 'JCS-003',
        first_check_in: null,
        status: 'On Leave',
        late_minutes: 0,
        net_working_minutes: 0,
      },
      shift: {
        shift_code: 'GEN-09',
        shift_name: 'General Shift',
        start_time: '09:00',
        end_time: '18:00',
      },
    },
    {
      emp: {
        employee_code: 'JCS-004',
        first_name: 'Rajesh',
        last_name: 'V',
        department_name: 'FIELD OPERATIONS',
        designation_title: 'Field Officer',
        reporting_manager_name: 'Prakash V',
        phone: '9840223344',
        work_email: 'rajesh@joyglobalcorp.com',
      },
      record: {
        employee_code: 'JCS-004',
        first_check_in: null,
        status: 'Weekly Off',
        late_minutes: 0,
        net_working_minutes: 0,
      },
      shift: {
        shift_code: 'GEN-09',
        shift_name: 'General Shift',
        start_time: '09:00',
        end_time: '18:00',
      },
    },
    {
      emp: {
        employee_code: 'JCS-005',
        first_name: 'Kavitha',
        last_name: 'R',
        department_name: 'FIELD OPERATIONS',
        designation_title: 'Field Coordinator',
        reporting_manager_name: 'Prakash V',
        phone: '9840334455',
        work_email: 'kavitha@joyglobalcorp.com',
      },
      record: {
        employee_code: 'JCS-005',
        first_check_in: null,
        status: 'Absent',
        late_minutes: 0,
        net_working_minutes: 0,
      },
      shift: {
        shift_code: 'GEN-09',
        shift_name: 'General Shift',
        start_time: '09:00',
        end_time: '18:00',
      },
    },
  ];

  it('generates a 7-sheet Excel workbook containing the dedicated "Not Checked In & Absentees" worksheet', async () => {
    const result = await attendanceReportExportService.generateExcelWorkbook(mockRows as any, [], {
      reportDate: '2026-10-20',
      companyName: 'Joy Corporate Solutions',
      includePunches: true,
    });

    expect(result.buffer).toBeDefined();
    expect(result.buffer.byteLength).toBeGreaterThan(1000);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(result.buffer) as any);

    const sheetNames = wb.worksheets.map(w => w.name);
    expect(sheetNames).toContain('Executive Dashboard');
    expect(sheetNames).toContain('Morning Check-In Turnout');
    expect(sheetNames).toContain('Not Checked In & Absentees');
    expect(sheetNames).toContain('Daily Attendance Ledger');
    expect(sheetNames).toContain('Overtime & Deviations');
    expect(sheetNames).toContain('Verified Punch Log');
    expect(sheetNames).toContain('Day-over-Day Comparison');

    expect(wb.worksheets[2].name).toBe('Not Checked In & Absentees');
  });

  it('filters only unrecorded and absent employees and formats dashboard KPI cards & employee details', async () => {
    const result = await attendanceReportExportService.generateExcelWorkbook(mockRows as any, [], {
      reportDate: '2026-10-20',
      companyName: 'Joy Corporate Solutions',
      includePunches: true,
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(result.buffer) as any);

    const wsAbsent = wb.getWorksheet('Not Checked In & Absentees')!;
    expect(wsAbsent).toBeDefined();

    // Check Header Banner
    const title = wsAbsent.getRow(1).getCell(1).value;
    expect(String(title)).toContain('NOT CHECKED IN & ABSENTEEISM AUDIT DASHBOARD');

    // Check Subtitle Metadata
    const sub = wsAbsent.getRow(2).getCell(1).value;
    expect(String(sub)).toContain('Audit Date: 2026-10-20');
    expect(String(sub)).toContain('Total Unrecorded / Absent: 4 Staff');

    // Check 5 KPI Metric Cards
    // Card 1: Total Not Checked In = 4
    expect(wsAbsent.getRow(8).getCell(2).value).toBe('4');
    // Card 2: Unexcused / No Punch = 2 (JCS-002 and JCS-005)
    expect(wsAbsent.getRow(8).getCell(5).value).toBe('2');
    // Card 3: Approved On Leave = 1 (JCS-003)
    expect(wsAbsent.getRow(8).getCell(8).value).toBe('1');
    // Card 4: Weekly Off / Rest Day = 1 (JCS-004)
    expect(wsAbsent.getRow(8).getCell(11).value).toBe('1');

    // Check Table Headers on Row 12
    expect(wsAbsent.getRow(12).getCell(1).value).toBe('Sl No');
    expect(wsAbsent.getRow(12).getCell(2).value).toBe('Employee Code');
    expect(wsAbsent.getRow(12).getCell(3).value).toBe('Employee Name');
    expect(wsAbsent.getRow(12).getCell(4).value).toBe('Department');
    expect(wsAbsent.getRow(12).getCell(5).value).toBe('Designation');
    expect(wsAbsent.getRow(12).getCell(6).value).toBe('Reporting Manager');
    expect(wsAbsent.getRow(12).getCell(8).value).toBe('Contact Phone');
    expect(wsAbsent.getRow(12).getCell(9).value).toBe('Official Work Email');
    expect(wsAbsent.getRow(12).getCell(10).value).toBe('Shift Code & Name');
    expect(wsAbsent.getRow(12).getCell(12).value).toBe('Attendance Status');
    expect(wsAbsent.getRow(12).getCell(13).value).toBe('Absence Classification');
    expect(wsAbsent.getRow(12).getCell(14).value).toBe('Leave / Approval Status');
    expect(wsAbsent.getRow(12).getCell(15).value).toBe('HR Action & Escalation Required');

    // Check that Present employee (Dharun B - JCS-001) is EXCLUDED from absentees
    const employeeCodes = [
      wsAbsent.getRow(13).getCell(2).value,
      wsAbsent.getRow(14).getCell(2).value,
      wsAbsent.getRow(15).getCell(2).value,
      wsAbsent.getRow(16).getCell(2).value,
    ];
    expect(employeeCodes).not.toContain('JCS-001');
    expect(employeeCodes).toEqual(['JCS-002', 'JCS-003', 'JCS-004', 'JCS-005']);

    // Check employee details populated
    expect(wsAbsent.getRow(13).getCell(3).value).toBe('Anand Kumar');
    expect(wsAbsent.getRow(13).getCell(4).value).toBe('Development');
    expect(wsAbsent.getRow(13).getCell(5).value).toBe('Senior Developer');
    expect(wsAbsent.getRow(13).getCell(6).value).toBe('Dharun B');
    expect(wsAbsent.getRow(13).getCell(8).value).toBe('9876543210');
    expect(wsAbsent.getRow(13).getCell(9).value).toBe('anand@joyglobalcorp.com');

    // Check Leave status for Priya Sharma (Row 14)
    expect(wsAbsent.getRow(14).getCell(3).value).toBe('Priya Sharma');
    expect(wsAbsent.getRow(14).getCell(13).value).toBe('Approved Leave (ESS)');
    expect(wsAbsent.getRow(14).getCell(14).value).toBe('Leave Formally Approved');

    // Check Summary Footer Row
    const footer = wsAbsent.getRow(17);
    expect(String(footer.getCell(1).value)).toContain('TOTAL UNRECORDED / ABSENT WORKFORCE: 4 EMPLOYEES');
  });
});
