// src/services/vendor/wageComponentMasterService.ts
// ============================================================================
// Joy PeopleHR — Wage Component Master Service
// Manages 13 canonical wage components (earnings + deductions) per vendor.
// Persists overrides to localStorage; falls back to system defaults.
// ============================================================================

import {
  WageComponentRecord,
  FoodAllowancePolicy,
  NightAllowancePolicy,
  AttendanceBonusPolicy,
} from '../../types/wageEngine';

const STORAGE_KEY_PREFIX = 'WAGE_COMPONENTS_V1_';
const ENGINE_VERSION = 'WAGE-ENGINE-V2.1';
const NOW = new Date().toISOString();

// ---------------------------------------------------------------------------
// SYSTEM DEFAULT COMPONENTS
// ---------------------------------------------------------------------------
export const SYSTEM_DEFAULT_COMPONENTS: WageComponentRecord[] = [
  // ── EARNINGS ──────────────────────────────────────────────────────────────
  {
    id: 'sys-BASIC',
    organization_id: 'SYSTEM',
    code: 'BASIC',
    name: 'Basic Wages',
    type: 'EARNING',
    calculation_method: 'DAILY_RATE_X_PAYABLE_DAYS',
    rate_unit: 'PER_DAY',
    pf_applicable: true,
    esi_applicable: true,
    pt_applicable: true,
    invoice_applicable: true,
    taxable: true,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 1,
  },
  {
    id: 'sys-OT',
    organization_id: 'SYSTEM',
    code: 'OT',
    name: 'Overtime Wages',
    type: 'EARNING',
    calculation_method: 'OT_HOURS_X_OT_RATE',
    rate_unit: 'PER_HOUR',
    pf_applicable: false,
    esi_applicable: true,
    pt_applicable: false,
    invoice_applicable: true,
    taxable: true,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 2,
  },
  {
    id: 'sys-FOOD_E',
    organization_id: 'SYSTEM',
    code: 'FOOD_E',
    name: 'Food Allowance',
    type: 'EARNING',
    calculation_method: 'ELIGIBLE_DAYS_X_RATE',
    rate: undefined,               // Must be configured by vendor
    rate_unit: 'PER_DAY',
    eligibility_rule: {
      type: 'FOOD_ALLOWANCE',
      enabled: false,              // disabled until vendor configures
      rate: 0,
      eligibility_basis: 'PRESENT_DAY',
      exclude_weekly_off: true,
      exclude_paid_leave: false,
      exclude_absent: true,
      exclude_lop: true,
      effective_from: '2024-01-01',
    } as FoodAllowancePolicy,
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: true,
    taxable: false,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 3,
  },
  {
    id: 'sys-NIGHT_E',
    organization_id: 'SYSTEM',
    code: 'NIGHT_E',
    name: 'Night Shift Allowance',
    type: 'EARNING',
    calculation_method: 'SHIFT_COUNT_X_RATE',
    rate: undefined,               // Must be configured by vendor
    rate_unit: 'PER_SHIFT',
    eligibility_rule: {
      type: 'NIGHT_ALLOWANCE',
      enabled: false,
      rate: 0,
      night_shift_codes: ['NIGHT', 'C3', 'SHIFT3', 'III', 'NIGHTSHIFT'],
      requires_approved_shift: true,
      effective_from: '2024-01-01',
    } as NightAllowancePolicy,
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: true,
    taxable: false,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 4,
  },
  {
    id: 'sys-ATT_BONUS',
    organization_id: 'SYSTEM',
    code: 'ATT_BONUS',
    name: 'Attendance Bonus',
    type: 'EARNING',
    calculation_method: 'RULE_BASED',
    rate_unit: 'FIXED',
    eligibility_rule: {
      type: 'ATTENDANCE_BONUS',
      enabled: false,              // disabled until vendor configures
      bonus_amount: 0,
      min_present_days: 24,
      max_allowed_lop: 0,
      max_allowed_absence: 0,
      weekly_off_counts_as_present: false,
      paid_leave_counts_as_present: true,
      nfh_counts_as_present: true,
      max_late_violations: 0,
      max_early_exit_violations: 3,
      approval_required: false,
      effective_from: '2024-01-01',
    } as AttendanceBonusPolicy,
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: false,
    taxable: false,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 5,
  },
  {
    id: 'sys-OTHER_E',
    organization_id: 'SYSTEM',
    code: 'OTHER_E',
    name: 'Other Allowance',
    type: 'EARNING',
    calculation_method: 'CONFIGURED',
    rate_unit: 'FIXED',
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: true,
    taxable: false,
    approval_required: true,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 6,
  },

  // ── DEDUCTIONS ────────────────────────────────────────────────────────────
  {
    id: 'sys-PF',
    organization_id: 'SYSTEM',
    code: 'PF',
    name: 'EPF (Employee)',
    type: 'DEDUCTION',
    calculation_method: 'PCT_OF_BASIC',
    rate: 12,                      // 12% standard
    rate_unit: 'PERCENT',
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: false,
    taxable: false,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 10,
  },
  {
    id: 'sys-ESI',
    organization_id: 'SYSTEM',
    code: 'ESI',
    name: 'ESI (Employee)',
    type: 'DEDUCTION',
    calculation_method: 'PCT_OF_GROSS',
    rate: 0.75,                    // 0.75% employee share
    rate_unit: 'PERCENT',
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: false,
    taxable: false,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 11,
  },
  {
    id: 'sys-PT',
    organization_id: 'SYSTEM',
    code: 'PT',
    name: 'Professional Tax',
    type: 'DEDUCTION',
    calculation_method: 'TAX_SLAB',
    rate_unit: 'FIXED',
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: false,
    taxable: false,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 12,
  },
  {
    id: 'sys-LWF',
    organization_id: 'SYSTEM',
    code: 'LWF',
    name: 'Tamil Nadu LWF',
    type: 'DEDUCTION',
    calculation_method: 'FIXED_AMOUNT',
    rate: 20,                      // ₹20 employee share (₹40 employer)
    rate_unit: 'FIXED',
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: false,
    taxable: false,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 13,
  },
  {
    id: 'sys-ADV',
    organization_id: 'SYSTEM',
    code: 'ADV',
    name: 'Advance Recovery',
    type: 'DEDUCTION',
    calculation_method: 'FIXED_SCHEDULED',
    rate: undefined,               // per-employee configured
    rate_unit: 'FIXED',
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: false,
    taxable: false,
    approval_required: true,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 14,
  },
  {
    id: 'sys-FOOD_D',
    organization_id: 'SYSTEM',
    code: 'FOOD_D',
    name: 'Food Recovery (Canteen)',
    type: 'DEDUCTION',
    calculation_method: 'ELIGIBLE_DAYS_X_RATE',
    rate: undefined,
    rate_unit: 'PER_DAY',
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: false,
    taxable: false,
    approval_required: false,
    effective_from: '2024-01-01',
    active: true,                  // enabled for contract worker canteen recoveries
    created_at: NOW,
    updated_at: NOW,
    sort_order: 15,
  },
  {
    id: 'sys-ACCOM_D',
    organization_id: 'SYSTEM',
    code: 'ACCOM_D',
    name: 'Accommodation Recovery',
    type: 'DEDUCTION',
    calculation_method: 'FIXED_AMOUNT',
    rate: undefined,
    rate_unit: 'FIXED',
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: false,
    taxable: false,
    approval_required: false,
    effective_from: '2024-01-01',
    active: false,                 // disabled by default
    created_at: NOW,
    updated_at: NOW,
    sort_order: 16,
  },
  {
    id: 'sys-OTHER_D',
    organization_id: 'SYSTEM',
    code: 'OTHER_D',
    name: 'Other Deduction',
    type: 'DEDUCTION',
    calculation_method: 'CONFIGURED',
    rate_unit: 'FIXED',
    pf_applicable: false,
    esi_applicable: false,
    pt_applicable: false,
    invoice_applicable: false,
    taxable: false,
    approval_required: true,
    effective_from: '2024-01-01',
    active: true,
    created_at: NOW,
    updated_at: NOW,
    sort_order: 17,
  },
];

