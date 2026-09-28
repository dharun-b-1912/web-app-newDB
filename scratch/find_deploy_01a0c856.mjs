import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: fs.createReadStream('C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\61449129-0329-4660-9c5e-b9fb5051b374\\.system_generated\\logs\\transcript.jsonl')
});

rl.on('line', l => {
  if (l.includes('01a0c856')) {
    const obj = JSON.parse(l);
    console.log(`Step ${obj.step_index}:`, (obj.content || JSON.stringify(obj.tool_calls)).slice(0, 300));
  }
});
