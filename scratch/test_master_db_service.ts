import * as fs from 'fs';
import * as path from 'path';
import { UniversalWorkbookInspector } from '../src/services/vendor/universalSheetParsers/index';

async function testServiceFlow() {
  const filePath = path.join(process.cwd(), 'Test Data', 'JOY SEP IN & OUT.xlsx');
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], 'JOY SEP IN & OUT.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const inspection = await UniversalWorkbookInspector.inspectWorkbook(file);
  console.log('Inspection sheets:', Object.keys(inspection.sheets));
  const attRecords = inspection.sheets['IN&OUT']?.attendanceData?.records || [];
  const mrRecords = inspection.sheets['MR REPORT']?.mrData?.records || [];
  const otRecords = inspection.sheets['OT']?.otData?.records || [];

  console.log(`attRecords: ${attRecords.length}, mrRecords: ${mrRecords.length}, otRecords: ${otRecords.length}`);

  // Test building 357 daily OT entries from parsed otRecords
  const dailyOtEntries: any[] = [];
  otRecords.forEach((ot) => {
    Object.entries(ot.dailyOt || {}).forEach(([dayCol, hours]) => {
      const numHours = Number(hours);
      if (numHours && numHours > 0) {
        // Derive exact ISO date: 26 to 31 -> 2026-08-XX, 1 to 25 -> 2026-09-XX
        const dayNum = parseInt(dayCol, 10);
        let isoDate = '';
        let displayDate = '';
        if (dayNum >= 26 && dayNum <= 31) {
          isoDate = `2026-08-${String(dayNum).padStart(2, '0')}`;
          displayDate = `${String(dayNum).padStart(2, '0')}-Aug-2026`;
        } else if (dayNum >= 1 && dayNum <= 25) {
          isoDate = `2026-09-${String(dayNum).padStart(2, '0')}`;
          displayDate = `${String(dayNum).padStart(2, '0')}-Sep-2026`;
        } else {
          isoDate = `2026-09-${dayCol}`;
          displayDate = `${dayCol}-Sep-2026`;
        }

        dailyOtEntries.push({
          date: isoDate,
          display_date: displayDate,
          employee_id: ot.employeeId,
          employee_name: ot.employeeName,
          shift_standard_hours: 8,
          worked_hours: 8 + numHours,
          potential_ot: numHours,
          approved_ot: numHours,
          hourly_rate: 'Not Configured',
          payable_amount: 'Pending Rate',
          approval: 'Approved',
          authorization: 'Supervisor Authorization Slip',
          source_row: ot.sourceRowNumber || 7,
        });
      }
    });
  });

  console.log('Built dailyOtEntries count:', dailyOtEntries.length);
  console.log('Sample dailyOtEntry 0:', dailyOtEntries[0]);
}

testServiceFlow().catch(console.error);
