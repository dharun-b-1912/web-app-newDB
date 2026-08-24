// src/services/attendance/attendanceExceptionEngineService.ts
// ============================================================================
// JCS WorkforceOS — Automated Attendance Exception & Escalation Engine
// Missing Punch Detector, Vendor Escalation, Idempotent Notifications & Audit
// ============================================================================

import { hrEventBus } from '../hrEventBus';
import { getActiveOrgId } from './biometricCommandService';
import {
  biometricEventPipelineService,
  AttendanceSession,
  RawBiometricPunchEvent,
} from './biometricEventPipelineService';
import { api } from '../api';

export type AttendanceExceptionType =
  | 'MISSING_CHECK_OUT'
  | 'MISSING_CHECK_IN'
  | 'DEVICE_DIRECTION_MISMATCH'
  | 'UNKNOWN_BIOMETRIC_ID'
  | 'INACTIVE_EMPLOYEE_PUNCH'
  | 'DEVICE_CLOCK_DRIFT'
  | 'INVALID_PUNCH_SEQUENCE'
  | 'CROSS_SITE_UNAUTHORIZED';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ExceptionStatus = 'OPEN' | 'IN_REVIEW' | 'EMPLOYEE_CORRECTED' | 'RESOLVED' | 'IGNORED';

export interface AttendanceException {
  id: string;
  tenant_id: string;
  exception_type: AttendanceExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department?: string;
  employment_type?: 'REGULAR' | 'VENDOR' | 'CONTRACT' | 'INTERN';
  vendor_name?: string;
  vendor_manager_name?: string;
  reporting_manager_name?: string;
  work_date: string; // YYYY-MM-DD
  shift_name?: string;
  shift_end_time?: string;
  session_id?: string;
  check_in_time?: string;
  check_in_device_name?: string;
  check_out_time?: string;
  check_out_device_name?: string;
  title: string;
  description: string;
  suggested_action: string;
  escalation_level: number; // 0 = Employee, 1 = Manager, 2 = Vendor Mgr, 3 = HR Admin
  last_notified_at?: string;
  resolution_type?: 'MANUAL_CHECK_OUT' | 'APPROVED_INCOMPLETE' | 'EMPLOYEE_SELF_CORRECTED' | 'IGNORED_WITH_REASON';
  resolution_reason?: string;
  resolved_by_id?: string;
  resolved_by_name?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExceptionNotificationLog {
  id: string;
  tenant_id: string;
  exception_id: string;
  notification_key: string;
  recipient_role: 'EMPLOYEE' | 'MANAGER' | 'VENDOR_MANAGER' | 'HR_ADMIN';
  recipient_name: string;
  channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';
  subject: string;
  body: string;
  sent_at: string;
}

const STORAGE_KEYS_EXCEPTIONS = {
  EXCEPTIONS: 'workforce_bio_exceptions_v3',
  NOTIFICATIONS: 'workforce_bio_exception_notifications_v3',
  CONFIG: 'workforce_bio_exception_config_v3',
};

function getScopedKey(baseKey: string, orgId?: string): string {
  const activeOrg = orgId || getActiveOrgId();
  return `${baseKey}_${activeOrg}`;
}

function getStore<T>(baseKey: string, fallback: T, orgId?: string): T {
  try {
    const raw = localStorage.getItem(getScopedKey(baseKey, orgId));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStore<T>(baseKey: string, val: T, orgId?: string): void {
  try {
    localStorage.setItem(getScopedKey(baseKey, orgId), JSON.stringify(val));
  } catch (err) {
    console.error(`[ExceptionEngineStore] Error saving ${baseKey}:`, err);
  }
}

class AttendanceExceptionEngineService {
  /**
   * Run Missing Punch & Anomaly Evaluation Scanner
   */
  async evaluateExceptions(targetWorkDate?: string): Promise<{
    evaluatedCount: number;
    newExceptionsCount: number;
    openExceptions: AttendanceException[];
  }> {
    const tenantId = getActiveOrgId();
    const todayStr = targetWorkDate || new Date().toISOString().split('T')[0];

    const exceptionsStore = getStore<AttendanceException[]>(STORAGE_KEYS_EXCEPTIONS.EXCEPTIONS, []);
    const sessions = biometricEventPipelineService.getAttendanceSessions({ workDate: todayStr });
    const rawEvents = biometricEventPipelineService.getRawPunchLedger({ limit: 500 });

    let newCount = 0;
    let employees: any[] = [];
    try {
      employees = await api.getEmployees();
    } catch (_) {}

    // 1. EVALUATE MISSING CHECK-OUT on Open Sessions
    const openSessions = sessions.filter(s => s.is_open);
    const now = new Date();

    for (const session of openSessions) {
      const inTime = new Date(session.check_in_time);
      const elapsedHours = (now.getTime() - inTime.getTime()) / (1000 * 60 * 60);

      // If open session has exceeded 9 hours (shift end + grace period), flag as MISSING_CHECK_OUT
      if (elapsedHours >= 8.5) {
        const uniqueKey = `exc-missing-out-${session.work_date}-${session.employee_id}`;
        const existing = exceptionsStore.find(e => e.id === uniqueKey || (e.session_id === session.id && e.status === 'OPEN'));

        if (!existing) {
          const emp = employees.find((e: any) => e.id === session.employee_id);
          const isVendor = emp?.employment_type === 'Contract' || emp?.employment_type === 'VENDOR';

          const newExc: AttendanceException = {
            id: uniqueKey,
            tenant_id: tenantId,
            exception_type: 'MISSING_CHECK_OUT',
            severity: 'MEDIUM',
            status: 'OPEN',
            employee_id: session.employee_id,
            employee_name: session.employee_name,
            employee_code: session.employee_code,
            department: session.department,
            employment_type: isVendor ? 'VENDOR' : 'REGULAR',
            vendor_name: isVendor ? 'ABC Workforce Solutions' : undefined,
            vendor_manager_name: isVendor ? 'Senthil Nathan (Vendor Lead)' : undefined,
            reporting_manager_name: emp?.reporting_manager_name || 'Deepa S. (Operations Manager)',
            work_date: session.work_date,
            shift_name: session.shift_name || 'General Shift (09:00 - 18:00)',
            session_id: session.id,
            check_in_time: session.check_in_time,
            check_in_device_name: session.check_in_device_name,
            title: `Missing Check-Out: ${session.employee_name} (${session.employee_code})`,
            description: `Employee checked in at ${new Date(session.check_in_time).toLocaleTimeString()} on ${session.check_in_device_name}, but no exit punch was recorded after shift ended.`,
            suggested_action: 'Submit manual check-out time or request employee self-correction.',
            escalation_level: isVendor ? 1 : 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          exceptionsStore.unshift(newExc);
          newCount++;
          this.dispatchNotification(newExc);
        }
      }
    }

    // 2. EVALUATE UNKNOWN BIOMETRIC IDs / UNMAPPED PINs
    const unmappedPunches = rawEvents.filter(e => e.employee_id?.startsWith('UNMAPPED-'));
    for (const p of unmappedPunches) {
      const uniqueKey = `exc-unmapped-${p.work_date}-${p.biometric_user_id}`;
      const existing = exceptionsStore.find(e => e.id === uniqueKey);
      if (!existing) {
        const newExc: AttendanceException = {
          id: uniqueKey,
          tenant_id: tenantId,
          exception_type: 'UNKNOWN_BIOMETRIC_ID',
          severity: 'HIGH',
          status: 'OPEN',
          employee_id: `UNMAPPED-${p.biometric_user_id}`,
          employee_name: `Unmapped PIN #${p.biometric_user_id}`,
          employee_code: p.biometric_user_id,
          department: 'Security / Access Control',
          work_date: p.work_date,
          check_in_time: p.device_timestamp,
          check_in_device_name: p.device_name,
          title: `Unknown Biometric PIN #${p.biometric_user_id} on ${p.device_name}`,
          description: `A physical punch was registered for biometric ID #${p.biometric_user_id} at ${new Date(p.device_timestamp).toLocaleTimeString()}, but this PIN is not linked to any active employee profile.`,
          suggested_action: 'Map this machine PIN to an existing employee in the Biometric User Manager.',
          escalation_level: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        exceptionsStore.unshift(newExc);
        newCount++;
        this.dispatchNotification(newExc);
      }
    }

    // 3. EVALUATE CHECK-OUT WITHOUT CHECK-IN
    const reviewEvents = rawEvents.filter(e => e.processing_status === 'REQUIRES_REVIEW' && e.event_type === 'CHECK_OUT');
    for (const p of reviewEvents) {
      const uniqueKey = `exc-missing-in-${p.work_date}-${p.employee_id}`;
      const existing = exceptionsStore.find(e => e.id === uniqueKey);
      if (!existing) {
        const newExc: AttendanceException = {
          id: uniqueKey,
          tenant_id: tenantId,
          exception_type: 'MISSING_CHECK_IN',
          severity: 'MEDIUM',
          status: 'OPEN',
          employee_id: p.employee_id || 'UNKNOWN',
          employee_name: p.employee_name || `Emp #${p.biometric_user_id}`,
          employee_code: p.employee_code || p.biometric_user_id,
          department: 'Operations',
          work_date: p.work_date,
          check_out_time: p.device_timestamp,
          check_out_device_name: p.device_name,
          title: `Missing Check-In: ${p.employee_name}`,
          description: `Check-out punch recorded at ${new Date(p.device_timestamp).toLocaleTimeString()} on ${p.device_name}, but no prior entry check-in exists for this work date.`,
          suggested_action: 'Add entry check-in timestamp or verify shift roster.',
          escalation_level: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        exceptionsStore.unshift(newExc);
        newCount++;
        this.dispatchNotification(newExc);
      }
    }

    setStore(STORAGE_KEYS_EXCEPTIONS.EXCEPTIONS, exceptionsStore);

    return {
      evaluatedCount: sessions.length + rawEvents.length,
      newExceptionsCount: newCount,
      openExceptions: exceptionsStore.filter(e => e.status === 'OPEN'),
    };
  }

  /**
   * Dispatch Idempotent Notification with Vendor / Manager Hierarchy Routing
   */
  dispatchNotification(exception: AttendanceException): void {
    const tenantId = getActiveOrgId();
    const notifications = getStore<ExceptionNotificationLog[]>(STORAGE_KEYS_EXCEPTIONS.NOTIFICATIONS, []);

    let recipientRole: ExceptionNotificationLog['recipient_role'] = 'EMPLOYEE';
    let recipientName = exception.employee_name;

    if (exception.employment_type === 'VENDOR') {
      if (exception.escalation_level === 1) {
        recipientRole = 'VENDOR_MANAGER';
        recipientName = exception.vendor_manager_name || 'Vendor Lead';
      } else if (exception.escalation_level === 2) {
        recipientRole = 'MANAGER';
        recipientName = exception.reporting_manager_name || 'Reporting Manager';
      } else {
        recipientRole = 'HR_ADMIN';
        recipientName = 'HR Operations';
      }
    } else {
      if (exception.escalation_level === 1) {
        recipientRole = 'MANAGER';
        recipientName = exception.reporting_manager_name || 'Reporting Manager';
      } else if (exception.escalation_level >= 2) {
        recipientRole = 'HR_ADMIN';
        recipientName = 'HR Operations';
      }
    }

    const idempotencyKey = `${tenantId}::${exception.id}::${recipientRole}::lvl${exception.escalation_level}`;
    const alreadySent = notifications.some(n => n.notification_key === idempotencyKey);

    if (alreadySent) return;

    const log: ExceptionNotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenant_id: tenantId,
      exception_id: exception.id,
      notification_key: idempotencyKey,
      recipient_role: recipientRole,
      recipient_name: recipientName,
      channel: 'IN_APP',
      subject: `Attendance Exception Alert: ${exception.title}`,
      body: `${exception.description} Required Action: ${exception.suggested_action}`,
      sent_at: new Date().toISOString(),
    };

    notifications.unshift(log);
    setStore(STORAGE_KEYS_EXCEPTIONS.NOTIFICATIONS, notifications.slice(0, 1000));

    hrEventBus.emit('exception.created', { exception, notification: log });
  }

  /**
   * Get Exceptions List with Optional Filtering
   */
  getExceptions(options?: {
    status?: ExceptionStatus;
    type?: AttendanceExceptionType;
    severity?: ExceptionSeverity;
    workDate?: string;
  }): AttendanceException[] {
    let list = getStore<AttendanceException[]>(STORAGE_KEYS_EXCEPTIONS.EXCEPTIONS, []);
    if (options?.status) {
      list = list.filter(e => e.status === options.status);
    }
    if (options?.type) {
      list = list.filter(e => e.exception_type === options.type);
    }
    if (options?.severity) {
      list = list.filter(e => e.severity === options.severity);
    }
    if (options?.workDate) {
      list = list.filter(e => e.work_date === options.workDate);
    }
    return list;
  }

  /**
   * Get Notification History
   */
  getNotificationLogs(exceptionId?: string): ExceptionNotificationLog[] {
    let list = getStore<ExceptionNotificationLog[]>(STORAGE_KEYS_EXCEPTIONS.NOTIFICATIONS, []);
    if (exceptionId) {
      list = list.filter(n => n.exception_id === exceptionId);
    }
    return list;
  }

  /**
   * RESOLVE EXCEPTION: Manual Check-Out Entry (Audited Non-Destructive Resolution)
   */
  resolveWithManualCheckOut(
    exceptionId: string,
    checkOutTimeIso: string,
    reason: string,
    resolvedByName = 'HR Administrator'
  ): AttendanceException {
    const list = getStore<AttendanceException[]>(STORAGE_KEYS_EXCEPTIONS.EXCEPTIONS, []);
    const exc = list.find(e => e.id === exceptionId);
    if (!exc) throw new Error('Exception not found');

    // 1. Record Audit Adjustment in Ledger
    biometricEventPipelineService.recordAdjustment({
      sessionId: exc.session_id,
      employeeId: exc.employee_id,
      workDate: exc.work_date,
      adjustmentType: 'MANUAL_CHECK_OUT',
      reason,
      adjustedState: {
        check_out_time: checkOutTimeIso,
        check_out_device_name: 'Manual Adjustment (HR Console)',
      },
      adjustedByName: resolvedByName,
    });

    // 2. Mark Exception as Resolved
    exc.status = 'RESOLVED';
    exc.resolution_type = 'MANUAL_CHECK_OUT';
    exc.resolution_reason = reason;
    exc.resolved_by_id = 'usr-admin';
    exc.resolved_by_name = resolvedByName;
    exc.resolved_at = new Date().toISOString();
    exc.updated_at = new Date().toISOString();

    setStore(STORAGE_KEYS_EXCEPTIONS.EXCEPTIONS, list);
    hrEventBus.emit('exception.resolved', { exceptionId, resolvedByName });
    return exc;
  }

  /**
   * RESOLVE EXCEPTION: Approve Incomplete Session with Reason
   */
  resolveAsApprovedIncomplete(
    exceptionId: string,
    reason: string,
    resolvedByName = 'HR Administrator'
  ): AttendanceException {
    const list = getStore<AttendanceException[]>(STORAGE_KEYS_EXCEPTIONS.EXCEPTIONS, []);
    const exc = list.find(e => e.id === exceptionId);
    if (!exc) throw new Error('Exception not found');

    exc.status = 'RESOLVED';
    exc.resolution_type = 'APPROVED_INCOMPLETE';
    exc.resolution_reason = reason;
    exc.resolved_by_id = 'usr-admin';
    exc.resolved_by_name = resolvedByName;
    exc.resolved_at = new Date().toISOString();
    exc.updated_at = new Date().toISOString();

    setStore(STORAGE_KEYS_EXCEPTIONS.EXCEPTIONS, list);
    hrEventBus.emit('exception.resolved', { exceptionId, resolvedByName });
    return exc;
  }

  /**
   * IGNORE EXCEPTION with Audit Justification
   */
  ignoreException(
    exceptionId: string,
    reason: string,
    resolvedByName = 'HR Administrator'
  ): AttendanceException {
    const list = getStore<AttendanceException[]>(STORAGE_KEYS_EXCEPTIONS.EXCEPTIONS, []);
    const exc = list.find(e => e.id === exceptionId);
    if (!exc) throw new Error('Exception not found');

    exc.status = 'IGNORED';
    exc.resolution_type = 'IGNORED_WITH_REASON';
    exc.resolution_reason = reason;
    exc.resolved_by_id = 'usr-admin';
    exc.resolved_by_name = resolvedByName;
    exc.resolved_at = new Date().toISOString();
    exc.updated_at = new Date().toISOString();

    setStore(STORAGE_KEYS_EXCEPTIONS.EXCEPTIONS, list);
    hrEventBus.emit('exception.resolved', { exceptionId, resolvedByName });
    return exc;
  }
}

export const attendanceExceptionEngineService = new AttendanceExceptionEngineService();
