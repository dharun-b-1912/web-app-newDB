const fs = require('fs');

const typesCode = fs.readFileSync('src/features/people/idcard/idCardTypes.ts', 'utf8');
const lines = typesCode.split('\n');

console.log('=== SEARCHING idCardTypes.ts ===');
lines.forEach((l, idx) => {
  if (l.includes('interface BackgroundArtworkSettings') || l.includes('interface ImageElement') || l.includes('interface CardSideData')) {
    console.log(`LINE ${idx + 1}:`);
    console.log(lines.slice(idx, idx + 25).join('\n'));
    console.log('--------------------------------------------------');
  }
});

