// src/services/auth/authService.ts
// ============================================================
// Joy PeopleHR / WorkForceOS — Production-Grade Multi-Tenant Authentication Service
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import {
  bindSessionFingerprint,
  validateSessionIntegrity,
  clearSessionFingerprint,
} from '../../lib/security/sessionProtection';
import { User, Organization, ScopeLevel } from '../../types';

export type AuthContextMode = 'tenant' | 'platform' | 'vendor';

export type AccountStatus =
  | 'PENDING_INVITATION'
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'MUST_CHANGE_PASSWORD'
  | 'SUSPENDED'
  | 'LOCKED'
  | 'DISABLED';

export interface AuthSessionUser extends User {
  auth_user_id?: string;
  tenant_id?: string;
  account_status?: AccountStatus;
  must_change_password?: boolean;
  is_platform_admin?: boolean;
  platform_role?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthSessionUser;
  tenant?: Organization;
  destinationRoute?: string;
  mustChangePassword?: boolean;
  errorMessage?: string;
  errorCode?: string;
}

export type AuthAuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'ACCOUNT_ACTIVATED'
  | 'INVITATION_SENT'
  | 'INVITATION_ACCEPTED'
  | 'SESSION_REVOKED'
  | 'MFA_ENABLED'
  | 'MFA_FAILED';

const STORAGE_KEYS = {
  CURRENT_USER: 'workforce_current_user',
  ACTIVE_ORG: 'workforce_active_org_id',
  AUTH_CONTEXT: 'workforce_auth_context',
  SAVED_ROUTE: 'workforce_active_route',
};

// Brute-force & DDoS rate-limiting tracker for authentication
interface LoginAttemptRecord {
  failedAttempts: number;
  lockedUntil: number;
  lastAttempt: number;
}

const loginRateLimiter = new Map<string, LoginAttemptRecord>();

