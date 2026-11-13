// src/services/faceAttend/faceAttendEntitlementService.ts
// Tenant-level enable/disable gate for JOY FaceAttend backed by organization_addon_entitlements.
import { supabase } from '../../lib/supabase';
import type { FaceAttendEntitlement } from '../../types/faceAttend';

export const FACEATTEND_ADDON_KEY = 'face_attend';
export const FACEATTEND_ENTITLEMENT_EVENT = 'joy_faceattend_entitlement_updated';

interface CacheEntry {
  entitlement: FaceAttendEntitlement | null;
  fetchedAt: number;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

export const faceAttendEntitlementService = {
  async getEntitlement(organizationId: string, forceRefresh = false): Promise<FaceAttendEntitlement | null> {
    if (!organizationId) return null;

    const existing = cache.get(organizationId);
    if (!forceRefresh && existing && Date.now() - existing.fetchedAt < CACHE_TTL_MS) {
      return existing.entitlement;
    }

    try {
      const { data, error } = await supabase
        .from('organization_addon_entitlements')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('addon_key', FACEATTEND_ADDON_KEY)
        .maybeSingle();

      if (error) {
        console.warn('[FaceAttendEntitlementService] Entitlement lookup error:', error.message);
        return existing?.entitlement ?? null;
      }

      const ent = (data as FaceAttendEntitlement) || null;
      cache.set(organizationId, { entitlement: ent, fetchedAt: Date.now() });
      return ent;
    } catch (err) {
      console.warn('[FaceAttendEntitlementService] Exception:', err);
      return existing?.entitlement ?? null;
    }
  },

  async isEnabled(organizationId: string, forceRefresh = false): Promise<boolean> {
    const ent = await this.getEntitlement(organizationId, forceRefresh);
    return Boolean(ent?.is_enabled);
  },

  async setTenantEntitlement(params: {
    organizationId: string;
    isEnabled: boolean;
    planTier?: string;
    maxEmployees?: number | null;
    configJson?: Record<string, any>;
    updatedBy?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('organization_addon_entitlements')
        .upsert(
          {
            organization_id: params.organizationId,
            addon_key: FACEATTEND_ADDON_KEY,
            is_enabled: params.isEnabled,
            plan_tier: params.planTier || 'PRO',
            max_workers: params.maxEmployees ?? null,
            config_json: params.configJson || {
              pricing_model: 'PER_EMPLOYEE_MONTHLY',
              currency: 'INR',
            },
            enabled_at: params.isEnabled ? now : undefined,
            disabled_at: params.isEnabled ? null : now,
            updated_by: params.updatedBy || null,
            updated_at: now,
          },
          { onConflict: 'organization_id,addon_key' }
        );

      if (error) return { ok: false, error: error.message };

      // Keep faceattend_org_settings.module_enabled aligned
      await supabase
        .from('faceattend_org_settings')
        .upsert(
          {
            organization_id: params.organizationId,
            module_enabled: params.isEnabled,
            updated_by: params.updatedBy || null,
          },
          { onConflict: 'organization_id' }
        );

      await supabase.from('faceattend_audit_logs').insert({
        organization_id: params.organizationId,
        actor_user_id: params.updatedBy || null,
        event_type: params.isEnabled ? 'ADDON_ENABLED' : 'ADDON_DISABLED',
        target_type: 'organization_addon_entitlements',
        metadata: { addon_key: FACEATTEND_ADDON_KEY, plan_tier: params.planTier || 'PRO' },
      });

      this.invalidateCache(params.organizationId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(FACEATTEND_ENTITLEMENT_EVENT, {
            detail: { organizationId: params.organizationId, isEnabled: params.isEnabled },
          })
        );
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to update FaceAttend entitlement' };
    }
  },

  invalidateCache(organizationId?: string) {
    if (organizationId) cache.delete(organizationId);
    else cache.clear();
  },
};

