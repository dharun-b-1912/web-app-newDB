// src/services/offline/offlineEventHash.ts
// ============================================================================
// Joy PeopleHR — Offline Attendance SHA-256 Idempotency Hash Generator
// Guarantees deterministic, immutable fingerprint for offline events
// ============================================================================

import { computeSha256 } from '../operations/vendorGovernancePolicyEngine';

export interface OfflinePunchPayload {
  organization_id: string;
  employee_id?: string;
  external_employee_identifier: string;
  device_id: string;
  captured_at_device: string;
  direction: 'IN' | 'OUT';
}

/**
 * Computes deterministic SHA-256 Idempotency Key for an offline attendance punch.
 * SHA256(organization_id + employee_id/identifier + device_id + captured_at_device + direction)
 */
export function generateOfflinePunchIdempotencyKey(payload: OfflinePunchPayload): string {
  const empKey = (payload.employee_id || payload.external_employee_identifier).trim();
  const raw = `${payload.organization_id}|${empKey}|${payload.device_id}|${payload.captured_at_device}|${payload.direction}`;
  return computeSha256(raw);
}
