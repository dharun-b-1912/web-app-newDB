import { describe, it, expect } from 'vitest';
import {
  resolveApplicableRateCard,
  computeEntryPieceEarnings,
  distributeProductionEntryToAllocations,
  calculateWorkerPayrollLine,
} from '../garmentWageCalculator';
import {
  GarmentFloorAttendance,
  GarmentOrgSettings,
  GarmentPieceRateCard,
  GarmentProductionAllocation,
  GarmentProductionEntry,
  GarmentWageAssignment,
} from '../../../types/garment';

const ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';

const BASE_SETTINGS: GarmentOrgSettings = {
  organization_id: ORG_ID,
  piece_rate_calculation_mode: 'CONFIGURABLE_PER_ORDER',
  default_shared_split_method: 'EQUAL',
  default_rework_payment_rule: 'ACCEPTED_ONLY',
  rework_rate_percentage: 0,
  rejected_payment_rule: 'NEVER_PAY',
  rejected_rate_percentage: 0,
  require_qc_before_piece_pay: true,
  supervisor_can_override_rate: false,
  allow_backdated_entry_days: 2,
  overtime_multiplier_daily: 1.5,
  overtime_multiplier_hourly: 1.5,
  overtime_applies_to_piece_rate: true,
  standard_hours_per_day: 8,
  max_deduction_pct_of_gross: 50,
  enforce_minimum_wage_check: false,
  statutory_minimum_daily_wage: 0,
  currency_code: 'INR',
};

function makeDailyAttendances(days: number, hoursPerDay = 8, otPerDay = 0): GarmentFloorAttendance[] {
  return Array.from({ length: days }, (_, idx) => {
    const day = String(idx + 1).padStart(2, '0');
    return {
      id: `att-${day}`,
      organization_id: ORG_ID,
      work_date: `2026-11-${day}`,
      employee_id: 'emp-1',
      status: 'PRESENT',
      payable_day_factor: 1,
      worked_hours: hoursPerDay,
      overtime_hours: otPerDay,
      late_minutes: 0,
      early_exit_minutes: 0,
      source: 'SUPERVISOR_MOBILE',
      sync_to_core_attendance: true,
      approval_status: 'APPROVED',
    };
  });
}

