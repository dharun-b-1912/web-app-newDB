// Shared pure policy, normalization, cryptographic OTP hashing, and validation
// helpers for JOY PeopleHR Multi-Method Employee Authentication.
// Uses only standard Web APIs (Web Crypto) so it executes cleanly in Deno Edge
// Functions and Vitest / Node test environments.

export type LoginMethod =
  | 'employee_id_password'
  | 'mobile_password'
  | 'mobile_otp'
  | 'email_password';

export const ALL_LOGIN_METHODS: LoginMethod[] = [
  'employee_id_password',
  'mobile_password',
  'mobile_otp',
  'email_password',
];

export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export interface LockoutPolicyConfig {
  maxFailedAttempts: number;
  lockoutMinutes: number;
  trackByIdentifier: boolean;
}

export interface SessionPolicyConfig {
  webSessionHours: number;
  mobileSessionDays: number;
  requireReauthSensitiveActions: boolean;
}

export interface RolePolicyRule {
  allowedMethods?: LoginMethod[];
  requireOtpForSensitiveActions?: boolean;
}

export interface AuthConfigPolicy {
  organizationId: string | null;
  enableEmployeeIdPassword: boolean;
  enableMobilePassword: boolean;
  enableMobileOtp: boolean;
  enableEmailPassword: boolean;
  defaultLoginMethod: LoginMethod;
  factoryRecommendedMethod: LoginMethod;
  allowedEmployeeGroups: Record<LoginMethod, string[]>;
  roleSpecificPolicies: Record<string, RolePolicyRule>;
  otpProvider: 'airtel_iq' | 'supabase_phone';
  otpExpirySeconds: number;
  otpResendCooldownSeconds: number;
  otpMaxAttempts: number;
  passwordPolicy: PasswordPolicyConfig;
  lockoutPolicy: LockoutPolicyConfig;
  sessionPolicy: SessionPolicyConfig;
}

export const DEFAULT_AUTH_CONFIG_POLICY: AuthConfigPolicy = {
  organizationId: null,
  enableEmployeeIdPassword: true,
  enableMobilePassword: true,
  enableMobileOtp: true,
  enableEmailPassword: true,
  defaultLoginMethod: 'employee_id_password',
  factoryRecommendedMethod: 'employee_id_password',
  allowedEmployeeGroups: {
    employee_id_password: ['all'],
    mobile_password: ['all'],
    mobile_otp: ['all'],
    email_password: ['all'],
  },
  roleSpecificPolicies: {},
  otpProvider: 'airtel_iq',
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
};

export function isValidLoginMethod(value: unknown): value is LoginMethod {
  return (
    typeof value === 'string' &&
    (ALL_LOGIN_METHODS as string[]).includes(value)
  );
}

/**
 * Normalizes domestic or international mobile numbers to E.164 format.
 * Defaults to +91 (India) when a 10-digit national number is supplied.
 */
export function normalizePhoneToE164(
  rawPhone: string,
  defaultCountryCode = '+91'
): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  let cleaned = rawPhone.trim().replace(/[\s\-().]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  const normalizedCc = defaultCountryCode.startsWith('+')
    ? defaultCountryCode
    : `+${defaultCountryCode.replace(/\D/g, '')}`;
  const ccDigits = normalizedCc.replace(/\D/g, '');

  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (!digitsOnly) return null;

  // 11 digits starting with 0 (e.g. 09876543210)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `${normalizedCc}${digitsOnly.slice(1)}`;
  }

  // Standard 10-digit local number
  if (digitsOnly.length === 10) {
    return `${normalizedCc}${digitsOnly}`;
  }

  // Country code already included without '+' (e.g. 919876543210)
  if (
    digitsOnly.length >= 11 &&
    digitsOnly.length <= 15 &&
    digitsOnly.startsWith(ccDigits)
  ) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length >= 11 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  return null;
}

export function extractLast10Digits(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function maskIdentifier(method: string, raw: string): string {
  const val = (raw || '').trim();
  if (!val) return '***';

  if (method === 'email_password' || val.includes('@')) {
    const [local, domain] = val.split('@');
    if (!domain) return `${val.slice(0, 2)}***`;
    const prefix = local.slice(0, Math.min(2, local.length));
    return `${prefix}***@${domain}`;
  }

  if (method === 'mobile_password' || method === 'mobile_otp') {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 4) return '****';
    const tail = digits.slice(-4);
    const prefix = val.startsWith('+') ? val.slice(0, 3) : '';
    return `${prefix}******${tail}`;
  }

  // Employee ID
  if (val.length <= 3) return `${val[0]}**`;
  return `${val.slice(0, 2)}***${val.slice(-2)}`;
}

const BLOCKED_STATUSES = new Set([
  'DISABLED',
  'TERMINATED',
  'SUSPENDED',
  'RESIGNED',
  'LOCKED',
  'DEACTIVATED',
  'EXITED',
  'INACTIVE',
]);

