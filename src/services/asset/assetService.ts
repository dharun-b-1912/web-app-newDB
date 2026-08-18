import {
  UniversalAsset,
  AssetCategory,
  AssetTypeMaster,
  AssetAttributeDefinition,
  AssetAttributeValue,
  IndustryProfile,
  IndustryProfileCode,
  AssetSummaryMetrics,
  AssetLifecycleStatus,
  AssetCondition,
} from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { assetAuditService } from './assetAuditService';
import { inventoryService } from './inventoryService';

const ASSETS_STORAGE_KEY = 'workforce_assets_master_v2';
const CATEGORIES_STORAGE_KEY = 'workforce_asset_categories_v2';
const TYPES_STORAGE_KEY = 'workforce_asset_types_v2';
const ATTRIBUTES_DEF_KEY = 'workforce_asset_attr_defs_v2';

const INDUSTRY_PROFILES: IndustryProfile[] = [
  {
    code: 'IT',
    name: 'Information Technology & Software',
    description: 'Laptops, workstations, servers, cloud licenses, peripherals, test devices',
    icon: 'Laptop',
    recommended_categories: ['IT_HARDWARE', 'PERIPHERALS', 'SOFTWARE_LICENSES', 'NETWORKING'],
  },
  {
    code: 'MANUFACTURING',
    name: 'Manufacturing & Plant Operations',
    description: 'CNC machines, heavy machinery, production lines, power tools, safety equipment',
    icon: 'Factory',
    recommended_categories: ['MACHINERY', 'PRODUCTION_EQUIPMENT', 'TOOLS', 'SAFETY_PPE', 'SPARE_PARTS'],
  },
  {
    code: 'CONSTRUCTION',
    name: 'Construction & Civil Engineering',
    description: 'Excavators, cranes, generators, surveying tools, site vehicles, scaffolding',
    icon: 'HardHat',
    recommended_categories: ['HEAVY_EQUIPMENT', 'SITE_VEHICLES', 'SURVEYING_TOOLS', 'SAFETY_PPE'],
  },
  {
    code: 'HEALTHCARE',
    name: 'Healthcare & Medical Facilities',
    description: 'Diagnostic equipment, ventilators, patient monitors, surgical instruments, pharmacy stock',
    icon: 'Activity',
    recommended_categories: ['MEDICAL_DEVICES', 'DIAGNOSTIC_EQUIPMENT', 'FACILITY_RESOURCES', 'CONSUMABLES'],
  },
  {
    code: 'LOGISTICS',
    name: 'Warehousing & Supply Chain',
    description: 'Forklifts, barcode scanners, pallet jacks, storage racks, commercial vehicles',
    icon: 'Truck',
    recommended_categories: ['WAREHOUSE_EQUIPMENT', 'VEHICLES', 'SCANNERS', 'PACKAGING_STOCK'],
  },
  {
    code: 'CORPORATE',
    name: 'Corporate & Multi-Branch Offices',
    description: 'Office furniture, AV equipment, conference room systems, building facilities',
    icon: 'Building',
    recommended_categories: ['OFFICE_FURNITURE', 'AV_CONFERENCE', 'IT_HARDWARE', 'FACILITIES'],
  },
];

const DEFAULT_CATEGORIES: AssetCategory[] = [
  { id: 'cat-it-01', tenant_id: 'org-joy-01', code: 'IT_HARDWARE', name: 'IT Computing & Workstations', icon: 'Laptop' },
  { id: 'cat-it-02', tenant_id: 'org-joy-01', code: 'PERIPHERALS', name: 'Monitors & Peripherals', icon: 'Monitor' },
  { id: 'cat-it-03', tenant_id: 'org-joy-01', code: 'SOFTWARE_LICENSES', name: 'Digital Licenses & Subscriptions', icon: 'Key' },
  { id: 'cat-mfg-01', tenant_id: 'org-joy-01', code: 'MACHINERY', name: 'Industrial Machinery & CNC', icon: 'Cpu' },
  { id: 'cat-mfg-02', tenant_id: 'org-joy-01', code: 'PRODUCTION_EQUIPMENT', name: 'Production & Assembly Lines', icon: 'Layers' },
  { id: 'cat-mfg-03', tenant_id: 'org-joy-01', code: 'SAFETY_PPE', name: 'Safety & Protective Equipment', icon: 'Shield' },
  { id: 'cat-veh-01', tenant_id: 'org-joy-01', code: 'VEHICLES', name: 'Fleet & Industrial Vehicles', icon: 'Truck' },
  { id: 'cat-med-01', tenant_id: 'org-joy-01', code: 'MEDICAL_DEVICES', name: 'Medical & Diagnostic Systems', icon: 'Activity' },
  { id: 'cat-cns-01', tenant_id: 'org-joy-01', code: 'CONSUMABLES', name: 'Inventory & Consumable Stock', icon: 'Package' },
];

