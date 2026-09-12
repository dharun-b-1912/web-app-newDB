// src/types/domainEvents.ts
// ============================================================================
// JOY PeopleHR — Gate 3A: Canonical Domain Event Registry & Outbox Types
// Format: <domain>.<aggregate>.<past_tense_action>
// Server-Authoritative, Idempotent, Persistent Event Architecture
// ============================================================================

export type DomainEventStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'DEAD_LETTER';

export const CANONICAL_DOMAIN_EVENTS = {
  // People
  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_ACTIVATED: 'employee.activated',
  EMPLOYEE_TRANSFERRED: 'employee.transferred',
  EMPLOYEE_DELETED: 'employee.deleted',

  // Attendance
  ATTENDANCE_PUNCH_RECORDED: 'attendance.punch_recorded',
  ATTENDANCE_DAY_CALCULATED: 'attendance.day_calculated',
  ATTENDANCE_REGULARIZATION_SUBMITTED: 'attendance.regularization_submitted',
  ATTENDANCE_REGULARIZATION_APPROVED: 'attendance.regularization_approved',
  ATTENDANCE_REGULARIZATION_REJECTED: 'attendance.regularization_rejected',

  // Leave
  LEAVE_REQUESTED: 'leave.requested',
  LEAVE_APPROVED: 'leave.approved',
  LEAVE_REJECTED: 'leave.rejected',
  LEAVE_CANCELLED: 'leave.cancelled',

  // Overtime
  OVERTIME_REQUESTED: 'overtime.requested',
  OVERTIME_APPROVED: 'overtime.approved',
  OVERTIME_REJECTED: 'overtime.rejected',

  // Separation
  SEPARATION_INITIATED: 'separation.initiated',
  SEPARATION_CLEARANCE_COMPLETED: 'separation.clearance_completed',
  SEPARATION_APPROVED: 'separation.approved',

  // Payroll
  PAYROLL_CALCULATED: 'payroll.calculated',
  PAYROLL_HR_REVIEWED: 'payroll.hr_reviewed',
  PAYROLL_FINANCE_APPROVED: 'payroll.finance_approved',
  PAYROLL_LOCKED: 'payroll.locked',
  PAYROLL_DISBURSED: 'payroll.disbursed',

  // FnF
  FNF_GENERATED: 'fnf.generated',
  FNF_APPROVED: 'fnf.approved',
  FNF_SETTLED: 'fnf.settled',

  // Assets
  ASSET_ASSIGNED: 'asset.assigned',
  ASSET_RETURNED: 'asset.returned',
  ASSET_DAMAGED: 'asset.damaged',
  ASSET_RECOVERED: 'asset.recovered',

  // Vendor & Contingent Workforce
  VENDOR_CREATED: 'vendor.created',
  VENDOR_INVITED: 'vendor.invited',
  VENDOR_ONBOARDING_STARTED: 'vendor.onboarding_started',
  VENDOR_SUBMITTED: 'vendor.submitted',
  VENDOR_CORRECTION_REQUESTED: 'vendor.correction_requested',
  VENDOR_RESUBMITTED: 'vendor.resubmitted',
  VENDOR_APPROVED: 'vendor.approved',
  VENDOR_ACTIVATED: 'vendor.activated',
  VENDOR_REJECTED: 'vendor.rejected',
  VENDOR_SUSPENDED: 'vendor.suspended',
  VENDOR_TERMINATED: 'vendor.terminated',
  VENDOR_UPDATED: 'vendor.updated',
  VENDOR_DOCUMENT_UPLOADED: 'vendor.document_uploaded',
  VENDOR_DOCUMENT_VERIFIED: 'vendor.document_verified',
  VENDOR_DOCUMENT_REJECTED: 'vendor.document_rejected',
  VENDOR_CONTRACT_SIGNED: 'vendor.contract_signed',
  VENDOR_CONTRACT_ACTIVATED: 'vendor.contract_activated',
  VENDOR_WORKER_REGISTERED: 'vendor.worker_registered',
  VENDOR_WORKER_DEPLOYED: 'vendor.worker_deployed',
  VENDOR_ATTENDANCE_SUBMITTED: 'vendor.attendance_submitted',
  VENDOR_INVOICE_SUBMITTED: 'vendor.invoice_submitted',
  VENDOR_INVOICE_APPROVED: 'vendor.invoice_approved',
  VENDOR_SETTLEMENT_PROCESSED: 'vendor.settlement_processed',
  VENDOR_PAYMENT_DISBURSED: 'vendor.payment_disbursed',
} as const;

