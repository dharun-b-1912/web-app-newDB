// src/services/offline/offlineQueueRecovery.ts
// ============================================================================
// Joy PeopleHR — Offline Queue Recovery & Diagnostic Engine
// ============================================================================

import { offlineAttendanceQueue } from './offlineAttendanceQueue';
import { attendanceSyncCoordinator } from './attendanceSyncCoordinator';

export class OfflineQueueRecovery {
  /**
   * Automatically initializes network listener to trigger replay upon reconnection
   */
  static initAutoSyncListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[OfflineQueueRecovery] Network restored. Initiating automatic replay...');
      attendanceSyncCoordinator.replayPendingEvents();
    });

    // Check on startup
    if (navigator.onLine) {
      attendanceSyncCoordinator.replayPendingEvents();
    }
  }

  /**
   * Health Diagnostic summary of local queue
   */
  static getQueueHealth() {
    const all = offlineAttendanceQueue.getAllEvents();
    return {
      totalQueued: all.length,
      pending: all.filter((e) => e.sync_status === 'PENDING').length,
      syncing: all.filter((e) => e.sync_status === 'SYNCING').length,
      synced: all.filter((e) => e.sync_status === 'SYNCED').length,
      failed: all.filter((e) => e.sync_status === 'FAILED').length,
      deadLetter: all.filter((e) => e.sync_status === 'DEAD_LETTER').length,
    };
  }
}
