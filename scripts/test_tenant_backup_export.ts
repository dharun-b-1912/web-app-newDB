// scripts/test_tenant_backup_export.ts
// ============================================================================
// JOY PeopleHR — Tenant Backup & Restore Verification Script
// ============================================================================

import { attendanceRuleEngineService } from '../src/services/attendance/attendanceRuleEngineService';

async function runBackupVerification() {
  console.log('--- STARTING TENANT BACKUP & RESTORE VERIFICATION ---');

  const sourceOrg = 'org-joy-01';
  console.log(`1. Exporting configuration package for tenant: ${sourceOrg}...`);

  const backupPackage = attendanceRuleEngineService.exportTenantRulesConfig(sourceOrg);

  console.log(`✓ Export successful!`);
  console.log(`  - Organization ID: ${backupPackage.organization_id}`);
  console.log(`  - Exported Rules: ${backupPackage.rules.length}`);
  console.log(`  - Exported Exceptions: ${backupPackage.exceptions.length}`);
  console.log(`  - Package Version: ${backupPackage.version}`);
  console.log(`  - Timestamp: ${backupPackage.exported_at}`);

  if (backupPackage.rules.length === 0) {
    throw new Error('FAILED: Expected at least 1 attendance rule in export package');
  }

  // Verify restore into target tenant
  const targetOrg = 'org-joy-staging-test';
  console.log(`\n2. Restoring backup package into new tenant: ${targetOrg}...`);

  const restored = attendanceRuleEngineService.importTenantRulesConfig(targetOrg, backupPackage);
  if (!restored) {
    throw new Error('FAILED: Import returned false');
  }

  const targetRules = attendanceRuleEngineService.getRules('ALL', undefined, targetOrg);
  console.log(`✓ Restore successful!`);
  console.log(`  - Target Organization ID: ${targetOrg}`);
  console.log(`  - Imported Rules in Target: ${targetRules.length}`);
  console.log(`  - First Rule Name: "${targetRules[0].rule_name}"`);
  console.log(`  - First Rule Org ID: ${targetRules[0].organization_id}`);

  if (targetRules.length !== backupPackage.rules.length) {
    throw new Error(`FAILED: Count mismatch. Exported ${backupPackage.rules.length}, but imported ${targetRules.length}`);
  }

  if (targetRules[0].organization_id !== targetOrg) {
    throw new Error(`FAILED: Target rule organization_id was not re-scoped to ${targetOrg}`);
  }

  // Verify Metrics Computation
  const metrics = attendanceRuleEngineService.getMetrics(targetOrg);
  console.log(`\n3. Verifying Dynamic Real KPIs for restored tenant:`);
  console.log(`  - Active Rules: ${metrics.active_rules_count}`);
  console.log(`  - Employees Covered: ${metrics.employees_covered_count}`);
  console.log(`  - Active Exceptions: ${metrics.active_exceptions_count}`);
  console.log(`  - Rule Conflicts: ${metrics.rule_conflicts_count}`);
  console.log(`  - Failed Calculations: ${metrics.failed_calculations_count}`);

  console.log('\n======================================================');
  console.log('✅ ALL TENANT BACKUP & RESTORE CHECKS PASSED (100%)');
  console.log('======================================================\n');
}

runBackupVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
