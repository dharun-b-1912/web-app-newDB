const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Test Data', "ARJUNA NATURALS INVOICE JULY'26.xlsx");
const wb = xlsx.readFile(filePath, { cellFormula: true });

console.log('=== WORKINGS SHEET CELLS & FORMULAS ===');
const sheet = wb.Sheets['Workings'];
const range = xlsx.utils.decode_range(sheet['!ref']);
for (let R = range.s.r; R <= range.e.r; ++R) {
  let rowStr = `R${R+1}: `;
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
    const cell = sheet[cellRef];
    if (cell) {
      rowStr += `[${cellRef}=${cell.v}${cell.f ? ' f:' + cell.f : ''}] `;
    }
  }
  console.log(rowStr);
}
