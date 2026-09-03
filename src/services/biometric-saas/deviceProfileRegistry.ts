// src/services/biometric-saas/deviceProfileRegistry.ts
// ============================================================================
// Joy PeopleHR — Certified Biometric Device Profile Registry V5
// Manufacturer Baseline Profiles with Dynamic Fallback Hierarchy
// ============================================================================

import { DeviceCapabilities, DeviceProfile, FingerPosition } from './types/biometricUniversal.types';

const ALL_10_FINGERS: FingerPosition[] = [
  'RIGHT_THUMB',
  'RIGHT_INDEX',
  'RIGHT_MIDDLE',
  'RIGHT_RING',
  'RIGHT_LITTLE',
  'LEFT_THUMB',
  'LEFT_INDEX',
  'LEFT_MIDDLE',
  'LEFT_RING',
  'LEFT_LITTLE',
];

const TWO_PRIMARY_FINGERS: FingerPosition[] = [
  'RIGHT_INDEX',
  'RIGHT_THUMB',
];

export const CERTIFIED_DEVICE_PROFILES: Record<string, DeviceProfile> = {
  // 1. eSSL AI-FACE MAGNUM (Visible Light Face + RFID + PIN)
  ESSL_AI_FACE_MAGNUM: {
    profileId: 'ESSL_AI_FACE_MAGNUM',
    manufacturer: 'eSSL',
    modelCode: 'AI_FACE_MAGNUM',
    displayName: 'eSSL AI-FACE MAGNUM (Visible Light)',
    certified: true,
    defaultCapabilities: {
      identity: {
        manufacturer: 'eSSL',
        model: 'AI-FACE MAGNUM',
        firmwareVersion: 'v8.6.2_AI',
        platform: 'Linux-ARM-SSR',
      },
      connectivity: {
        ethernet: true,
        wifi: true,
        tcpSdk: true,
        admsPush: true,
        rs232: false,
        rs485: true,
        cloudManaged: true,
        defaultPorts: { tcp: 4370, adms: 11108, http: 80 },
      },
      credentials: {
        face: {
          supported: true,
          remoteEnrollment: true,
          algorithm: 'ZKFinger/ZKFace VX3.5 Visible Light',
          maxTemplates: 1500,
          requiresDeviceInteraction: true,
        },
        fingerprint: {
          supported: true,
          remoteEnrollment: true,
          maxTemplates: 5000,
          supportedFingerCount: 10,
          supportedFingers: ALL_10_FINGERS,
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
          deviceSpecificRestrictions: 'Numeric PIN up to 14 digits',
        },
        password: {
          supported: true,
          minLength: 6,
          maxLength: 8,
        },
        qrCode: {
          supported: false,
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
      source: 'CERTIFIED_PROFILE',
    },
  },

  // 2. eSSL SilkBio-101TC (Face + SilkID Fingerprint + RFID + PIN)
  ESSL_SILKBIO_101TC: {
    profileId: 'ESSL_SILKBIO_101TC',
    manufacturer: 'eSSL',
    modelCode: 'SILKBIO_101TC',
    displayName: 'eSSL SilkBio-101TC (Multi-Biometric)',
    certified: true,
    defaultCapabilities: {
      identity: {
        manufacturer: 'eSSL',
        model: 'SilkBio-101TC',
        firmwareVersion: 'v8.4.1',
        platform: 'ZMM220-Linux',
      },
      connectivity: {
        ethernet: true,
        wifi: true,
        tcpSdk: true,
        admsPush: true,
        rs232: false,
        rs485: true,
        cloudManaged: true,
        defaultPorts: { tcp: 4370, adms: 11108 },
      },
      credentials: {
        face: {
          supported: true,
          remoteEnrollment: true,
          algorithm: 'ZKFace 7.0 Near-Infrared',
          maxTemplates: 2000,
          requiresDeviceInteraction: true,
        },
        fingerprint: {
          supported: true,
          remoteEnrollment: true,
          maxTemplates: 3000,
          supportedFingerCount: 10,
          supportedFingers: ALL_10_FINGERS,
          algorithm: 'SilkID VX10.0',
          requiresDeviceInteraction: true,
          scansRequiredPerFinger: 3,
        },
        card: {
          supported: true,
          technologies: ['EM_125KHZ', 'MIFARE_13_56MHZ'],
          remoteEnrollment: true,
          maxCards: 10000,
          supportsManualUid: true,
          supportsTapOnDevice: true,
        },
        pin: {
          supported: true,
          minLength: 1,
          maxLength: 9,
          numericOnly: true,
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
        bufferCapacity: 100000,
      },
      security: {
        commKey: true,
        tls: false,
        deviceCertificates: false,
        signedCommands: false,
      },
      source: 'CERTIFIED_PROFILE',
    },
  },

  // 3. eSSL X2008 / X990 (Standalone Optical Fingerprint & RFID)
  ESSL_X2008: {
    profileId: 'ESSL_X2008',
    manufacturer: 'eSSL',
    modelCode: 'X2008',
    displayName: 'eSSL X2008 / X990 (Fingerprint Terminal)',
    certified: true,
    defaultCapabilities: {
      identity: {
        manufacturer: 'eSSL',
        model: 'X2008',
        firmwareVersion: 'v7.8.2',
        platform: 'ZEM560',
      },
      connectivity: {
        ethernet: true,
        wifi: false,
        tcpSdk: true,
        admsPush: true,
        rs232: true,
        rs485: true,
        cloudManaged: false,
        defaultPorts: { tcp: 4370, adms: 8080 },
      },
      credentials: {
        face: {
          supported: false,
          remoteEnrollment: false,
          requiresDeviceInteraction: false,
        },
        fingerprint: {
          supported: true,
          remoteEnrollment: true,
          maxTemplates: 10000,
          supportedFingerCount: 10,
          supportedFingers: ALL_10_FINGERS,
          algorithm: 'ZKFinger 10.0',
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
          maxLength: 8,
          numericOnly: true,
        },
      },
      enrollment: {
        supported: true,
        modes: {
          remoteSensorTrigger: true,
          deviceLocalEnrollment: true,
          sdkTemplateUpload: false,
          cardTapEnrollment: true,
          faceCaptureOnDevice: false,
          fingerprintCaptureOnDevice: true,
        },
      },
      attendance: {
        realtimePush: true,
        polling: true,
        offlineBuffer: true,
        bufferCapacity: 100000,
      },
      security: {
        commKey: true,
        tls: false,
        deviceCertificates: false,
        signedCommands: false,
      },
      source: 'CERTIFIED_PROFILE',
    },
  },

  // 4. ZKTeco SpeedFace V5L (High-Capacity Multimodal Face + Palm + Fingerprint)
  ZK_SPEEDFACE_V5L: {
    profileId: 'ZK_SPEEDFACE_V5L',
    manufacturer: 'ZKTeco',
    modelCode: 'SPEEDFACE_V5L',
    displayName: 'ZKTeco SpeedFace V5L (Face + Palm + FP)',
    certified: true,
    defaultCapabilities: {
      identity: {
        manufacturer: 'ZKTeco',
        model: 'SpeedFace V5L',
        firmwareVersion: 'v1.3.0',
        platform: 'Linux-SmartFace',
      },
      connectivity: {
        ethernet: true,
        wifi: true,
        tcpSdk: true,
        admsPush: true,
        rs232: false,
        rs485: true,
        cloudManaged: true,
        defaultPorts: { tcp: 4370, adms: 11108, https: 443 },
      },
      credentials: {
        face: {
          supported: true,
          remoteEnrollment: true,
          algorithm: 'ZKFace VX5.8',
          maxTemplates: 6000,
          requiresDeviceInteraction: true,
        },
        fingerprint: {
          supported: true,
          remoteEnrollment: true,
          maxTemplates: 6000,
          supportedFingerCount: 10,
          supportedFingers: ALL_10_FINGERS,
          algorithm: 'SilkID 10.0',
          requiresDeviceInteraction: true,
          scansRequiredPerFinger: 3,
        },
        palm: {
          supported: true,
          remoteEnrollment: true,
        },
        card: {
          supported: true,
          technologies: ['EM_125KHZ', 'MIFARE_13_56MHZ', 'MIFARE_DESFIRE'],
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
        qrCode: {
          supported: true,
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
        tls: true,
        deviceCertificates: true,
        signedCommands: true,
      },
      source: 'CERTIFIED_PROFILE',
    },
  },

  // 5. Mantra MFSTAB2 (Fingerprint & Smart Card Tablet)
  MANTRA_MFSTAB2: {
    profileId: 'MANTRA_MFSTAB2',
    manufacturer: 'Mantra',
    modelCode: 'MFSTAB2',
    displayName: 'Mantra MFSTAB2 (Aadhaar & Fingerprint Tablet)',
    certified: true,
    defaultCapabilities: {
      identity: {
        manufacturer: 'Mantra',
        model: 'MFSTAB2',
        firmwareVersion: 'v2.1.0',
        platform: 'Android 9.0',
      },
      connectivity: {
        ethernet: true,
        wifi: true,
        tcpSdk: false,
        admsPush: true,
        rs232: false,
        rs485: false,
        cloudManaged: true,
        defaultPorts: { tcp: 11100, http: 8080 },
      },
      credentials: {
        face: {
          supported: false,
          remoteEnrollment: false,
          requiresDeviceInteraction: false,
        },
        fingerprint: {
          supported: true,
          remoteEnrollment: true,
          maxTemplates: 10000,
          supportedFingerCount: 2,
          supportedFingers: TWO_PRIMARY_FINGERS,
          algorithm: 'Mantra MFS500 Optical ISO 19794-2',
          requiresDeviceInteraction: true,
          scansRequiredPerFinger: 1,
        },
        card: {
          supported: true,
          technologies: ['MIFARE_13_56MHZ'],
          remoteEnrollment: true,
          maxCards: 10000,
          supportsManualUid: true,
          supportsTapOnDevice: true,
        },
        pin: {
          supported: true,
          minLength: 4,
          maxLength: 6,
          numericOnly: true,
        },
      },
      enrollment: {
        supported: true,
        modes: {
          remoteSensorTrigger: true,
          deviceLocalEnrollment: true,
          sdkTemplateUpload: true,
          cardTapEnrollment: true,
          faceCaptureOnDevice: false,
          fingerprintCaptureOnDevice: true,
        },
      },
      attendance: {
        realtimePush: true,
        polling: false,
        offlineBuffer: true,
        bufferCapacity: 50000,
      },
      security: {
        commKey: false,
        tls: true,
        deviceCertificates: true,
        signedCommands: true,
      },
      source: 'CERTIFIED_PROFILE',
    },
  },

  // 6. Suprema FaceStation F2 (Fusion Multimodal Terminal)
  SUPREMA_FACESTATION_F2: {
    profileId: 'SUPREMA_FACESTATION_F2',
    manufacturer: 'Suprema',
    modelCode: 'FACESTATION_F2',
    displayName: 'Suprema FaceStation F2 (Fusion Multimodal)',
    certified: true,
    defaultCapabilities: {
      identity: {
        manufacturer: 'Suprema',
        model: 'FaceStation F2',
        firmwareVersion: 'v1.4.2',
        platform: 'Android-BioStar2',
      },
      connectivity: {
        ethernet: true,
        wifi: true,
        tcpSdk: true,
        admsPush: true,
        rs232: false,
        rs485: true,
        cloudManaged: true,
        defaultPorts: { tcp: 51211, https: 443 },
      },
      credentials: {
        face: {
          supported: true,
          remoteEnrollment: true,
          algorithm: 'Suprema Fusion AI Visual & IR',
          maxTemplates: 100000,
          requiresDeviceInteraction: true,
        },
        fingerprint: {
          supported: true,
          remoteEnrollment: true,
          maxTemplates: 100000,
          supportedFingerCount: 10,
          supportedFingers: ALL_10_FINGERS,
          algorithm: 'Suprema Fingerprint 4.0',
          requiresDeviceInteraction: true,
          scansRequiredPerFinger: 2,
        },
        card: {
          supported: true,
          technologies: ['EM_125KHZ', 'MIFARE_13_56MHZ', 'MIFARE_DESFIRE', 'HID_ICLASS', 'NFC_MOBILE'],
          remoteEnrollment: true,
          maxCards: 100000,
          supportsManualUid: true,
          supportsTapOnDevice: true,
        },
        pin: {
          supported: true,
          minLength: 4,
          maxLength: 16,
          numericOnly: false,
        },
      },
      enrollment: {
        supported: true,
        modes: {
          remoteSensorTrigger: true,
          deviceLocalEnrollment: true,
          sdkTemplateUpload: true,
          cardTapEnrollment: true,
          faceCaptureOnDevice: true,
          fingerprintCaptureOnDevice: true,
        },
      },
      attendance: {
        realtimePush: true,
        polling: true,
        offlineBuffer: true,
        bufferCapacity: 5000000,
      },
      security: {
        commKey: false,
        tls: true,
        deviceCertificates: true,
        signedCommands: true,
      },
      source: 'CERTIFIED_PROFILE',
    },
  },

  // 7. Unknown Device Safe Mode (Conservative Fallback)
  UNKNOWN_DEVICE_SAFE_MODE: {
    profileId: 'UNKNOWN_DEVICE_SAFE_MODE',
    manufacturer: 'Generic OEM',
    modelCode: 'GENERIC_SAFE_MODE',
    displayName: 'Unknown Device (Safe Mode Fallback)',
    certified: false,
    defaultCapabilities: {
      identity: {
        manufacturer: 'Generic OEM',
        model: 'Generic Biometric Terminal',
        firmwareVersion: 'Unknown',
      },
      connectivity: {
        ethernet: true,
        wifi: false,
        tcpSdk: true,
        admsPush: false,
        rs232: false,
        rs485: false,
        cloudManaged: false,
        defaultPorts: { tcp: 4370 },
      },
      credentials: {
        face: {
          supported: false,
          remoteEnrollment: false,
          requiresDeviceInteraction: false,
        },
        fingerprint: {
          supported: false,
          remoteEnrollment: false,
          requiresDeviceInteraction: false,
          supportedFingerCount: 0,
        },
        card: {
          supported: true,
          technologies: ['UNKNOWN_OEM'],
          remoteEnrollment: false,
          supportsManualUid: true,
          supportsTapOnDevice: false,
        },
        pin: {
          supported: true,
          minLength: 4,
          maxLength: 8,
          numericOnly: true,
        },
      },
      enrollment: {
        supported: false,
        modes: {
          remoteSensorTrigger: false,
          deviceLocalEnrollment: true,
          sdkTemplateUpload: false,
          cardTapEnrollment: false,
          faceCaptureOnDevice: false,
          fingerprintCaptureOnDevice: false,
        },
      },
      attendance: {
        realtimePush: false,
        polling: true,
        offlineBuffer: true,
      },
      security: {
        commKey: true,
        tls: false,
        deviceCertificates: false,
        signedCommands: false,
      },
      source: 'SAFE_MODE_FALLBACK',
    },
  },
};

/**
 * Resolves a model name/string to a certified DeviceProfile
 */
export function resolveCertifiedProfile(manufacturer?: string, model?: string): DeviceProfile {
  const normMfg = String(manufacturer || '').toLowerCase().trim();
  const normModel = String(model || '').toLowerCase().trim();

  if (normMfg.includes('essl') || normModel.includes('essl')) {
    if (normModel.includes('face') || normModel.includes('magnum') || normModel.includes('ai')) {
      return CERTIFIED_DEVICE_PROFILES.ESSL_AI_FACE_MAGNUM;
    }
    if (normModel.includes('silk') || normModel.includes('101')) {
      return CERTIFIED_DEVICE_PROFILES.ESSL_SILKBIO_101TC;
    }
    if (normModel.includes('x2008') || normModel.includes('x990') || normModel.includes('u990')) {
      return CERTIFIED_DEVICE_PROFILES.ESSL_X2008;
    }
    return CERTIFIED_DEVICE_PROFILES.ESSL_AI_FACE_MAGNUM; // Default eSSL
  }

  if (normMfg.includes('zk') || normModel.includes('zk') || normModel.includes('speedface')) {
    if (normModel.includes('speedface') || normModel.includes('v5l')) {
      return CERTIFIED_DEVICE_PROFILES.ZK_SPEEDFACE_V5L;
    }
    return CERTIFIED_DEVICE_PROFILES.ZK_SPEEDFACE_V5L;
  }

  if (normMfg.includes('mantra') || normModel.includes('mfs') || normModel.includes('tab')) {
    return CERTIFIED_DEVICE_PROFILES.MANTRA_MFSTAB2;
  }

  if (normMfg.includes('suprema') || normModel.includes('facestation') || normModel.includes('biostation')) {
    return CERTIFIED_DEVICE_PROFILES.SUPREMA_FACESTATION_F2;
  }

  return CERTIFIED_DEVICE_PROFILES.UNKNOWN_DEVICE_SAFE_MODE;
}
