// ============================================================================
// JOY PeopleHR — Garment & Clothing Workforce Wage & Piece-Rate Calculator
// Pure deterministic engine supporting:
//  - Daily, Hourly, Piece-Rate, and Hybrid wage methods
//  - Individual Operation vs Shared Production-Line allocation (penny-exact split)
//  - Configurable QC rework & rejection payment rules (zero hardcoded defaults)
//  - Overtime, Incentives, Minimum Wage Top-up, and Capped Recoveries
// ============================================================================

import {
  GarmentAdvanceLedgerEntry,
  GarmentFloorAttendance,
  GarmentIncentiveAward,
  GarmentOrgSettings,
  GarmentPieceRateCard,
  GarmentProductionAllocation,
  GarmentProductionEntry,
  GarmentWageAssignment,
  GarmentWorkerProfile,
  SharedSplitMethod,
} from '../../types/garment';

export function round2(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

export function round4(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 10000) / 10000;
}

export interface RateResolutionContext {
  organization_id: string;
  work_date: string;
  operation_id: string;
  order_id?: string | null;
  style_id?: string | null;
  production_unit_id?: string | null;
  work_location_id?: string | null;
  skill_grade?: string | null;
  fallback_piece_rate?: number;
}

/**
 * Resolves the highest-precedence active effective-dated rate card for a date & context.
 */
export function resolveApplicableRateCard(
  cards: GarmentPieceRateCard[],
  ctx: RateResolutionContext
): {
  card: GarmentPieceRateCard | null;
  unitRate: number;
  reworkRate: number;
  rejectedRate: number;
} {
  const validCards = cards.filter((c) => {
    if (!c.is_active) return false;
    if (c.operation_id !== ctx.operation_id) return false;
    if (c.effective_from > ctx.work_date) return false;
    if (c.effective_to && c.effective_to < ctx.work_date) return false;
    if (c.order_id && c.order_id !== ctx.order_id) return false;
    if (c.style_id && c.style_id !== ctx.style_id) return false;
    if (c.production_unit_id && c.production_unit_id !== ctx.production_unit_id) return false;
    if (c.work_location_id && c.work_location_id !== ctx.work_location_id) return false;
    if (c.skill_grade && ctx.skill_grade && c.skill_grade !== ctx.skill_grade) return false;
    if (c.skill_grade && !ctx.skill_grade) return false;
    return true;
  });

  if (validCards.length === 0) {
    const fallback = Number(ctx.fallback_piece_rate || 0);
    return { card: null, unitRate: fallback, reworkRate: 0, rejectedRate: 0 };
  }

  const scored = validCards
    .map((c) => {
      let score = 0;
      if (c.order_id && c.order_id === ctx.order_id) score += 16;
      if (c.style_id && c.style_id === ctx.style_id) score += 8;
      if (c.production_unit_id && c.production_unit_id === ctx.production_unit_id) score += 4;
      if (c.work_location_id && c.work_location_id === ctx.work_location_id) score += 2;
      if (c.skill_grade && c.skill_grade === ctx.skill_grade) score += 1;
      return { card: c, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.card.effective_from !== a.card.effective_from) {
        return b.card.effective_from.localeCompare(a.card.effective_from);
      }
      return (b.card.version || 1) - (a.card.version || 1);
    });

  const best = scored[0].card;
  return {
    card: best,
    unitRate: Number(best.rate_per_unit || 0),
    reworkRate: Number(best.rework_rate_per_unit || 0),
    rejectedRate: Number(best.rejected_rate_per_unit || 0),
  };
}

/**
 * Computes payable piece units & rupee amount based on org QC/rework/rejection settings.
 */
