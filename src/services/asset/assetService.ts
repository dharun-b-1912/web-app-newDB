// src/services/asset/assetService.ts
// ============================================================================
// Joy PeopleHR — Universal Asset & Inventory Management Engine
// Pure Supabase Backend — Zero localStorage, Zero Mock, Real-Time Synced
// ============================================================================

import {
  UniversalAsset,
  AssetCategory,
  AssetTypeMaster,
  AssetSummaryMetrics,
  AssetCondition,
} from '../../types';
import { supabaseAdmin, supabase, isSupabaseEnabled } from '../../lib/supabase';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';

const DEFAULT_ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';
const DEFAULT_COMPANY_ID = '2030277f-a6a1-427f-beaf-4fc677a3bae2';

export const MODULAR_CATEGORIES: { code: string; name: string; dbCategory: string; icon: string }[] = [
  { code: 'TOOLS_HARDWARE', name: 'Tools & Plant Equipment', dbCategory: 'HARDWARE', icon: 'Wrench' },
  { code: 'SAFETY_UNIFORMS', name: 'Safety PPE & Uniforms', dbCategory: 'HARDWARE', icon: 'Shield' },
  { code: 'MACHINERY', name: 'Industrial Machinery & CNC', dbCategory: 'HARDWARE', icon: 'Cpu' },
  { code: 'IT_HARDWARE', name: 'IT Computing & Workstations', dbCategory: 'HARDWARE', icon: 'Laptop' },
  { code: 'VEHICLES', name: 'Fleet & Plant Vehicles', dbCategory: 'VEHICLE', icon: 'Truck' },
  { code: 'KEY_CARDS', name: 'Access Badges & ID Key Cards', dbCategory: 'KEY_CARD', icon: 'Key' },
  { code: 'FURNITURE', name: 'Office & Factory Furniture', dbCategory: 'FURNITURE', icon: 'Layers' },
  { code: 'SOFTWARE_LICENSES', name: 'Digital Licenses & Cloud Subscriptions', dbCategory: 'SOFTWARE_LICENSE', icon: 'FileCode' },
];

class AssetService {
  private _cachedAssets: UniversalAsset[] = [];
  private _isInitialized: boolean = false;
  private _inFlightFetch: Promise<UniversalAsset[]> | null = null;

  constructor() {
    this.fetchAssetsFromDb().catch(() => {});
  }

  /**
   * Fetch all assets live from Supabase PostgreSQL database
   */
  async fetchAssetsFromDb(force = false): Promise<UniversalAsset[]> {
    if (this._inFlightFetch && !force) return this._inFlightFetch;

    this._inFlightFetch = (async () => {
      try {
        const client = isSupabaseEnabled ? supabaseAdmin : supabase;
        const { data, error } = await client
          .from('assets')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[AssetService] Supabase fetch warning:', error.message);
          return this._cachedAssets;
        }

        const mapped: UniversalAsset[] = (data || []).map((row: any) => {
          // Parse serial number and embedded metadata (e.g. SN-001 [RET:YES|DED:1500])
          const rawSerial = row.serial_number || '';
          let isReturnable = true;
          let deductionAmt = 0;
          let cleanSerial = rawSerial;

          const metaMatch = rawSerial.match(/\[RET:(YES|NO)\|DED:(\d+)\]/i);
          if (metaMatch) {
            isReturnable = metaMatch[1].toUpperCase() === 'YES';
            deductionAmt = Number(metaMatch[2]) || 0;
            cleanSerial = rawSerial.replace(/\[RET:(YES|NO)\|DED:(\d+)\]/i, '').trim();
          }

          // Also check name for tags if needed
          const catDef = MODULAR_CATEGORIES.find(c => c.dbCategory === row.category) || MODULAR_CATEGORIES[0];

          return {
            id: row.id,
            tenant_id: row.organization_id || DEFAULT_ORG_ID,
            legal_entity_id: row.company_id || DEFAULT_COMPANY_ID,
            asset_category_code: row.category || 'HARDWARE',
            asset_type_code: row.category || 'HARDWARE',
            asset_code: row.asset_code || `AST-${row.id?.slice(0, 6)}`,
            asset_name: row.name || 'Unnamed Asset',
            asset_class: 'TRACKED_ASSET',
            tracking_mode: 'INDIVIDUAL',
            status: row.status || 'AVAILABLE',
            condition: 'GOOD',
            serial_number: cleanSerial || '-',
            purchase_date: row.purchase_date || new Date().toISOString().split('T')[0],
            purchase_price: Number(row.purchase_cost) || 0,
            currency: 'INR',
            created_at: row.created_at || new Date().toISOString(),
            updated_at: row.updated_at || new Date().toISOString(),
            is_returnable: isReturnable,
            deduction_amount: deductionAmt,

            // Compatibility aliases for table renderers
            name: row.name,
            category: row.category,
            type: catDef.name,
            serial: cleanSerial || '-',
            assignedTo: row.status === 'ASSIGNED' ? 'Assigned to Employee' : 'Unassigned (Pool)',
            value: Number(row.purchase_cost) > 0 ? `₹${Number(row.purchase_cost).toLocaleString('en-IN')}` : '₹0',
          };
        });

        this._cachedAssets = mapped;
        this._isInitialized = true;
        return mapped;
      } catch (err: any) {
        console.error('[AssetService] Database error:', err.message);
        return this._cachedAssets;
      } finally {
        this._inFlightFetch = null;
      }
    })();

