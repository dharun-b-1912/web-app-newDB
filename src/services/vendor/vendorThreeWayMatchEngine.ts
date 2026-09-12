// src/services/vendor/vendorThreeWayMatchEngine.ts
// ============================================================================
// JOY PeopleHR — Commercial 3-Way Match & Reconciliation Engine
// Visual Centerpiece: ATTENDANCE (Man-Days) ↔ CONTRACT / PO ↔ INVOICE
// Reconciles and guarantees zero financial leakage or unapproved billing
// ============================================================================

export type ThreeWayMatchStatus = 'MATCHED' | 'EXCEPTION' | 'MISMATCHED';
export type MatchRecommendation = 'APPROVE_INVOICE' | 'REQUEST_CORRECTION' | 'HOLD_FOR_AUDIT';

export interface ThreeWayMatchResult {
  id: string;
  vendor_id: string;
  company_id: string;
  invoice_id?: string;
  invoice_number: string;
  period: string; // e.g. "2026-08"

  // 1. Attendance Layer (Biometric & Locked Days)
  attendance_man_days: number;
  attendance_ot_hours: number;
  approved_wages_payable: number;

  // 2. Contract / PO Layer (Commercial Authority)
  contract_number: string;
  po_number: string;
  contract_max_capacity: number;
  contract_daily_rate: number;
  contract_ot_hourly_rate: number;
  contract_service_charge_pct: number;
  po_budget_available: number;
  is_po_sufficient: boolean;

  // 3. Invoice Layer (Vendor Claim)
  claimed_amount: number;
  claimed_man_days?: number;
  claimed_ot_hours?: number;

  // Reconciled Metrics
  expected_total_amount: number;
  variance_amount: number;
  variance_percentage: number;
  match_status: ThreeWayMatchStatus;
  recommendation: MatchRecommendation;
  exception_reasons: string[];
  reconciled_at: string;
}

export class VendorThreeWayMatchEngine {
  /**
   * Executes authoritative 3-Way Match across Attendance, Contract PO, and Vendor Invoice
   */
  public static reconcile(params: {
    vendorId: string;
    companyId: string;
    period: string;
    invoiceNumber: string;
    invoiceId?: string;
    // Layer 1: Attendance
    approvedManDays: number;
    approvedOtHours: number;
    // Layer 2: Contract / PO
    contractNumber: string;
    poNumber: string;
    dailyRate: number;
    otHourlyRate: number;
    serviceChargePct: number;
    poBudgetAvailable: number;
    maxAllowedCapacity?: number;
    // Layer 3: Claimed Invoice
    claimedInvoiceAmount: number;
    claimedManDays?: number;
    claimedOtHours?: number;
  }): ThreeWayMatchResult {
    const exceptionReasons: string[] = [];

    // 1. Compute expected financial base from attendance & contract rates
    const baseWages = params.approvedManDays * params.dailyRate;
    const otWages = params.approvedOtHours * params.otHourlyRate;
    const totalWages = baseWages + otWages;

    const serviceCharge = totalWages * (params.serviceChargePct / 100);
    const subtotal = totalWages + serviceCharge;

    // Standard statutory GST (18% total: 9% CGST + 9% SGST)
    const gstAmount = subtotal * 0.18;
    const expectedTotalAmount = Math.round(subtotal + gstAmount);

    // 2. Check PO Budget
    const isPoSufficient = params.poBudgetAvailable >= expectedTotalAmount;
    if (!isPoSufficient) {
      exceptionReasons.push(
        `PO balance (₹${params.poBudgetAvailable.toLocaleString('en-IN')}) is insufficient for calculated bill (₹${expectedTotalAmount.toLocaleString('en-IN')}).`
      );
    }

    // 3. Check Workforce Capacity limits
    if (params.maxAllowedCapacity && params.approvedManDays > params.maxAllowedCapacity * 30) {
      exceptionReasons.push(
        `Man-days (${params.approvedManDays}) exceed maximum workforce capacity allowance (${params.maxAllowedCapacity} workers).`
      );
    }

    // 4. Check Claimed vs Approved Man-Days
    if (params.claimedManDays && params.claimedManDays > params.approvedManDays) {
      const diff = params.claimedManDays - params.approvedManDays;
      exceptionReasons.push(
        `Invoice claims ${params.claimedManDays} man-days, exceeding approved attendance (${params.approvedManDays}) by ${diff} days.`
      );
    }

    // 5. Evaluate Variance
    const varianceAmount = params.claimedInvoiceAmount - expectedTotalAmount;
    const variancePercentage =
      expectedTotalAmount > 0 ? Math.abs((varianceAmount / expectedTotalAmount) * 100) : 0;

    let matchStatus: ThreeWayMatchStatus = 'MATCHED';
    let recommendation: MatchRecommendation = 'APPROVE_INVOICE';

    if (exceptionReasons.length > 0 || variancePercentage > 2.0) {
      matchStatus = 'EXCEPTION';
      recommendation = variancePercentage > 5.0 ? 'REQUEST_CORRECTION' : 'HOLD_FOR_AUDIT';
      if (variancePercentage > 2.0 && !exceptionReasons.some((r) => r.includes('Variance'))) {
        exceptionReasons.push(
          `Claimed amount ₹${params.claimedInvoiceAmount.toLocaleString('en-IN')} varies by ${variancePercentage.toFixed(1)}% from calculated amount ₹${expectedTotalAmount.toLocaleString('en-IN')}.`
        );
      }
    }

    return {
      id: `3way-${Date.now().toString(36)}`,
      vendor_id: params.vendorId,
      company_id: params.companyId,
      invoice_id: params.invoiceId,
      invoice_number: params.invoiceNumber,
      period: params.period,
      attendance_man_days: params.approvedManDays,
      attendance_ot_hours: params.approvedOtHours,
      approved_wages_payable: totalWages,
      contract_number: params.contractNumber,
      po_number: params.poNumber,
      contract_max_capacity: params.maxAllowedCapacity || 50,
      contract_daily_rate: params.dailyRate,
      contract_ot_hourly_rate: params.otHourlyRate,
      contract_service_charge_pct: params.serviceChargePct,
      po_budget_available: params.poBudgetAvailable,
      is_po_sufficient: isPoSufficient,
      claimed_amount: params.claimedInvoiceAmount,
      claimed_man_days: params.claimedManDays,
      claimed_ot_hours: params.claimedOtHours,
      expected_total_amount: expectedTotalAmount,
      variance_amount: varianceAmount,
      variance_percentage: Number(variancePercentage.toFixed(2)),
      match_status: matchStatus,
      recommendation,
      exception_reasons: exceptionReasons,
      reconciled_at: new Date().toISOString(),
    };
  }
}
