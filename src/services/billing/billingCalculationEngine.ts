// src/services/billing/billingCalculationEngine.ts
// ============================================================
// Joy PeopleHR — SaaS Financial & Dynamic Indian GST Calculation Engine
// ============================================================

export type SupplyType = 'INTRASTATE' | 'INTERSTATE' | 'EXPORT' | 'SEZ';

export interface TaxConfiguration {
  supplierStateCode: string; // e.g. '33' (Tamil Nadu)
  supplierStateName: string;
  customerStateCode: string; // e.g. '33' (Intrastate) or '27' (Interstate)
  customerStateName: string;
  gstRatePct: number; // e.g. 18
  cessRatePct?: number; // e.g. 0
  isReverseCharge?: boolean;
}

export interface TaxCalculationResult {
  taxableAmount: number;
  supplyType: SupplyType;
  gstRatePct: number;
  cgstRatePct: number;
  cgstAmount: number;
  sgstRatePct: number;
  sgstAmount: number;
  igstRatePct: number;
  igstAmount: number;
  cessAmount: number;
  totalTaxAmount: number;
  grandTotal: number;
}

export interface InvoiceItemSpec {
  description: string;
  sacHsn: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  discountAmount?: number;
}

export interface ItemCalculationResult extends InvoiceItemSpec {
  grossAmount: number;
  appliedDiscount: number;
  taxableAmount: number;
}

export interface BillingPlanInput {
  id: string;
  name: string;
  code: string;
  monthlyPrice: number;
  annualPrice: number;
  includedSeats: number;
  maximumSeats: number;
  additionalSeatPrice?: number;
}

export interface BillingCalculationInput {
  plan: BillingPlanInput;
  seatCount: number;
  billingInterval: 'Monthly' | 'Quarterly' | 'Annual';
  couponDiscountPercent?: number;
  customDiscountAmount?: number;
}

export interface BillingCalculationOutput {
  basePrice: number;
  basePlanPrice: number;
  extraSeatsPrice: number;
  additionalSeatsPrice: number;
  subtotal: number;
  discountAmount: number;
  totalDiscount: number;
  discountedSubtotal: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalDue: number;
  totalAmount: number;
  effectiveMonthlyRate: number;
  taxRatePercent: number;
}

