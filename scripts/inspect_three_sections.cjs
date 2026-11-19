const fs = require('fs');
const path = require('path');

// Let's inspect the entire user prompt raw text
// Where did Part 1, Part 2, Part 3 come from?
const p1Lines = fs.readFileSync(path.join(__dirname, 'raw_part1.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
const p2Lines = fs.readFileSync(path.join(__dirname, 'raw_part2.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
const p3Lines = fs.readFileSync(path.join(__dirname, 'raw_part3.csv'), 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);

console.log('Part 1 total lines (including header):', p1Lines.length);
console.log('Part 2 total lines (including header):', p2Lines.length);
console.log('Part 3 total lines (including header):', p3Lines.length);
