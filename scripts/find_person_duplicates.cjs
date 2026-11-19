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

// Find duplicates by Aadhaar
const byAadhaar = new Map();
const byPhone = new Map();
const byBank = new Map();

p1.forEach(r => {
  const aadhar = (r['Aadhar Number'] || '').replace(/\D/g, '');
  const phone = (r['Mobile NO'] || '').replace(/\D/g, '').slice(-10);
  const bank = (r['Bank Account Number'] || '').trim();

  if (aadhar && aadhar.length >= 10) {
    if (!byAadhaar.has(aadhar)) byAadhaar.set(aadhar, []);
    byAadhaar.get(aadhar).push(r);
  }
  if (phone && phone.length === 10) {
    if (!byPhone.has(phone)) byPhone.set(phone, []);
    byPhone.get(phone).push(r);
  }
  if (bank && bank.length >= 6) {
    if (!byBank.has(bank)) byBank.set(bank, []);
    byBank.get(bank).push(r);
  }
});

console.log('--- DUPLICATES BY AADHAAR ---');
byAadhaar.forEach((rows, aadhar) => {
  if (rows.length > 1) {
    console.log(`Aadhaar ${aadhar} (${rows.length} rows):`);
    rows.forEach(r => console.log(`  Line ${r._line}: EMP: "${r['EMP NO']}", Name: "${r['NAME']}", Status: "${r['STATUS']}", DOJ: "${r['D.O.J']}"`));
  }
});

console.log('\n--- DUPLICATES BY PHONE ---');
byPhone.forEach((rows, phone) => {
  if (rows.length > 1) {
    console.log(`Phone ${phone} (${rows.length} rows):`);
    rows.forEach(r => console.log(`  Line ${r._line}: EMP: "${r['EMP NO']}", Name: "${r['NAME']}", Status: "${r['STATUS']}", DOJ: "${r['D.O.J']}"`));
  }
});

