// src/services/biometric-saas/deviceCapabilityEngine.ts
// ============================================================================
// Joy PeopleHR — Universal Device Capability & Command Compatibility Engine V5
// Zero-Trust Biometric Hardware Capability Discovery & Strategy Resolution
// ============================================================================

export type CapabilityConfidence = 'SUPPORTED' | 'UNSUPPORTED' | 'UNKNOWN' | 'UNVERIFIED';

export type EnrollmentStrategyType =
  | 'REMOTE_NATIVE'
  | 'REMOTE_VENDOR_COMMAND'
  | 'DEVICE_ASSISTED'
  | 'LOCAL_DEVICE_ONLY'
  | 'TEMPLATE_IMPORT'
  | 'UNSUPPORTED';

export interface ModalityCapability {
  supported: boolean;
  confidence: CapabilityConfidence;
  maxCapacity?: number;
  remoteEnrollmentSupported: boolean;
  remoteEnrollmentConfidence: CapabilityConfidence;
  notes?: string;
}

export interface DeviceCommandCapabilities {
  userProvisioning: boolean;
  cardAssignment: boolean;
  remoteFaceEnrollment: boolean;
  remoteFingerprintEnrollment: boolean;
  remoteIrisEnrollment: boolean;
  templateUpload: boolean;
  templateDownload: boolean;
  localEnrollmentTrigger: boolean;
  attendanceRealtimePush: boolean;
  rawCommandAckConfidence: Record<string, CapabilityConfidence>;
}

export interface UniversalDeviceFingerprint {
  brand: string;
  model: string;
  platform?: string;
  firmwareVersion?: string;
  protocol: 'ADMS_HTTP' | 'TCP_4370' | 'HYBRID_ADMS_TCP' | 'HIKVISION_ISAPI' | 'MANTRA_HTTP' | 'UNKNOWN';
  deviceSerial: string;
  ipAddress?: string;
  port?: number;
}

export interface DiscoveredDeviceCapabilities {
  fingerprint: UniversalDeviceFingerprint;
  discoveredAt: string;
  capabilities: {
    face: ModalityCapability;
    fingerprint: ModalityCapability;
    card: ModalityCapability;
    pin: ModalityCapability;
    iris: ModalityCapability;
    palm: ModalityCapability;
  };
  commandMatrix: DeviceCommandCapabilities;
  supportedEnrollmentStrategies: Record<string, EnrollmentStrategyType>;
}

export interface EnrollmentStrategyResolution {
  credentialType: 'FACE' | 'FINGERPRINT' | 'CARD' | 'PIN' | 'IRIS' | 'PALM';
  strategy: EnrollmentStrategyType;
  requiresUserProvisioningFirst: boolean;
  canRemoteTriggerSensor: boolean;
  userInstructions: string[];
  verificationMethod: 'HARDWARE_TEMPLATE_DIFF' | 'DIRECT_MEMORY_CONFIRM' | 'DEVICE_EVENT_STREAM' | 'MANUAL_SUPERVISOR_VERIFY';
  reasoning: string;
}

/**
 * Universal Hardware Capability & Command Resolution Engine
 */
export class DeviceCapabilityEngine {
  private static instance: DeviceCapabilityEngine;
  private capabilityCache = new Map<string, DiscoveredDeviceCapabilities>();

  public static getInstance(): DeviceCapabilityEngine {
    if (!DeviceCapabilityEngine.instance) {
      DeviceCapabilityEngine.instance = new DeviceCapabilityEngine();
    }
    return DeviceCapabilityEngine.instance;
  }

