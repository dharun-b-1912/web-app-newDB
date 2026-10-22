import ExcelJS from 'exceljs';

async function inspectWorkbook(filepath) {
  console.log(`\n=== Inspecting: ${filepath} ===`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filepath);
  wb.eachSheet((sheet, id) => {
    console.log(`Sheet ${id}: "${sheet.name}" (Rows: ${sheet.rowCount}, Cols: ${sheet.columnCount})`);
  });
}

async function main() {
  await inspectWorkbook('D:\\web-app (2)\\Joy PeopleHR\\Test Data\\MIS REPORT TEST\\Joy_Corporate_Solutions_Daily_Attendance_Audit_2026-10-15.xlsx');
  await inspectWorkbook('D:\\web-app (2)\\Joy PeopleHR\\Test Data\\MIS REPORT TEST\\Workforce_Organization_Morning_CheckIn_Turnout_2026-10-16.xlsx');
}

main();