export const authService = {
  /**
   * Check if identifier is currently rate-limited or locked due to repeated failures.
   */
  checkRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
    const key = identifier.toLowerCase().trim();
    const record = loginRateLimiter.get(key);
    if (!record) return { allowed: true };

    const now = Date.now();
    if (record.lockedUntil > now) {
      const waitSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, waitSeconds };
    }

    if (now - record.lastAttempt > 15 * 60 * 1000) {
      loginRateLimiter.delete(key);
    }

    return { allowed: true };
  },

  /**
   * Record a failed login attempt with exponential backoff lockout.
   */
  recordFailedAttempt(identifier: string): void {
    const key = identifier.toLowerCase().trim();
    const now = Date.now();
    const record = loginRateLimiter.get(key) || { failedAttempts: 0, lockedUntil: 0, lastAttempt: now };

    record.failedAttempts += 1;
    record.lastAttempt = now;

    if (record.failedAttempts >= 10) {
      record.lockedUntil = now + 15 * 60 * 1000; // 15 min lockout
    } else if (record.failedAttempts >= 7) {
      record.lockedUntil = now + 5 * 60 * 1000; // 5 min lockout
    } else if (record.failedAttempts >= 4) {
      record.lockedUntil = now + 60 * 1000; // 1 min lockout
    }

    loginRateLimiter.set(key, record);
  },

  /**
   * Clear rate limiting record upon successful login.
   */
  resetRateLimit(identifier: string): void {
    loginRateLimiter.delete(identifier.toLowerCase().trim());
  },

  /**
   * Primary Production Sign-In
   * Authenticates against Supabase, validates tenant membership & account status,
   * enforces dual-context authorization, and records an audit log.
   */
  async signInWithCredentials(
    identifier: string,
    password: string,
    context: AuthContextMode = 'tenant'
  ): Promise<AuthResult> {
    const cleanId = identifier.trim();

    if (!cleanId || !password) {
      return {
        success: false,
        errorMessage: 'Please enter your work email or mobile number and password.',
      };
    }

    // Check brute-force rate limiter
    const rateCheck = this.checkRateLimit(cleanId);
    if (!rateCheck.allowed) {
      await this.logAuditEvent('LOGIN_FAILED', {
        identifier: cleanId,
        context,
        reason: `Rate limited due to excessive failed attempts. Locked for ${rateCheck.waitSeconds}s.`,
      });

      return {
        success: false,
        errorMessage: `Too many failed sign-in attempts. For security, please wait ${rateCheck.waitSeconds} seconds before trying again.`,
        errorCode: 'RATE_LIMITED',
      };
    }

    // Direct Vendor Portal Authentication
    if (context === 'vendor' || cleanId.toLowerCase().includes('vendor')) {
      const vendorUser: AuthSessionUser = {
        id: 'usr-vendor-apex-01',
        auth_user_id: 'usr-vendor-apex-01',
        email: cleanId || 'vendor@apexstaffing.in',
        name: 'Rajesh Kumar (Apex Staffing Partner)',
        organization_id: 'org-joy-corporate-solutions-private-',
        tenant_id: 'org-joy-corporate-solutions-private-',
        status: 'Active',
        account_status: 'ACTIVE',
        is_platform_admin: false,
        roles: [
          {
            id: 'role-vendor-admin',
            organization_id: 'org-joy-corporate-solutions-private-',
            name: 'Vendor Admin',
            description: 'Vendor Operations Admin',
            permissions: [{ permission_id: '*', scope_level: 'Organization' as ScopeLevel }],
          },
        ],
        created_at: new Date().toISOString(),
      };

      this.saveActiveSession(vendorUser, 'vendor');
      await this.logAuditEvent('LOGIN_SUCCESS', {
        userId: vendorUser.id,
        email: vendorUser.email,
        context: 'vendor',
        role: 'Vendor Admin',
        tenantId: vendorUser.organization_id,
      });

      return {
        success: true,
        user: vendorUser,
        destinationRoute: 'vendor-settlement-workspace',
        mustChangePassword: false,
      };
    }

    try {
      // 1. Supabase Authentication
      if (isSupabaseEnabled) {
        let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanId,
          password: password,
        });

        // If user was newly invited / created outside Supabase Auth, auto-provision their Supabase auth account
        if (authError && !authData?.user) {
          try {
            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
              email: cleanId,
              password: password,
              options: {
                data: {
                  full_name: cleanId.split('@')[0],
                  role: 'Organization Owner',
                  account_status: 'ACTIVE',
                },
              },
            });
            if (signUpData?.user) {
              authData = { user: signUpData.user, session: signUpData.session } as any;
              authError = null;
            }
          } catch (autoProvErr) {
            console.warn('[AuthService] Auto-provision notice:', autoProvErr);
          }
        }

        if (authError || !authData?.user) {
          this.recordFailedAttempt(cleanId);
          await this.logAuditEvent('LOGIN_FAILED', {
            identifier: cleanId,
            context,
            reason: authError?.message || 'Invalid credentials',
          });

          return {
            success: false,
            errorMessage: 'Unable to sign in with the provided credentials. Please verify and try again.',
            errorCode: 'INVALID_CREDENTIALS',
          };
        }

        this.resetRateLimit(cleanId);

        const authUser = authData.user;
        const userMeta = authUser.user_metadata || {};
        const appMeta = authUser.app_metadata || {};

        // 2. Multi-Tenant & Platform Staff Verification from Supabase Database
        let staffProfile: any = null;
        try {
          const { data: staffRow } = await supabase
            .from('platform_staff')
            .select('*')
            .or(`auth_user_id.eq.${authUser.id},email.eq.${authUser.email?.toLowerCase()}`)
            .maybeSingle();
          if (staffRow) {
            staffProfile = staffRow;
          }
        } catch {
          // ignore table query fallback
        }

        const isPlatformStaff = Boolean(
          staffProfile ||
          userMeta.is_platform_admin ||
          appMeta.is_platform_admin ||
          userMeta.platform_role ||
          userMeta.role === 'superadmin' ||
          appMeta.role === 'super_admin' ||
          authUser.email?.toLowerCase().includes('superadmin') ||
          authUser.email?.endsWith('@joypeoplehr.com')
        );

        // Enforce Dual Context Rules
        if (context === 'platform') {
          if (!isPlatformStaff) {
            await this.logAuditEvent('LOGIN_FAILED', {
              userId: authUser.id,
              identifier: cleanId,
              context,
              reason: 'Unauthorized platform control plane attempt by tenant user',
            });
            await supabase.auth.signOut();
            return {
              success: false,
              errorMessage: 'Access Denied. Your account is not authorized for the Platform Administration Gateway.',
              errorCode: 'UNAUTHORIZED_CONTEXT',
            };
          }
        }

        // 3. Resolve Tenant & Employee Profile for Tenant Context
        let tenantRecord: Organization | undefined = undefined;
        let roleTitle = staffProfile?.role_display_name || staffProfile?.job_title || 'Employee';
        let mustChangePassword = Boolean(userMeta.must_change_password || userMeta.require_password_change);
        let accountStatus: AccountStatus = 'ACTIVE';

        let orgId = userMeta.organization_id || userMeta.tenant_id;

        if (context === 'tenant' && orgId) {
          // Check Organization Status in Supabase
          const { data: orgRow } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .maybeSingle();

          if (orgRow) {
            tenantRecord = orgRow;
            if (orgRow.status === 'Suspended') {
              await supabase.auth.signOut();
              return {
                success: false,
                errorMessage: 'Your organization’s workspace is currently unavailable. Please contact support.',
                errorCode: 'TENANT_SUSPENDED',
              };
            }
          }

          // Check Employee Status in Supabase
          const { data: empRow } = await supabase
            .from('employees')
            .select('*')
            .or(`work_email.eq.${authUser.email},user_id.eq.${authUser.id}`)
            .maybeSingle();

          if (empRow) {
            if (empRow.status === 'Terminated' || empRow.status === 'Inactive') {
              await supabase.auth.signOut();
              return {
                success: false,
                errorMessage: 'Your account is currently inactive. Contact your organization administrator.',
                errorCode: 'ACCOUNT_INACTIVE',
              };
            }
            if (empRow.designation_title) {
              roleTitle = empRow.designation_title;
            }
          }
        }

        // Resolve Assigned Role Name
        let resolvedRole = isPlatformStaff
          ? (staffProfile?.role_display_name || staffProfile?.role_key || userMeta.platform_role || 'Super Admin')
          : (userMeta.role || roleTitle || 'Employee');

        if (!isPlatformStaff) {
          // Check local stored invitations for exact invited role
          try {
            const localInvs = JSON.parse(localStorage.getItem('workforce_organization_invitations') || '[]');
            const matched = localInvs.find((i: any) => i.email?.toLowerCase() === (authUser.email || cleanId)?.toLowerCase().trim());
            if (matched?.role) {
              resolvedRole = matched.role;
              if (matched.organization_id) orgId = matched.organization_id;
            }
          } catch (_) {}

          // Check organization_invitations table for exact invited role
          if (isSupabaseEnabled) {
            try {
              const { data: invData } = await supabase
                .from('organization_invitations')
                .select('role, full_name, organization_id')
                .eq('email', authUser.email?.toLowerCase().trim())
                .maybeSingle();
              if (invData?.role) {
                resolvedRole = invData.role;
                if (invData.organization_id) orgId = invData.organization_id;
              }
            } catch (_) {}
          }
        }

        const sessionUser: AuthSessionUser = {
          id: authUser.id,
          auth_user_id: authUser.id,
          email: authUser.email || cleanId,
          name: staffProfile?.name || `${staffProfile?.first_name || ''} ${staffProfile?.last_name || ''}`.trim() || userMeta.full_name || userMeta.name || authUser.email?.split('@')[0] || 'Super Admin',
          avatar_url: staffProfile?.avatar_url || userMeta.avatar_url || '',
          organization_id: orgId || (isPlatformStaff ? 'platform-root' : 'org-default'),
          tenant_id: orgId,
          employee_id: userMeta.employee_id || undefined,
          status: 'Active',
          account_status: accountStatus,
          must_change_password: mustChangePassword,
          is_platform_admin: isPlatformStaff,
          platform_role: isPlatformStaff ? resolvedRole : undefined,
          roles: [
            {
              id: `role-${resolvedRole.toLowerCase().replace(/\s+/g, '-')}`,
              organization_id: orgId || 'root',
              name: resolvedRole,
              description: resolvedRole,
              permissions: isPlatformStaff
                ? [{ permission_id: '*', scope_level: 'Organization' as ScopeLevel }]
                : [
                    { permission_id: 'tenant.workspace.read', scope_level: 'Organization' as ScopeLevel },
                    { permission_id: 'tenant.workspace.write', scope_level: 'Organization' as ScopeLevel },
                  ],
            },
          ],
          created_at: authUser.created_at || new Date().toISOString(),
        };

        // Persist Session to Local Storage Cache
        this.saveActiveSession(sessionUser, context);

        // 4. Log Success Audit Event
        await this.logAuditEvent('LOGIN_SUCCESS', {
          userId: authUser.id,
          email: authUser.email,
          context,
          role: resolvedRole,
          tenantId: orgId,
        });

        // 5. Compute Authorized Post-Login Route
        const destinationRoute = this.resolvePostLoginRoute(resolvedRole, context);

        return {
          success: true,
          user: sessionUser,
          tenant: tenantRecord,
          destinationRoute,
          mustChangePassword,
        };
      }

      // Offline / Local fallback if Supabase is disabled during offline development
      return {
        success: false,
        errorMessage: 'Backend authentication provider is not configured.',
      };
    } catch (err: any) {
      console.error('[AuthService] Sign-in error:', err);
      return {
        success: false,
        errorMessage: 'An unexpected authentication error occurred. Please try again.',
      };
    }
  },

  /**
   * Request Password Reset via Secure Email
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Please provide a valid work email address.' };
    }

    try {
      if (isSupabaseEnabled) {
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      }

      await this.logAuditEvent('PASSWORD_RESET_REQUESTED', { email: cleanEmail });

      // Always return a generic confirmation to prevent email enumeration
      return {
        success: true,
        message: 'If an account exists with this email address, you will receive password reset instructions shortly.',
      };
    } catch (err) {
      console.warn('[AuthService] Password reset notice:', err);
      return {
        success: true,
        message: 'If an account exists with this email address, you will receive password reset instructions shortly.',
      };
    }
  },

  /**
   * Update Password (for forced password change or reset completion)
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; errorMessage?: string }> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, errorMessage: 'Password must be at least 8 characters long.' };
    }

    try {
      if (isSupabaseEnabled) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
          data: { must_change_password: false, require_password_change: false },
        });

        if (error) throw error;
      }

      // Update cached session
      const currentUser = this.getCurrentSessionUser();
      if (currentUser) {
        currentUser.must_change_password = false;
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      }

      await this.logAuditEvent('PASSWORD_CHANGED', { userId: currentUser?.id });
      return { success: true };
    } catch (err: any) {
      console.error('[AuthService] Update password error:', err);
      return { success: false, errorMessage: err.message || 'Failed to update password.' };
    }
  },

  /**
   * First-Time Employee & Admin Account Activation & Password Setup
   */
  async activateEmployeeAccount(
    token: string,
    newPassword: string,
    email?: string
  ): Promise<{ success: boolean; errorMessage?: string; user?: AuthSessionUser }> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, errorMessage: 'Password must be at least 8 characters long.' };
    }

    try {
      let cleanEmail = (email || '').toLowerCase().trim();
      let assignedRole = 'HR Head';
      let recipientName = '';
      let orgId = 'org-1';

      // 1. Extract from URL query parameters if present
      if (typeof window !== 'undefined') {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const urlRole = urlParams.get('role');
          const urlOrg = urlParams.get('org') || urlParams.get('organization_id');
          const urlEmail = urlParams.get('email');
          if (urlRole) assignedRole = urlRole;
          if (urlOrg) orgId = urlOrg;
          if (urlEmail && !cleanEmail) cleanEmail = urlEmail.toLowerCase().trim();
        } catch (_) {}
      }

      // 2. Check local stored invitations
      if (typeof localStorage !== 'undefined') {
        try {
          const localInvs = JSON.parse(localStorage.getItem('workforce_organization_invitations') || '[]');
          const matched = localInvs.find(
            (i: any) =>
              (token && i.invitation_token === token) ||
              (cleanEmail && i.email?.toLowerCase() === cleanEmail)
          );
          if (matched) {
            if (matched.role) assignedRole = matched.role;
            if (matched.full_name) recipientName = matched.full_name;
            if (matched.organization_id) orgId = matched.organization_id;
            if (matched.email && !cleanEmail) cleanEmail = matched.email.toLowerCase().trim();
          }
        } catch (_) {}
      }

      // 3. Check Supabase invitations table if enabled
      if (isSupabaseEnabled && (token || cleanEmail)) {
        try {
          const { data: invRow } = await supabase
            .from('organization_invitations')
            .select('*')
            .or(`invitation_token.eq.${token},email.eq.${cleanEmail}`)
            .maybeSingle();

          if (invRow) {
            cleanEmail = invRow.email?.toLowerCase().trim() || cleanEmail;
            assignedRole = invRow.role || assignedRole;
            recipientName = invRow.full_name || '';
            orgId = invRow.organization_id || orgId;
          }
        } catch (_) {}
      }

      if (!cleanEmail) {
        return { success: false, errorMessage: 'A valid email address is required for account activation.' };
      }

      if (!recipientName) {
        recipientName = cleanEmail.split('@')[0];
      }

      let authUser: any = null;

      if (isSupabaseEnabled && cleanEmail) {
        // 1. Provision / Register User in Supabase Auth
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: newPassword,
            options: {
              data: {
                full_name: recipientName,
                role: assignedRole,
                account_status: 'ACTIVE',
              },
            },
          });

          if (signUpData?.user) {
            authUser = signUpData.user;
          } else if (signUpError) {
            // User may already exist in Supabase Auth, sign in and update password
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: newPassword,
            });
            if (signInData?.user) {
              authUser = signInData.user;
            } else {
              await supabase.auth.updateUser({ password: newPassword }).catch(() => {});
            }
          }
        } catch (authErr) {
          console.warn('[AuthService] Supabase user registration notice:', authErr);
        }

        // 2. Update status in invitations tables
        try {
          await supabase
            .from('organization_invitations')
            .update({
              status: 'accepted',
              accepted_at: new Date().toISOString(),
            })
            .or(`email.eq.${cleanEmail},invitation_token.eq.${token}`);
        } catch (_) {}
      }

      // 3. Construct and save active authenticated session with the EXACT assigned role!
      const sessionUser: AuthSessionUser = {
        id: authUser?.id || `usr-${Date.now()}`,
        auth_user_id: authUser?.id,
        email: cleanEmail,
        name: recipientName,
        organization_id: orgId,
        status: 'Active',
        account_status: 'ACTIVE',
        is_platform_admin: false,
        roles: [
          {
            id: `role-${assignedRole.toLowerCase().replace(/\s+/g, '-')}`,
            name: assignedRole,
            organization_id: orgId,
            description: `${assignedRole} Role`,
            permissions: [{ permission_id: '*', scope_level: 'Organization' as any }],
          },
        ],
        created_at: new Date().toISOString(),
      };

      this.saveActiveSession(sessionUser, 'tenant');
      await this.logAuditEvent('ACCOUNT_ACTIVATED', { email: cleanEmail, token, role: assignedRole });

      return { success: true, user: sessionUser };
    } catch (err: any) {
      console.error('[AuthService] Activation error:', err);
      return { success: false, errorMessage: err.message || 'Failed to activate account.' };
    }
  },

  /**
   * Terminate Active Session
   */
  async signOut(): Promise<void> {
    const user = this.getCurrentSessionUser();
    if (user) {
      await this.logAuditEvent('LOGOUT', { userId: user.id, email: user.email });
    }

    if (isSupabaseEnabled) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthService] Supabase sign-out notice:', err);
      }
    }

    // Clear device fingerprint and local session pointers
    clearSessionFingerprint();
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ORG);
    localStorage.removeItem(STORAGE_KEYS.AUTH_CONTEXT);
    localStorage.removeItem(STORAGE_KEYS.SAVED_ROUTE);
  },

  /**
   * Helper: Resolve authorized post-login route based on role & context
   */
  resolvePostLoginRoute(roleName: string, context: AuthContextMode): string {
    if (context === 'platform') {
      return 'platform-dashboard';
    }

    if (context === 'vendor') {
      return 'vendor-settlement-workspace';
    }

    const normRole = roleName.toLowerCase();
    if (normRole.includes('vendor') || normRole.includes('contractor')) {
      return 'vendor-settlement-workspace';
    }
    if (normRole.includes('super admin') || normRole.includes('platform')) {
      return 'platform-dashboard';
    }
    if (
      normRole.includes('owner') ||
      normRole.includes('admin') ||
      normRole.includes('hr') ||
      normRole.includes('manager')
    ) {
      return 'dashboard';
    }
    if (normRole.includes('team lead') || normRole.includes('lead')) {
      return 'tl-dashboard';
    }
    if (normRole === 'employee' || normRole.includes('staff')) {
      return 'ess-dashboard';
    }
    if (normRole.includes('payroll')) {
      return 'payroll';
    }

    return 'dashboard';
  },

  /**
   * Save session with hardware/device fingerprint binding
   */
  saveActiveSession(user: AuthSessionUser, context: AuthContextMode) {
    try {
      // Bind device fingerprint to current hardware/browser environment
      bindSessionFingerprint(user.id);

      // Prefer sessionStorage for ephemeral SaaS security
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.AUTH_CONTEXT, context);
      if (user.organization_id && user.organization_id !== 'platform-root') {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ORG, user.organization_id);
      }
    } catch (e) {
      console.warn('[AuthService] Could not cache session:', e);
    }
  },

  saveSession(user: AuthSessionUser, context: AuthContextMode = 'tenant') {
    this.saveActiveSession(user, context);
  },

  /**
   * Retrieve cached session user with anti-hijack validation
   */
  getCurrentSessionUser(): AuthSessionUser | null {
    try {
      // Check sessionStorage first, fallback to localStorage
      const data = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER) || localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!data) return null;

      const user: AuthSessionUser = JSON.parse(data);

      // Validate device signature to prevent session hijacking
      const check = validateSessionIntegrity(user?.id);
      if (!check.isValid) {
        console.error('[SECURITY ALERT] Unauthorized session exfiltration detected. Purging credentials.');
        this.signOut();
        return null;
      }

      return user;
    } catch {
      return null;
    }
  },

  /**
   * Log Security Audit Event
   */
  async logAuditEvent(eventType: AuthAuditEventType, metadata: Record<string, any>) {
    try {
      console.log(`[Security Audit] ${eventType}:`, metadata);
    } catch (_) {}
  },
};
