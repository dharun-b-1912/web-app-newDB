const fs = require('fs');

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const header = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    let cells = [];
    let inQuotes = false;
    let curr = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cells.push(curr.trim()); curr = ''; }
      else { curr += ch; }
    }
    cells.push(curr.trim());
    const obj = {};
    header.forEach((h, idx) => { obj[h] = cells[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

const p1 = parseCSV(fs.readFileSync('scripts/raw_part1.csv', 'utf8'));

console.log('Searching for numeric badges, SUB01, or temporary codes in P1:');
const nonEev = [];
p1.forEach((r, idx) => {
  const lineNum = idx + 2;
  const sNo = r['S NO'] || '';
  const unitSNo = r['UNIT S.No'] || '';
  const empNo = r['EMP NO'] || '';
  const name = r['NAME'] || '';
  const status = r['STATUS'] || '';
  const dept = r['DEPARTMENT'] || '';
  const desig = r['DESIGNATION'] || '';

  if (!empNo.startsWith('EEV')) {
    nonEev.push({ lineNum, sNo, unitSNo, empNo, name, status, dept, desig });
  }
});

console.log(`Found ${nonEev.length} non-EEV rows in P1:`);
nonEev.forEach(x => {
  console.log(`Line ${x.lineNum}: EMP NO="${x.empNo}", UNIT S.No="${x.unitSNo}", S NO="${x.sNo}", Name="${x.name}", Status="${x.status}", Dept="${x.dept}"`);
});
