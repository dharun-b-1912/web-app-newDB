// scripts/run_biometric_forensic_20_gates.ts
// ============================================================================
// Joy PeopleHR — Biometric Forensic 20-Gate Certification Runner
// ============================================================================

import { runBiometricForensic20GatesSuite } from '../src/services/__tests__/biometricForensicEvidence20Gates.test';

console.log('================================================================');
console.log(' 🛡️  JOY PEOPLEHR — BIOMETRIC FORENSIC 20-GATE CERTIFICATION');
console.log(' Zero-Mock • Device Evidence-Driven • Multi-Modal Truth Engine');
console.log('================================================================\n');

const results = runBiometricForensic20GatesSuite();
let allPassed = true;

for (const r of results) {
  if (r.passed) {
    console.log(`  ✓ [PASS] [${r.gate}] ${r.title}`);
  } else {
    allPassed = false;
    console.error(`  ❌ [FAIL] [${r.gate}] ${r.title}\n     Error: ${r.error}`);
  }
}

console.log('\n================================================================');
console.log(` TOTAL GATES EVALUATED : ${results.length}`);
console.log(` GATES PASSED          : ${results.filter(r => r.passed).length}`);
console.log(` GATES FAILED          : ${results.filter(r => !r.passed).length}`);
console.log(` ARCHITECTURAL STATUS  : ${allPassed ? '🏆 100% EVIDENCE-DRIVEN CERTIFIED' : '❌ CERTIFICATION FAILED'}`);
console.log('================================================================\n');

if (!allPassed) {
  process.exit(1);
}
