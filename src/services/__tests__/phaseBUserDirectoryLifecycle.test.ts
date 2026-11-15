// src/services/__tests__/phaseBUserDirectoryLifecycle.test.ts
// ============================================================================
// Joy PeopleHR — Phase B Test Matrix: Global User Directory & Organization Lifecycle
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { platformUserManagementService } from '../platform/platformUserManagementService';
import { supabase } from '../../lib/supabase';
import { platformAuditService } from '../platform/platformAuditService';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    isSupabaseEnabled: true,
    supabase: {
      ...actual.supabase,
      rpc: vi.fn(),
      from: vi.fn(),
      auth: {
        ...actual.supabase?.auth,
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    supabaseAdmin: {
      ...actual.supabaseAdmin,
      rpc: vi.fn(),
      from: vi.fn(),
    },
  };
});

vi.mock('../platform/platformAuditService', () => {
  return {
    platformAuditService: {
      recordEvent: vi.fn().mockResolvedValue({ id: 'mock-audit-id' }),
    },
  };
});

describe('Phase B: Global User Management & Organization Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Global User Directory (getPlatformUsers)', () => {
    it('successfully calls get_platform_user_directory RPC with pagination and search parameters', async () => {
      const mockRpcResponse = {
        total: 2,
        limit: 20,
        offset: 0,
        users: [
          {
            user_id: 'usr-1',
            auth_user_id: 'auth-1',
            email: 'admin@acme.com',
            full_name: 'Acme Admin',
            status: 'ACTIVE',
            organization_id: 'org-acme-1',
            organization_name: 'Acme Corp',
            role_code: 'SUPER_ADMIN',
          },
          {
            user_id: 'usr-2',
            auth_user_id: 'auth-2',
            email: 'user@electraev.com',
            full_name: 'Electra Staff',
            status: 'ACTIVE',
            organization_id: 'org-electra-2',
            organization_name: 'Electra EV',
            role_code: 'EMPLOYEE',
          },
        ],
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockRpcResponse,
        error: null,
      });

      const result = await platformUserManagementService.getPlatformUsers({
        search: 'acme',
        page: 1,
        page_size: 20,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_platform_user_directory', {
        p_search: 'acme',
        p_org_id: null,
        p_role: null,
        p_status: null,
        p_limit: 20,
        p_offset: 0,
      });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.users[0].email).toBe('admin@acme.com');
      expect(result.users[1].organization_name).toBe('Electra EV');
    });

    it('falls back gracefully to direct query if RPC returns error', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC function not found' },
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'org-fb', display_name: 'Fallback Org' }],
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'usr-fb-1',
                    email: 'fallback@test.com',
                    full_name: 'Fallback User',
                    status: 'ACTIVE',
                    organization_id: 'org-fb',
                    role: 'HR_MANAGER',
                    created_at: new Date().toISOString(),
                  },
                ],
                count: 1,
                error: null,
              }),
            }),
          }),
        };
      });

      const result = await platformUserManagementService.getPlatformUsers({
        page: 1,
        page_size: 10,
      });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toBe('fallback@test.com');
    });
  });

  describe('2. User Status Management & Audit', () => {
    it('enforces mandatory audit reason of at least 5 characters', async () => {
      await expect(
        platformUserManagementService.updateUserStatus('usr-1', 'SUSPENDED', 'bad')
      ).rejects.toThrow(/at least 5 characters/i);
    });

    it('successfully updates user status and logs audit event', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as any).mockReturnValue({ update: mockUpdate });

      const res = await platformUserManagementService.updateUserStatus(
        'usr-1',
        'SUSPENDED',
        'Security investigation triggered by irregular access'
      );

      expect(res.success).toBe(true);
      expect(platformAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_STATUS_CHANGE',
          resource_id: 'usr-1',
          resource_type: 'USER',
          status: 'SUCCESS',
        })
      );
    });
  });

  describe('3. Organization Lifecycle State Transitions', () => {
    it('validates mandatory reason and organization ID for lifecycle change', async () => {
      await expect(
        platformUserManagementService.transitionOrganizationStatus('', 'Suspended', 'Test reason')
      ).rejects.toThrow(/Organization ID is required/i);

      await expect(
        platformUserManagementService.transitionOrganizationStatus('org-1', 'Suspended', 'shrt')
      ).rejects.toThrow(/min 5 characters/i);
    });

    it('transitions organization status via authoritative RPC and records audit log', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          success: true,
          organization_id: 'org-123',
          new_status: 'Suspended',
        },
        error: null,
      });

      const res = await platformUserManagementService.transitionOrganizationStatus(
        'org-123',
        'Suspended',
        'Non-payment of enterprise invoice past 30-day grace'
      );

      expect(res.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('transition_organization_lifecycle', {
        p_organization_id: 'org-123',
        p_new_status: 'Suspended',
        p_reason: 'Non-payment of enterprise invoice past 30-day grace',
      });

      expect(platformAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORGANIZATION_LIFECYCLE_TRANSITION',
          resource_id: 'org-123',
          resource_type: 'ORGANIZATION',
          severity: 'CRITICAL',
        })
      );
    });

    it('handles trial extension gracefully', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          success: true,
          organization_id: 'org-trial-1',
          new_status: 'Trial',
        },
        error: null,
      });

      const res = await platformUserManagementService.transitionOrganizationStatus(
        'org-trial-1',
        'Trial',
        'Extended trial approved by sales leadership for pilot testing'
      );

      expect(res.success).toBe(true);
      expect(platformAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORGANIZATION_LIFECYCLE_TRANSITION',
          resource_id: 'org-trial-1',
          severity: 'INFO',
        })
      );
    });
  });

  describe('4. Secure Password Reset Dispatch', () => {
    it('requires valid email and records IAM audit event', async () => {
      await expect(
        platformUserManagementService.triggerPasswordReset('')
      ).rejects.toThrow(/Email is required/i);

      const res = await platformUserManagementService.triggerPasswordReset('hr@customer.com');
      expect(res.success).toBe(true);
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'hr@customer.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password'),
        })
      );
      expect(platformAuditService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_PASSWORD_RESET_DISPATCHED',
          resource_id: 'hr@customer.com',
          resource_type: 'USER',
        })
      );
    });
  });
});