const DEFAULT_ASSET_TYPES: AssetTypeMaster[] = [
  {
    id: 'typ-laptop',
    tenant_id: 'org-joy-01',
    code: 'LAPTOP',
    name: 'Laptop / Mobile Workstation',
    asset_class: 'TRACKED_ASSET',
    tracking_mode: 'SERIAL_NUMBER',
    serial_required: true,
    qr_required: true,
    employee_assignable: true,
    location_assignable: true,
    vendor_assignable: true,
    maintenance_enabled: true,
    warranty_enabled: true,
    depreciation_enabled: true,
    meter_tracking_enabled: false,
  },
  {
    id: 'typ-monitor',
    tenant_id: 'org-joy-01',
    code: 'MONITOR',
    name: 'Desktop Display / 4K Monitor',
    asset_class: 'TRACKED_ASSET',
    tracking_mode: 'SERIAL_NUMBER',
    serial_required: true,
    qr_required: true,
    employee_assignable: true,
    location_assignable: true,
    vendor_assignable: false,
    maintenance_enabled: false,
    warranty_enabled: true,
    depreciation_enabled: true,
    meter_tracking_enabled: false,
  },
  {
    id: 'typ-cnc',
    tenant_id: 'org-joy-01',
    code: 'CNC_MACHINE',
    name: 'CNC Milling & Lathe Center',
    asset_class: 'MACHINE',
    tracking_mode: 'METER',
    serial_required: true,
    qr_required: true,
    employee_assignable: false,
    location_assignable: true,
    vendor_assignable: false,
    maintenance_enabled: true,
    warranty_enabled: true,
    depreciation_enabled: true,
    meter_tracking_enabled: true,
  },
  {
    id: 'typ-vehicle',
    tenant_id: 'org-joy-01',
    code: 'VEHICLE',
    name: 'Commercial & Transport Vehicle',
    asset_class: 'VEHICLE',
    tracking_mode: 'METER',
    serial_required: true,
    qr_required: true,
    employee_assignable: true,
    location_assignable: true,
    vendor_assignable: false,
    maintenance_enabled: true,
    warranty_enabled: true,
    depreciation_enabled: true,
    meter_tracking_enabled: true,
  },
  {
    id: 'typ-ppe',
    tenant_id: 'org-joy-01',
    code: 'SAFETY_HELMET',
    name: 'Industrial Safety Helmet & Gear',
    asset_class: 'EQUIPMENT',
    tracking_mode: 'QUANTITY',
    serial_required: false,
    qr_required: true,
    employee_assignable: true,
    location_assignable: true,
    vendor_assignable: true,
    maintenance_enabled: false,
    warranty_enabled: false,
    depreciation_enabled: false,
    meter_tracking_enabled: false,
  },
  {
    id: 'typ-forklift',
    tenant_id: 'org-joy-01',
    code: 'FORKLIFT',
    name: 'Warehouse Electric Forklift',
    asset_class: 'EQUIPMENT',
    tracking_mode: 'METER',
    serial_required: true,
    qr_required: true,
    employee_assignable: false,
    location_assignable: true,
    vendor_assignable: false,
    maintenance_enabled: true,
    warranty_enabled: true,
    depreciation_enabled: true,
    meter_tracking_enabled: true,
  },
];

