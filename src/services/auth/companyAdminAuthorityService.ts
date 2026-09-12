// src/services/auth/companyAdminAuthorityService.ts
// ============================================================================
// Joy PeopleHR — Company Admin Authority & Feature Reality Engine
// Gate 14A: 17 Sidebar Features, Granular Action Matrix & Dual Persona Resolution
// ============================================================================

import { PortalType, AuthContext } from '../../types/authContext';
import { PortalAccessResolver } from './portalAccessResolver';

export type PermissionAction =
  | 'VIEW'
  | 'CREATE'
  | 'EDIT'
  | 'DELETE'
  | 'APPROVE'
  | 'EXPORT'
  | 'CONFIGURE';

export interface CompanyAdminSidebarFeature {
  id: string;
  category: 'HOME' | 'WORKFORCE' | 'OPERATIONS' | 'PAYROLL' | 'MANPOWER' | 'ADMINISTRATION';
  label: string;
  route: string;
  allowedActions: PermissionAction[];
  isCompanyScoped: boolean;
  isPlatformAdminOnly: boolean;
  description: string;
}

export interface DualPersonaContext {
  userId: string;
  authEmail: string;
  fullName: string;
  organizationId: string;
  companyId: string;
  employeeId?: string;
  biometricId?: string;
  webAuthContext: AuthContext;
  mobileFlutterAuthContext: AuthContext;
}

