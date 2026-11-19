const fs = require('fs');
const path = require('path');
const part1 = require('./deep_check_duplicates.cjs'); // let's just inspect

// Let's analyze EMP NO formats in Part 1
const content = fs.readFileSync(path.join(__dirname, 'raw_part1.csv'), 'utf8');
const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
const headers = lines[0].split(',');

const empNos = [];
for (let i = 1; i < lines.length; i++) {
  // get 3rd field
  const parts = lines[i].split(',');
  const empNo = parts[2] ? parts[2].trim() : '';
  empNos.push({ line: i+1, empNo, name: parts[3] });
}

console.log('Sample EMP NOs:');
const nonEEV = empNos.filter(e => e.empNo && !e.empNo.startsWith('EEV'));
console.log('Non-EEV EMP NOs count:', nonEEV.length);
console.log('Non-EEV EMP NOs:', nonEEV);

const eevEmp = empNos.filter(e => e.empNo && e.empNo.startsWith('EEV'));
console.log('EEV EMP NOs count:', eevEmp.length);

const noEmp = empNos.filter(e => !e.empNo);
console.log('Empty EMP NOs count:', noEmp.length);

