const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'Test Data', 'JOY SEP IN & OUT.xlsx');
const destDir = path.join(__dirname, '..', 'public', 'sample-data');
const dest = path.join(destDir, 'JOY_SEP_IN_AND_OUT.xlsx');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('File successfully copied to:', dest);
