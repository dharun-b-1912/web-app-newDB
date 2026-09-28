import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const workspace = 'd:\\web-app (2)\\Joy PeopleHR';
const listFile = path.join(workspace, 'files_to_tar.txt');
const includeDirs = ['src', 'public', 'ADDON', 'dist'];
const includeFiles = [
  'package.json',
  'package-lock.json',
  'server.js',
  'server_whatsapp_bot.js',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  '.env',
  '.env.production'
];

const fileList = [];

for (const f of includeFiles) {
  if (fs.existsSync(path.join(workspace, f))) {
    fileList.push(f);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(path.join(workspace, dir), { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full);
    } else {
      fileList.push(full);
    }
  }
}

for (const d of includeDirs) {
  if (fs.existsSync(path.join(workspace, d))) {
    walkDir(d);
  }
}

fs.writeFileSync(listFile, fileList.join('\n'), 'utf8');
console.log(`Wrote ${fileList.length} files to ${listFile}`);

const tarCmd = `tar -czf deploy_package.tar.gz -T files_to_tar.txt`;
console.log('Archiving with tar...');
execSync(tarCmd, { cwd: workspace, stdio: 'inherit' });

const stats = fs.statSync(path.join(workspace, 'deploy_package.tar.gz'));
console.log(`Done! deploy_package.tar.gz size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
