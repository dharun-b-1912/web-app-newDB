// src/types/authContext.ts
// ============================================================================
// Joy PeopleHR — Authoritative Authentication Context & Portal Routing Contracts
// ============================================================================

export enum PortalType {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  EMPLOYEE_HR = 'EMPLOYEE_HR',
  VENDOR = 'VENDOR',
}

export type AccountStatus =
  | 'PENDING_INVITATION'
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'MUST_CHANGE_PASSWORD'
  | 'SUSPENDED'
  | 'LOCKED'
  | 'DISABLED'
  | 'INACTIVE';

export interface AuthContext {
  userId: string;
  authUserId: string;
  identity: {
    email: string;
    phone?: string;
    fullName: string;
    avatarUrl?: string;
  };
  accountStatus: AccountStatus;
  tenant: {
    organizationId: string;
    organizationName: string;
  } | null;
  company: {
    companyId: string;
    companyName: string;
  } | null;
  employeeId?: string;
  vendorId?: string;
  roles: string[];
  primaryRole: string;
  scopes: {
    platform: boolean;
    organization: boolean;
    company: boolean;
    employee: boolean;
    vendor: boolean;
  };
  portalType?: PortalType;
  authorizedRelationshipIds?: string[];
  allowedPortals: PortalType[];
  defaultPortal: PortalType;
  defaultRoute: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

export const PORTAL_DEFAULT_ROUTES: Record<PortalType, string> = {
  [PortalType.PLATFORM_ADMIN]: 'platform-dashboard',
  [PortalType.ORGANIZATION_ADMIN]: 'executive-overview',
  [PortalType.COMPANY_ADMIN]: 'executive-overview',
  [PortalType.EMPLOYEE_HR]: 'dashboard', // HR Head & Manager default; Employee resolves to ess-dashboard
  [PortalType.VENDOR]: 'vendor-settlement-workspace',
};