export function computeEntryPieceEarnings(params: {
  accepted_qty: number;
  rejected_qty: number;
  rework_qty: number;
  rework_accepted_qty: number;
  qc_status: 'PENDING' | 'QC_VERIFIED' | 'REJECTED_ENTRY';
  unitRate: number;
  reworkCardRate?: number;
  rejectedCardRate?: number;
  settings: Pick<
    GarmentOrgSettings,
    | 'default_rework_payment_rule'
    | 'rework_rate_percentage'
    | 'rejected_payment_rule'
    | 'rejected_rate_percentage'
    | 'require_qc_before_piece_pay'
  >;
}): { payableUnits: number; pieceAmount: number } {
  const {
    accepted_qty,
    rejected_qty,
    rework_qty,
    rework_accepted_qty,
    qc_status,
    unitRate,
    reworkCardRate = 0,
    rejectedCardRate = 0,
    settings,
  } = params;

  if (qc_status === 'REJECTED_ENTRY') {
    return { payableUnits: 0, pieceAmount: 0 };
  }
  if (settings.require_qc_before_piece_pay && qc_status !== 'QC_VERIFIED') {
    return { payableUnits: 0, pieceAmount: 0 };
  }

  let payableUnits = Number(accepted_qty || 0);
  let amount = payableUnits * unitRate;

  const effectiveReworkRate =
    reworkCardRate > 0
      ? reworkCardRate
      : unitRate * (Number(settings.rework_rate_percentage || 0) / 100);

  if (settings.default_rework_payment_rule === 'ACCEPTED_ONLY') {
    // Rework pieces become payable once verified as rework_accepted_qty
    const acceptedRework = Number(rework_accepted_qty || 0);
    if (acceptedRework > 0) {
      payableUnits += acceptedRework;
      amount += acceptedRework * (reworkCardRate > 0 ? reworkCardRate : unitRate);
    }
  } else if (settings.default_rework_payment_rule === 'ACCEPTED_PLUS_REWORK_ACCEPTED') {
    const acceptedRework = Number(rework_accepted_qty || 0);
    if (acceptedRework > 0) {
      payableUnits += acceptedRework;
      amount += acceptedRework * (effectiveReworkRate > 0 ? effectiveReworkRate : unitRate);
    }
  } else if (settings.default_rework_payment_rule === 'PROPORTIONAL_REWORK') {
    const reworkTotal = Number(rework_qty || 0);
    if (reworkTotal > 0 && effectiveReworkRate > 0) {
      const ratio = effectiveReworkRate / (unitRate || 1);
      payableUnits += round2(reworkTotal * ratio);
      amount += reworkTotal * effectiveReworkRate;
    }
  }

  if (settings.rejected_payment_rule === 'PARTIAL_OVERRIDE' && Number(rejected_qty || 0) > 0) {
    const rejRate =
      rejectedCardRate > 0
        ? rejectedCardRate
        : unitRate * (Number(settings.rejected_rate_percentage || 0) / 100);
    if (rejRate > 0) {
      amount += Number(rejected_qty) * rejRate;
    }
  }

  return {
    payableUnits: round2(payableUnits),
    pieceAmount: round2(amount),
  };
}

export interface LineTeamMemberWeight {
  employee_id: string;
  worked_hours: number;
  skill_weightage: number;
}

/**
 * Splits a production entry into per-worker allocations (1 for INDIVIDUAL, N for SHARED_LINE),
 * reconciling rounding differences so sum(allocations) === total exactly.
 */
