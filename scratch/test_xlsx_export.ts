import { exportVendorAttendanceXLSX } from '../src/services/vendor/exportVendorAttendanceXLSX';

async function testExport() {
  const result = await exportVendorAttendanceXLSX({
    vendorId: 'VEN-JOY-001',
    companyId: 'org-joy-main',
    periodStart: '2026-08-26',
    periodEnd: '2026-09-25',
    vendorName: 'Joy Manpower Services Private Limited',
    companyName: 'JOY CORPORATE SOLUTIONS PVT LTD',
    siteName: 'Unit II',
    periodLabel: '26 Aug 2026 – 25 Sep 2026',
    generatedBy: 'System Test',
  });

  console.log('Export success:', result.success);
  console.log('Filename:', result.filename);
  console.log('Integrity passed:', result.integrity.passed);
  console.log('Total workers:', result.integrity.employeeCount);
  console.log('Attendance records:', result.integrity.attendanceCount);
  console.log('MR report rows:', result.integrity.mrCount);
  console.log('OT total hours:', result.integrity.otTotalHours);
  console.log('Warnings:', result.warnings);
  if (result.error) console.log('Error:', result.error);
}

testExport();
