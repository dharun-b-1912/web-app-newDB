const fs = require('fs');

const filePath = 'd:\\web-app (2)\\Joy PeopleHR\\Test Data\\manuals\\Ai_Face_Magnum-New.pdf';
const buf = fs.readFileSync(filePath);
const content = buf.toString('latin1');

// Search for menu names or headings in the PDF
const terms = ['Access Control', 'Combined Verification', 'Multi-User', 'Verification Mode', 'Group', 'Unlock', 'Door Options'];
for (const term of terms) {
  let idx = 0;
  let count = 0;
  while ((idx = content.indexOf(term, idx)) !== -1) {
    count++;
    idx += term.length;
  }
  console.log(`Term "${term}" found ${count} times in raw content`);
}
