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

function norm(s) {
  return (s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

console.log('--- Checking if Part 2 / Part 3 provide EEV codes for blank/numeric in Part 1 ---');

p1.forEach(r1 => {
  const code1 = (r1['EMP NO'] || '').trim().toUpperCase();
  const name1 = norm(r1['NAME']);
  if (!code1.startsWith('EEV')) {
    // Check Part 2
    const m2 = p2.find(r2 => norm(r2['NAME']) === name1);
    const m3 = p3.find(r3 => norm(r3['NAME']) === name1);
    
    let foundCode = '';
    if (m2 && (m2['EMP NO'] || '').startsWith('EEV')) foundCode = m2['EMP NO'];
    if (m3 && (m3['EMP NO'] || '').startsWith('EEV')) foundCode = m3['EMP NO'];
    
    if (foundCode) {
      console.log(`Matched! Part 1 Name "${r1['NAME']}" (had "${code1}") -> Found EEV in other part: "${foundCode}"`);
    }
  }
});

