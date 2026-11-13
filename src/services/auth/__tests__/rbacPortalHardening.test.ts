import { describe, expect, it, vi } from 'vitest';
import { canViewModule, getPrimaryRole, getRoleProfile } from '../../../lib/rbac/permissionEngine';
import { ROUTE_ALIASES } from '../../../lib/router/urlRouter';
import { PortalAccessResolver } from '../portalAccessResolver';
import { generateNextEmployeeCode } from '../../../features/people/wizard/Step1Identity';
import type { Employee, User } from '../../../types';

const { mockSupabaseFrom } = vi.hoisted(() => ({
  mockSupabaseFrom: vi.fn(),
}));

vi.mock('../../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    isSupabaseEnabled: true,
    supabaseAdmin: null,
    supabase: {
      from: mockSupabaseFrom,
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
        getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      },
    },
  };
});

import { roleResolutionService } from '../roleResolutionService';

describe('RBAC, Portal Routing & Employee Code Integrity Hardening', () => {
  it('1. maps /employee, /employee/dashboard, /employee-portal, and /ess slugs strictly to ess-dashboard', () => {
    expect(ROUTE_ALIASES['/employee']).toBe('ess-dashboard');
    expect(ROUTE_ALIASES['/employee/dashboard']).toBe('ess-dashboard');
    expect(ROUTE_ALIASES['/employee-portal']).toBe('ess-dashboard');
    expect(ROUTE_ALIASES['/ess']).toBe('ess-dashboard');
    expect(ROUTE_ALIASES['/ess/dashboard']).toBe('ess-dashboard');
  });

  it('2. strictly blocks Employee and Unassigned users from HR Dashboard and admin modules', () => {
    const employeeUser: User = {
      id: 'usr-emp-1',
      organization_id: 'org-1',
      email: 'hariharant@joyglobalcorp.com',
      name: 'Hariharan T',
      role: 'Employee',
      status: 'Active',
      roles: [
        {
          id: 'role-employee',
          organization_id: 'org-1',
          name: 'EMPLOYEE',
          description: 'Employee',
          permissions: [],
        },
      ],
      created_at: '2026-11-12T00:00:00.000Z',
    };

    expect(getPrimaryRole(employeeUser)).toBe('Employee');
    expect(canViewModule(employeeUser, 'ess-dashboard')).toBe(true);
    expect(canViewModule(employeeUser, 'ess-attendance')).toBe(true);
    expect(canViewModule(employeeUser, 'ess')).toBe(true);

    for (const restricted of [
      'dashboard',
      'executive-overview',
      'workforce-overview',
      'people',
      'attendance',
      'payroll',
      'admin',
      'admin-roles',
      'admin-users',
      'platform-dashboard',
    ]) {
      expect(canViewModule(employeeUser, restricted)).toBe(false);
    }

    const unassignedUser: User = {
      id: 'usr-unassigned',
      organization_id: 'org-1',
      email: 'unassigned@joyglobalcorp.com',
      name: 'Unassigned User',
      status: 'Active',
      roles: [],
      created_at: '2026-11-12T00:00:00.000Z',
    };

    expect(getPrimaryRole(unassignedUser)).toBe('Unassigned');
    expect(getRoleProfile(unassignedUser).hierarchyLevel).toBe(5);
    expect(canViewModule(unassignedUser, 'dashboard')).toBe(false);
    expect(canViewModule(unassignedUser, 'people')).toBe(false);
    expect(canViewModule(unassignedUser, 'ess-dashboard')).toBe(true);
  });

  it('3. resolves PortalAccessResolver routes cleanly for Employee, HR Head, and Company Admin', () => {
    const empCtx = PortalAccessResolver.resolve({
      userId: 'u1',
      email: 'hariharant@joyglobalcorp.com',
      fullName: 'Hariharan T',
      organizationId: 'org-1',
      employeeId: 'e1',
      rawRoles: ['EMPLOYEE'],
    });
    expect(empCtx.primaryRole).toBe('Employee');
    expect(empCtx.defaultRoute).toBe('ess-dashboard');

    const hrCtx = PortalAccessResolver.resolve({
      userId: 'u2',
      email: 'marimuthu@joycorporatesolutions.com',
      fullName: 'Marimuthu T',
      organizationId: 'org-1',
      employeeId: 'e2',
      rawRoles: ['HR_HEAD'],
    });
    expect(hrCtx.primaryRole).toBe('HR Head');
    expect(hrCtx.defaultRoute).toBe('dashboard');

    const adminCtx = PortalAccessResolver.resolve({
      userId: 'u3',
      email: 'praveen.b@joyglobalcorp.com',
      fullName: 'Praveen B',
      organizationId: 'org-1',
      employeeId: 'e3',
      rawRoles: ['COMPANY_ADMIN'],
    });
    expect(adminCtx.primaryRole).toBe('Company Admin');
    expect(adminCtx.defaultRoute).toBe('executive-overview');
  });

  it('4. never escalates designation containing "HR" or "Head" to HR_HEAD when user_roles is empty', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        or: () => chain,
        limit: () => chain,
        abortSignal: () => chain,
        update: () => chain,
        maybeSingle: async () => {
          if (table === 'platform_admins') return { data: null, error: null };
          if (table === 'user_profiles') {
            return {
              data: {
                id: 'prof-muthu',
                auth_user_id: 'auth-muthu',
                organization_id: 'org-1',
                employee_id: 'emp-muthu',
                email: 'muthuaswin@joycorporatesolutions.com',
                full_name: 'MUTHU ASWIN',
                status: 'ACTIVE',
                role: null,
                user_roles: [],
              },
              error: null,
            };
          }
          if (table === 'employees') {
            return {
              data: {
                id: 'emp-muthu',
                employee_code: 'JMS-115',
                first_name: 'MUTHU',
                last_name: 'ASWIN',
                display_name: 'MUTHU ASWIN',
                organization_id: 'org-1',
                company_id: 'comp-1',
                designations: { id: 'd-1', title: 'HR EXECUTIVE', code: 'HR_EXEC' },
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        then: (resolve: any) => resolve({ data: [], error: null }),
      };
      return chain;
    });

    const identity = await roleResolutionService.resolveUserIdentity(
      'auth-muthu',
      'muthuaswin@joycorporatesolutions.com',
      {}
    );

    expect(identity.primaryRole).toBe('Employee');
    expect(identity.destinationRoute).toBe('ess-dashboard');
  });

  it('5. ignores UUID strings in generateNextEmployeeCode and produces sequential corporate codes', () => {
    const existing = [
      { id: '1', employee_code: 'JCS-027' },
      { id: '2', employee_code: '6b317895-ad97-4164-b1be-d40bb9cdb6ca' },
    ] as unknown as Employee[];

    const nextCode = generateNextEmployeeCode(existing, 'JCS');
    expect(nextCode).toBe('JCS-0028');
    expect(nextCode).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });
});
