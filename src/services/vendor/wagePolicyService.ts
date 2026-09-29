// src/services/vendor/wagePolicyService.ts
// ============================================================================
// Joy PeopleHR — Payroll Policy Service & Immutable Snapshot Manager
// Policy is the central versioned object. Never hard-code vendor conditions in engine.
// ============================================================================

import {
  PayrollPolicy,
  PayrollPolicySnapshot,
  WageSplitRule,
} from '../../types/payrollPolicy';

export const JOY_MANPOWER_SEP_2026_POLICY: PayrollPolicy = {
  policyId: 'POL-JOY-SEP2026-V2',
  policyName: 'Joy Manpower Services — Sept 2026 Standard Plant Wage Policy',
  vendorId: 'VND-JOY-01',
  effectiveFrom: '2026-08-26',
  effectiveTo: '2026-09-25',
  version: '2.1',
  status: 'ACTIVE',
  description: 'Authoritative wage splitting (Basic 55% + HRA 45% = Wages), OT hourly rate, PF 12%/13%, and ESI 0.75%/3.25%.',

  wageRules: {
    salaryBasis: 'DAILY_RATE',
    standardWorkingHoursPerDay: 8,
    standardMonthDays: 26,
    baseWageSplitRules: [
      { componentCode: 'BASIC', componentName: 'Basic Salary (55%)', percentageOfBase: 55, rounding: 'ROUND', decimalPlaces: 2 },
      { componentCode: 'HRA', componentName: 'House Rent Allowance (45%)', percentageOfBase: 45, rounding: 'ROUND', decimalPlaces: 2 },
    ],
    minWagesComplianceCheck: true,
    minDailyWageThreshold: 450,
  },

  otRules: {
    enabled: true,
    rateMultiplier: 1.0,
    hourlyRateFormula: 'DAILY_RATE_DIV_8',
    minOtThresholdMinutes: 30,
    roundOtToQuarterHour: false,
    requiresManagerApproval: true,
  },

  earningRules: {
    foodAllowance: {
      enabled: false,
      ratePerDay: 50,
      eligibilityBasis: 'PRESENT_DAYS',
      excludeWeeklyOff: true,
      excludeHolidays: true,
    },
    nightAllowance: {
      enabled: false,
      ratePerShift: 100,
      shiftCodes: ['C', 'NIGHT', 'III'],
    },
    attendanceBonus: {
      enabled: true,
      amount: 500,
      minPresentDays: 25,
      maxAllowedLOP: 0,
      maxAllowedLateCount: 0,
    },
  },

  deductionRules: {
    canteenRecoveryEnabled: true,
    accommodationRentEnabled: true,
    salaryAdvanceRecoveryEnabled: true,
    uniformShoeRecoveryEnabled: false,
    maxDeductionCapPercentageOfGross: 50,
  },

  statutoryRules: {
    pf: {
      enabled: true,
      employeeRate: 0.12,
      employerRate: 0.13,
      wageCeiling: 15000,
      basis: 'BASIC_ONLY',
      applyWageCeilingToEmployee: true,
      applyWageCeilingToEmployer: true,
    },
    esi: {
      enabled: true,
      employeeRate: 0.0075,
      employerRate: 0.0325,
      grossWageLimit: 21000,
      basis: 'GROSS_EARNINGS',
    },
    pt: {
      enabled: true,
      stateCode: 'TN',
      slabTable: [
        { minMonthlyGross: 0, maxMonthlyGross: 21000, taxAmount: 0 },
        { minMonthlyGross: 21001, maxMonthlyGross: 30000, taxAmount: 135 },
        { minMonthlyGross: 30001, maxMonthlyGross: 45000, taxAmount: 315 },
        { minMonthlyGross: 45001, maxMonthlyGross: 60000, taxAmount: 690 },
        { minMonthlyGross: 60001, maxMonthlyGross: 75000, taxAmount: 1025 },
        { minMonthlyGross: 75001, maxMonthlyGross: 99999999, taxAmount: 1250 },
      ],
    },
    lwf: {
      enabled: false,
      employeeAmount: 10,
      employerAmount: 20,
      deductionMonthInterval: 12,
    },
  },

  billingRules: {
    serviceChargePercentage: 8.0,
    serviceChargeBasis: 'WAGES_PLUS_OT',
    taxInvoiceSacCode: '998519',
    categoryOfService: 'Other Employment and Labour Supply Services',
    gstEnabled: true,
    sgstRate: 0.09,
    cgstRate: 0.09,
    igstRate: 0.18,
    reverseChargeApplicable: false,
  },

  exportTemplateId: 'TMPL_JOY_MANPOWER_SALARY_STATEMENT',
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
};

