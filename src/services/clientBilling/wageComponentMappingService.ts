// src/services/clientBilling/wageComponentMappingService.ts
// ============================================================================
// JOY PeopleHR — Wage Component Master & Dynamic Mapping Engine
// ============================================================================

import {
  WageComponentMaster,
  WageComponentMapping,
} from '../../types/clientBilling';

export const STANDARD_WAGE_COMPONENTS: WageComponentMaster[] = [
  {
    id: 'wc-basic',
    component_code: 'BASIC',
    component_name: 'Basic Wages',
    component_type: 'EARNING',
    payroll_source_field: 'basic_earned',
    is_billable_eligible: true,
    default_included_in_wage_basis: true,
    statutory_treatment: 'PF_WAGE_BASIS',
    tax_treatment: 'TAXABLE_GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    notes: 'Core wage component subject to PF 12% + EPS 8.33%',
  },
  {
    id: 'wc-da',
    component_code: 'DA',
    component_name: 'Dearness Allowance (DA)',
    component_type: 'EARNING',
    payroll_source_field: 'da_earned',
    is_billable_eligible: true,
    default_included_in_wage_basis: true,
    statutory_treatment: 'PF_WAGE_BASIS',
    tax_treatment: 'TAXABLE_GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    notes: 'Cost of living index component included in PF calculation',
  },
  {
    id: 'wc-hra',
    component_code: 'HRA',
    component_name: 'House Rent Allowance (HRA)',
    component_type: 'EARNING',
    payroll_source_field: 'hra_earned',
    is_billable_eligible: true,
    default_included_in_wage_basis: true,
    statutory_treatment: 'ESI_WAGE_BASIS',
    tax_treatment: 'TAXABLE_GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    notes: 'Included in ESI gross wage ceiling calculation',
  },
  {
    id: 'wc-spl',
    component_code: 'SPL_ALLOW',
    component_name: 'Special Allowance',
    component_type: 'EARNING',
    payroll_source_field: 'special_allowance_earned',
    is_billable_eligible: true,
    default_included_in_wage_basis: true,
    statutory_treatment: 'TAXABLE_GROSS',
    tax_treatment: 'TAXABLE_GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    notes: 'Contractual supplementary wage line',
  },
  {
    id: 'wc-ot',
    component_code: 'OT_WAGES',
    component_name: 'Overtime Wages (OT)',
    component_type: 'EARNING',
    payroll_source_field: 'ot_amount_earned',
    is_billable_eligible: true,
    default_included_in_wage_basis: true,
    statutory_treatment: 'TAXABLE_GROSS',
    tax_treatment: 'TAXABLE_GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    notes: 'Calculated at 2.0x hourly rate from approved attendance punch logs',
  },
  {
    id: 'wc-att-bonus',
    component_code: 'ATT_BONUS',
    component_name: 'Attendance Bonus / Regularity Reward',
    component_type: 'EARNING',
    payroll_source_field: 'attendance_bonus_earned',
    is_billable_eligible: true,
    default_included_in_wage_basis: true,
    statutory_treatment: 'TAXABLE_GROSS',
    tax_treatment: 'TAXABLE_GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    notes: 'Paid when employee has zero unexcused absences in billing month',
  },
  {
    id: 'wc-incentive',
    component_code: 'INCENTIVE',
    component_name: 'Performance Incentive',
    component_type: 'EARNING',
    payroll_source_field: 'incentive_earned',
    is_billable_eligible: true,
    default_included_in_wage_basis: false,
    statutory_treatment: 'TAXABLE_GROSS',
    tax_treatment: 'TAXABLE_GST_18',
    effective_from: '2026-04-01',
    is_active: true,
    notes: 'Supervisor productivity incentive',
  },
  {
    id: 'wc-canteen',
    component_code: 'CANTEEN_REC',
    component_name: 'Canteen Meal Recovery',
    component_type: 'RECOVERY',
    payroll_source_field: 'canteen_deduction',
    is_billable_eligible: true,
    default_included_in_wage_basis: false,
    statutory_treatment: 'PASS_THROUGH',
    tax_treatment: 'EXEMPT_GST',
    effective_from: '2026-04-01',
    is_active: true,
    notes: 'Subsidized food recovery to be deducted from invoice or recovered from worker',
  },
  {
    id: 'wc-uniform',
    component_code: 'UNIFORM_REC',
    component_name: 'Safety Uniform & PPE Recovery',
    component_type: 'RECOVERY',
    payroll_source_field: 'uniform_deduction',
    is_billable_eligible: true,
    default_included_in_wage_basis: false,
    statutory_treatment: 'PASS_THROUGH',
    tax_treatment: 'EXEMPT_GST',
    effective_from: '2026-04-01',
    is_active: true,
    notes: 'PPE and safety gear recovery schedule',
  },
];

// ─── In-memory session cache (no localStorage) ───────────────────────────────
const STORAGE_KEYS = {
  COMPONENTS: 'wage_components',
  MAPPINGS: 'wage_mappings',
};
const _store = new Map<string, any>();

