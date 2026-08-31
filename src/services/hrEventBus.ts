export type HREventType =
  | 'employee.created'
  | 'employee.updated'
  | 'employee.deleted'
  | 'employee.synced'
  | 'employee.archived'
  | 'employee.restored'
  | 'employee.status_changed'
  | 'employee.session_revoked'
  | 'employee.transferred'
  | 'employee.exited'
  | 'vendor.created'
  | 'vendor.updated'
  | 'vendor.deleted'
  | 'vendor.status_changed'
  | 'vendor.contract_created'
  | 'vendor.contract_expiring'
  | 'vendor.document_uploaded'
  | 'vendor.document_verified'
  | 'vendor.employee_assigned'
  | 'vendor.employee_removed'
  | 'vendor.payment_created'
  | 'vendor.payment_returned'
  | 'onboarding.created'
  | 'onboarding.updated'
  | 'onboarding.stage_changed'
  | 'task.created'
  | 'task.completed'
  | 'task.blocked'
  | 'document.verified'
  | 'document.rejected'
  | 'document.deleted'
  | 'document.expiring'
  | 'document.expired'
  | 'manager.approved'
  | 'asset.assigned'
  | 'employee.activated'
  | 'employee.profile_photo.updated'
  | 'employee.profile_photo.deleted'
  | 'employee.profile.updated'
  | 'attendance.recorded'
  | 'attendance.updated'
  | 'attendance.deleted'
  | 'attendance.regularized'
  | 'attendance.ledger_updated'
  | 'attendance.punch_received'
  | 'attendance.location_event_created'
  | 'location.created'
  | 'location.updated'
  | 'location.deleted'
  | 'location.event_created'
  | 'location.assignment_updated'
  | 'location.policy_updated'
  | 'biometric.punch_received'
  | 'biometric.agent_heartbeat'
  | 'biometric.device_status_changed'
  | 'biometric.updated'
  | 'biometric.command_updated'
  | 'biometric.command_dispatched'
  | 'device.user_sync.started'
  | 'device.user_sync.progress'
  | 'device.user_sync.completed'
  | 'device.user_sync.failed'
  | 'biometric.mapping.created'
  | 'biometric.mapping.updated'
  | 'biometric.mapping.removed'
  | 'biometric.mapping.conflict'
  | 'biometric.enrollment.started'
  | 'biometric.enrollment.waiting'
  | 'biometric.enrollment.capture_progress'
  | 'biometric.enrollment.completed'
  | 'biometric.enrollment.failed'
  | 'biometric.enrollment.cancelled'
  | 'attendance.punch.resolved'
  | 'attendance.punch.unresolved'
  | 'leave.submitted'
  | 'leave.approved'
  | 'leave.rejected'
  | 'leave.cancelled'
  | 'leave.type_updated'
  | 'leave.type_deleted'
  | 'leave.holiday_updated'
  | 'leave.calendar_updated'
  | 'leave.entitlement_updated'
  | 'leave.ledger_updated'
  | 'leave.requests_synced'
  | 'regularization.submitted'
  | 'regularization.approved'
  | 'regularization.rejected'
  | 'regularization.updated'
  | 'deviation.updated'
  | 'attendance.recalculated'
  | 'exception.created'
  | 'exception.resolved'
  | 'payroll.processed'
  | 'position.created'
  | 'position.filled'
  | 'separation.created'
  | 'separation.updated'
  | 'separation.status_changed'
  | 'manager.reviewed'
  | 'clearance.created'
  | 'clearance.completed'
  | 'asset.returned'
  | 'asset.missing'
  | 'exit_interview.completed'
  | 'fnf.ready'
  | 'separation.ready'
  | 'separation.completed'
  | 'access.revoked'
  | 'document.created'
  | 'document.updated'
  | 'document.verified'
  | 'document.rejected'
  | 'document.expiring'
  | 'document.expired'
  | 'esign.created'
  | 'esign.sent'
  | 'esign.viewed'
  | 'esign.signed'
  | 'esign.completed'
  | 'esign.rejected'
  | 'share.created'
  | 'share.revoked'
  | 'asset.created'
  | 'asset.updated'
  | 'asset.assigned'
  | 'asset.returned'
  | 'asset.transferred'
  | 'asset.maintenance_started'
  | 'asset.maintenance_completed'
  | 'asset.retired'
  | 'inventory.stock_in'
  | 'inventory.stock_out'
  | 'inventory.adjusted'
  | 'inventory.low_stock'
  | 'maintenance.scheduled'
  | 'maintenance.completed'
  | 'warranty.expiring'
  | 'organization.created'
  | 'organization.legal_entity_created'
  | 'organization.branch_created'
  | 'organization.department_created'
  | 'organization.team_created'
  | 'organization.hierarchy_updated'
  | 'vendor.worker_created'
  | 'vendor.deployment_created'
  | 'recruitment.requisition_created'
  | 'recruitment.requisition_approved'
  | 'recruitment.requisition_rejected'
  | 'recruitment.job_published'
  | 'recruitment.candidate_created'
  | 'recruitment.candidate_stage_changed'
  | 'recruitment.interview_scheduled'
  | 'recruitment.interview_completed'
  | 'recruitment.scorecard_submitted'
  | 'recruitment.offer_created'
  | 'recruitment.offer_accepted'
  | 'recruitment.candidate_converted'
  | 'attendance.punch_received'
  | 'attendance.regularization_requested'
  | 'attendance.regularization_approved'
  | 'attendance.overtime_approved'
  | 'biometric.device_status_changed'
  | 'biometric.agent_heartbeat'
  | 'location.created'
  | 'location.updated'
  | 'location.deleted'
  | 'location.assignment_updated'
  | 'location.event_created'
  | 'roster.updated'
  | 'roster.bulk_assigned'
  | 'diagnostic.sync_verified'
  | 'sync.reconcile_requested'
  | 'custom';

