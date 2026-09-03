// ============================================================
// Joy PeopleHR — Automation Policy Engine (5 Safety Levels)
// ============================================================
// Enforces safety guardrails across all automated reliability actions.
// Guarantees high-impact actions strictly require explicit human authorization.
// ============================================================

export type AutomationSafetyLevel =
  | 'LEVEL_0_OBSERVE'
  | 'LEVEL_1_INFORM'
  | 'LEVEL_2_RECOMMEND'
  | 'LEVEL_3_REQUIRE_APPROVAL'
  | 'LEVEL_4_AUTOMATE';

export interface AutomationPolicyRule {
  ruleId: string;
  actionName: string;
  category: 'DIAGNOSTICS' | 'OBSERVABILITY' | 'COMMUNICATION' | 'DEPLOYMENT' | 'DATA_MODIFICATION';
  safetyLevel: AutomationSafetyLevel;
  requiresHumanApproval: boolean;
  isAllowedInProduction: boolean;
  description: string;
}

export class AutomationPolicyEngine {
  private static rules: AutomationPolicyRule[] = [
    {
      ruleId: 'rule_inc_sampling',
      actionName: 'Increase Telemetry Sampling Rate',
      category: 'OBSERVABILITY',
      safetyLevel: 'LEVEL_4_AUTOMATE',
      requiresHumanApproval: false,
      isAllowedInProduction: true,
      description: 'Automatically increases error and trace capture fidelity to 100% during anomalous load.',
    },
    {
      ruleId: 'rule_capture_diag',
      actionName: 'Capture Diagnostic Snapshot',
      category: 'DIAGNOSTICS',
      safetyLevel: 'LEVEL_4_AUTOMATE',
      requiresHumanApproval: false,
      isAllowedInProduction: true,
      description: 'Records memory, query latency distribution, and connection state for incident triage.',
    },
    {
      ruleId: 'rule_extend_watch',
      actionName: 'Extend Post-Deployment Health Watch',
      category: 'OBSERVABILITY',
      safetyLevel: 'LEVEL_4_AUTOMATE',
      requiresHumanApproval: false,
      isAllowedInProduction: true,
      description: 'Extends post-deploy stability watch window from 30m to 120m upon detecting latency variance.',
    },
    {
      ruleId: 'rule_notify_squad',
      actionName: 'Notify Module Primary Owner via Slack/Pager',
      category: 'COMMUNICATION',
      safetyLevel: 'LEVEL_1_INFORM',
      requiresHumanApproval: false,
      isAllowedInProduction: true,
      description: 'Auto-dispatches escalation message to assigned technical squad channel.',
    },
    {
      ruleId: 'rule_stage_rollback',
      actionName: 'Pre-Stage Production Rollback Package',
      category: 'DEPLOYMENT',
      safetyLevel: 'LEVEL_3_REQUIRE_APPROVAL',
      requiresHumanApproval: true,
      isAllowedInProduction: true,
      description: 'Prepares rollback deployment target (e.g. v2.4.0) but requires human approval before trigger.',
    },
    {
      ruleId: 'rule_alter_payroll',
      actionName: 'Modify Production Payroll / Salary Records',
      category: 'DATA_MODIFICATION',
      safetyLevel: 'LEVEL_0_OBSERVE',
      requiresHumanApproval: true,
      isAllowedInProduction: false,
      description: 'FORBIDDEN: Automated systems are strictly prohibited from altering financial or employee data.',
    },
    {
      ruleId: 'rule_alter_rbac',
      actionName: 'Modify Database Permissions / Security RLS',
      category: 'DATA_MODIFICATION',
      safetyLevel: 'LEVEL_0_OBSERVE',
      requiresHumanApproval: true,
      isAllowedInProduction: false,
      description: 'FORBIDDEN: Automated changes to security policies or user roles are strictly prohibited.',
    },
  ];

  public static getRules(): AutomationPolicyRule[] {
    return [...this.rules];
  }

  public static validateActionAuthorization(actionName: string): {
    canExecuteAutomatically: boolean;
    requiresApproval: boolean;
    rule: AutomationPolicyRule | undefined;
    rejectionReason?: string;
  } {
    const rule = this.rules.find((r) => r.actionName === actionName);
    if (!rule) {
      return {
        canExecuteAutomatically: false,
        requiresApproval: true,
        rule: undefined,
        rejectionReason: `Unregistered action '${actionName}' cannot be executed automatically.`,
      };
    }

    if (!rule.isAllowedInProduction) {
      return {
        canExecuteAutomatically: false,
        requiresApproval: false,
        rule,
        rejectionReason: `Action '${actionName}' is strictly FORBIDDEN in production by safety policy.`,
      };
    }

    if (rule.safetyLevel === 'LEVEL_3_REQUIRE_APPROVAL' || rule.requiresHumanApproval) {
      return {
        canExecuteAutomatically: false,
        requiresApproval: true,
        rule,
      };
    }

    return {
      canExecuteAutomatically: rule.safetyLevel === 'LEVEL_4_AUTOMATE' || rule.safetyLevel === 'LEVEL_1_INFORM',
      requiresApproval: false,
      rule,
    };
  }
}
