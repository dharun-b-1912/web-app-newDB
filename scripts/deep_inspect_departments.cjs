const fs = require('fs');

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const header = lines[0].split(',').map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // Handle comma inside quotes if any, or simple split
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
const p2 = parseCSV(fs.readFileSync('scripts/raw_part2.csv', 'utf8'));
const p3 = parseCSV(fs.readFileSync('scripts/raw_part3.csv', 'utf8'));

console.log(`P1 rows: ${p1.length}`);
console.log(`P2 rows: ${p2.length}`);
console.log(`P3 rows: ${p3.length}`);

// Let's examine all distinct departments in P1, P2, P3
const p1Depts = new Map();
p1.forEach(r => {
  const d = r['DEPARTMENT'] || r['Department'] || '';
  const status = r['STATUS'] || r['Status'] || '';
  const desig = r['DESIGNATION'] || r['Designation'] || '';
  const key = `${d} | Desig: ${desig}`;
  p1Depts.set(key, (p1Depts.get(key) || 0) + 1);
});

console.log('\n--- P1 Departments and Designations ---');
for (const [k, v] of p1Depts.entries()) {
  console.log(`[${v}] ${k}`);
}

const p2Depts = new Map();
p2.forEach(r => {
  const d = r['DEPARTMENT'] || r['Department'] || '';
  const desig = r['DESIGNATION'] || r['Designation'] || '';
  const key = `${d} | Desig: ${desig}`;
  p2Depts.set(key, (p2Depts.get(key) || 0) + 1);
});

console.log('\n--- P2 Departments and Designations ---');
for (const [k, v] of p2Depts.entries()) {
  console.log(`[${v}] ${k}`);
}

const p3Depts = new Map();
p3.forEach(r => {
  const d = r['DEPARTMENT'] || r['Department'] || '';
  const desig = r['DESIGNATION'] || r['Designation'] || '';
  const key = `${d} | Desig: ${desig}`;
  p3Depts.set(key, (p3Depts.get(key) || 0) + 1);
});

console.log('\n--- P3 Departments and Designations ---');
for (const [k, v] of p3Depts.entries()) {
  console.log(`[${v}] ${k}`);
}

