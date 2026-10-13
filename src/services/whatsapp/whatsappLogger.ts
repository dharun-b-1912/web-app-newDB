// src/services/whatsapp/whatsappLogger.ts
// ============================================================================
// JOY PeopleHR / WorkforceOS — WhatsApp Enterprise Structured Logging Engine
// Correlation Tracking • Strict PII Masking • Observability • Diagnostics
// ============================================================================

import { supabase } from '../../lib/supabase';
import { BotConversationState, WhatsAppAuditEvent, WhatsAppPermission, WhatsAppRoleContext } from './types';
import { normalizeIndianPhone } from './phoneUtils';

export class WhatsAppLogger {
  private static instance: WhatsAppLogger;
  private auditEvents: WhatsAppAuditEvent[] = [];

  public static getInstance(): WhatsAppLogger {
    if (!WhatsAppLogger.instance) {
      WhatsAppLogger.instance = new WhatsAppLogger();
    }
    return WhatsAppLogger.instance;
  }

  // ── 1. Correlation ID Generator ─────────────────────────────────────────────
  /**
   * Generates a unique, high-resolution correlation ID for each message.
   * Format: WA-YYYYMMDD-HHMMSS-XXXX (e.g., WA-20261005-143500-8F42)
   */
  generateCorrelationId(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const hms = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = Math.random().toString(16).substring(2, 6).toUpperCase();
    return `WA-${ymd}-${hms}-${rand}`;
  }

  // ── 2. Privacy & PII Masking ────────────────────────────────────────────────
  maskPhone(phone: string | null | undefined): string {
    if (!phone) return '+91 ****** 0000';
    try {
      const clean = normalizeIndianPhone(phone);
      const last4 = clean.slice(-4);
      return `+91 ****** ${last4}`;
    } catch {
      const str = String(phone);
      return str.length >= 4 ? `+91 ****** ${str.slice(-4)}` : '******';
    }
  }

  maskId(id: string | null | undefined, prefix = 'id'): string {
    if (!id) return `${prefix}_******`;
    const clean = id.trim();
    if (clean.length <= 6) return `${prefix}_******`;
    const last4 = clean.slice(-4);
    return `${prefix}_******${last4}`;
  }

