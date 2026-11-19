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

const lines = fs.readFileSync(path.join(__dirname, 'raw_part1.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
const header = parseLine(lines[0]);
const deps = new Set();
const desigs = new Set();

for (let i = 1; i < lines.length; i++) {
  const vals = parseLine(lines[i]);
  const r = {};
  header.forEach((h, idx) => r[h] = vals[idx] || '');
  if (r['DEPARTMENT']) deps.add(r['DEPARTMENT'].trim());
  if (r['DESIGNATION']) desigs.add(r['DESIGNATION'].trim());
}

console.log('Distinct Departments in raw data:', Array.from(deps));
console.log('Distinct Designations in raw data:', Array.from(desigs));
