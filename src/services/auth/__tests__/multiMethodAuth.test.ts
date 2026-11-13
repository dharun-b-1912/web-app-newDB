import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  constantTimeEqual,
  DEFAULT_AUTH_CONFIG_POLICY,
  extractLast10Digits,
  generateSecureOtp,
  getEnabledMethodsList,
  hashOtpCode,
  isAccountBlockedStatus,
  isMethodEnabledByConfig,
  isPendingOnboardingStatus,
  mapDbConfigRowToPolicy,
  maskIdentifier,
  normalizePhoneToE164,
  validateAuthConfigUpdate,
  validatePasswordStrength,
} from '../../../../supabase/functions/auth-gateway/policy';

const { mockSetSession, mockGetSession } = vi.hoisted(() => ({
  mockSetSession: vi.fn(async () => ({ data: { session: {} }, error: null })),
  mockGetSession: vi.fn(async () => ({
    data: { session: { access_token: 'admin-jwt-token' } },
  })),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: mockSetSession,
      getSession: mockGetSession,
    },
  },
}));

import { multiMethodAuthService } from '../multiMethodAuthService';

describe('Multi-Method Auth Policy Engine', () => {
  it('1. normalizes Indian and international mobile numbers to E.164', () => {
    expect(normalizePhoneToE164('9876543210')).toBe('+919876543210');
    expect(normalizePhoneToE164('098765 43210')).toBe('+919876543210');
    expect(normalizePhoneToE164('+91 (987) 654-3210')).toBe('+919876543210');
    expect(normalizePhoneToE164('919876543210')).toBe('+919876543210');
    expect(normalizePhoneToE164('00971501234567')).toBe('+971501234567');
    expect(normalizePhoneToE164('12345')).toBeNull();
  });

  it('2. extracts last 10 digits consistently for matching shared formats', () => {
    expect(extractLast10Digits('+91 98765-43210')).toBe('9876543210');
    expect(extractLast10Digits('09876543210')).toBe('9876543210');
  });

  it('3. masks identifiers without exposing full sensitive data', () => {
    expect(maskIdentifier('email_password', 'marimuthu@joypeoplehr.com')).toBe(
      'ma***@joypeoplehr.com'
    );
    expect(maskIdentifier('mobile_otp', '+919876543210')).toBe('+91******3210');
    expect(maskIdentifier('employee_id_password', 'EMP-101')).toBe('EM***01');
  });

  it('4. blocks disabled, terminated, suspended, resigned, and locked statuses', () => {
    for (const s of ['DISABLED', 'Terminated', 'SUSPENDED', 'RESIGNED', 'locked', 'INACTIVE']) {
      expect(isAccountBlockedStatus(s)).toBe(true);
    }
    expect(isAccountBlockedStatus('ACTIVE')).toBe(false);
    expect(isPendingOnboardingStatus('PENDING_ONBOARDING')).toBe(true);
    expect(isPendingOnboardingStatus('INVITED')).toBe(true);
    expect(isPendingOnboardingStatus('ACTIVE')).toBe(false);
  });

  it('5. hashes and verifies OTP using SHA-256 + timing-safe compare', async () => {
    const otp = generateSecureOtp(6);
    expect(otp).toMatch(/^\d{6}$/);
    const challengeId = '11111111-2222-3333-4444-555555555555';
    const hashA = await hashOtpCode(otp, challengeId, 'test-pepper');
    const hashB = await hashOtpCode(otp, challengeId, 'test-pepper');
    const hashWrong = await hashOtpCode('000000', challengeId, 'test-pepper');

    expect(constantTimeEqual(hashA, hashB)).toBe(true);
    if (otp !== '000000') {
      expect(constantTimeEqual(hashA, hashWrong)).toBe(false);
    }
  });

  it('6. prevents disabling all four authentication methods', () => {
    const res = validateAuthConfigUpdate(
      {
        enableEmployeeIdPassword: false,
        enableMobilePassword: false,
        enableMobileOtp: false,
        enableEmailPassword: false,
      },
      DEFAULT_AUTH_CONFIG_POLICY
    );
    expect(res.valid).toBe(false);
    expect(res.error).toContain('At least one login method must remain enabled');
  });

  it('7. prevents explicitly assigning defaultLoginMethod to a disabled method', () => {
    const res = validateAuthConfigUpdate(
      {
        enableMobileOtp: false,
        defaultLoginMethod: 'mobile_otp',
      },
      DEFAULT_AUTH_CONFIG_POLICY
    );
    expect(res.valid).toBe(false);
    expect(res.error).toContain('cannot be set to a disabled');
  });

  it('8. auto-reconciles defaultLoginMethod when disabling current default without explicit override', () => {
    const res = validateAuthConfigUpdate(
      {
        enableEmployeeIdPassword: false,
      },
      DEFAULT_AUTH_CONFIG_POLICY
    );
    expect(res.valid).toBe(true);
    expect(res.merged?.defaultLoginMethod).toBe('mobile_password');
  });

  it('9. enforces HR toggles, employee groups, and role-specific method restrictions', () => {
    const customConfig = {
      ...DEFAULT_AUTH_CONFIG_POLICY,
      enableMobileOtp: false,
      allowedEmployeeGroups: {
        ...DEFAULT_AUTH_CONFIG_POLICY.allowedEmployeeGroups,
        employee_id_password: ['FACTORY', 'CONTRACT'],
      },
      roleSpecificPolicies: {
        company_admin: { allowedMethods: ['email_password' as const] },
      },
    };

    expect(isMethodEnabledByConfig('mobile_otp', customConfig).allowed).toBe(false);
    expect(isMethodEnabledByConfig('mobile_otp', customConfig).code).toBe('METHOD_DISABLED');

    expect(
      isMethodEnabledByConfig('employee_id_password', customConfig, {
        employeeGroup: 'FULL_TIME',
      }).code
    ).toBe('GROUP_METHOD_RESTRICTED');

    expect(
      isMethodEnabledByConfig('employee_id_password', customConfig, {
        roleCode: 'company_admin',
        employeeGroup: 'FACTORY',
      }).code
    ).toBe('ROLE_METHOD_RESTRICTED');

    expect(
      isMethodEnabledByConfig('email_password', customConfig, {
        roleCode: 'company_admin',
      }).allowed
    ).toBe(true);
  });

  it('10. validates password strength and config boundary constraints', () => {
    expect(validatePasswordStrength('weak').valid).toBe(false);
    expect(validatePasswordStrength('Strong123').valid).toBe(true);

    expect(
      validateAuthConfigUpdate({ otpExpirySeconds: 10 }, DEFAULT_AUTH_CONFIG_POLICY).valid
    ).toBe(false);
    expect(
      validateAuthConfigUpdate(
        { lockoutPolicy: { maxFailedAttempts: 1, lockoutMinutes: 15, trackByIdentifier: true } },
        DEFAULT_AUTH_CONFIG_POLICY
      ).valid
    ).toBe(false);
  });

  it('11. maps DB auth_method_configs rows cleanly to policy object', () => {
    const mapped = mapDbConfigRowToPolicy({
      organization_id: 'org-1',
      enable_employee_id_password: true,
      enable_mobile_password: false,
      enable_mobile_otp: true,
      enable_email_password: false,
      default_login_method: 'mobile_otp',
      factory_recommended_method: 'employee_id_password',
      otp_expiry_seconds: 180,
    });
    expect(getEnabledMethodsList(mapped)).toEqual(['employee_id_password', 'mobile_otp']);
    expect(mapped.defaultLoginMethod).toBe('mobile_otp');
    expect(mapped.otpExpirySeconds).toBe(180);
  });
});

