const fs = require('fs');

const content = fs.readFileSync('src/services/email/resendEmailService.ts', 'utf8');
const lines = content.split('\n');

console.log('--- Email Template Functions in resendEmailService.ts ---');
lines.forEach((l, i) => {
  const trimmed = l.trim();
  if (trimmed.startsWith('async send') || (trimmed.startsWith('send') && trimmed.includes('('))) {
    console.log(`Line ${i + 1}: ${trimmed}`);
  }
});
