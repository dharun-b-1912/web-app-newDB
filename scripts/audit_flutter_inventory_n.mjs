import fs from 'fs';
import path from 'path';

const flutterLibDir = 'flutter_app/lib';

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!file.includes('.git') && !file.includes('build')) {
        walkDir(fullPath, fileList);
      }
    } else if (file.endsWith('.dart')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const dartFiles = walkDir(flutterLibDir);
console.log(`Total Flutter Dart files: ${dartFiles.length}`);

const screens = [];
const repositories = [];
const services = [];
const controllers = [];
const tableQueries = new Map();
const storageQueries = [];
const rpcCalls = [];
const localCacheUsages = [];

for (const file of dartFiles) {
  const relPath = file.replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  if (relPath.includes('/screens/') || relPath.includes('/pages/') || relPath.includes('/views/') || relPath.endsWith('_screen.dart') || relPath.endsWith('_page.dart') || relPath.endsWith('_view.dart')) {
    screens.push(relPath);
  }
  if (relPath.includes('/repositories/') || relPath.endsWith('_repository.dart')) {
    repositories.push(relPath);
  }
  if (relPath.includes('/services/') || relPath.endsWith('_service.dart')) {
    services.push(relPath);
  }
  if (relPath.includes('/controllers/') || relPath.endsWith('_controller.dart')) {
    controllers.push(relPath);
  }

  // Check Supabase .from('...')
  const fromMatches = content.matchAll(/\.from\(['"]([^'"]+)['"]\)/g);
  for (const m of fromMatches) {
    const tbl = m[1];
    if (!tableQueries.has(tbl)) tableQueries.set(tbl, []);
    tableQueries.get(tbl).push(relPath);
  }

  // Check Storage .storage.from('...')
  const storageMatches = content.matchAll(/storage\.from\(['"]([^'"]+)['"]\)/g);
  for (const m of storageMatches) {
    storageQueries.push({ bucket: m[1], file: relPath });
  }

  // Check RPC .rpc('...')
  const rpcMatches = content.matchAll(/\.rpc\(['"]([^'"]+)['"]/g);
  for (const m of rpcMatches) {
    rpcCalls.push({ rpc: m[1], file: relPath });
  }

  // Check Local Caching (SharedPreferences, Hive, SQLite, local files)
  if (content.includes('SharedPreferences') || content.includes('openBox') || content.includes('sqflite')) {
    localCacheUsages.push({ file: relPath, hasSP: content.includes('SharedPreferences'), hasHive: content.includes('openBox'), hasSqlite: content.includes('sqflite') });
  }
}

console.log('\n--- SCREENS FOUND (' + screens.length + ') ---');
screens.forEach(s => console.log('  ' + s));

console.log('\n--- REPOSITORIES FOUND (' + repositories.length + ') ---');
repositories.forEach(r => console.log('  ' + r));

console.log('\n--- SERVICES FOUND (' + services.length + ') ---');
services.forEach(s => console.log('  ' + s));

console.log('\n--- DATABASE TABLES QUERIED DIRECTLY IN FLUTTER (' + tableQueries.size + ') ---');
for (const [tbl, files] of tableQueries.entries()) {
  console.log(`  Table: "${tbl}" (${files.length} references) -> [${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}]`);
}

console.log('\n--- STORAGE BUCKETS REFERENCED ---');
storageQueries.forEach(s => console.log(`  Bucket: "${s.bucket}" in ${s.file}`));

console.log('\n--- RPC CALLS IN FLUTTER ---');
rpcCalls.forEach(r => console.log(`  RPC: "${r.rpc}" in ${r.file}`));

console.log('\n--- LOCAL CACHE / STORAGE IN FLUTTER (' + localCacheUsages.length + ') ---');
localCacheUsages.forEach(l => console.log(`  ${l.file}: SP=${l.hasSP}, Hive=${l.hasHive}, SQLite=${l.hasSqlite}`));

fs.writeFileSync('scratch/flutter_inventory.json', JSON.stringify({
  screens,
  repositories,
  services,
  controllers,
  tables: Object.fromEntries(tableQueries),
  storage: storageQueries,
  rpc: rpcCalls,
  cache: localCacheUsages
}, null, 2));
