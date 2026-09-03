import { runEnterpriseResilienceCertification } from '../src/services/__tests__/enterpriseResilienceCertification.test';

async function main() {
  const res = await runEnterpriseResilienceCertification();
  console.log(`TOTAL GATES: ${res.totalGates}`);
  console.log(`PASSED GATES: ${res.passedGates}`);
  console.log(`FAILED GATES: ${res.failedGates}`);
  console.log(`DURATION: ${res.durationMs}ms`);
  console.log('\nGATE BREAKDOWN:');
  for (const g of res.results) {
    console.log(`[Gate ${g.gateNumber}] ${g.status === 'PASSED' ? '✓' : '✗'} ${g.gateName} (${g.executionTimeMs}ms)`);
    console.log(`  Scenario: ${g.scenario}`);
    console.log(`  Details:  ${g.details}\n`);
  }
}

main();
