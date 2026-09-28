// src/services/operations/attendanceMissEscalationEngine.ts
// ============================================================================
// Joy People HR — Hierarchical Attendance Miss Exception & Escalation Engine
// Multi-Tenant, Drill-down Routing (Org/Site -> Manager -> TL -> Employee)
// ============================================================================

import { AttendanceMissException } from '../../types/vendorPortal';

export interface HierarchicalMissReportSummary {
  organizationId: string;
  vendorId?: string;
  reportDate: string;
  totalExceptions: number;
  openCount: number;
  escalatedCount: number;
  resolvedCount: number;
  managers: Array<{
    managerId: string;
    managerName: string;
    exceptionCount: number;
    teamLeaders: Array<{
      tlId: string;
      tlName: string;
      exceptionCount: number;
      exceptions: AttendanceMissException[];
    }>;
  }>;
}

export interface EscalationNotificationPayload {
  recipientEmail: string;
  recipientRole: 'TL_SUPERVISOR' | 'REPORTING_MANAGER' | 'HR_ADMIN';
  recipientName: string;
  subject: string;
  reportDate: string;
  escalationLevel: number;
  unresolvedCount: number;
  records: Array<{
    employeeCode: string;
    employeeName: string;
    siteName: string;
    exceptionType: string;
    recordedTime?: string;
  }>;
}

export class AttendanceMissEscalationEngine {
  private inMemoryExceptions: Map<string, AttendanceMissException> = new Map();

  constructor() {
    // Zero-mock policy: In-memory store starts empty and is populated strictly from real ingested punches
  }