  /**
   * Discovers & builds device capability profile from physical hardware fingerprint
   */
  public resolveDeviceCapabilities(fp: UniversalDeviceFingerprint): DiscoveredDeviceCapabilities {
    const cacheKey = `${fp.brand}:${fp.model}:${fp.platform || 'GENERIC'}:${fp.deviceSerial}`;
    const existing = this.capabilityCache.get(cacheKey);
    if (existing) return existing;

    const isEsslAiFaceMagnum =
      fp.model?.toUpperCase().includes('AI-FACE') ||
      fp.model?.toUpperCase().includes('MAGNUM') ||
      fp.platform?.toUpperCase().includes('ZMM510');

    const isSpeedFace = fp.model?.toUpperCase().includes('SPEEDFACE');
    const isStandardFpOnly = fp.model?.toUpperCase().includes('X2008') || fp.model?.toUpperCase().includes('K90');

    const caps: DiscoveredDeviceCapabilities = {
      fingerprint: fp,
      discoveredAt: new Date().toISOString(),
      capabilities: {
        face: {
          supported: isEsslAiFaceMagnum || isSpeedFace,
          confidence: isEsslAiFaceMagnum || isSpeedFace ? 'SUPPORTED' : isStandardFpOnly ? 'UNSUPPORTED' : 'UNKNOWN',
          maxCapacity: isEsslAiFaceMagnum ? 1500 : isSpeedFace ? 6000 : 0,
          // Physical hardware signal: ZMM510 Visible Light returns -1002 on remote CONTROL ENROLL_FACE
          remoteEnrollmentSupported: false,
          remoteEnrollmentConfidence: isEsslAiFaceMagnum ? 'UNSUPPORTED' : 'UNVERIFIED',
          notes: isEsslAiFaceMagnum
            ? 'Visible Light Dual AI Camera runs autonomous edge matching. Remote sensor trigger command returns -1002 (firmware restriction). Use Device-Assisted flow.'
            : undefined,
        },
        fingerprint: {
          supported: true,
          confidence: 'SUPPORTED',
          maxCapacity: isEsslAiFaceMagnum ? 5000 : 3000,
          remoteEnrollmentSupported: true, // CMD 61 works on optical prism
          remoteEnrollmentConfidence: 'SUPPORTED',
        },
        card: {
          supported: true,
          confidence: 'SUPPORTED',
          maxCapacity: 10000,
          remoteEnrollmentSupported: true, // Direct socket card assignment works
          remoteEnrollmentConfidence: 'SUPPORTED',
        },
        pin: {
          supported: true,
          confidence: 'SUPPORTED',
          maxCapacity: 10000,
          remoteEnrollmentSupported: true,
          remoteEnrollmentConfidence: 'SUPPORTED',
        },
        iris: {
          supported: false,
          confidence: 'UNSUPPORTED',
          remoteEnrollmentSupported: false,
          remoteEnrollmentConfidence: 'UNSUPPORTED',
        },
        palm: {
          supported: false,
          confidence: 'UNSUPPORTED',
          remoteEnrollmentSupported: false,
          remoteEnrollmentConfidence: 'UNSUPPORTED',
        },
      },
      commandMatrix: {
        userProvisioning: true,
        cardAssignment: true,
        remoteFaceEnrollment: false, // Confirmed: AI-FACE MAGNUM returns -1002 on CONTROL ENROLL_FACE
        remoteFingerprintEnrollment: true,
        remoteIrisEnrollment: false,
        templateUpload: false,
        templateDownload: true,
        localEnrollmentTrigger: true,
        attendanceRealtimePush: true,
        rawCommandAckConfidence: {
          'DATA USER': 'SUPPORTED',
          'CONTROL ENROLL_FACE': 'UNSUPPORTED', // Hardware returned Return=-1002
          'ENROLL_FP': 'SUPPORTED',
        },
      },
      supportedEnrollmentStrategies: {
        CARD: 'REMOTE_NATIVE',
        PIN: 'REMOTE_NATIVE',
        FINGERPRINT: 'REMOTE_VENDOR_COMMAND',
        FACE: isEsslAiFaceMagnum ? 'DEVICE_ASSISTED' : 'DEVICE_ASSISTED',
        IRIS: 'UNSUPPORTED',
        PALM: 'UNSUPPORTED',
      },
    };

    this.capabilityCache.set(cacheKey, caps);
    return caps;
  }

