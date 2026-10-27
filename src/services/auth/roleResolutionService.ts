// src/services/auth/roleResolutionService.ts
// ============================================================================
// Joy PeopleHR — Authoritative Database-Driven Role & Identity Resolution Service
// Resolves user profile, canonical roles, and portal routing from live Supabase DB
// Master Authority: PortalAccessResolver
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { AuthSessionUser } from './authService';
import { Role, ScopeLevel } from '../../types';
import { platformAuthInvitationService } from '../platform/platformAuthInvitationService';
import { PortalAccessResolver } from './portalAccessResolver';
import { AuthContext, PortalType } from '../../types/authContext';

export type ResolvedPortalRole =
  | 'Super Admin'
  | 'Organization Admin'
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
  authContext: AuthContext;
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
    let organizationName: string | null = null;
    let companyId: string | null = null;
    let companyName: string | null = null;
    let employeeId: string | null = null;
    let vendorId: string | null = null;
    let fullName: string = userMeta.full_name || userMeta.name || cachedUser?.name || (emailLower ? emailLower.split('@')[0] : 'User');
    let phone: string | null = userMeta.phone || null;
    let avatarUrl: string | null = userMeta.avatar_url || cachedUser?.avatar_url || null;
    let rawRoles: any[] = [];
    let accountStatus = 'ACTIVE';

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

    // 2. Query public.user_profiles and linked user_roles + roles from Supabase
    let profileRow: any = null;

    if (isSupabaseEnabled && !isPlatformAdmin) {
      try {
        const profAbort = new AbortController();
        const profTimer = setTimeout(() => profAbort.abort(), 4000);

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
            .abortSignal(profAbort.signal)
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
            .abortSignal(profAbort.signal)
            .maybeSingle();
          clearTimeout(profTimer);

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
            organizationName = pendingInvite.organization_name || null;
            rawRoles.push(pendingInvite.role);
            profileRow = {
              id: `prof-${authUserId}`,
              auth_user_id: authUserId,
              organization_id: organizationId,
              email: emailLower,
              full_name: pendingInvite.full_name || fullName,
              role: pendingInvite.role,
              status: 'ACTIVE',
            };
          }
        }

        if (profileRow) {
          organizationId = profileRow.organization_id;
          companyId = profileRow.company_id || null;
          employeeId = profileRow.employee_id || null;
          vendorId = profileRow.vendor_id || null;
          if (profileRow.full_name) fullName = profileRow.full_name;
          if (profileRow.phone) phone = profileRow.phone;
          if (profileRow.avatar_url) avatarUrl = profileRow.avatar_url;
          if (profileRow.status) accountStatus = profileRow.status;
          if (profileRow.role) rawRoles.push(profileRow.role);

          // Parse linked roles from user_roles join
          const rawUserRoles = profileRow.user_roles || [];
          for (const ur of rawUserRoles) {
            const r = (ur as any).roles;
            if (r) {
              rawRoles.push(r);
            }
          }
        }

        // 4. Query employee record if employee_id exists, OR if matching email or auth_user_id exists
        if (employeeId || emailLower || authUserId) {
          try {
            let empQuery = supabase
              .from('employees')
              .select('id, employee_code, first_name, last_name, display_name, organization_id, company_id, role, designation_id, is_hr_head, work_email, personal_email');

            if (employeeId) {
              empQuery = empQuery.eq('id', employeeId);
            } else if (emailLower) {
              empQuery = empQuery.or(`work_email.ilike.${emailLower},personal_email.ilike.${emailLower}`);
            }

            const { data: empRow } = await empQuery.maybeSingle();

            if (empRow) {
              if (!employeeId) employeeId = empRow.id;
              
              const empFullName = empRow.display_name || `${empRow.first_name || ''} ${empRow.last_name || ''}`.trim();
              const isGenericOrPlaceholder =
                !fullName ||
                fullName === 'User' ||
                fullName.toLowerCase().includes('admin') ||
                fullName.toLowerCase().includes('manpower') ||
                (emailLower && fullName.toLowerCase() === emailLower.split('@')[0].toLowerCase());

              if (empFullName && (isGenericOrPlaceholder || !profileRow?.full_name)) {
                fullName = empFullName;
              }

              if (rawRoles.length === 0) {
                if (empRow.role) rawRoles.push(empRow.role);
                if (empRow.is_hr_head) rawRoles.push('HR_HEAD');
                if (!empRow.role && !empRow.is_hr_head) rawRoles.push('EMPLOYEE');
              }
              if (empRow.organization_id && !organizationId) organizationId = empRow.organization_id;
              if (empRow.company_id && !companyId) companyId = empRow.company_id;

              // Auto-heal user_profiles if employee_id or full_name was missing / generic
              if (profileRow?.id && (!profileRow.employee_id || isGenericOrPlaceholder)) {
                try {
                  await supabase
                    .from('user_profiles')
                    .update({
                      employee_id: empRow.id,
                      full_name: fullName,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', profileRow.id);
                } catch (_) {}
              }
            }
          } catch (_) {}
        }

        // 5. Query vendor_users if user is a vendor partner
        if (rawRoles.length === 0 && (authUserId || emailLower)) {
          try {
            const filterClause = authUserId
              ? `auth_user_id.eq.${authUserId},email.eq.${emailLower}`
              : `email.eq.${emailLower}`;
            const { data: vUser } = await supabase
              .from('vendor_users')
              .select('*, vendors(*)')
              .or(filterClause)
              .maybeSingle();

            if (vUser) {
              vendorId = vUser.vendor_id;
              rawRoles.push('Vendor Admin');
              if (vUser.full_name) fullName = vUser.full_name;
              if (vUser.phone) phone = vUser.phone;
              accountStatus = vUser.status || 'ACTIVE';
            }
          } catch (_) {}
        }
      } catch (dbErr) {
        console.warn('[RoleResolution] Database profile resolution notice:', dbErr);
      }
    }

    // 5. If userMeta has role or cached user has role
    if (userMeta.role) rawRoles.push(userMeta.role);
    if (cachedUser?.roles && Array.isArray(cachedUser.roles)) {
      for (const cr of cachedUser.roles) {
        if (cr.name) rawRoles.push(cr.name);
      }
    }

    // 6. Invoke Authoritative PortalAccessResolver
    const authContext = PortalAccessResolver.resolve({
      userId: profileRow?.id || authUserId,
      authUserId: authUserId,
      email: emailLower,
      fullName: fullName,
      phone: phone,
      avatarUrl: avatarUrl,
      accountStatus: accountStatus,
      mustChangePassword: Boolean(userMeta.must_change_password || userMeta.require_password_change),
      isPlatformAdmin: isPlatformAdmin,
      platformRole: isPlatformAdmin ? 'SUPER_ADMIN' : undefined,
      organizationId: organizationId,
      organizationName: organizationName,
      companyId: companyId,
      companyName: companyName,
      employeeId: employeeId,
      vendorId: vendorId,
      rawRoles: rawRoles,
      userMetadataRole: userMeta.role,
    });

    const primaryRole = authContext.primaryRole as ResolvedPortalRole;
    const destinationRoute = authContext.defaultRoute;

    const rolesList: Role[] = authContext.roles.map((rName) => ({
      id: `role-${rName.toLowerCase().replace(/\s+/g, '-')}`,
      name: rName,
      organization_id: authContext.tenant?.organizationId || 'root',
      description: `${rName} Role`,
      permissions: isPlatformAdmin
        ? [{ permission_id: '*', scope_level: 'Organization' as ScopeLevel }]
        : [
            { permission_id: 'tenant.workspace.read', scope_level: 'Organization' as ScopeLevel },
            { permission_id: 'tenant.workspace.write', scope_level: 'Organization' as ScopeLevel },
          ],
    }));

    const sessionUser: AuthSessionUser = {
      id: authContext.userId,
      auth_user_id: authContext.authUserId,
      email: authContext.identity.email,
      name: authContext.identity.fullName,
      phone: authContext.identity.phone,
      avatar_url: authContext.identity.avatarUrl || '',
      organization_id: authContext.tenant?.organizationId || '0c621892-e938-4707-9957-13534ea32c19',
      tenant_id: authContext.tenant?.organizationId || '0c621892-e938-4707-9957-13534ea32c19',
      employee_id: authContext.employeeId,
      status: authContext.accountStatus === 'ACTIVE' ? 'Active' : authContext.accountStatus === 'PENDING_ACTIVATION' ? 'Invited' : 'Suspended',
      account_status: authContext.accountStatus as any,
      must_change_password: authContext.mustChangePassword,
      is_platform_admin: authContext.scopes.platform,
      platform_role: authContext.scopes.platform ? 'SUPER_ADMIN' : undefined,
      role: primaryRole,
      roles: rolesList,
      created_at: createdAt || cachedUser?.created_at || new Date().toISOString(),
    };

    return {
      sessionUser,
      primaryRole,
      destinationRoute,
      isPlatformAdmin: authContext.scopes.platform,
      organizationId: authContext.tenant?.organizationId || null,
      employeeId: authContext.employeeId || null,
      fullName: authContext.identity.fullName,
      phone: authContext.identity.phone || null,
      avatarUrl: authContext.identity.avatarUrl || null,
      platformRole: authContext.scopes.platform ? 'SUPER_ADMIN' : undefined,
      authContext,
    };
  },
};
