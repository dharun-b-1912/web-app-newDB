// src/services/biometric/catalog/deviceCompatibilityCatalog.ts
// ============================================================================
// Joy PeopleHR — Device Compatibility Catalog & Capability Registry
// Centralized, Model-Aware Hardware Profiles with Zero-Guessing Protocol Defaults
// ============================================================================

import {
  BiometricVendor,
  CommunicationMode,
  AdapterCapabilities,
} from '../adapters/deviceAdapter';

export interface DeviceModelProfile {
  vendor: BiometricVendor;
  model: string;
  family: string;
  default_port: number;
  recommended_mode: CommunicationMode;
  capabilities: AdapterCapabilities;
  firmware_range?: string;
  notes?: string;
}

export const DEVICE_COMPATIBILITY_CATALOG: Record<string, DeviceModelProfile> = {
  // --- ZKTECO DEVICES ---
  'zkteco_speedface_v5l': {
    vendor: 'ZKTeco',
    model: 'SpeedFace-V5L',
    family: 'SpeedFace Visible Light Series',
    default_port: 4370,
    recommended_mode: 'PUSH_ADMS',
    capabilities: {
      supports_tcp: true,
      supports_http: true,
      supports_https: true,
      supports_push: true,
      supports_sdk: true,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: true,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: true,
      supports_user_enrollment: true,
      default_port: 4370,
      recommended_mode: 'PUSH_ADMS',
    },
    notes: 'Dual-lens visible light facial recognition, palm verification, optical fingerprint and RFID.',
  },
  'zkteco_uface_800': {
    vendor: 'ZKTeco',
    model: 'uFace800 Plus',
    family: 'uFace Series',
    default_port: 4370,
    recommended_mode: 'PUSH_ADMS',
    capabilities: {
      supports_tcp: true,
      supports_http: true,
      supports_https: false,
      supports_push: true,
      supports_sdk: true,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: true,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: true,
      supports_user_enrollment: true,
      default_port: 4370,
      recommended_mode: 'PUSH_ADMS',
    },
    notes: 'Multi-biometric time attendance terminal with 3,000 face and 4,000 fingerprint capacity.',
  },
  'zkteco_k40': {
    vendor: 'ZKTeco',
    model: 'K40 / K20',
    family: 'K Series',
    default_port: 4370,
    recommended_mode: 'TCP_IP',
    capabilities: {
      supports_tcp: true,
      supports_http: false,
      supports_https: false,
      supports_push: false,
      supports_sdk: true,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: false,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: false,
      supports_user_enrollment: false,
      default_port: 4370,
      recommended_mode: 'TCP_IP',
    },
    notes: 'Legacy standalone fingerprint terminal with built-in battery backup. Requires TCP/IP polling.',
  },
  'zkteco_in01_a': {
    vendor: 'ZKTeco',
    model: 'IN01-A',
    family: 'IN Series',
    default_port: 4370,
    recommended_mode: 'TCP_IP',
    capabilities: {
      supports_tcp: true,
      supports_http: false,
      supports_https: false,
      supports_push: true,
      supports_sdk: true,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: true,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: true,
      supports_user_enrollment: true,
      default_port: 4370,
      recommended_mode: 'TCP_IP',
    },
    notes: 'Color screen fingerprint terminal with push capability on firmware version 6.60+.',
  },

  // --- ESSL DEVICES ---
  'essl_x990': {
    vendor: 'eSSL',
    model: 'eSSL X990 / X2008',
    family: 'X Series Standalone',
    default_port: 4370,
    recommended_mode: 'TCP_IP',
    capabilities: {
      supports_tcp: true,
      supports_http: false,
      supports_https: false,
      supports_push: true,
      supports_sdk: true,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: true,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: true,
      supports_user_enrollment: true,
      default_port: 4370,
      recommended_mode: 'TCP_IP',
    },
    notes: 'High-capacity fingerprint terminal widely deployed in Indian factories and manufacturing floors.',
  },
  'essl_silkbio_101tc': {
    vendor: 'eSSL',
    model: 'SilkBio-101TC',
    family: 'SilkBio Series',
    default_port: 4370,
    recommended_mode: 'EPUSH_SERVER',
    capabilities: {
      supports_tcp: true,
      supports_http: true,
      supports_https: false,
      supports_push: true,
      supports_sdk: true,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: true,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: true,
      supports_user_enrollment: true,
      default_port: 4370,
      recommended_mode: 'EPUSH_SERVER',
    },
    notes: 'SilkID optical sensor resistant to dry, wet, and rough fingers. Supports ePush server data transmission.',
  },
  'essl_ai_face_magnum': {
    vendor: 'eSSL',
    model: 'AI-FACE Magnum',
    family: 'Magnum AI Series',
    default_port: 4370,
    recommended_mode: 'PUSH_ADMS',
    capabilities: {
      supports_tcp: true,
      supports_http: true,
      supports_https: true,
      supports_push: true,
      supports_sdk: true,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: true,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: true,
      supports_user_enrollment: true,
      default_port: 4370,
      recommended_mode: 'PUSH_ADMS',
    },
    notes: 'Visible light facial recognition with temperature screening and mask detection.',
  },

  // --- MANTRA DEVICES ---
  'mantra_mfstab2': {
    vendor: 'Mantra',
    model: 'MFSTAB2',
    family: 'Aadhaar Bio-Tab',
    default_port: 11100,
    recommended_mode: 'HTTP_REST',
    capabilities: {
      supports_tcp: false,
      supports_http: true,
      supports_https: true,
      supports_push: true,
      supports_sdk: true,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: true,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: false,
      supports_user_enrollment: true,
      default_port: 11100,
      recommended_mode: 'HTTP_REST',
    },
    notes: 'Android tablet biometric device running Mantra RD service with JSON/REST push capability.',
  },

  // --- MATRIX DEVICES ---
  'matrix_cosec_vega': {
    vendor: 'Matrix',
    model: 'COSEC VEGA FAX',
    family: 'COSEC Enterprise Series',
    default_port: 80,
    recommended_mode: 'HTTP_REST',
    capabilities: {
      supports_tcp: true,
      supports_http: true,
      supports_https: true,
      supports_push: true,
      supports_sdk: true,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: true,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: true,
      supports_user_enrollment: true,
      default_port: 80,
      recommended_mode: 'HTTP_REST',
    },
    notes: 'Enterprise biometric door controller with direct HTTP/XML API and event push.',
  },

  // --- GENERIC ADAPTERS ---
  'generic_tcp_terminal': {
    vendor: 'Generic',
    model: 'Standard TCP Biometric Terminal',
    family: 'Generic TCP Protocol',
    default_port: 4370,
    recommended_mode: 'TCP_IP',
    capabilities: {
      supports_tcp: true,
      supports_http: false,
      supports_https: false,
      supports_push: false,
      supports_sdk: false,
      supports_user_sync: true,
      supports_attendance_pull: true,
      supports_attendance_push: false,
      supports_device_time: true,
      supports_device_health: true,
      supports_remote_restart: false,
      supports_user_enrollment: false,
      default_port: 4370,
      recommended_mode: 'TCP_IP',
    },
    notes: 'Generic TCP terminal communicating via standardized command-line handshake.',
  },
  'generic_http_push': {
    vendor: 'Generic',
    model: 'Standard HTTP/HTTPS Webhook Device',
    family: 'Generic Webhook Protocol',
    default_port: 8080,
    recommended_mode: 'HTTP_REST',
    capabilities: {
      supports_tcp: false,
      supports_http: true,
      supports_https: true,
      supports_push: true,
      supports_sdk: false,
      supports_user_sync: false,
      supports_attendance_pull: false,
      supports_attendance_push: true,
      supports_device_time: false,
      supports_device_health: true,
      supports_remote_restart: false,
      supports_user_enrollment: false,
      default_port: 8080,
      recommended_mode: 'HTTP_REST',
    },
    notes: 'Generic biometric device pushing JSON or form-encoded attendance punches to local connector webhook.',
  },
};

/**
 * Finds the closest matching catalog profile for a given vendor and model string.
 */
export function lookupDeviceProfile(vendor: BiometricVendor, modelQuery?: string): DeviceModelProfile {
  const normalizedVendor = vendor.toLowerCase();
  const normalizedModel = (modelQuery || '').toLowerCase();

  // 1. Exact or partial match on model key
  for (const [key, profile] of Object.entries(DEVICE_COMPATIBILITY_CATALOG)) {
    if (profile.vendor.toLowerCase() === normalizedVendor) {
      if (normalizedModel && (key.includes(normalizedModel) || normalizedModel.includes(profile.model.toLowerCase()))) {
        return profile;
      }
    }
  }

  // 2. Vendor-level default profile
  const vendorProfiles = Object.values(DEVICE_COMPATIBILITY_CATALOG).filter(
    p => p.vendor.toLowerCase() === normalizedVendor
  );
  if (vendorProfiles.length > 0) {
    return vendorProfiles[0];
  }

  // 3. Fallback to generic TCP
  return DEVICE_COMPATIBILITY_CATALOG['generic_tcp_terminal'];
}