export function distributeProductionEntryToAllocations(params: {
  entry: GarmentProductionEntry;
  participants: LineTeamMemberWeight[];
  splitMethod: SharedSplitMethod;
}): Omit<GarmentProductionAllocation, 'id' | 'created_at' | 'updated_at'>[] {
  const { entry, participants, splitMethod } = params;

  if (entry.allocation_mode === 'INDIVIDUAL' || participants.length <= 1) {
    const empId = entry.employee_id || participants[0]?.employee_id;
    if (!empId) return [];
    return [
      {
        organization_id: entry.organization_id,
        production_entry_id: entry.id,
        work_date: entry.work_date,
        employee_id: empId,
        order_id: entry.order_id,
        style_id: entry.style_id,
        operation_id: entry.operation_id,
        share_ratio: 1,
        allocated_produced_qty: round2(entry.produced_qty),
        allocated_accepted_qty: round2(entry.accepted_qty),
        allocated_rejected_qty: round2(entry.rejected_qty),
        allocated_rework_qty: round2(entry.rework_qty),
        allocated_rework_accepted_qty: round2(entry.rework_accepted_qty),
        payable_units: round2(entry.payable_units),
        unit_rate: Number(entry.applied_unit_rate || 0),
        earned_piece_amount: round2(entry.computed_piece_amount),
        incentive_amount: 0,
        is_locked: entry.approval_status === 'LOCKED',
        payroll_cycle_id: null,
      },
    ];
  }

  const rawWeights = participants.map((p) => {
    if (splitMethod === 'BY_HOURS') return Math.max(0.01, Number(p.worked_hours || 0));
    if (splitMethod === 'BY_SKILL_WEIGHT') {
      return Math.max(0.01, Number(p.skill_weightage || 1) * Math.max(0.5, Number(p.worked_hours || 8)));
    }
    return 1;
  });
  const totalWeight = rawWeights.reduce((sum, w) => sum + w, 0) || 1;
  const ratios = rawWeights.map((w) => w / totalWeight);

  const allocateMetric = (total: number): number[] => {
    const exact = ratios.map((r) => round2(total * r));
    const diff = round2(total - exact.reduce((s, v) => s + v, 0));
    if (diff !== 0 && exact.length > 0) {
      exact[0] = round2(exact[0] + diff);
    }
    return exact;
  };

  const producedSplits = allocateMetric(entry.produced_qty);
  const acceptedSplits = allocateMetric(entry.accepted_qty);
  const rejectedSplits = allocateMetric(entry.rejected_qty);
  const reworkSplits = allocateMetric(entry.rework_qty);
  const reworkAccSplits = allocateMetric(entry.rework_accepted_qty);
  const payableSplits = allocateMetric(entry.payable_units);
  const amountSplits = allocateMetric(entry.computed_piece_amount);

  return participants.map((p, idx) => ({
    organization_id: entry.organization_id,
    production_entry_id: entry.id,
    work_date: entry.work_date,
    employee_id: p.employee_id,
    order_id: entry.order_id,
    style_id: entry.style_id,
    operation_id: entry.operation_id,
    share_ratio: round4(ratios[idx]),
    allocated_produced_qty: producedSplits[idx],
    allocated_accepted_qty: acceptedSplits[idx],
    allocated_rejected_qty: rejectedSplits[idx],
    allocated_rework_qty: reworkSplits[idx],
    allocated_rework_accepted_qty: reworkAccSplits[idx],
    payable_units: payableSplits[idx],
    unit_rate: Number(entry.applied_unit_rate || 0),
    earned_piece_amount: amountSplits[idx],
    incentive_amount: 0,
    is_locked: entry.approval_status === 'LOCKED',
    payroll_cycle_id: null,
  }));
}

export interface WorkerPayrollCalculationInput {
  employee_id: string;
  worker_profile?: GarmentWorkerProfile | null;
  wage_assignments: GarmentWageAssignment[];
  attendances: GarmentFloorAttendance[];
  allocations: GarmentProductionAllocation[];
  incentive_awards: GarmentIncentiveAward[];
  ledger_entries: GarmentAdvanceLedgerEntry[];
  settings: GarmentOrgSettings;
  statutory_pf?: number;
  statutory_esi?: number;
  statutory_pt?: number;
  period_start: string;
  period_end: string;
}

export interface CalculatedWorkerPayrollLine {
  employee_id: string;
  worker_category: string;
  wage_method_snapshot: string;
  payable_days: number;
  worked_hours: number;
  overtime_hours: number;
  produced_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  rework_qty: number;
  rework_accepted_qty: number;
  daily_wage_earnings: number;
  hourly_wage_earnings: number;
  piece_rate_earnings: number;
  overtime_earnings: number;
  incentive_earnings: number;
  other_earnings: number;
  minimum_wage_topup: number;
  gross_earnings: number;
  advance_recovery: number;
  loan_deduction: number;
  statutory_pf: number;
  statutory_esi: number;
  statutory_pt: number;
  canteen_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_payable: number;
  calculation_trace_json: Record<string, any>;
}

/**
 * Selects the wage assignment effective on a given YYYY-MM-DD work date.
 */
