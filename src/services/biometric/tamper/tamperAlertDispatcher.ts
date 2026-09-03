// src/services/biometric/tamper/tamperAlertDispatcher.ts
// ============================================================================
// Joy PeopleHR — Gate B14: Tamper Alert Dispatcher
// Dispatches critical security alerts across SMS, Email, In-App and Realtime WebSocket
// ============================================================================

import { enterpriseNotificationEngine } from '../../operations/enterpriseNotificationEngine';
import { TamperIncidentRecord } from './tamperSensorModel';

export class TamperAlertDispatcher {
  static async dispatchSecurityAlert(incident: TamperIncidentRecord): Promise<void> {
    try {
      await enterpriseNotificationEngine.dispatchEvent({
        organizationId: incident.organization_id,
        eventType: 'BIOMETRIC_DEVICE_OFFLINE',
        recipientId: 'physical-security-ops',
        recipientName: 'Plant Physical Security Admin',
        title: `🚨 CRITICAL: Hardware Tamper Breach Detected (${incident.sensor_type})`,
        message: `Device ${incident.device_id} at location ${incident.location_id} reported a physical chassis breach at ${incident.tamper_triggered_at}. Device set to TAMPER_ALERT. Immediate security inspection required.`,
        variables: {
          device_id: incident.device_id,
          location_id: incident.location_id,
          sensor_type: incident.sensor_type,
          incident_id: incident.incident_id,
        },
      });
    } catch (err) {
      console.warn('[TamperDispatcher] Alert dispatch warning:', err);
    }
  }
}
