// src/hooks/useAuth.tsx
// ============================================================
// Joy PeopleHR / WorkForceOS — Production Authentication Context & Hook
// ============================================================

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { authService, AuthSessionUser, AuthResult, AuthContextMode } from '../services/auth/authService';
import { roleResolutionService } from '../services/auth/roleResolutionService';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import {
  bindSessionFingerprint,
  validateSessionIntegrity,
  clearSessionFingerprint,
} from '../lib/security/sessionProtection';

interface AuthContextType {
  user: AuthSessionUser | null;
  role: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  authContext: AuthContextMode;
  mustChangePassword: boolean;
  setAuthContextMode: (mode: AuthContextMode) => void;
  signIn: (identifier: string, password: string, context?: AuthContextMode) => Promise<AuthResult>;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; errorMessage?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  activateAccount: (token: string, password: string, email?: string) => Promise<{ success: boolean; errorMessage?: string }>;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authContext, setAuthContext] = useState<AuthContextMode>('tenant');
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Initialize session from cache or live Supabase auth state
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const cachedUser = authService.getCurrentSessionUser();
        const cachedContext = (localStorage.getItem('workforce_auth_context') as AuthContextMode) || 'tenant';

        if (isMounted) {
          setAuthContext(cachedContext);
        }

        const resolveDynamicSessionUser = async (
          sbUser: any,
          cached: AuthSessionUser | null
        ): Promise<AuthSessionUser> => {
          if (sbUser) {
            const resolvedIdentity = await roleResolutionService.resolveUserIdentity(
              sbUser.id,
              sbUser.email,
              sbUser.user_metadata || sbUser.raw_user_meta_data
            );

            if (resolvedIdentity.primaryRole === 'Unassigned') {
              authService.forceClearLocalSession();
              return null as any;
            }

            const isPlatformStaff = resolvedIdentity.isPlatformAdmin;
            const resolvedRole =
              (typeof resolvedIdentity.primaryRole === 'object'
                ? (resolvedIdentity.primaryRole as any).name
                : resolvedIdentity.primaryRole) || 'Unassigned';
            const orgId = resolvedIdentity.organizationId;
            const mustChangePassword = Boolean(
              sbUser.user_metadata?.must_change_password ||
              sbUser.user_metadata?.require_password_change ||
              cached?.must_change_password
            );

            const sessionUser: AuthSessionUser = {
              id: sbUser.id,
              auth_user_id: sbUser.id,
              email: sbUser.email || cached?.email || '',
              name: resolvedIdentity.fullName,
              avatar_url: resolvedIdentity.avatarUrl || '',
              organization_id: orgId || (isPlatformStaff ? 'platform-root' : 'org-default'),
              tenant_id: orgId,
              employee_id: resolvedIdentity.employeeId || undefined,
              status: 'Active',
              account_status: 'ACTIVE',
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
                    ? [{ permission_id: '*', scope_level: 'Organization' as any }]
                    : [
                        { permission_id: 'tenant.workspace.read', scope_level: 'Organization' as any },
                        { permission_id: 'tenant.workspace.write', scope_level: 'Organization' as any },
                      ],
                },
              ],
              authContext: resolvedIdentity.authContext,
              created_at: sbUser.created_at || cached?.created_at || new Date().toISOString(),
            };

            authService.saveActiveSession(sessionUser, cachedContext);
            return sessionUser;
          }

          return cached!;
        };

        if (isSupabaseEnabled) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            // Anti-hijack fingerprint verification
            const integrity = validateSessionIntegrity(sessionData.session.user.id);
            if (!integrity.isValid) {
              console.error('[useAuth] Device fingerprint mismatch detected. Logging out.');
              await authService.signOut();
              if (isMounted) setUser(null);
              return;
            }

            bindSessionFingerprint(sessionData.session.user.id);
            const finalUser = await resolveDynamicSessionUser(sessionData.session.user, cachedUser);
            if (isMounted) {
              setUser(finalUser);
              setMustChangePassword(Boolean(finalUser.must_change_password));
            }
          } else if (
            cachedContext === 'vendor' &&
            cachedUser &&
            (cachedUser.authContext?.portalType === 'VENDOR' || cachedUser.role === 'Vendor Admin')
          ) {
            // Authentic Vendor Portal session managed through VendorCredentialService
            const integrity = validateSessionIntegrity(cachedUser.id);
            if (!integrity.isValid) {
              await authService.signOut();
              if (isMounted) setUser(null);
              return;
            }
            bindSessionFingerprint(cachedUser.id);
            if (isMounted) {
              setUser(cachedUser);
              setMustChangePassword(Boolean(cachedUser.must_change_password));
            }
          } else {
            // No real Supabase session -> purge local cached user so fake session is never active
            authService.forceClearLocalSession();

            const isDev = import.meta.env.DEV;
            const devAutoLogin = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true' || (isDev && import.meta.env.VITE_DEV_AUTO_LOGIN !== 'false');
            const devEmail = import.meta.env.VITE_DEV_AUTH_EMAIL || '';
            const devPassword = import.meta.env.VITE_DEV_AUTH_PASSWORD || '';

            if (isDev && devAutoLogin && devEmail && devPassword) {
              console.log('[useAuth] JOY PeopleHR DEV AUTH MODE ACTIVE');
              try {
                const res = await authService.signInWithCredentials(devEmail, devPassword, cachedContext || 'tenant');
                if (res.success && res.user && isMounted) {
                  bindSessionFingerprint(res.user.id);
                  setUser(res.user);
                  setMustChangePassword(Boolean(res.mustChangePassword));
                  return;
                } else {
                  console.warn('[useAuth] Dev auto-login notice:', res.errorMessage || 'DEV AUTH USER NOT READY');
                }
              } catch (devErr) {
                console.warn('[useAuth] Dev auto-login error:', devErr);
              }
            }

            if (isMounted) {
              setUser(null);
            }
          }
        } else if (cachedUser && isMounted) {
          const integrity = validateSessionIntegrity(cachedUser.id);
          if (!integrity.isValid) {
            await authService.signOut();
            setUser(null);
            return;
          }
          const finalUser = await resolveDynamicSessionUser(null, cachedUser);
          setUser(finalUser);
          setMustChangePassword(Boolean(finalUser.must_change_password));
        }
      } catch (err) {
        console.warn('[useAuth] Session initialization notice:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to Supabase auth state changes (e.g. sign-out from other tabs, token refresh)
    if (isSupabaseEnabled) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          if (isMounted) {
            setUser(null);
            setMustChangePassword(false);
          }
        }
      });

      return () => {
        isMounted = false;
        authListener?.subscription?.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const setAuthContextMode = (mode: AuthContextMode) => {
    setAuthContext(mode);
    try {
      localStorage.setItem('workforce_auth_context', mode);
    } catch {}
  };

  const signIn = async (
    identifier: string,
    password: string,
    context: AuthContextMode = authContext
  ): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await authService.signInWithCredentials(identifier, password, context);
      if (res.success && res.user) {
        setUser(res.user);
        setMustChangePassword(Boolean(res.mustChangePassword));
        setAuthContextMode(context);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User) => {
    const sessionUser: AuthSessionUser = {
      ...userData,
      status: userData.status || 'Active',
    };
    setUser(sessionUser);
    authService.saveActiveSession(sessionUser, authContext);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      try {
        localStorage.removeItem('workforce_active_route');
        localStorage.removeItem('workforce_auth_context');
      } catch (_) {}
      setUser(null);
      setMustChangePassword(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const res = await authService.updatePassword(newPassword);
    if (res.success) {
      setMustChangePassword(false);
    }
    return res;
  };

  const requestPasswordReset = async (email: string) => {
    return authService.requestPasswordReset(email);
  };

  const activateAccount = async (token: string, password: string, email?: string) => {
    const res = await authService.activateEmployeeAccount(token, password, email);
    if (res.success && res.user) {
      setUser(res.user);
      setMustChangePassword(false);
    }
    return res;
  };

  const clearMustChangePassword = () => {
    setMustChangePassword(false);
  };

  const role = user?.role || user?.roles?.[0]?.name || (user?.is_platform_admin ? 'Super Admin' : 'Unassigned');

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: Boolean(user),
        isLoading,
        authContext,
        mustChangePassword,
        setAuthContextMode,
        signIn,
        login,
        logout,
        updatePassword,
        requestPasswordReset,
        activateAccount,
        clearMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