export const billingCalculationEngine = {
  /**
   * Safe decimal arithmetic rounding to 2 decimal places.
   */
  round2(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  },

  /**
   * Determine whether transaction is Intrastate or Interstate.
   */
  determineSupplyType(supplierStateCode: string, customerStateCode: string): SupplyType {
    const sCode = (supplierStateCode || '33').trim();
    const cCode = (customerStateCode || '33').trim();
    return sCode === cCode ? 'INTRASTATE' : 'INTERSTATE';
  },

  /**
   * High-level plan & seat billing calculation engine.
   */
  calculateBilling(input: BillingCalculationInput): BillingCalculationOutput {
    const isAnnual = input.billingInterval === 'Annual';
    const isQuarterly = input.billingInterval === 'Quarterly';

    let baseRate = isAnnual
      ? input.plan.annualPrice
      : isQuarterly
      ? input.plan.monthlyPrice * 3
      : input.plan.monthlyPrice;

    // Additional seats calculation
    let extraSeats = Math.max(0, input.seatCount - input.plan.includedSeats);
    let pricePerSeat = Math.round(input.plan.monthlyPrice / input.plan.includedSeats);
    let extraSeatsCost = isAnnual ? extraSeats * pricePerSeat * 10 : extraSeats * pricePerSeat;

    const subtotal = this.round2(baseRate + extraSeatsCost);

    // Discounts
    let discountAmount = 0;
    if (input.couponDiscountPercent && input.couponDiscountPercent > 0) {
      discountAmount += this.round2((subtotal * input.couponDiscountPercent) / 100);
    }
    if (input.customDiscountAmount && input.customDiscountAmount > 0) {
      discountAmount += this.round2(input.customDiscountAmount);
    }

    const discountedSubtotal = Math.max(0, this.round2(subtotal - discountAmount));

    // Default 18% GST (Intrastate default TN)
    const taxRatePercent = 18;
    const cgstAmount = this.round2((discountedSubtotal * 9) / 100);
    const sgstAmount = this.round2((discountedSubtotal * 9) / 100);
    const taxAmount = this.round2(cgstAmount + sgstAmount);
    const totalDue = this.round2(discountedSubtotal + taxAmount);

    const effectiveMonthlyRate = isAnnual ? Math.round(discountedSubtotal / 12) : discountedSubtotal;

    return {
      basePrice: baseRate,
      basePlanPrice: baseRate,
      extraSeatsPrice: extraSeatsCost,
      additionalSeatsPrice: extraSeatsCost,
      subtotal,
      discountAmount,
      totalDiscount: discountAmount,
      discountedSubtotal,
      taxAmount,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      totalDue,
      totalAmount: totalDue,
      effectiveMonthlyRate,
      taxRatePercent,
    };
  },

  /**
   * Calculate line item gross, discount, and taxable amount.
   */
  calculateLineItem(item: InvoiceItemSpec): ItemCalculationResult {
    const gross = this.round2(item.quantity * item.unitPrice);
    let discount = 0;

    if (item.discountAmount !== undefined && item.discountAmount > 0) {
      discount = Math.min(gross, this.round2(item.discountAmount));
    } else if (item.discountPct !== undefined && item.discountPct > 0) {
      discount = this.round2((gross * item.discountPct) / 100);
    }

    const taxable = Math.max(0, this.round2(gross - discount));

    return {
      ...item,
      grossAmount: gross,
      appliedDiscount: discount,
      taxableAmount: taxable,
    };
  },

  /**
   * Calculate exact Indian GST breakdown for taxable amount.
   */
  calculateTaxes(taxableAmount: number, config: TaxConfiguration): TaxCalculationResult {
    const taxable = this.round2(taxableAmount);
    const supplyType = this.determineSupplyType(config.supplierStateCode, config.customerStateCode);
    const totalGstRate = config.gstRatePct || 18;

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;
    let cessAmount = 0;

    if (config.isReverseCharge) {
      return {
        taxableAmount: taxable,
        supplyType,
        gstRatePct: totalGstRate,
        cgstRatePct: 0,
        cgstAmount: 0,
        sgstRatePct: 0,
        sgstAmount: 0,
        igstRatePct: 0,
        igstAmount: 0,
        cessAmount: 0,
        totalTaxAmount: 0,
        grandTotal: taxable,
      };
    }

    if (supplyType === 'INTRASTATE') {
      cgstRate = totalGstRate / 2;
      sgstRate = totalGstRate / 2;
      cgstAmount = this.round2((taxable * cgstRate) / 100);
      sgstAmount = this.round2((taxable * sgstRate) / 100);
    } else {
      igstRate = totalGstRate;
      igstAmount = this.round2((taxable * igstRate) / 100);
    }

    if (config.cessRatePct && config.cessRatePct > 0) {
      cessAmount = this.round2((taxable * config.cessRatePct) / 100);
    }

    const totalTax = this.round2(cgstAmount + sgstAmount + igstAmount + cessAmount);
    const grandTotal = this.round2(taxable + totalTax);

    return {
      taxableAmount: taxable,
      supplyType,
      gstRatePct: totalGstRate,
      cgstRatePct: cgstRate,
      cgstAmount,
      sgstRatePct: sgstRate,
      sgstAmount,
      igstRatePct: igstRate,
      igstAmount,
      cessAmount,
      totalTaxAmount: totalTax,
      grandTotal,
    };
  },

  /**
   * Currency formatter with standard Indian Numbering system (₹ Lakhs/Crores).
   */
  formatINR(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  },
};
