const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('d:\\web-app (2)\\Joy PeopleHR\\Test Data\\manuals\\Ai_Face_Magnum-New.pdf');
let pos = 0;
while (pos < buf.length) {
  const sStart = buf.indexOf('stream', pos);
  if (sStart === -1) break;
  let dStart = sStart + 6;
  if (buf[dStart] === 0x0d && buf[dStart + 1] === 0x0a) dStart += 2;
  else if (buf[dStart] === 0x0a || buf[dStart] === 0x0d) dStart += 1;
  const sEnd = buf.indexOf('endstream', dStart);
  if (sEnd === -1) break;
  try {
    const unzipped = zlib.inflateSync(buf.slice(dStart, sEnd)).toString('latin1');
    if (unzipped.includes('ToUnicode') || unzipped.includes('beginbfchar')) {
      console.log('ToUnicode stream found:\n', unzipped.slice(0, 500));
    }
    if (unzipped.includes('Tj') || unzipped.includes('TJ')) {
      console.log('Sample text stream:\n', unzipped.slice(0, 400));
      break;
    }
  } catch(e) {}
  pos = sEnd + 9;
}
