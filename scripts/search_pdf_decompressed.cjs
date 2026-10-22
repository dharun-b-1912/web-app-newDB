const fs = require('fs');
const zlib = require('zlib');

const filePath = 'd:\\web-app (2)\\Joy PeopleHR\\Test Data\\manuals\\Ai_Face_Magnum-New.pdf';
const buf = fs.readFileSync(filePath);

let pos = 0;
let streams = [];
while (pos < buf.length) {
  const sStart = buf.indexOf('stream', pos);
  if (sStart === -1) break;
  let dStart = sStart + 6;
  if (buf[dStart] === 0x0d && buf[dStart + 1] === 0x0a) dStart += 2;
  else if (buf[dStart] === 0x0a || buf[dStart] === 0x0d) dStart += 1;

  const sEnd = buf.indexOf('endstream', dStart);
  if (sEnd === -1) break;

  try {
    const unzipped = zlib.inflateSync(buf.slice(dStart, sEnd));
    streams.push(unzipped.toString('latin1'));
  } catch (e) {
    streams.push(buf.slice(dStart, sEnd).toString('latin1'));
  }
  pos = sEnd + 9;
}

console.log('Total streams decompressed:', streams.length);
const allText = streams.join('\n');

const searchTerms = [
  'Multi-user',
  'Multi-User',
  'Multi user',
  'Verification',
  'Combined',
  'Access Control',
  'Access',
  'Door',
  'Group',
  'Attendance'
];

for (const t of searchTerms) {
  const regex = new RegExp(t, 'gi');
  const count = (allText.match(regex) || []).length;
  console.log(`Term "${t}": ${count} matches`);
}

// Find snippets mentioning Multi or Combined or Verification
const lines = allText.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (/multi/i.test(line) || /combined/i.test(line)) {
    console.log(`Line ${i}:`, line.trim().slice(0, 150));
  }
}
