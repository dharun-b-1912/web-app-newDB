import * as fs from 'fs';
import * as path from 'path';
import { UniversalWorkbookInspector } from '../src/services/vendor/universalSheetParsers/index';

async function testOt() {
  const filePath = path.join(process.cwd(), 'Test Data', 'JOY SEP IN & OUT.xlsx');
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], 'JOY SEP IN & OUT.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const inspection = await UniversalWorkbookInspector.inspectWorkbook(file);
  const otSheet = inspection.sheets['OT'];

  let totalOtHours = 0;
  let totalEntries = 0;
  otSheet?.otData?.records?.forEach((r) => {
    totalOtHours += r.totalOtHours || 0;
    Object.entries(r.dailyOt || {}).forEach(([day, hrs]) => {
      const num = Number(hrs);
      if (num && num > 0) {
        totalEntries++;
      }
    });
  });

  console.log('Total OT Workers:', otSheet?.otData?.records?.length);
  console.log('Total OT Hours sum:', totalOtHours);
  console.log('Total positive OT entries:', totalEntries);
  console.log('Sum of otDaysCount across records:', otSheet?.otData?.records?.reduce((s, r) => s + (r.otDaysCount || 0), 0));
}

testOt().catch(console.error);
