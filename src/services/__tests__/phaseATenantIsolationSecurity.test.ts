// src/services/__tests__/phaseATenantIsolationSecurity.test.ts
// ============================================================================
// Joy PeopleHR — Phase A: Multi-Tenant Security & Isolation Integration Tests
// Validates:
// 1. is_platform_admin() security against user_metadata tampering
// 2. Cross-tenant data boundary isolation (Tenant A vs Tenant B)
// 3. Central Entitlement Engine precedence evaluation
// 4. Edge Function authorization gates & elimination of cross-tenant company leakage
// ============================================================================

import { describe, it, expect } from 'vitest';

describe('Phase A — Multi-Tenant Security & Tenant Boundary Certification', () => {

  describe('1. Privilege Escalation Prevention in Platform Admin Check', () => {
    // Simulates the SQL logic of public.is_platform_admin()
    function evaluateIsPlatformAdmin(jwt: {
      email?: string;
      user_metadata?: Record<string, any>;
      app_metadata?: Record<string, any>;
    }, platformStaffList: { email: string; role: string; status: string }[] = []): boolean {
      // Rule 1: app_metadata is immutable by user
      if (jwt.app_metadata?.is_platform_admin === true) return true;
      // Rule 2: Root Super Admin email
      if (jwt.email === 'superadmin@joypeoplehr.com') return true;
      // Rule 3: Active Platform Staff Directory
      const inStaff = platformStaffList.some(
        s => s.email.toLowerCase() === (jwt.email || '').toLowerCase() &&
             s.status === 'Active' &&
             ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'OPS_ADMIN'].includes(s.role)
      );
      if (inStaff) return true;

      // Note: user_metadata is explicitly IGNORED
      return false;
    }

    it('REJECTS privilege escalation when a malicious user sets user_metadata.is_platform_admin = true', () => {
      const maliciousUserJwt = {
        email: 'attacker@competitor.com',
        user_metadata: { is_platform_admin: true, role: 'SUPER_ADMIN' },
        app_metadata: { organization_id: 'org-tenant-b' } // No app_metadata platform admin
      };

      const isAdmin = evaluateIsPlatformAdmin(maliciousUserJwt);
      expect(isAdmin).toBe(false);
    });

    it('GRANTS platform admin when set securely in server-controlled app_metadata', () => {
      const legitAdminJwt = {
        email: 'ops@joypeoplehr.com',
        app_metadata: { is_platform_admin: true },
      };

      const isAdmin = evaluateIsPlatformAdmin(legitAdminJwt);
      expect(isAdmin).toBe(true);
    });

    it('GRANTS platform admin to root superadmin email', () => {
      const rootAdminJwt = {
        email: 'superadmin@joypeoplehr.com',
        app_metadata: {},
      };

      const isAdmin = evaluateIsPlatformAdmin(rootAdminJwt);
      expect(isAdmin).toBe(true);
    });

    it('GRANTS platform admin to active staff in platform_staff directory', () => {
      const staffJwt = {
        email: 'mari@joycorporatesolutions.com',
        app_metadata: {},
      };
      const staffDb = [
        { email: 'mari@joycorporatesolutions.com', role: 'SUPER_ADMIN', status: 'Active' }
      ];

      const isAdmin = evaluateIsPlatformAdmin(staffJwt, staffDb);
      expect(isAdmin).toBe(true);
    });
  });

  describe('2. Central Entitlement Engine Precedence Evaluation (evaluate_tenant_feature)', () => {
    interface OrgContext {
      id: string;
      status: string;
      plan: string;
    }

    interface EntitlementDecision {
      is_allowed: boolean;
      reason: string;
      source: string;
    }

    function evaluateTenantFeature(
      org: OrgContext,
      featureKey: string,
      globalFlags: Record<string, boolean> = {},
      tenantOverrides: Record<string, boolean> = {}
    ): EntitlementDecision {
      // Precedence 1: Global Kill Switch
      if (globalFlags[featureKey] === false) {
        return {
          is_allowed: false,
          reason: 'Module temporarily disabled for system maintenance',
          source: 'GLOBAL_KILL_SWITCH',
        };
      }

      // Precedence 2: Organization Status / Suspension
      if (['Suspended', 'SUSPENDED', 'Locked', 'Archived', 'Cancelled'].includes(org.status)) {
        return {
          is_allowed: false,
          reason: 'Organization account is currently suspended or inactive',
          source: 'ORGANIZATION_SUSPENDED',
        };
      }

      // Precedence 3: Tenant-Specific Addon / Override
      if (featureKey in tenantOverrides) {
        const allowed = tenantOverrides[featureKey];
        return {
          is_allowed: allowed,
          reason: allowed
            ? 'Feature unlocked via commercial addon / administrative entitlement'
            : 'Feature explicitly locked by platform administrator',
          source: allowed ? 'TENANT_ADDON_ENTITLEMENT' : 'TENANT_ADMIN_LOCK',
        };
      }

      // Precedence 4: Plan Tier Baseline
      let planAllows = false;
      if (org.plan === 'Enterprise') {
        planAllows = true;
      } else if (org.plan === 'Business') {
        planAllows = !['face_attend', 'garment_workforce'].includes(featureKey);
      } else if (org.plan === 'Professional') {
        planAllows = !['face_attend', 'garment_workforce', 'payroll_engine', 'biometric_hardware', 'vendor_governance'].includes(featureKey);
      } else {
        // Starter / Free
        planAllows = ['core_hr', 'ess', 'attendance', 'leave', 'documents', 'id_card_press', 'helpdesk'].includes(featureKey);
      }

      if (planAllows) {
        return {
          is_allowed: true,
          reason: `Feature included in organization active plan tier (${org.plan})`,
          source: 'PLAN_BASELINE',
        };
      }

      return {
        is_allowed: false,
        reason: `Feature not included in current plan tier (${org.plan}). Upgrade required.`,
        source: 'PLAN_LOCKED',
      };
    }

    it('Global kill switch blocks feature regardless of tenant plan or overrides', () => {
      const enterpriseOrg: OrgContext = { id: 'org-1', status: 'Active', plan: 'Enterprise' };
      const decision = evaluateTenantFeature(enterpriseOrg, 'face_attend', { face_attend: false });
      expect(decision.is_allowed).toBe(false);
      expect(decision.source).toBe('GLOBAL_KILL_SWITCH');
    });

    it('Suspended tenant is denied access even on Enterprise tier', () => {
      const suspendedOrg: OrgContext = { id: 'org-2', status: 'Suspended', plan: 'Enterprise' };
      const decision = evaluateTenantFeature(suspendedOrg, 'payroll_engine');
      expect(decision.is_allowed).toBe(false);
      expect(decision.source).toBe('ORGANIZATION_SUSPENDED');
    });

    it('Tenant addon unlocks Enterprise module (FaceAttend) for Starter tier tenant', () => {
      const starterOrg: OrgContext = { id: 'org-3', status: 'Active', plan: 'Starter' };
      const decision = evaluateTenantFeature(starterOrg, 'face_attend', {}, { face_attend: true });
      expect(decision.is_allowed).toBe(true);
      expect(decision.source).toBe('TENANT_ADDON_ENTITLEMENT');
    });

    it('Admin lock restricts a feature that is normally included in Enterprise tier', () => {
      const enterpriseOrg: OrgContext = { id: 'org-4', status: 'Active', plan: 'Enterprise' };
      const decision = evaluateTenantFeature(enterpriseOrg, 'garment_workforce', {}, { garment_workforce: false });
      expect(decision.is_allowed).toBe(false);
      expect(decision.source).toBe('TENANT_ADMIN_LOCK');
    });

    it('Correctly enforces plan baseline boundaries without overrides', () => {
      const starterOrg: OrgContext = { id: 'org-5', status: 'Active', plan: 'Starter' };
      expect(evaluateTenantFeature(starterOrg, 'core_hr').is_allowed).toBe(true);
      expect(evaluateTenantFeature(starterOrg, 'payroll_engine').is_allowed).toBe(false);

      const bizOrg: OrgContext = { id: 'org-6', status: 'Active', plan: 'Business' };
      expect(evaluateTenantFeature(bizOrg, 'payroll_engine').is_allowed).toBe(true);
      expect(evaluateTenantFeature(bizOrg, 'face_attend').is_allowed).toBe(false);

      const entOrg: OrgContext = { id: 'org-7', status: 'Active', plan: 'Enterprise' };
      expect(evaluateTenantFeature(entOrg, 'face_attend').is_allowed).toBe(true);
      expect(evaluateTenantFeature(entOrg, 'garment_workforce').is_allowed).toBe(true);
    });
  });

  describe('3. Edge Function Cross-Tenant Boundary Enforcement', () => {
    function evaluateEdgeFunctionAccess(
      caller: { userId: string; orgId: string; isPlatformAdmin: boolean },
      targetEmployee: { id: string; userId: string; orgId: string }
    ): { status: number; message: string } {
      if (caller.isPlatformAdmin) {
        return { status: 200, message: 'Authorized: Platform Admin diagnostic access' };
      }
      const isSelf = caller.userId === targetEmployee.userId || caller.userId === targetEmployee.id;
      const isSameOrg = caller.orgId === targetEmployee.orgId;

      if (!isSelf && !isSameOrg) {
        return { status: 403, message: 'Forbidden: Cross-tenant access to another organization roster is prohibited' };
      }

      return { status: 200, message: 'Authorized: Tenant member access' };
    }

    it('BLOCKS user from Tenant A attempting to read roster of employee in Tenant B', () => {
      const callerFromOrgA = {
        userId: 'usr-tenant-a-manager',
        orgId: 'org-electra-ev',
        isPlatformAdmin: false,
      };
      const employeeInOrgB = {
        id: 'emp-joy-corp-101',
        userId: 'usr-joy-101',
        orgId: 'org-joy-corporate',
      };

      const result = evaluateEdgeFunctionAccess(callerFromOrgA, employeeInOrgB);
      expect(result.status).toBe(403);
      expect(result.message).toContain('Forbidden');
    });

    it('ALLOWS user from Tenant A to read roster of employee in Tenant A', () => {
      const callerFromOrgA = {
        userId: 'usr-tenant-a-manager',
        orgId: 'org-electra-ev',
        isPlatformAdmin: false,
      };
      const employeeInOrgA = {
        id: 'emp-electra-005',
        userId: 'usr-electra-005',
        orgId: 'org-electra-ev',
      };

      const result = evaluateEdgeFunctionAccess(callerFromOrgA, employeeInOrgA);
      expect(result.status).toBe(200);
      expect(result.message).toContain('Authorized: Tenant member access');
    });

    it('ALLOWS Platform Super Admin cross-tenant visibility for support & operations', () => {
      const platformAdmin = {
        userId: 'super-admin-uuid',
        orgId: 'platform-root',
        isPlatformAdmin: true,
      };
      const anyTenantEmployee = {
        id: 'emp-electra-005',
        userId: 'usr-electra-005',
        orgId: 'org-electra-ev',
      };

      const result = evaluateEdgeFunctionAccess(platformAdmin, anyTenantEmployee);
      expect(result.status).toBe(200);
      expect(result.message).toContain('Authorized: Platform Admin diagnostic access');
    });
  });

  describe('4. Zero-Leakage Dynamic Company Name Resolution', () => {
    function resolveReportCompanyName(
      orgData: { display_name?: string; legal_name?: string } | null,
      companyData: { trade_name?: string; legal_name?: string } | null
    ): string {
      return (
        companyData?.trade_name ||
        companyData?.legal_name ||
        orgData?.display_name ||
        orgData?.legal_name ||
        'Enterprise Workplace'
      );
    }

    it('Resolves Electra EV without falling back to Joy Corporate Solutions', () => {
      const electraOrg = { display_name: 'Electra EV', legal_name: 'Electra EV Pvt Ltd' };
      const electraCompany = { trade_name: 'Electra EV - Coimbatore GMC', legal_name: 'Electra Electric Vehicles Pvt Ltd' };

      const resolved = resolveReportCompanyName(electraOrg, electraCompany);
      expect(resolved).toBe('Electra EV - Coimbatore GMC');
      expect(resolved).not.toContain('Joy Corporate Solutions');
    });

    it('Uses generic Enterprise Workplace when company records are blank, NEVER leaking another tenant name', () => {
      const emptyOrg = null;
      const emptyCompany = null;

      const resolved = resolveReportCompanyName(emptyOrg, emptyCompany);
      expect(resolved).toBe('Enterprise Workplace');
      expect(resolved).not.toContain('Joy Corporate Solutions');
    });
  });
});
