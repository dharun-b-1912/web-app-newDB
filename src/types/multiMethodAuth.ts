export type LoginMethod =
  | 'employee_id_password'
  | 'mobile_password'
  | 'mobile_otp'
  | 'email_password';

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

export interface AuthMethodConfig {
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

export interface PublicLoginConfigResponse {
  ok: boolean;
  organizationId: string | null;
  organizationName: string | null;
  companyName?: string | null;
  enabledMethods: LoginMethod[];
  defaultLoginMethod: LoginMethod;
  factoryRecommendedMethod: LoginMethod;
  otpProvider: 'airtel_iq' | 'supabase_phone';
  otpProviderConfigured: boolean;
  emailProviderConfigured: boolean;
  otpExpirySeconds: number;
  otpResendCooldownSeconds: number;
  otpMaxAttempts: number;
  passwordPolicy: PasswordPolicyConfig;
  lockoutPolicy: LockoutPolicyConfig;
  sessionPolicy: SessionPolicyConfig;
  allowedEmployeeGroups: Record<LoginMethod, string[]>;
  roleSpecificPolicies: Record<string, RolePolicyRule>;
}

export interface CompanyMembershipOption {
  organizationId: string;
  organizationName: string;
  companyId?: string | null;
  companyName?: string | null;
  roleCode: string;
  roleName?: string | null;
  employeeId?: string | null;
  employeeCode?: string | null;
  isDefault: boolean;
}

export interface MultiMethodAuthResponse {
  ok: boolean;
  code?: string;
  message?: string;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    token_type?: string;
  };
  requiresCompanySelection?: boolean;
  companies?: CompanyMembershipOption[];
  organizationId?: string | null;
  organizationName?: string | null;
  companyName?: string | null;
  activeContext?: {
    organizationId: string;
    organizationName?: string | null;
    companyName?: string | null;
    employeeId?: string | null;
    employeeCode?: string | null;
    roleCode?: string | null;
    destinationRoute?: string;
    mustChangePassword?: boolean;
    status?: string;
  };
  challengeId?: string;
  maskedDestination?: string;
  expiresInSeconds?: number;
  cooldownSeconds?: number;
  remainingAttempts?: number;
  lockoutUntil?: string | null;
  provider?: string;
}

export interface AuthSecurityAuditLogRow {
  id: string;
  organization_id: string | null;
  auth_user_id: string | null;
  employee_id: string | null;
  employee_code: string | null;
  login_method: string;
  event_type: string;
  status: string;
  failure_reason: string | null;
  masked_identifier: string | null;
  device_platform: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuthSecurityAuditSummary {
  totalSuccess: number;
  totalFailed: number;
  totalBlocked: number;
  activeLockoutsCount: number;
  otpSentCount: number;
  byMethod: Record<string, { success: number; failed: number; blocked: number }>;
  logs: AuthSecurityAuditLogRow[];
  lockedAccounts: Array<{
    id: string;
    identifier_key: string;
    auth_user_id: string | null;
    failed_attempts: number;
    locked_until: string | null;
    last_failed_at: string | null;
    last_reason: string | null;
  }>;
}