export class CompanyAdminAuthorityService {
  /**
   * Authoritative List of All 17 Company Admin Sidebar Features
   */
  public static readonly SIDEBAR_FEATURES: CompanyAdminSidebarFeature[] = [
    // 1. HOME
    {
      id: 'my-work',
      category: 'HOME',
      label: 'My Work',
      route: 'dashboard',
      allowedActions: ['VIEW', 'APPROVE'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Personal task queue, pending workflow approvals, and operational notifications.',
    },
    // 2. WORKFORCE
    {
      id: 'people',
      category: 'WORKFORCE',
      label: 'People',
      route: 'employees',
      allowedActions: ['VIEW', 'CREATE', 'EDIT', 'EXPORT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Employee lifecycle, onboarding, directory, and employee profile management.',
    },
    {
      id: 'organization',
      category: 'WORKFORCE',
      label: 'Organization',
      route: 'settings/company-profile',
      allowedActions: ['VIEW', 'EDIT', 'CONFIGURE'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Company-level departments, designations, locations, and operational shifts.',
    },
    // 3. OPERATIONS
    {
      id: 'attendance',
      category: 'OPERATIONS',
      label: 'Attendance',
      route: 'attendance',
      allowedActions: ['VIEW', 'EDIT', 'APPROVE', 'EXPORT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Company attendance dashboard, regularization workflows, and device logs.',
    },
    {
      id: 'requests-approvals',
      category: 'OPERATIONS',
      label: 'Requests & Approvals',
      route: 'approvals',
      allowedActions: ['VIEW', 'APPROVE'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Central multi-domain approval inbox for leaves, overtime, and separations.',
    },
    // 4. PAYROLL
    {
      id: 'payroll-center',
      category: 'PAYROLL',
      label: 'Payroll Center',
      route: 'payroll',
      allowedActions: ['VIEW', 'APPROVE', 'EXPORT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Payroll runs, monthly summaries, and salary structure administration.',
    },
    {
      id: 'payroll-compliance',
      category: 'PAYROLL',
      label: 'Compliance (Payroll)',
      route: 'payroll-statutory',
      allowedActions: ['VIEW', 'EXPORT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Statutory compliance tracking (PF, ESI, Professional Tax, TDS).',
    },
    {
      id: 'payroll-reports',
      category: 'PAYROLL',
      label: 'Reports (Payroll)',
      route: 'payroll-reports',
      allowedActions: ['VIEW', 'EXPORT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Statutory ECR reports, wage registers, and bank disbursement schedules.',
    },
    // 5. MANPOWER
    {
      id: 'manpower-partners',
      category: 'MANPOWER',
      label: 'Partners',
      route: 'vendor-desk',
      allowedActions: ['VIEW', 'CREATE', 'EDIT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Authorized staffing vendors and labor contractors assigned to this company.',
    },
    {
      id: 'manpower-deployment',
      category: 'MANPOWER',
      label: 'Deployment',
      route: 'vendor-desk',
      allowedActions: ['VIEW', 'APPROVE', 'EXPORT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Site-wise worker allocations, daily deployment rosters, and trade tracking.',
    },
    {
      id: 'manpower-settlement',
      category: 'MANPOWER',
      label: 'Settlement',
      route: 'vendor-settlement-workspace',
      allowedActions: ['VIEW', 'APPROVE'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Commercial 3-way match verification and contractor invoice approval.',
    },
    {
      id: 'manpower-compliance',
      category: 'MANPOWER',
      label: 'Compliance (Manpower)',
      route: 'vendor-desk',
      allowedActions: ['VIEW', 'EXPORT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Principal Employer Form V certificates and CLRA statutory records.',
    },
    // 6. ADMINISTRATION
    {
      id: 'access-roles',
      category: 'ADMINISTRATION',
      label: 'Access & Roles',
      route: 'settings/roles',
      allowedActions: ['VIEW', 'CREATE', 'EDIT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Company-level role assignment (HR Head, Manager, Employee, Team Lead).',
    },
    {
      id: 'security',
      category: 'ADMINISTRATION',
      label: 'Security',
      route: 'settings/security',
      allowedActions: ['VIEW'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Company login audit stream, active sessions, and multi-factor status.',
    },
    {
      id: 'integrations',
      category: 'ADMINISTRATION',
      label: 'Integrations',
      route: 'settings/integrations',
      allowedActions: ['VIEW', 'CONFIGURE'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Company biometric LAN gateway configuration and edge device pairing.',
    },
    {
      id: 'audit-monitoring',
      category: 'ADMINISTRATION',
      label: 'Audit & Monitoring',
      route: 'settings/audit',
      allowedActions: ['VIEW', 'EXPORT'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Immutable company event stream and operational audit trails.',
    },
    {
      id: 'company-settings',
      category: 'ADMINISTRATION',
      label: 'Company Settings',
      route: 'settings/company-profile',
      allowedActions: ['VIEW', 'EDIT', 'CONFIGURE'],
      isCompanyScoped: true,
      isPlatformAdminOnly: false,
      description: 'Company branding, operating hours, holiday calendar, and local preferences.',
    },
  ];

  /**
   * Resolves whether Company Admin is authorized for an action on a feature
   */
  public static isActionPermitted(featureId: string, action: PermissionAction): boolean {
    const feature = this.SIDEBAR_FEATURES.find((f) => f.id === featureId);
    if (!feature) return false;
    return feature.allowedActions.includes(action);
  }

  /**
   * Enforces strict company scope on query parameters
   */
  public static validateCompanyDataQuery(userCompanyId: string, queryCompanyId: string): {
    allowed: boolean;
    reason: string;
  } {
    if (!userCompanyId || !queryCompanyId) {
      return { allowed: false, reason: 'Invalid company identification.' };
    }
    if (userCompanyId !== queryCompanyId) {
      return {
        allowed: false,
        reason: `FORBIDDEN_CROSS_COMPANY_ACCESS: Company Admin (${userCompanyId}) cannot access records of sibling company (${queryCompanyId}).`,
      };
    }
    return { allowed: true, reason: 'Company scope verified.' };
  }

  /**
   * Resolves Dual Persona Context for a User (Web Company Admin vs Flutter Mobile ESS)
   */
  public static resolveDualPersona(params: {
    userId: string;
    authUserId: string;
    email: string;
    fullName: string;
    organizationId: string;
    companyId: string;
    employeeId: string;
    biometricId: string;
  }): DualPersonaContext {
    // 1. Web Portal Context: Company Admin Persona
    const webAuthContext = PortalAccessResolver.resolve({
      userId: params.userId,
      authUserId: params.authUserId,
      email: params.email,
      fullName: params.fullName,
      accountStatus: 'ACTIVE',
      organizationId: params.organizationId,
      companyId: params.companyId,
      employeeId: params.employeeId,
      rawRoles: ['COMPANY_ADMIN', 'EMPLOYEE'],
    });

    // 2. Flutter Mobile Context: Employee Self-Service Persona
    const mobileFlutterAuthContext = PortalAccessResolver.resolve({
      userId: params.userId,
      authUserId: params.authUserId,
      email: params.email,
      fullName: params.fullName,
      accountStatus: 'ACTIVE',
      organizationId: params.organizationId,
      companyId: params.companyId,
      employeeId: params.employeeId,
      rawRoles: ['EMPLOYEE'], // Mobile forces Employee Self-Service context
    });

    return {
      userId: params.userId,
      authEmail: params.email,
      fullName: params.fullName,
      organizationId: params.organizationId,
      companyId: params.companyId,
      employeeId: params.employeeId,
      biometricId: params.biometricId,
      webAuthContext,
      mobileFlutterAuthContext,
    };
  }

  /**
   * Privilege Escalation Barrier: Validates role assignment authority
   */
  public static validateRoleAssignmentAuthority(
    actorRole: string,
    targetRoleToAssign: string
  ): {
    allowed: boolean;
    reason: string;
  } {
    const forbiddenForCompanyAdmin = [
      'SUPER_ADMIN',
      'PLATFORM_ADMIN',
      'ORGANIZATION_ADMIN',
      'ORGANIZATION_OWNER',
    ];

    if (actorRole === 'COMPANY_ADMIN') {
      const normalizedTarget = targetRoleToAssign.toUpperCase().replace(/\s+/g, '_');
      if (forbiddenForCompanyAdmin.includes(normalizedTarget)) {
        return {
          allowed: false,
          reason: `PRIVILEGE_ESCALATION_BLOCKED: Company Admin is strictly prohibited from granting '${targetRoleToAssign}'.`,
        };
      }
      return {
        allowed: true,
        reason: 'Authorized operational company role assignment.',
      };
    }

    return { allowed: true, reason: 'Authorized' };
  }
}
