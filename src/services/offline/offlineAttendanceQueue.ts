// src/services/offline/offlineAttendanceQueue.ts
// ============================================================================
// Joy PeopleHR — Offline Attendance Queue Manager
// Stores PendingAttendanceEvents in local storage / IndexedDB during network outages
// ============================================================================

import { generateOfflinePunchIdempotencyKey } from './offlineEventHash';

export interface OfflineAttendanceEvent {
  id: string;
  organization_id: string;
  employee_id?: string;
  external_employee_identifier: string;
  device_id: string;
  direction: 'IN' | 'OUT';
  captured_at_device: string;
  created_at_local: string;
  latitude?: number;
  longitude?: number;
  geofence_accuracy?: number;
  idempotency_key: string;
  sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'DEAD_LETTER';
  retry_count: number;
  last_error?: string;
  synced_at?: string;
}

const STORAGE_KEY = 'joy_offline_attendance_queue_v1';

class OfflineAttendanceQueue {
  /**
   * Enqueues an offline attendance punch event
   */
  enqueueEvent(params: {
    organization_id: string;
    employee_id?: string;
    external_employee_identifier: string;
    device_id: string;
    direction: 'IN' | 'OUT';
    captured_at_device: string;
    latitude?: number;
    longitude?: number;
    geofence_accuracy?: number;
  }): OfflineAttendanceEvent {
    const idempotency_key = generateOfflinePunchIdempotencyKey({
      organization_id: params.organization_id,
      employee_id: params.employee_id,
      external_employee_identifier: params.external_employee_identifier,
      device_id: params.device_id,
      captured_at_device: params.captured_at_device,
      direction: params.direction,
    });

    const event: OfflineAttendanceEvent = {
      id: `off_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`,
      organization_id: params.organization_id,
      employee_id: params.employee_id,
      external_employee_identifier: params.external_employee_identifier,
      device_id: params.device_id,
      direction: params.direction,
      captured_at_device: params.captured_at_device,
      created_at_local: new Date().toISOString(),
      latitude: params.latitude,
      longitude: params.longitude,
      geofence_accuracy: params.geofence_accuracy,
      idempotency_key,
      sync_status: 'PENDING',
      retry_count: 0,
    };

    const queue = this.getAllEvents();
    // Prevent duplicate local enqueuing
    const existing = queue.find((e) => e.idempotency_key === idempotency_key);
    if (!existing) {
      queue.push(event);
      this.saveQueue(queue);
    }

    return existing || event;
  }

  /**
   * Returns all events in queue sorted by captured_at_device ASC (FIFO)
   */
  getAllEvents(): OfflineAttendanceEvent[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: OfflineAttendanceEvent[] = JSON.parse(raw);
      return parsed.sort(
        (a, b) => new Date(a.captured_at_device).getTime() - new Date(b.captured_at_device).getTime()
      );
    } catch {
      return [];
    }
  }

  /**
   * Returns pending events eligible for replay
   */
  getPendingEvents(): OfflineAttendanceEvent[] {
    return this.getAllEvents().filter((e) => e.sync_status === 'PENDING' || e.sync_status === 'FAILED');
  }

  /**
   * Updates an event's sync status
   */
  updateEventStatus(
    idempotencyKey: string,
    status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'DEAD_LETTER',
    error?: string
  ) {
    const queue = this.getAllEvents();
    const event = queue.find((e) => e.idempotency_key === idempotencyKey);
    if (event) {
      event.sync_status = status;
      if (status === 'SYNCED') {
        event.synced_at = new Date().toISOString();
      } else if (status === 'FAILED') {
        event.retry_count += 1;
        event.last_error = error;
        if (event.retry_count >= 5) {
          event.sync_status = 'DEAD_LETTER';
        }
      }
      this.saveQueue(queue);
    }
  }

  /**
   * Cleans synced events older than 7 days
   */
  purgeOldSyncedEvents() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const queue = this.getAllEvents().filter(
      (e) => e.sync_status !== 'SYNCED' || (e.synced_at && new Date(e.synced_at).getTime() > cutoff)
    );
    this.saveQueue(queue);
  }

  private saveQueue(queue: OfflineAttendanceEvent[]) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      } catch (err) {
        console.warn('[OfflineQueue] LocalStorage save warning:', err);
      }
    }
  }
}

export const offlineAttendanceQueue = new OfflineAttendanceQueue();
