// supabase/functions/face-attend-verify/policy.ts
// Pure deterministic decision & commercial calculation engine for JOY FaceAttend.
// Shared by the Deno Edge Function and Node/Vitest unit & integration tests.

export type FaceAttendDecision =
  | 'MATCH'
  | 'NO_MATCH'
  | 'LOW_CONFIDENCE'
  | 'LIVENESS_FAILED'
  | 'IMAGE_QUALITY_FAILED'
  | 'TEMPLATE_NOT_AVAILABLE'
  | 'PROVIDER_UNAVAILABLE'
  | 'CONSENT_REQUIRED'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'MODULE_DISABLED'
  | 'GEOFENCE_FAILED';

export type GeofenceMode = 'REQUIRED' | 'OPTIONAL' | 'WARN_ONLY';
export type ProviderPreference =
  | 'AUTO'
  | 'AWS_REKOGNITION'
  | 'AZURE_FACE'
  | 'HTTP_WEBHOOK'
  | 'SANDBOX_CHALLENGE';

export interface FaceAttendPolicyConfig {
  policy_version: number;
  module_enabled: boolean;
  face_verification_enabled: boolean;
  liveness_enabled: boolean;
  gps_verification_enabled: boolean;
  geofence_mode: GeofenceMode;
  require_face_on_checkin: boolean;
  require_face_on_checkout: boolean;
  offline_queue_enabled: boolean;
  manual_fallback_enabled: boolean;
  self_enrolment_requires_approval: boolean;
  match_threshold: number;
  liveness_threshold: number;
  max_gps_accuracy_meters: number;
  gps_freshness_seconds: number;
  retention_days_images: number;
  consent_version_required: string;
  provider_preference: ProviderPreference;
  allow_non_face_fallback_on_provider_outage: boolean;
}

export const DEFAULT_FACEATTEND_POLICY: FaceAttendPolicyConfig = {
  policy_version: 1,
  module_enabled: true,
  face_verification_enabled: true,
  liveness_enabled: true,
  gps_verification_enabled: true,
  geofence_mode: 'REQUIRED',
  require_face_on_checkin: true,
  require_face_on_checkout: true,
  offline_queue_enabled: false,
  manual_fallback_enabled: true,
  self_enrolment_requires_approval: false,
  match_threshold: 88.0,
  liveness_threshold: 80.0,
  max_gps_accuracy_meters: 80.0,
  gps_freshness_seconds: 60,
  retention_days_images: 90,
  consent_version_required: 'v1.0',
  provider_preference: 'AUTO',
  allow_non_face_fallback_on_provider_outage: true,
};

export interface WorkLocationCandidate {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
}

export interface GpsVerificationInput {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  accuracyMeters: number | null | undefined;
  capturedAtIso: string | null | undefined;
  nowIso: string;
  isMockLocation: boolean;
  locations: WorkLocationCandidate[];
}

