// src/services/biometric/firmware/firmwareTelemetryService.ts
// ============================================================================
// Joy PeopleHR — Gate B12: Device Firmware Telemetry Service
// ============================================================================

import { FirmwareVersionComparator } from './firmwareVersionComparator';
import { FirmwarePolicyEngine, FirmwarePolicy } from './firmwarePolicyEngine';

export type FirmwareComplianceStatus = 'CURRENT' | 'OUTDATED' | 'CRITICAL' | 'UNKNOWN';

export interface DeviceTelemetryContext {
  organizationId?: string;
  deviceId?: string;
  manufacturer?: string;
  deviceModel?: string;
  firmwareVersion?: string;
}

export interface FirmwareEvaluationResult {
  deviceId: string;
  manufacturer: string;
  deviceModel: string;
  detectedVersion: string;
  policyMatched?: FirmwarePolicy;
  status: FirmwareComplianceStatus;
  isAllowed: boolean;
  actionRequired: 'ALLOW' | 'WARN' | 'RESTRICT' | 'INVESTIGATE' | 'BLOCK';
  reason: string;
  evaluatedAt: string;
}

export class FirmwareTelemetryService {
  static evaluateTelemetry(ctx: DeviceTelemetryContext): FirmwareEvaluationResult {
    const evaluatedAt = new Date().toISOString();

    // 1. Missing Device ID or Org ID check
    if (!ctx.deviceId || !ctx.organizationId) {
      return {
        deviceId: ctx.deviceId || 'UNKNOWN_DEVICE',
        manufacturer: ctx.manufacturer || 'UNKNOWN',
        deviceModel: ctx.deviceModel || 'UNKNOWN',
        detectedVersion: ctx.firmwareVersion || '',
        status: 'UNKNOWN',
        isAllowed: false,
        actionRequired: 'BLOCK',
        reason: 'Missing mandatory device or organization identification.',
        evaluatedAt,
      };
    }

    // 2. Unreadable Firmware Version
    if (!ctx.firmwareVersion || !ctx.firmwareVersion.trim()) {
      return {
        deviceId: ctx.deviceId,
        manufacturer: ctx.manufacturer || 'UNKNOWN',
        deviceModel: ctx.deviceModel || 'UNKNOWN',
        detectedVersion: '',
        status: 'UNKNOWN',
        isAllowed: true,
        actionRequired: 'INVESTIGATE',
        reason: 'Firmware version string unreadable or empty from device telemetry.',
        evaluatedAt,
      };
    }

    // 3. Resolve Policy
    const policy = FirmwarePolicyEngine.findPolicy(
      ctx.organizationId,
      ctx.manufacturer || '',
      ctx.deviceModel || ''
    );

    if (!policy) {
      return {
        deviceId: ctx.deviceId,
        manufacturer: ctx.manufacturer || 'UNKNOWN',
        deviceModel: ctx.deviceModel || 'UNKNOWN',
        detectedVersion: ctx.firmwareVersion,
        status: 'UNKNOWN',
        isAllowed: true,
        actionRequired: 'INVESTIGATE',
        reason: `No active firmware policy found for ${ctx.manufacturer} ${ctx.deviceModel} in org ${ctx.organizationId}.`,
        evaluatedAt,
      };
    }

    const version = ctx.firmwareVersion.trim();

    // 4. Explicitly Vulnerable / Critical Version Check
    if (policy.critical_versions && policy.critical_versions.includes(version.replace(/^v/i, ''))) {
      return {
        deviceId: ctx.deviceId,
        manufacturer: policy.manufacturer,
        deviceModel: policy.device_model,
        detectedVersion: version,
        policyMatched: policy,
        status: 'CRITICAL',
        isAllowed: false,
        actionRequired: 'RESTRICT',
        reason: `Firmware version ${version} is on explicit critical vulnerability list.`,
        evaluatedAt,
      };
    }

    // 5. Below Minimum Supported Version
    if (FirmwareVersionComparator.isLt(version, policy.minimum_supported_version)) {
      return {
        deviceId: ctx.deviceId,
        manufacturer: policy.manufacturer,
        deviceModel: policy.device_model,
        detectedVersion: version,
        policyMatched: policy,
        status: 'CRITICAL',
        isAllowed: false,
        actionRequired: 'RESTRICT',
        reason: `Firmware version ${version} is below minimum supported security threshold (${policy.minimum_supported_version}).`,
        evaluatedAt,
      };
    }

    // 6. Below Recommended Version
    if (FirmwareVersionComparator.isLt(version, policy.recommended_version)) {
      return {
        deviceId: ctx.deviceId,
        manufacturer: policy.manufacturer,
        deviceModel: policy.device_model,
        detectedVersion: version,
        policyMatched: policy,
        status: 'OUTDATED',
        isAllowed: true,
        actionRequired: 'WARN',
        reason: `Firmware version ${version} is functional but outdated. Recommended version is ${policy.recommended_version}.`,
        evaluatedAt,
      };
    }

    // 7. Approved & Current
    return {
      deviceId: ctx.deviceId,
      manufacturer: policy.manufacturer,
      deviceModel: policy.device_model,
      detectedVersion: version,
      policyMatched: policy,
      status: 'CURRENT',
      isAllowed: true,
      actionRequired: 'ALLOW',
      reason: `Firmware version ${version} is current and fully compliant.`,
      evaluatedAt,
    };
  }
}
