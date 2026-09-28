import fs from 'fs';
import readline from 'readline';

const transcriptPath = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\61449129-0329-4660-9c5e-b9fb5051b374\\.system_generated\\logs\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  crlfDelay: Infinity
});

let count = 0;
rl.on('line', (line) => {
  if (line.includes('deployJsApplication') || line.includes('generateUploadURLV1') || line.includes('deployStaticWebsite') || line.includes('deploy_package')) {
    console.log(`Match: ${line.substring(0, 300)}...`);
    count++;
  }
});

rl.on('close', () => {
  console.log(`Finished, found ${count} matches.`);
});