// ---------------------------------------------------------------------------
// SERVICE CLASS
// ---------------------------------------------------------------------------
export class WageComponentMasterService {
  private static storageKey(vendorId: string): string {
    return `${STORAGE_KEY_PREFIX}${vendorId}`;
  }

  /** Return all components for a vendor (merges system defaults + vendor overrides). */
  static getComponents(vendorId: string): WageComponentRecord[] {
    try {
      const raw = localStorage.getItem(this.storageKey(vendorId));
      if (!raw) return [...SYSTEM_DEFAULT_COMPONENTS];
      const stored: WageComponentRecord[] = JSON.parse(raw);
      // Merge: vendor overrides take precedence, system defaults fill gaps
      const map = new Map<string, WageComponentRecord>();
      SYSTEM_DEFAULT_COMPONENTS.forEach(c => map.set(c.code, { ...c, vendor_id: vendorId, organization_id: vendorId }));
      stored.forEach(c => map.set(c.code, c));
      return Array.from(map.values()).sort((a, b) => a.sort_order - b.sort_order);
    } catch {
      return [...SYSTEM_DEFAULT_COMPONENTS];
    }
  }

  /** Persist a component (upsert by code). */
  static saveComponent(vendorId: string, component: WageComponentRecord): WageComponentRecord[] {
    const existing = this.getComponents(vendorId);
    const idx = existing.findIndex(c => c.code === component.code);
    const updated = { ...component, vendor_id: vendorId, updated_at: new Date().toISOString() };
    if (idx >= 0) {
      existing[idx] = updated;
    } else {
      existing.push(updated);
    }
    existing.sort((a, b) => a.sort_order - b.sort_order);
    try {
      localStorage.setItem(this.storageKey(vendorId), JSON.stringify(existing));
    } catch {
      /* quota — ignore for now */
    }
    return existing;
  }

  /** Delete a vendor-specific override (reverts to system default). */
  static deleteComponent(vendorId: string, code: string): WageComponentRecord[] {
    const existing = this.getComponents(vendorId);
    const filtered = existing.filter(c => c.code !== code || c.id.startsWith('sys-'));
    try {
      localStorage.setItem(this.storageKey(vendorId), JSON.stringify(filtered));
    } catch {
      /* ignore */
    }
    return filtered;
  }

  /** Get a single component by code. */
  static getComponent(vendorId: string, code: string): WageComponentRecord | undefined {
    return this.getComponents(vendorId).find(c => c.code === code);
  }

  /** Get only active EARNING components in sort order. */
  static getActiveEarnings(vendorId: string): WageComponentRecord[] {
    return this.getComponents(vendorId).filter(c => c.type === 'EARNING' && c.active);
  }

  /** Get only active DEDUCTION components in sort order. */
  static getActiveDeductions(vendorId: string): WageComponentRecord[] {
    return this.getComponents(vendorId).filter(c => c.type === 'DEDUCTION' && c.active);
  }

  static get engineVersion(): string {
    return ENGINE_VERSION;
  }
}
