import { runBiometricV3EnterpriseCertification } from '../src/services/__tests__/biometricV3EnterpriseCertification.test';

async function main() {
  console.log('Running Joy PeopleHR — Biometric Architecture V3 Enterprise Certification Suite...\n');
  const res = await runBiometricV3EnterpriseCertification();
  console.log(`TOTAL GATES: ${res.totalGates}`);
  console.log(`PASSED GATES: ${res.passedGates}`);
  console.log(`FAILED GATES: ${res.failedGates}`);
  console.log(`DURATION: ${res.durationMs}ms\n`);
  console.log('GATE BREAKDOWN:');
  for (const g of res.results) {
    console.log(`[Gate ${g.gateNumber}] ${g.status === 'PASSED' ? '✓' : '✗'} ${g.gateName} (${g.durationMs}ms)`);
    console.log(`  Scenario: ${g.scenario}`);
    console.log(`  Details:  ${g.details}\n`);
  }
}

main();
