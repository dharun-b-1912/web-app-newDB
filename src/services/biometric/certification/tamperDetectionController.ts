// src/services/biometric/certification/tamperDetectionController.ts
// ============================================================================
// Joy PeopleHR — Gate B14: Physical Tamper Detection & Security Escalation
// ============================================================================

export type TamperLifecycleStatus = 'DETECTED' | 'UNACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';

export interface TamperCertificationEvent {
  eventId: string;
  eventType: 'biometric.device_tamper_detected';
  severity: 'CRITICAL';
  deviceId: string;
  locationId: string;
  tamperSignal: 'COVER_SWITCH_OPEN' | 'CHASSIS_BREACH' | 'OPTICAL_SENSOR_TAMPER';
  detectedAt: string;
  status: TamperLifecycleStatus;
  deviceRestricted: boolean;
}

export class TamperDetectionController {
  static handleTamperSignal(params: {
    deviceId: string;
    locationId: string;
    tamperSignal: 'COVER_SWITCH_OPEN' | 'CHASSIS_BREACH' | 'OPTICAL_SENSOR_TAMPER';
  }): TamperCertificationEvent {
    return {
      eventId: `EVT_TAMPER_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      eventType: 'biometric.device_tamper_detected',
      severity: 'CRITICAL',
      deviceId: params.deviceId,
      locationId: params.locationId,
      tamperSignal: params.tamperSignal,
      detectedAt: new Date().toISOString(),
      status: 'UNACKNOWLEDGED',
      deviceRestricted: true,
    };
  }
}
