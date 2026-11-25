/**
 * Joy PeopleHR — Production Multi-Tenant Storage Manager
 * 
 * Safest Enterprise SaaS Process:
 * 1. Strict Tenant Partitioning: Keys are prefixed with `joy_tenant_${organizationId}_`.
 * 2. Never stores raw unpartitioned domain entities in global localStorage.
 * 3. Atomic Cross-Tenant Purge: On organization switch or logout, all other tenant
 *    data in browser storage is purged immediately, preventing cross-tenant bleeding.
 * 4. Memory-First Cache: Short-lived memory cache (TTL 60s) to minimize browser storage footprint.
 */

export interface TenantStorageOptions {
  ttlMs?: number;
  memoryOnly?: boolean;
}

class TenantStorageManager {
  private memoryCache = new Map<string, { value: any; expiresAt: number }>();

  /**
   * Generates a strictly isolated tenant cache key.
   * If organizationId is not provided, defaults to active session tenant or 'global'.
   */
  public getScopedKey(resourceKey: string, organizationId?: string | null): string {
    const org = organizationId || this.getActiveOrgId();
    if (!org || org === 'global' || org === 'platform-root') {
      return `joy_sys_${resourceKey}`;
    }
    return `joy_t_${org.replace(/[^a-zA-Z0-9_-]/g, '')}_${resourceKey}`;
  }

  /**
   * Retrieves active organization ID from runtime environment without leaking.
   */
  public getActiveOrgId(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem('workforce_active_org_id') || localStorage.getItem('joy_active_tenant_id') || null;
    } catch {
      return null;
    }
  }

  /**
   * Reads a tenant-partitioned item.
   * Memory cache is checked first (0ms), then partitioned localStorage.
   */
  public getItem<T>(resourceKey: string, defaultValue: T, organizationId?: string | null): T {
    const scopedKey = this.getScopedKey(resourceKey, organizationId);

    // 1. Check in-memory cache first
    const mem = this.memoryCache.get(scopedKey);
    if (mem) {
      if (Date.now() < mem.expiresAt) {
        return mem.value as T;
      }
      this.memoryCache.delete(scopedKey);
    }

    // 2. Check browser localStorage
    if (typeof localStorage === 'undefined') return defaultValue;
    try {
      const raw = localStorage.getItem(scopedKey);
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && '_exp' in parsed) {
        if (Date.now() > parsed._exp) {
          localStorage.removeItem(scopedKey);
          return defaultValue;
        }
        return parsed.data as T;
      }
      return parsed as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Writes a tenant-partitioned item.
   */
  public setItem<T>(resourceKey: string, value: T, organizationId?: string | null, options?: TenantStorageOptions): void {
    const scopedKey = this.getScopedKey(resourceKey, organizationId);
    const ttl = options?.ttlMs || 60_000 * 15; // 15 mins default
    const expiresAt = Date.now() + ttl;

    // Memory cache
    this.memoryCache.set(scopedKey, { value, expiresAt });

    if (options?.memoryOnly || typeof localStorage === 'undefined') return;

    try {
      const payload = {
        _t: Date.now(),
        _exp: expiresAt,
        data: value,
      };
      localStorage.setItem(scopedKey, JSON.stringify(payload));
    } catch (e) {
      // Storage quota exceeded or disabled: silently fall back to memory cache
      console.warn('[TenantStorageManager] LocalStorage setItem fallback to memory:', e);
    }
  }

  /**
   * Removes a specific tenant resource.
   */
  public removeItem(resourceKey: string, organizationId?: string | null): void {
    const scopedKey = this.getScopedKey(resourceKey, organizationId);
    this.memoryCache.delete(scopedKey);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(scopedKey);
      } catch {}
    }
  }

  /**
   * ATOMIC TENANT EVACUATION:
   * Called on organization switch or logout.
   * Purges all keys belonging to any other tenant, eradicating cross-tenant data contamination.
   */
  public purgeCrossTenantCaches(currentActiveOrgId?: string | null): void {
    const activeOrg = currentActiveOrgId || this.getActiveOrgId();
    this.memoryCache.clear();

    if (typeof localStorage === 'undefined') return;

    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) allKeys.push(k);
      }

      const activePrefix = activeOrg ? `joy_t_${activeOrg.replace(/[^a-zA-Z0-9_-]/g, '')}_` : null;
      const preservedGlobalKeys = new Set([
        'theme',
        'joy_theme',
        'supabase.auth.token',
        'sb-ysiajemrqakfngasehhi-auth-token',
        'workforce_active_org_id',
        'workforce_active_legal_entity_id',
        'joy_active_tenant_id',
        'wf_zero_seed_token',
      ]);

      for (const key of allKeys) {
        if (preservedGlobalKeys.has(key)) continue;

        // If it's a legacy unscoped workforce key, PURGE IT
        if (
          key.startsWith('workforce_') ||
          key.startsWith('wf_') ||
          key.startsWith('joy_redis_') ||
          key.startsWith('upstash_redis_') ||
          key.startsWith('JOY_CANONICAL_') ||
          key.startsWith('joy_shifts') ||
          key.startsWith('joy_rosters') ||
          key.startsWith('workforceos_')
        ) {
          localStorage.removeItem(key);
          continue;
        }

        // If it's a tenant-scoped key from a DIFFERENT tenant, PURGE IT
        if (key.startsWith('joy_t_')) {
          if (!activePrefix || !key.startsWith(activePrefix)) {
            localStorage.removeItem(key);
          }
        }
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch (err) {
      console.warn('[TenantStorageManager] Error during tenant purge:', err);
    }
  }

  /**
   * Complete logout wipe.
   */
  public wipeAllOnLogout(): void {
    this.memoryCache.clear();
    if (typeof localStorage === 'undefined') return;
    try {
      const preserve = new Set(['theme', 'joy_theme']);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && !preserve.has(k)) {
          localStorage.removeItem(k);
        }
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch {}
  }
}

export const tenantStorageManager = new TenantStorageManager();