export const BULL_MACHINES_PLANT_1_POLICY: PayrollPolicy = {
  policyId: 'POL-BULL-PLANT1-JUL2026-V1',
  policyName: 'Bull Machines Pvt Ltd (Plant 1) — July 2026 Contract Policy',
  vendorId: 'VND-JOY-01',
  clientId: 'CLI-BULL-01',
  siteId: 'SITE-PLANT-1',
  effectiveFrom: '2026-07-01',
  effectiveTo: '2026-07-31',
  version: '1.0',
  status: 'LOCKED',
  description: 'Strict 6-part daily rate split (56% Basic, 10% HRA, 4% TA, 15% TurnPerf, 6% HODAssPerf, 9% TaskPerf), 8% service charge on (PayDays*Rate)+OT, and 18% GST.',

  wageRules: {
    salaryBasis: 'DAILY_RATE',
    standardWorkingHoursPerDay: 8,
    standardMonthDays: 27,
    baseWageSplitRules: [
      { componentCode: 'BASIC', componentName: 'Basic (56%)', percentageOfBase: 56, rounding: 'ROUND', decimalPlaces: 0 },
      { componentCode: 'HRA', componentName: 'HRA (10%)', percentageOfBase: 10, rounding: 'ROUND', decimalPlaces: 1 },
      { componentCode: 'TA', componentName: 'Transport Allowance (4%)', percentageOfBase: 4, rounding: 'ROUND', decimalPlaces: 0 },
      { componentCode: 'TURNPERF', componentName: 'Turnaround Performance (15%)', percentageOfBase: 15, rounding: 'ROUND', decimalPlaces: 2 },
      { componentCode: 'HODASSPERF', componentName: 'HOD Assessment Performance (6%)', percentageOfBase: 6, rounding: 'ROUND', decimalPlaces: 2 },
      { componentCode: 'TASKPERF', componentName: 'Task Performance (9%)', percentageOfBase: 9, rounding: 'ROUND', decimalPlaces: 2 },
    ],
    minWagesComplianceCheck: true,
  },

  otRules: {
    enabled: true,
    rateMultiplier: 1.0,
    hourlyRateFormula: 'DAILY_RATE_DIV_8',
    minOtThresholdMinutes: 0,
    roundOtToQuarterHour: false,
    requiresManagerApproval: true,
  },

  earningRules: {
    attendanceBonus: {
      enabled: true,
      amount: 500,
      minPresentDays: 27,
      maxAllowedLOP: 0,
      maxAllowedLateCount: 0,
    },
  },

  deductionRules: {
    canteenRecoveryEnabled: true,
    accommodationRentEnabled: false,
    salaryAdvanceRecoveryEnabled: false,
    uniformShoeRecoveryEnabled: true,
  },

  statutoryRules: {
    pf: {
      enabled: true,
      employeeRate: 0.12,
      employerRate: 0.13,
      wageCeiling: 15000,
      basis: 'BASIC_ONLY',
      applyWageCeilingToEmployee: true,
      applyWageCeilingToEmployer: true,
    },
    esi: {
      enabled: true,
      employeeRate: 0.0075,
      employerRate: 0.0325,
      grossWageLimit: 21000,
      basis: 'GROSS_EARNINGS',
    },
    pt: {
      enabled: false,
      stateCode: 'TN',
      slabTable: [],
    },
    lwf: {
      enabled: false,
      employeeAmount: 0,
      employerAmount: 0,
      deductionMonthInterval: 12,
    },
  },

  billingRules: {
    serviceChargePercentage: 8.0,
    serviceChargeBasis: 'WAGES_PLUS_OT',
    taxInvoiceSacCode: '998519',
    categoryOfService: 'Other Employment and Labour Supply Services',
    gstEnabled: true,
    sgstRate: 0.09,
    cgstRate: 0.09,
    igstRate: 0.18,
    reverseChargeApplicable: false,
  },

  exportTemplateId: 'TMPL_BULL_PLANT1_INVOICE_WORKINGS',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  lockedAt: '2026-08-01T00:00:00.000Z',
  lockedBy: 'FINANCE_CONTROLLER',
};

// ---------------------------------------------------------------------------
// POLICY SERVICE & IN-MEMORY REPOSITORY
// ---------------------------------------------------------------------------
export class WagePolicyService {
  private static policies: Map<string, PayrollPolicy> = new Map([
    [JOY_MANPOWER_SEP_2026_POLICY.policyId, JOY_MANPOWER_SEP_2026_POLICY],
    [BULL_MACHINES_PLANT_1_POLICY.policyId, BULL_MACHINES_PLANT_1_POLICY],
  ]);

  private static snapshots: Map<string, PayrollPolicySnapshot> = new Map();

  static getPolicy(policyId: string): PayrollPolicy {
    return this.policies.get(policyId) ?? JOY_MANPOWER_SEP_2026_POLICY;
  }

  static getActivePolicyForVendor(vendorId: string): PayrollPolicy {
    for (const p of this.policies.values()) {
      if (p.vendorId === vendorId && p.status === 'ACTIVE') return p;
    }
    return JOY_MANPOWER_SEP_2026_POLICY;
  }

  static getAllPolicies(): PayrollPolicy[] {
    return Array.from(this.policies.values());
  }

  static savePolicy(policy: PayrollPolicy): PayrollPolicy {
    const updated = {
      ...policy,
      updatedAt: new Date().toISOString(),
    };
    this.policies.set(policy.policyId, updated);
    return updated;
  }

  /**
   * Freezes policy state into an immutable snapshot for a specific payroll run.
   * Guarantees that subsequent policy edits NEVER change past approved payroll runs.
   */
  static createSnapshot(policy: PayrollPolicy, runId: string): PayrollPolicySnapshot {
    const snapshotId = `SNAP-${policy.policyId}-${runId}-${Date.now()}`;
    const snapshot: PayrollPolicySnapshot = {
      snapshotId,
      policyId: policy.policyId,
      policyVersion: policy.version,
      policyHash: `${policy.policyId}_v${policy.version}_${new Date().toISOString()}`,
      capturedAt: new Date().toISOString(),
      policyData: JSON.parse(JSON.stringify(policy)), // deep clone
    };
    this.snapshots.set(snapshotId, snapshot);
    return snapshot;
  }

  static getSnapshot(snapshotId: string): PayrollPolicySnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }
}
