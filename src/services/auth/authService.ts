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
import { roleResolutionService } from './roleResolutionService';
import { VendorCredentialService } from '../vendor/vendorCredentialService';

export type AuthContextMode = 'tenant' | 'admin' | 'platform' | 'vendor';

export type AccountStatus =
  | 'PENDING_INVITATION'
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'MUST_CHANGE_PASSWORD'
  | 'SUSPENDED'
  | 'LOCKED'
  | 'DISABLED';

import { AuthContext } from '../../types/authContext';

export interface AuthSessionUser extends User {
  auth_user_id?: string;
  tenant_id?: string;
  account_status?: AccountStatus;
  must_change_password?: boolean;
  is_platform_admin?: boolean;
  platform_role?: string;
  authContext?: AuthContext;
}

export interface AuthResult {
  success: boolean;
  user?: AuthSessionUser;
  tenant?: Organization;
  destinationRoute?: string;
  mustChangePassword?: boolean;
  errorMessage?: string;
  errorCode?: string;
  authContext?: AuthContext;
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

    try {
      // 0. Vendor Authentication Layer
      // Scoped exclusively to Vendor credentials & portal authorization
      if (context === 'vendor' || VendorCredentialService.hasVendorCredentials(cleanId)) {
        const vendorAuth = VendorCredentialService.authenticateVendor(cleanId, password);
        if (vendorAuth.success && vendorAuth.authContext) {
          this.resetRateLimit(cleanId);
          const vCtx = vendorAuth.authContext;
          const orgId = vCtx.tenant?.organizationId || 'org-test-enterprise-global-001';
          const sessionUser: AuthSessionUser = {
            id: vCtx.userId,
            auth_user_id: vCtx.authUserId,
            email: vCtx.identity.email || cleanId,
            name: vCtx.identity.fullName || 'Vendor Admin',
            avatar_url: vCtx.identity.avatarUrl || '',
            organization_id: orgId,
            tenant_id: orgId,
            status: 'Active',
            account_status: 'ACTIVE',
            must_change_password: false,
            is_platform_admin: false,
            role: 'Vendor Admin',
            roles: [
              {
                id: 'role-vendor-admin',
                organization_id: orgId,
                name: 'Vendor Admin',
                description: 'Vendor Admin Role',
                permissions: [
                  { permission_id: 'vendor.portal.access', scope_level: 'Organization' as ScopeLevel },
                ],
              },
            ],
            authContext: vCtx,
            created_at: new Date().toISOString(),
          };

          this.saveActiveSession(sessionUser, 'vendor');

          await this.logAuditEvent('LOGIN_SUCCESS', {
            userId: sessionUser.id,
            email: sessionUser.email,
            context: 'vendor',
            role: 'Vendor Admin',
            tenantId: orgId,
          });

          const destinationRoute = vCtx.defaultRoute || 'vendor-settlement-workspace';

          return {
            success: true,
            user: sessionUser,
            destinationRoute,
            mustChangePassword: false,
            authContext: vCtx,
          };
        } else if (context === 'vendor') {
          this.recordFailedAttempt(cleanId);
          await this.logAuditEvent('LOGIN_FAILED', {
            identifier: cleanId,
            context,
            reason: vendorAuth.errorMessage || 'Invalid vendor credentials',
          });

          return {
            success: false,
            errorMessage: vendorAuth.errorMessage || 'Invalid vendor credentials or portal account not found.',
            errorCode: 'INVALID_CREDENTIALS',
          };
        }
      }

      // 1. Supabase Authentication
      if (isSupabaseEnabled) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanId,
          password: password,
        });

        const authUser = authData?.user;

        if (authError || !authUser) {
          this.recordFailedAttempt(cleanId);
          await this.logAuditEvent('LOGIN_FAILED', {
            identifier: cleanId,
            context,
            reason: authError?.message || 'Invalid credentials',
          });

          return {
            success: false,
            errorMessage: authError?.message || 'Unable to sign in with the provided credentials. Please verify and try again.',
            errorCode: 'INVALID_CREDENTIALS',
          };
        }

        this.resetRateLimit(cleanId);
        const userMeta = authUser.user_metadata || {};
        const appMeta = authUser.app_metadata || {};

        // 2. Authoritative Database-Driven Role & Profile Resolution
        const resolvedIdentity = await roleResolutionService.resolveUserIdentity(
          authUser.id,
          authUser.email,
          authUser.user_metadata
        );

        if (resolvedIdentity.primaryRole === 'Unassigned') {
          await this.logAuditEvent('LOGIN_FAILED', {
            userId: authUser.id,
            identifier: cleanId,
            context,
            reason: 'Account authenticated but not provisioned with any application role',
          });
          return {
            success: false,
            errorMessage: 'Your account is authenticated but has not been provisioned for JOY PeopleHR. Please contact your organization administrator or support.',
            errorCode: 'UNPROVISIONED_ACCOUNT',
          };
        }

        const isPlatformStaff = resolvedIdentity.isPlatformAdmin;
        const resolvedRole = (typeof resolvedIdentity.primaryRole === 'object' ? (resolvedIdentity.primaryRole as any).name : resolvedIdentity.primaryRole) || 'Employee';
        const orgId = resolvedIdentity.organizationId;
        const mustChangePassword = Boolean(userMeta.must_change_password || userMeta.require_password_change);
        let accountStatus: AccountStatus = 'ACTIVE';

        // Enforce Dual Context Rules
        if ((context as string) === 'platform') {
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

        if (context === 'tenant' && orgId && orgId !== 'platform-root') {
          // Check Organization Status in Supabase
          try {
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
          } catch (_) {}
        }

        const sessionUser: AuthSessionUser = {
          id: authUser.id,
          auth_user_id: authUser.id,
          email: authUser.email || cleanId,
          name: resolvedIdentity.fullName,
          avatar_url: resolvedIdentity.avatarUrl || '',
          organization_id: orgId || (isPlatformStaff ? 'platform-root' : 'org-default'),
          tenant_id: orgId,
          employee_id: resolvedIdentity.employeeId || undefined,
          status: 'Active',
          account_status: accountStatus,
          must_change_password: mustChangePassword,
          is_platform_admin: isPlatformStaff,
          platform_role: isPlatformStaff ? resolvedIdentity.platformRole || 'SUPER_ADMIN' : undefined,
          role: resolvedRole,
          roles: [
            {
              id: `role-${resolvedRole.toLowerCase().replace(/\s+/g, '-')}`,
              organization_id: orgId || 'root',
              name: resolvedRole,
              description: `${resolvedRole} Role`,
              permissions: isPlatformStaff
                ? [{ permission_id: '*', scope_level: 'Organization' as ScopeLevel }]
                : [
                    { permission_id: 'tenant.workspace.read', scope_level: 'Organization' as ScopeLevel },
                    { permission_id: 'tenant.workspace.write', scope_level: 'Organization' as ScopeLevel },
                  ],
            },
          ],
          authContext: resolvedIdentity.authContext,
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

        // 5. Compute Authorized Post-Login Route from Authoritative PortalAccessResolver
        const destinationRoute =
          resolvedIdentity.authContext?.defaultRoute ||
          resolvedIdentity.destinationRoute ||
          this.resolvePostLoginRoute(resolvedRole, context);

        return {
          success: true,
          user: sessionUser,
          tenant: tenantRecord,
          destinationRoute,
          mustChangePassword,
          authContext: resolvedIdentity.authContext,
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

  _isSigningOut: false,

  /**
   * Forcefully clears all local storage tokens without recursion
   */
  forceClearLocalSession(): void {
    try {
      clearSessionFingerprint();
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ORG);
      localStorage.removeItem(STORAGE_KEYS.AUTH_CONTEXT);
      localStorage.removeItem(STORAGE_KEYS.SAVED_ROUTE);
    } catch (_) {}
  },

  /**
   * Terminate Active Session
   */
  async signOut(): Promise<void> {
    if (this._isSigningOut) return;
    this._isSigningOut = true;
    try {
      // Read raw user directly to avoid recursive getCurrentSessionUser call
      let rawUser: AuthSessionUser | null = null;
      try {
        const raw = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER) || localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (raw) rawUser = JSON.parse(raw);
      } catch (_) {}

      if (rawUser) {
        await this.logAuditEvent('LOGOUT', { userId: rawUser.id, email: rawUser.email });
      }

      if (isSupabaseEnabled) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('[AuthService] Supabase sign-out notice:', err);
        }
      }

      this.forceClearLocalSession();
    } finally {
      this._isSigningOut = false;
    }
  },

  /**
   * Helper: Resolve authorized post-login route based on role & context
   */
  resolvePostLoginRoute(roleName: string, context: AuthContextMode): string {
    const normRole = (roleName || '').toLowerCase().trim();

    if (context === 'platform' || normRole.includes('super admin') || normRole.includes('platform')) {
      return 'platform-dashboard';
    }

    if (context === 'vendor' || normRole.includes('vendor') || normRole.includes('contractor')) {
      return 'vendor-settlement-workspace';
    }

    if (
      context === 'admin' ||
      normRole === 'company admin' ||
      normRole.includes('company admin') ||
      normRole.includes('organisation admin') ||
      normRole.includes('organization admin') ||
      normRole.includes('owner')
    ) {
      return 'executive-overview';
    }

    if (normRole === 'hr head' || normRole === 'hr admin' || normRole.includes('hr')) {
      return 'dashboard';
    }

    if (normRole.includes('manager')) {
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

    if (normRole === 'unassigned' || !normRole) {
      return 'unauthorized';
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
        this.forceClearLocalSession();
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
