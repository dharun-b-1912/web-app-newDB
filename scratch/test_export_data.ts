import { getVendorAttendanceExportData } from '../src/services/vendor/vendorAttendanceNormalizedDataService';

async function test() {
  const dataset = await getVendorAttendanceExportData({
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

  console.log('Dataset total workers:', dataset.totalWorkers);
  console.log('Dataset workers with attendance:', dataset.workersWithAttendance);
  console.log('Dataset attendance records count:', dataset.attendanceRecordCount);
  console.log('Dataset MR report count:', dataset.mrReport.length);
  console.log('Dataset OT matrix count:', dataset.otMatrix.length);
  const totalOt = dataset.otMatrix.reduce((s, r) => s + r.total_ot_hours, 0);
  console.log('Dataset total OT hours:', totalOt);
}

test();