export function resolveWageAssignmentForDate(
  assignments: GarmentWageAssignment[],
  dateStr: string,
  fallbackMethod: 'DAILY' | 'HOURLY' | 'PIECE_RATE' | 'HYBRID' = 'DAILY'
): GarmentWageAssignment | null {
  const valid = assignments
    .filter(
      (a) =>
        a.is_active &&
        a.effective_from <= dateStr &&
        (!a.effective_to || a.effective_to >= dateStr)
    )
    .sort((a, b) => {
      if (b.effective_from !== a.effective_from) {
        return b.effective_from.localeCompare(a.effective_from);
      }
      return (b.version || 1) - (a.version || 1);
    });
  if (valid.length > 0) return valid[0];
  return assignments.find((a) => a.is_active) || null;
}

/**
 * Authoritative payroll calculation per garment worker for a cycle window.
 * Supports multi-method mid-cycle transitions (day-by-day rate lookup for Daily/Hourly/OT)
 * plus verified piece-rate allocations, incentives, minimum-wage protection, and capped recoveries.
 */
export function calculateWorkerPayrollLine(
  input: WorkerPayrollCalculationInput
): CalculatedWorkerPayrollLine {
  const {
    employee_id,
    worker_profile,
    wage_assignments,
    attendances,
    allocations,
    incentive_awards,
    ledger_entries,
    settings,
    statutory_pf = 0,
    statutory_esi = 0,
    statutory_pt = 0,
    period_end,
  } = input;

  const endAssignment = resolveWageAssignmentForDate(
    wage_assignments,
    period_end,
    worker_profile?.default_wage_method || 'DAILY'
  );
  const primaryMethod =
    endAssignment?.wage_method || worker_profile?.default_wage_method || 'DAILY';

  let payableDays = 0;
  let workedHours = 0;
  let overtimeHours = 0;
  let dailyEarnings = 0;
  let hourlyEarnings = 0;
  let overtimeEarnings = 0;
  let minDailyGuaranteeRequired = 0;

  const dayLogs: any[] = [];

  for (const att of attendances) {
    const dayAssignment = resolveWageAssignmentForDate(wage_assignments, att.work_date, primaryMethod);
    const method = dayAssignment?.wage_method || primaryMethod;
    const payFactor = Number(att.payable_day_factor ?? (att.status === 'PRESENT' ? 1 : att.status === 'HALF_DAY' ? 0.5 : 0));
    const hrs = Number(att.worked_hours || 0);
    const otHrs = Number(att.overtime_hours || 0);

    payableDays += payFactor;
    workedHours += hrs;
    overtimeHours += otHrs;

    let dayDailyPay = 0;
    let dayHourlyPay = 0;
    let dayOtPay = 0;

    if (dayAssignment) {
      if (method === 'DAILY') {
        dayDailyPay = round2(payFactor * Number(dayAssignment.daily_rate || 0));
        if (otHrs > 0) {
          const otRate =
            Number(dayAssignment.overtime_hourly_rate || 0) > 0
              ? Number(dayAssignment.overtime_hourly_rate)
              : (Number(dayAssignment.daily_rate || 0) / Math.max(1, Number(settings.standard_hours_per_day || 8))) *
                Number(settings.overtime_multiplier_daily || 1.5);
          dayOtPay = round2(otHrs * otRate);
        }
      } else if (method === 'HOURLY') {
        dayHourlyPay = round2(hrs * Number(dayAssignment.hourly_rate || 0));
        if (otHrs > 0) {
          const otRate =
            Number(dayAssignment.overtime_hourly_rate || 0) > 0
              ? Number(dayAssignment.overtime_hourly_rate)
              : Number(dayAssignment.hourly_rate || 0) * Number(settings.overtime_multiplier_hourly || 1.5);
          dayOtPay = round2(otHrs * otRate);
        }
      } else if (method === 'HYBRID') {
        dayDailyPay = round2(payFactor * Number(dayAssignment.hybrid_base_daily_rate || 0));
        dayHourlyPay = round2(hrs * Number(dayAssignment.hybrid_base_hourly_rate || 0));
        if (otHrs > 0 && Number(dayAssignment.overtime_hourly_rate || 0) > 0) {
          dayOtPay = round2(otHrs * Number(dayAssignment.overtime_hourly_rate));
        }
      } else if (method === 'PIECE_RATE') {
        if (otHrs > 0 && settings.overtime_applies_to_piece_rate && Number(dayAssignment.overtime_hourly_rate || 0) > 0) {
          dayOtPay = round2(otHrs * Number(dayAssignment.overtime_hourly_rate));
        }
      }

      const dayGuarantee = Math.max(
        Number(dayAssignment.minimum_daily_guarantee || 0),
        settings.enforce_minimum_wage_check ? Number(settings.statutory_minimum_daily_wage || 0) : 0
      );
      minDailyGuaranteeRequired += round2(payFactor * dayGuarantee);
    }

    dailyEarnings = round2(dailyEarnings + dayDailyPay);
    hourlyEarnings = round2(hourlyEarnings + dayHourlyPay);
    overtimeEarnings = round2(overtimeEarnings + dayOtPay);

    dayLogs.push({
      date: att.work_date,
      status: att.status,
      method,
      pay_factor: payFactor,
      worked_hours: hrs,
      ot_hours: otHrs,
      daily_pay: dayDailyPay,
      hourly_pay: dayHourlyPay,
      ot_pay: dayOtPay,
    });
  }

  // Piece-rate aggregation
  let producedQty = 0;
  let acceptedQty = 0;
  let rejectedQty = 0;
  let reworkQty = 0;
  let reworkAcceptedQty = 0;
  let pieceRateEarnings = 0;

  for (const alloc of allocations) {
    producedQty += Number(alloc.allocated_produced_qty || 0);
    acceptedQty += Number(alloc.allocated_accepted_qty || 0);
    rejectedQty += Number(alloc.allocated_rejected_qty || 0);
    reworkQty += Number(alloc.allocated_rework_qty || 0);
    reworkAcceptedQty += Number(alloc.allocated_rework_accepted_qty || 0);
    pieceRateEarnings = round2(pieceRateEarnings + Number(alloc.earned_piece_amount || 0));
  }

  // Incentives
  const incentiveEarnings = round2(
    incentive_awards
      .filter((a) => a.status === 'APPROVED' || a.status === 'PAID')
      .reduce((s, a) => s + Number(a.amount || 0), 0)
  );

  // Other earnings from ledger
  const otherEarnings = round2(
    ledger_entries
      .filter((l) => l.status === 'APPROVED' && l.entry_type === 'OTHER_EARNING')
      .reduce((s, l) => s + Number(l.amount || 0), 0)
  );

  const preTopupCore = round2(dailyEarnings + hourlyEarnings + pieceRateEarnings);
  const minimumWageTopup =
    minDailyGuaranteeRequired > preTopupCore ? round2(minDailyGuaranteeRequired - preTopupCore) : 0;

  const grossEarnings = round2(
    dailyEarnings +
      hourlyEarnings +
      pieceRateEarnings +
      overtimeEarnings +
      incentiveEarnings +
      otherEarnings +
      minimumWageTopup
  );

  // Deductions & Advance Recoveries (with ceiling check)
  const approvedEntries = ledger_entries.filter((l) => l.status === 'APPROVED');
  const rawAdvanceRecovery = round2(
    approvedEntries
      .filter((l) => l.entry_type === 'ADVANCE_GIVEN' || l.entry_type === 'ADVANCE_RECOVERY')
      .reduce((s, l) => s + Number(l.balance_remaining ?? l.amount ?? 0), 0)
  );
  const rawLoanDeduction = round2(
    approvedEntries
      .filter((l) => l.entry_type === 'LOAN_RECOVERY')
      .reduce((s, l) => s + Number(l.balance_remaining ?? l.amount ?? 0), 0)
  );
  const rawCanteenDeduction = round2(
    approvedEntries
      .filter((l) => l.entry_type === 'CANTEEN' || l.entry_type === 'HOSTEL')
      .reduce((s, l) => s + Number(l.balance_remaining ?? l.amount ?? 0), 0)
  );
  const rawOtherDeduction = round2(
    approvedEntries
      .filter((l) => l.entry_type === 'DAMAGE_RECOVERY' || l.entry_type === 'OTHER_DEDUCTION')
      .reduce((s, l) => s + Number(l.balance_remaining ?? l.amount ?? 0), 0)
  );

  const maxAllowedDeduction = round2(
    grossEarnings * (Math.min(100, Math.max(0, Number(settings.max_deduction_pct_of_gross || 50))) / 100)
  );

  let remainingCap = maxAllowedDeduction;
  const takeCapped = (want: number): number => {
    const applied = Math.min(round2(want), round2(Math.max(0, remainingCap)));
    remainingCap = round2(remainingCap - applied);
    return round2(applied);
  };

  // Priority: Statutory -> Advance -> Loan -> Canteen -> Other
  const appliedPf = takeCapped(statutory_pf);
  const appliedEsi = takeCapped(statutory_esi);
  const appliedPt = takeCapped(statutory_pt);
  const appliedAdvance = takeCapped(rawAdvanceRecovery);
  const appliedLoan = takeCapped(rawLoanDeduction);
  const appliedCanteen = takeCapped(rawCanteenDeduction);
  const appliedOther = takeCapped(rawOtherDeduction);

  const totalDeductions = round2(
    appliedPf + appliedEsi + appliedPt + appliedAdvance + appliedLoan + appliedCanteen + appliedOther
  );
  const netPayable = round2(Math.max(0, grossEarnings - totalDeductions));

  return {
    employee_id,
    worker_category: worker_profile?.worker_category || 'PERMANENT',
    wage_method_snapshot: primaryMethod,
    payable_days: round2(payableDays),
    worked_hours: round2(workedHours),
    overtime_hours: round2(overtimeHours),
    produced_qty: round2(producedQty),
    accepted_qty: round2(acceptedQty),
    rejected_qty: round2(rejectedQty),
    rework_qty: round2(reworkQty),
    rework_accepted_qty: round2(reworkAcceptedQty),
    daily_wage_earnings: dailyEarnings,
    hourly_wage_earnings: hourlyEarnings,
    piece_rate_earnings: pieceRateEarnings,
    overtime_earnings: overtimeEarnings,
    incentive_earnings: incentiveEarnings,
    other_earnings: otherEarnings,
    minimum_wage_topup: minimumWageTopup,
    gross_earnings: grossEarnings,
    advance_recovery: appliedAdvance,
    loan_deduction: appliedLoan,
    statutory_pf: appliedPf,
    statutory_esi: appliedEsi,
    statutory_pt: appliedPt,
    canteen_deduction: appliedCanteen,
    other_deductions: appliedOther,
    total_deductions: totalDeductions,
    net_payable: netPayable,
    calculation_trace_json: {
      formula: 'Gross = Daily + Hourly + Piece + Overtime + Incentives + MinWageTopup + Other; Net = Gross - Approved Deductions',
      wage_method: primaryMethod,
      rates_snapshot: endAssignment
        ? {
            daily_rate: endAssignment.daily_rate,
            hourly_rate: endAssignment.hourly_rate,
            hybrid_base_daily_rate: endAssignment.hybrid_base_daily_rate,
            hybrid_base_hourly_rate: endAssignment.hybrid_base_hourly_rate,
            default_piece_rate: endAssignment.default_piece_rate,
            overtime_hourly_rate: endAssignment.overtime_hourly_rate,
            minimum_daily_guarantee: endAssignment.minimum_daily_guarantee,
          }
        : null,
      deduction_cap_applied: {
        max_pct_of_gross: settings.max_deduction_pct_of_gross,
        max_allowed_deduction: maxAllowedDeduction,
        raw_requested: round2(
          statutory_pf +
            statutory_esi +
            statutory_pt +
            rawAdvanceRecovery +
            rawLoanDeduction +
            rawCanteenDeduction +
            rawOtherDeduction
        ),
        deferred_amount: round2(
          Math.max(
            0,
            statutory_pf +
              statutory_esi +
              statutory_pt +
              rawAdvanceRecovery +
              rawLoanDeduction +
              rawCanteenDeduction +
              rawOtherDeduction -
              totalDeductions
          )
        ),
      },
      day_logs: dayLogs,
      allocations_count: allocations.length,
    },
  };
}

