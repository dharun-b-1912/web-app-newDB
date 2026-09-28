import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: fs.createReadStream('C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\61449129-0329-4660-9c5e-b9fb5051b374\\.system_generated\\logs\\transcript.jsonl')
});

rl.on('line', l => {
  const obj = JSON.parse(l);
  if ([1786, 1787, 1793, 1797].includes(obj.step_index)) {
    console.log(`=== Step ${obj.step_index} ===`);
    console.log(obj.content ? obj.content.slice(0, 500) : JSON.stringify(obj.tool_calls));
  }
});
