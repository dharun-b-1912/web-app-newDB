import fs from 'fs';
import path from 'path';

const RETIRED_TABLES = [
  'attendance_events',
  'attendance_roster_entries',
  'employee_bank_accounts',
  'document_requirements',
  'leave_entitlements',
  'notification_deliveries',
  'platform_profiles',
  'platform_staff',
  'approval_requests',
  'employee_payslips'
];

function searchDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        searchDir(filePath, fileList);
      }
    } else if (/\.(ts|tsx|js|jsx|dart)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = searchDir('src');
console.log(`Scanning ${files.length} Web source files for retired table names...`);

const flutterFiles = searchDir('flutter_app/lib');
console.log(`Scanning ${flutterFiles.length} Flutter source files for retired table names...`);

let hits = 0;
for (const file of [...files, ...flutterFiles]) {
  const content = fs.readFileSync(file, 'utf8');
  for (const tbl of RETIRED_TABLES) {
    const regex = new RegExp(`\\.from\\(['"\`]${tbl}['"\`]\\)`, 'g');
    if (regex.test(content)) {
      console.log(`❌ ACTIVE RUNTIME HIT: ${file} queries retired table '${tbl}'`);
      hits++;
    }
  }
}

if (hits === 0) {
  console.log('✅ ZERO active runtime queries to retired tables in src/!');
} else {
  console.log(`Found ${hits} retired table queries.`);
}
