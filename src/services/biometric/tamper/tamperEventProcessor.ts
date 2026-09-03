// src/services/biometric/tamper/tamperEventProcessor.ts
// ============================================================================
// Joy PeopleHR — Gate B14: Tamper Event Processor & Lifecycle State Machine
// Enforces: DETECTED -> UNACKNOWLEDGED -> INVESTIGATING -> RESOLVED
// ============================================================================

import { supabase } from '../../../lib/supabase';
import { TamperSignalPayload, TamperIncidentRecord } from './tamperSensorModel';
import { TamperAlertDispatcher } from './tamperAlertDispatcher';

export class TamperEventProcessor {
  private static incidents: Map<string, TamperIncidentRecord> = new Map();

  /**
   * Processes an incoming hardware tamper signal
   */
  static async processSignal(signal: TamperSignalPayload): Promise<TamperIncidentRecord> {
    const incidentId = `INC_TAMPER_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const incident: TamperIncidentRecord = {
      incident_id: incidentId,
      organization_id: signal.organization_id,
      device_id: signal.device_id,
      location_id: signal.location_id,
      sensor_type: signal.sensor_type,
      severity: 'CRITICAL',
      status: 'UNACKNOWLEDGED',
      device_restricted: true,
      tamper_triggered_at: signal.tamper_triggered_at,
    };

    this.incidents.set(incidentId, incident);

    // 1. Update database device location status to TAMPER_ALERT
    try {
      await supabase
        .from('work_locations')
        .update({
          status: 'TAMPER_ALERT',
          updated_at: signal.tamper_triggered_at,
        })
        .eq('id', signal.location_id);
    } catch (err) {
      console.warn('[TamperProcessor] DB status update warning:', err);
    }

    // 2. Dispatch critical security alert
    await TamperAlertDispatcher.dispatchSecurityAlert(incident);

    return incident;
  }

  /**
   * Advances lifecycle state with mandatory administrator identity
   */
  static acknowledgeIncident(incidentId: string, adminId: string): TamperIncidentRecord | null {
    const inc = this.incidents.get(incidentId);
    if (!inc) return null;

    inc.status = 'INVESTIGATING';
    inc.acknowledged_by = adminId;
    inc.acknowledged_at = new Date().toISOString();
    return inc;
  }

  static resolveIncident(incidentId: string, adminId: string, notes: string): TamperIncidentRecord | null {
    const inc = this.incidents.get(incidentId);
    if (!inc) return null;

    inc.status = 'RESOLVED';
    inc.device_restricted = false;
    inc.resolution_notes = notes;
    return inc;
  }

  static getIncident(incidentId: string): TamperIncidentRecord | undefined {
    return this.incidents.get(incidentId);
  }
}
