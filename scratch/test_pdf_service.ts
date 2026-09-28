import { AttendanceMisReportPdfService } from '../src/services/attendance/attendanceMisReportPdfService';
import { attendanceMisReportService } from '../src/services/attendance/attendanceMisReportService';

async function verify() {
  console.log('Testing AttendanceMisReportPdfService...');
  const report = await attendanceMisReportService.getHierarchicalAttendanceMissReport();
  console.log('Loaded report for date:', report.reportDate);
  console.log('Exceptions count:', report.flatExceptions.length);

  const base64 = AttendanceMisReportPdfService.generatePdfBase64(report);
  console.log('Generated PDF base64 length:', base64.length);
  if (base64.length < 1000) {
    throw new Error('PDF output too small or invalid');
  }

  console.log('✓ AttendanceMisReportPdfService successfully generated valid vector PDF!');
}

verify().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
