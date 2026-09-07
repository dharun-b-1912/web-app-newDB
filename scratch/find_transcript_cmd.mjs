import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: fs.createReadStream('C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\41db33d1-ed40-45d4-ad82-fef3c93634c6\\.system_generated\\logs\\transcript.jsonl'),
  crlfDelay: Infinity
});

let count = 0;
rl.on('line', (line) => {
  if (line.includes('20260905_100') || line.includes('seed_canonical_master_entities') || line.includes('deploy_canonical')) {
    console.log(`Line match: ${line.substring(0, 300)}...`);
    count++;
  }
});

rl.on('close', () => {
  console.log(`Finished, found ${count} matches.`);
});
