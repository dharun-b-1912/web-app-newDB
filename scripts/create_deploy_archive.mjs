// scripts/create_deploy_archive.mjs
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const outputFile = path.join(rootDir, 'deploy_package.tar.gz');

console.log('Creating clean deployment archive for Hostinger Node.js...');

try {
  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
  }

  // Use Windows built-in tar.exe to package source files cleanly
  const tarCmd = `tar --exclude="node_modules" --exclude=".git" --exclude="1.FlutterApp*" --exclude="dist" --exclude="deploy_package.tar.gz" --exclude="*.rar" --exclude="*.pdf" -czf "${outputFile}" .`;
  execSync(tarCmd, { cwd: rootDir, stdio: 'inherit' });

  const stats = fs.statSync(outputFile);
  console.log(`Archive created successfully: ${outputFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
} catch (err) {
  console.error('Failed to create archive with tar, trying alternative...', err);
}