const DEFAULT_ATTRIBUTE_DEFS: AssetAttributeDefinition[] = [
  // Laptop dynamic attributes
  { id: 'ad-lp-01', tenant_id: 'org-joy-01', asset_type_code: 'LAPTOP', field_code: 'processor', field_label: 'Processor / CPU', data_type: 'TEXT', is_required: true, display_order: 1 },
  { id: 'ad-lp-02', tenant_id: 'org-joy-01', asset_type_code: 'LAPTOP', field_code: 'ram_gb', field_label: 'RAM Memory (GB)', data_type: 'NUMBER', is_required: true, unit_of_measure: 'GB', display_order: 2 },
  { id: 'ad-lp-03', tenant_id: 'org-joy-01', asset_type_code: 'LAPTOP', field_code: 'storage_capacity', field_label: 'Storage Capacity', data_type: 'DROPDOWN', is_required: true, options: ['256GB SSD', '512GB SSD', '1TB NVMe', '2TB NVMe'], display_order: 3 },
  { id: 'ad-lp-04', tenant_id: 'org-joy-01', asset_type_code: 'LAPTOP', field_code: 'os_version', field_label: 'Operating System', data_type: 'DROPDOWN', is_required: false, options: ['macOS Sonoma', 'Windows 11 Pro', 'Ubuntu LTS', 'Fedora'], display_order: 4 },

  // CNC Machine dynamic attributes
  { id: 'ad-cnc-01', tenant_id: 'org-joy-01', asset_type_code: 'CNC_MACHINE', field_code: 'power_rating_kw', field_label: 'Power Rating (kW)', data_type: 'NUMBER', is_required: true, unit_of_measure: 'kW', display_order: 1 },
  { id: 'ad-cnc-02', tenant_id: 'org-joy-01', asset_type_code: 'CNC_MACHINE', field_code: 'spindle_speed_rpm', field_label: 'Max Spindle Speed (RPM)', data_type: 'NUMBER', is_required: false, unit_of_measure: 'RPM', display_order: 2 },
  { id: 'ad-cnc-03', tenant_id: 'org-joy-01', asset_type_code: 'CNC_MACHINE', field_code: 'runtime_hours', field_label: 'Total Operating Hours Meter', data_type: 'NUMBER', is_required: true, unit_of_measure: 'Hours', display_order: 3 },

  // Vehicle dynamic attributes
  { id: 'ad-vh-01', tenant_id: 'org-joy-01', asset_type_code: 'VEHICLE', field_code: 'registration_no', field_label: 'License Plate / Reg No', data_type: 'TEXT', is_required: true, display_order: 1 },
  { id: 'ad-vh-02', tenant_id: 'org-joy-01', asset_type_code: 'VEHICLE', field_code: 'odometer_km', field_label: 'Current Odometer (km)', data_type: 'NUMBER', is_required: true, unit_of_measure: 'km', display_order: 2 },
  { id: 'ad-vh-03', tenant_id: 'org-joy-01', asset_type_code: 'VEHICLE', field_code: 'fuel_type', field_label: 'Fuel Type', data_type: 'DROPDOWN', is_required: true, options: ['Diesel', 'Petrol', 'Electric', 'Hybrid', 'CNG'], display_order: 3 },
  { id: 'ad-vh-04', tenant_id: 'org-joy-01', asset_type_code: 'VEHICLE', field_code: 'insurance_expiry', field_label: 'Insurance Expiry Date', data_type: 'DATE', is_required: false, display_order: 4 },
];

// Clean live data starting state
const INITIAL_ASSETS: UniversalAsset[] = [];

