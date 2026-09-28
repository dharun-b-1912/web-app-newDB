import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: fs.createReadStream('C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\61449129-0329-4660-9c5e-b9fb5051b374\\.system_generated\\logs\\transcript.jsonl')
});

rl.on('line', l => {
  const obj = JSON.parse(l);
  if (obj.step_index >= 705 && obj.step_index <= 715) {
    console.log(`Step ${obj.step_index} (${obj.type}):`, (obj.content || JSON.stringify(obj.tool_calls)).slice(0, 300));
  }
});
