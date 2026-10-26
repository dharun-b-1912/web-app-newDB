// src/hooks/useAuth.tsx
// ============================================================
// Joy PeopleHR / WorkForceOS — Production Authentication Context & Hook
// ============================================================

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { authService, AuthSessionUser, AuthResult, AuthContextMode } from '../services/auth/authService';
import { roleResolutionService } from '../services/auth/roleResolutionService';
import { supabase, isSupabaseEnabled, ensureSupabaseSession } from '../lib/supabase';
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

const isSameUser = (a: AuthSessionUser | null, b: AuthSessionUser | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.email === b.email &&
    a.role === b.role &&
    a.organization_id === b.organization_id &&
    a.must_change_password === b.must_change_password
  );
};

const inFlightSessionResolutions = new Map<string, Promise<AuthSessionUser>>();

const resolveDynamicSessionUser = async (
  sbUser: any,
  cached: AuthSessionUser | null,
  targetMode?: AuthContextMode
): Promise<AuthSessionUser> => {
  if (!sbUser) return cached!;

  const cacheKey = `${sbUser.id}_${targetMode || 'tenant'}`;
  const inFlight = inFlightSessionResolutions.get(cacheKey);
  if (inFlight) return inFlight;

  const resolutionPromise = (async (): Promise<AuthSessionUser> => {
    try {
      const resolvedIdentity = await roleResolutionService.resolveUserIdentity(
        sbUser.id,
        sbUser.email,
        sbUser.user_metadata || sbUser.raw_user_meta_data
      );

    if (resolvedIdentity.primaryRole === 'Unassigned') {
      if (cached?.role && cached.role !== 'Unassigned') {
        resolvedIdentity.primaryRole = cached.role as any;
      } else if (!cached) {
        console.warn('[useAuth] Role unassigned and no cached role; clearing session');
        authService.forceClearLocalSession();
        return null as any;
      }
    }

    const isPlatformStaff = resolvedIdentity.isPlatformAdmin;
    const resolvedRole =
      (typeof resolvedIdentity.primaryRole === 'object'
        ? (resolvedIdentity.primaryRole as any).name
        : resolvedIdentity.primaryRole) || (cached?.role || 'Unassigned');
    const orgId = resolvedIdentity.organizationId || cached?.organization_id;
    const mustChangePassword = Boolean(
      sbUser.user_metadata?.must_change_password ||
      sbUser.user_metadata?.require_password_change ||
      cached?.must_change_password
    );

    const sessionUser: AuthSessionUser = {
      id: sbUser.id,
      auth_user_id: sbUser.id,
      email: sbUser.email || cached?.email || '',
      name: resolvedIdentity.fullName || cached?.name || 'User',
      avatar_url: resolvedIdentity.avatarUrl || cached?.avatar_url || '',
      organization_id: orgId || (isPlatformStaff ? 'platform-root' : (cached?.organization_id || '0c621892-e938-4707-9957-13534ea32c19')),
      tenant_id: orgId,
      employee_id: resolvedIdentity.employeeId || cached?.employee_id || undefined,
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
      authContext: resolvedIdentity.authContext || cached?.authContext,
      created_at: sbUser.created_at || cached?.created_at || new Date().toISOString(),
    };

      authService.saveActiveSession(sessionUser, targetMode || 'tenant');
      return sessionUser;
    } finally {
      inFlightSessionResolutions.delete(cacheKey);
    }
  })();

  inFlightSessionResolutions.set(cacheKey, resolutionPromise);
  return resolutionPromise;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthSessionUser | null>(() => {
    try {
      return authService.getCurrentSessionUser();
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = authService.getCurrentSessionUser();
      return !cached;
    } catch {
      return true;
    }
  });
  const [authContext, setAuthContext] = useState<AuthContextMode>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/admin') || path === '/company-admin' || path === '/org-admin' || path === '/company/login') return 'admin';
      if (path.startsWith('/platform') || path === '/superadmin') return 'platform';
      if (path.startsWith('/vendor') || path === '/vendor-login') return 'vendor';
      const cached = localStorage.getItem('workforce_auth_context') as AuthContextMode;
      if (cached) return cached;
    }
    return 'tenant';
  });
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Initialize session from cache or live Supabase auth state
  useEffect(() => {
    let isMounted = true;

    const authBootStartTime = performance.now();
    console.log('[BOOT] auth_started: Initializing authentication state and verifying active session');

    const initAuth = async () => {
      try {
        const cachedUser = authService.getCurrentSessionUser();
        let initialMode: AuthContextMode = 'tenant';
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path.startsWith('/admin') || path === '/company-admin' || path === '/org-admin' || path === '/company/login') {
            initialMode = 'admin';
          } else if (path.startsWith('/platform') || path === '/superadmin') {
            initialMode = 'platform';
          } else if (path.startsWith('/vendor') || path === '/vendor-login') {
            initialMode = 'vendor';
          } else {
            initialMode = (localStorage.getItem('workforce_auth_context') as AuthContextMode) || 'tenant';
          }
        }

        if (isMounted) {
          setAuthContext(initialMode);
        }

        // FAST LOCAL CACHE RESOLUTION (0ms): If cachedUser is already stored, activate session immediately
        if (cachedUser && (cachedUser.id || cachedUser.auth_user_id)) {
          bindSessionFingerprint(cachedUser.id);
          if (isMounted) {
            setUser(cachedUser);
            setMustChangePassword(Boolean(cachedUser.must_change_password));
            setIsLoading(false);
            const elapsed = (performance.now() - authBootStartTime).toFixed(1);
            console.log(`[BOOT] auth_resolved: Authenticated via Local Cache (${elapsed}ms). User: ${cachedUser.email || cachedUser.id}`);
            if (typeof window !== 'undefined') {
              (window as any).__joyBootStep?.(70, 'Identity Authenticated', `User: ${cachedUser.email || cachedUser.id}`);
            }
          }

          // Asynchronously verify/heal Supabase session in background without stalling UI
          if (isSupabaseEnabled) {
            ensureSupabaseSession()
              .then((activeSession) => {
                if (activeSession?.user && isMounted) {
                  resolveDynamicSessionUser(activeSession.user, cachedUser, initialMode)
                    .then((updated) => {
                      if (isMounted && updated && !isSameUser(cachedUser, updated)) {
                        setUser(updated);
                      }
                    })
                    .catch(() => {});
                }
              })
              .catch((err) => {
                console.warn('[useAuth] Background Supabase session heal notice:', err);
              });
          }
          return;
        }

        if (isSupabaseEnabled) {
          // Cold boot: Fast resolve from memory/localStorage via ensureSupabaseSession
          let activeSession: any = await ensureSupabaseSession();
          if (!activeSession?.user) {
            // Fallback guard getSession with 1500ms timeout
            const sessionPromise = supabase.auth.getSession();
            const sessionTimeout = new Promise<{ data: { session: null } }>((resolve) =>
              setTimeout(() => resolve({ data: { session: null } }), 1500)
            );
            const { data: sessionData } = await Promise.race([sessionPromise, sessionTimeout]);
            activeSession = sessionData?.session;
          }

          if (activeSession?.user) {
            const sbUser = activeSession.user;
            bindSessionFingerprint(sbUser.id);

            const finalUser = await Promise.race([
              resolveDynamicSessionUser(sbUser, null, initialMode),
              new Promise<AuthSessionUser | null>((resolve) => setTimeout(() => resolve(null), 1500))
            ]);

            if (isMounted && finalUser) {
              setUser(finalUser);
              setMustChangePassword(Boolean(finalUser?.must_change_password));
              setIsLoading(false);
              const elapsed = (performance.now() - authBootStartTime).toFixed(1);
              console.log(`[BOOT] auth_resolved: Authenticated via Supabase (${elapsed}ms). User: ${finalUser?.email || finalUser?.id}`);
            }
            return;
          } else {
            // No real Supabase session or valid cached user -> clear local session
            authService.forceClearLocalSession();

            const devAutoLogin = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true';
            const devEmail = import.meta.env.VITE_DEV_AUTH_EMAIL || '';
            const devPassword = import.meta.env.VITE_DEV_AUTH_PASSWORD || '';

            if (devAutoLogin && devEmail && devPassword) {
              console.log('[useAuth] JOY PeopleHR DEV AUTH MODE ACTIVE');
              try {
                const res = await authService.signInWithCredentials(devEmail, devPassword, initialMode || 'tenant');
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
              const elapsed = (performance.now() - authBootStartTime).toFixed(1);
              console.log(`[BOOT] auth_resolved: No active user session (${elapsed}ms). User: Anonymous`);
            }
          }
        } else if (cachedUser && isMounted) {
          const integrity = validateSessionIntegrity(cachedUser.id);
          if (!integrity.isValid) {
            await authService.signOut();
            setUser(null);
            const elapsed = (performance.now() - authBootStartTime).toFixed(1);
            console.log(`[BOOT] auth_resolved: Session integrity invalid (${elapsed}ms). User: Anonymous`);
            return;
          }
          const finalUser = await resolveDynamicSessionUser(null, cachedUser);
          setUser(finalUser);
          setMustChangePassword(Boolean(finalUser.must_change_password));
          const elapsed = (performance.now() - authBootStartTime).toFixed(1);
          console.log(`[BOOT] auth_resolved: Restored from cache (${elapsed}ms). User: ${finalUser?.email || finalUser?.id}`);
        }
      } catch (err) {
        console.warn('[useAuth] Session initialization notice:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const authTimeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 1500);

    initAuth().finally(() => {
      clearTimeout(authTimeout);
      if (isMounted) setIsLoading(false);
    });

    // Subscribe to Supabase auth state changes (e.g. sign-out from other tabs, token refresh)
    if (isSupabaseEnabled) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          // Explicit sign out: only clear user if the local session was also explicitly cleared
          const cached = authService.getCurrentSessionUser();
          if (!cached && isMounted) {
            setUser(null);
            setMustChangePassword(false);
          }
        } else if (session?.user && isMounted) {
          const cachedUser = authService.getCurrentSessionUser();
          if (cachedUser && cachedUser.id === session.user.id && cachedUser.email?.toLowerCase() === session.user.email?.toLowerCase()) {
            // Active session already matches; avoid re-resolving and re-rendering
            return;
          }
          const finalUser = await resolveDynamicSessionUser(session.user, cachedUser);
          if (isMounted) {
            setUser(prev => (isSameUser(prev, finalUser) ? prev : finalUser));
            setMustChangePassword(Boolean(finalUser?.must_change_password));
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
    const res = await authService.signInWithCredentials(identifier, password, context);
    if (res.success && res.user) {
      setUser(res.user);
      setMustChangePassword(Boolean(res.mustChangePassword));
      setAuthContextMode(context);
    }
    return res;
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      role: 'Unassigned',
      isAuthenticated: false,
      isLoading: true,
      authContext: 'tenant' as const,
      mustChangePassword: false,
      setAuthContextMode: () => {},
      signIn: async (): Promise<AuthResult> => ({ success: false, errorMessage: 'Auth initializing' }),
      login: () => {},
      logout: async () => {},
      updatePassword: async () => ({ success: false, errorMessage: 'Auth initializing' }),
      requestPasswordReset: async () => ({ success: false, message: 'Auth initializing' }),
      activateAccount: async () => ({ success: false, errorMessage: 'Auth initializing' }),
      clearMustChangePassword: () => {},
    };
  }
  return context;
};
