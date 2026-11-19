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

console.log('Part 1 total rows:', p1.length);
const p1Status = {};
p1.forEach(r => {
  const st = (r['STATUS'] || 'EMPTY').toUpperCase();
  p1Status[st] = (p1Status[st] || 0) + 1;
});
console.log('Part 1 status breakdown:', p1Status);

console.log('\nPart 2 total rows:', p2.length);
const p2Status = {};
p2.forEach(r => {
  const st = (r['STATUS'] || 'EMPTY').toUpperCase();
  p2Status[st] = (p2Status[st] || 0) + 1;
});
console.log('Part 2 status breakdown:', p2Status);

console.log('\nPart 3 total rows:', p3.length);
const p3Status = {};
p3.forEach(r => {
  const st = (r['STATUS'] || 'EMPTY').toUpperCase();
  p3Status[st] = (p3Status[st] || 0) + 1;
});
console.log('Part 3 status breakdown:', p3Status);
