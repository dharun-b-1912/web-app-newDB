// src/services/biometric-saas/capabilityDiscoveryEngine.ts
// ============================================================================
// Joy PeopleHR — Capability Discovery Engine & Dynamic Driver Resolver V5
// Hierarchy: Live Query > Firmware Response > Certified Profile > Manufacturer Default > Safe Mode
// ============================================================================

import { DeviceCapabilities, DeviceProfile, EnrollmentMethod } from './types/biometricUniversal.types';
import { resolveCertifiedProfile, CERTIFIED_DEVICE_PROFILES } from './deviceProfileRegistry';

export interface DeviceCapabilitySnapshot {
  deviceId: string;
  deviceSerial: string;
  ipAddress: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  detectedAt: string;
  capabilities: DeviceCapabilities;
  source: 'LIVE_QUERY' | 'FIRMWARE_RESPONSE' | 'CERTIFIED_PROFILE' | 'MANUFACTURER_DEFAULTS' | 'SAFE_MODE_FALLBACK';
}

class CapabilityDiscoveryEngine {
  private inMemorySnapshots = new Map<string, DeviceCapabilitySnapshot>();

  /**
   * Discovers and normalizes hardware capabilities using 5-tier priority
   */
  async discoverCapabilities(
    deviceId: string,
    deviceInfo: {
      manufacturer?: string;
      model?: string;
      serialNumber?: string;
      ipAddress?: string;
      port?: number;
      firmwareVersion?: string;
    },
    liveProbeData?: any
  ): Promise<DeviceCapabilities> {
    // Check cached snapshot
    if (this.inMemorySnapshots.has(deviceId)) {
      const cached = this.inMemorySnapshots.get(deviceId)!;
      // If snapshot is less than 5 minutes old, return it
      if (Date.now() - new Date(cached.detectedAt).getTime() < 300000) {
        return cached.capabilities;
      }
    }

    // 1. Tier 1 & 2: Live Query / Firmware Response if live probe data provided
    if (liveProbeData && liveProbeData.success) {
      const liveCaps: DeviceCapabilities = {
        identity: {
          manufacturer: (liveProbeData.vendor || deviceInfo.manufacturer || 'eSSL') as any,
          model: liveProbeData.model || deviceInfo.model || 'Unknown Terminal',
          firmwareVersion: liveProbeData.firmware_version || deviceInfo.firmwareVersion || 'v8.0',
          serialNumber: liveProbeData.serial_number || deviceInfo.serialNumber,
        },
        connectivity: {
          ethernet: true,
          wifi: !!liveProbeData.wifi,
          tcpSdk: liveProbeData.port === 4370 || liveProbeData.port === 51211,
          admsPush: true,
          rs232: false,
          rs485: true,
          cloudManaged: true,
          defaultPorts: { tcp: liveProbeData.port || 4370, adms: 11108 },
        },
        credentials: {
          face: {
            supported: liveProbeData.device_type === 'Facial Recognition' || String(liveProbeData.model).toLowerCase().includes('face') || String(liveProbeData.model).toLowerCase().includes('magnum'),
            remoteEnrollment: true,
            algorithm: 'ZKFace/Visible Light AI',
            maxTemplates: liveProbeData.face_capacity || 1500,
            requiresDeviceInteraction: true,
          },
          fingerprint: {
            supported: liveProbeData.fingerprint_count !== undefined || String(liveProbeData.model).toLowerCase().includes('silk') || String(liveProbeData.model).toLowerCase().includes('x2008'),
            remoteEnrollment: true,
            maxTemplates: liveProbeData.fp_capacity || 5000,
            supportedFingerCount: 10,
            algorithm: 'ZKFinger VX10.0',
            requiresDeviceInteraction: true,
            scansRequiredPerFinger: 3,
          },
          card: {
            supported: true,
            technologies: ['EM_125KHZ'],
            remoteEnrollment: true,
            maxCards: 10000,
            supportsManualUid: true,
            supportsTapOnDevice: true,
          },
          pin: {
            supported: true,
            minLength: 1,
            maxLength: 14,
            numericOnly: true,
          },
          password: {
            supported: true,
            minLength: 6,
            maxLength: 8,
          },
        },
        enrollment: {
          supported: true,
          modes: {
            remoteSensorTrigger: true,
            deviceLocalEnrollment: true,
            sdkTemplateUpload: false,
            cardTapEnrollment: true,
            faceCaptureOnDevice: true,
            fingerprintCaptureOnDevice: true,
          },
        },
        attendance: {
          realtimePush: true,
          polling: true,
          offlineBuffer: true,
          bufferCapacity: 200000,
        },
        security: {
          commKey: true,
          tls: false,
          deviceCertificates: false,
          signedCommands: true,
        },
        source: 'LIVE_QUERY',
      };

      this.saveSnapshot(deviceId, deviceInfo, liveCaps, 'LIVE_QUERY');
      return liveCaps;
    }

    // 2. Tier 3: Certified Device Profile
    const profile = resolveCertifiedProfile(deviceInfo.manufacturer, deviceInfo.model);
    if (profile && profile.certified) {
      const caps: DeviceCapabilities = {
        ...profile.defaultCapabilities,
        identity: {
          ...profile.defaultCapabilities.identity,
          serialNumber: deviceInfo.serialNumber || profile.defaultCapabilities.identity.serialNumber,
          firmwareVersion: deviceInfo.firmwareVersion || profile.defaultCapabilities.identity.firmwareVersion,
        },
        source: 'CERTIFIED_PROFILE',
      };
      this.saveSnapshot(deviceId, deviceInfo, caps, 'CERTIFIED_PROFILE');
      return caps;
    }

    // 3. Tier 4 & 5: Unknown Device Safe Mode
    const safeModeCaps: DeviceCapabilities = {
      ...CERTIFIED_DEVICE_PROFILES.UNKNOWN_DEVICE_SAFE_MODE.defaultCapabilities,
      identity: {
        manufacturer: (deviceInfo.manufacturer || 'Generic OEM') as any,
        model: deviceInfo.model || 'Unknown Model',
        serialNumber: deviceInfo.serialNumber || 'SN-UNKNOWN',
        firmwareVersion: deviceInfo.firmwareVersion || 'v1.0',
      },
      source: 'SAFE_MODE_FALLBACK',
    };

    this.saveSnapshot(deviceId, deviceInfo, safeModeCaps, 'SAFE_MODE_FALLBACK');
    return safeModeCaps;
  }

