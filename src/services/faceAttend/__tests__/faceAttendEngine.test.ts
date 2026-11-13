// src/services/faceAttend/__tests__/faceAttendEngine.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_FACEATTEND_POLICY,
  computeFaceAttendBillingAmount,
  evaluateCombinedAttendanceDecision,
  evaluateGpsAndGeofence,
  haversineDistanceMeters,
  type FaceAttendPolicyConfig,
  type WorkLocationCandidate,
} from '../../../../supabase/functions/face-attend-verify/policy';
import { resolveFaceVerificationProvider } from '../../../../supabase/functions/face-attend-verify/providers';

const SAMPLE_OFFICE: WorkLocationCandidate = {
  id: 'loc-factory-1',
  name: 'Coimbatore Apparel Unit 1',
  latitude: 11.0168,
  longitude: 76.9558,
  geofence_radius_meters: 150,
};

function validGpsResult(policy: FaceAttendPolicyConfig = DEFAULT_FACEATTEND_POLICY) {
  return evaluateGpsAndGeofence(
    {
      latitude: 11.0169,
      longitude: 76.9559,
      accuracyMeters: 15,
      capturedAtIso: '2026-11-12T09:00:00.000Z',
      nowIso: '2026-11-12T09:00:10.000Z',
      isMockLocation: false,
      locations: [SAMPLE_OFFICE],
    },
    policy
  );
}

