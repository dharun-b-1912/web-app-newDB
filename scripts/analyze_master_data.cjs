const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  
  // Custom CSV parser handling quotes
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
    row._rawIndex = i;
    rows.push(row);
  }
  return { header, rows };
}

const part1 = parseCSV(fs.readFileSync(path.join(__dirname, 'raw_part1.csv'), 'utf8'));
const part2 = parseCSV(fs.readFileSync(path.join(__dirname, 'raw_part2.csv'), 'utf8'));
const part3 = parseCSV(fs.readFileSync(path.join(__dirname, 'raw_part3.csv'), 'utf8'));

console.log('--- RAW ROW COUNTS ---');
console.log('Part 1 rows:', part1.rows.length);
console.log('Part 2 rows:', part2.rows.length);
console.log('Part 3 rows:', part3.rows.length);

// Let's analyze Part 1
const p1WithEmpNo = part1.rows.filter(r => r['EMP NO']);
const p1WithoutEmpNo = part1.rows.filter(r => !r['EMP NO']);
console.log('\nPart 1:');
console.log('  With EMP NO:', p1WithEmpNo.length);
console.log('  Without EMP NO:', p1WithoutEmpNo.length);

// Check if names in Part 2 and Part 3 exist in Part 1
const p1Names = new Set(part1.rows.map(r => (r['NAME'] || '').trim().toUpperCase()).filter(Boolean));
const p1EmpNos = new Set(part1.rows.map(r => (r['EMP NO'] || '').trim().toUpperCase()).filter(Boolean));

let p2InP1 = 0;
let p2NotInP1 = 0;
const p2Only = [];
part2.rows.forEach(r => {
  const name = (r['NAME'] || '').trim().toUpperCase();
  const empNo = (r['EMP NO'] || '').trim().toUpperCase();
  if ((empNo && p1EmpNos.has(empNo)) || p1Names.has(name)) {
    p2InP1++;
  } else {
    p2NotInP1++;
    p2Only.push({ name, empNo });
  }
});

let p3InP1 = 0;
let p3NotInP1 = 0;
const p3Only = [];
part3.rows.forEach(r => {
  const name = (r['NAME'] || '').trim().toUpperCase();
  const empNo = (r['EMP NO'] || '').trim().toUpperCase();
  if ((empNo && p1EmpNos.has(empNo)) || p1Names.has(name)) {
    p3InP1++;
  } else {
    p3NotInP1++;
    p3Only.push({ name, empNo });
  }
});

console.log('\nCross-comparison with Part 1:');
console.log(`Part 2: ${p2InP1} already in Part 1, ${p2NotInP1} unique to Part 2`);
if (p2Only.length > 0) console.log('  Part 2 only:', p2Only);

console.log(`Part 3: ${p3InP1} already in Part 1, ${p3NotInP1} unique to Part 3`);
if (p3Only.length > 0) console.log('  Part 3 only:', p3Only);
