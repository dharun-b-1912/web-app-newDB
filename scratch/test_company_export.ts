import { exportCompanyAttendanceXLSX } from '../src/services/vendor/exportCompanyAttendanceXLSX';

async function testCompanyExport() {
  const result = await exportCompanyAttendanceXLSX({
    vendorId: 'VEN-JOY-001',
    companyId: 'org-joy-main',
    periodStart: '2026-08-26',
    periodEnd: '2026-09-25',
    vendorName: 'Joy Manpower Services Private Limited',
    companyName: 'JOY CORPORATE SOLUTIONS PVT LTD',
    siteName: 'Unit II',
    periodLabel: '26 Aug 2026 – 25 Sep 2026',
    generatedBy: 'Company HR Admin',
  });

  console.log('Company export success:', result.success);
  console.log('Filename:', result.filename);
  console.log('Integrity passed:', result.integrity.passed);
  console.log('Total workers:', result.integrity.employeeCount);
  console.log('Attendance records:', result.integrity.attendanceCount);
  console.log('MR report rows:', result.integrity.mrCount);
  console.log('OT total hours:', result.integrity.otTotalHours);
  if (result.error) console.log('Error:', result.error);
}

testCompanyExport();
