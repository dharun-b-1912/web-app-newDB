// src/services/attendance/attendanceOperationsEngine.ts
// ============================================================================
// Joy PeopleHR — Unified Attendance Operations Domain Engine
// Single Source of Truth for:
// 1. Late / Early Tracking (DETECT)
// 2. Regularization Desk (CORRECT / APPROVE)
// 3. Exceptions Queue (INVESTIGATE / SYSTEM ISSUE)
// ============================================================================

import { attendanceApi } from '../attendanceApi';
import { attendanceRosterService } from './attendanceRosterService';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';

export type LateEarlyStatus =
  | 'PENDING_ACTION'
  | 'PENDING_MANAGER'
  | 'PENDING_HR'
  | 'REGULARIZED'
  | 'RESOLVED_NO_ACTION'
  | 'EXEMPT';

export interface LateEarlyEvaluation {
  id: string;
  attendance_id?: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  shift_name: string;
  shift_code: string;
  date: string;
  scheduled_in: string;
  actual_in: string;
  late_minutes: number;
  grace_minutes: number;
  scheduled_out: string;
  actual_out: string;
  early_minutes: number;
  status: LateEarlyStatus;
  regularization_id?: string;
  exception_id?: string;
  payroll_deduction_days: number;
  reason?: string;
  updated_at: string;
}

export type RegularizationStatus =
  | 'Pending Manager'
  | 'Pending HR'
  | 'Approved'
  | 'Rejected'
  | 'Returned';

export interface RegularizationItem {
  id: string;
  attendance_id?: string;
  late_early_id?: string;
  exception_id?: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  date: string;
  shift_name: string;
  issue_type: string;
  original_in: string;
  original_out: string;
  requested_in: string;
  requested_out: string;
  reason: string;
  source: 'LATE_EARLY' | 'EXCEPTION' | 'EMPLOYEE_SELF' | 'MANUAL';
  submitted_at: string;
  submitted_by: string;
  approver_name: string;
  status: RegularizationStatus;
  comments?: string;
  evidence_attached?: boolean;
  timeline: Array<{ stage: string; timestamp: string; actor: string; note?: string }>;
}

export type ExceptionType =
  | 'DEVICE_OFFLINE'
  | 'MISSING_OUT'
  | 'MISSING_IN'
  | 'DUPLICATE_PUNCH'
  | 'FACE_MISMATCH'
  | 'GPS_VIOLATION'
  | 'NO_SHIFT_ASSIGNED'
  | 'INTEGRATION_ERROR'
  | 'UNMAPPED_EMPLOYEE';

export type ExceptionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ExceptionStatus = 'NEW' | 'INVESTIGATING' | 'WAITING' | 'RESOLVED';

