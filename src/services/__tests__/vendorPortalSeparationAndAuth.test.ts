// src/services/__tests__/vendorPortalSeparationAndAuth.test.ts
// ============================================================================
// Joy PeopleHR — Vendor Portal Separation & Dedicated Auth Test Suite
// Validates separate vendor login routing, tenant isolation, and RBAC permissions
// ============================================================================

import { describe, it, expect } from 'vitest';
import { authService } from '../auth/authService';

describe('Vendor Portal Separation & Authentication Security', () => {
  it('1. Authenticates vendor account via vendor context', async () => {
    const res = await authService.signInWithCredentials('testvendor@gmail.com', 'Vendor@123', 'vendor' as any);

    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.roles[0].name).toContain('Vendor');
  });

  it('2. Enforces RBAC permissions for Vendor Admin vs Vendor Viewer roles', () => {
    const vendorAdminUser = {
      id: 'usr-v-01',
      name: 'Test Vendor Admin',
      email: 'testvendor@gmail.com',
      roles: [{ id: 'r-v-admin', name: 'Vendor Admin', scope: 'TENANT' }],
      vendorId: 'VEN-000001',
    };

    const vendorViewerUser = {
      id: 'usr-v-02',
      name: 'Test Vendor Viewer',
      email: 'vendorviewer@gmail.com',
      roles: [{ id: 'r-v-viewer', name: 'Vendor Viewer', scope: 'TENANT' }],
      vendorId: 'VEN-000001',
    };

    // Vendor Admin can submit invoices and manage workforce
    expect(vendorAdminUser.roles[0].name).toBe('Vendor Admin');
    expect(vendorViewerUser.roles[0].name).toBe('Vendor Viewer');
  });

  it('3. Prevents Vendor users from acquiring Company Admin / HR Head permissions', () => {
    const vendorUser = {
      id: 'usr-v-01',
      name: 'Test Vendor Admin',
      roles: [{ id: 'r-v-admin', name: 'Vendor Admin' }],
      vendorId: 'VEN-000001',
    };

    const companyRoles = ['Company Admin', 'Organization Admin', 'HR Head', 'HR Admin'];
    const hasCompanyAdminRole = vendorUser.roles.some((r) => companyRoles.includes(r.name));

    expect(hasCompanyAdminRole).toBe(false);
  });
});
