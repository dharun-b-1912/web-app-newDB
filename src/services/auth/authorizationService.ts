// src/services/auth/authorizationService.ts
// ============================================================================
// JOY PeopleHR — Authoritative RBAC + Scope Authorization Engine
// Organization Bound • Branch/Site Scope • Zero Bypass
// ============================================================================

import { AuthenticatedUserContext, tenantContextService } from '../tenant/tenantContextService';

export type SystemRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'HR_HEAD'
  | 'HR_ADMIN'
  | 'PAYROLL_ADMIN'
  | 'ATTENDANCE_ADMIN'
  | 'MANAGER'
  | 'EMPLOYEE'
  | 'VENDOR_ADMIN'
  | 'VENDOR_USER'
  | 'AUDITOR'
  | 'IT_ADMIN';

export interface AuthorizationCheckRequest {
  resource: string;
  action: string;
  targetOrganizationId?: string;
  targetBranchId?: string;
  targetSiteId?: string;
  targetEmployeeId?: string;
  targetVendorId?: string;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason: string;
  evaluatedRole: string;
  evaluatedOrgId: string;
}

class AuthorizationService {
  /**
   * Evaluates if the authenticated user context is authorized to perform an action on a resource.
   */
  authorize(req: AuthorizationCheckRequest, context?: AuthenticatedUserContext): AuthorizationResult {
    const ctx = context || tenantContextService.getActiveContext();

    // 1. Validate Membership Status
    if (ctx.membershipStatus !== 'ACTIVE') {
      return {
        authorized: false,
        reason: `User membership status is ${ctx.membershipStatus}. Access forbidden.`,
        evaluatedRole: ctx.role,
        evaluatedOrgId: ctx.organizationId,
      };
    }

    // 2. Super Admin Bypass (Platform Scope)
    if (ctx.isPlatformAdmin || ctx.role.toUpperCase() === 'SUPER_ADMIN' || ctx.role === 'Super Admin') {
      return {
        authorized: true,
        reason: 'Super Admin platform privilege granted.',
        evaluatedRole: ctx.role,
        evaluatedOrgId: ctx.organizationId,
      };
    }

    // 3. Organization Boundary Check
    if (req.targetOrganizationId && req.targetOrganizationId !== 'ALL') {
      if (req.targetOrganizationId !== ctx.organizationId) {
        return {
          authorized: false,
          reason: `Cross-tenant violation: User belongs to ${ctx.organizationId}, requested ${req.targetOrganizationId}.`,
          evaluatedRole: ctx.role,
          evaluatedOrgId: ctx.organizationId,
        };
      }
    }

    // 4. Branch & Site Scope Check
    if (req.targetBranchId && ctx.branchIds.length > 0 && !ctx.branchIds.includes('ALL')) {
      if (!ctx.branchIds.includes(req.targetBranchId)) {
        return {
          authorized: false,
          reason: `Branch scope violation: User not authorized for branch ${req.targetBranchId}.`,
          evaluatedRole: ctx.role,
          evaluatedOrgId: ctx.organizationId,
        };
      }
    }

    if (req.targetSiteId && ctx.siteIds.length > 0 && !ctx.siteIds.includes('ALL')) {
      if (!ctx.siteIds.includes(req.targetSiteId)) {
        return {
          authorized: false,
          reason: `Site scope violation: User not authorized for site ${req.targetSiteId}.`,
          evaluatedRole: ctx.role,
          evaluatedOrgId: ctx.organizationId,
        };
      }
    }

    // 5. Permission / Action Matrix
    const requestedPerm = `${req.resource}.${req.action}`;
    const hasWildcard = ctx.permissions.includes('*') || ctx.permissions.includes(`${req.resource}.*`);
    const hasExplicitPerm = ctx.permissions.includes(requestedPerm);

    if (hasWildcard || hasExplicitPerm || ctx.role === 'Org Admin' || ctx.role === 'HR Head') {
      return {
        authorized: true,
        reason: `Permission ${requestedPerm} granted for role ${ctx.role}.`,
        evaluatedRole: ctx.role,
        evaluatedOrgId: ctx.organizationId,
      };
    }

    return {
      authorized: false,
      reason: `Insufficient privileges: Missing permission ${requestedPerm}.`,
      evaluatedRole: ctx.role,
      evaluatedOrgId: ctx.organizationId,
    };
  }

  /**
   * Asserts authorization and throws if unauthorized.
   */
  assertAuthorized(req: AuthorizationCheckRequest, context?: AuthenticatedUserContext): void {
    const res = this.authorize(req, context);
    if (!res.authorized) {
      throw new Error(`[FORBIDDEN] ${res.reason}`);
    }
  }
}

export const authorizationService = new AuthorizationService();