export function isAccountBlockedStatus(status?: string | null): boolean {
  if (!status) return false;
  return BLOCKED_STATUSES.has(status.trim().toUpperCase());
}

export function isPendingOnboardingStatus(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toUpperCase();
  return s === 'INVITED' || s === 'PENDING' || s === 'PENDING_ONBOARDING';
}

export function mapDbConfigRowToPolicy(
  row: Record<string, any> | null | undefined
): AuthConfigPolicy {
  if (!row) return { ...DEFAULT_AUTH_CONFIG_POLICY };

  const enableEmp =
    row.enable_employee_id_password ??
    DEFAULT_AUTH_CONFIG_POLICY.enableEmployeeIdPassword;
  const enableMobPwd =
    row.enable_mobile_password ??
    DEFAULT_AUTH_CONFIG_POLICY.enableMobilePassword;
  const enableMobOtp =
    row.enable_mobile_otp ?? DEFAULT_AUTH_CONFIG_POLICY.enableMobileOtp;
  const enableEmail =
    row.enable_email_password ?? DEFAULT_AUTH_CONFIG_POLICY.enableEmailPassword;

  const defaultMethod = isValidLoginMethod(row.default_login_method)
    ? row.default_login_method
    : DEFAULT_AUTH_CONFIG_POLICY.defaultLoginMethod;

  const factoryMethod = isValidLoginMethod(row.factory_recommended_method)
    ? row.factory_recommended_method
    : DEFAULT_AUTH_CONFIG_POLICY.factoryRecommendedMethod;

  return {
    organizationId: row.organization_id ?? null,
    enableEmployeeIdPassword: Boolean(enableEmp),
    enableMobilePassword: Boolean(enableMobPwd),
    enableMobileOtp: Boolean(enableMobOtp),
    enableEmailPassword: Boolean(enableEmail),
    defaultLoginMethod: defaultMethod,
    factoryRecommendedMethod: factoryMethod,
    allowedEmployeeGroups: {
      ...DEFAULT_AUTH_CONFIG_POLICY.allowedEmployeeGroups,
      ...(row.allowed_employee_groups || {}),
    },
    roleSpecificPolicies: row.role_specific_policies || {},
    otpProvider:
      row.otp_provider === 'supabase_phone' ? 'supabase_phone' : 'airtel_iq',
    otpExpirySeconds: Number(
      row.otp_expiry_seconds ?? DEFAULT_AUTH_CONFIG_POLICY.otpExpirySeconds
    ),
    otpResendCooldownSeconds: Number(
      row.otp_resend_cooldown_seconds ??
        DEFAULT_AUTH_CONFIG_POLICY.otpResendCooldownSeconds
    ),
    otpMaxAttempts: Number(
      row.otp_max_attempts ?? DEFAULT_AUTH_CONFIG_POLICY.otpMaxAttempts
    ),
    passwordPolicy: {
      ...DEFAULT_AUTH_CONFIG_POLICY.passwordPolicy,
      ...(row.password_policy || {}),
    },
    lockoutPolicy: {
      ...DEFAULT_AUTH_CONFIG_POLICY.lockoutPolicy,
      ...(row.lockout_policy || {}),
    },
    sessionPolicy: {
      ...DEFAULT_AUTH_CONFIG_POLICY.sessionPolicy,
      ...(row.session_policy || {}),
    },
  };
}

export function getEnabledMethodsList(config: AuthConfigPolicy): LoginMethod[] {
  const out: LoginMethod[] = [];
  if (config.enableEmployeeIdPassword) out.push('employee_id_password');
  if (config.enableMobilePassword) out.push('mobile_password');
  if (config.enableMobileOtp) out.push('mobile_otp');
  if (config.enableEmailPassword) out.push('email_password');
  return out;
}

