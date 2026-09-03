// src/services/biometric-saas/edgeEventJournal.ts
// ============================================================================
// WorkForceOS Universal Biometric Gateway V5 — Edge Event Journal & WAL
// Cryptographic Idempotent Event Deduplication & Forensic Storage
// ============================================================================

import { ClassifiedDeviceEvent } from './admsProtocolEngine';

export interface JournalEntry {
  id: string;
  tenantId: string;
  deviceSerial: string;
  receivedAt: string;
  eventType: string;
  table: string;
  recordsCount: number;
  payloadHash: string;
  parseStatus: 'PARSED' | 'PARTIAL' | 'UNKNOWN' | 'FAILED';
  cloudSyncStatus: 'LOCAL_ONLY' | 'PENDING_SYNC' | 'SYNCED' | 'FAILED_RETRY';
  syncedAt?: string;
  rawPayload: string;
}

export class EdgeEventJournal {
  private static instance: EdgeEventJournal;
  private memoryJournal: JournalEntry[] = [];
  private processedHashes: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): EdgeEventJournal {
    if (!EdgeEventJournal.instance) {
      EdgeEventJournal.instance = new EdgeEventJournal();
    }
    return EdgeEventJournal.instance;
  }

  /**
   * Appends an inbound classified device event to the local journal.
   * Returns isDuplicate = true if the exact payload was already received within the deduplication window.
   */
  public appendEvent(
    event: ClassifiedDeviceEvent,
    tenantId: string = 'org-joy-01'
  ): { entry: JournalEntry; isDuplicate: boolean } {
    const isDuplicate = this.processedHashes.has(event.payloadHash);
    if (!isDuplicate) {
      this.processedHashes.add(event.payloadHash);
    }

    const entry: JournalEntry = {
      id: event.eventUuid,
      tenantId,
      deviceSerial: event.deviceSerial,
      receivedAt: event.receivedAt,
      eventType: event.eventType,
      table: event.table,
      recordsCount: event.recordsCount,
      payloadHash: event.payloadHash,
      parseStatus: event.parseStatus,
      cloudSyncStatus: isDuplicate ? 'SYNCED' : 'PENDING_SYNC',
      rawPayload: event.rawPayload,
    };

    // Append to memory journal (keep last 5000 entries)
    this.memoryJournal.unshift(entry);
    if (this.memoryJournal.length > 5000) {
      this.memoryJournal.pop();
    }

    return { entry, isDuplicate };
  }

  public getPendingCloudSync(): JournalEntry[] {
    return this.memoryJournal.filter((e) => e.cloudSyncStatus === 'PENDING_SYNC');
  }

  public markSynced(eventUuid: string): void {
    const found = this.memoryJournal.find((e) => e.id === eventUuid);
    if (found) {
      found.cloudSyncStatus = 'SYNCED';
      found.syncedAt = new Date().toISOString();
    }
  }

  public getRecentJournalEntries(limit: number = 50): JournalEntry[] {
    return this.memoryJournal.slice(0, limit);
  }
}

export const edgeEventJournal = EdgeEventJournal.getInstance();
