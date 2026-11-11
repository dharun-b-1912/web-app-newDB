// ============================================================================
// JOY PeopleHR — Garment Workforce SaaS Add-On Entitlement Service
// Tenant-level enable/disable check backed by organization_addon_entitlements
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { OrganizationAddonEntitlement } from '../../types/garment';

export const GARMENT_ADDON_KEY = 'garment_workforce';

const CACHE_TTL_MS = 30_000;
const _entitlementCache = new Map<string, { data: OrganizationAddonEntitlement | null; ts: number }>();

export const garmentEntitlementService = {
  clearCache(orgId?: string) {
    if (orgId) _entitlementCache.delete(orgId);
    else _entitlementCache.clear();
  },

  async getEntitlement(organizationId?: string, forceRefresh = false): Promise<OrganizationAddonEntitlement | null> {
    const orgId = organizationId || getActiveOrgId();
    if (!orgId) return null;

    const cached = _entitlementCache.get(orgId);
    if (!forceRefresh && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.data;
    }

    if (!isSupabaseEnabled) return null;

    const { data, error } = await supabase
      .from('organization_addon_entitlements')
      .select('*')
      .eq('organization_id', orgId)
      .eq('addon_key', GARMENT_ADDON_KEY)
      .maybeSingle();

    if (error) {
      console.warn('[GarmentEntitlement] Failed to query entitlement:', error.message);
      return cached?.data ?? null;
    }

    const result = (data as OrganizationAddonEntitlement | null) || null;
    _entitlementCache.set(orgId, { data: result, ts: Date.now() });
    return result;
  },

  async isEnabled(organizationId?: string, forceRefresh = false): Promise<boolean> {
    const ent = await this.getEntitlement(organizationId, forceRefresh);
    return Boolean(ent?.is_enabled);
  },

  async setEnabled(
    organizationId: string,
    isEnabled: boolean,
    configJson?: Record<string, any>
  ): Promise<OrganizationAddonEntitlement> {
    const nowIso = new Date().toISOString();
    const existing = await this.getEntitlement(organizationId, true);

    const payload = {
      organization_id: organizationId,
      addon_key: GARMENT_ADDON_KEY,
      is_enabled: isEnabled,
      plan_tier: existing?.plan_tier || 'BUSINESS',
      config_json: configJson ?? existing?.config_json ?? {
        piece_rate_calculation_mode: 'CONFIGURABLE_PER_ORDER',
        default_rework_payment_rule: 'ACCEPTED_ONLY',
      },
      enabled_at: isEnabled ? nowIso : existing?.enabled_at || null,
      disabled_at: isEnabled ? null : nowIso,
    };

    const { data, error } = await supabase
      .from('organization_addon_entitlements')
      .upsert(payload, { onConflict: 'organization_id,addon_key' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update garment entitlement: ${error.message}`);
    }

    const record = data as OrganizationAddonEntitlement;
    _entitlementCache.set(organizationId, { data: record, ts: Date.now() });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('garment:entitlement-changed', {
          detail: { organizationId, isEnabled, entitlement: record },
        })
      );
    }
    return record;
  },

  async listTenantEntitlements(): Promise<OrganizationAddonEntitlement[]> {
    if (!isSupabaseEnabled) return [];
    const { data, error } = await supabase
      .from('organization_addon_entitlements')
      .select('*')
      .eq('addon_key', GARMENT_ADDON_KEY)
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('[GarmentEntitlement] listTenantEntitlements error:', error.message);
      return [];
    }
    return (data || []) as OrganizationAddonEntitlement[];
  },
};

