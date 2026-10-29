import fs from 'fs';

const content = fs.readFileSync('temp_evening_2026-10-28.pdf', 'latin1');
// Extract all text inside parens followed by Tj or '
const textMatches = [...content.matchAll(/\(([^)]*)\)\s*(?:Tj|'|TJ)/g)].map(m => m[1]);
console.log('--- ALL EXTRACTED TEXT STRINGS FROM PDF ---');
console.log(textMatches.filter(t => t.trim().length > 0).join('\n'));
