// src/services/vendor/vendorMappingProfileService.ts
// ============================================================================
// Joy PeopleHR — Vendor & Company Attendance Header Mapping Profile Service
// Stores customized synonym mappings per vendor/company for automated future ingestion
// ============================================================================

export interface VendorMappingProfile {
  id: string;
  vendorId: string;
  companyId?: string;
  vendorName?: string;
  profileName: string;
  customSynonyms: Record<string, string>; // rawHeader -> canonicalField (e.g. 'REGULAR HRS' -> 'totalHours')
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'workforce_vendor_mapping_profiles';

export class VendorMappingProfileService {
  private static cache: Map<string, VendorMappingProfile> = new Map();
  private static initialized = false;

  private static init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list: VendorMappingProfile[] = JSON.parse(raw);
          list.forEach((p) => {
            const key = this.makeKey(p.vendorId, p.companyId);
            this.cache.set(key, p);
          });
        }
      }
    } catch (e) {
      console.warn('[VendorMappingProfileService] Failed to load cached mapping profiles:', e);
    }
  }

  private static makeKey(vendorId: string, companyId?: string): string {
    return `${vendorId.trim().toLowerCase()}::${(companyId || 'default').trim().toLowerCase()}`;
  }

  /**
   * Retrieves the custom mapping profile for a given vendor and company
   */
  public static getProfile(vendorId: string, companyId?: string): VendorMappingProfile | null {
    this.init();
    const key = this.makeKey(vendorId, companyId);
    if (this.cache.has(key)) return this.cache.get(key)!;

    // Fallback to vendor-only mapping
    const vendorOnlyKey = this.makeKey(vendorId);
    if (this.cache.has(vendorOnlyKey)) return this.cache.get(vendorOnlyKey)!;

    return null;
  }

  /**
   * Saves or merges a custom mapping profile
   */
  public static saveProfile(
    vendorId: string,
    companyId: string | undefined,
    customMappings: Record<string, string>,
    vendorName?: string
  ): VendorMappingProfile {
    this.init();
    const key = this.makeKey(vendorId, companyId);
    const existing = this.cache.get(key);

    const now = new Date().toISOString();
    const updated: VendorMappingProfile = {
      id: existing?.id || `vmap-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      vendorId,
      companyId,
      vendorName: vendorName || existing?.vendorName,
      profileName: existing?.profileName || `${vendorName || 'Vendor'} Canonical Mapping`,
      customSynonyms: {
        ...(existing?.customSynonyms || {}),
        ...customMappings,
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.cache.set(key, updated);
    this.persist();
    return updated;
  }

  /**
   * Returns all known custom mappings for a vendor merged with standard dictionary
   */
  public static getActiveMappingsForVendor(vendorId: string, companyId?: string): Record<string, string> {
    const profile = this.getProfile(vendorId, companyId);
    return profile?.customSynonyms || {};
  }

  private static persist() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const list = Array.from(this.cache.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('[VendorMappingProfileService] Failed to persist profiles to localStorage:', e);
    }
  }
}
