// src/services/__tests__/vendorAttendanceExportArchitecture.test.ts
// ============================================================================
// Joy PeopleHR — Vendor Attendance Export Architecture & 43 vs 44 Verification
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VendorAttendanceNormalizedDataService,
  getVendorAttendanceExportData,
  AttendanceExportRequest,
} from '../vendor/vendorAttendanceNormalizedDataService';
import {
  VendorAttendanceEngineService,
  VendorDailyAttendance,
} from '../vendor/vendorAttendanceEngineService';
import { VendorWorkforceService, VendorWorkerRecord } from '../vendor/vendorWorkforceService';
import { exportVendorAttendanceXLSX } from '../vendor/exportVendorAttendanceXLSX';
import { exportCompanyAttendanceXLSX } from '../vendor/exportCompanyAttendanceXLSX';

describe('Vendor Attendance Export Architecture & 43 vs 44 Worker Separation', () => {
  const TEST_VENDOR_ID = 'VEN-JOY-MANPOWER-01';
  const TEST_COMPANY_ID = 'org-arjuna-main';
  const TEST_SITE_ID = 'SITE-UNIT-2';

  beforeEach(() => {
    // Stage 43 employees with attendance (e.g. 593 punches across 26-Aug to 25-Sep)
    const stagedPunches: VendorDailyAttendance[] = [];
    
    // Create 43 active employees with punches across multiple dates
    for (let empIdx = 1; empIdx <= 43; empIdx++) {
      const empId = `EMP-${20380 + empIdx}`;
      const empName = empIdx === 1 ? 'SAKTHI S' : `Worker ${empIdx}`;
      const dept = empIdx % 2 === 0 ? 'Assembly' : 'Operations';

      // Give each worker multiple dates (e.g. 26-Aug, 27-Aug, 28-Aug)
      const dates = ['2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'];
      for (const d of dates) {
        stagedPunches.push({
          attendance_id: `att-${empId}-${d}`,
          company_id: TEST_COMPANY_ID,
          vendor_id: TEST_VENDOR_ID,
          site_id: TEST_SITE_ID,
          site_name: 'Factory Premises — Unit 2 Plant',
          department_id: 'DEPT-01',
          department: dept,
          employee_id: empId,
          employee_code: empId,
          employee_name: empName,
          designation: 'Contractor Specialist',
          category: 'Skilled',
          attendance_date: d,
          shift_id: 'GENERAL',
          shift_name: 'General',
          check_in: '09:00',
          check_out: '18:00',
          first_half_status: 'P',
          second_half_status: 'P',
          late_minutes: 0,
          early_out_minutes: 0,
          worked_hours: 8,
          ot_hours: empIdx % 3 === 0 ? 2 : 0,
          attendance_source: 'UPLOAD',
          attendance_status: 'APPROVED',
          verification_status: 'VERIFIED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Add one true duplicate punch for Worker 1 on 2026-08-26 to test strict deduplication
      if (empIdx === 1) {
        stagedPunches.push({
          attendance_id: `att-${empId}-2026-08-26-dup`,
          company_id: TEST_COMPANY_ID,
          vendor_id: TEST_VENDOR_ID,
          site_id: TEST_SITE_ID,
          site_name: 'Factory Premises — Unit 2 Plant',
          department_id: 'DEPT-01',
          department: dept,
          employee_id: empId,
          employee_code: empId,
          employee_name: empName,
          designation: 'Contractor Specialist',
          category: 'Skilled',
          attendance_date: '2026-08-26',
          shift_id: 'GENERAL',
          shift_name: 'General',
          check_in: '09:00',
          check_out: '18:00',
          first_half_status: 'P',
          second_half_status: 'P',
          late_minutes: 0,
          early_out_minutes: 0,
          worked_hours: 8,
          ot_hours: 0,
          attendance_source: 'UPLOAD',
          attendance_status: 'APPROVED',
          verification_status: 'VERIFIED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    VendorAttendanceEngineService.stageAttendance(stagedPunches);
  });

  it('1. Architecture: getVendorAttendanceExportData serves as normalized backend layer', async () => {
    const request: AttendanceExportRequest = {
      vendorId: TEST_VENDOR_ID,
      companyId: TEST_COMPANY_ID,
      siteId: TEST_SITE_ID,
      periodStart: '2026-08-26',
      periodEnd: '2026-09-25',
      vendorName: 'Joy Manpower Services Private Limited',
      companyName: 'Arjuna Natural Pvt Ltd',
      siteName: 'Factory Premises — Unit 2 Plant',
      periodLabel: '26 Aug 2026 – 25 Sep 2026',
      generatedBy: 'Vendor Admin',
      totalWorkers: 44, // Contract master has 44 workers!
    };

    const dataset = await getVendorAttendanceExportData(request);
    expect(dataset).toBeDefined();
    expect(dataset.vendorId).toBe(TEST_VENDOR_ID);
    expect(dataset.companyId).toBe(TEST_COMPANY_ID);
  });

  it('2. Strict Deduplication: distinguishes distinct dates and removes only true duplicates', async () => {
    const request: AttendanceExportRequest = {
      vendorId: TEST_VENDOR_ID,
      companyId: TEST_COMPANY_ID,
      siteId: TEST_SITE_ID,
      periodStart: '2026-08-26',
      periodEnd: '2026-09-25',
      vendorName: 'Joy Manpower Services Private Limited',
      companyName: 'Arjuna Natural Pvt Ltd',
      siteName: 'Factory Premises — Unit 2 Plant',
      periodLabel: '26 Aug 2026 – 25 Sep 2026',
      generatedBy: 'Vendor Admin',
      totalWorkers: 44,
    };

    const dataset = await getVendorAttendanceExportData(request);

    // 43 employees × 5 dates = 215 records. 1 duplicate was added, so 216 came in.
    expect(dataset.integrity.sourceRecordCount).toBe(216);
    expect(dataset.integrity.duplicatesRemoved).toBe(1);
    expect(dataset.attendanceRecordCount).toBe(215);

    // Verify SAKTHI S has 5 distinct daily records (26-Aug to 30-Aug), NOT collapsed into 1 row!
    const sakthiRecords = dataset.attendanceRecords.filter((r) => r.employee_name === 'SAKTHI S');
    expect(sakthiRecords.length).toBe(5);
    const sakthiDates = new Set(sakthiRecords.map((r) => r.attendance_date));
    expect(sakthiDates.size).toBe(5);
  });

  it('3. Fixes 43 vs 44 worker problem: 3 separate counts and preserves 44th worker in MR Report', async () => {
    const request: AttendanceExportRequest = {
      vendorId: TEST_VENDOR_ID,
      companyId: TEST_COMPANY_ID,
      siteId: TEST_SITE_ID,
      periodStart: '2026-08-26',
      periodEnd: '2026-09-25',
      vendorName: 'Joy Manpower Services Private Limited',
      companyName: 'Arjuna Natural Pvt Ltd',
      siteName: 'Factory Premises — Unit 2 Plant',
      periodLabel: '26 Aug 2026 – 25 Sep 2026',
      generatedBy: 'Vendor Admin',
      totalWorkers: 44, // 44 master contract workers
    };

    const dataset = await getVendorAttendanceExportData(request);

    // Three separate counts (Requirement 4):
    expect(dataset.totalWorkers).toBe(44);
    expect(dataset.workersWithAttendance).toBe(43);
    expect(dataset.attendanceRecordCount).toBe(215);

    // Missing worker is explicitly tracked
    expect(dataset.workersWithoutAttendance.length).toBe(1);
    expect(dataset.missingWorkersDetails.length).toBe(1);

    // 02_MR_Report must contain exactly 44 rows (one per employee, including 44th worker)
    expect(dataset.mrReport.length).toBe(44);

    // Find the 44th worker in MR Report: should have 0 present days
    const worker44 = dataset.mrReport.find((w) => dataset.workersWithoutAttendance.includes(w.employee_id));
    expect(worker44).toBeDefined();
    expect(worker44?.present_days).toBe(0);
    expect(worker44?.weekly_off).toBe(0);
    expect(worker44?.ot_hours).toBe(0);

    // 05_Exceptions must explicitly report NO ATTENDANCE RECORD for the 44th worker
    const noAttException = dataset.exceptions.find((e) => e.description.includes('NO ATTENDANCE RECORD'));
    expect(noAttException).toBeDefined();
    expect(noAttException?.severity).toBe('HIGH');
  });

  it('4. Reconciliation Engine: accurately matches present days and OT hours', async () => {
    const request: AttendanceExportRequest = {
      vendorId: TEST_VENDOR_ID,
      companyId: TEST_COMPANY_ID,
      siteId: TEST_SITE_ID,
      periodStart: '2026-08-26',
      periodEnd: '2026-09-25',
      vendorName: 'Joy Manpower Services Private Limited',
      companyName: 'Arjuna Natural Pvt Ltd',
      siteName: 'Factory Premises — Unit 2 Plant',
      periodLabel: '26 Aug 2026 – 25 Sep 2026',
      generatedBy: 'Vendor Admin',
      totalWorkers: 44,
    };

    const dataset = await getVendorAttendanceExportData(request);

    expect(dataset.reconciliation.length).toBe(44);
    const sakthiRecon = dataset.reconciliation.find((r) => r.employee_name === 'SAKTHI S');
    expect(sakthiRecon).toBeDefined();
    expect(sakthiRecon?.attendance_present_days).toBe(5);
    expect(sakthiRecon?.mr_present_days).toBe(5);
    expect(sakthiRecon?.present_variance).toBe(0);
    expect(sakthiRecon?.status).toBe('MATCHED');
  });

  it('5. Separate Export Services: both functions are defined and independent', () => {
    expect(typeof exportVendorAttendanceXLSX).toBe('function');
    expect(typeof exportCompanyAttendanceXLSX).toBe('function');
    expect(exportVendorAttendanceXLSX).not.toBe(exportCompanyAttendanceXLSX);
  });

  it('6. Company-to-Vendor Out-of-the-box: exports successfully with benchmark data when no manual upload exists', async () => {
    // Clear staged records to simulate fresh user visit to /vendors/attendance-recon
    VendorAttendanceEngineService.stageAttendance([]);

    const hrRequest: AttendanceExportRequest = {
      vendorId: 'VEN-JOY-001',
      companyId: 'org-joy-main',
      siteId: 'rel-stream-b-joy-che-01',
      periodStart: '2026-08-26',
      periodEnd: '2026-09-25',
      vendorName: 'JOY MANPOWER SERVICE',
      companyName: 'Joy Corporate Solutions Pvt Ltd',
      siteName: 'Chennai Manufacturing Plant (CHE 01)',
      periodLabel: '26 Aug 2026 – 25 Sep 2026',
      generatedBy: 'Company HR Admin',
      totalWorkers: 44,
    };

    const hrExport = await exportCompanyAttendanceXLSX(hrRequest);
    expect(hrExport.success).toBe(true);
    expect(hrExport.filename).toContain('COMPANY_WORKFORCE_PACK');
    expect(hrExport.integrity.employeeCount).toBeGreaterThanOrEqual(43);

    const vendorExport = await exportVendorAttendanceXLSX(hrRequest);
    expect(vendorExport.success).toBe(true);
    expect(vendorExport.filename).toContain('VENDOR_ATTENDANCE_PACK');
    expect(vendorExport.integrity.employeeCount).toBeGreaterThanOrEqual(43);
  });
});
