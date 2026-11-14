// src/services/sentinel/sentinelCoreService.ts
// ============================================================================
// JOY SENTINEL — Autonomous SaaS Reliability & Engineering Operations Center
// Zero-Impact Telemetry & Incident Lifecycle Manager
// ============================================================================

import { supabase } from '../../lib/supabase';

export type SentinelSeverity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type SentinelErrorCode =
  | 'AUTH-001'   // Authentication & session failure
  | 'TENANT-001' // Tenant isolation violation
  | 'DB-001'     // Database connectivity or RPC failure
  | 'DB-002'     // High query latency
  | 'API-001'    // Backend API timeout
  | 'EDGE-001'   // Edge Function crash
  | 'ATT-001'    // Attendance punch commit failure
  | 'ATT-002'    // Biometric device unregistered
  | 'FACE-001'   // Face verification model failure
  | 'PAY-001'    // Payroll calculation error
  | 'PAY-002'    // Payment webhook failure
  | 'NOTIF-001'  // Airtel IQ SMS DLT / carrier delivery failure
  | 'NOTIF-002'  // Meta WhatsApp delivery failure
  | 'UI-001';    // React UI fatal error boundary crash

export interface SentinelEventPayload {
  eventCode: SentinelErrorCode | string;
  severity: SentinelSeverity;
  serviceName: string;
  message: string;
  sourceLocation?: string;
  diagnosticPayload?: Record<string, any>;
  probableCause?: string;
  recommendedAction?: string;
}

export interface SentinelIncident {
  id: string;
  incident_number: string;
  fingerprint: string;
  error_code: string;
  severity: SentinelSeverity;
  lifecycle_state: 'DETECTED' | 'ACKNOWLEDGED' | 'MITIGATING' | 'RESOLVED' | 'CLOSED';
  title: string;
  summary: string;
  service_name: string;
  first_seen_at: string;
  last_seen_at: string;
  occurrence_count: number;
  affected_tenants_count: number;
  assigned_to?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  probable_cause?: string;
  evidence: Record<string, any>;
  recommended_action?: string;
  created_at: string;
}

// Client-side in-memory throttle: Prevent sending duplicate telemetry calls within 60s
const throttleMap = new Map<string, number>();

/**
 * Emit an anomaly event to JOY Sentinel.
 * Non-blocking, fails silently to guarantee live SaaS operations are NEVER impacted.
 */
export async function emitSentinelEvent(payload: SentinelEventPayload): Promise<void> {
  const throttleKey = `${payload.eventCode}:${payload.sourceLocation || 'global'}`;
  const now = Date.now();
  const lastTime = throttleMap.get(throttleKey);

  // If identical event occurred in the last 60 seconds, throttle client-side dispatch
  if (lastTime && now - lastTime < 60000) {
    return;
  }
  throttleMap.set(throttleKey, now);

  try {
    const { error } = await supabase.rpc('fn_sentinel_ingest_event', {
      p_event_code: payload.eventCode,
      p_severity: payload.severity,
      p_service_name: payload.serviceName,
      p_message: payload.message,
      p_source_location: payload.sourceLocation || 'client/react',
      p_diagnostic_payload: payload.diagnosticPayload || {},
      p_probable_cause: payload.probableCause || null,
      p_recommended_action: payload.recommendedAction || null,
    });

    if (error) {
      console.warn('[JOY-SENTINEL] Telemetry ingest notice:', error.message);
    }
  } catch (err: any) {
    // Fail silently: monitoring must never break application runtime
    console.warn('[JOY-SENTINEL] Anomaly report deferred:', err?.message || err);
  }
}

/**
 * Fetch all active Sentinel incidents
 */
export async function getActiveSentinelIncidents(): Promise<SentinelIncident[]> {
  try {
    const { data, error } = await supabase
      .from('sentinel_incidents')
      .select('*')
      .not('lifecycle_state', 'in', '("CLOSED")')
      .order('last_seen_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SentinelIncident[];
  } catch (err) {
    console.warn('[JOY-SENTINEL] Error querying incidents:', err);
    return [];
  }
}

/**
 * Acknowledge incident
 */
export async function acknowledgeSentinelIncident(
  incidentNumber: string,
  developerName: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sentinel_incidents')
      .update({
        lifecycle_state: 'ACKNOWLEDGED',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: developerName,
        assigned_to: developerName,
      })
      .eq('incident_number', incidentNumber);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Resolve incident
 */
export async function resolveSentinelIncident(
  incidentNumber: string,
  developerName: string,
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sentinel_incidents')
      .update({
        lifecycle_state: 'RESOLVED',
        resolved_at: new Date().toISOString(),
        resolved_by: developerName,
        resolution_notes: notes || 'Resolved via admin console',
      })
      .eq('incident_number', incidentNumber);

    return !error;
  } catch {
    return false;
  }
}
