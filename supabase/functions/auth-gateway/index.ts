// supabase/functions/auth-gateway/index.ts
// Authoritative backend Multi-Method Employee Authentication Gateway for JOY PeopleHR.
// Supports 4 login methods resolving strictly to a single existing identity:
//   1. employee_id_password
//   2. mobile_password
//   3. mobile_otp
//   4. email_password
// Plus password recovery, multi-company selection, HR configuration management,
// security audit reporting, HR-assisted recovery, and session lifecycle logging.

import { withSupabase } from 'npm:@supabase/server@1';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimiter.ts';
import {
  type AuthConfigPolicy,
  constantTimeEqual,
  DEFAULT_AUTH_CONFIG_POLICY,
  extractLast10Digits,
  generateSecureOtp,
  getEnabledMethodsList,
  hashOtpCode,
  isAccountBlockedStatus,
  isMethodEnabledByConfig,
  isPendingOnboardingStatus,
  isValidLoginMethod,
  type LoginMethod,
  mapDbConfigRowToPolicy,
  maskIdentifier,
  normalizePhoneToE164,
  validateAuthConfigUpdate,
  validatePasswordStrength,
} from './policy.ts';

interface ResolvedMembership {
  organizationId: string;
  organizationName: string;
  companyId: string | null;
  companyName: string | null;
  roleCode: string;
  roleName: string | null;
  employeeId: string | null;
  employeeCode: string | null;
  isDefault: boolean;
}

interface ResolvedIdentity {
  authUserId: string;
  userProfileId: string;
  organizationId: string | null;
  organizationName: string | null;
  companyId: string | null;
  employeeId: string | null;
  employeeCode: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  employmentType: string | null;
  profileStatus: string | null;
  employeeStatus: string | null;
  roleCode: string;
  memberships: ResolvedMembership[];
}

const ADMIN_ROLES = new Set([
  'admin',
  'super_admin',
  'platform_admin',
  'founder_super_admin',
  'company_admin',
  'org_admin',
  'hr_head',
  'hr_admin',
  'hr_manager',
]);

function getPublishableClientKey(req: Request): string {
  const fromHeader = req.headers.get('apikey')?.trim();
  if (fromHeader) return fromHeader;

  const keysJson = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (keysJson) {
    try {
      const parsed = JSON.parse(keysJson);
      if (parsed?.default) return String(parsed.default);
      const firstVal = Object.values(parsed)[0];
      if (typeof firstVal === 'string') return firstVal;
    } catch {
      // ignore malformed JSON
    }
  }

  return (
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ||
    Deno.env.get('SUPABASE_ANON_KEY') ||
    ''
  );
}

function createEphemeralAuthClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const clientKey = getPublishableClientKey(req);
  return createClient(supabaseUrl, clientKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getOtpPepper(): string {
  return (
    Deno.env.get('AUTH_OTP_PEPPER') ||
    Deno.env.get('SUPABASE_JWT_SECRET') ||
    'joyhr-otp-pepper-fallback'
  );
}

function getRequestMetadata(req: Request, body: Record<string, any>) {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ipAddress =
    forwarded.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  const userAgent = (
    body.userAgent ||
    req.headers.get('user-agent') ||
    'unknown'
  ).slice(0, 240);
  const devicePlatform = String(
    body.devicePlatform ||
      (userAgent.toLowerCase().includes('dart') ||
          userAgent.toLowerCase().includes('flutter') ||
          userAgent.toLowerCase().includes('android') ||
          userAgent.toLowerCase().includes('ios')
        ? 'mobile'
        : 'web')
  ).slice(0, 32);

  return { ipAddress, userAgent, devicePlatform };
}

function resolveDestinationRoute(roleCode: string): string {
  const r = (roleCode || 'employee').trim().toLowerCase();
  if (
    r === 'platform_admin' ||
    r === 'super_admin' ||
    r === 'founder_super_admin'
  ) {
    return '/platform-admin';
  }
  if (r === 'vendor') return '/vendor-portal';
  if (
    r === 'company_admin' ||
    r === 'admin' ||
    r === 'org_admin' ||
    r === 'hr_head' ||
    r === 'hr_admin' ||
    r === 'hr_manager' ||
    r === 'hr_ops' ||
    r === 'payroll_admin' ||
    r === 'supervisor' ||
    r === 'team_lead' ||
    r === 'manager'
  ) {
    return '/dashboard';
  }
  return '/ess/dashboard';
}

async function writeAuthAuditLog(
  supabaseAdmin: any,
  entry: {
    organizationId?: string | null;
    authUserId?: string | null;
    userProfileId?: string | null;
    employeeId?: string | null;
    employeeCode?: string | null;
    loginMethod: string;
    eventType: string;
    status: 'success' | 'failed' | 'blocked';
    failureReason?: string | null;
    maskedIdentifier?: string | null;
    devicePlatform?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabaseAdmin.from('auth_login_audit_logs').insert({
      organization_id: entry.organizationId || null,
      auth_user_id: entry.authUserId || null,
      user_profile_id: entry.userProfileId || null,
      employee_id: entry.employeeId || null,
      employee_code: entry.employeeCode || null,
      login_method: entry.loginMethod,
      event_type: entry.eventType,
      status: entry.status,
      failure_reason: entry.failureReason || null,
      masked_identifier: entry.maskedIdentifier || null,
      device_platform: entry.devicePlatform || null,
      user_agent: entry.userAgent || null,
      ip_address: entry.ipAddress || null,
      metadata: entry.metadata || {},
    });
  } catch (err) {
    console.error('[auth-gateway] Failed to write auth audit log:', err);
  }
}

const AUTH_CONFIG_CACHE_TTL_MS = 60_000;
const authConfigCache = new Map<
  string,
  {
    expiresAt: number;
    value: {
      policy: AuthConfigPolicy;
      organizationName: string | null;
      companyName: string | null;
      organizationId: string | null;
    };
  }
>();

function runBackground(task: Promise<unknown>): void {
  const safe = task.catch((err) => {
    console.warn('[auth-gateway] background task notice:', err);
  });
  try {
    const edgeRuntime = (globalThis as any).EdgeRuntime;
    if (edgeRuntime && typeof edgeRuntime.waitUntil === 'function') {
      edgeRuntime.waitUntil(safe);
    }
  } catch (_) {}
}

async function loadEffectiveAuthConfig(
  supabaseAdmin: any,
  organizationId?: string | null
): Promise<{
  policy: AuthConfigPolicy;
  organizationName: string | null;
  companyName: string | null;
  organizationId: string | null;
}> {
  const cacheKey = organizationId || '__default__';
  const cached = authConfigCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let orgName: string | null = null;
  let compName: string | null = null;
  let resolvedOrgId: string | null = organizationId || null;
  let orgConfigRow: Record<string, any> | null = null;

  if (organizationId) {
    const [{ data: orgRow }, { data: specificCfg }] = await Promise.all([
      supabaseAdmin
        .from('organizations')
        .select('id, name, display_name, legal_name')
        .eq('id', organizationId)
        .maybeSingle(),
      supabaseAdmin
        .from('auth_method_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ]);

    orgName = orgRow?.display_name || orgRow?.name || orgRow?.legal_name || null;
    compName = null;
    orgConfigRow = specificCfg || null;
  } else {
    // Shared multi-tenant SaaS login: load global auth policy only; never leak tenant org/company pre-login
    const { data: globalCfg } = await supabaseAdmin
      .from('auth_method_configs')
      .select('*')
      .is('organization_id', null)
      .maybeSingle();
    orgConfigRow = globalCfg || null;
    resolvedOrgId = null;
    orgName = null;
    compName = null;
  }

  if (!orgConfigRow) {
    const { data: globalCfg } = await supabaseAdmin
      .from('auth_method_configs')
      .select('*')
      .is('organization_id', null)
      .maybeSingle();
    orgConfigRow = globalCfg || null;
  }

  const result = {
    policy: mapDbConfigRowToPolicy(orgConfigRow),
    organizationName: orgName,
    companyName: compName,
    organizationId: resolvedOrgId,
  };
  authConfigCache.set(cacheKey, {
    expiresAt: Date.now() + AUTH_CONFIG_CACHE_TTL_MS,
    value: result,
  });
  return result;
}

async function loadMembershipsForProfile(
  supabaseAdmin: any,
  userProfileId: string,
  primaryOrgId?: string | null,
  primaryEmployeeId?: string | null,
  primaryEmployeeCode?: string | null,
  fallbackRoleCode = 'employee'
): Promise<ResolvedMembership[]> {
  const [{ data: memRows }, { data: empRows }] = await Promise.all([
    supabaseAdmin
      .from('organization_memberships')
      .select(
        'organization_id, role_code, role_id, status, is_default, organizations(id, name, display_name, legal_name)'
      )
      .eq('user_id', userProfileId)
      .in('status', ['Active', 'active']),
    supabaseAdmin
      .from('employees')
      .select('id, organization_id, company_id, employee_code, employment_status, companies(id, legal_name, trade_name)')
      .or(`user_id.eq.${userProfileId},id.eq.${primaryEmployeeId || '00000000-0000-0000-0000-000000000000'}`),
  ]);

  const empByOrg = new Map<string, any>();
  for (const e of empRows || []) {
    if (e.organization_id && !empByOrg.has(e.organization_id)) {
      empByOrg.set(e.organization_id, e);
    }
  }

  const out: ResolvedMembership[] = [];
  const seenOrgs = new Set<string>();

  for (const row of memRows || []) {
    if (!row.organization_id || seenOrgs.has(row.organization_id)) continue;
    seenOrgs.add(row.organization_id);
    const orgRel = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;
    const emp = empByOrg.get(row.organization_id);
    const compRel = emp?.companies
      ? Array.isArray(emp.companies)
        ? emp.companies[0]
        : emp.companies
      : null;

    out.push({
      organizationId: row.organization_id,
      organizationName:
        orgRel?.display_name || orgRel?.name || orgRel?.legal_name || 'Organization',
      companyId: emp?.company_id || null,
      companyName: compRel?.trade_name || compRel?.legal_name || null,
      roleCode: (row.role_code || fallbackRoleCode || 'employee').toLowerCase(),
      roleName: row.role_code || 'Employee',
      employeeId: emp?.id || (row.organization_id === primaryOrgId ? primaryEmployeeId || null : null),
      employeeCode:
        emp?.employee_code ||
        (row.organization_id === primaryOrgId ? primaryEmployeeCode || null : null),
      isDefault: Boolean(row.is_default),
    });
  }

  // Fallback if organization_memberships is empty but user_profiles / employees has organization_id
  if (out.length === 0 && primaryOrgId) {
    const { data: orgRow } = await supabaseAdmin
      .from('organizations')
      .select('id, name, display_name, legal_name')
      .eq('id', primaryOrgId)
      .maybeSingle();
    const emp = empByOrg.get(primaryOrgId);
    const compRel = emp?.companies
      ? Array.isArray(emp.companies)
        ? emp.companies[0]
        : emp.companies
      : null;
    out.push({
      organizationId: primaryOrgId,
      organizationName:
        orgRow?.display_name || orgRow?.name || orgRow?.legal_name || 'Organization',
      companyId: emp?.company_id || null,
      companyName: compRel?.trade_name || compRel?.legal_name || null,
      roleCode: (fallbackRoleCode || 'employee').toLowerCase(),
      roleName: fallbackRoleCode || 'Employee',
      employeeId: primaryEmployeeId || emp?.id || null,
      employeeCode: primaryEmployeeCode || emp?.employee_code || null,
      isDefault: true,
    });
  }

  return out;
}

async function resolveProfileAndRoleForEmployee(
  supabaseAdmin: any,
  emp: any
): Promise<{ ok: true; identity: ResolvedIdentity } | { ok: false; code: string; message: string }> {
  let profile: any = null;

  if (emp.user_id) {
    const { data: pByUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id, auth_user_id, organization_id, employee_id, email, full_name, phone, status, role')
      .or(`id.eq.${emp.user_id},auth_user_id.eq.${emp.user_id}`)
      .limit(1)
      .maybeSingle();
    profile = pByUser || null;
  }

  if (!profile) {
    const { data: pByEmp } = await supabaseAdmin
      .from('user_profiles')
      .select('id, auth_user_id, organization_id, employee_id, email, full_name, phone, status, role')
      .eq('employee_id', emp.id)
      .limit(1)
      .maybeSingle();
    profile = pByEmp || null;
  }

  if (!profile && emp.work_email) {
    const { data: pByEmail } = await supabaseAdmin
      .from('user_profiles')
      .select('id, auth_user_id, organization_id, employee_id, email, full_name, phone, status, role')
      .ilike('email', String(emp.work_email).trim())
      .limit(1)
      .maybeSingle();
    profile = pByEmail || null;
  }

  if (!profile || !profile.auth_user_id) {
    return {
      ok: false,
      code: 'ONBOARDING_PENDING',
      message:
        'Your employee login credentials are not activated yet. Please contact HR or complete your onboarding activation.',
    };
  }

  const memberships = await loadMembershipsForProfile(
    supabaseAdmin,
    profile.id,
    emp.organization_id || profile.organization_id,
    emp.id,
    emp.employee_code,
    profile.role || 'employee'
  );

  const primaryMem =
    memberships.find((m) => m.organizationId === emp.organization_id) ||
    memberships.find((m) => m.isDefault) ||
    memberships[0];

  return {
    ok: true,
    identity: {
      authUserId: profile.auth_user_id,
      userProfileId: profile.id,
      organizationId: emp.organization_id || profile.organization_id || primaryMem?.organizationId || null,
      organizationName: primaryMem?.organizationName || null,
      companyId: emp.company_id || primaryMem?.companyId || null,
      employeeId: emp.id,
      employeeCode: emp.employee_code || null,
      fullName: emp.display_name || profile.full_name || null,
      email: emp.work_email || profile.email || emp.personal_email || null,
      phone: emp.phone || profile.phone || null,
      employmentType: emp.employment_type || null,
      profileStatus: profile.status || null,
      employeeStatus: emp.employment_status || null,
      roleCode: primaryMem?.roleCode || profile.role || 'employee',
      memberships,
    },
  };
}

async function resolveSingleIdentityByMethod(
  supabaseAdmin: any,
  method: LoginMethod,
  rawIdentifier: string,
  organizationId?: string | null,
  countryCode = '+91'
): Promise<
  | { ok: true; identity: ResolvedIdentity }
  | { ok: false; code: string; message: string; organizationId?: string | null }
> {
  const trimmed = (rawIdentifier || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      code: 'MISSING_IDENTIFIER',
      message: 'Please enter your login credential.',
    };
  }

  if (method === 'employee_id_password') {
    let q = supabaseAdmin
      .from('employees')
      .select(
        'id, organization_id, company_id, user_id, employee_code, display_name, work_email, personal_email, phone, employment_type, employment_status'
      )
      .ilike('employee_code', trimmed);

    if (organizationId) {
      q = q.eq('organization_id', organizationId);
    }

    const { data: matches, error } = await q.limit(5);
    if (error) {
      return {
        ok: false,
        code: 'LOOKUP_ERROR',
        message: 'Unable to verify Employee ID right now.',
      };
    }

    if (!matches || matches.length === 0) {
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid Employee ID or password.',
      };
    }

    if (matches.length > 1) {
      return {
        ok: false,
        code: 'MULTIPLE_ORGANIZATIONS_MATCH',
        message:
          'Multiple organizations use this Employee ID. Please sign in with your Registered Mobile or Email Address.',
      };
    }

    return await resolveProfileAndRoleForEmployee(supabaseAdmin, matches[0]);
  }

  if (method === 'mobile_password' || method === 'mobile_otp') {
    const normalizedE164 = normalizePhoneToE164(trimmed, countryCode);
    const last10 = extractLast10Digits(trimmed);

    if (!normalizedE164 || last10.length < 10) {
      return {
        ok: false,
        code: 'INVALID_PHONE',
        message: 'Please enter a valid registered 10-digit mobile number.',
      };
    }

    let empQuery = supabaseAdmin
      .from('employees')
      .select(
        'id, organization_id, company_id, user_id, employee_code, display_name, work_email, personal_email, phone, employment_type, employment_status'
      )
      .ilike('phone', `%${last10}%`);

    if (organizationId) {
      empQuery = empQuery.eq('organization_id', organizationId);
    }

    const { data: empCandidates } = await empQuery.limit(10);

    const matchedEmployees = (empCandidates || []).filter((row: any) => {
      const rowLast10 = extractLast10Digits(row.phone || '');
      return rowLast10 === last10;
    });

    if (matchedEmployees.length > 1) {
      const distinctPeople = new Set(
        matchedEmployees
          .filter((e: any) => !isAccountBlockedStatus(e.employment_status))
          .map((e: any) => String(e.user_id || e.id))
      );
      if (distinctPeople.size > 1) {
        return {
          ok: false,
          code: 'DUPLICATE_PHONE',
          message:
            'This mobile number is linked to more than one employee record. Please sign in using Employee ID + Password or contact HR.',
          organizationId: matchedEmployees[0]?.organization_id || null,
        };
      }
    }

    if (matchedEmployees.length >= 1) {
      const activeEmp =
        matchedEmployees.find((e: any) => !isAccountBlockedStatus(e.employment_status)) ||
        matchedEmployees[0];
      return await resolveProfileAndRoleForEmployee(supabaseAdmin, activeEmp);
    }

    // Secondary check on user_profiles.phone (e.g. admins/HR without employee row phone synced)
    let profQuery = supabaseAdmin
      .from('user_profiles')
      .select('id, auth_user_id, organization_id, employee_id, email, full_name, phone, status, role')
      .ilike('phone', `%${last10}%`);

    if (organizationId) {
      profQuery = profQuery.eq('organization_id', organizationId);
    }

    const { data: profCandidates } = await profQuery.limit(10);
    const matchedProfiles = (profCandidates || []).filter(
      (p: any) => extractLast10Digits(p.phone || '') === last10 && p.auth_user_id
    );

    if (matchedProfiles.length > 1) {
      return {
        ok: false,
        code: 'DUPLICATE_PHONE',
        message:
          'This mobile number is associated with multiple accounts. Please sign in with Employee ID or Email.',
        organizationId: matchedProfiles[0]?.organization_id || null,
      };
    }

    if (matchedProfiles.length === 1) {
      const p = matchedProfiles[0];
      const memberships = await loadMembershipsForProfile(
        supabaseAdmin,
        p.id,
        p.organization_id,
        p.employee_id,
        null,
        p.role || 'employee'
      );
      const primaryMem = memberships.find((m) => m.isDefault) || memberships[0];
      return {
        ok: true,
        identity: {
          authUserId: p.auth_user_id,
          userProfileId: p.id,
          organizationId: p.organization_id || primaryMem?.organizationId || null,
          organizationName: primaryMem?.organizationName || null,
          companyId: primaryMem?.companyId || null,
          employeeId: p.employee_id || null,
          employeeCode: primaryMem?.employeeCode || null,
          fullName: p.full_name || null,
          email: p.email || null,
          phone: p.phone || normalizedE164,
          employmentType: null,
          profileStatus: p.status || null,
          employeeStatus: null,
          roleCode: primaryMem?.roleCode || p.role || 'employee',
          memberships,
        },
      };
    }

    return {
      ok: false,
      code: 'PHONE_NOT_REGISTERED',
      message: 'No employee account is registered with this mobile number.',
    };
  }

  // method === 'email_password'
  const lowerEmail = trimmed.toLowerCase();
  const { data: profileMatch } = await supabaseAdmin
    .from('user_profiles')
    .select('id, auth_user_id, organization_id, employee_id, email, full_name, phone, status, role')
    .ilike('email', lowerEmail)
    .limit(2);

  if (profileMatch && profileMatch.length > 0 && profileMatch[0].auth_user_id) {
    const p = profileMatch[0];
    let empRow: any = null;
    if (p.employee_id) {
      const { data: e } = await supabaseAdmin
        .from('employees')
        .select('id, organization_id, company_id, employee_code, display_name, work_email, phone, employment_type, employment_status')
        .eq('id', p.employee_id)
        .maybeSingle();
      empRow = e;
    } else {
      const { data: e } = await supabaseAdmin
        .from('employees')
        .select('id, organization_id, company_id, employee_code, display_name, work_email, phone, employment_type, employment_status')
        .eq('user_id', p.id)
        .limit(1)
        .maybeSingle();
      empRow = e;
    }

    const memberships = await loadMembershipsForProfile(
      supabaseAdmin,
      p.id,
      empRow?.organization_id || p.organization_id,
      empRow?.id || p.employee_id,
      empRow?.employee_code,
      p.role || 'employee'
    );
    const primaryMem = memberships.find((m) => m.isDefault) || memberships[0];

    return {
      ok: true,
      identity: {
        authUserId: p.auth_user_id,
        userProfileId: p.id,
        organizationId: empRow?.organization_id || p.organization_id || primaryMem?.organizationId || null,
        organizationName: primaryMem?.organizationName || null,
        companyId: empRow?.company_id || primaryMem?.companyId || null,
        employeeId: empRow?.id || p.employee_id || null,
        employeeCode: empRow?.employee_code || primaryMem?.employeeCode || null,
        fullName: empRow?.display_name || p.full_name || null,
        email: p.email || empRow?.work_email || lowerEmail,
        phone: empRow?.phone || p.phone || null,
        employmentType: empRow?.employment_type || null,
        profileStatus: p.status || null,
        employeeStatus: empRow?.employment_status || null,
        roleCode: primaryMem?.roleCode || p.role || 'employee',
        memberships,
      },
    };
  }

  // Fallback check on employees table work_email
  const { data: empEmailMatches } = await supabaseAdmin
    .from('employees')
    .select(
      'id, organization_id, company_id, user_id, employee_code, display_name, work_email, personal_email, phone, employment_type, employment_status'
    )
    .ilike('work_email', lowerEmail)
    .limit(2);

  if (empEmailMatches && empEmailMatches.length === 1) {
    return await resolveProfileAndRoleForEmployee(supabaseAdmin, empEmailMatches[0]);
  }

  return {
    ok: false,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email address or password.',
  };
}

async function checkLockoutState(
  supabaseAdmin: any,
  lockoutKey: string
): Promise<{ locked: boolean; lockedUntil: string | null }> {
  const { data: lockRow } = await supabaseAdmin
    .from('auth_account_lockouts')
    .select('locked_until, failed_attempts')
    .eq('identifier_key', lockoutKey)
    .maybeSingle();

  if (!lockRow?.locked_until) return { locked: false, lockedUntil: null };
  const untilMs = new Date(lockRow.locked_until).getTime();
  if (untilMs > Date.now()) {
    return { locked: true, lockedUntil: lockRow.locked_until };
  }
  return { locked: false, lockedUntil: null };
}

async function recordFailedAttemptLockout(
  supabaseAdmin: any,
  lockoutKey: string,
  authUserId: string | null,
  organizationId: string | null,
  policy: AuthConfigPolicy,
  reason: string
): Promise<{ lockedNow: boolean; lockedUntil: string | null; remainingAttempts: number }> {
  const maxAttempts = policy.lockoutPolicy.maxFailedAttempts || 5;
  const lockoutMinutes = policy.lockoutPolicy.lockoutMinutes || 15;

  const { data: existing } = await supabaseAdmin
    .from('auth_account_lockouts')
    .select('id, failed_attempts, locked_until')
    .eq('identifier_key', lockoutKey)
    .maybeSingle();

  const prevCount =
    existing?.locked_until && new Date(existing.locked_until).getTime() <= Date.now()
      ? 0
      : Number(existing?.failed_attempts || 0);
  const nextCount = prevCount + 1;
  const shouldLock = nextCount >= maxAttempts;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString()
    : null;

  await supabaseAdmin.from('auth_account_lockouts').upsert(
    {
      identifier_key: lockoutKey,
      auth_user_id: authUserId,
      organization_id: organizationId,
      failed_attempts: nextCount,
      locked_until: lockedUntil,
      last_failed_at: new Date().toISOString(),
      last_reason: reason,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'identifier_key' }
  );

  return {
    lockedNow: shouldLock,
    lockedUntil,
    remainingAttempts: Math.max(0, maxAttempts - nextCount),
  };
}

async function clearLockoutState(supabaseAdmin: any, lockoutKey: string) {
  await supabaseAdmin
    .from('auth_account_lockouts')
    .delete()
    .eq('identifier_key', lockoutKey);
}

async function sendAirtelOtpSms(
  phoneE164: string,
  otpCode: string,
  expiryMinutes: number
): Promise<{ ok: boolean; provider: string; messageId?: string; error?: string }> {
  const customerId = Deno.env.get('AIRTEL_CUSTOMER_ID')?.trim() || '';
  const username = Deno.env.get('AIRTEL_IQ_USERNAME')?.trim() || '';
  const password = Deno.env.get('AIRTEL_IQ_PASSWORD')?.trim() || '';
  const apiKey = Deno.env.get('AIRTEL_API_KEY')?.trim() || '';
  const rawBaseUrl = (
    Deno.env.get('AIRTEL_IQ_SMS_BASE_URL')?.trim() ||
    'https://iqsms.airtel.in/api/v1/send-prepaid-sms'
  ).replace(/\/+$/, '');
  const endpoint = rawBaseUrl.endsWith('/send-prepaid-sms')
    ? rawBaseUrl
    : `${rawBaseUrl}/send-prepaid-sms`;
  const senderId = Deno.env.get('AIRTEL_DEFAULT_SENDER_ID')?.trim() || 'JCSPRL';
  const entityId = Deno.env.get('AIRTEL_DLT_PE_ID')?.trim() || '';

  const hasBasicAuth = Boolean(username && password);
  const hasBearerAuth = Boolean(apiKey);
  if (!customerId || (!hasBasicAuth && !hasBearerAuth)) {
    return {
      ok: false,
      provider: 'airtel_iq',
      error: 'Airtel IQ SMS gateway credentials are not configured on the server.',
    };
  }

  let digits = phoneE164.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;

  const authHeader = hasBasicAuth
    ? `Basic ${btoa(`${username}:${password}`)}`
    : `Bearer ${apiKey}`;

  // Try registered DLT OTP templates in priority order matching src/services/communications/templateRegistry.ts
  const candidates = [
    {
      dltTemplateId: '1077449880060256831',
      messageType: 'TRANSACTIONAL',
      message: `Your login OTP for Joy PeopleHR is ${otpCode}. Valid for ${expiryMinutes} minutes. Do not share this OTP with anyone. - Joy PeopleHR`,
    },
    {
      dltTemplateId: '1007961285745726410',
      messageType: 'SERVICE_IMPLICIT',
      message: `${otpCode} is your OTP for Joy Corporate Solutions Private Limited. Expires in ${expiryMinutes} minutes.`,
    },
  ];

  let lastError = 'SMS provider error';

  for (const candidate of candidates) {
    try {
      const requestBody: Record<string, unknown> = {
        customerId,
        destinationAddress: [digits],
        message: candidate.message,
        sourceAddress: senderId,
        dltTemplateId: candidate.dltTemplateId,
        messageType: candidate.messageType,
      };
      if (entityId) {
        requestBody.entityId = entityId;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(6500),
      });

      const payload = await response.json().catch(() => ({}));
      const accepted =
        response.ok &&
        !payload?.errorCode &&
        payload?.status !== 'FAILED' &&
        payload?.status !== 'ERROR';

      if (accepted) {
        return {
          ok: true,
          provider: 'airtel_iq',
          messageId:
            payload?.messageRequestId ||
            payload?.requestId ||
            payload?.messageId ||
            payload?.transactionId ||
            `airtel-${Date.now()}`,
        };
      }

      lastError =
        payload?.errorMessage ||
        payload?.displayMessage ||
        payload?.detail ||
        payload?.message ||
        payload?.description ||
        payload?.title ||
        payload?.errorCode ||
        `SMS provider error (${response.status})`;
    } catch (err: any) {
      lastError = err?.message || 'Network error calling Airtel IQ SMS gateway';
    }
  }

  return {
    ok: false,
    provider: 'airtel_iq',
    error: lastError,
  };
}

async function sendRecoveryEmailViaResend(
  toEmail: string,
  employeeName: string,
  resetLink: string
): Promise<{ ok: boolean; error?: string }> {
  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim() || '';
  if (!resendKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const fromEmail =
    Deno.env.get('RESEND_FROM_EMAIL') || 'JOY PeopleHR <noreply@joypeoplehr.com>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: 'Reset your JOY PeopleHR password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0F172A;">
            <h2 style="color: #07563D; margin-bottom: 12px;">JOY PeopleHR Password Recovery</h2>
            <p>Hello ${employeeName || 'Employee'},</p>
            <p>We received a request to reset the password for your JOY PeopleHR account.</p>
            <p style="margin: 24px 0;">
              <a href="${resetLink}" style="background-color: #07563D; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: bold;">Reset Password</a>
            </p>
            <p style="font-size: 13px; color: #64748B;">If you did not request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      return { ok: false, error: `Resend HTTP ${res.status}: ${errTxt}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Resend dispatch error' };
  }
}

async function mintSupabaseSessionForExistingUser(
  req: Request,
  supabaseAdmin: any,
  authUserId: string
): Promise<
  | { ok: true; session: any; authUser: any }
  | { ok: false; code: string; message: string }
> {
  const { data: userRes, error: userErr } =
    await supabaseAdmin.auth.admin.getUserById(authUserId);
  if (userErr || !userRes?.user) {
    return {
      ok: false,
      code: 'AUTH_IDENTITY_MISSING',
      message: 'Linked authentication identity was not found.',
    };
  }

  const authUser = userRes.user;
  if (!authUser.email) {
    return {
      ok: false,
      code: 'AUTH_EMAIL_REQUIRED',
      message:
        'Employee auth identity has no provisioning email for session issuance. Contact HR.',
    };
  }

  const { data: linkData, error: linkErr } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.email,
    });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkErr || !hashedToken) {
    return {
      ok: false,
      code: 'SESSION_MINT_FAILED',
      message: linkErr?.message || 'Could not establish session.',
    };
  }

  const ephemeral = createEphemeralAuthClient(req);
  const { data: verifyData, error: verifyErr } = await ephemeral.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'magiclink',
  });

  if (verifyErr || !verifyData?.session) {
    return {
      ok: false,
      code: 'SESSION_VERIFY_FAILED',
      message: verifyErr?.message || 'Failed to verify session token.',
    };
  }

  return {
    ok: true,
    session: {
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
      expires_in: verifyData.session.expires_in,
      token_type: verifyData.session.token_type,
    },
    authUser,
  };
}

async function requireAdminCaller(supabaseAdmin: any, ctx: any, requestedOrgId?: string | null) {
  const authUserId = ctx.userClaims?.id || ctx.jwtClaims?.sub;
  if (!authUserId || ctx.authMode !== 'user') {
    return { ok: false as const, status: 401, message: 'Authentication required.' };
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id, organization_id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!profile) {
    return { ok: false as const, status: 403, message: 'User profile not found.' };
  }

  const { data: memberships } = await supabaseAdmin
    .from('organization_memberships')
    .select('organization_id, role_code, status')
    .eq('user_id', profile.id)
    .eq('status', 'active');

  const isPlatformAdmin =
    ADMIN_ROLES.has((profile.role || '').toLowerCase()) &&
    ['platform_admin', 'super_admin', 'founder_super_admin'].includes(
      (profile.role || '').toLowerCase()
    );

  const matchingMem = (memberships || []).find(
    (m: any) =>
      (!requestedOrgId || m.organization_id === requestedOrgId) &&
      ADMIN_ROLES.has(String(m.role_code || '').toLowerCase())
  );

  const fallbackOrgRoleAllowed =
    (!requestedOrgId || profile.organization_id === requestedOrgId) &&
    ADMIN_ROLES.has(String(profile.role || '').toLowerCase());

  if (!isPlatformAdmin && !matchingMem && !fallbackOrgRoleAllowed) {
    return {
      ok: false as const,
      status: 403,
      message: 'HR or Admin privileges are required for this action.',
    };
  }

  return {
    ok: true as const,
    authUserId,
    userProfileId: profile.id,
    organizationId:
      requestedOrgId || matchingMem?.organization_id || profile.organization_id || null,
  };
}

export default {
  fetch: withSupabase({ auth: ['user', 'publishable:*'], cors: 'default' }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return Response.json({ ok: false, message: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    const meta = getRequestMetadata(req, body);
    const supabaseAdmin = ctx.supabaseAdmin;

    // -----------------------------------------------------------------------
    // 0. PUBLIC: LIGHTWEIGHT PRE-WARM PING (eliminates Deno cold-start lag)
    // -----------------------------------------------------------------------
    if (action === 'warmup' || action === 'ping') {
      return Response.json({
        ok: true,
        warm: true,
        ts: Date.now(),
      });
    }

    // -----------------------------------------------------------------------
    // 1. PUBLIC: FETCH ENABLED LOGIN METHODS & POLICY FOR LOGIN SCREEN
    // -----------------------------------------------------------------------
    if (action === 'get_login_config') {
      const requestedOrgId = body.organizationId ? String(body.organizationId) : null;
      const { policy, organizationName, companyName, organizationId } =
        await loadEffectiveAuthConfig(supabaseAdmin, requestedOrgId);
      const enabledMethods = getEnabledMethodsList(policy);

      return Response.json({
        ok: true,
        organizationId: policy.organizationId || organizationId,
        organizationName,
        companyName,
        enabledMethods,
        defaultLoginMethod: policy.defaultLoginMethod,
        factoryRecommendedMethod: policy.factoryRecommendedMethod,
        otpProvider: policy.otpProvider,
        otpProviderConfigured: Boolean(
          Deno.env.get('AIRTEL_CUSTOMER_ID') &&
            Deno.env.get('AIRTEL_IQ_USERNAME') &&
            Deno.env.get('AIRTEL_IQ_PASSWORD')
        ),
        emailProviderConfigured: Boolean(Deno.env.get('RESEND_API_KEY')),
        otpExpirySeconds: policy.otpExpirySeconds,
        otpResendCooldownSeconds: policy.otpResendCooldownSeconds,
        otpMaxAttempts: policy.otpMaxAttempts,
        passwordPolicy: policy.passwordPolicy,
        lockoutPolicy: policy.lockoutPolicy,
        sessionPolicy: policy.sessionPolicy,
        allowedEmployeeGroups: policy.allowedEmployeeGroups,
        roleSpecificPolicies: policy.roleSpecificPolicies,
      });
    }

    // -----------------------------------------------------------------------
    // 2. PASSWORD AUTHENTICATION (Employee ID / Mobile / Email + Password)
    // -----------------------------------------------------------------------
    if (action === 'login_with_password') {
      const method = String(body.method || '');
      const identifier = String(body.identifier || '').trim();
      const password = String(body.password || '');
      const countryCode = String(body.countryCode || '+91');
      const requestedOrgId = body.organizationId ? String(body.organizationId) : null;

      if (
        !isValidLoginMethod(method) ||
        method === 'mobile_otp'
      ) {
        return Response.json(
          { ok: false, code: 'INVALID_METHOD', message: 'Unsupported password login method.' },
          { status: 400 }
        );
      }

      const rateCheck = await checkRateLimit(req, {
        profile: 'AUTH_LOGIN',
        maxRequests: 25,
        windowSeconds: 300,
        identifier: `${method}:${identifier.toLowerCase()}`,
      });
      if (!rateCheck.allowed) {
        return Response.json(
          {
            ok: false,
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please wait a few minutes and try again.',
          },
          { status: 429 }
        );
      }

      if (!identifier || !password) {
        return Response.json(
          {
            ok: false,
            code: 'MISSING_CREDENTIALS',
            message: 'Please enter both your login credential and password.',
          },
          { status: 400 }
        );
      }

      // First resolve identity (single existing account)
      const resolved = await resolveSingleIdentityByMethod(
        supabaseAdmin,
        method,
        identifier,
        requestedOrgId,
        countryCode
      );

      if (!resolved.ok) {
        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: resolved.organizationId || requestedOrgId,
          loginMethod: method,
          eventType:
            resolved.code === 'DUPLICATE_PHONE' ? 'method_blocked' : 'login_failed',
          status: resolved.code === 'DUPLICATE_PHONE' ? 'blocked' : 'failed',
          failureReason: resolved.code,
          maskedIdentifier: maskIdentifier(method, identifier),
          ...meta,
        });
        return Response.json(
          { ok: false, code: resolved.code, message: resolved.message },
          { status: 400 }
        );
      }

      const identity = resolved.identity;
      const targetOrgId = requestedOrgId || identity.organizationId;
      const { policy } = await loadEffectiveAuthConfig(supabaseAdmin, targetOrgId);

      // Enforce HR Auth Configuration server-side
      const methodCheck = isMethodEnabledByConfig(method, policy, {
        roleCode: identity.roleCode,
        employeeGroup: identity.employmentType,
      });
      if (!methodCheck.allowed) {
        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: targetOrgId,
          authUserId: identity.authUserId,
          userProfileId: identity.userProfileId,
          employeeId: identity.employeeId,
          employeeCode: identity.employeeCode,
          loginMethod: method,
          eventType: 'method_blocked',
          status: 'blocked',
          failureReason: methodCheck.code,
          maskedIdentifier: maskIdentifier(method, identifier),
          ...meta,
        });
        return Response.json(
          { ok: false, code: methodCheck.code, message: methodCheck.reason },
          { status: 403 }
        );
      }

      // Account status enforcement (disabled/terminated/suspended vs pending)
      if (
        isAccountBlockedStatus(identity.employeeStatus) ||
        isAccountBlockedStatus(identity.profileStatus)
      ) {
        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: targetOrgId,
          authUserId: identity.authUserId,
          userProfileId: identity.userProfileId,
          employeeId: identity.employeeId,
          employeeCode: identity.employeeCode,
          loginMethod: method,
          eventType: 'login_failed',
          status: 'blocked',
          failureReason: 'ACCOUNT_DISABLED',
          maskedIdentifier: maskIdentifier(method, identifier),
          ...meta,
        });
        return Response.json(
          {
            ok: false,
            code: 'ACCOUNT_DISABLED',
            message:
              'Your account is disabled or inactive. Please contact your HR department.',
          },
          { status: 403 }
        );
      }

      if (
        isPendingOnboardingStatus(identity.employeeStatus) ||
        isPendingOnboardingStatus(identity.profileStatus)
      ) {
        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: targetOrgId,
          authUserId: identity.authUserId,
          userProfileId: identity.userProfileId,
          employeeId: identity.employeeId,
          employeeCode: identity.employeeCode,
          loginMethod: method,
          eventType: 'login_failed',
          status: 'blocked',
          failureReason: 'ONBOARDING_PENDING',
          maskedIdentifier: maskIdentifier(method, identifier),
          ...meta,
        });
        return Response.json(
          {
            ok: false,
            code: 'ONBOARDING_PENDING',
            message:
              'Your employee onboarding activation is pending. Please check your invitation email/SMS or contact HR.',
          },
          { status: 403 }
        );
      }

      // Lockout check
      const lockoutKey = `uid:${identity.authUserId}`;
      const lockState = await checkLockoutState(supabaseAdmin, lockoutKey);
      if (lockState.locked) {
        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: targetOrgId,
          authUserId: identity.authUserId,
          userProfileId: identity.userProfileId,
          employeeId: identity.employeeId,
          employeeCode: identity.employeeCode,
          loginMethod: method,
          eventType: 'login_failed',
          status: 'blocked',
          failureReason: 'ACCOUNT_LOCKED',
          maskedIdentifier: maskIdentifier(method, identifier),
          ...meta,
        });
        return Response.json(
          {
            ok: false,
            code: 'ACCOUNT_LOCKED',
            lockoutUntil: lockState.lockedUntil,
            message:
              'Your account is temporarily locked due to multiple failed sign-in attempts. Use Forgot Password or contact HR to unlock.',
          },
          { status: 423 }
        );
      }

      // Fetch exact Supabase Auth email for this canonical user ID
      const { data: adminUserRes } = await supabaseAdmin.auth.admin.getUserById(
        identity.authUserId
      );
      const canonicalAuthEmail = adminUserRes?.user?.email;
      if (!canonicalAuthEmail) {
        return Response.json(
          {
            ok: false,
            code: 'AUTH_IDENTITY_INCOMPLETE',
            message:
              'Your login identity is missing an email mapping. Please contact HR to complete activation.',
          },
          { status: 400 }
        );
      }

      // Verify password against Supabase Auth
      const ephemeral = createEphemeralAuthClient(req);
      const { data: signInData, error: signInErr } =
        await ephemeral.auth.signInWithPassword({
          email: canonicalAuthEmail,
          password,
        });

      if (signInErr || !signInData?.session) {
        const failRes = await recordFailedAttemptLockout(
          supabaseAdmin,
          lockoutKey,
          identity.authUserId,
          targetOrgId,
          policy,
          'INVALID_PASSWORD'
        );

        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: targetOrgId,
          authUserId: identity.authUserId,
          userProfileId: identity.userProfileId,
          employeeId: identity.employeeId,
          employeeCode: identity.employeeCode,
          loginMethod: method,
          eventType: failRes.lockedNow ? 'lockout_triggered' : 'login_failed',
          status: failRes.lockedNow ? 'blocked' : 'failed',
          failureReason: failRes.lockedNow ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
          maskedIdentifier: maskIdentifier(method, identifier),
          ...meta,
        });

        return Response.json(
          {
            ok: false,
            code: failRes.lockedNow ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
            remainingAttempts: failRes.remainingAttempts,
            lockoutUntil: failRes.lockedUntil,
            message: failRes.lockedNow
              ? `Account locked for ${policy.lockoutPolicy.lockoutMinutes} minutes after repeated failed attempts.`
              : 'Incorrect password. Please try again or reset your password.',
          },
          { status: failRes.lockedNow ? 423 : 401 }
        );
      }

      // Clear lockout, update last_login_at, write audit log
      await Promise.all([
        clearLockoutState(supabaseAdmin, lockoutKey),
        supabaseAdmin
          .from('user_profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', identity.userProfileId),
        writeAuthAuditLog(supabaseAdmin, {
          organizationId: targetOrgId,
          authUserId: identity.authUserId,
          userProfileId: identity.userProfileId,
          employeeId: identity.employeeId,
          employeeCode: identity.employeeCode,
          loginMethod: method,
          eventType: 'login_success',
          status: 'success',
          maskedIdentifier: maskIdentifier(method, identifier),
          ...meta,
        }),
      ]);

      const mustChangePassword = Boolean(
        adminUserRes?.user?.user_metadata?.must_change_password
      );
      const companies = identity.memberships;

      return Response.json({
        ok: true,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_in: signInData.session.expires_in,
          token_type: signInData.session.token_type,
        },
        requiresCompanySelection: companies.length > 1,
        companies,
        activeContext: {
          organizationId: targetOrgId,
          organizationName: identity.organizationName,
          employeeId: identity.employeeId,
          employeeCode: identity.employeeCode,
          roleCode: identity.roleCode,
          destinationRoute: resolveDestinationRoute(identity.roleCode),
          mustChangePassword,
          status: identity.employeeStatus || identity.profileStatus || 'active',
        },
      });
    }

    // -----------------------------------------------------------------------
    // 3. REQUEST MOBILE OTP (SMS Login)
    // -----------------------------------------------------------------------
    if (action === 'request_login_otp') {
      const mobile = String(body.mobile || body.identifier || '').trim();
      const countryCode = String(body.countryCode || '+91');
      const requestedOrgId = body.organizationId ? String(body.organizationId) : null;
      const purpose = body.purpose === 'password_reset' ? 'password_reset' : 'login';

      const normalizedE164 = normalizePhoneToE164(mobile, countryCode);
      if (!normalizedE164) {
        return Response.json(
          {
            ok: false,
            code: 'INVALID_PHONE',
            message: 'Please enter a valid 10-digit mobile number.',
          },
          { status: 400 }
        );
      }

      const [rateCheck, resolved, preloadedCfg] = await Promise.all([
        checkRateLimit(req, {
          profile: 'AUTH_OTP_REQUEST',
          maxRequests: 6,
          windowSeconds: 300,
          identifier: normalizedE164,
        }),
        resolveSingleIdentityByMethod(
          supabaseAdmin,
          'mobile_otp',
          normalizedE164,
          requestedOrgId,
          countryCode
        ),
        loadEffectiveAuthConfig(supabaseAdmin, requestedOrgId),
      ]);

      if (!rateCheck.allowed) {
        return Response.json(
          {
            ok: false,
            code: 'RATE_LIMITED',
            message: 'Too many OTP requests. Please wait a few minutes before retrying.',
          },
          { status: 429 }
        );
      }

      if (!resolved.ok) {
        runBackground(
          writeAuthAuditLog(supabaseAdmin, {
            organizationId: resolved.organizationId || requestedOrgId,
            loginMethod: purpose === 'password_reset' ? 'password_recovery' : 'mobile_otp',
            eventType:
              resolved.code === 'DUPLICATE_PHONE' ? 'method_blocked' : 'otp_failed',
            status: resolved.code === 'DUPLICATE_PHONE' ? 'blocked' : 'failed',
            failureReason: resolved.code,
            maskedIdentifier: maskIdentifier('mobile_otp', normalizedE164),
            ...meta,
          })
        );
        return Response.json(
          { ok: false, code: resolved.code, message: resolved.message },
          { status: 400 }
        );
      }

      const identity = resolved.identity;
      const targetOrgId = requestedOrgId || identity.organizationId;
      const lockoutKey = `uid:${identity.authUserId}`;

      const [{ policy }, lockState, { data: recentChallenge }] = await Promise.all([
        targetOrgId === requestedOrgId
          ? Promise.resolve(preloadedCfg)
          : loadEffectiveAuthConfig(supabaseAdmin, targetOrgId),
        checkLockoutState(supabaseAdmin, lockoutKey),
        supabaseAdmin
          .from('auth_otp_challenges')
          .select('id, resend_available_at')
          .eq('phone_e164', normalizedE164)
          .eq('purpose', purpose)
          .is('consumed_at', null)
          .is('invalidated_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (purpose === 'login') {
        const methodCheck = isMethodEnabledByConfig('mobile_otp', policy, {
          roleCode: identity.roleCode,
          employeeGroup: identity.employmentType,
        });
        if (!methodCheck.allowed) {
          runBackground(
            writeAuthAuditLog(supabaseAdmin, {
              organizationId: targetOrgId,
              authUserId: identity.authUserId,
              userProfileId: identity.userProfileId,
              employeeId: identity.employeeId,
              employeeCode: identity.employeeCode,
              loginMethod: 'mobile_otp',
              eventType: 'method_blocked',
              status: 'blocked',
              failureReason: methodCheck.code,
              maskedIdentifier: maskIdentifier('mobile_otp', normalizedE164),
              ...meta,
            })
          );
          return Response.json(
            { ok: false, code: methodCheck.code, message: methodCheck.reason },
            { status: 403 }
          );
        }
      }

      if (
        isAccountBlockedStatus(identity.employeeStatus) ||
        isAccountBlockedStatus(identity.profileStatus)
      ) {
        return Response.json(
          {
            ok: false,
            code: 'ACCOUNT_DISABLED',
            message: 'This employee account is disabled. Please contact HR.',
          },
          { status: 403 }
        );
      }

      if (lockState.locked) {
        return Response.json(
          {
            ok: false,
            code: 'ACCOUNT_LOCKED',
            lockoutUntil: lockState.lockedUntil,
            message:
              'Account temporarily locked due to repeated failed attempts. Try again later or contact HR.',
          },
          { status: 423 }
        );
      }

      if (recentChallenge?.resend_available_at) {
        const remainingMs =
          new Date(recentChallenge.resend_available_at).getTime() - Date.now();
        if (remainingMs > 0) {
          const waitSeconds = Math.ceil(remainingMs / 1000);
          return Response.json(
            {
              ok: false,
              code: 'OTP_COOLDOWN',
              cooldownSeconds: waitSeconds,
              message: `Please wait ${waitSeconds}s before requesting another OTP.`,
            },
            { status: 429 }
          );
        }
      }

      // Generate CSPRNG OTP and cryptographic hash, then invalidate old + store new in parallel
      const challengeId = crypto.randomUUID();
      const otpCode = generateSecureOtp(6);
      const otpHash = await hashOtpCode(otpCode, challengeId, getOtpPepper());
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const expiresAt = new Date(
        nowMs + policy.otpExpirySeconds * 1000
      ).toISOString();
      const resendAvailableAt = new Date(
        nowMs + policy.otpResendCooldownSeconds * 1000
      ).toISOString();

      const [, { error: insertErr }] = await Promise.all([
        recentChallenge?.id
          ? supabaseAdmin
              .from('auth_otp_challenges')
              .update({ invalidated_at: nowIso })
              .eq('phone_e164', normalizedE164)
              .eq('purpose', purpose)
              .neq('id', challengeId)
              .is('consumed_at', null)
              .is('invalidated_at', null)
          : Promise.resolve(),
        supabaseAdmin.from('auth_otp_challenges').insert({
          id: challengeId,
          organization_id: targetOrgId,
          user_profile_id: identity.userProfileId,
          auth_user_id: identity.authUserId,
          employee_id: identity.employeeId,
          purpose,
          phone_e164: normalizedE164,
          otp_hash: otpHash,
          provider: policy.otpProvider,
          attempts: 0,
          max_attempts: policy.otpMaxAttempts,
          expires_at: expiresAt,
          resend_available_at: resendAvailableAt,
          ip_address: meta.ipAddress,
          user_agent: meta.userAgent,
          device_platform: meta.devicePlatform,
        }),
      ]);

      if (insertErr) {
        return Response.json(
          {
            ok: false,
            code: 'CHALLENGE_STORE_ERROR',
            message: 'Unable to initiate OTP verification right now.',
          },
          { status: 500 }
        );
      }

      // Dispatch real SMS via Airtel IQ
      const expiryMinutes = Math.max(1, Math.round(policy.otpExpirySeconds / 60));
      const smsRes = await sendAirtelOtpSms(normalizedE164, otpCode, expiryMinutes);

      if (!smsRes.ok) {
        runBackground(
          Promise.all([
            supabaseAdmin
              .from('auth_otp_challenges')
              .update({ invalidated_at: new Date().toISOString() })
              .eq('id', challengeId),
            writeAuthAuditLog(supabaseAdmin, {
              organizationId: targetOrgId,
              authUserId: identity.authUserId,
              userProfileId: identity.userProfileId,
              employeeId: identity.employeeId,
              employeeCode: identity.employeeCode,
              loginMethod: purpose === 'password_reset' ? 'password_recovery' : 'mobile_otp',
              eventType: 'otp_failed',
              status: 'failed',
              failureReason: smsRes.error || 'SMS_DELIVERY_FAILED',
              maskedIdentifier: maskIdentifier('mobile_otp', normalizedE164),
              ...meta,
            }),
          ])
        );

        return Response.json(
          {
            ok: false,
            code: 'SMS_DELIVERY_FAILED',
            message:
              smsRes.error ||
              'SMS OTP delivery failed. Please retry or use another enabled login method.',
          },
          { status: 502 }
        );
      }

      runBackground(
        Promise.all([
          supabaseAdmin
            .from('auth_otp_challenges')
            .update({ provider_message_id: smsRes.messageId || null })
            .eq('id', challengeId),
          writeAuthAuditLog(supabaseAdmin, {
            organizationId: targetOrgId,
            authUserId: identity.authUserId,
            userProfileId: identity.userProfileId,
            employeeId: identity.employeeId,
            employeeCode: identity.employeeCode,
            loginMethod: purpose === 'password_reset' ? 'password_recovery' : 'mobile_otp',
            eventType: 'otp_requested',
            status: 'success',
            maskedIdentifier: maskIdentifier('mobile_otp', normalizedE164),
            metadata: { provider: smsRes.provider, messageId: smsRes.messageId },
            ...meta,
          }),
        ])
      );

      return Response.json({
        ok: true,
        challengeId,
        maskedDestination: maskIdentifier('mobile_otp', normalizedE164),
        expiresInSeconds: policy.otpExpirySeconds,
        cooldownSeconds: policy.otpResendCooldownSeconds,
        provider: smsRes.provider,
        organizationId: null,
        organizationName: null,
        companyName: null,
        message: 'OTP sent to your registered mobile number.',
      });
    }

    // -----------------------------------------------------------------------
    // 4. VERIFY MOBILE OTP LOGIN
    // -----------------------------------------------------------------------
    if (action === 'verify_login_otp') {
      const challengeId = String(body.challengeId || '').trim();
      const otpCode = String(body.otp || '').trim();

      if (!challengeId || !/^\d{4,8}$/.test(otpCode)) {
        return Response.json(
          {
            ok: false,
            code: 'INVALID_OTP_FORMAT',
            message: 'Please enter the 6-digit verification code sent to your mobile.',
          },
          { status: 400 }
        );
      }

      const { data: challenge } = await supabaseAdmin
        .from('auth_otp_challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('purpose', 'login')
        .maybeSingle();

      if (!challenge) {
        return Response.json(
          {
            ok: false,
            code: 'OTP_CHALLENGE_NOT_FOUND',
            message: 'OTP session not found or already closed. Request a new OTP.',
          },
          { status: 400 }
        );
      }

      if (challenge.consumed_at || challenge.invalidated_at) {
        return Response.json(
          {
            ok: false,
            code: 'OTP_ALREADY_USED',
            message: 'This OTP is no longer active. Please request a new OTP.',
          },
          { status: 400 }
        );
      }

      if (new Date(challenge.expires_at).getTime() <= Date.now()) {
        return Response.json(
          {
            ok: false,
            code: 'OTP_EXPIRED',
            message: 'This OTP has expired. Please tap Resend OTP.',
          },
          { status: 400 }
        );
      }

      if (Number(challenge.attempts) >= Number(challenge.max_attempts)) {
        return Response.json(
          {
            ok: false,
            code: 'OTP_MAX_ATTEMPTS',
            message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
          },
          { status: 429 }
        );
      }

      const expectedHash = await hashOtpCode(otpCode, challengeId, getOtpPepper());
      if (!constantTimeEqual(expectedHash, String(challenge.otp_hash))) {
        const nextAttempts = Number(challenge.attempts) + 1;
        const exhausted = nextAttempts >= Number(challenge.max_attempts);
        await supabaseAdmin
          .from('auth_otp_challenges')
          .update({
            attempts: nextAttempts,
            invalidated_at: exhausted ? new Date().toISOString() : null,
          })
          .eq('id', challengeId);

        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: challenge.organization_id,
          authUserId: challenge.auth_user_id,
          userProfileId: challenge.user_profile_id,
          employeeId: challenge.employee_id,
          loginMethod: 'mobile_otp',
          eventType: 'otp_failed',
          status: 'failed',
          failureReason: exhausted ? 'OTP_MAX_ATTEMPTS' : 'OTP_MISMATCH',
          maskedIdentifier: maskIdentifier('mobile_otp', challenge.phone_e164),
          ...meta,
        });

        return Response.json(
          {
            ok: false,
            code: exhausted ? 'OTP_MAX_ATTEMPTS' : 'OTP_INVALID',
            remainingAttempts: Math.max(0, Number(challenge.max_attempts) - nextAttempts),
            message: exhausted
              ? 'Too many incorrect OTP attempts. Please request a new OTP.'
              : 'Invalid OTP code. Please check your SMS and try again.',
          },
          { status: 401 }
        );
      }

      // Valid OTP -> consume atomically and verify config + status again before minting session
      const { data: consumedRow } = await supabaseAdmin
        .from('auth_otp_challenges')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', challengeId)
        .is('consumed_at', null)
        .select('*')
        .maybeSingle();

      if (!consumedRow) {
        return Response.json(
          {
            ok: false,
            code: 'OTP_ALREADY_USED',
            message: 'OTP has already been used.',
          },
          { status: 400 }
        );
      }

      // Resolve identity, memberships, and mint session concurrently
      const [{ data: empRow }, { data: profileRow }, minted, memberships] =
        await Promise.all([
          challenge.employee_id
            ? supabaseAdmin
                .from('employees')
                .select(
                  'id, organization_id, company_id, user_id, employee_code, display_name, work_email, phone, employment_type, employment_status'
                )
                .eq('id', challenge.employee_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabaseAdmin
            .from('user_profiles')
            .select(
              'id, auth_user_id, organization_id, employee_id, email, full_name, phone, status, role'
            )
            .eq('auth_user_id', challenge.auth_user_id)
            .maybeSingle(),
          mintSupabaseSessionForExistingUser(
            req,
            supabaseAdmin,
            challenge.auth_user_id
          ),
          loadMembershipsForProfile(
            supabaseAdmin,
            challenge.user_profile_id || challenge.auth_user_id,
            challenge.organization_id,
            challenge.employee_id,
            null,
            'employee'
          ),
        ]);

      if (
        isAccountBlockedStatus(empRow?.employment_status) ||
        isAccountBlockedStatus(profileRow?.status)
      ) {
        return Response.json(
          {
            ok: false,
            code: 'ACCOUNT_DISABLED',
            message: 'Your employee account is inactive. Please contact HR.',
          },
          { status: 403 }
        );
      }

      if (!minted.ok) {
        return Response.json(
          { ok: false, code: minted.code, message: minted.message },
          { status: 500 }
        );
      }

      const resolvedMemberships =
        memberships.length > 0 || !profileRow?.id || profileRow.id === challenge.user_profile_id
          ? memberships
          : await loadMembershipsForProfile(
              supabaseAdmin,
              profileRow.id,
              empRow?.organization_id || challenge.organization_id || profileRow.organization_id,
              challenge.employee_id,
              empRow?.employee_code,
              profileRow.role || 'employee'
            );
      const primaryMem =
        resolvedMemberships.find((m) => m.isDefault) || resolvedMemberships[0];
      const roleCode = primaryMem?.roleCode || profileRow?.role || 'employee';

      runBackground(
        Promise.all([
          clearLockoutState(supabaseAdmin, `uid:${challenge.auth_user_id}`),
          (challenge.user_profile_id || profileRow?.id)
            ? supabaseAdmin
                .from('user_profiles')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', challenge.user_profile_id || profileRow?.id)
            : Promise.resolve(),
          writeAuthAuditLog(supabaseAdmin, {
            organizationId: challenge.organization_id,
            authUserId: challenge.auth_user_id,
            userProfileId: challenge.user_profile_id || profileRow?.id,
            employeeId: challenge.employee_id,
            employeeCode: empRow?.employee_code || primaryMem?.employeeCode || null,
            loginMethod: 'mobile_otp',
            eventType: 'login_success',
            status: 'success',
            maskedIdentifier: maskIdentifier('mobile_otp', challenge.phone_e164),
            metadata: { challengeId },
            ...meta,
          }),
        ])
      );

      return Response.json({
        ok: true,
        session: minted.session,
        requiresCompanySelection: resolvedMemberships.length > 1,
        companies: resolvedMemberships,
        activeContext: {
          organizationId: primaryMem?.organizationId || challenge.organization_id,
          organizationName: primaryMem?.organizationName || null,
          companyName: primaryMem?.companyName || primaryMem?.organizationName || null,
          employeeId: challenge.employee_id,
          employeeCode: empRow?.employee_code || primaryMem?.employeeCode || null,
          roleCode,
          destinationRoute: resolveDestinationRoute(roleCode),
          mustChangePassword: Boolean(minted.authUser?.user_metadata?.must_change_password),
          status: empRow?.employment_status || profileRow?.status || 'active',
        },
      });
    }

    // -----------------------------------------------------------------------
    // 5. ACCOUNT & PASSWORD RECOVERY (Email Reset OR Mobile OTP Reset)
    // -----------------------------------------------------------------------
    if (action === 'request_password_recovery') {
      const recoveryMethod = body.recoveryMethod === 'mobile_otp' ? 'mobile_otp' : 'email';
      const identifier = String(body.identifier || '').trim();
      const countryCode = String(body.countryCode || '+91');
      const redirectTo =
        String(body.redirectTo || '').trim() ||
        `${Deno.env.get('APP_URL') || 'https://app.joypeoplehr.com'}/auth/reset-password`;

      if (!identifier) {
        return Response.json(
          { ok: false, code: 'MISSING_IDENTIFIER', message: 'Enter your registered email, employee ID, or mobile number.' },
          { status: 400 }
        );
      }

      if (recoveryMethod === 'mobile_otp') {
        // Re-use OTP dispatch flow with purpose = password_reset
        const normalizedE164 = normalizePhoneToE164(identifier, countryCode);
        if (!normalizedE164) {
          return Response.json(
            { ok: false, code: 'INVALID_PHONE', message: 'Enter a valid 10-digit registered mobile number.' },
            { status: 400 }
          );
        }

        const resolved = await resolveSingleIdentityByMethod(
          supabaseAdmin,
          'mobile_otp',
          normalizedE164,
          null,
          countryCode
        );
        if (!resolved.ok) {
          return Response.json(
            { ok: false, code: resolved.code, message: resolved.message },
            { status: 400 }
          );
        }

        const identity = resolved.identity;
        const { policy } = await loadEffectiveAuthConfig(supabaseAdmin, identity.organizationId);
        const challengeId = crypto.randomUUID();
        const otpCode = generateSecureOtp(6);
        const otpHash = await hashOtpCode(otpCode, challengeId, getOtpPepper());
        const nowMs = Date.now();

        await supabaseAdmin
          .from('auth_otp_challenges')
          .update({ invalidated_at: new Date().toISOString() })
          .eq('phone_e164', normalizedE164)
          .eq('purpose', 'password_reset')
          .is('consumed_at', null);

        await supabaseAdmin.from('auth_otp_challenges').insert({
          id: challengeId,
          organization_id: identity.organizationId,
          user_profile_id: identity.userProfileId,
          auth_user_id: identity.authUserId,
          employee_id: identity.employeeId,
          purpose: 'password_reset',
          phone_e164: normalizedE164,
          otp_hash: otpHash,
          provider: 'airtel_iq',
          attempts: 0,
          max_attempts: policy.otpMaxAttempts,
          expires_at: new Date(nowMs + policy.otpExpirySeconds * 1000).toISOString(),
          resend_available_at: new Date(nowMs + policy.otpResendCooldownSeconds * 1000).toISOString(),
          ip_address: meta.ipAddress,
          user_agent: meta.userAgent,
          device_platform: meta.devicePlatform,
        });

        const smsRes = await sendAirtelOtpSms(
          normalizedE164,
          otpCode,
          Math.max(1, Math.round(policy.otpExpirySeconds / 60))
        );
        if (!smsRes.ok) {
          return Response.json(
            { ok: false, code: 'SMS_DELIVERY_FAILED', message: smsRes.error || 'Failed to send reset OTP.' },
            { status: 502 }
          );
        }

        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: identity.organizationId,
          authUserId: identity.authUserId,
          userProfileId: identity.userProfileId,
          employeeId: identity.employeeId,
          loginMethod: 'password_recovery',
          eventType: 'password_reset_requested',
          status: 'success',
          maskedIdentifier: maskIdentifier('mobile_otp', normalizedE164),
          ...meta,
        });

        return Response.json({
          ok: true,
          challengeId,
          maskedDestination: maskIdentifier('mobile_otp', normalizedE164),
          expiresInSeconds: policy.otpExpirySeconds,
          cooldownSeconds: policy.otpResendCooldownSeconds,
          message: 'Password reset OTP sent to your registered mobile number.',
        });
      }

      // Email recovery (supports Email or Employee ID resolving to registered email)
      const methodToLookup: LoginMethod = identifier.includes('@')
        ? 'email_password'
        : 'employee_id_password';
      const resolved = await resolveSingleIdentityByMethod(
        supabaseAdmin,
        methodToLookup,
        identifier
      );

      // Avoid leaking existence on unknown email unless Employee ID clearly absent
      if (resolved.ok && resolved.identity.email) {
        const identity = resolved.identity;
        const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(
          identity.authUserId
        );
        const targetEmail = adminUser?.user?.email || identity.email;

        if (targetEmail && !targetEmail.endsWith('.local')) {
          const { data: genData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: targetEmail,
            options: { redirectTo },
          });
          const actionLink = genData?.properties?.action_link;
          if (actionLink) {
            await sendRecoveryEmailViaResend(
              targetEmail,
              identity.fullName || 'Employee',
              actionLink
            );
          } else {
            const ephemeral = createEphemeralAuthClient(req);
            await ephemeral.auth.resetPasswordForEmail(targetEmail, { redirectTo });
          }

          await writeAuthAuditLog(supabaseAdmin, {
            organizationId: identity.organizationId,
            authUserId: identity.authUserId,
            userProfileId: identity.userProfileId,
            employeeId: identity.employeeId,
            employeeCode: identity.employeeCode,
            loginMethod: 'password_recovery',
            eventType: 'password_reset_requested',
            status: 'success',
            maskedIdentifier: maskIdentifier('email_password', targetEmail),
            ...meta,
          });
        }
      }

      return Response.json({
        ok: true,
        message:
          'If an active account matches your details, password reset instructions have been sent.',
      });
    }

    if (action === 'verify_recovery_otp_reset') {
      const challengeId = String(body.challengeId || '').trim();
      const otpCode = String(body.otp || '').trim();
      const newPassword = String(body.newPassword || '');

      if (!challengeId || !/^\d{4,8}$/.test(otpCode)) {
        return Response.json(
          { ok: false, code: 'INVALID_OTP', message: 'Enter the 6-digit OTP.' },
          { status: 400 }
        );
      }

      const { data: challenge } = await supabaseAdmin
        .from('auth_otp_challenges')
        .select('*')
        .eq('id', challengeId)
        .eq('purpose', 'password_reset')
        .maybeSingle();

      if (
        !challenge ||
        challenge.consumed_at ||
        challenge.invalidated_at ||
        new Date(challenge.expires_at).getTime() <= Date.now()
      ) {
        return Response.json(
          { ok: false, code: 'OTP_EXPIRED', message: 'Reset OTP has expired or is invalid. Request a new OTP.' },
          { status: 400 }
        );
      }

      const { policy } = await loadEffectiveAuthConfig(
        supabaseAdmin,
        challenge.organization_id
      );
      const strength = validatePasswordStrength(newPassword, policy.passwordPolicy);
      if (!strength.valid) {
        return Response.json(
          { ok: false, code: 'WEAK_PASSWORD', message: strength.errors.join(' ') },
          { status: 400 }
        );
      }

      const expectedHash = await hashOtpCode(otpCode, challengeId, getOtpPepper());
      if (!constantTimeEqual(expectedHash, String(challenge.otp_hash))) {
        const nextAttempts = Number(challenge.attempts) + 1;
        await supabaseAdmin
          .from('auth_otp_challenges')
          .update({
            attempts: nextAttempts,
            invalidated_at:
              nextAttempts >= Number(challenge.max_attempts)
                ? new Date().toISOString()
                : null,
          })
          .eq('id', challengeId);

        return Response.json(
          { ok: false, code: 'OTP_INVALID', message: 'Invalid OTP code.' },
          { status: 401 }
        );
      }

      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
        challenge.auth_user_id,
        {
          password: newPassword,
          user_metadata: { must_change_password: false },
        }
      );

      if (updErr) {
        return Response.json(
          { ok: false, code: 'PASSWORD_UPDATE_FAILED', message: updErr.message },
          { status: 500 }
        );
      }

      await Promise.all([
        supabaseAdmin
          .from('auth_otp_challenges')
          .update({ consumed_at: new Date().toISOString() })
          .eq('id', challengeId),
        clearLockoutState(supabaseAdmin, `uid:${challenge.auth_user_id}`),
        writeAuthAuditLog(supabaseAdmin, {
          organizationId: challenge.organization_id,
          authUserId: challenge.auth_user_id,
          userProfileId: challenge.user_profile_id,
          employeeId: challenge.employee_id,
          loginMethod: 'password_recovery',
          eventType: 'password_reset_completed',
          status: 'success',
          maskedIdentifier: maskIdentifier('mobile_otp', challenge.phone_e164),
          ...meta,
        }),
      ]);

      return Response.json({
        ok: true,
        message: 'Your password has been updated. You can now sign in with your new password.',
      });
    }

    // -----------------------------------------------------------------------
    // AUTHENTICATED ENDPOINTS (Require valid user JWT via ctx.authMode === 'user')
    // -----------------------------------------------------------------------
    const callerUserId = ctx.userClaims?.id || ctx.jwtClaims?.sub;
    if (!callerUserId || ctx.authMode !== 'user') {
      return Response.json(
        { ok: false, code: 'UNAUTHORIZED', message: 'Valid user authentication required.' },
        { status: 401 }
      );
    }

    // 6. POST-LOGIN CONTEXT & MULTI-COMPANY MEMBERSHIPS
    if (action === 'get_post_login_context') {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, auth_user_id, organization_id, employee_id, email, full_name, phone, status, role')
        .eq('auth_user_id', callerUserId)
        .maybeSingle();

      if (!profile) {
        return Response.json({ ok: false, message: 'User profile not found.' }, { status: 404 });
      }

      const { data: empRow } = profile.employee_id
        ? await supabaseAdmin
            .from('employees')
            .select('id, employee_code, organization_id, company_id, employment_status')
            .eq('id', profile.employee_id)
            .maybeSingle()
        : { data: null };

      const memberships = await loadMembershipsForProfile(
        supabaseAdmin,
        profile.id,
        empRow?.organization_id || profile.organization_id,
        profile.employee_id,
        empRow?.employee_code,
        profile.role || 'employee'
      );

      const primary = memberships.find((m) => m.isDefault) || memberships[0];
      const roleCode = primary?.roleCode || profile.role || 'employee';

      return Response.json({
        ok: true,
        requiresCompanySelection: memberships.length > 1,
        companies: memberships,
        activeContext: {
          organizationId: primary?.organizationId || profile.organization_id,
          organizationName: primary?.organizationName || null,
          employeeId: primary?.employeeId || profile.employee_id,
          employeeCode: primary?.employeeCode || empRow?.employee_code || null,
          roleCode,
          destinationRoute: resolveDestinationRoute(roleCode),
          status: empRow?.employment_status || profile.status || 'active',
        },
      });
    }

    // 7. SWITCH COMPANY / ORGANIZATION CONTEXT
    if (action === 'switch_company_context') {
      const targetOrgId = String(body.organizationId || '').trim();
      if (!targetOrgId) {
        return Response.json({ ok: false, message: 'organizationId is required.' }, { status: 400 });
      }

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, organization_id, employee_id, role')
        .eq('auth_user_id', callerUserId)
        .maybeSingle();

      if (!profile) {
        return Response.json({ ok: false, message: 'Profile not found.' }, { status: 404 });
      }

      const memberships = await loadMembershipsForProfile(
        supabaseAdmin,
        profile.id,
        profile.organization_id,
        profile.employee_id,
        null,
        profile.role || 'employee'
      );

      const chosen = memberships.find((m) => m.organizationId === targetOrgId);
      if (!chosen) {
        return Response.json(
          { ok: false, code: 'MEMBERSHIP_FORBIDDEN', message: 'You do not belong to that company workspace.' },
          { status: 403 }
        );
      }

      // Persist active default organization smoothly
      await Promise.all([
        supabaseAdmin
          .from('organization_memberships')
          .update({ is_default: false })
          .eq('user_id', profile.id),
        supabaseAdmin
          .from('organization_memberships')
          .update({ is_default: true })
          .eq('user_id', profile.id)
          .eq('organization_id', targetOrgId),
        supabaseAdmin
          .from('user_profiles')
          .update({
            organization_id: targetOrgId,
            employee_id: chosen.employeeId || profile.employee_id,
          })
          .eq('id', profile.id),
        writeAuthAuditLog(supabaseAdmin, {
          organizationId: targetOrgId,
          authUserId: callerUserId,
          userProfileId: profile.id,
          employeeId: chosen.employeeId,
          employeeCode: chosen.employeeCode,
          loginMethod: 'company_switch',
          eventType: 'company_switched',
          status: 'success',
          ...meta,
        }),
      ]);

      return Response.json({
        ok: true,
        activeContext: {
          organizationId: chosen.organizationId,
          organizationName: chosen.organizationName,
          employeeId: chosen.employeeId,
          employeeCode: chosen.employeeCode,
          roleCode: chosen.roleCode,
          destinationRoute: resolveDestinationRoute(chosen.roleCode),
        },
      });
    }

    // 8. SAVE HR AUTHENTICATION METHOD CONFIGURATION
    if (action === 'save_auth_config') {
      const requestedOrgId = body.organizationId ? String(body.organizationId) : null;
      const adminCheck = await requireAdminCaller(supabaseAdmin, ctx, requestedOrgId);
      if (!adminCheck.ok) {
        return Response.json({ ok: false, message: adminCheck.message }, { status: adminCheck.status });
      }

      const targetOrgId = adminCheck.organizationId;
      const { policy: currentPolicy } = await loadEffectiveAuthConfig(supabaseAdmin, targetOrgId);
      const patch = (body.config || {}) as Partial<AuthConfigPolicy>;
      const validation = validateAuthConfigUpdate(patch, currentPolicy);

      if (!validation.valid || !validation.merged) {
        return Response.json(
          { ok: false, code: 'CONFIG_VALIDATION_FAILED', message: validation.error },
          { status: 400 }
        );
      }

      const m = validation.merged;
      const dbPayload = {
        organization_id: targetOrgId,
        enable_employee_id_password: m.enableEmployeeIdPassword,
        enable_mobile_password: m.enableMobilePassword,
        enable_mobile_otp: m.enableMobileOtp,
        enable_email_password: m.enableEmailPassword,
        default_login_method: m.defaultLoginMethod,
        factory_recommended_method: m.factoryRecommendedMethod,
        allowed_employee_groups: m.allowedEmployeeGroups,
        role_specific_policies: m.roleSpecificPolicies,
        otp_provider: m.otpProvider,
        otp_expiry_seconds: m.otpExpirySeconds,
        otp_resend_cooldown_seconds: m.otpResendCooldownSeconds,
        otp_max_attempts: m.otpMaxAttempts,
        password_policy: m.passwordPolicy,
        lockout_policy: m.lockoutPolicy,
        session_policy: m.sessionPolicy,
        updated_by: callerUserId,
        updated_at: new Date().toISOString(),
      };

      const { data: existingRow } = targetOrgId
        ? await supabaseAdmin
            .from('auth_method_configs')
            .select('id')
            .eq('organization_id', targetOrgId)
            .maybeSingle()
        : await supabaseAdmin
            .from('auth_method_configs')
            .select('id')
            .is('organization_id', null)
            .maybeSingle();

      const writeRes = existingRow?.id
        ? await supabaseAdmin
            .from('auth_method_configs')
            .update(dbPayload)
            .eq('id', existingRow.id)
            .select('*')
            .single()
        : await supabaseAdmin
            .from('auth_method_configs')
            .insert(dbPayload)
            .select('*')
            .single();

      if (writeRes.error) {
        return Response.json(
          { ok: false, message: writeRes.error.message },
          { status: 400 }
        );
      }

      authConfigCache.clear();

      await writeAuthAuditLog(supabaseAdmin, {
        organizationId: targetOrgId,
        authUserId: callerUserId,
        userProfileId: adminCheck.userProfileId,
        loginMethod: 'admin_policy',
        eventType: 'auth_config_updated',
        status: 'success',
        metadata: {
          enabledMethods: getEnabledMethodsList(m),
          defaultLoginMethod: m.defaultLoginMethod,
        },
        ...meta,
      });

      return Response.json({
        ok: true,
        config: mapDbConfigRowToPolicy(writeRes.data),
        message: 'Authentication policies saved and enforced immediately.',
      });
    }

    // 9. HR SECURITY AUDIT REPORT
    if (action === 'list_security_audit') {
      const requestedOrgId = body.organizationId ? String(body.organizationId) : null;
      const adminCheck = await requireAdminCaller(supabaseAdmin, ctx, requestedOrgId);
      if (!adminCheck.ok) {
        return Response.json({ ok: false, message: adminCheck.message }, { status: adminCheck.status });
      }

      const targetOrgId = adminCheck.organizationId;
      const limit = Math.min(200, Math.max(20, Number(body.limit || 80)));

      let logsQuery = supabaseAdmin
        .from('auth_login_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      let locksQuery = supabaseAdmin
        .from('auth_account_lockouts')
        .select('id, identifier_key, auth_user_id, failed_attempts, locked_until, last_failed_at, last_reason')
        .gt('locked_until', new Date().toISOString())
        .order('locked_until', { ascending: false })
        .limit(50);

      if (targetOrgId) {
        logsQuery = logsQuery.eq('organization_id', targetOrgId);
        locksQuery = locksQuery.eq('organization_id', targetOrgId);
      }

      const [{ data: logs }, { data: locks }] = await Promise.all([logsQuery, locksQuery]);
      const allLogs = logs || [];

      const byMethod: Record<string, { success: number; failed: number; blocked: number }> = {};
      let totalSuccess = 0;
      let totalFailed = 0;
      let totalBlocked = 0;
      let otpSentCount = 0;

      for (const l of allLogs) {
        if (!byMethod[l.login_method]) {
          byMethod[l.login_method] = { success: 0, failed: 0, blocked: 0 };
        }
        if (l.status === 'success') {
          totalSuccess++;
          byMethod[l.login_method].success++;
        } else if (l.status === 'blocked') {
          totalBlocked++;
          byMethod[l.login_method].blocked++;
        } else {
          totalFailed++;
          byMethod[l.login_method].failed++;
        }
        if (l.event_type === 'otp_requested' && l.status === 'success') {
          otpSentCount++;
        }
      }

      return Response.json({
        ok: true,
        summary: {
          totalSuccess,
          totalFailed,
          totalBlocked,
          activeLockoutsCount: (locks || []).length,
          otpSentCount,
          byMethod,
          logs: allLogs,
          lockedAccounts: locks || [],
        },
      });
    }

    // 10. HR-ASSISTED ACCOUNT UNLOCK & RECOVERY
    if (action === 'hr_assisted_recovery') {
      const requestedOrgId = body.organizationId ? String(body.organizationId) : null;
      const adminCheck = await requireAdminCaller(supabaseAdmin, ctx, requestedOrgId);
      if (!adminCheck.ok) {
        return Response.json({ ok: false, message: adminCheck.message }, { status: adminCheck.status });
      }

      const recoveryAction = String(body.recoveryAction || 'unlock');
      const targetAuthUserId = body.targetAuthUserId ? String(body.targetAuthUserId) : null;
      const lockoutId = body.lockoutId ? String(body.lockoutId) : null;

      if (recoveryAction === 'unlock') {
        if (lockoutId) {
          await supabaseAdmin
            .from('auth_account_lockouts')
            .delete()
            .eq('id', lockoutId);
        } else if (targetAuthUserId) {
          await clearLockoutState(supabaseAdmin, `uid:${targetAuthUserId}`);
        } else {
          return Response.json({ ok: false, message: 'Target account or lockout ID required.' }, { status: 400 });
        }

        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: adminCheck.organizationId,
          authUserId: targetAuthUserId,
          loginMethod: 'hr_recovery',
          eventType: 'account_unlocked',
          status: 'success',
          metadata: { unlockedBy: callerUserId, lockoutId },
          ...meta,
        });

        return Response.json({
          ok: true,
          message: 'Account lockout cleared. Employee can now sign in.',
        });
      }

      if (recoveryAction === 'send_reset_link' && body.employeeId) {
        const { data: emp } = await supabaseAdmin
          .from('employees')
          .select('id, organization_id, employee_code, display_name, work_email, user_id')
          .eq('id', String(body.employeeId))
          .maybeSingle();

        if (!emp) {
          return Response.json({ ok: false, message: 'Employee not found.' }, { status: 404 });
        }

        const resolved = await resolveProfileAndRoleForEmployee(supabaseAdmin, emp);
        if (!resolved.ok || !resolved.identity.email) {
          return Response.json(
            { ok: false, message: 'Employee does not have an active email login identity.' },
            { status: 400 }
          );
        }

        const redirectTo = `${Deno.env.get('APP_URL') || 'https://app.joypeoplehr.com'}/auth/reset-password`;
        const { data: genData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: resolved.identity.email,
          options: { redirectTo },
        });
        if (genData?.properties?.action_link) {
          await sendRecoveryEmailViaResend(
            resolved.identity.email,
            resolved.identity.fullName || 'Employee',
            genData.properties.action_link
          );
        }

        await writeAuthAuditLog(supabaseAdmin, {
          organizationId: emp.organization_id,
          authUserId: resolved.identity.authUserId,
          employeeId: emp.id,
          employeeCode: emp.employee_code,
          loginMethod: 'hr_recovery',
          eventType: 'password_reset_requested',
          status: 'success',
          maskedIdentifier: maskIdentifier('email_password', resolved.identity.email),
          metadata: { triggeredBy: callerUserId },
          ...meta,
        });

        return Response.json({
          ok: true,
          message: `Password recovery link dispatched for ${emp.display_name || emp.employee_code}.`,
        });
      }

      return Response.json({ ok: false, message: 'Invalid HR recovery action.' }, { status: 400 });
    }

    // 11. SESSION LIFECYCLE AUDIT (Logout / Expired)
    if (action === 'record_session_event') {
      const eventType = String(body.eventType || 'logout');
      const organizationId = body.organizationId ? String(body.organizationId) : null;
      await writeAuthAuditLog(supabaseAdmin, {
        organizationId,
        authUserId: callerUserId,
        loginMethod: 'session_event',
        eventType,
        status: 'success',
        ...meta,
      });
      return Response.json({ ok: true });
    }

    return Response.json(
      { ok: false, code: 'UNKNOWN_ACTION', message: `Unsupported action: ${action}` },
      { status: 400 }
    );
  }),
};

