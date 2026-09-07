import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('d:/Joy Corporate Solutions/JOY PeopleHR/web-app/Joy PeopleHR new version/workforceos-enterprise-hrms/scratch/reconcile_result.json', 'utf8'));

console.log('=== CANONICAL TABLES DEPLOYED IN DATABASE (STATUS 200) ===');
const deployedTables = raw.tables.filter(t => t.inDb);
console.log(`Count: ${deployedTables.length}`);

deployedTables.forEach((t, i) => {
  console.log(`${i + 1}. ${t.table} | Migrations: ${t.migrationSources.join(', ') || 'NONE'} | App Refs: ${t.appReferences.length > 0 ? t.appReferences.join(', ') : 'None'}`);
});

console.log('\n=== MIGRATION TABLES NOT IN DB ===');
const migMissing = raw.tables.filter(t => !t.inDb && t.migrationSources.length > 0);
console.log(`Count: ${migMissing.length}`);
migMissing.forEach(t => console.log(`- ${t.table} (${t.migrationSources.join(', ')})`));

console.log('\n=== DB TABLES NOT IN MIGRATIONS ===');
const dbExtra = raw.tables.filter(t => t.inDb && t.migrationSources.length === 0);
console.log(`Count: ${dbExtra.length}`);
dbExtra.forEach(t => console.log(`- ${t.table}`));

console.log('\n=== APP REFERENCES TO NONEXISTENT TABLES ===');
const appNonexistent = raw.tables.filter(t => !t.inDb && t.appReferences.length > 0);
console.log(`Count: ${appNonexistent.length}`);
appNonexistent.forEach(t => console.log(`- ${t.table} -> referenced in: ${t.appReferences.join(', ')}`));
