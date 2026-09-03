import { runBiometricV4EnterpriseCertification } from '../src/services/__tests__/biometricV4EnterpriseCertification.test';

async function main() {
  console.log('Running Joy PeopleHR — Biometric Architecture V4 Enterprise Certification Suite...\n');
  const res = await runBiometricV4EnterpriseCertification();
  console.log(`TOTAL GATES: ${res.totalGates}`);
  console.log(`PASSED GATES: ${res.passedGates}`);
  console.log(`FAILED GATES: ${res.failedGates}`);
  console.log(`DURATION: ${res.durationMs}ms\n`);
  console.log('GATE BREAKDOWN (GATES 7 TO 18):');
  for (const g of res.results) {
    console.log(`[Gate ${g.gateNumber}] ${g.status === 'PASSED' ? '✓' : '✗'} ${g.gateName} (${g.durationMs}ms)`);
    console.log(`  Scenario: ${g.scenario}`);
    console.log(`  Details:  ${g.details}\n`);
  }
}

main();