class AssetService {
  private getStore<T>(key: string, defaultVal: T[]): T[] {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
      return JSON.parse(data);
    } catch {
      return defaultVal;
    }
  }

  private setStore<T>(key: string, items: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
      console.warn(`[AssetService] Failed writing ${key}:`, e);
    }
  }

  getIndustryProfiles(): IndustryProfile[] {
    return INDUSTRY_PROFILES;
  }

  getCategories(industryCode?: string): AssetCategory[] {
    return this.getStore(CATEGORIES_STORAGE_KEY, DEFAULT_CATEGORIES);
  }

  getAssetTypes(categoryCode?: string): AssetTypeMaster[] {
    const types = this.getStore(TYPES_STORAGE_KEY, DEFAULT_ASSET_TYPES);
    if (categoryCode && categoryCode !== 'ALL') {
      return types.filter(t => t.category_id === categoryCode);
    }
    return types;
  }

  getAttributeDefinitions(assetTypeCode: string): AssetAttributeDefinition[] {
    const defs = this.getStore(ATTRIBUTES_DEF_KEY, DEFAULT_ATTRIBUTE_DEFS);
    return defs
      .filter(d => d.asset_type_code === assetTypeCode)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }

  getAssets(params: {
    search?: string;
    categoryCode?: string;
    assetTypeCode?: string;
    status?: string;
    condition?: string;
    tab?: string;
    page?: number;
    limit?: number;
  } = {}): { items: UniversalAsset[]; total: number; page: number; totalPages: number } {
    const rawAssets = this.getStore<UniversalAsset>(ASSETS_STORAGE_KEY, INITIAL_ASSETS);

    let filtered = rawAssets.map(a => ({
      ...a,
      name: a.asset_name,
      category: a.asset_category_code,
      type: a.asset_type_code,
      serial: a.serial_number || '-',
      assignedTo: a.custodian_name || 'Unassigned (Pool)',
      empCode: a.employee_id || '-',
      value: a.purchase_price ? `$${a.purchase_price.toLocaleString()}` : '$0',
    }));

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
        case 'expiring_warranty':
          const now = new Date();
          filtered = filtered.filter(a => {
            if (!a.warranty_end) return false;
            const diffDays = Math.ceil((new Date(a.warranty_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 90;
          });
          break;
      }
    }

    if (params.categoryCode && params.categoryCode !== 'ALL') {
      filtered = filtered.filter(a => a.asset_category_code === params.categoryCode);
    }

    if (params.assetTypeCode && params.assetTypeCode !== 'ALL') {
      filtered = filtered.filter(a => a.asset_type_code === params.assetTypeCode);
    }

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter(a => a.status === params.status);
    }

    if (params.condition && params.condition !== 'ALL') {
      filtered = filtered.filter(a => a.condition === params.condition);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(a => {
        const name = (a.asset_name || '').toLowerCase();
        const code = (a.asset_code || '').toLowerCase();
        const serial = (a.serial_number || '').toLowerCase();
        const custodian = (a.custodian_name || '').toLowerCase();
        const model = (a.model || '').toLowerCase();
        return name.includes(q) || code.includes(q) || serial.includes(q) || custodian.includes(q) || model.includes(q);
      });
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, totalPages };
  }

  getAssetById(id: string): UniversalAsset | null {
    const assets = this.getStore<UniversalAsset>(ASSETS_STORAGE_KEY, INITIAL_ASSETS);
    return assets.find(a => a.id === id) || null;
  }

  createAsset(params: {
    assetCategoryCode: string;
    assetTypeCode: string;
    assetName: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    condition?: AssetCondition;
    purchaseDate?: string;
    purchasePrice?: number;
    warrantyEnd?: string;
    vendorId?: string;
    customAttributes?: Record<string, any>;
    description?: string;
  }): UniversalAsset {
    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const assets = this.getStore<UniversalAsset>(ASSETS_STORAGE_KEY, INITIAL_ASSETS);

    const assetCount = assets.length + 1;
    const assetCode = `AST-${assetCount.toString().padStart(4, '0')}`;
    const assetId = `ast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const qrCode = `QR-WORKFORCEOS-${assetCode}-${Date.now()}`;

    const typeDef = this.getAssetTypes().find(t => t.code === params.assetTypeCode);

    const newAsset: UniversalAsset = {
      id: assetId,
      tenant_id: currentUser.organization_id || 'org-joy-01',
      legal_entity_id: 'comp-joy-01',
      asset_category_code: params.assetCategoryCode,
      asset_type_code: params.assetTypeCode,
      asset_code: assetCode,
      asset_name: params.assetName,
      asset_class: typeDef?.asset_class || 'TRACKED_ASSET',
      tracking_mode: typeDef?.tracking_mode || 'INDIVIDUAL',
      status: 'AVAILABLE',
      condition: params.condition || 'NEW',
      serial_number: params.serialNumber,
      barcode: params.serialNumber ? `BAR-${params.serialNumber}` : undefined,
      qr_code: qrCode,
      manufacturer: params.manufacturer,
      model: params.model,
      description: params.description,
      purchase_date: params.purchaseDate || now.split('T')[0],
      purchase_price: params.purchasePrice || 0,
      currency: 'USD',
      vendor_id: params.vendorId,
      warranty_start: params.purchaseDate,
      warranty_end: params.warrantyEnd,
      custom_attributes: params.customAttributes,
      created_by: currentUser.name || 'Dharun Joy',
      created_at: now,
      updated_at: now,
    };

    assets.unshift(newAsset);
    this.setStore(ASSETS_STORAGE_KEY, assets);

    assetAuditService.recordLog({
      assetId,
      action: 'CREATED',
      details: {
        assetCode,
        name: params.assetName,
        type: params.assetTypeCode,
        price: params.purchasePrice,
      },
    });

    hrEventBus.publish('asset.created', {
      assetId,
      assetCode,
      name: params.assetName,
    });

    return newAsset;
  }

  getSummaryMetrics(): AssetSummaryMetrics {
    const assets = this.getStore<UniversalAsset>(ASSETS_STORAGE_KEY, INITIAL_ASSETS);
    const invItems = inventoryService.getInventoryItems();

    const totalAssets = assets.length;
    const totalValuation = assets.reduce((acc, a) => acc + (a.purchase_price || 0), 0);
    const assigned = assets.filter(a => a.status === 'ASSIGNED' || a.status === 'IN_USE').length;
    const available = assets.filter(a => a.status === 'AVAILABLE').length;
    const underMnt = assets.filter(a => a.status === 'UNDER_MAINTENANCE' || a.status === 'IN_REPAIR').length;
    const lowStock = invItems.filter(i => i.is_low_stock).length;

    return {
      total_assets: totalAssets,
      total_valuation: totalValuation,
      total_valuation_formatted: totalValuation > 0 ? `$${totalValuation.toLocaleString()}` : '$0',
      currently_assigned: assigned,
      available_in_pool: available,
      under_maintenance: underMnt,
      low_stock_items_count: lowStock,
      total_inventory_items: invItems.length,
    };
  }
}

export const assetService = new AssetService();
