import * as fs from 'fs';
import * as path from 'path';
import { UniversalWorkbookInspector } from '../src/services/vendor/universalSheetParsers/index';

async function testInspectionMaster() {
  const filePath = path.join(process.cwd(), 'Test Data', 'JOY SEP IN & OUT.xlsx');
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], 'JOY SEP IN & OUT.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const inspection = await UniversalWorkbookInspector.inspectWorkbook(file);
  const sheets = inspection.sheets || {};
  const attSheet = Object.values(sheets).find((s: any) => s.classification === 'ATTENDANCE') as any;
  const mrSheet = Object.values(sheets).find((s: any) => s.classification === 'MR_REPORT') as any;
  const otSheet = Object.values(sheets).find((s: any) => s.classification === 'OT_REPORT') as any;

  console.log('Sheets found:', {
    att: !!attSheet,
    mr: !!mrSheet,
    ot: !!otSheet,
  });

  const rawAttRecords = attSheet?.attendanceData?.records || [];
  const rawMrRecords = mrSheet?.mrData?.records || [];
  const rawOtRecords = otSheet?.otData?.records || [];

  console.log(`att: ${rawAttRecords.length}, mr: ${rawMrRecords.length}, ot: ${rawOtRecords.length}`);
}

testInspectionMaster().catch(console.error);