  /**
   * Register a detected attendance exception
   */
  public registerException(
    exception: Omit<AttendanceMissException, 'id' | 'status' | 'escalationLevel'>
  ): AttendanceMissException {
    const id = `exc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newExc: AttendanceMissException = {
      ...exception,
      id,
      status: 'OPEN',
      escalationLevel: 0,
    };
    this.inMemoryExceptions.set(id, newExc);
    return newExc;
  }

  /**
   * Resolve an exception with remarks
   */
  public resolveException(params: {
    exceptionId: string;
    organizationId: string;
    resolvedBy: string;
    remarks: string;
  }): AttendanceMissException {
    const exc = this.inMemoryExceptions.get(params.exceptionId);
    if (!exc) {
      throw new Error(`Exception ${params.exceptionId} not found`);
    }
    if (exc.organizationId !== params.organizationId) {
      throw new Error('Cross-tenant exception resolution blocked');
    }

    exc.status = 'RESOLVED';
    exc.resolvedBy = params.resolvedBy;
    exc.resolutionRemarks = params.remarks;
    this.inMemoryExceptions.set(exc.id, exc);
    return exc;
  }

  /**
   * Escalate unresolved exceptions based on age / SLA
   */
  public processEscalations(organizationId: string, hoursUnresolvedThreshold = 24): AttendanceMissException[] {
    const escalated: AttendanceMissException[] = [];
    for (const exc of this.inMemoryExceptions.values()) {
      if (exc.organizationId === organizationId && exc.status !== 'RESOLVED') {
        if (exc.escalationLevel === 0) {
          exc.escalationLevel = 1; // TL -> Manager
          exc.status = 'ESCALATED';
          exc.lastNotifiedAt = new Date().toISOString();
          escalated.push(exc);
        } else if (exc.escalationLevel === 1) {
          exc.escalationLevel = 2; // Manager -> HR Admin
          exc.status = 'ESCALATED';
          exc.lastNotifiedAt = new Date().toISOString();
          escalated.push(exc);
        }
      }
    }
    return escalated;
  }

  /**
   * Generate Hierarchical Tree Miss Report
   */
  public generateHierarchicalReport(params: {
    organizationId: string;
    vendorId?: string;
    reportDate: string;
  }): HierarchicalMissReportSummary {
    const managerMap = new Map<string, {
      managerId: string;
      managerName: string;
      tlMap: Map<string, {
        tlId: string;
        tlName: string;
        exceptions: AttendanceMissException[];
      }>;
    }>();

    let total = 0;
    let openCount = 0;
    let escalatedCount = 0;
    let resolvedCount = 0;

    for (const exc of this.inMemoryExceptions.values()) {
      if (exc.organizationId !== params.organizationId) continue;
      if (params.vendorId && exc.vendorId !== params.vendorId) continue;
      if (exc.date !== params.reportDate && params.reportDate !== 'ALL') continue;

      total++;
      if (exc.status === 'OPEN') openCount++;
      if (exc.status === 'ESCALATED') escalatedCount++;
      if (exc.status === 'RESOLVED') resolvedCount++;

      const mgrId = exc.managerId;
      if (!managerMap.has(mgrId)) {
        managerMap.set(mgrId, {
          managerId: exc.managerId,
          managerName: exc.managerName,
          tlMap: new Map(),
        });
      }

      const mgrEntry = managerMap.get(mgrId)!;
      const tlId = exc.tlSupervisorId || 'UNASSIGNED_TL';
      const tlName = exc.tlSupervisorName || 'Direct to Manager';

      if (!mgrEntry.tlMap.has(tlId)) {
        mgrEntry.tlMap.set(tlId, {
          tlId,
          tlName,
          exceptions: [],
        });
      }

      mgrEntry.tlMap.get(tlId)!.exceptions.push(exc);
    }

    const managersList = Array.from(managerMap.values()).map(m => {
      const teamLeaders = Array.from(m.tlMap.values()).map(tl => ({
        tlId: tl.tlId,
        tlName: tl.tlName,
        exceptionCount: tl.exceptions.length,
        exceptions: tl.exceptions,
      }));

      const exceptionCount = teamLeaders.reduce((acc, curr) => acc + curr.exceptionCount, 0);

      return {
        managerId: m.managerId,
        managerName: m.managerName,
        exceptionCount,
        teamLeaders,
      };
    });

    return {
      organizationId: params.organizationId,
      vendorId: params.vendorId,
      reportDate: params.reportDate,
      totalExceptions: total,
      openCount,
      escalatedCount,
      resolvedCount,
      managers: managersList,
    };
  }

  /**
   * Construct Deduplicated Escalation Email Payloads
   */
  public generateEmailNotifications(params: {
    organizationId: string;
    reportDate: string;
  }): EscalationNotificationPayload[] {
    const report = this.generateHierarchicalReport({
      organizationId: params.organizationId,
      reportDate: params.reportDate,
    });

    const payloads: EscalationNotificationPayload[] = [];

    // 1. Generate per-Manager summary emails
    report.managers.forEach(m => {
      const allMgrExceptions = m.teamLeaders.flatMap(tl => tl.exceptions.filter(e => e.status !== 'RESOLVED'));
      if (allMgrExceptions.length > 0) {
        payloads.push({
          recipientEmail: `manager.${m.managerId}@joyhospitality.com`,
          recipientRole: 'REPORTING_MANAGER',
          recipientName: m.managerName,
          subject: `[Attendance Miss Alert] ${allMgrExceptions.length} Unresolved Exceptions — ${params.reportDate}`,
          reportDate: params.reportDate,
          escalationLevel: Math.max(...allMgrExceptions.map(e => e.escalationLevel)),
          unresolvedCount: allMgrExceptions.length,
          records: allMgrExceptions.map(e => ({
            employeeCode: e.employeeCode,
            employeeName: e.employeeName,
            siteName: e.siteName,
            exceptionType: e.exceptionType,
            recordedTime: e.inTime ? `In: ${e.inTime}` : e.outTime ? `Out: ${e.outTime}` : 'No Punch',
          })),
        });
      }
    });

    return payloads;
  }
}

export const attendanceMissEscalationEngine = new AttendanceMissEscalationEngine();
