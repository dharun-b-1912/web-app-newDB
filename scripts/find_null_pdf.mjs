import fs from 'fs';

const content = fs.readFileSync('temp_evening_2026-10-28.pdf', 'latin1');
const matches = [...content.matchAll(/(\([^)]*null[^)]*\)\s*Tj)/gi)];
console.log('Matches in Tj operators:');
matches.forEach(m => console.log(m[0]));

const allMatches = [...content.matchAll(/.{0,50}null.{0,50}/gi)];
console.log('Context around null:');
allMatches.slice(0, 10).forEach(m => console.log(m[0]));
