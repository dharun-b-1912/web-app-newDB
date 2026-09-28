import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: fs.createReadStream('C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\61449129-0329-4660-9c5e-b9fb5051b374\\.system_generated\\logs\\transcript.jsonl')
});

rl.on('line', l => {
  const obj = JSON.parse(l);
  if (obj.step_index >= 1750 && obj.step_index <= 1785) {
    console.log(`[Step ${obj.step_index}] ${obj.source} ${obj.type}`);
    if (obj.tool_calls) {
      for (const tc of obj.tool_calls) {
        console.log(`  TOOL: ${tc.name}`, JSON.stringify(tc.args).slice(0, 200));
      }
    }
    if (obj.content && obj.content.length < 300) {
      console.log(`  CONTENT:`, obj.content);
    }
  }
});