export type HREventPattern = HREventType | `${string}.*` | '*';

export interface HREventPayload {
  eventId: string;
  type: HREventType;
  timestamp: string;
  organizationId?: string;
  companyId?: string;
  actorId?: string;
  correlationId?: string;
  data?: any;
}

type HREventListener = (event: HREventPayload) => void;

class HREventBusService {
  private listeners: Map<string, Set<HREventListener>> = new Map();
  private processedEventIds: Set<string> = new Set();

  // Subscribe to an HR domain event or pattern
  subscribe(eventType: HREventPattern, listener: HREventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  // Alias for subscribe
  on(eventType: HREventPattern, listener: HREventListener): () => void {
    return this.subscribe(eventType, listener);
  }

  // Alias for publish
  emit(type: HREventType | string, data?: any, options?: { organizationId?: string; companyId?: string; actorId?: string; correlationId?: string }): void {
    this.publish(type as HREventType, data, options);
  }

  // Publish an HR domain event with idempotency protection
  publish(type: HREventType, data?: any, options?: { organizationId?: string; companyId?: string; actorId?: string; eventId?: string; correlationId?: string }): void {
    const eventId = options?.eventId || `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Idempotency: Skip if already processed in this runtime session
    if (this.processedEventIds.has(eventId)) {
      return;
    }
    this.processedEventIds.add(eventId);

    const payload: HREventPayload = {
      eventId,
      type,
      timestamp: new Date().toISOString(),
      organizationId: options?.organizationId,
      companyId: options?.companyId,
      actorId: options?.actorId,
      correlationId: options?.correlationId,
      data,
    };

    // 1. Notify specific type subscribers
    const specificListeners = this.listeners.get(type);
    if (specificListeners) {
      specificListeners.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          console.error(`[HREventBus] Error in listener for ${type}:`, err);
        }
      });
    }

    // 2. Notify prefix wildcard subscribers (e.g. employee.*)
    const [domain] = type.split('.');
    if (domain) {
      const prefixWildcard = `${domain}.*`;
      const prefixListeners = this.listeners.get(prefixWildcard);
      if (prefixListeners) {
        prefixListeners.forEach((fn) => {
          try {
            fn(payload);
          } catch (err) {
            console.error(`[HREventBus] Error in prefix listener for ${prefixWildcard}:`, err);
          }
        });
      }
    }

    // 3. Notify global wildcard subscribers
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          console.error(`[HREventBus] Error in wildcard listener for ${type}:`, err);
        }
      });
    }

    // Also dispatch on window for legacy listeners
    try {
      window.dispatchEvent(new CustomEvent(type, { detail: payload }));
      if (type.startsWith('employee.')) {
        window.dispatchEvent(new CustomEvent('employee:created', { detail: payload }));
      } else if (type.startsWith('attendance.')) {
        window.dispatchEvent(new CustomEvent('attendance:updated', { detail: payload }));
      } else if (type.startsWith('leave.')) {
        window.dispatchEvent(new CustomEvent('leave:updated', { detail: payload }));
      }
    } catch (_) {}
  }
}

export const hrEventBus = new HREventBusService();