describe('JOY FaceAttend — Core 1:1 Face, Liveness, GPS & SaaS Verification Engine', () => {
  describe('A. 1:1 Face Verification Decisions', () => {
    it('passes MATCH when entitlement, consent, template, GPS, liveness, and similarity all satisfy policy', () => {
      const gps = validGpsResult();
      const res = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: true,
        livenessScore: 95,
        faceSimilarityScore: 93.4,
        providerAvailable: true,
        gpsResult: gps,
      });
      expect(res.decision).toBe('MATCH');
      expect(res.allowPunchCommit).toBe(true);
    });

    it('rejects different person with NO_MATCH and never commits attendance', () => {
      const res = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: true,
        livenessScore: 94,
        faceSimilarityScore: 34.2,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(res.decision).toBe('NO_MATCH');
      expect(res.allowPunchCommit).toBe(false);
      expect(res.canOfferManualFallback).toBe(true);
    });

    it('discriminates borderline confidence into LOW_CONFIDENCE', () => {
      const res = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: true,
        livenessScore: 92,
        faceSimilarityScore: 76.0,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(res.decision).toBe('LOW_CONFIDENCE');
      expect(res.allowPunchCommit).toBe(false);
    });

    it('returns IMAGE_QUALITY_FAILED on blurry/dark image capture', () => {
      const res = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: false,
        imageQualityReason: 'Image too dark',
        livenessPassed: false,
        livenessScore: 0,
        faceSimilarityScore: null,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(res.decision).toBe('IMAGE_QUALITY_FAILED');
      expect(res.allowPunchCommit).toBe(false);
    });

    it('blocks when template missing or awaiting approval (TEMPLATE_NOT_AVAILABLE) or consent missing (CONSENT_REQUIRED)', () => {
      const noTpl = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: null,
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: true,
        livenessScore: 90,
        faceSimilarityScore: 90,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(noTpl.decision).toBe('TEMPLATE_NOT_AVAILABLE');
      expect(noTpl.allowPunchCommit).toBe(false);

      const pendingTpl = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: 'PENDING_APPROVAL',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: true,
        livenessScore: 90,
        faceSimilarityScore: 90,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(pendingTpl.decision).toBe('TEMPLATE_NOT_AVAILABLE');

      const noConsent = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: false,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: true,
        livenessScore: 90,
        faceSimilarityScore: 90,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(noConsent.decision).toBe('CONSENT_REQUIRED');
      expect(noConsent.allowPunchCommit).toBe(false);
    });

    it('returns PROVIDER_UNAVAILABLE and offers manual fallback when biometric provider is down', () => {
      const res = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: false,
        livenessScore: null,
        faceSimilarityScore: null,
        providerAvailable: false,
        gpsResult: validGpsResult(),
      });
      expect(res.decision).toBe('PROVIDER_UNAVAILABLE');
      expect(res.allowPunchCommit).toBe(false);
      expect(res.canOfferManualFallback).toBe(true);
    });
  });

  describe('B. Liveness & Anti-Spoof / Replay Resistance', () => {
    it('blocks reused or expired server challenge nonce even if face similarity is high', () => {
      const replay = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: false,
        challengeExpiredOrUsed: true,
        imageQualityOk: true,
        livenessPassed: true,
        livenessScore: 99,
        faceSimilarityScore: 99,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(replay.decision).toBe('LIVENESS_FAILED');
      expect(replay.allowPunchCommit).toBe(false);
    });

    it('blocks low liveness score or spoof attempt even when similarity matches threshold', () => {
      const spoof = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_OUT',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: false,
        livenessScore: 42,
        faceSimilarityScore: 96,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(spoof.decision).toBe('LIVENESS_FAILED');
      expect(spoof.allowPunchCommit).toBe(false);
    });

    it('sandbox provider honestly marks isProductionBiometric=false and rejects static photo missing blink/head turn', async () => {
      const provider = resolveFaceVerificationProvider('SANDBOX_CHALLENGE');
      expect(provider.isProductionBiometric).toBe(false);

      const largeDummyBase64 = Buffer.alloc(3000, 65).toString('base64');
      const staticAttempt = await provider.verify({
        organizationId: 'org-1',
        employeeId: 'emp-1',
        liveImageBase64: largeDummyBase64,
        enrolledImageBase64: largeDummyBase64,
        challengeNonce: 'nonce-1',
        livenessEnabled: true,
        challengeSignals: {
          blinkDetected: false,
          headMovementDetected: false,
          frameCount: 1,
          captureDurationMs: 120,
          faceDetectedCount: 1,
        },
      });
      expect(staticAttempt.livenessPassed).toBe(false);
      expect(staticAttempt.livenessScore).toBeLessThan(80);
    });
  });

  describe('C. GPS & Geofence Validation', () => {
    it('computes accurate Haversine distance and approves inside site radius', () => {
      const dist = haversineDistanceMeters(11.0168, 76.9558, 11.0169, 76.9559);
      expect(dist).toBeLessThan(30);
      const gps = validGpsResult();
      expect(gps.passed).toBe(true);
      expect(gps.insideGeofence).toBe(true);
      expect(gps.matchedLocationId).toBe(SAMPLE_OFFICE.id);
    });

    it('blocks outside geofence under REQUIRED, flags as warning under WARN_ONLY', () => {
      const outsideRequired = evaluateGpsAndGeofence(
        {
          latitude: 11.03,
          longitude: 76.97,
          accuracyMeters: 12,
          capturedAtIso: '2026-11-12T09:00:00.000Z',
          nowIso: '2026-11-12T09:00:05.000Z',
          isMockLocation: false,
          locations: [SAMPLE_OFFICE],
        },
        DEFAULT_FACEATTEND_POLICY
      );
      expect(outsideRequired.passed).toBe(false);
      expect(outsideRequired.decisionIfFailed).toBe('GEOFENCE_FAILED');

      const outsideWarnOnly = evaluateGpsAndGeofence(
        {
          latitude: 11.03,
          longitude: 76.97,
          accuracyMeters: 12,
          capturedAtIso: '2026-11-12T09:00:00.000Z',
          nowIso: '2026-11-12T09:00:05.000Z',
          isMockLocation: false,
          locations: [SAMPLE_OFFICE],
        },
        { ...DEFAULT_FACEATTEND_POLICY, geofence_mode: 'WARN_ONLY' }
      );
      expect(outsideWarnOnly.passed).toBe(true);
      expect(outsideWarnOnly.insideGeofence).toBe(false);
      expect(outsideWarnOnly.deviceRiskFlags).toContain('OUTSIDE_GEOFENCE');
    });

    it('rejects mock GPS locations, poor accuracy, and stale GPS captures', () => {
      const mocked = evaluateGpsAndGeofence(
        {
          latitude: 11.0168,
          longitude: 76.9558,
          accuracyMeters: 5,
          capturedAtIso: '2026-11-12T09:00:00.000Z',
          nowIso: '2026-11-12T09:00:02.000Z',
          isMockLocation: true,
          locations: [SAMPLE_OFFICE],
        },
        DEFAULT_FACEATTEND_POLICY
      );
      expect(mocked.passed).toBe(false);
      expect(mocked.deviceRiskFlags).toContain('MOCK_GPS_DETECTED');

      const poorAccuracy = evaluateGpsAndGeofence(
        {
          latitude: 11.0168,
          longitude: 76.9558,
          accuracyMeters: 250,
          capturedAtIso: '2026-11-12T09:00:00.000Z',
          nowIso: '2026-11-12T09:00:02.000Z',
          isMockLocation: false,
          locations: [SAMPLE_OFFICE],
        },
        DEFAULT_FACEATTEND_POLICY
      );
      expect(poorAccuracy.passed).toBe(false);
      expect(poorAccuracy.deviceRiskFlags).toContain('LOW_GPS_ACCURACY');

      const staleFix = evaluateGpsAndGeofence(
        {
          latitude: 11.0168,
          longitude: 76.9558,
          accuracyMeters: 10,
          capturedAtIso: '2026-11-12T08:50:00.000Z',
          nowIso: '2026-11-12T09:00:00.000Z',
          isMockLocation: false,
          locations: [SAMPLE_OFFICE],
        },
        DEFAULT_FACEATTEND_POLICY
      );
      expect(staleFix.passed).toBe(false);
      expect(staleFix.deviceRiskFlags).toContain('STALE_GPS_FIX');
    });
  });

  describe('D. SaaS Entitlement, Plan Controls & Commercial Billing Calculations', () => {
    it('immediately blocks when tenant entitlement or subscription is disabled/suspended', () => {
      const disabledEnt = evaluateCombinedAttendanceDecision({
        entitlementEnabled: false,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: true,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: true,
        livenessScore: 99,
        faceSimilarityScore: 99,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(disabledEnt.decision).toBe('MODULE_DISABLED');
      expect(disabledEnt.allowPunchCommit).toBe(false);

      const suspendedSub = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'SUSPENDED',
        hasActiveConsent: true,
        templateStatus: 'ACTIVE',
        punchType: 'CHECK_IN',
        policy: DEFAULT_FACEATTEND_POLICY,
        challengeValid: true,
        challengeExpiredOrUsed: false,
        imageQualityOk: true,
        livenessPassed: true,
        livenessScore: 99,
        faceSimilarityScore: 99,
        providerAvailable: true,
        gpsResult: validGpsResult(),
      });
      expect(suspendedSub.decision).toBe('MODULE_DISABLED');
      expect(suspendedSub.allowPunchCommit).toBe(false);
    });

    it('computes Basic ₹15, Pro ₹25, Minimum Monthly Fee, and Usage Fee billing snapshots accurately', () => {
      const basic = computeFaceAttendBillingAmount({
        pricePerEmployee: 15,
        minimumMonthlyFee: 0,
        setupFee: 0,
        usageFeePerCall: 0,
        activeEnrolledEmployees: 120,
        verifiedChecksCount: 4000,
        failedChecksCount: 50,
        billingCycle: 'MONTHLY',
      });
      expect(basic.subtotal).toBe(1800);

      const proWithMinAndUsage = computeFaceAttendBillingAmount({
        pricePerEmployee: 25,
        minimumMonthlyFee: 1000,
        setupFee: 500,
        usageFeePerCall: 0.1,
        activeEnrolledEmployees: 20, // 20 * 25 = 500 < 1000 minimum
        verifiedChecksCount: 800,
        failedChecksCount: 200, // 1000 calls * 0.1 = 100
        billingCycle: 'MONTHLY',
      });
      expect(proWithMinAndUsage.employeeBaseCharge).toBe(500);
      expect(proWithMinAndUsage.effectiveMinimumApplied).toBe(1000);
      expect(proWithMinAndUsage.usageCharges).toBe(100);
      expect(proWithMinAndUsage.setupFee).toBe(500);
      expect(proWithMinAndUsage.subtotal).toBe(1600);
    });

    it('allows check-out without face capture if tenant configures require_face_on_checkout=false', () => {
      const gps = validGpsResult();
      const res = evaluateCombinedAttendanceDecision({
        entitlementEnabled: true,
        subscriptionStatus: 'ACTIVE',
        hasActiveConsent: false,
        templateStatus: null,
        punchType: 'CHECK_OUT',
        policy: { ...DEFAULT_FACEATTEND_POLICY, require_face_on_checkout: false },
        challengeValid: false,
        challengeExpiredOrUsed: false,
        imageQualityOk: false,
        livenessPassed: false,
        livenessScore: null,
        faceSimilarityScore: null,
        providerAvailable: false,
        gpsResult: gps,
      });
      expect(res.decision).toBe('MATCH');
      expect(res.allowPunchCommit).toBe(true);
    });
  });

  describe('E. SQL Migration, Private Storage & Auth Standards Structural Verification', () => {
    it('enforces immutable billing snapshots, private bucket, RLS, advisory lock, and @supabase/server@1 auth', () => {
      const migrationSql = fs.readFileSync(
        path.resolve('supabase/migrations/20261112_175_joy_faceattend_saas_module.sql'),
        'utf8'
      );
      expect(migrationSql).toContain("'faceattend-private'");
      expect(migrationSql).toContain('false,'); // public = false
      expect(migrationSql).toContain('fn_guard_faceattend_billing_snapshot_immutable');
      expect(migrationSql).toContain('ENABLE ROW LEVEL SECURITY');
      expect(migrationSql).toContain('pg_advisory_xact_lock');
      expect(migrationSql).toContain('verification_mode');
      expect(migrationSql).toContain("'Face'");
      expect(migrationSql).toContain("'JOY_FACEATTEND'");

      const edgeFn = fs.readFileSync(
        path.resolve('supabase/functions/face-attend-verify/index.ts'),
        'utf8'
      );
      expect(edgeFn).toContain("npm:@supabase/server@1");
      expect(edgeFn).toContain("withSupabase({ auth: 'user'");
      expect(edgeFn).toContain("fn_commit_faceattend_punch");
      expect(edgeFn).toContain("idempotent_replay");
    });
  });
});
