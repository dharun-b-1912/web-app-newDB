/**
 * Joy People HR - Attendance Exception Audit Service
 * Manages chronological remark histories, resolution statuses, and audit trails
 * for attendance exceptions across the organizational hierarchy.
 */

export type AttendanceMissExceptionType =
  | 'MISSING_CHECK_IN'
  | 'MISSING_CHECK_OUT'
  | 'FULL_MISSING'
  | 'LATE_CHECK_IN'
  | 'INCOMPLETE'
  | 'PENDING_REVIEW';

export type AttendanceResolutionStatus =
  | 'DETECTED'
  | 'PENDING_REVIEW'
  | 'REMARK_ADDED'
  | 'CORRECTION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESOLVED';

export interface AttendanceExceptionRemark {
  id: string;
  timestamp: string;
  authorId: string;
  authorName: string;
  authorRole: 'TEAM_LEAD' | 'REPORTING_MANAGER' | 'SUPERVISOR' | 'HR_ADMIN' | 'EMPLOYEE';
  authorRoleDisplay: string;
  remark: string;
  action?: 'REMARK' | 'REQUEST_CORRECTION' | 'APPROVE' | 'REJECT' | 'RESOLVE';
}

export interface AttendanceAuditLog {
  id: string;
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  details: string;
}

export interface AttendanceExceptionRecord {
  employeeId: string;
  date: string;
  exceptionType: AttendanceMissExceptionType;
  resolutionStatus: AttendanceResolutionStatus;
  detectedAt: string;
  remarks: AttendanceExceptionRemark[];
  auditLogs: AttendanceAuditLog[];
}

const STORAGE_KEY = 'joy_people_attendance_exception_audit';

class AttendanceExceptionAuditService {
  private memoryStore: Map<string, AttendanceExceptionRecord> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private getKey(employeeId: string, date: string): string {
    return `${employeeId}_${date}`;
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: AttendanceExceptionRecord) => {
              this.memoryStore.set(this.getKey(item.employeeId, item.date), item);
            });
          }
        }
      }
    } catch {
      // Fallback silently in environments without localStorage
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const items = Array.from(this.memoryStore.values());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      // Ignore storage write errors
    }
  }

  /**
   * Retrieves or initializes an exception record for an employee on a target date
   */
  getOrCreateRecord(
    employeeId: string,
    date: string,
    defaultType: AttendanceMissExceptionType = 'FULL_MISSING'
  ): AttendanceExceptionRecord {
    const key = this.getKey(employeeId, date);
    let record = this.memoryStore.get(key);

    if (!record) {
      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      record = {
        employeeId,
        date,
        exceptionType: defaultType,
        resolutionStatus: 'PENDING_REVIEW',
        detectedAt: now,
        remarks: [],
        auditLogs: [
          {
            id: `audit-${Date.now()}-1`,
            timestamp: now,
            action: 'EXCEPTION_DETECTED',
            actorName: 'System Engine',
            actorRole: 'Automated Monitor',
            details: `Attendance exception (${defaultType}) flagged during automated scan`,
          },
        ],
      };
      this.memoryStore.set(key, record);
      this.saveToStorage();
    }

    return record;
  }

  /**
   * Appends an audit remark to an employee's attendance exception without overwriting history
   */
  addRemark(
    employeeId: string,
    date: string,
    params: {
      authorId: string;
      authorName: string;
      authorRole: 'TEAM_LEAD' | 'REPORTING_MANAGER' | 'SUPERVISOR' | 'HR_ADMIN' | 'EMPLOYEE';
      authorRoleDisplay: string;
      remark: string;
      action?: 'REMARK' | 'REQUEST_CORRECTION' | 'APPROVE' | 'REJECT' | 'RESOLVE';
    }
  ): AttendanceExceptionRemark {
    const record = this.getOrCreateRecord(employeeId, date);
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newRemark: AttendanceExceptionRemark = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: nowTime,
      authorId: params.authorId,
      authorName: params.authorName,
      authorRole: params.authorRole,
      authorRoleDisplay: params.authorRoleDisplay,
      remark: params.remark,
      action: params.action || 'REMARK',
    };

    record.remarks.push(newRemark);

    // Update status based on action
    if (params.action === 'REQUEST_CORRECTION') {
      record.resolutionStatus = 'CORRECTION_REQUESTED';
    } else if (params.action === 'APPROVE' || params.action === 'RESOLVE') {
      record.resolutionStatus = 'RESOLVED';
    } else if (params.action === 'REJECT') {
      record.resolutionStatus = 'REJECTED';
    } else if (record.resolutionStatus === 'DETECTED' || record.resolutionStatus === 'PENDING_REVIEW') {
      record.resolutionStatus = 'REMARK_ADDED';
    }

    record.auditLogs.push({
      id: `audit-${Date.now()}`,
      timestamp: nowTime,
      action: params.action || 'REMARK_ADDED',
      actorName: params.authorName,
      actorRole: params.authorRoleDisplay,
      details: params.remark,
    });

    this.memoryStore.set(this.getKey(employeeId, date), record);
    this.saveToStorage();

    return newRemark;
  }

  /**
   * Updates resolution status explicitly (e.g. Approved, Rejected, Resolved)
   */
  updateResolutionStatus(
    employeeId: string,
    date: string,
    status: AttendanceResolutionStatus,
    actor: { name: string; role: string; details?: string }
  ): AttendanceExceptionRecord {
    const record = this.getOrCreateRecord(employeeId, date);
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    record.resolutionStatus = status;
    record.auditLogs.push({
      id: `audit-${Date.now()}`,
      timestamp: nowTime,
      action: `STATUS_${status}`,
      actorName: actor.name,
      actorRole: actor.role,
      details: actor.details || `Resolution status transitioned to ${status}`,
    });

    this.memoryStore.set(this.getKey(employeeId, date), record);
    this.saveToStorage();

    return record;
  }

  /**
   * Returns list of remarks for an employee on a target date
   */
  getRemarks(employeeId: string, date: string): AttendanceExceptionRemark[] {
    const record = this.memoryStore.get(this.getKey(employeeId, date));
    return record ? [...record.remarks] : [];
  }

  /**
   * Returns full audit logs for an employee on a target date
   */
  getAuditLogs(employeeId: string, date: string): AttendanceAuditLog[] {
    const record = this.memoryStore.get(this.getKey(employeeId, date));
    return record ? [...record.auditLogs] : [];
  }
}

export const attendanceExceptionAuditService = new AttendanceExceptionAuditService();