  /**
   * Resolves the exact step-by-step strategy for an enrollment request
   */
  public resolveEnrollmentStrategy(
    fp: UniversalDeviceFingerprint,
    credentialType: 'FACE' | 'FINGERPRINT' | 'CARD' | 'PIN' | 'IRIS' | 'PALM'
  ): EnrollmentStrategyResolution {
    const devCaps = this.resolveDeviceCapabilities(fp);
    const modality = devCaps.capabilities[credentialType.toLowerCase() as keyof typeof devCaps.capabilities];

    if (!modality || !modality.supported) {
      return {
        credentialType,
        strategy: 'UNSUPPORTED',
        requiresUserProvisioningFirst: false,
        canRemoteTriggerSensor: false,
        userInstructions: [`This hardware model (${fp.brand} ${fp.model}) does not support ${credentialType} credentials.`],
        verificationMethod: 'MANUAL_SUPERVISOR_VERIFY',
        reasoning: `Modality ${credentialType} is marked UNSUPPORTED on ${fp.model}.`,
      };
    }

    // 1. RFID Card Strategy
    if (credentialType === 'CARD') {
      return {
        credentialType: 'CARD',
        strategy: 'REMOTE_NATIVE',
        requiresUserProvisioningFirst: true,
        canRemoteTriggerSensor: false,
        userInstructions: [
          'Assign card number in Joy PeopleHR dashboard.',
          'Gateway transmits card ID directly to terminal memory flash.',
          'Employee can immediately tap card on physical machine.',
        ],
        verificationMethod: 'DIRECT_MEMORY_CONFIRM',
        reasoning: 'RFID card assignments can be committed directly into hardware user record flash without sensor wake.',
      };
    }

    // 2. Keypad PIN Strategy
    if (credentialType === 'PIN') {
      return {
        credentialType: 'PIN',
        strategy: 'REMOTE_NATIVE',
        requiresUserProvisioningFirst: true,
        canRemoteTriggerSensor: false,
        userInstructions: ['Enter numeric passcode in dashboard.', 'Gateway saves PIN directly to device flash.'],
        verificationMethod: 'DIRECT_MEMORY_CONFIRM',
        reasoning: 'Keypad PIN passcode is written directly into user record password block.',
      };
    }

    // 3. Face Strategy (eSSL AI-FACE MAGNUM / Visible Light)
    if (credentialType === 'FACE') {
      if (modality.remoteEnrollmentSupported && modality.remoteEnrollmentConfidence === 'SUPPORTED') {
        return {
          credentialType: 'FACE',
          strategy: 'REMOTE_VENDOR_COMMAND',
          requiresUserProvisioningFirst: true,
          canRemoteTriggerSensor: true,
          userInstructions: [
            'User provisioned on hardware.',
            'Terminal camera triggered remotely.',
            'Employee looks at camera (50–80cm away).',
            'Template verified by gateway.',
          ],
          verificationMethod: 'HARDWARE_TEMPLATE_DIFF',
          reasoning: 'Device firmware has verified support for remote camera trigger.',
        };
      }

      // Default for Visible Light ZMM510 / AI-FACE MAGNUM: Device-Assisted
      return {
        credentialType: 'FACE',
        strategy: 'DEVICE_ASSISTED',
        requiresUserProvisioningFirst: true,
        canRemoteTriggerSensor: false,
        userInstructions: [
          'Step 1: Joy PeopleHR provisions employee identity on terminal flash (PIN & Name).',
          'Step 2: Employee goes to terminal, taps M/OK → User Mgt → Selects their name → Face.',
          'Step 3: Terminal dual AI camera registers face in 2 seconds.',
          'Step 4: Joy PeopleHR verifies hardware template synchronization.',
        ],
        verificationMethod: 'HARDWARE_TEMPLATE_DIFF',
        reasoning:
          'Terminal firmware returned Return=-1002 on remote CONTROL ENROLL_FACE. Device-Assisted workflow ensures 100% reliable face template capture.',
      };
    }

    // 4. Fingerprint Strategy
    if (credentialType === 'FINGERPRINT') {
      return {
        credentialType: 'FINGERPRINT',
        strategy: 'REMOTE_VENDOR_COMMAND',
        requiresUserProvisioningFirst: true,
        canRemoteTriggerSensor: true,
        userInstructions: [
          'Step 1: User identity provisioned on device.',
          'Step 2: Optical prism sensor activated (CMD 61).',
          'Step 3: Employee places finger on scanner 3 times.',
          'Step 4: Hardware template verified.',
        ],
        verificationMethod: 'HARDWARE_TEMPLATE_DIFF',
        reasoning: 'Optical fingerprint prism supports remote CMD 61 interrupt trigger.',
      };
    }

    return {
      credentialType,
      strategy: 'LOCAL_DEVICE_ONLY',
      requiresUserProvisioningFirst: true,
      canRemoteTriggerSensor: false,
      userInstructions: ['Enroll directly on physical terminal menu.'],
      verificationMethod: 'HARDWARE_TEMPLATE_DIFF',
      reasoning: 'Modality requires physical device on-screen registration.',
    };
  }
}

export const deviceCapabilityEngine = DeviceCapabilityEngine.getInstance();
