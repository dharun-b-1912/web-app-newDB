import fs from 'fs';
import path from 'path';

const ignored = ['node_modules', '.git', '.agents', 'flutter_app', '1.FlutterApp', 'Essl Support files', 'dist'];

function scan(dir) {
  let files = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (ignored.includes(f)) continue;
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        files = files.concat(scan(full));
      } else {
        files.push({ path: path.relative('.', full), size: stat.size });
      }
    }
  } catch (e) {}
  return files;
}

const all = scan('.').sort((a, b) => b.size - a.size);
console.log('Top 20 largest files:');
for (const item of all.slice(0, 20)) {
  console.log(`${(item.size / 1024 / 1024).toFixed(2)} MB: ${item.path}`);
}
