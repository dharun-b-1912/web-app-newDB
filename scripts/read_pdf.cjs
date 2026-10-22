const fs = require('fs');
const zlib = require('zlib');

const filePath = 'd:\\web-app (2)\\Joy PeopleHR\\Test Data\\manuals\\Ai_Face_Magnum-New.pdf';
const buf = fs.readFileSync(filePath);

// Find streams in PDF and decompress them
let pos = 0;
let fullText = '';

while (pos < buf.length) {
  const streamStart = buf.indexOf('stream', pos);
  if (streamStart === -1) break;
  
  // usually stream\r\n or stream\n
  let dataStart = streamStart + 6;
  if (buf[dataStart] === 0x0d && buf[dataStart + 1] === 0x0a) dataStart += 2;
  else if (buf[dataStart] === 0x0a) dataStart += 1;
  else if (buf[dataStart] === 0x0d) dataStart += 1;

  const streamEnd = buf.indexOf('endstream', dataStart);
  if (streamEnd === -1) break;

  const slice = buf.slice(dataStart, streamEnd);
  try {
    const unzipped = zlib.inflateSync(slice);
    const str = unzipped.toString('latin1');
    fullText += '\n' + str;
  } catch (e) {
    // Might not be deflate or uncompressed
    const str = slice.toString('latin1');
    if (str.includes('BT') && str.includes('ET')) {
      fullText += '\n' + str;
    }
  }

  pos = streamEnd + 9;
}

console.log('Total extracted text length:', fullText.length);

// Extract text within BT ... ET blocks and parentheses (text)
const matches = [];
const regex = /\(([^)]+)\)/g;
let m;
let cleanText = '';
while ((m = regex.exec(fullText)) !== null) {
  cleanText += m[1] + ' ';
}

// Search for keywords
const lines = cleanText.split(/[\r\n\.]+/);
console.log('Total extracted sentences/lines:', lines.length);

const keywords = ['multi', 'verification', 'combination', 'access control', 'group', 'unlock'];
for (const line of lines) {
  if (keywords.some(k => line.toLowerCase().includes(k))) {
    if (line.trim().length > 10 && line.trim().length < 300) {
      console.log('->', line.trim());
    }
  }
}
