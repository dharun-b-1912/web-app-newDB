const fs = require('fs');
const readline = require('readline');

async function findDeploys() {
  const fileStream = fs.createReadStream('C:/Users/hp/.gemini/antigravity/brain/fd7ea8f7-0476-4a0b-851c-1c9b1ce88eb7/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('hosting_deploy') && line.includes('mobile.joypeoplehr.com')) {
      console.log('FOUND:', line.slice(0, 300));
    }
  }
}

findDeploys();
