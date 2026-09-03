// src/services/biometric/access-control/accessControlAudit.ts
// ============================================================================
// Joy PeopleHR — Gate B15: Access Control Audit Trail
// ============================================================================

export interface AccessAuditEvent {
  event_id: string;
  command_id: string;
  employee_id?: string;
  device_id: string;
  decision: string;
  policy_reason: string;
  relay_duration_ms: number;
  command_hash: string;
  turnstile_unlocked: boolean;
  timestamp: string;
}

export class AccessControlAudit {
  private static auditLedger: AccessAuditEvent[] = [];

  static logEvent(evt: AccessAuditEvent) {
    this.auditLedger.push(evt);
  }

  static getLedger(): AccessAuditEvent[] {
    return [...this.auditLedger];
  }
}
