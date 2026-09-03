// ============================================================
// Joy PeopleHR — Regression Prevention & CI Gate Tracker
// ============================================================
// Converts resolved incident root causes into permanent automated CI test cases
// and lint rules to ensure historical regressions can never recur.
// ============================================================

export interface PreventionRuleItem {
  ruleId: string;
  incidentRef: string;
  ruleTitle: string;
  category: 'AUTOMATED_UNIT_TEST' | 'CI_LINT_RULE' | 'SCHEMA_CONSTRAINT' | 'SECURITY_BARRIER';
  filePath: string;
  status: 'ACTIVE_IN_CI' | 'IN_DEVELOPMENT' | 'VERIFIED';
  addedBy: string;
  verifiedAt: string;
}

export class PreventionTracker {
  private static rules: PreventionRuleItem[] = [
    {
      ruleId: 'prev_204_01',
      incidentRef: 'INC-204',
      ruleTitle: 'Assert payroll calculation handles partial allowance structures without null pointer',
      category: 'AUTOMATED_UNIT_TEST',
      filePath: 'src/services/payroll/__tests__/epfoEcrEngine.test.ts',
      status: 'ACTIVE_IN_CI',
      addedBy: 'Arun V.',
      verifiedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      ruleId: 'prev_202_02',
      incidentRef: 'JOY-202',
      ruleTitle: 'Disallow mock employee fallback objects in UI profile query hooks',
      category: 'CI_LINT_RULE',
      filePath: 'src/features/people/EmployeeProfileDrawer.tsx',
      status: 'ACTIVE_IN_CI',
      addedBy: 'Karthik S.',
      verifiedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      ruleId: 'prev_sec_03',
      incidentRef: 'SEC-101',
      ruleTitle: 'Deep recursive PII scrubber gate on all telemetry log entries',
      category: 'SECURITY_BARRIER',
      filePath: 'src/services/observability/piiScrubber.ts',
      status: 'ACTIVE_IN_CI',
      addedBy: 'Security Lead',
      verifiedAt: new Date(Date.now() - 14400000).toISOString(),
    },
  ];

  public static getRules(): PreventionRuleItem[] {
    return [...this.rules];
  }

  public static addRule(rule: PreventionRuleItem): PreventionRuleItem {
    this.rules.unshift(rule);
    return rule;
  }
}
