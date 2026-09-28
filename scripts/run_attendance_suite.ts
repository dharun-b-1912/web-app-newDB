import { runUnifiedMultiModeAttendanceSuite } from '../src/services/__tests__/unifiedMultiModeAttendanceEngine.test';

async function main() {
  const res = await runUnifiedMultiModeAttendanceSuite();
  console.log('\n============================================================');
  console.log(`[ATTENDANCE ENGINE TEST RESULT] Passed: ${res.passed}/${res.total} (Failed: ${res.failed})`);
  console.log('============================================================\n');
  if (res.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running attendance suite:', err);
  process.exit(1);
});
