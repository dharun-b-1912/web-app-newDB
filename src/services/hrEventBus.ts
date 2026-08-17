export type HREventType =
  | 'employee.created'
  | 'employee.updated'
  | 'employee.deleted'
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
  | 'manager.approved'
  | 'asset.assigned'
  | 'employee.activated'
  | 'attendance.recorded'
  | 'attendance.updated'
  | 'leave.submitted'
  | 'leave.approved'
  | 'leave.rejected'
  | 'payroll.processed'
  | 'position.created'
  | 'position.filled';

export type HREventPattern = HREventType | '*' | 'employee.*' | 'attendance.*' | 'leave.*' | 'vendor.*' | 'onboarding.*' | 'task.*' | string;

export interface HREventPayload {
  eventId: string;
  type: HREventType;
  timestamp: string;
  organizationId?: string;
  companyId?: string;
  actorId?: string;
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

  // Publish an HR domain event with idempotency protection
  publish(type: HREventType, data?: any, options?: { organizationId?: string; companyId?: string; actorId?: string; eventId?: string }): void {
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