  // ── 3. Audit Event Recorder ─────────────────────────────────────────────────
  recordAuditEvent(event: Omit<WhatsAppAuditEvent, 'id' | 'createdAt'>): WhatsAppAuditEvent {
    const record: WhatsAppAuditEvent = {
      id: `wa_ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      ...event,
    };
    this.auditEvents.push(record);
    if (this.auditEvents.length > 500) {
      this.auditEvents.shift(); // keep last 500 events in memory
    }
    return record;
  }

  getAuditEvents(correlationId?: string): WhatsAppAuditEvent[] {
    if (!correlationId) return [...this.auditEvents];
    return this.auditEvents.filter((e) => e.correlationId === correlationId);
  }

  // ── 4. Human-Readable Terminal Formatters ───────────────────────────────────

  logInboundMessage(params: {
    correlationId: string;
    from: string;
    text?: string;
    actionId?: string;
    state: BotConversationState;
  }): void {
    const masked = this.maskPhone(params.from);
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('[WHATSAPP] INBOUND MESSAGE');
    console.log(`Correlation: ${params.correlationId}`);
    console.log(`State:       ${params.state}`);
    console.log(`Phone:       ${masked}`);
    if (params.actionId) {
      console.log(`Action ID:   ${params.actionId}`);
    } else {
      console.log(`Message:     "${params.text || ''}"`);
    }
    console.log('══════════════════════════════════════════════════════════');

    this.recordAuditEvent({
      correlationId: params.correlationId,
      eventType: 'INBOUND_MESSAGE',
      previousState: params.state,
      newState: params.state,
      action: params.actionId || 'TEXT_INPUT',
      result: 'SUCCESS',
      metadata: { maskedPhone: masked, hasAction: !!params.actionId },
    });
  }

  logIdentityTrace(params: {
    correlationId: string;
    rawInput: string;
    normalized: string;
    candidates: string[];
    table: string;
    foundCount: number;
    resolvedEmployee?: {
      code: string;
      name: string;
      company: string;
      status: string;
    };
  }): void {
    console.log(`\n[IDENTITY] RESOLUTION TRACE (${params.correlationId})`);
    console.log(`  Raw Input:       "${params.rawInput}"`);
    console.log(`  Normalized:      ${this.maskPhone(params.normalized)}`);
    console.log(`  Strategies:      ${params.candidates.join(', ')}`);
    console.log(`  Target Table:    ${params.table}`);
    console.log(`  Records Matched: ${params.foundCount}`);

    if (params.resolvedEmployee) {
      console.log(`  ✓ Employee Code: ${params.resolvedEmployee.code}`);
      console.log(`  ✓ Name:          ${params.resolvedEmployee.name}`);
      console.log(`  ✓ Company:       ${params.resolvedEmployee.company}`);
      console.log(`  ✓ Status:        ${params.resolvedEmployee.status}`);
      console.log(`  ✓ Result:        IDENTITY_RESOLVED`);
    } else {
      console.log(`  ✗ Result:        NO_ACTIVE_EMPLOYEE_FOUND`);
    }

    this.recordAuditEvent({
      correlationId: params.correlationId,
      eventType: 'IDENTITY_LOOKUP',
      action: 'DATABASE_QUERY',
      result: params.foundCount > 0 ? 'SUCCESS' : 'FAILED',
      metadata: {
        table: params.table,
        matches: params.foundCount,
        resolvedCode: params.resolvedEmployee?.code,
      },
    });
  }

  logDatabaseOperation(params: {
    correlationId: string;
    table: string;
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    purpose: string;
    result: 'SUCCESS' | 'FAILED';
    rows: number;
    durationMs: number;
    error?: string;
  }): void {
    console.log(
      `[DATABASE][${params.correlationId}] table=${params.table} op=${params.operation} purpose=${params.purpose} result=${params.result} rows=${params.rows} time=${params.durationMs}ms${
        params.error ? ` err="${params.error}"` : ''
      }`
    );

    this.recordAuditEvent({
      correlationId: params.correlationId,
      eventType: 'DATABASE_OP',
      action: `${params.operation}_${params.table}`,
      result: params.result,
      durationMs: params.durationMs,
      errorCode: params.error,
      metadata: { table: params.table, purpose: params.purpose, rows: params.rows },
    });
  }

  logStateTransition(
    paramsOrCorrelationId:
      | {
          correlationId: string;
          fromState: BotConversationState;
          toState: BotConversationState;
          reason: string;
          isError?: boolean;
        }
      | string,
    argFromState?: BotConversationState,
    argToState?: BotConversationState,
    argReason?: string,
    argIsError?: boolean
  ): void {
    const params =
      typeof paramsOrCorrelationId === 'string'
        ? {
            correlationId: paramsOrCorrelationId,
            fromState: argFromState || 'UNKNOWN',
            toState: argToState || 'UNKNOWN',
            reason: argReason || 'state_update',
            isError:
              argIsError ||
              (argFromState === 'VERIFIED' && argToState === 'AWAITING_PHONE'),
          }
        : {
            ...paramsOrCorrelationId,
            isError:
              paramsOrCorrelationId.isError ||
              (paramsOrCorrelationId.fromState === 'VERIFIED' &&
                paramsOrCorrelationId.toState === 'AWAITING_PHONE'),
          };

    if (params.isError) {
      console.error(
        `\n[STATE][ERROR] INVALID STATE TRANSITION: ${params.fromState} → ${params.toState} (reason="${params.reason}") correlation=${params.correlationId}`
      );
      this.recordAuditEvent({
        correlationId: params.correlationId,
        eventType: 'INVALID_STATE_TRANSITION',
        previousState: params.fromState,
        newState: params.toState,
        result: 'REJECTED',
        errorCode: 'INVALID_TRANSITION',
        metadata: { reason: params.reason },
      });
      return;
    }

    console.log(
      `[STATE][${params.correlationId}] ${params.fromState} → ${params.toState} (reason="${params.reason}")`
    );

    this.recordAuditEvent({
      correlationId: params.correlationId,
      eventType: 'STATE_TRANSITION',
      previousState: params.fromState,
      newState: params.toState,
      result: 'SUCCESS',
      metadata: { reason: params.reason },
    });
  }

  logHierarchyResolution(params: {
    correlationId: string;
    employeeName: string;
    directReportsCount: number;
    teamLeadName?: string;
    supervisorName?: string;
    managerName?: string;
    hrRelationship: 'FOUND' | 'NOT_APPLICABLE';
    roleContext: WhatsAppRoleContext;
  }): void {
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`[HIERARCHY] RESOLUTION (${params.correlationId})`);
    console.log(`══════════════════════════════════════════════════════════`);
    console.log(`  Employee:        ${params.employeeName}`);
    console.log(`  Direct Reports:  ${params.directReportsCount}`);
    console.log(`  Team Lead:       ${params.teamLeadName || 'N/A'}`);
    console.log(`  Supervisor:      ${params.supervisorName || 'N/A'}`);
    console.log(`  Manager:         ${params.managerName || 'N/A'}`);
    console.log(`  HR Relationship: ${params.hrRelationship}`);
    console.log(`  Resolved Role:   ${params.roleContext}`);
    console.log(`══════════════════════════════════════════════════════════`);

    this.recordAuditEvent({
      correlationId: params.correlationId,
      eventType: 'HIERARCHY_RESOLVED',
      result: 'SUCCESS',
      metadata: {
        directReports: params.directReportsCount,
        roleContext: params.roleContext,
        isHr: params.hrRelationship === 'FOUND',
      },
    });
  }

  logPermissionResolution(params: {
    correlationId: string;
    roleContext: WhatsAppRoleContext;
    granted: WhatsAppPermission[];
    denied: string[];
  }): void {
    console.log(`\n[PERMISSIONS][${params.correlationId}] Context: ${params.roleContext}`);
    console.log(`  Granted (${params.granted.length}): ${params.granted.map((g) => `✓ ${g}`).join(', ')}`);
    console.log(`  Denied  (${params.denied.length}):  ${params.denied.map((d) => `✗ ${d}`).join(', ')}`);

    this.recordAuditEvent({
      correlationId: params.correlationId,
      eventType: 'PERMISSIONS_RESOLVED',
      result: 'SUCCESS',
      metadata: {
        roleContext: params.roleContext,
        grantedCount: params.granted.length,
        deniedCount: params.denied.length,
      },
    });
  }

  logResponseSent(params: {
    correlationId: string;
    type: 'TEXT' | 'INTERACTIVE_BUTTON' | 'INTERACTIVE_LIST' | 'DOCUMENT';
    templateOrTitle: string;
    toPhone: string;
  }): void {
    console.log(
      `[WHATSAPP][${params.correlationId}] RESPONSE SENT type=${params.type} template="${params.templateOrTitle}" to=${this.maskPhone(
        params.toPhone
      )}`
    );

    this.recordAuditEvent({
      correlationId: params.correlationId,
      eventType: 'RESPONSE_SENT',
      result: 'SUCCESS',
      metadata: { type: params.type, template: params.templateOrTitle },
    });
  }

  logSecurityAccessDenied(params: {
    correlationId: string;
    employeeId?: string;
    requestedResource: string;
    permission: string;
    reason: string;
  }): void {
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`[SECURITY][${params.correlationId}] ACCESS DENIED`);
    console.log(`  Employee:          ${this.maskId(params.employeeId, 'emp')}`);
    console.log(`  Requested Resource:${params.requestedResource}`);
    console.log(`  Permission:        ${params.permission}`);
    console.log(`  Reason:            ${params.reason}`);
    console.log(`══════════════════════════════════════════════════════════`);

    this.recordAuditEvent({
      correlationId: params.correlationId,
      eventType: 'SECURITY_ACCESS_DENIED',
      result: 'DENIED',
      errorCode: 'UNAUTHORIZED_ACCESS',
      metadata: {
        requestedResource: params.requestedResource,
        permission: params.permission,
        reason: params.reason,
      },
    });
  }

  /**
   * Persists structured WhatsApp logs (Crashes, Critical Failures, Audits) directly into Supabase audit_logs
   * Captures: Who, What, Where, When, Why, Stack Trace, and Correlation ID
   */
  async persistLogToDatabase(params: {
    correlationId: string;
    organizationId?: string;
    action: string;
    isCrash?: boolean;
    who?: {
      employeeId?: string;
      employeeCode?: string;
      name?: string;
      phone?: string;
      roleContext?: string;
    };
    what: {
      action: string;
      result: string;
      summary?: string;
      errorMessage?: string;
      errorStack?: string;
    };
    where: {
      service?: string;
      operation?: string;
      state?: string;
    };
    why?: string;
    when?: string;
  }): Promise<void> {
    try {
      const timestamp = params.when || new Date().toISOString();
      const entityType = params.isCrash ? 'WHATSAPP_CRASH_LOG' : 'WHATSAPP_AUDIT_LOG';
      const actorUserId = params.who?.employeeId || 'whatsapp_bot';
      const actorName = params.who?.name || 'WhatsApp User';
      const actorRole = params.who?.roleContext || 'WHATSAPP_SERVICE';

      await supabase.from('audit_logs').insert({
        organization_id: params.organizationId || 'org-joy-01',
        tenant_id: params.organizationId || 'org-joy-01',
        actor_user_id: actorUserId,
        actor_role: actorRole,
        actor_name: actorName,
        entity_type: entityType,
        entity_id: params.who?.employeeId || params.correlationId,
        action: params.action || (params.isCrash ? 'CRASH' : 'OPERATION'),
        correlation_id: params.correlationId,
        source: 'WHATSAPP',
        new_data: {
          who: {
            employeeId: params.who?.employeeId || null,
            employeeCode: params.who?.employeeCode || null,
            name: params.who?.name || null,
            phoneMasked: this.maskPhone(params.who?.phone),
            roleContext: params.who?.roleContext || null,
          },
          what: params.what,
          where: params.where,
          when: timestamp,
          why: params.why || null,
        },
        created_at: timestamp,
      });
    } catch (err) {
      // Non-blocking catch to ensure bot reliability even during database network anomalies
      console.warn('[WhatsAppLogger] Notice: Unable to persist log to Supabase audit_logs:', err);
    }
  }

  logFailure(params: {
    correlationId: string;
    what: string;
    where: string;
    why: string;
    state: BotConversationState;
    operation?: string;
    userResponse: string;
    who?: {
      employeeId?: string;
      employeeCode?: string;
      name?: string;
      phone?: string;
      roleContext?: string;
    };
    organizationId?: string;
    error?: any;
  }): void {
    const timestamp = new Date().toISOString();
    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`[WHATSAPP][CRASH_LOG] ${params.what}`);
    console.log(`══════════════════════════════════════════════════════════`);
    console.log(`  Correlation:   ${params.correlationId}`);
    console.log(`  When:          ${timestamp}`);
    console.log(`  Who:           ${params.who ? `${params.who.name || 'Unknown'} (${params.who.employeeCode || 'N/A'}) [${this.maskPhone(params.who.phone)}]` : 'N/A'}`);
    console.log(`  Location:      ${params.where}`);
    console.log(`  Active State:  ${params.state}`);
    console.log(`  Operation:     ${params.operation || 'N/A'}`);
    console.log(`  Root Cause:    ${params.why}`);
    console.log(`  User Message:  "${params.userResponse}"`);
    if (params.error?.stack) {
      console.log(`  Stack Trace:   ${params.error.stack.split('\n')[0]}`);
    }
    console.log(`══════════════════════════════════════════════════════════`);

    this.recordAuditEvent({
      correlationId: params.correlationId,
      eventType: 'FAILURE',
      previousState: params.state,
      result: 'FAILED',
      errorCode: params.what,
      metadata: { where: params.where, why: params.why, operation: params.operation },
    });

    // Asynchronously persist to dedicated Supabase audit_logs
    this.persistLogToDatabase({
      correlationId: params.correlationId,
      organizationId: params.organizationId,
      action: params.what,
      isCrash: true,
      who: params.who,
      what: {
        action: params.what,
        result: 'FAILED',
        summary: params.userResponse,
        errorMessage: params.why,
        errorStack: params.error?.stack,
      },
      where: {
        service: params.where,
        operation: params.operation,
        state: params.state,
      },
      why: params.why,
      when: timestamp,
    });
  }

  printDiagnosticSummary(params: {
    correlationId: string;
    phoneNormalized: boolean;
    employeeLookup: boolean;
    employeeActive: boolean;
    organizationResolution: boolean;
    verification: boolean;
    hierarchy: boolean;
    roleContext: boolean;
    permissions: boolean;
    menuResolution: boolean;
    session: boolean;
    whatsappResponse: boolean;
    finalResult: 'READY' | 'REJECTED' | 'FAILED';
    errorMessage?: string;
  }): void {
    const mark = (val: boolean) => (val ? '✓' : '✗');
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║       WORKFORCEOS WHATSAPP IDENTITY DIAGNOSTIC          ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║ Phone Normalization       ${mark(params.phoneNormalized).padEnd(30)} ║`);
    console.log(`║ Employee Lookup           ${mark(params.employeeLookup).padEnd(30)} ║`);
    console.log(`║ Employee Active           ${mark(params.employeeActive).padEnd(30)} ║`);
    console.log(`║ Organization Resolution   ${mark(params.organizationResolution).padEnd(30)} ║`);
    console.log(`║ Verification              ${mark(params.verification).padEnd(30)} ║`);
    console.log(`║ Hierarchy                 ${mark(params.hierarchy).padEnd(30)} ║`);
    console.log(`║ Role Context              ${mark(params.roleContext).padEnd(30)} ║`);
    console.log(`║ Permissions               ${mark(params.permissions).padEnd(30)} ║`);
    console.log(`║ Menu Resolution           ${mark(params.menuResolution).padEnd(30)} ║`);
    console.log(`║ Session                   ${mark(params.session).padEnd(30)} ║`);
    console.log(`║ WhatsApp Response         ${mark(params.whatsappResponse).padEnd(30)} ║`);
    if (params.errorMessage) {
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log(`║ ERROR: ${params.errorMessage.slice(0, 48).padEnd(48)} ║`);
    }
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║ FINAL RESULT: ${params.finalResult.padEnd(41)} ║`);
    console.log(`║ Correlation:  ${params.correlationId.padEnd(41)} ║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  }
}

export const whatsAppLogger = WhatsAppLogger.getInstance();
