// src/services/auth/portalAccessResolver.ts
// ============================================================================
// Joy PeopleHR — Authoritative Portal Access & Identity Resolver Engine
// Master Authority for Role Precedence, Tenant Scoping, and Portal Routing
// ============================================================================

import { AuthContext, PortalType, PORTAL_DEFAULT_ROUTES } from '../../types/authContext';

export interface ResolvePortalParams {
  userId: string;
  authUserId?: string;
  email?: string;
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  accountStatus?: string | null;
  mustChangePassword?: boolean;
  isPlatformAdmin?: boolean;
  platformRole?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  employeeId?: string | null;
  vendorId?: string | null;
  role?: string | null;
  roles?: string[] | null;
  rawRoles?: Array<{ code?: string; name?: string; hierarchy_level?: number } | string>;
  userMetadataRole?: string | null;
}

export class PortalAccessResolver {
  /**
   * Resolves the authoritative AuthContext, allowed portals, and default entry route.
   * Enforces strict deterministic hierarchy:
   * Level 0: SUPER_ADMIN / PLATFORM_ADMIN -> PLATFORM_ADMIN (/platform-dashboard)
   * Level 1: ORGANIZATION_OWNER / ORGANIZATION_ADMIN -> ORGANIZATION_ADMIN (/executive-overview)
   * Level 2: COMPANY_OWNER / COMPANY_ADMIN -> COMPANY_ADMIN (/executive-overview)
   * Level 3: HR_HEAD / HR_ADMIN / PAYROLL_ADMIN -> EMPLOYEE_HR (/dashboard)
   * Level 4: VENDOR_ADMIN / VENDOR_MANAGER -> VENDOR (/vendor-settlement-workspace)
   * Level 5: MANAGER -> EMPLOYEE_HR (/dashboard)
   * Level 6: TEAM_LEAD -> EMPLOYEE_HR (/tl-dashboard)
   * Level 7: EMPLOYEE -> EMPLOYEE_HR (/ess-dashboard)
   */
  public static resolve(params: ResolvePortalParams): AuthContext {
    const emailLower = (params.email || '').trim().toLowerCase();
    const isPlatformStaff =
      Boolean(params.isPlatformAdmin) ||
      emailLower === 'superadmin@joypeoplehr.com' ||
      params.platformRole === 'SUPER_ADMIN';

    // 1. Normalize all role tokens from authoritative database sources
    const authoritativeTokens: string[] = [];
    const inputRoles = [
      ...(Array.isArray(params.rawRoles) ? params.rawRoles : []),
      ...(Array.isArray((params as any).roles) ? (params as any).roles : []),
      ...((params as any).role ? [(params as any).role] : []),
    ];
    for (const r of inputRoles) {
      if (typeof r === 'string') {
        authoritativeTokens.push(r.trim().toUpperCase());
      } else if (r && typeof r === 'object') {
        if (r.code) authoritativeTokens.push(String(r.code).trim().toUpperCase());
        if (r.name) authoritativeTokens.push(String(r.name).trim().toUpperCase());
      }
    }

    const roleTokens = [...authoritativeTokens];

    // Fallback: userMetadataRole only considered for non-platform tenant roles unless verified
    if (params.userMetadataRole) {
      const metaRole = String(params.userMetadataRole).trim().toUpperCase();
      // Guard against client-side injection of platform super admin privileges
      if (!['SUPER_ADMIN', 'SUPER ADMIN', 'PLATFORM_ADMIN', 'PLATFORM ADMIN'].includes(metaRole) || isPlatformStaff) {
        roleTokens.push(metaRole);
      }
    }

    // 2. Resolve Platform Administrator (Level 0) - Requires authoritative role or verified platform staff
    const hasAuthoritativePlatformRole = authoritativeTokens.some((c) =>
      ['SUPER_ADMIN', 'SUPER ADMIN', 'PLATFORM_ADMIN', 'PLATFORM ADMIN'].includes(c)
    );

    if (isPlatformStaff || hasAuthoritativePlatformRole) {
      return {
        userId: params.userId || params.authUserId,
        authUserId: params.authUserId || params.userId,
        identity: {
          email: emailLower,
          phone: params.phone || undefined,
          fullName: params.fullName || 'Platform Super Admin',
          avatarUrl: params.avatarUrl || undefined,
        },
        accountStatus: 'ACTIVE',
        tenant: {
          organizationId: 'platform-root',
          organizationName: 'Joy PeopleHR Platform Control Plane',
        },
        company: null,
        employeeId: undefined,
        vendorId: undefined,
        roles: ['Super Admin'],
        primaryRole: 'Super Admin',
        scopes: {
          platform: true,
          organization: true,
          company: true,
          employee: false,
          vendor: false,
        },
        allowedPortals: [PortalType.PLATFORM_ADMIN],
        defaultPortal: PortalType.PLATFORM_ADMIN,
        defaultRoute: PORTAL_DEFAULT_ROUTES[PortalType.PLATFORM_ADMIN],
        permissions: ['*'],
        mustChangePassword: Boolean(params.mustChangePassword),
      };
    }

    const orgId = params.organizationId || 'org-default';
    const orgName = params.organizationName || 'Organization';
    const compId = params.companyId || 'comp-default';
    const compName = params.companyName || 'Company';

    // 3. Evaluate Hierarchical Precedence
    const isOrgAdmin = roleTokens.some((c) =>
      ['ORGANIZATION_ADMIN', 'ORGANIZATION ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION OWNER', 'ORG_ADMIN', 'GROUP_HR_ADMIN', 'GROUP_FINANCE_ADMIN'].includes(c)
    );

    const isCompanyAdmin = roleTokens.some((c) =>
      ['COMPANY_ADMIN', 'COMPANY ADMIN', 'COMPANY_OWNER', 'COMPANY OWNER', 'OWNER', 'COMPANY ADMINISTRATOR'].includes(c)
    );

    const isHrHead = roleTokens.some((c) =>
      ['HR_HEAD', 'HR HEAD', 'HEAD_HR', 'HEAD HR', 'CHRO', 'VP_HR', 'VP HR'].includes(c)
    );

    const isHrAdmin = roleTokens.some((c) =>
      ['HR_ADMIN', 'HR ADMIN', 'PAYROLL_ADMIN', 'PAYROLL ADMIN', 'ATTENDANCE_ADMIN', 'ATTENDANCE ADMIN', 'FINANCE_ADMIN'].includes(c)
    );

    const isVendorAdmin = Boolean(params.vendorId) || roleTokens.some((c) =>
      ['VENDOR_ADMIN', 'VENDOR ADMIN', 'VENDOR_MANAGER', 'VENDOR', 'CONTRACTOR_LEAD'].includes(c)
    );

    const isManager = roleTokens.some((c) =>
      ['MANAGER', 'DEPARTMENT_HEAD', 'DEPT_HEAD'].includes(c)
    );

    const isTeamLead = roleTokens.some((c) =>
      ['TEAM_LEAD', 'TEAM LEAD', 'LEAD', 'SUPERVISOR'].includes(c)
    );

    let primaryRole = 'Employee';
    let allowedPortals: PortalType[] = [PortalType.EMPLOYEE_HR];
    let defaultPortal: PortalType = PortalType.EMPLOYEE_HR;
    let defaultRoute = 'ess-dashboard';
    let roles: string[] = ['Employee'];

    if (isOrgAdmin) {
      primaryRole = 'Organization Admin';
      allowedPortals = [PortalType.ORGANIZATION_ADMIN, PortalType.COMPANY_ADMIN, PortalType.EMPLOYEE_HR];
      defaultPortal = PortalType.ORGANIZATION_ADMIN;
      defaultRoute = 'executive-overview';
      roles = ['Organization Admin', 'Company Admin', 'Employee'];
    } else if (isCompanyAdmin) {
      primaryRole = 'Company Admin';
      allowedPortals = [PortalType.COMPANY_ADMIN, PortalType.EMPLOYEE_HR];
      defaultPortal = PortalType.COMPANY_ADMIN;
      defaultRoute = 'executive-overview';
      roles = ['Company Admin', 'Employee'];
    } else if (isHrHead) {
      primaryRole = 'HR Head';
      // HR Head default is Company / HR Management Workspace (/dashboard), NEVER Employee Portal (/ess-dashboard)
      allowedPortals = [PortalType.COMPANY_ADMIN, PortalType.EMPLOYEE_HR];
      defaultPortal = PortalType.COMPANY_ADMIN;
      defaultRoute = 'dashboard';
      roles = ['HR Head', 'Employee'];
    } else if (isHrAdmin) {
      primaryRole = 'HR Admin';
      allowedPortals = [PortalType.COMPANY_ADMIN, PortalType.EMPLOYEE_HR];
      defaultPortal = PortalType.COMPANY_ADMIN;
      defaultRoute = 'dashboard';
      roles = ['HR Admin', 'Employee'];
    } else if (isVendorAdmin) {
      primaryRole = 'Vendor Admin';
      allowedPortals = [PortalType.VENDOR];
      defaultPortal = PortalType.VENDOR;
      defaultRoute = 'vendor-settlement-workspace';
      roles = ['Vendor Admin'];
    } else if (isManager) {
      primaryRole = 'Manager';
      allowedPortals = [PortalType.EMPLOYEE_HR];
      defaultPortal = PortalType.EMPLOYEE_HR;
      defaultRoute = 'dashboard';
      roles = ['Manager', 'Employee'];
    } else if (isTeamLead) {
      primaryRole = 'Team Lead';
      allowedPortals = [PortalType.EMPLOYEE_HR];
      defaultPortal = PortalType.EMPLOYEE_HR;
      defaultRoute = 'tl-dashboard';
      roles = ['Team Lead', 'Employee'];
    } else {
      primaryRole = 'Employee';
      allowedPortals = [PortalType.EMPLOYEE_HR];
      defaultPortal = PortalType.EMPLOYEE_HR;
      defaultRoute = 'ess-dashboard';
      roles = ['Employee'];
    }

    const rawStatus = (params.accountStatus || 'ACTIVE').toUpperCase();
    const accountStatus = (
      ['ACTIVE', 'PENDING_ACTIVATION', 'PENDING_INVITATION', 'SUSPENDED', 'LOCKED', 'DISABLED', 'INACTIVE'].includes(rawStatus)
        ? rawStatus
        : 'ACTIVE'
    ) as any;

    return {
      userId: params.userId || params.authUserId,
      authUserId: params.authUserId || params.userId,
      identity: {
        email: emailLower,
        phone: params.phone || undefined,
        fullName: params.fullName || 'User',
        avatarUrl: params.avatarUrl || undefined,
      },
      accountStatus,
      tenant: {
        organizationId: orgId,
        organizationName: orgName,
      },
      company: {
        companyId: compId,
        companyName: compName,
      },
      employeeId: params.employeeId || undefined,
      vendorId: params.vendorId || undefined,
      roles,
      primaryRole,
      scopes: {
        platform: false,
        organization: isOrgAdmin,
        company: isOrgAdmin || isCompanyAdmin || isHrHead || isHrAdmin,
        employee: !isVendorAdmin,
        vendor: isVendorAdmin,
      },
      allowedPortals,
      defaultPortal,
      defaultRoute,
      permissions: [
        'tenant.workspace.read',
        'tenant.workspace.write',
      ],
      mustChangePassword: Boolean(params.mustChangePassword),
    };
  }

