// scripts/pack_tar_gz.mjs
// Pure Node.js tar.gz archiver without any external dependencies
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createTarHeader(name, size, mode = 0o644, type = '0') {
  const header = Buffer.alloc(512);
  let offset = 0;

  // File name (100 bytes)
  header.write(name.slice(0, 100), offset, 100, 'utf8');
  offset += 100;

  // File mode (8 bytes octal)
  header.write(mode.toString(8).padStart(7, '0') + '\0', offset, 8, 'utf8');
  offset += 8;

  // Owner UID (8 bytes octal)
  header.write((0).toString(8).padStart(7, '0') + '\0', offset, 8, 'utf8');
  offset += 8;

  // Owner GID (8 bytes octal)
  header.write((0).toString(8).padStart(7, '0') + '\0', offset, 8, 'utf8');
  offset += 8;

  // File size (12 bytes octal)
  header.write(size.toString(8).padStart(11, '0') + '\0', offset, 12, 'utf8');
  offset += 12;

  // Modification time (12 bytes octal)
  const mtime = Math.floor(Date.now() / 1000);
  header.write(mtime.toString(8).padStart(11, '0') + '\0', offset, 12, 'utf8');
  offset += 12;

  // Checksum placeholder (8 spaces)
  const checksumOffset = offset;
  header.write('        ', offset, 8, 'utf8');
  offset += 8;

  // Type flag (1 byte)
  header.write(type, offset, 1, 'utf8');
  offset += 1;

  // Link name (100 bytes)
  offset += 100;

  // Magic (6 bytes 'ustar\0')
  header.write('ustar\0', offset, 6, 'utf8');
  offset += 6;

  // Version (2 bytes '00')
  header.write('00', offset, 2, 'utf8');
  offset += 2;

  // Calculate checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', checksumOffset, 8, 'utf8');

  return header;
}

const ignoredPatterns = [
  'node_modules',
  '.git',
  '1.FlutterApp',
  '1.FlutterApp new version (27-08).rar',
  'dist',
  'deploy_package.tar.gz',
  'deploy_package.tar',
  '.DS_Store',
  'Thumbs.db',
  '*.pdf',
  '*.rar',
];

function shouldIgnore(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return ignoredPatterns.some((pattern) => {
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      return normalized.endsWith(ext);
    }
    return normalized === pattern || normalized.startsWith(pattern + '/') || normalized.includes('/' + pattern + '/');
  });
}

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (shouldIgnore(relPath)) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push({ path: fullPath, relPath: relPath + '/', isDir: true, size: 0 });
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else {
      results.push({ path: fullPath, relPath, isDir: false, size: stat.size });
    }
  }
  return results;
}

const rootDir = process.cwd();
const outputFile = path.join(rootDir, 'deploy_package.tar.gz');

console.log('Collecting source files for Hostinger deployment...');
const files = getAllFiles(rootDir);
console.log(`Found ${files.length} files to package.`);

const tarBuffers = [];

for (const file of files) {
  if (file.isDir) {
    tarBuffers.push(createTarHeader(file.relPath, 0, 0o755, '5'));
  } else {
    tarBuffers.push(createTarHeader(file.relPath, file.size, 0o644, '0'));
    const content = fs.readFileSync(file.path);
    tarBuffers.push(content);
    const padding = (512 - (file.size % 512)) % 512;
    if (padding > 0) {
      tarBuffers.push(Buffer.alloc(padding));
    }
  }
}

// End of archive marker (1024 zero bytes)
tarBuffers.push(Buffer.alloc(1024));

const tarBuffer = Buffer.concat(tarBuffers);
console.log(`Uncompressed tar size: ${(tarBuffer.length / 1024 / 1024).toFixed(2)} MB`);

const gzipped = zlib.gzipSync(tarBuffer, { level: 9 });
fs.writeFileSync(outputFile, gzipped);

console.log(`Compressed deploy_package.tar.gz created: ${(gzipped.length / 1024 / 1024).toFixed(2)} MB`);
