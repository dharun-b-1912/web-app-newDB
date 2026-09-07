const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('PHASE O.0 — SECURITY & INTEGRITY SCANS');
console.log('================================================================\n');

// 1. Scan for old project ID wmqjmyzzamgxyeuotbki in active source code (src/ and flutter_app/lib/)
console.log('--- 1. OLD PROJECT ID SCAN (src/ and flutter_app/lib/) ---');
try {
  const resSrc = execSync('git grep -n "wmqjmyzzamgxyeuotbki" -- src/ flutter_app/lib/ || true', { encoding: 'utf8' }).trim();
  if (resSrc) {
    console.error('❌ Active runtime references to old project found:\n', resSrc);
  } else {
    console.log('✅ ZERO active runtime references to decommissioned project wmqjmyzzamgxyeuotbki in src/ or flutter_app/lib/.');
  }
} catch (e) {
  console.log('Scan error:', e.message);
}

// 2. Scan for service_role in client codebases (src/ and flutter_app/lib/)
console.log('\n--- 2. SERVICE ROLE SECRET SCAN ---');
try {
  const resSec = execSync('git grep -n "service_role" -- src/ flutter_app/lib/ || true', { encoding: 'utf8' }).trim();
  if (resSec) {
    console.error('❌ service_role exposed in client code:\n', resSec);
  } else {
    console.log('✅ ZERO service_role keys exposed in src/ or flutter_app/lib/.');
  }
} catch (e) {
  console.log('Scan error:', e.message);
}

// 3. Scan for legacy table queries
console.log('\n--- 3. LEGACY TABLE QUERY SCAN (company_announcements) ---');
try {
  const resLeg = execSync('git grep -n "company_announcements" -- src/ flutter_app/lib/ || true', { encoding: 'utf8' }).trim();
  if (resLeg) {
    console.log('Legacy table occurrences in src/ or flutter_app/lib/:\n', resLeg);
  } else {
    console.log('✅ ZERO active queries against legacy table company_announcements.');
  }
} catch (e) {
  console.log('Scan error:', e.message);
}

console.log('\n================================================================');
console.log('✅ SCANS COMPLETED');
console.log('================================================================');
