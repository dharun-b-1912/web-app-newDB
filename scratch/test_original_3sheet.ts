import { exportOriginalFormat3SheetsXLSX } from '../src/services/vendor/exportOriginal3SheetXLSX';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Testing exact 3-sheet ditto replica export...');
  const res = await exportOriginalFormat3SheetsXLSX({
    companyName: 'WATERTEC (INDIA) PRIVATE LIMITED',
    location: 'Coimbatore',
    periodLabel: '26-Aug-2026 - To 25-Sep-2026',
    vendorName: 'JOY MANPOWER SERVICES',
  });

  console.log('Export success:', res.success);
  console.log('Filename:', res.filename);
  console.log('Buffer bytes:', res.buffer.byteLength);

  // Write to scratch directory for inspection
  const outPath = path.join(process.cwd(), 'scratch', res.filename);
  fs.writeFileSync(outPath, res.buffer);
  console.log('Wrote file to:', outPath);

  // Read back with xlsx
  const wb = XLSX.readFile(outPath);
  console.log('Generated Sheet Names:', wb.SheetNames);

  // Check MR REPORT
  const mrWs = wb.Sheets['MR REPORT'];
  const mrRows = XLSX.utils.sheet_to_json<any[]>(mrWs, { header: 1, defval: '' });
  console.log('MR Total Rows:', mrRows.length);
  console.log('MR Row 8 (First Emp S.No 1):', (mrRows[7] as any[])?.slice(0, 6));
  console.log('MR Row 38 (S.No 31):', (mrRows[37] as any[])?.slice(0, 6));
  console.log('MR Row 51 (S.No 44 SANJAY):', (mrRows[50] as any[])?.slice(0, 6));
  console.log('MR Row 52 (TOTALS):', (mrRows[51] as any[])?.slice(15, 19));
  console.log('MR P52 Formula:', mrWs['P52']?.f, 'val:', mrWs['P52']?.v);
  console.log('MR Q52 Formula:', mrWs['Q52']?.f, 'val:', mrWs['Q52']?.v);

  // Check OT
  const otWs = wb.Sheets['OT'];
  const otRows = XLSX.utils.sheet_to_json<any[]>(otWs, { header: 1, defval: '' });
  console.log('OT Total Rows:', otRows.length);
  console.log('OT Row 7 (First OT Emp S.No 1):', (otRows[6] as any[])?.slice(0, 5));
  console.log('OT Row 37 (Last OT Emp S.No 31):', (otRows[36] as any[])?.slice(0, 5));
  console.log('OT Row 38 (TOTALS):', (otRows[37] as any[])?.slice(36, 39));
  console.log('OT AL38 Formula:', otWs['AL38']?.f);
  console.log('OT AM38 Formula:', otWs['AM38']?.f);

  // Check IN&OUT
  const inoutWs = wb.Sheets['IN&OUT'];
  const inoutRows = XLSX.utils.sheet_to_json<any[]>(inoutWs, { header: 1, defval: '' });
  console.log('IN&OUT Total Rows (incl headers & dept banners):', inoutRows.length);
}

main().catch(console.error);
