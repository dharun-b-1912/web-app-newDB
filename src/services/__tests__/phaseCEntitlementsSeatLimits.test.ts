// src/services/__tests__/phaseCEntitlementsSeatLimits.test.ts
// ============================================================================
// Joy PeopleHR — Phase C Test Matrix: Authoritative Plan, Subscription & Central Entitlement Engine
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { platformTenantEntitlementService } from '../platform/platformTenantEntitlementService';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { api } from '../api';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    isSupabaseEnabled: true,
    supabase: {
      ...actual.supabase,
      rpc: vi.fn(),
      from: vi.fn(),
    },
    supabaseAdmin: {
      ...actual.supabaseAdmin,
      rpc: vi.fn(),
      from: vi.fn(),
    },
  };
});

describe('Phase C: Authoritative Plan, Subscription & Central Entitlement Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Authoritative Feature Entitlement Engine (checkFeatureAccess)', () => {
    it('evaluates capability state via evaluate_tenant_feature RPC', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          is_allowed: true,
          reason: 'Feature unlocked via commercial addon / administrative entitlement',
          source: 'TENANT_ADDON_ENTITLEMENT',
        },
        error: null,
      });

      const res = await platformTenantEntitlementService.checkFeatureAccess(
        'org-tenant-1',
        'face_attend'
      );

      expect(supabase.rpc).toHaveBeenCalledWith('evaluate_tenant_feature', {
        p_organization_id: 'org-tenant-1',
        p_feature_key: 'face_attend',
      });
      expect(res.isAllowed).toBe(true);
      expect(res.source).toBe('TENANT_ADDON_ENTITLEMENT');
    });

    it('correctly honors explicit locks by Platform Super Admin', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          is_allowed: false,
          reason: 'Feature explicitly locked by platform administrator',
          source: 'TENANT_ADMIN_LOCK',
        },
        error: null,
      });

      const res = await platformTenantEntitlementService.checkFeatureAccess(
        'org-tenant-1',
        'whatsapp_bot'
      );

      expect(res.isAllowed).toBe(false);
      expect(res.source).toBe('TENANT_ADMIN_LOCK');
      expect(res.reason).toContain('locked');
    });

    it('toggles feature state and writes to organization_addon_entitlements', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert,
      });

      const ok = await platformTenantEntitlementService.setFeatureState(
        'org-tenant-1',
        'geofencing',
        true,
        'Enterprise'
      );

      expect(ok).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('organization_addon_entitlements');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-tenant-1',
          addon_key: 'geofencing',
          is_enabled: true,
        }),
        { onConflict: 'organization_id,addon_key' }
      );
    });
  });

  describe('2. Seat Capacity Checks & Limit Enforcement', () => {
    it('queries check_tenant_seat_capacity RPC to verify live utilization', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          organization_id: 'org-test-1',
          plan: 'Professional',
          seat_limit: 50,
          active_employees: 48,
          available_seats: 2,
          is_limit_reached: false,
          utilization_pct: 96.0,
        },
        error: null,
      });

      const res = await platformTenantEntitlementService.checkSeatCapacity('org-test-1');

      expect(supabase.rpc).toHaveBeenCalledWith('check_tenant_seat_capacity', {
        p_organization_id: 'org-test-1',
      });
      expect(res.seat_limit).toBe(50);
      expect(res.active_employees).toBe(48);
      expect(res.available_seats).toBe(2);
      expect(res.is_limit_reached).toBe(false);
    });

    it('detects when tenant seat limit is fully reached', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          organization_id: 'org-test-2',
          plan: 'Starter',
          seat_limit: 25,
          active_employees: 25,
          available_seats: 0,
          is_limit_reached: true,
          utilization_pct: 100.0,
        },
        error: null,
      });

      const res = await platformTenantEntitlementService.checkSeatCapacity('org-test-2');
      expect(res.is_limit_reached).toBe(true);
      expect(res.available_seats).toBe(0);
    });

    it('rejects employee insertion when seat limit is reached', async () => {
      const orgMock = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'a1111111-1111-4111-a111-111111111111', seat_limit: 25 },
              error: null,
            }),
          }),
        }),
      };

      const empCountMock = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 25, // At capacity
              error: null,
            }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };

      const defaultMock = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };

      const tableHandler = (table: string) => {
        if (table === 'organizations') return orgMock;
        if (table === 'employees') return empCountMock;
        return defaultMock;
      };

      (supabase.from as any).mockImplementation(tableHandler);
      (supabaseAdmin.from as any).mockImplementation(tableHandler);

      await expect(
        api.createEmployee({
          first_name: 'John',
          last_name: 'Doe',
          organization_id: 'a1111111-1111-4111-a111-111111111111',
          employment_status: 'ACTIVE',
        })
      ).rejects.toThrow(/Seat limit reached/i);
    });
  });

  describe('3. Subscription Plan Upgrades & Seat Expansion', () => {
    it('executes authoritative upgrade_tenant_subscription_plan RPC', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          success: true,
          organization_id: 'org-upg-1',
          new_plan: 'Business',
          seat_limit: 100,
          mrr: 15000,
        },
        error: null,
      });

      const res = await platformTenantEntitlementService.upgradeSubscriptionPlan(
        'org-upg-1',
        'Business',
        100,
        15000,
        'MONTHLY',
        'Client requested 50 seat expansion'
      );

      expect(res.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('upgrade_tenant_subscription_plan', {
        p_organization_id: 'org-upg-1',
        p_plan: 'Business',
        p_seats: 100,
        p_mrr: 15000,
        p_billing_cycle: 'MONTHLY',
        p_reason: 'Client requested 50 seat expansion',
      });
    });

    it('rejects invalid plan parameters', async () => {
      await expect(
        platformTenantEntitlementService.upgradeSubscriptionPlan('', 'Business', 100, 15000)
      ).rejects.toThrow(/Organization ID is required/i);

      await expect(
        platformTenantEntitlementService.upgradeSubscriptionPlan('org-1', '', 100, 15000)
      ).rejects.toThrow(/Plan tier is required/i);

      await expect(
        platformTenantEntitlementService.upgradeSubscriptionPlan('org-1', 'Business', 0, 15000)
      ).rejects.toThrow(/Seat allocation must be greater than zero/i);
    });
  });
});
