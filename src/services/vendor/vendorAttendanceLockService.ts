// src/services/vendor/vendorAttendanceLockService.ts
// ============================================================================
// JOY PeopleHR — Monthly Vendor Attendance Lock & Dispute Resolution Service
// Enforces: Raw Punch → Deployment Attribution → Monthly Lock → Dispute Resolution
// Protects Downstream Invoice Derivation and 3-Way Reconciliation
// ============================================================================

import { hrEventBus } from '../hrEventBus';
import { vendorPortalService } from '../vendorPortalService';
import { VendorAttendanceRecord } from '../../types/vendorPortal';

export type AttendanceLockStatus = 'OPEN' | 'UNDER_REVIEW' | 'FINALIZED' | 'LOCKED';

export type AttendanceDisputeStatus =
  | 'PENDING'
  | 'EVIDENCE_REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ADJUSTED';

export interface AttendanceDispute {
  id: string;
  vendor_id: string;
  worker_id: string;
  worker_name: string;
  worker_code: string;
  attendance_date: string;
  claimed_status: 'PRESENT' | 'HALF_DAY' | 'OVERTIME';
  system_status: 'ABSENT' | 'MISSED_PUNCH' | 'SHORT_HOURS';
  claimed_ot_hours: number;
  system_ot_hours: number;
  dispute_reason: string;
  evidence_url?: string;
  evidence_notes?: string;
  status: AttendanceDisputeStatus;
  company_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyAttendanceLock {
  id: string;
  vendor_id: string;
  company_id: string;
  payroll_month: string; // e.g. "2026-08" or "2026-09"
  total_workers_deployed: number;
  total_approved_man_days: number;
  total_approved_ot_hours: number;
  disputes_resolved_count: number;
  pending_disputes_count: number;
  lock_status: AttendanceLockStatus;
  locked_by?: string;
  locked_at?: string;
  snapshot_hash: string;
  created_at: string;
  updated_at: string;
}

const LOCKS_STORAGE_KEY = 'workforce_vendor_attendance_locks';
const DISPUTES_STORAGE_KEY = 'workforce_vendor_attendance_disputes';

function getStoredLocks(): MonthlyAttendanceLock[] {
  try {
    const raw = localStorage.getItem(LOCKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocks(locks: MonthlyAttendanceLock[]): void {
  try {
    localStorage.setItem(LOCKS_STORAGE_KEY, JSON.stringify(locks));
  } catch (err) {
    console.error('[VendorAttendanceLockService] Storage error (locks):', err);
  }
}

function getStoredDisputes(): AttendanceDispute[] {
  try {
    const raw = localStorage.getItem(DISPUTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredDisputes(disputes: AttendanceDispute[]): void {
  try {
    localStorage.setItem(DISPUTES_STORAGE_KEY, JSON.stringify(disputes));
  } catch (err) {
    console.error('[VendorAttendanceLockService] Storage error (disputes):', err);
  }
}

export class VendorAttendanceLockService {
  /**
   * Vendor lodges an attendance dispute for biometric failures or punch discrepancies
   */
  public static submitDispute(params: {
    vendorId: string;
    workerId: string;
    workerName: string;
    workerCode: string;
    attendanceDate: string;
    claimedStatus: 'PRESENT' | 'HALF_DAY' | 'OVERTIME';
    systemStatus: 'ABSENT' | 'MISSED_PUNCH' | 'SHORT_HOURS';
    claimedOtHours?: number;
    systemOtHours?: number;
    disputeReason: string;
    evidenceUrl?: string;
  }): AttendanceDispute {
    const list = getStoredDisputes();
    const dispute: AttendanceDispute = {
      id: `disp-${Date.now().toString(36)}`,
      vendor_id: params.vendorId,
      worker_id: params.workerId,
      worker_name: params.workerName,
      worker_code: params.workerCode,
      attendance_date: params.attendanceDate,
      claimed_status: params.claimedStatus,
      system_status: params.systemStatus,
      claimed_ot_hours: params.claimedOtHours || 0,
      system_ot_hours: params.systemOtHours || 0,
      dispute_reason: params.disputeReason,
      evidence_url: params.evidenceUrl,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveStoredDisputes([dispute, ...list]);
    hrEventBus.emit('vendor.attendance_dispute_submitted', dispute);
    return dispute;
  }

  /**
   * Company Admin adjudicates an attendance dispute: Accept, Reject, or Request Evidence
   */
  public static reviewDispute(
    disputeId: string,
    decision: 'ACCEPT' | 'REJECT' | 'REQUEST_EVIDENCE',
    params: {
      companyNotes: string;
      reviewedBy: string;
    }
  ): AttendanceDispute {
    const list = getStoredDisputes();
    const idx = list.findIndex((d) => d.id === disputeId);
    if (idx === -1) throw new Error(`Dispute ${disputeId} not found`);

    const dispute = list[idx];
    let newStatus: AttendanceDisputeStatus = 'PENDING';

    if (decision === 'ACCEPT') {
      newStatus = 'ACCEPTED';
    } else if (decision === 'REJECT') {
      newStatus = 'REJECTED';
    } else if (decision === 'REQUEST_EVIDENCE') {
      newStatus = 'EVIDENCE_REQUESTED';
    }

    const updated: AttendanceDispute = {
      ...dispute,
      status: newStatus,
      company_notes: params.companyNotes,
      reviewed_by: params.reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    list[idx] = updated;
    saveStoredDisputes(list);
    hrEventBus.emit('vendor.attendance_dispute_adjudicated', updated);
    return updated;
  }

  /**
   * Evaluates monthly attendance aggregations for a vendor and company
   */
  public static calculateMonthlyAttendanceSummary(vendorId: string, payrollMonth: string): {
    totalManDays: number;
    totalOtHours: number;
    totalWorkers: number;
  } {
    const monthRecords = vendorPortalService.getMonthlyAttendance(payrollMonth, vendorId);

    const totalManDays = monthRecords.reduce((sum, r) => sum + (r.payable_days || r.present_days || 0), 0);
    const totalOtHours = monthRecords.reduce((sum, r) => sum + (r.ot_hours || 0), 0);
    const uniqueWorkers = monthRecords.length > 0 ? monthRecords.length : new Set(monthRecords.map((r) => r.employee_id)).size;

    return {
      totalManDays,
      totalOtHours,
      totalWorkers: uniqueWorkers,
    };
  }

  /**
   * Authoritative Finalization & Locking of Vendor Attendance for a given month
   * Once locked, attendance becomes financially immutable. Invoices must reference this locked figure.
   */
  public static finalizeAndLockMonth(params: {
    vendorId: string;
    companyId: string;
    payrollMonth: string;
    lockedBy: string;
  }): MonthlyAttendanceLock {
    const list = getStoredLocks();
    const existing = list.find((l) => l.vendor_id === params.vendorId && l.payroll_month === params.payrollMonth);

    if (existing && existing.lock_status === 'LOCKED') {
      throw new Error(`Attendance for ${params.payrollMonth} is already locked and immutable.`);
    }

    const disputes = getStoredDisputes().filter((d) => d.vendor_id === params.vendorId);
    const pendingDisputes = disputes.filter((d) => d.status === 'PENDING' || d.status === 'EVIDENCE_REQUESTED');
    const resolvedDisputes = disputes.filter((d) => d.status === 'ACCEPTED' || d.status === 'REJECTED' || d.status === 'ADJUSTED');

    const summary = this.calculateMonthlyAttendanceSummary(params.vendorId, params.payrollMonth);
    const hash = `att_snap_${params.vendorId}_${params.payrollMonth}_${summary.totalManDays}_${summary.totalOtHours}`;

    const lockRecord: MonthlyAttendanceLock = {
      id: existing ? existing.id : `attlock-${Date.now().toString(36)}`,
      vendor_id: params.vendorId,
      company_id: params.companyId,
      payroll_month: params.payrollMonth,
      total_workers_deployed: summary.totalWorkers,
      total_approved_man_days: summary.totalManDays,
      total_approved_ot_hours: summary.totalOtHours,
      disputes_resolved_count: resolvedDisputes.length,
      pending_disputes_count: pendingDisputes.length,
      lock_status: 'LOCKED',
      locked_by: params.lockedBy,
      locked_at: new Date().toISOString(),
      snapshot_hash: hash,
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextList = existing
      ? list.map((l) => (l.id === lockRecord.id ? lockRecord : l))
      : [lockRecord, ...list];

    saveStoredLocks(nextList);
    hrEventBus.emit('vendor.attendance_locked', lockRecord);
    return lockRecord;
  }

  public static getLockStatus(vendorId: string, payrollMonth: string): MonthlyAttendanceLock | null {
    const list = getStoredLocks();
    return list.find((l) => l.vendor_id === vendorId && l.payroll_month === payrollMonth) || null;
  }

  public static resetLock(vendorId: string, payrollMonth: string): void {
    const list = getStoredLocks().filter((l) => !(l.vendor_id === vendorId && l.payroll_month === payrollMonth));
    saveStoredLocks(list);
  }

  public static isAttendanceLocked(vendorId: string, payrollMonth: string): boolean {
    const lock = this.getLockStatus(vendorId, payrollMonth);
    return lock?.lock_status === 'LOCKED';
  }

  public static lockMonthlyAttendance(params: {
    vendorId: string;
    companyId?: string;
    period?: string;
    payrollMonth?: string;
    lockedBy: string;
    totalManDays?: number;
    totalOtHours?: number;
    totalWorkers?: number;
    notes?: string;
  }): MonthlyAttendanceLock & { lockedBy: string; isLocked: boolean; totalManDays: number; totalOtHours: number; totalWorkers: number; lockHash: string } {
    const period = params.payrollMonth || params.period || '2026-08';
    const compId = params.companyId || 'comp-joy-chennai-01';
    let lock = this.getLockStatus(params.vendorId, period);
    if (!lock || lock.lock_status !== 'LOCKED') {
      lock = this.finalizeAndLockMonth({
        vendorId: params.vendorId,
        companyId: compId,
        payrollMonth: period,
        lockedBy: params.lockedBy,
      });
    }
    return {
      ...lock,
      lockedBy: lock.locked_by || params.lockedBy,
      isLocked: lock.lock_status === 'LOCKED',
      totalManDays: lock.total_approved_man_days,
      totalOtHours: lock.total_approved_ot_hours,
      totalWorkers: lock.total_workers_deployed,
      lockHash: lock.snapshot_hash,
    };
  }

  public static getDisputes(vendorId?: string): AttendanceDispute[] {
    const list = getStoredDisputes();
    if (!vendorId) return list;
    return list.filter((d) => d.vendor_id === vendorId);
  }
}
