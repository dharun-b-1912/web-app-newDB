import { runAllSecurityAuditTests } from './securityAuditSuite.test';
import { Phase45ProductionRealityCertificationSuite } from './phase45ProductionRealityCertification.test';

async function main() {
  console.log('=== STARTING PRODUCTION READINESS CERTIFICATION GATES ===\n');

  // Gate Suite 1: Security & Multi-Tenancy Audit
  const secRes = runAllSecurityAuditTests();
  if (secRes.failed !== 0) {
    console.error(`Security audit suite failed with ${secRes.failed} failures.`);
    process.exit(1);
  }

  // Gate Suite 2: 10 Production Reality & Integration Certification Gates
  console.log('\n[RUNNING 10 PRODUCTION REALITY GATES]');
  const realityRes = await Phase45ProductionRealityCertificationSuite.runAllGates();
  console.log(`Production Reality Gates: ${realityRes.passCount} / ${realityRes.totalCount} passed.`);
  realityRes.results.forEach(r => {
    console.log(`  ${r.passed ? '✓' : '✗'} Gate ${r.gateNumber}: ${r.gateName} (${r.category}) - ${r.details}`);
  });

  if (!realityRes.passed) {
    console.error(`Production reality certification failed.`);
    process.exit(1);
  }

  console.log('\n=== ALL PRODUCTION READINESS CERTIFICATION GATES PASSED (100%) ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
