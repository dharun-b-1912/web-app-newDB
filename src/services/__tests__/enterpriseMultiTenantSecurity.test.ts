// src/services/__tests__/enterpriseMultiTenantSecurity.test.ts
// ============================================================================
// JOY PeopleHR — Enterprise Multi-Tenant Security & Isolation Test Suite
// Cross-Tenant Rejection • Spoofing Prevention • RBAC & Scope Boundaries
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { tenantContextService, CrossTenantViolationError } from '../tenant/tenantContextService';
import { authorizationService } from '../auth/authorizationService';
import { tenantAuditService } from '../governance/tenantAuditService';

describe('Enterprise Multi-Tenant Security & Isolation Suite', () => {
  beforeEach(async () => {
    // Reset to Organization A context
    await tenantContextService.switchTenant('org-joy-01', 'Joy PeopleHR Technologies');
  });

  it('Gate 1: Authoritative context correctly defaults to verified organization membership', () => {
    const ctx = tenantContextService.getActiveContext();
    expect(ctx.organizationId).toBe('org-joy-01');
    expect(ctx.membershipStatus).toBe('ACTIVE');
  });

  it('Gate 2: Rejects cross-tenant access when client requests Organization B data', () => {
    expect(() => {
      tenantContextService.assertTenantAccess('org-acme-corp');
    }).toThrow(CrossTenantViolationError);
  });

  it('Gate 3: Authorization service rejects cross-tenant API actions', () => {
    const res = authorizationService.authorize({
      resource: 'employees',
      action: 'read',
      targetOrganizationId: 'org-acme-corp',
    });

    expect(res.authorized).toBe(false);
    expect(res.reason).toContain('Cross-tenant violation');
  });

  it('Gate 4: Rejects unauthorized branch/site scope access', () => {
    const res = authorizationService.authorize({
      resource: 'employees',
      action: 'read',
      targetOrganizationId: 'org-joy-01',
      targetBranchId: 'branch-unauthorized-xyz',
    });

    expect(res.authorized).toBe(false);
    expect(res.reason).toContain('Branch scope violation');
  });

  it('Gate 5: Audit logs are strictly isolated by organization', () => {
    // Log an event for Org A
    tenantAuditService.log({
      organizationId: 'org-joy-01',
      userId: 'usr-admin-01',
      userEmail: 'admin@joypeoplehr.com',
      action: 'EMPLOYEE_UPDATE',
      module: 'people',
      status: 'SUCCESS',
    });

    // Log an event for Org B
    tenantAuditService.log({
      organizationId: 'org-acme-corp',
      userId: 'usr-acme-01',
      userEmail: 'admin@acme.com',
      action: 'PAYROLL_RUN',
      module: 'payroll',
      status: 'SUCCESS',
    });

    // Caller in Org A should only see Org A logs
    const orgALogs = tenantAuditService.getLogsForTenant('org-joy-01');
    expect(orgALogs.every((l) => l.organizationId === 'org-joy-01')).toBe(true);
    expect(orgALogs.some((l) => l.organizationId === 'org-acme-corp')).toBe(false);
  });

  it('Gate 6: Tenant switching cleanly isolates context and updates context version', async () => {
    const prevVersion = tenantContextService.getActiveContext().contextVersion;
    const newCtx = await tenantContextService.switchTenant('org-new-tenant-99', 'New Tenant Ltd');

    expect(newCtx.organizationId).toBe('org-new-tenant-99');
    expect(newCtx.contextVersion).toBe(prevVersion + 1);

    // Now Org A assertion should fail
    expect(() => {
      tenantContextService.assertTenantAccess('org-joy-01');
    }).toThrow(CrossTenantViolationError);
  });
});