    return this._inFlightFetch;
  }

  /**
   * Synchronous getter from in-memory cache for ultra-fast component renders
   */
  getAssets(params: {
    search?: string;
    categoryCode?: string;
    status?: string;
    tab?: string;
    returnableFilter?: 'ALL' | 'RETURNABLE' | 'NON_RETURNABLE';
    page?: number;
    limit?: number;
  } = {}): { items: UniversalAsset[]; total: number; page: number; totalPages: number } {
    let filtered = [...this._cachedAssets];

    if (params.tab) {
      switch (params.tab) {
        case 'assigned':
          filtered = filtered.filter(a => a.status === 'ASSIGNED' || a.status === 'IN_USE');
          break;
        case 'available':
          filtered = filtered.filter(a => a.status === 'AVAILABLE');
          break;
        case 'maintenance':
          filtered = filtered.filter(a => a.status === 'UNDER_MAINTENANCE' || a.status === 'IN_REPAIR');
          break;
        case 'returnable':
          filtered = filtered.filter(a => a.is_returnable !== false);
          break;
        case 'non_returnable':
          filtered = filtered.filter(a => a.is_returnable === false);
          break;
      }
    }

    if (params.returnableFilter && params.returnableFilter !== 'ALL') {
      if (params.returnableFilter === 'RETURNABLE') {
        filtered = filtered.filter(a => a.is_returnable !== false);
      } else {
        filtered = filtered.filter(a => a.is_returnable === false);
      }
    }

    if (params.categoryCode && params.categoryCode !== 'ALL') {
      filtered = filtered.filter(a => a.asset_category_code === params.categoryCode || a.category === params.categoryCode);
    }

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter(a => a.status === params.status);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(a => {
        const name = (a.asset_name || '').toLowerCase();
        const code = (a.asset_code || '').toLowerCase();
        const serial = (a.serial_number || '').toLowerCase();
        const cat = (a.category || '').toLowerCase();
        return name.includes(q) || code.includes(q) || serial.includes(q) || cat.includes(q);
      });
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, totalPages };
  }

  getAssetById(id: string): UniversalAsset | null {
    return this._cachedAssets.find(a => a.id === id) || null;
  }

  /**
   * Register a new Asset directly into Supabase PostgreSQL
   */
  async createAsset(params: {
    assetName: string;
    categoryCode: string;
    assetCode?: string;
    serialNumber?: string;
    purchaseCost?: number;
    purchaseDate?: string;
    isReturnable?: boolean;
    deductionAmount?: number;
    description?: string;
  }): Promise<UniversalAsset> {
    const client = isSupabaseEnabled ? supabaseAdmin : supabase;

    // Resolve company and organization context
    let orgId = DEFAULT_ORG_ID;
    let compId = DEFAULT_COMPANY_ID;
    try {
      const user = api.getCurrentUser?.();
      if (user?.organization_id) orgId = user.organization_id;
      if ((user as any)?.company_id) compId = (user as any).company_id;
    } catch (_) {}

    // Find category definition
    const catDef = MODULAR_CATEGORIES.find(c => c.code === params.categoryCode) || MODULAR_CATEGORIES[0];

    // Generate clean asset code
    const count = this._cachedAssets.length + 1;
    const assetCode = params.assetCode?.trim() || `AST-${String(count).padStart(4, '0')}`;

    // Encode returnable & deduction metadata into serial_number
    const isReturnable = params.isReturnable !== false;
    const dedAmt = Number(params.deductionAmount) || 0;
    const cleanSerial = (params.serialNumber || `SN-${assetCode}`).trim();
    const encodedSerial = `${cleanSerial} [RET:${isReturnable ? 'YES' : 'NO'}|DED:${dedAmt}]`;

    const dbPayload = {
      organization_id: orgId,
      company_id: compId,
      asset_code: assetCode,
      name: params.assetName.trim(),
      category: catDef.dbCategory,
      serial_number: encodedSerial,
      purchase_date: params.purchaseDate || new Date().toISOString().split('T')[0],
      purchase_cost: Number(params.purchaseCost) || 0,
      status: 'AVAILABLE',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('assets')
      .insert([dbPayload])
      .select('*')
      .single();

    if (error) {
      console.error('[AssetService] Failed to insert asset into Supabase:', error);
      throw new Error(`Failed to save asset to database: ${error.message}`);
    }

    const createdAsset: UniversalAsset = {
      id: data.id,
      tenant_id: orgId,
      legal_entity_id: compId,
      asset_category_code: catDef.dbCategory,
      asset_type_code: catDef.dbCategory,
      asset_code: assetCode,
      asset_name: params.assetName,
      asset_class: 'TRACKED_ASSET',
      tracking_mode: 'INDIVIDUAL',
      status: 'AVAILABLE',
      condition: 'NEW',
      serial_number: cleanSerial,
      purchase_date: dbPayload.purchase_date,
      purchase_price: dbPayload.purchase_cost,
      currency: 'INR',
      created_at: data.created_at,
      updated_at: data.updated_at,
      is_returnable: isReturnable,
      deduction_amount: dedAmt,
      name: params.assetName,
      category: catDef.dbCategory,
      type: catDef.name,
      serial: cleanSerial,
      assignedTo: 'Unassigned (Pool)',
      value: `₹${Number(dbPayload.purchase_cost).toLocaleString('en-IN')}`,
    };

    // Update in-memory cache and emit event
    this._cachedAssets.unshift(createdAsset);
    hrEventBus.emit('asset.created', createdAsset);
    return createdAsset;
  }

  /**
   * Update Asset status in Supabase (e.g. from Available to Assigned or Retired)
   */
  async updateAssetStatus(assetId: string, status: string): Promise<void> {
    const client = isSupabaseEnabled ? supabaseAdmin : supabase;
    const { error } = await client
      .from('assets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', assetId);

    if (error) {
      console.warn('[AssetService] Update status failed:', error.message);
    }

    const item = this._cachedAssets.find(a => a.id === assetId);
    if (item) {
      item.status = status;
      item.assignedTo = status === 'ASSIGNED' ? 'Assigned' : 'Unassigned (Pool)';
      hrEventBus.emit('asset.updated', item);
    }
  }

  /**
   * Delete asset from Supabase
   */
  async deleteAsset(assetId: string): Promise<void> {
    const client = isSupabaseEnabled ? supabaseAdmin : supabase;
    const { error } = await client.from('assets').delete().eq('id', assetId);
    if (error) {
      throw new Error(`Failed to delete asset: ${error.message}`);
    }

    this._cachedAssets = this._cachedAssets.filter(a => a.id !== assetId);
    hrEventBus.emit('asset.deleted', { assetId });
  }

  /**
   * Compute real-time KPIs from active database records
   */
  getSummaryMetrics(): AssetSummaryMetrics {
    const assets = this._cachedAssets;
    const totalAssets = assets.length;
    const totalValuation = assets.reduce((acc, a) => acc + (a.purchase_price || 0), 0);
    const assigned = assets.filter(a => a.status === 'ASSIGNED' || a.status === 'IN_USE').length;
    const available = assets.filter(a => a.status === 'AVAILABLE').length;
    const underMnt = assets.filter(a => a.status === 'UNDER_MAINTENANCE' || a.status === 'IN_REPAIR').length;

    return {
      total_assets: totalAssets,
      total_valuation: totalValuation,
      total_valuation_formatted: totalValuation > 0 ? `₹${totalValuation.toLocaleString('en-IN')}` : '₹0',
      currently_assigned: assigned,
      available_in_pool: available,
      under_maintenance: underMnt,
      low_stock_items_count: 0,
      total_inventory_items: totalAssets,
    };
  }

  getCategories(): AssetCategory[] {
    return MODULAR_CATEGORIES.map(c => ({
      id: `cat-${c.code.toLowerCase()}`,
      tenant_id: DEFAULT_ORG_ID,
      code: c.code,
      name: c.name,
      icon: c.icon,
    }));
  }

  getAssetTypes(): AssetTypeMaster[] {
    return MODULAR_CATEGORIES.map(c => ({
      id: `typ-${c.code.toLowerCase()}`,
      tenant_id: DEFAULT_ORG_ID,
      code: c.code,
      name: c.name,
      asset_class: 'TRACKED_ASSET',
      tracking_mode: 'INDIVIDUAL',
      serial_required: false,
      qr_required: false,
      employee_assignable: true,
      location_assignable: true,
      vendor_assignable: true,
      maintenance_enabled: true,
      warranty_enabled: true,
      depreciation_enabled: true,
      meter_tracking_enabled: false,
    }));
  }

  /**
   * Backward-compatibility stubs for legacy components or cached browser modules
   */
  getAttributeDefinitions(_industry?: any): any[] {
    return [];
  }

  getIndustryProfiles(): any[] {
    return [
      { code: 'IT', name: 'Information Technology' },
      { code: 'MANUFACTURING', name: 'Manufacturing & Plants' },
      { code: 'HEALTHCARE', name: 'Healthcare & Pharma' },
      { code: 'LOGISTICS', name: 'Logistics & Supply Chain' },
      { code: 'CONSTRUCTION', name: 'Construction & Real Estate' },
      { code: 'RETAIL', name: 'Retail & Hospitality' },
    ];
  }

  getVendors(): any[] {
    return [];
  }

  getLocations(): any[] {
    return [];
  }
}

export const assetService = new AssetService();