export interface GpsVerificationResult {
  passed: boolean;
  decisionIfFailed: FaceAttendDecision | null;
  reason: string | null;
  matchedLocationId: string | null;
  matchedLocationName: string | null;
  distanceMeters: number | null;
  insideGeofence: boolean;
  deviceRiskFlags: string[];
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function evaluateGpsAndGeofence(
  input: GpsVerificationInput,
  policy: Pick<
    FaceAttendPolicyConfig,
    'gps_verification_enabled' | 'geofence_mode' | 'max_gps_accuracy_meters' | 'gps_freshness_seconds'
  >
): GpsVerificationResult {
  const riskFlags: string[] = [];

  if (!policy.gps_verification_enabled) {
    return {
      passed: true,
      decisionIfFailed: null,
      reason: null,
      matchedLocationId: null,
      matchedLocationName: null,
      distanceMeters: null,
      insideGeofence: true,
      deviceRiskFlags: riskFlags,
    };
  }

  if (input.isMockLocation) {
    riskFlags.push('MOCK_GPS_DETECTED');
    return {
      passed: false,
      decisionIfFailed: 'GEOFENCE_FAILED',
      reason: 'Mock or spoofed GPS coordinates detected. Attendance blocked.',
      matchedLocationId: null,
      matchedLocationName: null,
      distanceMeters: null,
      insideGeofence: false,
      deviceRiskFlags: riskFlags,
    };
  }

  if (
    input.latitude == null ||
    input.longitude == null ||
    Number.isNaN(input.latitude) ||
    Number.isNaN(input.longitude)
  ) {
    riskFlags.push('GPS_MISSING');
    if (policy.geofence_mode === 'REQUIRED') {
      return {
        passed: false,
        decisionIfFailed: 'GEOFENCE_FAILED',
        reason: 'Valid GPS coordinates are required for this attendance policy.',
        matchedLocationId: null,
        matchedLocationName: null,
        distanceMeters: null,
        insideGeofence: false,
        deviceRiskFlags: riskFlags,
      };
    }
    return {
      passed: true,
      decisionIfFailed: null,
      reason: 'GPS coordinates unavailable; allowed under non-strict geofence policy.',
      matchedLocationId: null,
      matchedLocationName: null,
      distanceMeters: null,
      insideGeofence: false,
      deviceRiskFlags: riskFlags,
    };
  }

  // Freshness check
  if (input.capturedAtIso) {
    const capturedMs = new Date(input.capturedAtIso).getTime();
    const nowMs = new Date(input.nowIso).getTime();
    if (!Number.isNaN(capturedMs) && !Number.isNaN(nowMs)) {
      const ageSec = (nowMs - capturedMs) / 1000;
      if (ageSec > policy.gps_freshness_seconds || ageSec < -30) {
        riskFlags.push('STALE_GPS_FIX');
        if (policy.geofence_mode === 'REQUIRED') {
          return {
            passed: false,
            decisionIfFailed: 'GEOFENCE_FAILED',
            reason: `GPS fix is stale (${Math.round(ageSec)}s old; max allowed ${policy.gps_freshness_seconds}s).`,
            matchedLocationId: null,
            matchedLocationName: null,
            distanceMeters: null,
            insideGeofence: false,
            deviceRiskFlags: riskFlags,
          };
        }
      }
    }
  }

  // Accuracy check
  if (
    input.accuracyMeters != null &&
    input.accuracyMeters > policy.max_gps_accuracy_meters
  ) {
    riskFlags.push('LOW_GPS_ACCURACY');
    if (policy.geofence_mode === 'REQUIRED') {
      return {
        passed: false,
        decisionIfFailed: 'GEOFENCE_FAILED',
        reason: `GPS accuracy (${Math.round(input.accuracyMeters)}m) exceeds maximum threshold (${policy.max_gps_accuracy_meters}m).`,
        matchedLocationId: null,
        matchedLocationName: null,
        distanceMeters: null,
        insideGeofence: false,
        deviceRiskFlags: riskFlags,
      };
    }
  }

  const validLocations = input.locations.filter(
    (loc) => loc.latitude != null && loc.longitude != null
  );

  if (validLocations.length === 0) {
    riskFlags.push('NO_ASSIGNED_GEOFENCE');
    if (policy.geofence_mode === 'REQUIRED') {
      return {
        passed: false,
        decisionIfFailed: 'GEOFENCE_FAILED',
        reason: 'No assigned active work locations with GPS coordinates found.',
        matchedLocationId: null,
        matchedLocationName: null,
        distanceMeters: null,
        insideGeofence: false,
        deviceRiskFlags: riskFlags,
      };
    }
    return {
      passed: true,
      decisionIfFailed: null,
      reason: 'No assigned geofence; permitted by optional policy.',
      matchedLocationId: null,
      matchedLocationName: null,
      distanceMeters: null,
      insideGeofence: false,
      deviceRiskFlags: riskFlags,
    };
  }

  let nearestLoc: WorkLocationCandidate | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  let matchedLoc: WorkLocationCandidate | null = null;
  let matchedDist = Number.POSITIVE_INFINITY;

  for (const loc of validLocations) {
    const dist = haversineDistanceMeters(
      input.latitude,
      input.longitude,
      Number(loc.latitude),
      Number(loc.longitude)
    );
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestLoc = loc;
    }
    const radius = loc.geofence_radius_meters || 100;
    if (dist <= radius && dist < matchedDist) {
      matchedDist = dist;
      matchedLoc = loc;
    }
  }

  if (matchedLoc) {
    return {
      passed: true,
      decisionIfFailed: null,
      reason: null,
      matchedLocationId: matchedLoc.id,
      matchedLocationName: matchedLoc.name,
      distanceMeters: matchedDist,
      insideGeofence: true,
      deviceRiskFlags: riskFlags,
    };
  }