describe('garmentWageCalculator', () => {
  it('calculates Daily wage accurately (26 days x ₹700 = ₹18,200)', () => {
    const assignment: GarmentWageAssignment = {
      id: 'wa-1',
      organization_id: ORG_ID,
      employee_id: 'emp-1',
      wage_method: 'DAILY',
      payment_frequency: 'MONTHLY',
      daily_rate: 700,
      hourly_rate: 0,
      hybrid_base_daily_rate: 0,
      hybrid_base_hourly_rate: 0,
      default_piece_rate: 0,
      overtime_hourly_rate: 0,
      minimum_daily_guarantee: 0,
      incentive_eligible: true,
      custom_rules_json: {},
      effective_from: '2026-11-01',
      version: 1,
      is_active: true,
    };

    const res = calculateWorkerPayrollLine({
      employee_id: 'emp-1',
      wage_assignments: [assignment],
      attendances: makeDailyAttendances(26),
      allocations: [],
      incentive_awards: [],
      ledger_entries: [],
      settings: BASE_SETTINGS,
      period_start: '2026-11-01',
      period_end: '2026-11-30',
    });

    expect(res.payable_days).toBe(26);
    expect(res.daily_wage_earnings).toBe(18200);
    expect(res.gross_earnings).toBe(18200);
    expect(res.net_payable).toBe(18200);
  });

  it('calculates Hourly wage accurately (26 days x 8 hrs = 208 hrs x ₹100 = ₹20,800)', () => {
    const assignment: GarmentWageAssignment = {
      id: 'wa-2',
      organization_id: ORG_ID,
      employee_id: 'emp-1',
      wage_method: 'HOURLY',
      payment_frequency: 'WEEKLY',
      daily_rate: 0,
      hourly_rate: 100,
      hybrid_base_daily_rate: 0,
      hybrid_base_hourly_rate: 0,
      default_piece_rate: 0,
      overtime_hourly_rate: 0,
      minimum_daily_guarantee: 0,
      incentive_eligible: true,
      custom_rules_json: {},
      effective_from: '2026-11-01',
      version: 1,
      is_active: true,
    };

    const res = calculateWorkerPayrollLine({
      employee_id: 'emp-1',
      wage_assignments: [assignment],
      attendances: makeDailyAttendances(26, 8),
      allocations: [],
      incentive_awards: [],
      ledger_entries: [],
      settings: BASE_SETTINGS,
      period_start: '2026-11-01',
      period_end: '2026-11-30',
    });

    expect(res.worked_hours).toBe(208);
    expect(res.hourly_wage_earnings).toBe(20800);
    expect(res.net_payable).toBe(20800);
  });

  it('calculates Piece-Rate wage accurately (1,500 approved pieces x ₹12 = ₹18,000)', () => {
    const assignment: GarmentWageAssignment = {
      id: 'wa-3',
      organization_id: ORG_ID,
      employee_id: 'emp-1',
      wage_method: 'PIECE_RATE',
      payment_frequency: 'WEEKLY',
      daily_rate: 0,
      hourly_rate: 0,
      hybrid_base_daily_rate: 0,
      hybrid_base_hourly_rate: 0,
      default_piece_rate: 12,
      overtime_hourly_rate: 0,
      minimum_daily_guarantee: 0,
      incentive_eligible: true,
      custom_rules_json: {},
      effective_from: '2026-11-01',
      version: 1,
      is_active: true,
    };

    const alloc: GarmentProductionAllocation = {
      id: 'al-1',
      organization_id: ORG_ID,
      production_entry_id: 'pe-1',
      work_date: '2026-11-10',
      employee_id: 'emp-1',
      operation_id: 'op-1',
      share_ratio: 1,
      allocated_produced_qty: 1600,
      allocated_accepted_qty: 1500,
      allocated_rejected_qty: 50,
      allocated_rework_qty: 50,
      allocated_rework_accepted_qty: 0,
      payable_units: 1500,
      unit_rate: 12,
      earned_piece_amount: 18000,
      incentive_amount: 0,
      is_locked: false,
    };

    const res = calculateWorkerPayrollLine({
      employee_id: 'emp-1',
      wage_assignments: [assignment],
      attendances: [],
      allocations: [alloc],
      incentive_awards: [],
      ledger_entries: [],
      settings: BASE_SETTINGS,
      period_start: '2026-11-01',
      period_end: '2026-11-30',
    });

    expect(res.piece_rate_earnings).toBe(18000);
    expect(res.net_payable).toBe(18000);
  });

  it('calculates Hybrid wage accurately (26 x ₹400 + 1,500 x ₹5 = ₹17,900)', () => {
    const assignment: GarmentWageAssignment = {
      id: 'wa-4',
      organization_id: ORG_ID,
      employee_id: 'emp-1',
      wage_method: 'HYBRID',
      payment_frequency: 'MONTHLY',
      daily_rate: 0,
      hourly_rate: 0,
      hybrid_base_daily_rate: 400,
      hybrid_base_hourly_rate: 0,
      default_piece_rate: 5,
      overtime_hourly_rate: 0,
      minimum_daily_guarantee: 0,
      incentive_eligible: true,
      custom_rules_json: {},
      effective_from: '2026-11-01',
      version: 1,
      is_active: true,
    };

    const alloc: GarmentProductionAllocation = {
      id: 'al-2',
      organization_id: ORG_ID,
      production_entry_id: 'pe-2',
      work_date: '2026-11-10',
      employee_id: 'emp-1',
      operation_id: 'op-1',
      share_ratio: 1,
      allocated_produced_qty: 1500,
      allocated_accepted_qty: 1500,
      allocated_rejected_qty: 0,
      allocated_rework_qty: 0,
      allocated_rework_accepted_qty: 0,
      payable_units: 1500,
      unit_rate: 5,
      earned_piece_amount: 7500,
      incentive_amount: 0,
      is_locked: false,
    };

    const res = calculateWorkerPayrollLine({
      employee_id: 'emp-1',
      wage_assignments: [assignment],
      attendances: makeDailyAttendances(26),
      allocations: [alloc],
      incentive_awards: [],
      ledger_entries: [],
      settings: BASE_SETTINGS,
      period_start: '2026-11-01',
      period_end: '2026-11-30',
    });

    expect(res.daily_wage_earnings).toBe(10400);
    expect(res.piece_rate_earnings).toBe(7500);
    expect(res.gross_earnings).toBe(17900);
    expect(res.net_payable).toBe(17900);
  });

  it('respects rate-card precedence (Order+Style+Op+Grade > Style+Op > Unit+Op)', () => {
    const cards: GarmentPieceRateCard[] = [
      {
        id: 'rc-generic',
        organization_id: ORG_ID,
        operation_id: 'op-collar',
        rate_per_unit: 10,
        rework_rate_per_unit: 0,
        rejected_rate_per_unit: 0,
        overtime_multiplier: 1,
        currency: 'INR',
        effective_from: '2026-11-01',
        version: 1,
        is_active: true,
      },
      {
        id: 'rc-order-grade',
        organization_id: ORG_ID,
        order_id: 'ord-1',
        style_id: 'sty-1',
        operation_id: 'op-collar',
        skill_grade: 'GRADE_A',
        rate_per_unit: 15.5,
        rework_rate_per_unit: 10,
        rejected_rate_per_unit: 0,
        overtime_multiplier: 1,
        currency: 'INR',
        effective_from: '2026-11-01',
        version: 1,
        is_active: true,
      },
    ];

    const matched = resolveApplicableRateCard(cards, {
      organization_id: ORG_ID,
      work_date: '2026-11-10',
      operation_id: 'op-collar',
      order_id: 'ord-1',
      style_id: 'sty-1',
      skill_grade: 'GRADE_A',
    });

    expect(matched.card?.id).toBe('rc-order-grade');
    expect(matched.unitRate).toBe(15.5);
  });

  it('pays zero for pending QC or unaccepted rework under ACCEPTED_ONLY, and pays once rework_accepted_qty is QC verified', () => {
    const pendingRes = computeEntryPieceEarnings({
      accepted_qty: 100,
      rejected_qty: 10,
      rework_qty: 15,
      rework_accepted_qty: 0,
      qc_status: 'PENDING',
      unitRate: 12,
      settings: BASE_SETTINGS,
    });
    expect(pendingRes.payableUnits).toBe(0);
    expect(pendingRes.pieceAmount).toBe(0);

    const verifiedRes = computeEntryPieceEarnings({
      accepted_qty: 100,
      rejected_qty: 10,
      rework_qty: 15,
      rework_accepted_qty: 12,
      qc_status: 'QC_VERIFIED',
      unitRate: 12,
      reworkCardRate: 12,
      settings: BASE_SETTINGS,
    });
    expect(verifiedRes.payableUnits).toBe(112);
    expect(verifiedRes.pieceAmount).toBe(1344);
  });

  it('splits Shared Line output across workers with penny-exact remainder reconciliation', () => {
    const entry: GarmentProductionEntry = {
      id: 'pe-shared',
      organization_id: ORG_ID,
      work_date: '2026-11-10',
      operation_id: 'op-stitch',
      allocation_mode: 'SHARED_LINE',
      shared_split_method: 'EQUAL',
      produced_qty: 100,
      accepted_qty: 100,
      rejected_qty: 0,
      rework_qty: 0,
      rework_accepted_qty: 0,
      pending_qc_qty: 0,
      applied_unit_rate: 10,
      applied_rework_rate: 0,
      payable_units: 100,
      computed_piece_amount: 1000,
      qc_status: 'QC_VERIFIED',
      approval_status: 'HR_APPROVED',
    };

    const allocs = distributeProductionEntryToAllocations({
      entry,
      splitMethod: 'EQUAL',
      participants: [
        { employee_id: 'e1', worked_hours: 8, skill_weightage: 1 },
        { employee_id: 'e2', worked_hours: 8, skill_weightage: 1 },
        { employee_id: 'e3', worked_hours: 8, skill_weightage: 1 },
      ],
    });

    expect(allocs).toHaveLength(3);
    const totalAmount = allocs.reduce((s, a) => s + a.earned_piece_amount, 0);
    const totalUnits = allocs.reduce((s, a) => s + a.payable_units, 0);
    expect(Math.round(totalAmount * 100) / 100).toBe(1000);
    expect(Math.round(totalUnits * 100) / 100).toBe(100);
  });

  it('caps advance/loan recoveries at max_deduction_pct_of_gross and applies mid-cycle wage changes', () => {
    const assignments: GarmentWageAssignment[] = [
      {
        id: 'wa-early',
        organization_id: ORG_ID,
        employee_id: 'emp-1',
        wage_method: 'DAILY',
        payment_frequency: 'WEEKLY',
        daily_rate: 500,
        hourly_rate: 0,
        hybrid_base_daily_rate: 0,
        hybrid_base_hourly_rate: 0,
        default_piece_rate: 0,
        overtime_hourly_rate: 0,
        minimum_daily_guarantee: 0,
        incentive_eligible: true,
        custom_rules_json: {},
        effective_from: '2026-11-01',
        effective_to: '2026-11-05',
        version: 1,
        is_active: true,
      },
      {
        id: 'wa-late',
        organization_id: ORG_ID,
        employee_id: 'emp-1',
        wage_method: 'DAILY',
        payment_frequency: 'WEEKLY',
        daily_rate: 600,
        hourly_rate: 0,
        hybrid_base_daily_rate: 0,
        hybrid_base_hourly_rate: 0,
        default_piece_rate: 0,
        overtime_hourly_rate: 0,
        minimum_daily_guarantee: 0,
        incentive_eligible: true,
        custom_rules_json: {},
        effective_from: '2026-11-06',
        version: 2,
        is_active: true,
      },
    ];

    const res = calculateWorkerPayrollLine({
      employee_id: 'emp-1',
      wage_assignments: assignments,
      attendances: makeDailyAttendances(10), // days 1-5 @ 500 = 2500; days 6-10 @ 600 = 3000 => 5500
      allocations: [],
      incentive_awards: [],
      ledger_entries: [
        {
          id: 'adv-1',
          organization_id: ORG_ID,
          employee_id: 'emp-1',
          entry_date: '2026-11-03',
          entry_type: 'ADVANCE_GIVEN',
          amount: 4000,
          recovered_amount: 0,
          balance_remaining: 4000,
          status: 'APPROVED',
        },
      ],
      settings: BASE_SETTINGS, // max_deduction_pct_of_gross = 50 -> max deduction 2750
      period_start: '2026-11-01',
      period_end: '2026-11-10',
    });

    expect(res.daily_wage_earnings).toBe(5500);
    expect(res.advance_recovery).toBe(2750);
    expect(res.net_payable).toBe(2750);
    expect(res.calculation_trace_json.deduction_cap_applied.deferred_amount).toBe(1250);
  });

  it('splits shared-line output proportionally using BY_SKILL_WEIGHT and BY_HOURS', () => {
    const entry: GarmentProductionEntry = {
      id: 'pe-shared-2',
      organization_id: ORG_ID,
      work_date: '2026-11-10',
      operation_id: 'op-1',
      allocation_mode: 'SHARED_LINE',
      shared_split_method: 'BY_SKILL_WEIGHT',
      produced_qty: 100,
      accepted_qty: 100,
      rejected_qty: 0,
      rework_qty: 0,
      rework_accepted_qty: 0,
      pending_qc_qty: 0,
      applied_unit_rate: 10,
      applied_rework_rate: 0,
      payable_units: 100,
      computed_piece_amount: 1000,
      qc_status: 'QC_VERIFIED',
      approval_status: 'SUBMITTED',
    };

    const byWeight = distributeProductionEntryToAllocations({
      entry,
      splitMethod: 'BY_SKILL_WEIGHT',
      participants: [
        { employee_id: 'master', worked_hours: 8, skill_weightage: 2.0 },
        { employee_id: 'helper', worked_hours: 8, skill_weightage: 1.0 },
      ],
    });
    expect(byWeight).toHaveLength(2);
    expect(Math.round((byWeight[0].earned_piece_amount + byWeight[1].earned_piece_amount) * 100) / 100).toBe(1000);
    expect(byWeight[0].earned_piece_amount).toBeGreaterThan(byWeight[1].earned_piece_amount);

    const byHours = distributeProductionEntryToAllocations({
      entry,
      splitMethod: 'BY_HOURS',
      participants: [
        { employee_id: 'full', worked_hours: 8, skill_weightage: 1 },
        { employee_id: 'half', worked_hours: 4, skill_weightage: 1 },
      ],
    });
    expect(byHours[0].share_ratio).toBeCloseTo(2 / 3, 2);
    expect(byHours[1].share_ratio).toBeCloseTo(1 / 3, 2);
  });
});
