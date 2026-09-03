// src/services/biometric/firmware/firmwareComplianceMonitor.ts
// ============================================================================
// Joy PeopleHR — Gate B12: Firmware Compliance Monitor & Event Dispatcher
// ============================================================================

import { enterpriseNotificationEngine } from '../../operations/enterpriseNotificationEngine';
import { FirmwareTelemetryService, DeviceTelemetryContext, FirmwareEvaluationResult } from './firmwareTelemetryService';

export interface FirmwareComplianceEvent {
  organization_id: string;
  device_id: string;
  manufacturer: string;
  model: string;
  detected_version?: string;
  policy_version?: string;
  compliance_status: 'CURRENT' | 'OUTDATED' | 'CRITICAL' | 'UNKNOWN';
  checked_at: string;
}

export class FirmwareComplianceMonitor {
  private static eventsHistory: FirmwareComplianceEvent[] = [];

  static async evaluateAndDispatch(ctx: DeviceTelemetryContext): Promise<FirmwareEvaluationResult> {
    const result = FirmwareTelemetryService.evaluateTelemetry(ctx);

    const event: FirmwareComplianceEvent = {
      organization_id: ctx.organizationId || 'UNKNOWN_ORG',
      device_id: result.deviceId,
      manufacturer: result.manufacturer,
      model: result.deviceModel,
      detected_version: result.detectedVersion,
      policy_version: result.policyMatched?.recommended_version,
      compliance_status: result.status,
      checked_at: result.evaluatedAt,
    };

    this.eventsHistory.push(event);

    if (result.status === 'CRITICAL' || result.status === 'OUTDATED') {
      try {
        await enterpriseNotificationEngine.dispatchEvent({
          organizationId: event.organization_id,
          eventType: 'BIOMETRIC_DEVICE_OFFLINE',
          recipientId: 'it-security-operations',
          recipientName: 'IT Security Administrator',
          title: `⚠️ Firmware Governance Notice: Device ${result.deviceId} (${result.status})`,
          message: `Device ${result.deviceId} is running firmware ${result.detectedVersion}. ${result.reason}`,
          variables: {
            device_id: result.deviceId,
            firmware_status: result.status,
            detected_version: result.detectedVersion,
          },
        });
      } catch (err) {
        console.warn('[FirmwareMonitor] Event dispatch warning:', err);
      }
    }

    return result;
  }

  static getEventHistory(): FirmwareComplianceEvent[] {
    return [...this.eventsHistory];
  }
}