  riskFlags.push('OUTSIDE_GEOFENCE');
  if (policy.geofence_mode === 'REQUIRED') {
    return {
      passed: false,
      decisionIfFailed: 'GEOFENCE_FAILED',
      reason: `Outside assigned geofence. Nearest site: ${nearestLoc?.name ?? 'Unknown'} (${Math.round(nearestDist)}m away).`,
      matchedLocationId: nearestLoc?.id ?? null,
      matchedLocationName: nearestLoc?.name ?? null,
      distanceMeters: nearestDist,
      insideGeofence: false,
      deviceRiskFlags: riskFlags,
    };
  }

  return {
    passed: true,
    decisionIfFailed: null,
    reason: `Outside geofence (${Math.round(nearestDist)}m from ${nearestLoc?.name ?? 'site'}); flagged as warning only.`,
    matchedLocationId: nearestLoc?.id ?? null,
    matchedLocationName: nearestLoc?.name ?? null,
    distanceMeters: nearestDist,
    insideGeofence: false,
    deviceRiskFlags: riskFlags,
  };
}

export interface BiometricEvaluationInput {
  entitlementEnabled: boolean;
  subscriptionStatus: string | null;
  hasActiveConsent: boolean;
  templateStatus: string | null;
  punchType: 'CHECK_IN' | 'CHECK_OUT';
  policy: FaceAttendPolicyConfig;
  challengeValid: boolean;
  challengeExpiredOrUsed: boolean;
  imageQualityOk: boolean;
  imageQualityReason?: string | null;
  livenessPassed: boolean;
  livenessScore: number | null;
  faceSimilarityScore: number | null;
  providerAvailable: boolean;
  gpsResult: GpsVerificationResult;
}

export interface CombinedVerificationDecision {
  decision: FaceAttendDecision;
  allowPunchCommit: boolean;
  canOfferManualFallback: boolean;
  reason: string;
}

