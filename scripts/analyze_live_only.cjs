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

// Filter out duplicates (Kishore) and blank rows (Dharinish)
const seenAadhaar = new Set();
const cleanRows = [];

p1.forEach((r, idx) => {
  const name = (r['NAME'] || '').trim();
  const aadhaar = (r['Aadhar Number'] || '').replace(/\D/g, '');
  const empNo = (r['EMP NO'] || '').trim();
  if (!name && !aadhaar && !empNo) return;
  if (name === 'DHARINISH' && !aadhaar && !empNo) return;

  if (aadhaar && seenAadhaar.has(aadhaar)) {
    return; // Duplicate Kishore
  }
  if (aadhaar) seenAadhaar.add(aadhaar);
  cleanRows.push({ ...r, _rawIndex: idx + 2 });
});

console.log(`Total cleaned unique rows: ${cleanRows.length}`);

// Now filter ONLY LIVE employees!
const liveEmployees = cleanRows.filter(r => {
  const status = (r['STATUS'] || 'LIVE').trim().toUpperCase();
  return status === 'LIVE';
});

const leftEmployees = cleanRows.filter(r => {
  const status = (r['STATUS'] || 'LIVE').trim().toUpperCase();
  return status === 'LEFT';
});

console.log(`LIVE employees count: ${liveEmployees.length}`);
console.log(`LEFT employees count: ${leftEmployees.length}`);

// Let's examine LIVE employees:
// 1. How many have official EEV codes?
// 2. How many have numeric badges 1..22?
// 3. How many have SUB01?
// 4. How many have empty / other?
let eevCount = 0;
let numericBadgeCount = 0;
let subCount = 0;
let blankCount = 0;

const liveCategorized = [];

liveEmployees.forEach(r => {
  const rawCode = (r['EMP NO'] || '').trim();
  if (rawCode.startsWith('EEV')) {
    eevCount++;
    liveCategorized.push({ type: 'EEV', code: rawCode, name: r['NAME'], dept: r['DEPARTMENT'], desig: r['DESIGNATION'] });
  } else if (/^\d+$/.test(rawCode)) {
    numericBadgeCount++;
    liveCategorized.push({ type: 'NUMERIC', code: rawCode, name: r['NAME'], dept: r['DEPARTMENT'], desig: r['DESIGNATION'] });
  } else if (rawCode.toUpperCase().startsWith('SUB')) {
    subCount++;
    liveCategorized.push({ type: 'SUB', code: rawCode, name: r['NAME'], dept: r['DEPARTMENT'], desig: r['DESIGNATION'] });
  } else {
    blankCount++;
    liveCategorized.push({ type: 'BLANK', code: rawCode, name: r['NAME'], dept: r['DEPARTMENT'], desig: r['DESIGNATION'] });
  }
});

console.log(`LIVE breakdown:
- Official EEV: ${eevCount}
- Numeric badges (1, 2, ...): ${numericBadgeCount}
- SUB01: ${subCount}
- Blank / unassigned: ${blankCount}
Total LIVE: ${liveEmployees.length}`);

console.log('\nNumeric badges list:');
liveCategorized.filter(x => x.type === 'NUMERIC').forEach(x => console.log(`Badge ${x.code}: ${x.name} (${x.dept || 'NO DEPT'})`));

console.log('\nSUB list:');
liveCategorized.filter(x => x.type === 'SUB').forEach(x => console.log(`Badge ${x.code}: ${x.name} (${x.dept || 'NO DEPT'})`));

console.log('\nBlank / unassigned list:');
liveCategorized.filter(x => x.type === 'BLANK').forEach(x => console.log(`Unassigned: ${x.name} (${x.dept || 'NO DEPT'}, Desig: ${x.desig})`));