describe('Web multiMethodAuthService Gateway Integration', () => {
  beforeEach(() => {
    mockSetSession.mockClear();
    mockGetSession.mockClear();
  });

  it('12. fetches public login config without exposing secrets', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          enabledMethods: ['employee_id_password', 'mobile_otp'],
          defaultLoginMethod: 'employee_id_password',
          factoryRecommendedMethod: 'employee_id_password',
          otpProvider: 'airtel_iq',
          otpProviderConfigured: true,
          emailProviderConfigured: true,
          otpExpirySeconds: 300,
          otpResendCooldownSeconds: 30,
          otpMaxAttempts: 5,
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const cfg = await multiMethodAuthService.getPublicLoginConfig();
    expect(cfg.enabledMethods).toEqual(['employee_id_password', 'mobile_otp']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('13. authenticates Employee ID + Password and hydrates Supabase session once for single company', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: true,
            session: {
              access_token: 'acc-123',
              refresh_token: 'ref-456',
              expires_in: 3600,
            },
            requiresCompanySelection: false,
            activeContext: {
              organizationId: 'org-1',
              roleCode: 'employee',
              destinationRoute: '/employee',
            },
          }),
          { status: 200 }
        )
      )
    );

    const res = await multiMethodAuthService.loginWithMethodPassword({
      method: 'employee_id_password',
      identifier: 'EMP-101',
      password: 'Password123',
    });

    expect(res.ok).toBe(true);
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'acc-123',
      refresh_token: 'ref-456',
    });
  });

  it('14. handles multi-company user login and switches organization context', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            session: { access_token: 'acc-mc', refresh_token: 'ref-mc' },
            requiresCompanySelection: true,
            companies: [
              {
                organizationId: 'org-a',
                organizationName: 'Joy Unit A',
                roleCode: 'employee',
                isDefault: true,
              },
              {
                organizationId: 'org-b',
                organizationName: 'Joy Unit B',
                roleCode: 'hr_head',
                isDefault: false,
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            activeContext: {
              organizationId: 'org-b',
              roleCode: 'hr_head',
              destinationRoute: '/dashboard',
            },
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const loginRes = await multiMethodAuthService.loginWithMethodPassword({
      method: 'mobile_password',
      identifier: '9876543210',
      password: 'Password123',
      skipSessionHydration: true,
    });

    expect(loginRes.requiresCompanySelection).toBe(true);
    expect(mockSetSession).not.toHaveBeenCalled();

    const switchRes = await multiMethodAuthService.switchCompanyContext('org-b');
    expect(switchRes.ok).toBe(true);
    expect(switchRes.activeContext?.destinationRoute).toBe('/dashboard');
  });

  it('15. handles Mobile OTP request, verification, admin config save, and session logout audit', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            challengeId: 'chal-1',
            maskedDestination: '+91******3210',
            cooldownSeconds: 30,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            session: { access_token: 'otp-acc', refresh_token: 'otp-ref' },
            requiresCompanySelection: false,
            activeContext: { destinationRoute: '/employee' },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const reqRes = await multiMethodAuthService.requestMobileLoginOtp({
      mobile: '9876543210',
    });
    expect(reqRes.challengeId).toBe('chal-1');

    const verRes = await multiMethodAuthService.verifyMobileLoginOtp({
      challengeId: 'chal-1',
      otp: '123456',
    });
    expect(verRes.ok).toBe(true);
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'otp-acc',
      refresh_token: 'otp-ref',
    });

    await multiMethodAuthService.recordSessionEvent('logout', 'org-1');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
