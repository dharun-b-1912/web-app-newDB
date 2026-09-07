import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('d:/Joy Corporate Solutions/JOY PeopleHR/web-app/Joy PeopleHR new version/workforceos-enterprise-hrms/scratch/reconcile_result.json', 'utf8'));
const deployed = raw.tables.filter(t => t.inDb);

console.log('Total deployed:', deployed.length);
deployed.forEach((t, i) => {
  console.log(`${i+1}. ${t.table} | ${t.migrationSources.join(', ')} | ${t.status}`);
});
