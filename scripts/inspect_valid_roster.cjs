const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

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

function excelSerialToDateStr(serial) {
  if (!serial) return '';
  const num = Number(serial);
  if (isNaN(num)) {
    let s = String(serial).trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
    if (s.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      const parts = s.split('.');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (s.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const parts = s.split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (s.match(/^\d{2}-\d{2}-20206$/)) {
      const parts = s.split('-');
      return `2026-11-${parts[0]}`;
    }
    return s;
  }
  if (num < 1000) return '';
  const date = new Date(Math.round((num - 25569) * 86400 * 1000));
  if (isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function splitName(fullName) {
  let clean = fullName.trim().replace(/\s+/g, ' ');
  if (!clean) return { first: 'UNKNOWN', middle: '', last: '.' };

  // Handle Initial at end: e.g. "DHARUN S", "GUNASEKARAN G", "ADITHYA M", "RAJESH R", "SIVA BALA I"
  const endInitialMatch = clean.match(/^(.+?)\s+([A-Z])$/i);
  if (endInitialMatch) {
    const namePart = endInitialMatch[1].trim();
    const initial = endInitialMatch[2].toUpperCase();
    const parts = namePart.split(' ');
    if (parts.length === 1) {
      return { first: parts[0], middle: '', last: initial };
    } else {
      return { first: parts[0], middle: parts.slice(1).join(' '), last: initial };
    }
  }

  // Handle Initial at start: e.g. "S.GOWTHAM", "P.SANTHOSH KUMARAN", "R.NIVAS"
  const startInitialMatch = clean.match(/^([A-Z])[\.\s]+(.+)$/i);
  if (startInitialMatch) {
    const initial = startInitialMatch[1].toUpperCase();
    const namePart = startInitialMatch[2].trim();
    const parts = namePart.split(' ');
    if (parts.length === 1) {
      return { first: parts[0], middle: '', last: initial };
    } else {
      return { first: parts[0], middle: parts.slice(1).join(' '), last: initial };
    }
  }

  // Handle standard names: e.g. "GURU RAJ", "MARI SATHYA RAJAN"
  const parts = clean.split(' ');
  if (parts.length === 1) {
    return { first: parts[0], middle: '', last: '.' };
  } else if (parts.length === 2) {
    return { first: parts[0], middle: '', last: parts[1] };
  } else {
    return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
  }
}

const rawRows = parseFile(path.join(__dirname, 'raw_part1.csv'));
console.log('Total raw input rows:', rawRows.length);

// Deduplicate Kishore (line 48 & 145) and drop empty row (line 262)
const validRows = [];
const seenAadhaar = new Set();

rawRows.forEach(r => {
  const name = (r['NAME'] || '').trim();
  const aadhaar = (r['Aadhar Number'] || '').replace(/\D/g, '');
  if (!name && !aadhaar && !r['EMP NO']) return; // Empty row
  if (name === 'DHARINISH' && !aadhaar && !r['EMP NO']) return; // Empty DHARINISH row

  if (aadhaar && seenAadhaar.has(aadhaar)) {
    console.log(`Duplicate found and merged: "${name}" (Aadhaar: ${aadhaar})`);
    return;
  }
  if (aadhaar) seenAadhaar.add(aadhaar);
  validRows.push(r);
});

console.log('Valid unique employee records:', validRows.length);

// Find existing EEV numbers
const existingEevNums = [];
validRows.forEach(r => {
  const code = (r['EMP NO'] || '').trim().toUpperCase();
  const m = code.match(/^EEV(\d+)$/);
  if (m) existingEevNums.push(parseInt(m[1], 10));
});

existingEevNums.sort((a, b) => a - b);
const minEev = existingEevNums[0];
const maxEev = existingEevNums[existingEevNums.length - 1];
console.log(`Existing EEV range: EEV${minEev} to EEV${maxEev} (${existingEevNums.length} employees)`);

let nextEevSeq = maxEev + 1;
console.log(`Next sequential EEV code to allocate: EEV${nextEevSeq}`);