export type CanonicalEventType =
  (typeof CANONICAL_DOMAIN_EVENTS)[keyof typeof CANONICAL_DOMAIN_EVENTS];

/**
 * Authoritative Domain Event record corresponding to public.domain_events
 */
export interface DomainEventRecord<T = Record<string, any>> {
  id: string;
  organization_id: string;
  event_type: CanonicalEventType | string;
  aggregate_type: string;
  aggregate_id: string;
  idempotency_key: string;
  payload: T;
  actor_id?: string | null;
  status: DomainEventStatus;
  retry_count: number;
  max_retries: number;
  available_at: string;
  locked_at?: string | null;
  locked_by?: string | null;
  last_error?: string | null;
  created_at: string;
  processed_at?: string | null;
}

/**
 * Event creation envelope input
 */
export interface CreateDomainEventInput<T = Record<string, any>> {
  organization_id: string;
  event_type: CanonicalEventType | string;
  aggregate_type: string;
  aggregate_id: string;
  idempotency_key: string;
  payload: T;
  actor_id?: string | null;
  max_retries?: number;
  available_at?: string;
}

/**
 * Standard Idempotency Key Generators
 */
export const IdempotencyKeyGenerator = {
  leaveRequested: (leaveRequestId: string) => `leave-requested-${leaveRequestId}`,
  leaveApproved: (leaveRequestId: string) => `leave-approved-${leaveRequestId}`,
  leaveRejected: (leaveRequestId: string) => `leave-rejected-${leaveRequestId}`,
  leaveCancelled: (leaveRequestId: string) => `leave-cancelled-${leaveRequestId}`,
  
  overtimeRequested: (overtimeId: string) => `overtime-requested-${overtimeId}`,
  overtimeApproved: (overtimeId: string) => `overtime-approved-${overtimeId}`,
  overtimeRejected: (overtimeId: string) => `overtime-rejected-${overtimeId}`,
  
  attendancePunch: (punchId: string) => `attendance-punch-${punchId}`,
  attendanceCalculated: (employeeId: string, date: string) => `attendance-calculated-${employeeId}-${date}`,
  attendanceRegularizationSubmitted: (regId: string) => `attendance-reg-submitted-${regId}`,
  attendanceRegularizationApproved: (regId: string) => `attendance-reg-approved-${regId}`,
  attendanceRegularizationRejected: (regId: string) => `attendance-reg-rejected-${regId}`,
  
  payrollCalculated: (runId: string) => `payroll-calculated-${runId}`,
  payrollLocked: (runId: string) => `payroll-locked-${runId}`,
  payrollDisbursed: (runId: string) => `payroll-disbursed-${runId}`,

  separationInitiated: (separationId: string) => `separation-initiated-${separationId}`,
  separationClearance: (separationId: string) => `separation-clearance-${separationId}`,
  separationApproved: (separationId: string) => `separation-approved-${separationId}`,

  fnfGenerated: (fnfId: string) => `fnf-generated-${fnfId}`,
  fnfApproved: (fnfId: string) => `fnf-approved-${fnfId}`,
  fnfSettled: (fnfId: string) => `fnf-settled-${fnfId}`,

  assetAssigned: (assignmentId: string) => `asset-assigned-${assignmentId}`,
  assetReturned: (assignmentId: string) => `asset-returned-${assignmentId}`,
  assetRecovered: (assignmentId: string) => `asset-recovered-${assignmentId}`,
};
