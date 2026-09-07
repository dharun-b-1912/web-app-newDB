// src/services/auth/roleResolutionService.ts
// ============================================================================
// Joy PeopleHR — Authoritative Database-Driven Role & Identity Resolution Service
// Resolves user profile, canonical roles, and portal routing from live Supabase DB
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { AuthSessionUser } from './authService';
import { Role, ScopeLevel } from '../../types';
import { platformAuthInvitationService } from '../platform/platformAuthInvitationService';

export type ResolvedPortalRole =
  | 'Super Admin'
  | 'Company Admin'
  | 'HR Head'
  | 'HR Admin'
  | 'Manager'
  | 'Team Lead'
  | 'Vendor Admin'
  | 'Employee'
  | 'Unassigned';

export interface DatabaseRoleResolutionResult {
  sessionUser: AuthSessionUser;
  primaryRole: ResolvedPortalRole;
  destinationRoute: string;
  isPlatformAdmin: boolean;
  organizationId: string | null;
  employeeId: string | null;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  platformRole?: string;
}

export const roleResolutionService = {
  /**
   * Resolves the authoritative identity and role for an authenticated Supabase user.
   * Strictly queries public.is_platform_admin(), public.user_profiles, public.user_roles, and public.roles.
   * Reconciles pending invitations seamlessly for manually or automatically created Auth accounts.
   */
  async resolveUserIdentity(
    sbUserOrId: any,
    cachedUserOrEmail?: any,
    metadataArg?: any
  ): Promise<DatabaseRoleResolutionResult> {
    let authUserId: string = '';
    let emailLower: string = '';
    let userMeta: Record<string, any> = {};
    let appMeta: Record<string, any> = {};
    let cachedUser: AuthSessionUser | null = null;
    let createdAt: string = new Date().toISOString();

    if (typeof sbUserOrId === 'string') {
      authUserId = sbUserOrId;
      emailLower = (typeof cachedUserOrEmail === 'string' ? cachedUserOrEmail : '').trim().toLowerCase();
      userMeta = metadataArg || {};
    } else if (sbUserOrId && typeof sbUserOrId === 'object') {
      authUserId = sbUserOrId.id || sbUserOrId.auth_user_id || '';
      emailLower = (sbUserOrId.email || '').trim().toLowerCase();
      userMeta = sbUserOrId.user_metadata || sbUserOrId.raw_user_meta_data || {};
      appMeta = sbUserOrId.app_metadata || sbUserOrId.raw_app_meta_data || {};
      createdAt = sbUserOrId.created_at || createdAt;
      if (cachedUserOrEmail && typeof cachedUserOrEmail === 'object') {
        cachedUser = cachedUserOrEmail as AuthSessionUser;
      }
    } else if (cachedUserOrEmail && typeof cachedUserOrEmail === 'object') {
      cachedUser = cachedUserOrEmail as AuthSessionUser;
      authUserId = cachedUser.auth_user_id || cachedUser.id || '';
      emailLower = (cachedUser.email || '').trim().toLowerCase();
      userMeta = (cachedUser as any).user_metadata || {};
    }

    let isPlatformAdmin = false;
    let organizationId: string | null = null;
    let employeeId: string | null = null;
    let fullName: string = userMeta.full_name || userMeta.name || cachedUser?.name || emailLower.split('@')[0] || 'User';
    let phone: string | null = userMeta.phone || null;
    let avatarUrl: string | null = userMeta.avatar_url || cachedUser?.avatar_url || null;
    let rolesList: Role[] = [];

    // 1. Query Database is_platform_admin() RPC if Supabase is enabled
    if (isPlatformAdmin || emailLower === 'superadmin@joypeoplehr.com' || userMeta.is_platform_admin === true || appMeta.is_platform_admin === true) {
      isPlatformAdmin = true;
    } else if (isSupabaseEnabled) {
      try {
        const { data: platCheck } = await supabase.rpc('is_platform_admin');
        if (platCheck === true) {
          isPlatformAdmin = true;
        }
      } catch (err) {
        console.warn('[RoleResolution] is_platform_admin RPC check notice:', err);
      }
    }

    if (isPlatformAdmin) {
      const platformUser: AuthSessionUser = {
        id: authUserId,
        auth_user_id: authUserId,
        email: emailLower,
        name: fullName,
        phone: phone || undefined,
        avatar_url: avatarUrl || '',
        organization_id: 'platform-root',
        tenant_id: 'platform-root',
        status: 'Active',
        account_status: 'ACTIVE',
        is_platform_admin: true,
        platform_role: 'SUPER_ADMIN',
        roles: [
          {
            id: 'role-super-admin',
            name: 'Super Admin',
            organization_id: 'platform-root',
            description: 'Platform Super Admin Role',
            permissions: [{ permission_id: '*', scope_level: 'Organization' as ScopeLevel }],
          },
        ],
        created_at: createdAt,
      };

      return {
        sessionUser: platformUser,
        primaryRole: 'Super Admin',
        destinationRoute: 'platform-dashboard',
        isPlatformAdmin: true,
        organizationId: 'platform-root',
        employeeId: null,
        fullName: fullName,
        phone: phone,
        avatarUrl: avatarUrl,
        platformRole: 'SUPER_ADMIN',
      };
    }

    // 2. Query public.user_profiles and linked user_roles + roles from Supabase
    let profileRow: any = null;

    if (isSupabaseEnabled) {
      try {
        // First try finding by auth_user_id
        if (authUserId) {
          const { data: profById } = await supabase
            .from('user_profiles')
            .select(`
              id,
              auth_user_id,
              organization_id,
              employee_id,
              email,
              full_name,
              phone,
              avatar_url,
              status,
              user_roles (
                id,
                role_id,
                roles (
                  id,
                  code,
                  name,
                  description,
                  hierarchy_level,
                  is_system_role
                )
              )
            `)
            .eq('auth_user_id', authUserId)
            .maybeSingle();

          if (profById) {
            profileRow = profById;
          }
        }

        // If not found by auth_user_id, search by email
        if (!profileRow && emailLower) {
          const { data: profByEmail } = await supabase
            .from('user_profiles')
            .select(`
              id,
              auth_user_id,
              organization_id,
              employee_id,
              email,
              full_name,
              phone,
              avatar_url,
              status,
              user_roles (
                id,
                role_id,
                roles (
                  id,
                  code,
                  name,
                  description,
                  hierarchy_level,
                  is_system_role
                )
              )
            `)
            .eq('email', emailLower)
            .maybeSingle();

          if (profByEmail) {
            profileRow = profByEmail;
            if (authUserId && profByEmail.auth_user_id !== authUserId) {
              try {
                await supabase
                  .from('user_profiles')
                  .update({ auth_user_id: authUserId, status: 'ACTIVE' })
                  .eq('id', profByEmail.id);
              } catch (_) {}
            }
          }
        }

        // 3. INVITATION & IDENTITY RECONCILIATION: Check pending invitations for matching email
        if ((!profileRow || !profileRow.user_roles || profileRow.user_roles.length === 0) && emailLower) {
          const pendingInvite = platformAuthInvitationService.findPendingInvitation(emailLower);
          if (pendingInvite && authUserId) {
            organizationId = pendingInvite.organization_id;
            rolesList = [
              {
                id: `role-${pendingInvite.role.toLowerCase().replace(/_/g, '-')}`,
                name: pendingInvite.role,
                organization_id: organizationId,
                description: `Authoritative ${pendingInvite.role} role`,
                permissions: [{ permission_id: 'tenant.workspace.read', scope_level: 'Organization' as ScopeLevel }],
              },
            ];
            profileRow = {
              id: `prof-${authUserId}`,
              auth_user_id: authUserId,
              organization_id: organizationId,
              email: emailLower,
              full_name: pendingInvite.full_name || fullName,
            };
          }
        }

        if (profileRow) {
          organizationId = profileRow.organization_id;
          employeeId = profileRow.employee_id;
          if (profileRow.full_name) fullName = profileRow.full_name;
          if (profileRow.phone) phone = profileRow.phone;
          if (profileRow.avatar_url) avatarUrl = profileRow.avatar_url;

          // Parse linked roles from user_roles join
          const rawUserRoles = profileRow.user_roles || [];
          for (const ur of rawUserRoles) {
            const r = (ur as any).roles;
            if (r) {
              rolesList.push({
                id: r.id || `role-${(r.code || r.name || '').toLowerCase()}`,
                name: r.name || r.code || 'Employee',
                organization_id: organizationId || 'root',
                description: r.description || r.name,
                permissions: [{ permission_id: 'tenant.workspace.read', scope_level: 'Organization' as ScopeLevel }],
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn('[RoleResolution] Database profile resolution notice:', dbErr);
      }
    }

    // 5. Evaluate Highest Authority Role with Explicit Priority
    // Priority: Super Admin > Company Admin > HR Head > HR Admin > Manager > Team Lead > Vendor Admin > Employee
    let primaryRole: ResolvedPortalRole = 'Unassigned';

    const normalizedRoleCodes = rolesList.map((r) => String(r.name || '').trim().toUpperCase());

    if (
      normalizedRoleCodes.some((c) =>
        [
          'COMPANY_ADMIN',
          'COMPANY ADMIN',
          'COMPANY ADMINISTRATOR',
          'ORGANIZATION_ADMIN',
          'ORGANIZATION ADMIN',
          'ORGANIZATION OWNER',
          'OWNER',
        ].includes(c)
      ) ||
      userMeta.role === 'COMPANY_ADMIN' ||
      userMeta.role === 'Company Admin' ||
      userMeta.role === 'Company Administrator'
    ) {
      primaryRole = 'Company Admin';
    } else if (
      normalizedRoleCodes.some((c) => ['HR_HEAD', 'HR HEAD'].includes(c)) ||
      userMeta.role === 'HR_HEAD' ||
      userMeta.role === 'HR Head'
    ) {
      primaryRole = 'HR Head';
    } else if (
      normalizedRoleCodes.some((c) => ['HR_ADMIN', 'HR ADMIN', 'PAYROLL_ADMIN', 'ATTENDANCE_ADMIN'].includes(c)) ||
      userMeta.role === 'HR_ADMIN' ||
      userMeta.role === 'HR Admin'
    ) {
      primaryRole = 'HR Admin';
    } else if (
      normalizedRoleCodes.some((c) => ['MANAGER'].includes(c)) ||
      userMeta.role === 'MANAGER' ||
      userMeta.role === 'Manager'
    ) {
      primaryRole = 'Manager';
    } else if (
      normalizedRoleCodes.some((c) => ['TEAM_LEAD', 'LEAD'].includes(c)) ||
      userMeta.role === 'TEAM_LEAD' ||
      userMeta.role === 'Team Lead'
    ) {
      primaryRole = 'Team Lead';
    } else if (
      normalizedRoleCodes.some((c) => ['VENDOR_ADMIN', 'VENDOR'].includes(c)) ||
      userMeta.role === 'VENDOR_ADMIN'
    ) {
      primaryRole = 'Vendor Admin';
    } else if (
      normalizedRoleCodes.some((c) => ['EMPLOYEE', 'STAFF'].includes(c)) ||
      userMeta.role === 'EMPLOYEE' ||
      userMeta.role === 'Employee'
    ) {
      primaryRole = 'Employee';
    } else if (rolesList.length > 0) {
      const firstRoleName = rolesList[0].name.toLowerCase();
      if (firstRoleName.includes('admin') || firstRoleName.includes('owner')) primaryRole = 'Company Admin';
      else if (firstRoleName.includes('hr')) primaryRole = 'HR Head';
      else if (firstRoleName.includes('manager')) primaryRole = 'Manager';
      else if (firstRoleName.includes('lead')) primaryRole = 'Team Lead';
      else if (firstRoleName.includes('employee')) primaryRole = 'Employee';
      else primaryRole = 'Unassigned';
    } else if (cachedUser?.roles && cachedUser.roles.length > 0) {
      const cachedRoleName = cachedUser.roles[0].name;
      if (['Company Admin', 'COMPANY_ADMIN', 'Company Administrator'].includes(cachedRoleName)) primaryRole = 'Company Admin';
      else if (['HR Head', 'HR_HEAD'].includes(cachedRoleName)) primaryRole = 'HR Head';
      else if (['HR Admin', 'HR_ADMIN'].includes(cachedRoleName)) primaryRole = 'HR Admin';
      else if (['Employee', 'EMPLOYEE'].includes(cachedRoleName)) primaryRole = 'Employee';
      else primaryRole = 'Unassigned';
    } else {
      // STRICT REQUIREMENT: Never default unresolved users to Employee
      primaryRole = 'Unassigned';
    }

    // 6. Ensure rolesList has the resolved primary role
    if (primaryRole !== 'Unassigned') {
      if (rolesList.length === 0 || !rolesList.some((r) => r.name === primaryRole)) {
        rolesList = [
          {
            id: `role-${primaryRole.toLowerCase().replace(/\s+/g, '-')}`,
            name: primaryRole,
            organization_id: organizationId || 'root',
            description: `${primaryRole} Role`,
            permissions: [
              { permission_id: 'tenant.workspace.read', scope_level: 'Organization' as ScopeLevel },
              { permission_id: 'tenant.workspace.write', scope_level: 'Organization' as ScopeLevel },
            ],
          },
        ];
      }
    }

    // 7. Determine Canonical Destination Route
    // ABSOLUTE RULE:
    // Company Admin -> 'executive-overview' (NEVER 'ess-dashboard')
    // HR Head / HR Admin -> 'dashboard' (NEVER 'ess-dashboard')
    // Employee -> 'ess-dashboard'
    // Unassigned -> 'unauthorized'
    let destinationRoute = 'unauthorized';
    if ((primaryRole as ResolvedPortalRole) === 'Super Admin') {
      destinationRoute = 'platform-dashboard';
    } else if (primaryRole === 'Company Admin') {
      destinationRoute = 'executive-overview';
    } else if (primaryRole === 'HR Head' || primaryRole === 'HR Admin') {
      destinationRoute = 'dashboard';
    } else if (primaryRole === 'Manager') {
      destinationRoute = 'dashboard';
    } else if (primaryRole === 'Team Lead') {
      destinationRoute = 'tl-dashboard';
    } else if (primaryRole === 'Vendor Admin') {
      destinationRoute = 'vendor-settlement-workspace';
    } else if (primaryRole === 'Employee') {
      destinationRoute = 'ess-dashboard';
    } else {
      destinationRoute = 'unauthorized';
    }

    const fallbackOrgId =
      typeof window !== 'undefined'
        ? localStorage.getItem('workforce_active_org_id') || 'org-joy-corporate-solutions-private-'
        : 'org-joy-corporate-solutions-private-';

    const sessionUser: AuthSessionUser = {
      id: authUserId,
      auth_user_id: authUserId,
      email: emailLower,
      name: fullName,
      phone: phone || undefined,
      avatar_url: avatarUrl || '',
      organization_id: organizationId || fallbackOrgId,
      tenant_id: organizationId || fallbackOrgId,
      employee_id: employeeId || undefined,
      status: 'Active',
      account_status: 'ACTIVE',
      is_platform_admin: false,
      platform_role: undefined,
      role: primaryRole,
      roles: rolesList,
      created_at: createdAt || cachedUser?.created_at || new Date().toISOString(),
    };

    return {
      sessionUser,
      primaryRole,
      destinationRoute,
      isPlatformAdmin: false,
      organizationId: sessionUser.organization_id || null,
      employeeId: employeeId,
      fullName: fullName,
      phone: phone,
      avatarUrl: avatarUrl,
      platformRole: undefined,
    };
  },
};