export class WageComponentMappingService {
  private static getStorage<T>(key: string, fallback: T): T {
    return _store.has(key) ? _store.get(key) : fallback;
  }

  private static setStorage<T>(key: string, value: T): void {
    _store.set(key, value);
  }

  public static getMasterComponents(): WageComponentMaster[] {
    const list = this.getStorage<WageComponentMaster[]>(STORAGE_KEYS.COMPONENTS, []);
    if (list.length === 0) {
      this.setStorage(STORAGE_KEYS.COMPONENTS, STANDARD_WAGE_COMPONENTS);
      return STANDARD_WAGE_COMPONENTS;
    }
    return list;
  }

  public static saveMasterComponent(comp: WageComponentMaster): WageComponentMaster {
    const list = this.getMasterComponents();
    const idx = list.findIndex((c) => c.id === comp.id || c.component_code === comp.component_code);
    if (idx >= 0) {
      list[idx] = comp;
    } else {
      list.push(comp);
    }
    this.setStorage(STORAGE_KEYS.COMPONENTS, list);
    return comp;
  }

  public static getContractMappings(clientId: string, contractId: string): WageComponentMapping[] {
    const allMappings = this.getStorage<WageComponentMapping[]>(STORAGE_KEYS.MAPPINGS, []);
    const filtered = allMappings.filter(
      (m) => m.client_id === clientId && m.contract_id === contractId
    );

    if (filtered.length === 0) {
      // Seed default contract mappings from master components
      const masterList = this.getMasterComponents();
      const defaults: WageComponentMapping[] = masterList.map((c) => ({
        id: `map-${c.component_code}-${contractId}`,
        tenant_id: 'tenant-joy-01',
        client_id: clientId,
        contract_id: contractId,
        component_code: c.component_code,
        component_name: c.component_name,
        source_payroll_field: c.payroll_source_field,
        destination_invoice_field: c.component_name,
        transformation_rule: c.default_included_in_wage_basis
          ? 'INCLUDED_IN_BILLABLE_BASE'
          : c.component_type === 'RECOVERY'
          ? 'DEDUCTED_FROM_INVOICE'
          : 'SEPARATE_LINE_ITEM',
        is_included_in_billable_basis: c.default_included_in_wage_basis,
        is_required: c.component_code === 'BASIC',
        default_value: 0,
        sample_value: c.component_code === 'BASIC' ? 12000 : c.component_code === 'DA' ? 3000 : c.component_code === 'HRA' ? 4000 : 1000,
        updated_at: new Date().toISOString(),
      }));

      this.saveContractMappings(clientId, contractId, defaults);
      return defaults;
    }

    return filtered;
  }

  public static saveContractMappings(
    clientId: string,
    contractId: string,
    mappings: WageComponentMapping[]
  ): void {
    const allMappings = this.getStorage<WageComponentMapping[]>(STORAGE_KEYS.MAPPINGS, []);
    const remaining = allMappings.filter(
      (m) => !(m.client_id === clientId && m.contract_id === contractId)
    );
    this.setStorage(STORAGE_KEYS.MAPPINGS, [...remaining, ...mappings]);
  }

  public static updateMappingRule(
    clientId: string,
    contractId: string,
    componentCode: string,
    updates: Partial<WageComponentMapping>
  ): WageComponentMapping[] {
    const mappings = this.getContractMappings(clientId, contractId);
    const updated = mappings.map((m) => {
      if (m.component_code === componentCode) {
        return { ...m, ...updates, updated_at: new Date().toISOString() };
      }
      return m;
    });
    this.saveContractMappings(clientId, contractId, updated);
    return updated;
  }

  public static calculateSimulatedWageBasis(
    mappings: WageComponentMapping[],
    sampleValues: Record<string, number>
  ): {
    grossEarnings: number;
    billableWageBasis: number;
    deductionsAndRecoveries: number;
    breakdown: { code: string; name: string; amount: number; isBillable: boolean; rule: string }[];
  } {
    let grossEarnings = 0;
    let billableWageBasis = 0;
    let deductionsAndRecoveries = 0;
    const breakdown: { code: string; name: string; amount: number; isBillable: boolean; rule: string }[] = [];

    for (const map of mappings) {
      const amt = sampleValues[map.component_code] ?? map.sample_value ?? 0;
      grossEarnings += amt;

      if (map.transformation_rule === 'INCLUDED_IN_BILLABLE_BASE' || map.is_included_in_billable_basis) {
        billableWageBasis += amt;
      } else if (map.transformation_rule === 'DEDUCTED_FROM_INVOICE') {
        deductionsAndRecoveries += amt;
      }

      breakdown.push({
        code: map.component_code,
        name: map.component_name,
        amount: amt,
        isBillable: map.is_included_in_billable_basis,
        rule: map.transformation_rule,
      });
    }

    return {
      grossEarnings,
      billableWageBasis,
      deductionsAndRecoveries,
      breakdown,
    };
  }
}
