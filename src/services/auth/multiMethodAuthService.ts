import { supabase } from '../../lib/supabase';
import type {
  AuthMethodConfig,
  AuthSecurityAuditSummary,
  LoginMethod,
  MultiMethodAuthResponse,
  PublicLoginConfigResponse,
} from '../../types/multiMethodAuth';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function gatewayUrl(): string {
  return `${SUPABASE_URL}/functions/v1/auth-gateway`;
}

async function callGatewayPublic<T = MultiMethodAuthResponse>(
  payload: Record<string, unknown>
): Promise<T> {
  const res = await fetch(gatewayUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ ...payload, devicePlatform: 'web' }),
  });

  const data = await res.json().catch(() => ({
    ok: false,
    message: `Authentication server returned status ${res.status}`,
  }));
  return data as T;
}

async function callGatewayAuthed<T = Record<string, any>>(
  payload: Record<string, unknown>
): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return {
      ok: false,
      code: 'UNAUTHORIZED',
      message: 'Please sign in to perform this action.',
    } as T;
  }

  const res = await fetch(gatewayUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...payload, devicePlatform: 'web' }),
  });

  const data = await res.json().catch(() => ({
    ok: false,
    message: `Server returned status ${res.status}`,
  }));
  return data as T;
}

export const multiMethodAuthService = {
  async warmUp(): Promise<void> {
    try {
      await fetch(gatewayUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({ action: 'warmup', devicePlatform: 'web' }),
      });
    } catch {
      // Non-blocking pre-warm
    }
  },

  async getPublicLoginConfig(
    organizationId?: string | null
  ): Promise<PublicLoginConfigResponse> {
    try {
      const res = await callGatewayPublic<PublicLoginConfigResponse>({
        action: 'get_login_config',
        organizationId: organizationId || null,
      });
      if (res && Array.isArray(res.enabledMethods) && res.enabledMethods.length > 0) {
        return res;
      }
    } catch {
      // Fallback below keeps login usable even on transient network blip
    }

    return {
      ok: true,
      organizationId: organizationId || null,
      organizationName: null,
      enabledMethods: [
        'employee_id_password',
        'mobile_password',
        'mobile_otp',
        'email_password',
      ],
      defaultLoginMethod: 'employee_id_password',
      factoryRecommendedMethod: 'employee_id_password',
      otpProvider: 'airtel_iq',
      otpProviderConfigured: true,
      emailProviderConfigured: true,
      otpExpirySeconds: 300,
      otpResendCooldownSeconds: 30,
      otpMaxAttempts: 5,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecial: false,
      },
      lockoutPolicy: {
        maxFailedAttempts: 5,
        lockoutMinutes: 15,
        trackByIdentifier: true,
      },
      sessionPolicy: {
        webSessionHours: 24,
        mobileSessionDays: 30,
        requireReauthSensitiveActions: true,
      },
      allowedEmployeeGroups: {
        employee_id_password: ['all'],
        mobile_password: ['all'],
        mobile_otp: ['all'],
        email_password: ['all'],
      },
      roleSpecificPolicies: {},
    };
  },

  async loginWithMethodPassword(params: {
    method: Exclude<LoginMethod, 'mobile_otp'>;
    identifier: string;
    password: string;
    countryCode?: string;
    organizationId?: string | null;
    skipSessionHydration?: boolean;
  }): Promise<MultiMethodAuthResponse> {
    const res = await callGatewayPublic<MultiMethodAuthResponse>({
      action: 'login_with_password',
      method: params.method,
      identifier: params.identifier,
      password: params.password,
      countryCode: params.countryCode || '+91',
      organizationId: params.organizationId || null,
    });

    if (res.ok && res.session?.access_token && res.session?.refresh_token && !params.skipSessionHydration) {
      // Establish session only after single company or let UI handle multi-company switch smoothly
      await supabase.auth.setSession({
        access_token: res.session.access_token,
        refresh_token: res.session.refresh_token,
      });
    }

    return res;
  },

  async requestMobileLoginOtp(params: {
    mobile: string;
    countryCode?: string;
    organizationId?: string | null;
  }): Promise<MultiMethodAuthResponse> {
    return callGatewayPublic<MultiMethodAuthResponse>({
      action: 'request_login_otp',
      mobile: params.mobile,
      countryCode: params.countryCode || '+91',
      organizationId: params.organizationId || null,
      purpose: 'login',
    });
  },

  async verifyMobileLoginOtp(params: {
    challengeId: string;
    otp: string;
    skipSessionHydration?: boolean;
  }): Promise<MultiMethodAuthResponse> {
    const res = await callGatewayPublic<MultiMethodAuthResponse>({
      action: 'verify_login_otp',
      challengeId: params.challengeId,
      otp: params.otp,
    });

    if (res.ok && res.session?.access_token && res.session?.refresh_token && !params.skipSessionHydration) {
      await supabase.auth.setSession({
        access_token: res.session.access_token,
        refresh_token: res.session.refresh_token,
      });
    }

    return res;
  },

  async hydrateSession(accessToken: string, refreshToken: string) {
    return supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  },

  async requestPasswordRecovery(params: {
    recoveryMethod: 'email' | 'mobile_otp';
    identifier: string;
    countryCode?: string;
  }): Promise<MultiMethodAuthResponse> {
    return callGatewayPublic<MultiMethodAuthResponse>({
      action: 'request_password_recovery',
      recoveryMethod: params.recoveryMethod,
      identifier: params.identifier,
      countryCode: params.countryCode || '+91',
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
  },

  async verifyRecoveryOtpReset(params: {
    challengeId: string;
    otp: string;
    newPassword: string;
  }): Promise<MultiMethodAuthResponse> {
    return callGatewayPublic<MultiMethodAuthResponse>({
      action: 'verify_recovery_otp_reset',
      challengeId: params.challengeId,
      otp: params.otp,
      newPassword: params.newPassword,
    });
  },

  async getPostLoginContext(): Promise<MultiMethodAuthResponse> {
    return callGatewayAuthed<MultiMethodAuthResponse>({
      action: 'get_post_login_context',
    });
  },

  async switchCompanyContext(organizationId: string): Promise<MultiMethodAuthResponse> {
    return callGatewayAuthed<MultiMethodAuthResponse>({
      action: 'switch_company_context',
      organizationId,
    });
  },

  async saveAuthMethodConfig(
    organizationId: string | null,
    config: Partial<AuthMethodConfig>
  ): Promise<{ ok: boolean; config?: AuthMethodConfig; message?: string }> {
    return callGatewayAuthed({
      action: 'save_auth_config',
      organizationId,
      config,
    });
  },

  async listSecurityAudit(
    organizationId?: string | null,
    limit = 80
  ): Promise<{ ok: boolean; summary?: AuthSecurityAuditSummary; message?: string }> {
    return callGatewayAuthed({
      action: 'list_security_audit',
      organizationId: organizationId || null,
      limit,
    });
  },

  async hrAssistedRecovery(params: {
    organizationId?: string | null;
    recoveryAction: 'unlock' | 'send_reset_link';
    lockoutId?: string;
    targetAuthUserId?: string;
    employeeId?: string;
  }): Promise<{ ok: boolean; message?: string }> {
    return callGatewayAuthed({
      action: 'hr_assisted_recovery',
      ...params,
    });
  },

  async recordSessionEvent(
    eventType: 'logout' | 'session_expired',
    organizationId?: string | null
  ): Promise<void> {
    try {
      await callGatewayAuthed({
        action: 'record_session_event',
        eventType,
        organizationId: organizationId || null,
      });
    } catch {
      // Non-blocking audit event
    }
  },
};

