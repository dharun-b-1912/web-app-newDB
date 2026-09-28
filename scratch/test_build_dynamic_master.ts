import * as fs from 'fs';
import * as path from 'path';
import { UniversalWorkbookInspector } from '../src/services/vendor/universalSheetParsers/index';

async function testDynamicMaster() {
  const filePath = path.join(process.cwd(), 'Test Data', 'JOY SEP IN & OUT.xlsx');
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], 'JOY SEP IN & OUT.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const inspection = await UniversalWorkbookInspector.inspectWorkbook(file);
  const mrSheet = inspection.sheets['MR REPORT'];

  console.log('Sample MR record 0:', mrSheet?.mrData?.records?.[0]);
  console.log('Sample MR record 1:', mrSheet?.mrData?.records?.[1]);
}

testDynamicMaster().catch(console.error);
