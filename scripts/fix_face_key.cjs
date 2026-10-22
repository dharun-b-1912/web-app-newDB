const fs = require('fs');
const path = 'src/features/attendance/subviews/FaceRecognitionChannelView.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Add index to displayedPunches map
content = content.replace(
  '{displayedPunches.map((log) => (',
  '{displayedPunches.map((log, _rowIdx) => ('
);

// Fix 2: Make key unique by appending index (prevents React duplicate key warning when same user punches multiple times)
content = content.replace(
  'key={log.id}',
  'key={log.id + \'-\' + _rowIdx}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done. Fixed duplicate key in FaceRecognitionChannelView.');

// Verify
const lines = fs.readFileSync(path, 'utf8').split('\n');
for (let i = 810; i <= 816; i++) {
  console.log((i+1) + ': ' + lines[i]);
}
