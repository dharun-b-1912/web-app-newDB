import fs from 'fs';
import path from 'path';

function findFiles(dir, ext = '.dart') {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findFiles('flutter_app/lib');
const fromPattern = /\.from\(\s*['"]([^'"]+)['"]\s*\)/g;
const rpcPattern = /\.rpc\(\s*['"]([^'"]+)['"]\s*/g;
const storagePattern = /\.storage\.from\(\s*['"]([^'"]+)['"]\s*\)/g;

const tables = new Map();
const rpcs = new Map();
const storage = new Map();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = fromPattern.exec(content)) !== null) {
    const tbl = match[1];
    if (!tables.has(tbl)) tables.set(tbl, []);
    tables.get(tbl).push(path.basename(file));
  }
  while ((match = rpcPattern.exec(content)) !== null) {
    const rpc = match[1];
    if (!rpcs.has(rpc)) rpcs.set(rpc, []);
    rpcs.get(rpc).push(path.basename(file));
  }
  while ((match = storagePattern.exec(content)) !== null) {
    const bucket = match[1];
    if (!storage.has(bucket)) storage.set(bucket, []);
    storage.get(bucket).push(path.basename(file));
  }
}

console.log('=== FLUTTER TABLES IN .from() ===');
for (const [tbl, fileList] of tables.entries()) {
  console.log(tbl.padEnd(32), '->', [...new Set(fileList)].join(', '));
}

console.log('\n=== FLUTTER RPCS IN .rpc() ===');
for (const [rpc, fileList] of rpcs.entries()) {
  console.log(rpc.padEnd(32), '->', [...new Set(fileList)].join(', '));
}

console.log('\n=== FLUTTER STORAGE IN .storage.from() ===');
for (const [b, fileList] of storage.entries()) {
  console.log(b.padEnd(32), '->', [...new Set(fileList)].join(', '));
}
