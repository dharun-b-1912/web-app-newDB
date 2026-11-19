const fs = require('fs');
const path = require('path');

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

function parseFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const r = {};
    header.forEach((h, idx) => r[h] = vals[idx] || '');
    r._line = i + 1;
    rows.push(r);
  }
  return rows;
}

const p1 = parseFile(path.join(__dirname, 'raw_part1.csv'));
const p2 = parseFile(path.join(__dirname, 'raw_part2.csv'));
const p3 = parseFile(path.join(__dirname, 'raw_part3.csv'));

function normalize(s) {
  return (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

console.log('--- DETAILED CHECK OF PART 2 IN PART 1 ---');
p2.forEach(r => {
  const name = normalize(r['NAME']);
  const empNo = normalize(r['EMP NO']);
  const match = p1.find(p => (empNo && normalize(p['EMP NO']) === empNo) || normalize(p['NAME']) === name);
  if (!match) {
    console.log('Part 2 row NOT in Part 1:', r['NAME'], r['EMP NO']);
  }
});

console.log('--- DETAILED CHECK OF PART 3 IN PART 1 ---');
p3.forEach(r => {
  const name = normalize(r['NAME']);
  const empNo = normalize(r['EMP NO']);
  const match = p1.find(p => (empNo && normalize(p['EMP NO']) === empNo) || normalize(p['NAME']) === name);
  if (!match) {
    console.log('Part 3 row NOT in Part 1:', r['NAME'], r['EMP NO']);
  }
});

