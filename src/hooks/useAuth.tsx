// src/hooks/useAuth.tsx
// ============================================================
// Joy PeopleHR / WorkForceOS — Production Authentication Context & Hook
// ============================================================

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { authService, AuthSessionUser, AuthResult, AuthContextMode } from '../services/auth/authService';
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

        const resolveDynamicSessionUser = (sbUser: any, cached: AuthSessionUser | null): AuthSessionUser => {
          const meta = sbUser?.user_metadata || sbUser?.raw_user_meta_data || {};
          const appMeta = sbUser?.app_metadata || sbUser?.raw_app_meta_data || {};

          // Read role directly from Supabase user_metadata / app_metadata or cached session
          const emailLower = (sbUser?.email || cached?.email || '').toLowerCase().trim();
          let defaultInferredRole = 'Employee';
          if (emailLower === 'superadmin@joypeoplehr.com') {
            defaultInferredRole = 'Super Admin';
          }

          const directRole =
            meta.role ||
            meta.role_display_name ||
            appMeta.role ||
            appMeta.role_display_name ||
            (meta.roles && meta.roles[0]?.name) ||
            (cached?.roles && cached.roles[0]?.name) ||
            (cached as any)?.role ||
            defaultInferredRole;

          const isSuperAdmin = Boolean(
            meta.is_platform_admin ||
            appMeta.is_platform_admin ||
            directRole === 'Super Admin' ||
            sbUser?.email?.toLowerCase() === 'superadmin@joypeoplehr.com'
          );

          const roleName = isSuperAdmin ? 'Super Admin' : directRole;

          const fallbackOrgId = typeof window !== 'undefined' ? (localStorage.getItem('workforce_active_org_id') || 'org-joy-corporate-solutions-private-') : 'org-joy-corporate-solutions-private-';

          const rolesList = (meta.roles && meta.roles.length > 0)
            ? meta.roles
            : [
                {
                  id: `role-${roleName.toLowerCase().replace(/\s+/g, '-')}`,
                  name: roleName,
                  organization_id: meta.organization_id || fallbackOrgId,
                  description: `${roleName} Role`,
                  permissions: [{ permission_id: '*', scope_level: (isSuperAdmin ? 'Organization' : 'Company') as any }],
                },
              ];

          return {
            id: sbUser?.id || cached?.id || `usr-${Date.now()}`,
            auth_user_id: sbUser?.id || cached?.auth_user_id,
            email: sbUser?.email || cached?.email || '',
            name: meta.full_name || meta.name || cached?.name || (sbUser?.email ? sbUser.email.split('@')[0] : 'User'),
            organization_id: meta.organization_id || cached?.organization_id || fallbackOrgId,
            status: 'Active',
            account_status: 'ACTIVE',
            is_platform_admin: isSuperAdmin,
            platform_role: isSuperAdmin ? 'SUPER_ADMIN' : undefined,
            roles: rolesList,
            created_at: sbUser?.created_at || cached?.created_at || new Date().toISOString(),
          };
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
            const finalUser = resolveDynamicSessionUser(sessionData.session.user, cachedUser);
            if (isMounted) {
              setUser(finalUser);
              setMustChangePassword(Boolean(finalUser.must_change_password));
            }
          } else if (cachedUser && cachedUser.email) {
            const integrity = validateSessionIntegrity(cachedUser.id);
            if (!integrity.isValid) {
              console.error('[useAuth] Cached session fingerprint mismatch. Purging.');
              await authService.signOut();
              if (isMounted) setUser(null);
              return;
            }

            const finalUser = resolveDynamicSessionUser(null, cachedUser);
            if (isMounted) {
              setUser(finalUser);
              setMustChangePassword(Boolean(finalUser.must_change_password));
            }
          } else {
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
          const finalUser = resolveDynamicSessionUser(null, cachedUser);
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

  const role = user?.roles?.[0]?.name || (user?.is_platform_admin ? 'Super Admin' : 'Employee');

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
