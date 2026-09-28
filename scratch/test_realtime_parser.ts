import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { UniversalWorkbookInspector } from '../src/services/vendor/universalSheetParsers/index';

async function main() {
  const filePath = path.join(process.cwd(), 'Test Data', 'JOY SEP IN & OUT.xlsx');
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], 'JOY SEP IN & OUT.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  console.log('Inspecting workbook in real-time...');
  const inspection = await UniversalWorkbookInspector.inspectWorkbook(file);

  console.log('Sheet Names:', inspection.sheetNames);
  for (const [name, res] of Object.entries(inspection.sheets)) {
    console.log(`\n--- SHEET ${name} ---`);
    console.log('Classification:', res.classification);
    console.log('Valid:', (res as any).isValid ?? true);
    console.log('Headers found:', (res as any).headers?.length ?? 0);
    console.log('Unique Employees:', res.qualitySummary?.uniqueEmployeeCount);
    console.log('Source Row Count:', res.qualitySummary?.sourceRowCount);
    if (res.attendanceData) {
      console.log('Attendance Records:', res.attendanceData.records.length);
      console.log('Attendance Unique Workers:', res.attendanceData.kpis.uniqueWorkers);
    }
    if (res.mrData) {
      console.log('MR Records:', res.mrData.records.length);
      console.log('MR Total Workers:', res.mrData.kpis.totalWorkers);
      console.log('MR Total Present Days:', res.mrData.kpis.totalPresentDays);
      console.log('MR Total OT Hours:', res.mrData.kpis.totalOtHours);
    }
    if (res.otData) {
      console.log('OT Records:', res.otData.records.length);
      console.log('OT Total Workers:', res.otData.kpis.totalOtWorkers);
      console.log('OT Total Hours:', res.otData.kpis.totalOtHours);
      console.log('OT Record 0:', res.otData.records[0]);
    }
  }

  console.log('\n--- RECONCILIATION SUMMARY ---');
  console.log('Recon rows count:', inspection.reconciliation?.rows?.length);
  console.log('Total Present Variance:', (inspection.reconciliation as any)?.totalPresentVariance ?? 0);
  console.log('Total OT Variance:', (inspection.reconciliation as any)?.totalOtVariance ?? 0);
}

main().catch(console.error);
