// src/hooks/useOfflineAttendanceSync.ts
// ============================================================================
// Joy PeopleHR — React Hook for Offline Attendance & Live Sync Status
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { offlineAttendanceQueue } from '../services/offline/offlineAttendanceQueue';
import { attendanceSyncCoordinator, SyncReplayResult } from '../services/offline/attendanceSyncCoordinator';
import { OfflineQueueRecovery } from '../services/offline/offlineQueueRecovery';

export function useOfflineAttendanceSync() {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queueHealth, setQueueHealth] = useState(OfflineQueueRecovery.getQueueHealth());

  const refreshHealth = useCallback(() => {
    setQueueHealth(OfflineQueueRecovery.getQueueHealth());
  }, []);

  const triggerSync = useCallback(async (): Promise<SyncReplayResult> => {
    setIsSyncing(true);
    try {
      const res = await attendanceSyncCoordinator.replayPendingEvents();
      refreshHealth();
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, [refreshHealth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    refreshHealth();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync, refreshHealth]);

  return {
    isOnline,
    isSyncing,
    queueHealth,
    triggerSync,
    enqueueOfflinePunch: offlineAttendanceQueue.enqueueEvent.bind(offlineAttendanceQueue),
    refreshHealth,
  };
}
