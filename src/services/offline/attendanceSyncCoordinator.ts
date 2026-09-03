// src/services/offline/attendanceSyncCoordinator.ts
// ============================================================================
// Joy PeopleHR — Attendance Sync Coordinator & Replay Engine
// Replays pending offline events, performs server policy revalidation,
// and enforces server-side idempotency insertion
// ============================================================================

import { supabase } from '../../lib/supabase';
import { employeeIdentityResolver } from '../identity/employeeIdentityResolver';
import { vendorGovernanceEngine } from '../operations/vendorGovernanceEngine';
import { offlineAttendanceQueue, OfflineAttendanceEvent } from './offlineAttendanceQueue';

export interface SyncReplayResult {
  totalPending: number;
  syncedCount: number;
  failedCount: number;
  deadLetterCount: number;
  results: {
    idempotencyKey: string;
    status: 'SYNCED' | 'FAILED' | 'REJECTED_BY_POLICY';
    reason?: string;
  }[];
}

class AttendanceSyncCoordinator {
  private isSyncing = false;

  /**
   * Replays all pending offline events sequentially (FIFO)
   */
  async replayPendingEvents(): Promise<SyncReplayResult> {
    if (this.isSyncing) {
      return { totalPending: 0, syncedCount: 0, failedCount: 0, deadLetterCount: 0, results: [] };
    }
    this.isSyncing = true;

    const pending = offlineAttendanceQueue.getPendingEvents();
    const result: SyncReplayResult = {
      totalPending: pending.length,
      syncedCount: 0,
      failedCount: 0,
      deadLetterCount: 0,
      results: [],
    };

    try {
      for (const event of pending) {
        offlineAttendanceQueue.updateEventStatus(event.idempotency_key, 'SYNCING');
        const syncRes = await this.syncSingleEvent(event);

        if (syncRes.success) {
          offlineAttendanceQueue.updateEventStatus(event.idempotency_key, 'SYNCED');
          result.syncedCount += 1;
          result.results.push({ idempotencyKey: event.idempotency_key, status: 'SYNCED' });
        } else {
          offlineAttendanceQueue.updateEventStatus(event.idempotency_key, 'FAILED', syncRes.error);
          result.failedCount += 1;
          result.results.push({
            idempotencyKey: event.idempotency_key,
            status: syncRes.policyRejected ? 'REJECTED_BY_POLICY' : 'FAILED',
            reason: syncRes.error,
          });
        }
      }
    } finally {
      this.isSyncing = false;
      offlineAttendanceQueue.purgeOldSyncedEvents();
    }

    return result;
  }

  /**
   * Revalidates server policies (Identity, Location, Compliance) before persisting single event
   */
  private async syncSingleEvent(
    event: OfflineAttendanceEvent
  ): Promise<{ success: boolean; error?: string; policyRejected?: boolean }> {
    try {
      // 1. Identity Resolution: Resolve identifier to canonical employee UUID
      const idResult = await employeeIdentityResolver.resolveIdentity(
        event.employee_id || event.external_employee_identifier
      );

      if (idResult.status === 'NOT_FOUND') {
        return { success: false, error: 'Employee identifier not found in system.', policyRejected: true };
      }
      if (idResult.status === 'COLLISION') {
        return { success: false, error: 'Identity collision detected on identifier.', policyRejected: true };
      }

      const canonicalEmp = idResult.employee;

      // 2. Worker Status Revalidation
      if (canonicalEmp.status !== 'Active') {
        return {
          success: false,
          error: `Worker status is ${canonicalEmp.status} at sync time. Policy rejected.`,
          policyRejected: true,
        };
      }

      // 3. Location Authorization Revalidation (if location specified)
      if (event.device_id) {
        const locations = await employeeIdentityResolver.getAuthorizedLocations(canonicalEmp.id);
        const hasAuth = locations.length === 0 || locations.some((l) => l.id === event.device_id || l.code === event.device_id);
        if (!hasAuth) {
          // Warning logged, but allowed per policy
          console.warn(`[SyncCoordinator] Worker ${canonicalEmp.employee_code} clocked at unassigned location ${event.device_id}`);
        }
      }

      // 4. Idempotent Insert into Supabase attendance_events
      const receivedAtServer = new Date().toISOString();

      const { error: insErr } = await supabase.from('attendance_events').insert({
        organization_id: event.organization_id,
        employee_id: canonicalEmp.id,
        device_id: event.device_id,
        direction: event.direction,
        captured_at_device: event.captured_at_device, // Preserves original device timestamp!
        received_at_server: receivedAtServer,
        latitude: event.latitude,
        longitude: event.longitude,
        idempotency_key: event.idempotency_key,
        created_at: receivedAtServer,
      });

      if (insErr) {
        if (insErr.code === '23505' || insErr.message?.includes('duplicate key')) {
          // Already ingested previously via idempotency key -> Treat as successful sync!
          return { success: true };
        }
        return { success: false, error: insErr.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network/Server sync exception' };
    }
  }
}

export const attendanceSyncCoordinator = new AttendanceSyncCoordinator();