export function isMethodEnabledByConfig(
  method: LoginMethod,
  config: AuthConfigPolicy,
  context?: { roleCode?: string | null; employeeGroup?: string | null }
): { allowed: boolean; reason?: string; code?: string } {
  const enabledMap: Record<LoginMethod, boolean> = {
    employee_id_password: config.enableEmployeeIdPassword,
    mobile_password: config.enableMobilePassword,
    mobile_otp: config.enableMobileOtp,
    email_password: config.enableEmailPassword,
  };

  if (!enabledMap[method]) {
    return {
      allowed: false,
      code: 'METHOD_DISABLED',
      reason:
        'This login method is disabled by your organization HR administrator. Please select another enabled login method.',
    };
  }

  // Group-based restriction
  const allowedGroups = (config.allowedEmployeeGroups?.[method] || ['all']).map(
    (g) => String(g).trim().toLowerCase()
  );
  if (
    context?.employeeGroup &&
    allowedGroups.length > 0 &&
    !allowedGroups.includes('all')
  ) {
    const empGroup = context.employeeGroup.trim().toLowerCase();
    if (!allowedGroups.includes(empGroup)) {
      return {
        allowed: false,
        code: 'GROUP_METHOD_RESTRICTED',
        reason: `This login method is restricted for your employee category (${context.employeeGroup}). Please choose another login method.`,
      };
    }
  }

  // Role-based restriction
  if (context?.roleCode && config.roleSpecificPolicies) {
    const roleKey = context.roleCode.trim().toLowerCase();
    const roleRule =
      config.roleSpecificPolicies[roleKey] ||
      config.roleSpecificPolicies[roleKey.replace(/^role_/, '')];
    if (
      roleRule?.allowedMethods &&
      Array.isArray(roleRule.allowedMethods) &&
      roleRule.allowedMethods.length > 0 &&
      !roleRule.allowedMethods.includes(method)
    ) {
      return {
        allowed: false,
        code: 'ROLE_METHOD_RESTRICTED',
        reason: `Your assigned role does not permit this login method. Please sign in using an approved method for your role.`,
      };
    }
  }

  return { allowed: true };
}

export function validateAuthConfigUpdate(
  patch: Partial<AuthConfigPolicy>,
  existing: AuthConfigPolicy = DEFAULT_AUTH_CONFIG_POLICY
): { valid: boolean; error?: string; merged?: AuthConfigPolicy } {
  const merged: AuthConfigPolicy = {
    ...existing,
    ...patch,
    allowedEmployeeGroups: {
      ...existing.allowedEmployeeGroups,
      ...(patch.allowedEmployeeGroups || {}),
    },
    roleSpecificPolicies: {
      ...existing.roleSpecificPolicies,
      ...(patch.roleSpecificPolicies || {}),
    },
    passwordPolicy: {
      ...existing.passwordPolicy,
      ...(patch.passwordPolicy || {}),
    },
    lockoutPolicy: {
      ...existing.lockoutPolicy,
      ...(patch.lockoutPolicy || {}),
    },
    sessionPolicy: {
      ...existing.sessionPolicy,
      ...(patch.sessionPolicy || {}),
    },
  };

  const enabled = getEnabledMethodsList(merged);
  if (enabled.length === 0) {
    return {
      valid: false,
      error:
        'At least one login method must remain enabled so employees are not locked out.',
    };
  }

  if (!enabled.includes(merged.defaultLoginMethod)) {
    if (patch.defaultLoginMethod !== undefined) {
      return {
        valid: false,
        error:
          'Default login method cannot be set to a disabled authentication method.',
      };
    }
    merged.defaultLoginMethod = enabled[0];
  }

  if (!enabled.includes(merged.factoryRecommendedMethod)) {
    merged.factoryRecommendedMethod = enabled.includes('employee_id_password')
      ? 'employee_id_password'
      : enabled[0];
  }

  if (merged.otpExpirySeconds < 60 || merged.otpExpirySeconds > 900) {
    return {
      valid: false,
      error: 'OTP expiry must be between 60 and 900 seconds.',
    };
  }

  if (
    merged.otpResendCooldownSeconds < 15 ||
    merged.otpResendCooldownSeconds > 300
  ) {
    return {
      valid: false,
      error: 'OTP resend cooldown must be between 15 and 300 seconds.',
    };
  }

  if (merged.otpMaxAttempts < 3 || merged.otpMaxAttempts > 10) {
    return {
      valid: false,
      error: 'OTP max verification attempts must be between 3 and 10.',
    };
  }

  if (
    merged.lockoutPolicy.maxFailedAttempts < 3 ||
    merged.lockoutPolicy.maxFailedAttempts > 20
  ) {
    return {
      valid: false,
      error: 'Max failed login attempts before lockout must be between 3 and 20.',
    };
  }

  if (
    merged.lockoutPolicy.lockoutMinutes < 1 ||
    merged.lockoutPolicy.lockoutMinutes > 1440
  ) {
    return {
      valid: false,
      error: 'Account lockout duration must be between 1 and 1440 minutes.',
    };
  }

  return { valid: true, merged };
}

export function validatePasswordStrength(
  password: string,
  policy: PasswordPolicyConfig = DEFAULT_AUTH_CONFIG_POLICY.passwordPolicy
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!password || password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters.`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must include at least one uppercase letter.');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must include at least one lowercase letter.');
  }
  if (policy.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must include at least one numeric digit.');
  }
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must include at least one special character.');
  }
  return { valid: errors.length === 0, errors };
}

export function generateSecureOtp(length = 6): string {
  const mod = Math.pow(10, length);
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const code = buf[0] % mod;
  return String(code).padStart(length, '0');
}

export async function hashOtpCode(
  otp: string,
  challengeId: string,
  pepper: string
): Promise<string> {
  const payload = `${challengeId}:${otp.trim()}:${pepper}`;
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

