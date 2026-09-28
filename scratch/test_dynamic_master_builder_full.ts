import * as fs from 'fs';
import * as path from 'path';
import { UniversalWorkbookInspector } from '../src/services/vendor/universalSheetParsers/index';

async function testFull() {
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

  console.log('attSheet records:', attSheet?.attendanceData?.records?.length);
  console.log('mrSheet records:', mrSheet?.mrData?.records?.length);
  console.log('otSheet records:', otSheet?.otData?.records?.length);

  // Check unique employee IDs in MR vs IN&OUT
  const mrEmpIds = new Set(mrSheet?.mrData?.records?.map((r: any) => r.employeeId));
  const attEmpIds = new Set(attSheet?.attendanceData?.records?.map((r: any) => r.employeeId));

  console.log('Unique MR employee IDs:', mrEmpIds.size);
  console.log('Unique IN&OUT employee IDs:', attEmpIds.size);

  const missingInAtt = [...mrEmpIds].filter((id) => !attEmpIds.has(id));
  const missingInMr = [...attEmpIds].filter((id) => !mrEmpIds.has(id));

  console.log('In MR but not in IN&OUT:', missingInAtt);
  console.log('In IN&OUT but not in MR:', missingInMr);
}

testFull().catch(console.error);