  /**
   * Retrieves supported enrollment methods from capabilities
   */
  getSupportedEnrollmentMethods(caps: DeviceCapabilities): { method: EnrollmentMethod; displayName: string; supported: boolean; details: string; capacityStr: string }[] {
    const list: { method: EnrollmentMethod; displayName: string; supported: boolean; details: string; capacityStr: string }[] = [];

    // 1. Face Recognition
    if (caps.credentials.face?.supported) {
      list.push({
        method: 'FACE',
        displayName: 'Face Recognition',
        supported: true,
        details: caps.credentials.face.algorithm || 'Visible Light Dual AI Camera',
        capacityStr: `Capacity: ${caps.credentials.face.currentCount || 0} / ${caps.credentials.face.maxTemplates || 1500} Faces`,
      });
    }

    // 2. Optical Fingerprint
    if (caps.credentials.fingerprint?.supported) {
      list.push({
        method: 'FINGERPRINT',
        displayName: 'Optical Fingerprint',
        supported: true,
        details: `${caps.credentials.fingerprint.supportedFingerCount}-Finger Sensor • ${caps.credentials.fingerprint.algorithm || 'VX10.0'}`,
        capacityStr: `Capacity: ${caps.credentials.fingerprint.currentCount || 0} / ${caps.credentials.fingerprint.maxTemplates || 5000} Templates`,
      });
    }

    // 3. RFID Smart Card
    if (caps.credentials.card?.supported) {
      list.push({
        method: 'CARD',
        displayName: 'RFID Smart Card',
        supported: true,
        details: `Technologies: ${caps.credentials.card.technologies.join(', ').replace(/_/g, ' ')}`,
        capacityStr: `Capacity: ${caps.credentials.card.currentCount || 0} / ${caps.credentials.card.maxCards || 10000} Badges`,
      });
    }

    // 4. Keypad PIN / Passcode
    if (caps.credentials.pin?.supported) {
      list.push({
        method: 'PIN',
        displayName: 'Keypad Passcode / PIN',
        supported: true,
        details: `${caps.credentials.pin.minLength}-${caps.credentials.pin.maxLength} Digits • Terminal Keypad`,
        capacityStr: 'Hardware Standalone Code',
      });
    }

    // 5. Palm Sensor (If supported)
    if (caps.credentials.palm?.supported) {
      list.push({
        method: 'PALM',
        displayName: 'Palm Vein / Geometry',
        supported: true,
        details: 'Near-Infrared Palm Scanner',
        capacityStr: 'High-Security Biometric',
      });
    }

    // 6. Iris Recognition (If supported)
    if (caps.credentials.iris?.supported) {
      list.push({
        method: 'IRIS',
        displayName: 'Iris Scanner',
        supported: true,
        details: 'Dual Iris NIR Recognition',
        capacityStr: 'Defense-Grade Modality',
      });
    }

    return list;
  }

  private saveSnapshot(
    deviceId: string,
    info: any,
    caps: DeviceCapabilities,
    source: 'LIVE_QUERY' | 'FIRMWARE_RESPONSE' | 'CERTIFIED_PROFILE' | 'MANUFACTURER_DEFAULTS' | 'SAFE_MODE_FALLBACK'
  ) {
    const snapshot: DeviceCapabilitySnapshot = {
      deviceId,
      deviceSerial: info.serialNumber || caps.identity.serialNumber || 'SN-UNKNOWN',
      ipAddress: info.ipAddress || '192.168.1.201',
      manufacturer: caps.identity.manufacturer,
      model: caps.identity.model,
      firmwareVersion: caps.identity.firmwareVersion || 'v1.0',
      detectedAt: new Date().toISOString(),
      capabilities: caps,
      source,
    };
    this.inMemorySnapshots.set(deviceId, snapshot);
  }

  getSnapshot(deviceId: string): DeviceCapabilitySnapshot | undefined {
    return this.inMemorySnapshots.get(deviceId);
  }
}

export const capabilityDiscoveryEngine = new CapabilityDiscoveryEngine();
