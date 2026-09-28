// src/services/clientBilling/chargeCategoryService.ts
// ============================================================================
// JOY PeopleHR — Dynamic Charge Category Master & Evaluation Engine
// ============================================================================

import { ChargeCategoryMaster, BillingRule } from '../../types/clientBilling';

export const STANDARD_CHARGE_CATEGORIES: ChargeCategoryMaster[] = [
  {
    id: 'cat-service-charge',
    tenant_id: 'tenant-joy-01',
    category_code: 'SERVICE_CHARGE',
    category_name: 'Service Charge / Management Fee',
    charge_type: 'PERCENTAGE_BILLABLE_WAGES',
    default_rate: 8.5,
    calculation_basis: 'Gross Billable Wages (Basic + DA + HRA + Allowances + OT)',
    tax_treatment: 'GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    requires_approval: true,
    description: 'Agency management commission applied to approved monthly billable wages',
  },
  {
    id: 'cat-transport',
    tenant_id: 'tenant-joy-01',
    category_code: 'TRANSPORT',
    category_name: 'Staff Transport & Shuttle Subsidy',
    charge_type: 'PER_ACTIVE_HEAD',
    default_rate: 375,
    calculation_basis: 'Active deployed headcount during the billing month',
    tax_treatment: 'GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    requires_approval: false,
    description: 'Contractual transport and pickup amenity charge per associate',
  },
  {
    id: 'cat-canteen',
    tenant_id: 'tenant-joy-01',
    category_code: 'CANTEEN',
    category_name: 'Subsidized Canteen & Meals',
    charge_type: 'FIXED_LUMP_SUM',
    default_rate: 650,
    calculation_basis: 'Client food amenity billing per employee or plant recovery',
    tax_treatment: 'EXEMPT',
    effective_from: '2026-04-01',
    is_active: true,
    requires_approval: false,
    description: 'Plant meal facility subsidy or pass-through recovery',
  },
  {
    id: 'cat-accommodation',
    tenant_id: 'tenant-joy-01',
    category_code: 'ACCOMMODATION',
    category_name: 'Hostel & Living Accommodation',
    charge_type: 'PER_ACTIVE_HEAD',
    default_rate: 1200,
    calculation_basis: 'Migrant worker hostel and dormitory utility recovery',
    tax_treatment: 'GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    requires_approval: false,
    description: 'Worker accommodation maintenance and power recovery',
  },
  {
    id: 'cat-ppe',
    tenant_id: 'tenant-joy-01',
    category_code: 'UNIFORM',
    category_name: 'Safety Uniform & PPE Kit',
    charge_type: 'PER_ACTIVE_HEAD',
    default_rate: 850,
    calculation_basis: 'Initial onboarding safety kit issuance cost',
    tax_treatment: 'GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    requires_approval: false,
    description: 'Safety shoes, helmet, fluorescent vest, and ID badge kit',
  },
  {
    id: 'cat-stat-admin',
    tenant_id: 'tenant-joy-01',
    category_code: 'STATUTORY_ADMIN',
    category_name: 'Statutory Admin & Inspection Recovery',
    charge_type: 'PERCENTAGE_BILLABLE_WAGES',
    default_rate: 1.0,
    calculation_basis: 'PF EDLI (0.5%) + PF Admin (0.5%) pass-through to client',
    tax_treatment: 'GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    requires_approval: true,
    description: 'Statutory compliance audit and EPFO inspection charges',
  },
  {
    id: 'cat-reimbursement',
    tenant_id: 'tenant-joy-01',
    category_code: 'REIMBURSEMENT',
    category_name: 'Direct Operational Reimbursement',
    charge_type: 'FIXED_LUMP_SUM',
    default_rate: 0,
    calculation_basis: 'Actual bills incurred for medical tests / site entry badges',
    tax_treatment: 'EXEMPT',
    effective_from: '2026-04-01',
    is_active: true,
    requires_approval: true,
    description: 'Actual verified expenses approved by Client Site HR',
  },
];

const STORAGE_KEYS = {
  CATEGORIES: 'joy_charge_categories_master',
  RULES: 'joy_contract_billing_rules',
};

export class ChargeCategoryService {
  private static _store = new Map<string, any>();

  private static getStorage<T>(key: string, fallback: T): T {
    return this._store.has(key) ? this._store.get(key) : fallback;
  }

  private static setStorage<T>(key: string, value: T): void {
    this._store.set(key, value);
  }

  public static getMasterCategories(): ChargeCategoryMaster[] {
    const list = this.getStorage<ChargeCategoryMaster[]>(STORAGE_KEYS.CATEGORIES, []);
    if (list.length === 0) {
      this.setStorage(STORAGE_KEYS.CATEGORIES, STANDARD_CHARGE_CATEGORIES);
      return STANDARD_CHARGE_CATEGORIES;
    }
    return list;
  }

  public static saveCategory(cat: ChargeCategoryMaster): ChargeCategoryMaster {
    const list = this.getMasterCategories();
    const idx = list.findIndex((c) => c.id === cat.id || c.category_code === cat.category_code);
    if (idx >= 0) {
      list[idx] = cat;
    } else {
      list.push(cat);
    }
    this.setStorage(STORAGE_KEYS.CATEGORIES, list);
    return cat;
  }

  public static evaluateChargeAmount(
    rule: {
      calculation_method: string;
      rate_value: number;
    },
    context: {
      grossBillableWages: number;
      grossTotalWages: number;
      activeHeadcount: number;
      payableDays: number;
      otHours: number;
    }
  ): number {
    switch (rule.calculation_method) {
      case 'PERCENTAGE_OF_BILLABLE_WAGES':
        return Math.round((context.grossBillableWages * rule.rate_value) / 100);
      case 'PERCENTAGE_OF_GROSS':
        return Math.round((context.grossTotalWages * rule.rate_value) / 100);
      case 'PER_EMPLOYEE':
        return Math.round(context.activeHeadcount * rule.rate_value);
      case 'PER_DAY':
        return Math.round(context.payableDays * rule.rate_value);
      case 'PER_OT_HOUR':
        return Math.round(context.otHours * rule.rate_value);
      case 'FIXED_AMOUNT':
      default:
        return Math.round(rule.rate_value);
    }
  }
}
