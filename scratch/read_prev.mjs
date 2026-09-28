import fs from 'fs';
const p = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\f325cba5-984c-4efe-ac09-1ceb07fe95e1\\.system_generated\\logs\\transcript.jsonl';
console.log('Exists:', fs.existsSync(p));
if (fs.existsSync(p)) {
  const content = fs.readFileSync(p, 'utf8');
  console.log('Length:', content.length);
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes('503') || line.includes('deploy') || line.includes('passenger') || line.includes('PORT')) {
      try {
        const obj = JSON.parse(line);
        console.log(obj.step_index, obj.content?.slice(0, 200) || JSON.stringify(obj.tool_calls)?.slice(0, 200));
      } catch (e) {}
    }
  }
}
