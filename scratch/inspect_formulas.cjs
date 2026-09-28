const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Test Data', "ARJUNA NATURALS INVOICE JULY'26.xlsx");
const wb = xlsx.readFile(filePath, { cellFormula: true });

console.log('=== BREAKUP SHEET CELLS & FORMULAS ===');
const breakupSheet = wb.Sheets['Breakup'];
const breakupRange = xlsx.utils.decode_range(breakupSheet['!ref']);
for (let R = breakupRange.s.r; R <= breakupRange.e.r; ++R) {
  let rowStr = `R${R+1}: `;
  for (let C = breakupRange.s.c; C <= breakupRange.e.c; ++C) {
    const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
    const cell = breakupSheet[cellRef];
    if (cell) {
      rowStr += `[${cellRef}=${cell.v}${cell.f ? ' f:' + cell.f : ''}] `;
    }
  }
  console.log(rowStr);
}

console.log('\n=== ALLOWANCE SHEET TOTALS & FORMULAS ===');
const allowSheet = wb.Sheets['Allowance'];
const allowRange = xlsx.utils.decode_range(allowSheet['!ref']);
for (let R = allowRange.e.r - 5; R <= allowRange.e.r; ++R) {
  let rowStr = `R${R+1}: `;
  for (let C = allowRange.s.c; C <= allowRange.e.c; ++C) {
    const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
    const cell = allowSheet[cellRef];
    if (cell) {
      rowStr += `[${cellRef}=${cell.v}${cell.f ? ' f:' + cell.f : ''}] `;
    }
  }
  console.log(rowStr);
}

console.log('\n=== INVOICE SHEET CELLS & FORMULAS ===');
const invSheet = wb.Sheets['INVOICE'];
const invRange = xlsx.utils.decode_range(invSheet['!ref']);
for (let R = invRange.s.r; R <= invRange.e.r; ++R) {
  let rowStr = `R${R+1}: `;
  for (let C = invRange.s.c; C <= invRange.e.c; ++C) {
    const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
    const cell = invSheet[cellRef];
    if (cell) {
      rowStr += `[${cellRef}=${cell.v}${cell.f ? ' f:' + cell.f : ''}] `;
    }
  }
  console.log(rowStr);
}