export interface AttendanceExceptionItem {
  id: string;
  attendance_id?: string;
  late_early_id?: string;
  regularization_id?: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  date: string;
  source: string;
  diagnosis_expected: string;
  diagnosis_received: string;
  diagnosis_reason: string;
  suggested_action: string;
  assigned_to: string;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

const getOrgId = () => {
  try {
    const org = api.getActiveCompany();
    return org?.id || 'org-joy-01';
  } catch (_) {
    return 'org-joy-01';
  }
};

const getStorageKey = (key: string) => `wf_att_ops_${key}_${getOrgId()}`;

class AttendanceOperationsEngine {
  private load<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const data = localStorage.getItem(getStorageKey(key));
      return data ? JSON.parse(data) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  private save<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(getStorageKey(key), JSON.stringify(value));
    } catch (_) {}
  }

  // ==========================================================================
  // 1. LATE / EARLY TRACKING ENGINE (DETECT)
  // ==========================================================================

  public getLateEarlyEvaluations(filterDate?: string): LateEarlyEvaluation[] {
    const dailyRecords = attendanceApi.getDailyAttendance(filterDate);
    const existing = this.load<LateEarlyEvaluation[]>('late_early_list', []);

    // Dynamically evaluate daily records into late/early items if not already evaluated
    const evaluated: LateEarlyEvaluation[] = [];

    for (const record of dailyRecords) {
      if (record.status === 'Weekly Off' || record.status === 'Holiday') continue;

      const lateMins = record.late_minutes || 0;
      const earlyMins = record.early_checkout_minutes || 0;

      if (lateMins > 0 || earlyMins > 0 || record.status === 'Late' || record.status === 'Early Checkout') {
        const existingItem = existing.find(e => e.attendance_id === record.id || (e.employee_id === record.employee_id && e.date === record.date));

        if (existingItem) {
          evaluated.push(existingItem);
        } else {
          const newItem: LateEarlyEvaluation = {
            id: `le-${record.id || Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            attendance_id: record.id,
            employee_id: record.employee_id,
            employee_name: record.employee_name || 'Employee',
            employee_code: record.employee_code || `WF-${record.employee_id}`,
            department: record.department || 'Operations',
            shift_name: record.shift_name || 'General Shift',
            shift_code: record.shift_id || 'GEN-01',
            date: record.date,
            scheduled_in: record.expected_check_in || '09:00 AM',
            actual_in: record.first_check_in || '--:--',
            late_minutes: lateMins,
            grace_minutes: 15,
            scheduled_out: record.expected_check_out || '06:00 PM',
            actual_out: record.last_check_out || '--:--',
            early_minutes: earlyMins,
            status: record.regularization_status === 'Approved' ? 'REGULARIZED' : 'PENDING_ACTION',
            payroll_deduction_days: lateMins > 30 ? 0.5 : 0,
            updated_at: new Date().toISOString(),
          };
          evaluated.push(newItem);
        }
      }
    }

    this.save('late_early_list', evaluated);
    return evaluated;
  }

  public getLateEarlyById(id: string): LateEarlyEvaluation | undefined {
    const list = this.getLateEarlyEvaluations();
    return list.find(e => e.id === id);
  }

  // ==========================================================================
  // 2. REGULARIZATION DESK (CORRECT / APPROVE)
  // ==========================================================================

  public getRegularizations(): RegularizationItem[] {
    const list = this.load<RegularizationItem[]>('regularizations_list', []);
    return list;
  }

  public submitRegularizationFromLateEarly(
    lateEarlyId: string,
    payload: {
      requested_in: string;
      requested_out: string;
      reason: string;
      submitted_by: string;
    }
  ): RegularizationItem {
    const lateList = this.getLateEarlyEvaluations();
    const le = lateList.find(e => e.id === lateEarlyId);
    if (!le) throw new Error('Late/Early deviation record not found');

    const regList = this.getRegularizations();
    const newReg: RegularizationItem = {
      id: `reg-${Date.now()}`,
      attendance_id: le.attendance_id,
      late_early_id: le.id,
      employee_id: le.employee_id,
      employee_name: le.employee_name,
      employee_code: le.employee_code,
      department: le.department,
      date: le.date,
      shift_name: le.shift_name,
      issue_type: le.late_minutes > 0 ? `Late Arrival (+${le.late_minutes}m)` : `Early Exit (-${le.early_minutes}m)`,
      original_in: le.actual_in,
      original_out: le.actual_out,
      requested_in: payload.requested_in,
      requested_out: payload.requested_out,
      reason: payload.reason,
      source: 'LATE_EARLY',
      submitted_at: new Date().toLocaleString(),
      submitted_by: payload.submitted_by,
      approver_name: 'Reporting Manager',
      status: 'Pending Manager',
      timeline: [
        { stage: 'Late Detected', timestamp: le.updated_at, actor: 'System Detection Engine' },
        { stage: 'Regularization Submitted', timestamp: new Date().toLocaleString(), actor: payload.submitted_by, note: payload.reason },
      ],
    };

    regList.unshift(newReg);
    this.save('regularizations_list', regList);

    // Update Late / Early Status
    le.status = 'PENDING_MANAGER';
    le.regularization_id = newReg.id;
    this.save('late_early_list', lateList);

    hrEventBus.publish('regularization.submitted', { requestId: newReg.id });
    return newReg;
  }

  public submitRegularizationFromException(
    exceptionId: string,
    payload: {
      requested_in: string;
      requested_out: string;
      reason: string;
      submitted_by: string;
    }
  ): RegularizationItem {
    const exceptions = this.getExceptions();
    const exc = exceptions.find(e => e.id === exceptionId);
    if (!exc) throw new Error('Exception record not found');

    const regList = this.getRegularizations();
    const newReg: RegularizationItem = {
      id: `reg-${Date.now()}`,
      attendance_id: exc.attendance_id,
      exception_id: exc.id,
      employee_id: exc.employee_id,
      employee_name: exc.employee_name,
      employee_code: exc.employee_code,
      department: exc.department,
      date: exc.date,
      shift_name: 'General Shift',
      issue_type: `Technical Exception: ${exc.type}`,
      original_in: exc.diagnosis_received || '--:--',
      original_out: '--:--',
      requested_in: payload.requested_in,
      requested_out: payload.requested_out,
      reason: payload.reason,
      source: 'EXCEPTION',
      submitted_at: new Date().toLocaleString(),
      submitted_by: payload.submitted_by,
      approver_name: 'HR & System Admin',
      status: 'Pending Manager',
      timeline: [
        { stage: 'Exception Flagged', timestamp: exc.created_at, actor: 'Attendance Integrity Engine' },
        { stage: 'Routed to Regularization', timestamp: new Date().toLocaleString(), actor: payload.submitted_by, note: payload.reason },
      ],
    };

    regList.unshift(newReg);
    this.save('regularizations_list', regList);

    exc.status = 'INVESTIGATING';
    exc.regularization_id = newReg.id;
    this.save('exceptions_list', exceptions);

    hrEventBus.publish('regularization.submitted', { requestId: newReg.id });
    return newReg;
  }

  public approveRegularization(
    requestId: string,
    approverName: string,
    comments?: string
  ): void {
    const regList = this.getRegularizations();
    const reg = regList.find(r => r.id === requestId);
    if (!reg) return;

    reg.status = 'Approved';
    reg.comments = comments || 'Approved by Manager';
    reg.timeline.push({
      stage: 'Approved',
      timestamp: new Date().toLocaleString(),
      actor: approverName,
      note: comments,
    });
    this.save('regularizations_list', regList);

    // RECALCULATE ATTENDANCE & LATE/EARLY
    this.recalculateAttendanceAfterApproval(reg);
    hrEventBus.publish('regularization.approved', { requestId });
  }

  public rejectRegularization(
    requestId: string,
    approverName: string,
    comments?: string
  ): void {
    const regList = this.getRegularizations();
    const reg = regList.find(r => r.id === requestId);
    if (!reg) return;

    reg.status = 'Rejected';
    reg.comments = comments || 'Rejected by Manager';
    reg.timeline.push({
      stage: 'Rejected',
      timestamp: new Date().toLocaleString(),
      actor: approverName,
      note: comments,
    });
    this.save('regularizations_list', regList);

    // Update Late / Early back to PENDING_ACTION
    if (reg.late_early_id) {
      const lateList = this.getLateEarlyEvaluations();
      const le = lateList.find(e => e.id === reg.late_early_id);
      if (le) {
        le.status = 'PENDING_ACTION';
        this.save('late_early_list', lateList);
      }
    }

    hrEventBus.publish('regularization.rejected', { requestId });
  }

  private recalculateAttendanceAfterApproval(reg: RegularizationItem) {
    // 1. Update raw attendance
    attendanceApi.approveRegularization(reg.id, 'Approved', reg.comments);

    // 2. Clear Late/Early deviation
    if (reg.late_early_id) {
      const lateList = this.getLateEarlyEvaluations();
      const le = lateList.find(e => e.id === reg.late_early_id);
      if (le) {
        le.status = 'REGULARIZED';
        le.actual_in = reg.requested_in;
        le.actual_out = reg.requested_out;
        le.payroll_deduction_days = 0;
        le.updated_at = new Date().toISOString();
        this.save('late_early_list', lateList);
      }
    }

    // 3. Mark Exception Resolved if linked
    if (reg.exception_id) {
      const excList = this.getExceptions();
      const exc = excList.find(e => e.id === reg.exception_id);
      if (exc) {
        exc.status = 'RESOLVED';
        exc.resolved_at = new Date().toISOString();
        exc.resolution_notes = `Regularized by ${reg.submitted_by} and approved by ${reg.approver_name}`;
        this.save('exceptions_list', excList);
      }
    }

    hrEventBus.publish('attendance.recalculated', { employeeId: reg.employee_id, date: reg.date });
  }

  // ==========================================================================
  // 3. EXCEPTIONS QUEUE (INVESTIGATE / SYSTEM ISSUE)
  // ==========================================================================

  public getExceptions(): AttendanceExceptionItem[] {
    const list = this.load<AttendanceExceptionItem[]>('exceptions_list', []);
    return list;
  }

  public resolveException(
    exceptionId: string,
    resolutionNotes: string,
    resolvedBy: string
  ): void {
    const list = this.getExceptions();
    const exc = list.find(e => e.id === exceptionId);
    if (!exc) return;

    exc.status = 'RESOLVED';
    exc.resolved_at = new Date().toISOString();
    exc.resolution_notes = resolutionNotes;
    this.save('exceptions_list', list);

    hrEventBus.publish('exception.resolved', { exceptionId });
  }
}

export const attendanceOperationsEngine = new AttendanceOperationsEngine();
