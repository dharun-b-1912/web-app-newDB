const fs = require('fs');
const path = require('path');

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  
  function parseLine(text) {
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const header = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    header.forEach((h, idx) => {
      row[h || `COL_${idx}`] = values[idx] || '';
    });
    row._line = i + 1;
    rows.push(row);
  }
  return { header, rows };
}

const part1 = parseCSV(fs.readFileSync(path.join(__dirname, 'raw_part1.csv'), 'utf8'));

console.log('Total rows in Part 1:', part1.rows.length);

// Analyze unique names and unique emp codes in Part 1
const byEmpNo = new Map();
const byName = new Map();
const duplicates = [];

part1.rows.forEach(r => {
  const empNo = (r['EMP NO'] || '').trim().toUpperCase();
  const name = (r['NAME'] || '').trim().toUpperCase();
  const phone = (r['Mobile NO'] || '').trim().replace(/\D/g, '').slice(-10);
  const aadhar = (r['Aadhar Number'] || '').trim().replace(/\D/g, '');

  if (empNo) {
    if (!byEmpNo.has(empNo)) byEmpNo.set(empNo, []);
    byEmpNo.get(empNo).push(r);
  }
  if (name) {
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(r);
  }
});

console.log('Unique EMP NOs in Part 1:', byEmpNo.size);
console.log('Unique Names in Part 1:', byName.size);

console.log('\n--- Duplicate EMP NOs in Part 1 ---');
let dupEmpCount = 0;
byEmpNo.forEach((rows, empNo) => {
  if (rows.length > 1) {
    dupEmpCount++;
    console.log(`EMP NO ${empNo} occurs ${rows.length} times:`, rows.map(r => `${r['NAME']} (Status: ${r['STATUS']}, DOJ: ${r['D.O.J']})`));
  }
});

console.log('\n--- Duplicate Names in Part 1 ---');
let dupNameCount = 0;
byName.forEach((rows, name) => {
  if (rows.length > 1) {
    dupNameCount++;
    console.log(`Name "${name}" occurs ${rows.length} times:`, rows.map(r => `EMP NO: "${r['EMP NO']}", Status: ${r['STATUS']}, Phone: ${r['Mobile NO']}, DOJ: ${r['D.O.J']}`));
  }
});

console.log('\n--- Rows without EMP NO in Part 1 ---');
const noEmpNo = part1.rows.filter(r => !(r['EMP NO'] || '').trim());
console.log(`Count: ${noEmpNo.length}`);
noEmpNo.forEach(r => {
  console.log(`  Line ${r._line}: Name: "${r['NAME']}", Desig: "${r['DESIGNATION']}", Dept: "${r['DEPARTMENT']}", Status: "${r['STATUS']}", Exit: "${r['EXIT DATE']}"`);
});
