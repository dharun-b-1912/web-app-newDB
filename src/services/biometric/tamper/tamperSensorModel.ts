// src/services/biometric/tamper/tamperSensorModel.ts
// ============================================================================
// Joy PeopleHR — Gate B14: Physical Device Tamper Sensor Model
// ============================================================================

export type TamperSensorType =
  | 'CHASSIS_COVER_SWITCH'
  | 'OPTICAL_WALL_REMOVAL'
  | 'UNAUTHORIZED_ENCLOSURE_OPEN'
  | 'DISCONNECTION_TAMPER';

export type TamperLifecycleState =
  | 'DETECTED'
  | 'UNACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'RESOLVED';

export interface TamperSignalPayload {
  organization_id: string;
  device_id: string;
  location_id: string;
  sensor_type: TamperSensorType;
  optical_voltage_mv?: number;
  microswitch_state: 'OPEN' | 'CLOSED';
  tamper_triggered_at: string;
}

export interface TamperIncidentRecord {
  incident_id: string;
  organization_id: string;
  device_id: string;
  location_id: string;
  sensor_type: TamperSensorType;
  severity: 'CRITICAL';
  status: TamperLifecycleState;
  device_restricted: boolean;
  tamper_triggered_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolution_notes?: string;
}
