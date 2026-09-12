import fs from 'fs';
import path from 'path';

const migrationsDir = path.resolve('supabase/migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

const fkConsumers = new Map();

for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  // Match REFERENCES ... employees(id) or references to employees
  const tableRegex = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const tableBody = match[2];
    if (/REFERENCES\s+(?:public\.)?employees\s*\(\s*id\s*\)/i.test(tableBody)) {
      if (!fkConsumers.has(tableName)) {
        fkConsumers.set(tableName, []);
      }
      fkConsumers.get(tableName).push(file);
    }
  }
}

console.log('=== FOREIGN KEY CONSUMERS OF employees(id) ===');
for (const [table, migrationList] of fkConsumers.entries()) {
  console.log(`- ${table} (found in ${migrationList.length} migrations, e.g. ${migrationList[0]})`);
}
