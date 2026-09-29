const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('D:', 'web-app (2)', 'Joy PeopleHR', 'Test Data', 'Ref', "JOY MANPOWER SERVICE SALARY STATEMENT FOR THE MONTH OF SEPTEMBER'26_Unit III.xlsx");
const wb = XLSX.readFile(filePath, { cellFormula: true, cellStyles: true });
const ws = wb.Sheets['D WAGES'];

// Inspect columns:
// G: D WAGES (col 6)
// H: W DAYS (col 7)
// J: PAY DAYS (col 9)
// K: BASIC 55% (col 10)
// L: HRA 45% (col 11)
// M: Wages (col 12)
// N: OT (col 13)
// O: OT STIPEND (col 14)
// P: F.ALLOW (col 15)
// Q: N.ALLOW (col 16)
// T: GROSS (col 19)
// U: ESI WAGES (col 20)
// V: PF 12% (col 21)
// W: ESI 0.75% (col 22)
// X: CANTEEN (col 23)
// AA: NET AMOUNT (col 26)

console.log('--- Inspecting Rows 4 to 8 ---');
for (let r = 4; r <= 8; r++) {
  const getCell = (colLetter) => {
    const c = ws[`${colLetter}${r}`];
    return c ? (c.f ? `=${c.f} [${c.v}]` : `${c.v}`) : 'empty';
  };
  console.log(`\nRow ${r}: Name=${getCell('C')}, D.Wages=${getCell('G')}, W.Days=${getCell('H')}, Wages=${getCell('M')}`);
  console.log(`  OT Hours=${getCell('N')}, OT Stipend=${getCell('O')}`);
  console.log(`  F.Allow=${getCell('P')}, N.Allow=${getCell('Q')}`);
  console.log(`  Gross=${getCell('T')}, ESI Wage=${getCell('U')}, PF=${getCell('V')}, ESI=${getCell('W')}, Canteen=${getCell('X')}, Net=${getCell('AA')}`);
}

console.log('\n--- Checking Row 46 (SANJAY) ---');
const r = 46;
const getCell = (colLetter) => {
  const c = ws[`${colLetter}${r}`];
  return c ? (c.f ? `=${c.f} [${c.v}]` : `${c.v}`) : 'empty';
};
console.log(`Row 46: Name=${getCell('C')}, D.Wages=${getCell('G')}, W.Days=${getCell('H')}, Wages=${getCell('M')}`);
console.log(`  OT Hours=${getCell('N')}, OT Stipend=${getCell('O')}`);
console.log(`  F.Allow=${getCell('P')}, N.Allow=${getCell('Q')}`);
console.log(`  Gross=${getCell('T')}, ESI Wage=${getCell('U')}, PF=${getCell('V')}, ESI=${getCell('W')}, Canteen=${getCell('X')}, Net=${getCell('AA')}`);

console.log('\n--- Checking Non-Zero F.ALLOW & N.ALLOW across all rows ---');
for (let row = 4; row <= 46; row++) {
  const fa = ws[`P${row}`]?.v || 0;
  const na = ws[`Q${row}`]?.v || 0;
  const cant = ws[`X${row}`]?.v || 0;
  if (fa > 0 || na > 0 || cant > 0) {
    const name = ws[`C${row}`]?.v;
    const empId = ws[`B${row}`]?.v;
    console.log(`Row ${row} (${empId} - ${name}): F.Allow=${fa}, N.Allow=${na}, Canteen=${cant}`);
  }
}
