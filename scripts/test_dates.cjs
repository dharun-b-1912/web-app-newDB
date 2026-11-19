const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function excelSerialToDateStr(serial) {
  if (!serial) return '';
  const num = Number(serial);
  if (isNaN(num)) {
    // If it's already a date string like 2004-08-26 or 21.07.2026 or 16-11-20206
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
    // Fix typos like 16-11-20206 -> 2026-11-16
    if (s.match(/^\d{2}-\d{2}-20206$/)) {
      const parts = s.split('-');
      return `2026-11-${parts[0]}`;
    }
    return s;
  }
  if (num < 1000) return ''; // Not a date serial
  // Excel base date: Dec 30, 1899
  const date = new Date(Math.round((num - 25569) * 86400 * 1000));
  if (isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

console.log('Testing date conversion:');
console.log('38805 ->', excelSerialToDateStr(38805));
console.log('46202 ->', excelSerialToDateStr(46202));
console.log('21.07.2026 ->', excelSerialToDateStr('21.07.2026'));
console.log('16-11-20206 ->', excelSerialToDateStr('16-11-20206'));
