const fs = require('fs');
const path = require('path');

const p1Lines = fs.readFileSync(path.join(__dirname, 'raw_part1.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
p1Lines.forEach((line, idx) => {
  if (line.includes('S NO,UNIT S.No') || line.includes('EMP NO,NAME')) {
    console.log(`Header found at line ${idx + 1}:`, line.slice(0, 50));
  }
});
