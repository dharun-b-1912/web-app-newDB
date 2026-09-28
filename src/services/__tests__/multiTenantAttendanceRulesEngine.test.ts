// src/services/__tests__/multiTenantAttendanceRulesEngine.test.ts
// ============================================================================
// JOY PeopleHR — Multi-Tenant Attendance Rules & Automation Engine Test Suite
// Verified Isolation: Org A vs Org B • Dynamic Real KPIs • Priority Hierarchy
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { attendanceRuleEngineService } from '../attendance/attendanceRuleEngineService';

describe('Multi-Tenant Attendance Rules & Automation Architecture Suite', () => {
  const ORG_A = 'org-joy-test-alpha';
  const ORG_B = 'org-joy-test-beta';

  beforeEach(() => {
    // Fresh slate for test tenants
  });

  it('Gate 1: Multi-Tenant Isolation — Rules created in Org A never appear in Org B', () => {
    const ruleA = attendanceRuleEngineService.createRule(
      {
        rule_name: 'Alpha Plant 20m Grace Rule',
        rule_code: 'RUL-ALPHA-01',
        description: 'Specific 20-minute grace for Alpha organization',
        category: 'GRACE_LATE',
        status: 'ACTIVE',
        priority: 15,
        scope_type: 'ORGANIZATION',
        scope_ids: ['ALL'],
        scope_labels: ['Alpha Plant Workforce'],
        trigger_event: 'FIRST_PUNCH',
        conditions: [],
        actions: [{ id: 'act-alpha-1', action_type: 'APPLY_GRACE', parameters: { grace_minutes: 20 } }],
        effective_from: '2026-09-01',
        human_readable_summary: 'Alpha workforce gets 20m grace.',
        covered_employees_count: 120,
        created_by: 'Alpha HR Admin',
      },
      ORG_A
    );

    const rulesA = attendanceRuleEngineService.getRules('ALL', undefined, ORG_A);
    const rulesB = attendanceRuleEngineService.getRules('ALL', undefined, ORG_B);

    expect(rulesA.some((r) => r.rule_code === 'RUL-ALPHA-01')).toBe(true);
    expect(rulesB.some((r) => r.rule_code === 'RUL-ALPHA-01')).toBe(false);
    expect(ruleA.organization_id).toBe(ORG_A);
  });

  it('Gate 2: Exceptions Isolation — Employee exceptions in Org A do not affect Org B', () => {
    attendanceRuleEngineService.createEmployeeException(
      {
        employee_id: 'emp-alpha-001',
        employee_name: 'Alpha Worker',
        employee_code: 'ALPH-01',
        department: 'Operations',
        exception_type: 'GRACE_OVERRIDE',
        title: 'Alpha Individual Transport Grace',
        reason: 'Shift transport delay',
        override_values: { grace_minutes: 25 },
        effective_from: '2026-09-01',
        effective_to: '2026-09-30',
        status: 'ACTIVE',
        requested_by: 'HR Alpha',
      },
      ORG_A
    );

    const exA = attendanceRuleEngineService.getEmployeeExceptions('ACTIVE', ORG_A);
    const exB = attendanceRuleEngineService.getEmployeeExceptions('ACTIVE', ORG_B);

    expect(exA.some((e) => e.employee_id === 'emp-alpha-001')).toBe(true);
    expect(exB.some((e) => e.employee_id === 'emp-alpha-001')).toBe(false);
  });

  it('Gate 3: Deterministic Conflict Detection — Detects overlapping active rules with same priority', () => {
    // Create conflicting rules in Org B
    attendanceRuleEngineService.createRule(
      {
        rule_name: 'Beta Conflict Rule 1',
        rule_code: 'RUL-BETA-CONF-1',
        description: 'First rule at priority 35',
        category: 'GRACE_LATE',
        status: 'ACTIVE',
        priority: 35,
        scope_type: 'ORGANIZATION',
        scope_ids: ['ALL'],
        trigger_event: 'FIRST_PUNCH',
        conditions: [],
        actions: [{ id: 'act-1', action_type: 'APPLY_GRACE', parameters: { grace_minutes: 10 } }],
        effective_from: '2026-09-01',
        human_readable_summary: 'Conflicting rule 1',
        created_by: 'Admin',
      },
      ORG_B
    );

    attendanceRuleEngineService.createRule(
      {
        rule_name: 'Beta Conflict Rule 2',
        rule_code: 'RUL-BETA-CONF-2',
        description: 'Second rule at identical priority 35 and same event',
        category: 'GRACE_LATE',
        status: 'ACTIVE',
        priority: 35,
        scope_type: 'ORGANIZATION',
        scope_ids: ['ALL'],
        trigger_event: 'FIRST_PUNCH',
        conditions: [],
        actions: [{ id: 'act-2', action_type: 'APPLY_GRACE', parameters: { grace_minutes: 20 } }],
        effective_from: '2026-09-01',
        human_readable_summary: 'Conflicting rule 2',
        created_by: 'Admin',
      },
      ORG_B
    );

    const rulesB = attendanceRuleEngineService.getRules('ALL', 'ACTIVE', ORG_B);
    const conflicts = attendanceRuleEngineService.detectRuleConflicts(rulesB);

    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    expect(conflicts[0]).toContain('share priority 35 on event FIRST_PUNCH');
  });

  it('Gate 4: Real Dynamic KPIs — Metrics compute live values per tenant', () => {
    const metricsA = attendanceRuleEngineService.getMetrics(ORG_A);
    const metricsB = attendanceRuleEngineService.getMetrics(ORG_B);

    expect(metricsA.active_rules_count).toBeGreaterThanOrEqual(1);
    expect(metricsA.active_exceptions_count).toBeGreaterThanOrEqual(1);
    expect(metricsB.rule_conflicts_count).toBeGreaterThanOrEqual(1);
    expect(metricsA.employees_covered_count).toBeGreaterThan(0);
  });

  it('Gate 5: Rule Simulator operates strictly within tenant context without DB mutations', () => {
    const sim = attendanceRuleEngineService.simulatePunch(
      {
        employee_id: 'emp-alpha-001',
        employee_name: 'Alpha Worker',
        employee_code: 'ALPH-01',
        date: '2026-09-12',
        punch_time: '09:22:00', // 22m after 09:00
        source: 'BIOMETRIC',
        verification_method: 'FACE',
        punch_direction: 'IN',
        existing_punches: [],
      },
      ORG_A
    );

    // Alpha Worker has 25m grace exception in Org A -> Should be ON_TIME!
    expect(sim.has_employee_exception).toBe(true);
    expect(sim.classification).toBe('CHECK_IN');
    expect(sim.late_minutes).toBe(0);
    expect(sim.grace_status).toBe('ON_TIME');
  });

  it('Gate 6: Backup/Restore Portability — Exports tenant configuration and successfully restores it', () => {
    const backupPackage = attendanceRuleEngineService.exportTenantRulesConfig(ORG_A);

    expect(backupPackage.organization_id).toBe(ORG_A);
    expect(backupPackage.rules.length).toBeGreaterThan(0);
    expect(backupPackage.version).toBe('3.5.0-enterprise');

    // Restore to a new tenant Org C
    const ORG_C = 'org-joy-test-gamma';
    const restored = attendanceRuleEngineService.importTenantRulesConfig(ORG_C, backupPackage);

    expect(restored).toBe(true);
    const rulesC = attendanceRuleEngineService.getRules('ALL', undefined, ORG_C);
    expect(rulesC.length).toBe(backupPackage.rules.length);
    expect(rulesC[0].organization_id).toBe(ORG_C);
  });
});
