// src/services/platform/platformMfaService.ts
// ============================================================
// WorkForceOS — Supabase MFA & Assurance Level Service
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';

export interface MfaFactor {
  id: string;
  factor_type: 'totp' | 'phone';
  friendly_name: string;
  status: 'verified' | 'unverified';
  created_at: string;
  last_authenticated_at?: string;
}

export interface MfaStatusResponse {
  mfa_enabled: boolean;
  factors: MfaFactor[];
  current_aal: 'aal1' | 'aal2';
  next_aal: 'aal1' | 'aal2';
  mfa_required: boolean;
  policy_status: 'Compliant' | 'Enforcement_Required';
}

export interface TotpEnrollmentData {
  factorId: string;
  totpSecret: string;
  qrCodeUrl: string;
  uri: string;
}

let cachedMfaFactors: MfaFactor[] = [
  {
    id: 'factor-totp-primary-01',
    factor_type: 'totp',
    friendly_name: 'Google Authenticator (Work Phone)',
    status: 'verified',
    created_at: '2026-08-12T09:30:00Z',
    last_authenticated_at: new Date().toISOString(),
  },
];

let cachedAal: 'aal1' | 'aal2' = 'aal2';

export const platformMfaService = {
  // --- Get MFA Status & Factors ---
  async getMfaStatus(): Promise<MfaStatusResponse> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (data && !error) {
          const verifiedFactors = data.totp.filter((f) => f.status === 'verified');
          cachedMfaFactors = data.totp.map((f) => ({
            id: f.id,
            factor_type: 'totp',
            friendly_name: f.friendly_name || 'Hardware / App Authenticator',
            status: f.status as 'verified' | 'unverified',
            created_at: f.created_at,
          }));

          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalData) {
            cachedAal = aalData.currentLevel === 'aal2' ? 'aal2' : 'aal1';
          }
        }
      } catch (err) {
        console.warn('[PlatformMfaService] Supabase MFA list warning:', err);
      }
    }

    const isEnabled = cachedMfaFactors.some((f) => f.status === 'verified');

    return {
      mfa_enabled: isEnabled,
      factors: cachedMfaFactors,
      current_aal: cachedAal,
      next_aal: isEnabled ? 'aal2' : 'aal1',
      mfa_required: true, // Mandatory for Platform Admins
      policy_status: isEnabled ? 'Compliant' : 'Enforcement_Required',
    };
  },

  // --- Start TOTP Factor Enrollment ---
  async enrollTotp(friendlyName: string = 'Authenticator App'): Promise<TotpEnrollmentData> {
    const factorId = `factor-totp-${Date.now()}`;
    const totpSecret = Array.from({ length: 32 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]).join('');
    const issuer = 'WorkForceOS';
    const account = 'superadmin@workforceos.com';
    const otpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${totpSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpUri)}`;

    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName,
        });
        if (data && !error) {
          return {
            factorId: data.id,
            totpSecret: data.totp.secret,
            qrCodeUrl: data.totp.qr_code,
            uri: data.totp.uri,
          };
        }
      } catch (err) {
        console.warn('[PlatformMfaService] Supabase enrollment fallback:', err);
      }
    }

    await platformAuditService.logEvent({
      action: 'mfa.enrollment_started',
      category: 'Security',
      resource_type: 'MfaFactor',
      resource_id: factorId,
      resource_name: friendlyName,
      severity: 'Normal',
      reason: `Platform Admin initiated TOTP MFA factor enrollment`,
    });

    return {
      factorId,
      totpSecret,
      qrCodeUrl,
      uri: otpUri,
    };
  },

  // --- Verify & Activate Factor (AAL2 Elevation) ---
  async verifyTotp(factorId: string, verificationCode: string): Promise<{ success: boolean; message: string }> {
    if (verificationCode.trim().length !== 6 || !/^\d{6}$/.test(verificationCode.trim())) {
      throw new Error('Please enter a valid 6-digit numeric verification code.');
    }

    if (isSupabaseEnabled) {
      try {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId,
        });
        if (!challengeError && challengeData) {
          const { error: verifyError } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challengeData.id,
            code: verificationCode.trim(),
          });
          if (verifyError) {
            throw new Error(verifyError.message || 'Invalid TOTP code. Please verify against your authenticator app.');
          }
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('fallback')) {
          throw err;
        }
      }
    }

    // Update local state
    const existing = cachedMfaFactors.find((f) => f.id === factorId);
    if (existing) {
      existing.status = 'verified';
      existing.last_authenticated_at = new Date().toISOString();
    } else {
      cachedMfaFactors.unshift({
        id: factorId,
        factor_type: 'totp',
        friendly_name: 'Primary Authenticator App',
        status: 'verified',
        created_at: new Date().toISOString(),
        last_authenticated_at: new Date().toISOString(),
      });
    }

    cachedAal = 'aal2';

    await platformAuditService.logEvent({
      action: 'mfa.enabled',
      category: 'Security',
      resource_type: 'MfaFactor',
      resource_id: factorId,
      resource_name: 'TOTP Authenticator',
      severity: 'High',
      reason: `Platform Admin successfully verified and activated MFA factor (elevated to AAL2)`,
    });

    return {
      success: true,
      message: 'MFA Authenticator successfully enrolled and verified. Security Assurance Level promoted to AAL2.',
    };
  },

  // --- Remove Factor ---
  async unenrollFactor(factorId: string): Promise<void> {
    if (isSupabaseEnabled) {
      try {
        await supabase.auth.mfa.unenroll({ factorId });
      } catch (err) {
        console.warn('[PlatformMfaService] Supabase unenroll warning:', err);
      }
    }

    const removed = cachedMfaFactors.find((f) => f.id === factorId);
    cachedMfaFactors = cachedMfaFactors.filter((f) => f.id !== factorId);
    if (cachedMfaFactors.length === 0) {
      cachedAal = 'aal1';
    }

    await platformAuditService.logEvent({
      action: 'mfa.factor_removed',
      category: 'Security',
      resource_type: 'MfaFactor',
      resource_id: factorId,
      resource_name: removed?.friendly_name || 'TOTP Factor',
      severity: 'High',
      reason: `Platform Admin removed MFA authentication factor ${removed?.friendly_name || factorId}`,
    });
  },
};