export function evaluateCombinedAttendanceDecision(
  input: BiometricEvaluationInput
): CombinedVerificationDecision {
  if (!input.entitlementEnabled || !input.policy.module_enabled) {
    return {
      decision: 'MODULE_DISABLED',
      allowPunchCommit: false,
      canOfferManualFallback: false,
      reason: 'JOY FaceAttend is disabled for this organization.',
    };
  }

  if (
    input.subscriptionStatus &&
    ['SUSPENDED', 'CANCELLED', 'EXPIRED'].includes(input.subscriptionStatus)
  ) {
    return {
      decision: 'MODULE_DISABLED',
      allowPunchCommit: false,
      canOfferManualFallback: false,
      reason: `FaceAttend subscription is ${input.subscriptionStatus}.`,
    };
  }

  // Evaluate whether face verification is required for this punch type
  const requireFace =
    input.policy.face_verification_enabled &&
    (input.punchType === 'CHECK_IN'
      ? input.policy.require_face_on_checkin
      : input.policy.require_face_on_checkout);

  if (!input.hasActiveConsent && requireFace) {
    return {
      decision: 'CONSENT_REQUIRED',
      allowPunchCommit: false,
      canOfferManualFallback: input.policy.manual_fallback_enabled,
      reason: `Biometric consent (${input.policy.consent_version_required}) is required before FaceAttend capture.`,
    };
  }

  if (requireFace && input.templateStatus !== 'ACTIVE') {
    return {
      decision: 'TEMPLATE_NOT_AVAILABLE',
      allowPunchCommit: false,
      canOfferManualFallback: input.policy.manual_fallback_enabled,
      reason:
        input.templateStatus === 'PENDING_APPROVAL'
          ? 'Your face enrolment is awaiting HR approval.'
          : 'No active approved face template found for your profile.',
    };
  }

  // Check GPS & Geofence independently
  if (!input.gpsResult.passed) {
    return {
      decision: input.gpsResult.decisionIfFailed ?? 'GEOFENCE_FAILED',
      allowPunchCommit: false,
      canOfferManualFallback: input.policy.manual_fallback_enabled,
      reason: input.gpsResult.reason ?? 'Location/geofence verification failed.',
    };
  }

  if (!requireFace) {
    return {
      decision: 'MATCH',
      allowPunchCommit: true,
      canOfferManualFallback: false,
      reason: 'GPS verified; face check not required by tenant policy for this punch type.',
    };
  }

  // Provider outage handling — NEVER silently fabricate a match
  if (!input.providerAvailable) {
    return {
      decision: 'PROVIDER_UNAVAILABLE',
      allowPunchCommit: false,
      canOfferManualFallback:
        input.policy.manual_fallback_enabled && input.policy.allow_non_face_fallback_on_provider_outage,
      reason: 'Biometric verification provider is currently unavailable. Please use manual review fallback.',
    };
  }

  if (!input.imageQualityOk) {
    return {
      decision: 'IMAGE_QUALITY_FAILED',
      allowPunchCommit: false,
      canOfferManualFallback: input.policy.manual_fallback_enabled,
      reason: input.imageQualityReason || 'Captured image quality is too blurry or dark. Please retry.',
    };
  }

  // Server-side Liveness & Anti-Spoof check
  if (input.policy.liveness_enabled) {
    if (!input.challengeValid || input.challengeExpiredOrUsed) {
      return {
        decision: 'LIVENESS_FAILED',
        allowPunchCommit: false,
        canOfferManualFallback: input.policy.manual_fallback_enabled,
        reason: 'Liveness challenge expired or already consumed (replay blocked).',
      };
    }

    if (
      !input.livenessPassed ||
      input.livenessScore == null ||
      input.livenessScore < input.policy.liveness_threshold
    ) {
      return {
        decision: 'LIVENESS_FAILED',
        allowPunchCommit: false,
        canOfferManualFallback: input.policy.manual_fallback_enabled,
        reason: `Liveness check failed (score ${input.livenessScore ?? 0} < ${input.policy.liveness_threshold}).`,
      };
    }
  }

  // 1:1 Face Match threshold discrimination: NO_MATCH vs LOW_CONFIDENCE vs MATCH
  const sim = input.faceSimilarityScore;
  if (sim == null) {
    return {
      decision: 'PROVIDER_UNAVAILABLE',
      allowPunchCommit: false,
      canOfferManualFallback: input.policy.manual_fallback_enabled,
      reason: 'Provider returned no similarity score.',
    };
  }

  if (sim >= input.policy.match_threshold) {
    return {
      decision: 'MATCH',
      allowPunchCommit: true,
      canOfferManualFallback: false,
      reason: 'Face 1:1 match, liveness, and location checks passed.',
    };
  }

  const lowConfidenceFloor = Math.max(50, input.policy.match_threshold - 20);
  if (sim >= lowConfidenceFloor) {
    return {
      decision: 'LOW_CONFIDENCE',
      allowPunchCommit: false,
      canOfferManualFallback: input.policy.manual_fallback_enabled,
      reason: `Face confidence (${sim.toFixed(1)}%) below threshold (${input.policy.match_threshold}%). Retry in better lighting or request manual review.`,
    };
  }

  return {
    decision: 'NO_MATCH',
    allowPunchCommit: false,
    canOfferManualFallback: input.policy.manual_fallback_enabled,
    reason: `1:1 face verification mismatch (score ${sim.toFixed(1)}%). Attendance not marked.`,
  };
}

export interface BillingComputationInput {
  pricePerEmployee: number;
  minimumMonthlyFee: number;
  setupFee: number;
  usageFeePerCall: number;
  activeEnrolledEmployees: number;
  verifiedChecksCount: number;
  failedChecksCount: number;
  billingCycle: 'MONTHLY' | 'ANNUAL';
}

export interface BillingComputationResult {
  employeeBaseCharge: number;
  effectiveMinimumApplied: number;
  usageCharges: number;
  setupFee: number;
  subtotal: number;
}

export function computeFaceAttendBillingAmount(
  input: BillingComputationInput
): BillingComputationResult {
  const rawEmployeeTotal =
    Math.max(0, input.activeEnrolledEmployees) * Math.max(0, input.pricePerEmployee);
  const multiplier = input.billingCycle === 'ANNUAL' ? 12 : 1;
  const effectiveBase = Math.max(input.minimumMonthlyFee * multiplier, rawEmployeeTotal * multiplier);
  const totalCalls = Math.max(0, input.verifiedChecksCount) + Math.max(0, input.failedChecksCount);
  const usageCharges = Math.round(totalCalls * Math.max(0, input.usageFeePerCall) * 100) / 100;
  const setupFee = Math.round(Math.max(0, input.setupFee) * 100) / 100;
  const subtotal = Math.round((effectiveBase + setupFee + usageCharges) * 100) / 100;

  return {
    employeeBaseCharge: Math.round(rawEmployeeTotal * multiplier * 100) / 100,
    effectiveMinimumApplied: Math.round(effectiveBase * 100) / 100,
    usageCharges,
    setupFee,
    subtotal,
  };
}