  /**
   * Deterministically verifies if a requested route or deep link is permitted under an AuthContext
   */
  public static isRouteAllowed(context: AuthContext, route: string): boolean {
    const r = (route || '').toLowerCase().trim();
    if (r.startsWith('platform-dashboard') || r.startsWith('platform/')) {
      return Boolean(context.scopes?.platform && context.allowedPortals.includes(PortalType.PLATFORM_ADMIN));
    }
    if (r.startsWith('executive-overview') || r.startsWith('org-overview')) {
      return Boolean(context.scopes?.organization || context.scopes?.company);
    }
    if (r.startsWith('settings/company-profile') || r.startsWith('company-settings')) {
      return Boolean(context.scopes?.company);
    }
    if (r.startsWith('rbac') || r.startsWith('roles')) {
      return Boolean(context.scopes?.company && !context.scopes?.vendor);
    }
    if (
      r === 'vendors' ||
      r.startsWith('vendors/') ||
      r === 'organization-vendors' ||
      r.startsWith('vendor-attendance') ||
      r.startsWith('vendor-workforce') ||
      r.startsWith('vendor-employees') ||
      r.startsWith('vendor-assignments')
    ) {
      return Boolean(context.scopes?.company);
    }
    if (r.startsWith('vendor-settlement') || r.startsWith('vendor/')) {
      return Boolean((context.scopes?.vendor && context.allowedPortals.includes(PortalType.VENDOR)) || context.scopes?.company);
    }
    if (r.startsWith('vendor-dashboard')) {
      return Boolean(context.scopes?.company || context.scopes?.vendor);
    }
    if (r.startsWith('dashboard')) {
      return Boolean((context.scopes?.company && !context.scopes?.vendor) || context.primaryRole === 'Manager' || context.primaryRole === 'Team Lead');
    }
    if (r.startsWith('payroll') || r.startsWith('payroll-run') || r.startsWith('payroll-processing')) {
      return Boolean(context.scopes?.company && !context.scopes?.vendor);
    }
    if (r.startsWith('people') || r.startsWith('employees') || r.startsWith('company-admin')) {
      return Boolean(context.scopes?.company && !context.scopes?.vendor);
    }
    if (r.startsWith('ess-dashboard') || r.startsWith('profile')) {
      return Boolean(context.scopes?.employee);
    }
    if (r.startsWith('vendor')) {
      return Boolean(context.scopes?.company || context.scopes?.vendor);
    }
    return true;
  }
}

