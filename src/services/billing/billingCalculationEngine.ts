// src/services/billing/billingCalculationEngine.ts
// ============================================================
// WorkForceOS — Centralized Commercial Billing Calculation Engine
// ============================================================

export interface BillingPlanSpec {
  id: string;
  name: string;
  code: string;
  monthlyPrice: number; // in INR
  annualPrice: number; // in INR
  includedSeats: number;
  maximumSeats: number;
  additionalSeatPrice?: number;
}

export interface BillingCalculationInput {
  plan: BillingPlanSpec;
  seatCount: number;
  billingInterval: 'Monthly' | 'Annual';
  couponDiscountPercent?: number; // e.g. 10 for 10%
  taxRatePercent?: number; // e.g. 18 for 18% GST (default 18.0)
  prorationDaysRemaining?: number;
  prorationTotalDays?: number;
}

export interface InvoiceLineItemCalculated {
  description: string;
  planOrFeatureCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableAmount: number;
  tax: number;
  lineTotal: number;
}

export interface BillingCalculationOutput {
  currency: 'INR' | 'USD';
  billingInterval: 'Monthly' | 'Annual';
  seatCount: number;
  basePlanPrice: number;
  additionalSeatsPrice: number;
  subtotal: number;
  annualDiscountAmount: number;
  couponDiscountAmount: number;
  totalDiscount: number;
  taxableAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  totalAmount: number;
  lineItems: InvoiceLineItemCalculated[];
  annualDiscountPercentComputed: number; // dynamically calculated formula
}

export const billingCalculationEngine = {
  /**
   * Dynamically calculate the annual discount percentage from configured plan prices.
   * Formula: annual_discount = 1 - (annual_price / (monthly_price * 12))
   */
  calculateAnnualDiscountPercent(monthlyPrice: number, annualPrice: number): number {
    if (!monthlyPrice || monthlyPrice <= 0 || !annualPrice || annualPrice <= 0) return 0;
    const fullAnnualCost = monthlyPrice * 12;
    if (annualPrice >= fullAnnualCost) return 0;
    const discountDecimal = 1 - annualPrice / fullAnnualCost;
    return Math.round(discountDecimal * 10000) / 100; // Returns rounded e.g. 16.67
  },

  /**
   * Centralized calculation function for quotes, subscriptions, and invoices.
   * Uses safe decimal math (rounding to 2 decimal places).
   */
  calculateBilling(input: BillingCalculationInput): BillingCalculationOutput {
    const {
      plan,
      seatCount,
      billingInterval,
      couponDiscountPercent = 0,
      taxRatePercent = 18.0,
      prorationDaysRemaining,
      prorationTotalDays,
    } = input;

    const isAnnual = billingInterval === 'Annual';
    const computedAnnualDiscountPercent = this.calculateAnnualDiscountPercent(plan.monthlyPrice, plan.annualPrice);

    // 1. Base Plan Cost
    let basePlanPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;

    // 2. Extra seats calculation
    let additionalSeatsPrice = 0;
    if (seatCount > plan.includedSeats && plan.additionalSeatPrice) {
      const extraSeats = seatCount - plan.includedSeats;
      const ratePerSeat = isAnnual ? plan.additionalSeatPrice * 12 * (1 - computedAnnualDiscountPercent / 100) : plan.additionalSeatPrice;
      additionalSeatsPrice = Math.round(extraSeats * ratePerSeat * 100) / 100;
    }

    let subtotal = Math.round((basePlanPrice + additionalSeatsPrice) * 100) / 100;

    // 3. Proration adjustment (if upgrading mid-cycle)
    if (prorationDaysRemaining !== undefined && prorationTotalDays !== undefined && prorationTotalDays > 0) {
      const prorationFactor = prorationDaysRemaining / prorationTotalDays;
      subtotal = Math.round(subtotal * prorationFactor * 100) / 100;
    }

    // 4. Discounts
    const couponDiscountAmount = couponDiscountPercent > 0
      ? Math.round(subtotal * (couponDiscountPercent / 100) * 100) / 100
      : 0;

    const totalDiscount = couponDiscountAmount;
    const taxableAmount = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);

    // 5. Tax (GST)
    const taxAmount = Math.round(taxableAmount * (taxRatePercent / 100) * 100) / 100;
    const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    // 6. Generate canonical line items
    const lineItems: InvoiceLineItemCalculated[] = [
      {
        description: `${plan.name} Plan ${isAnnual ? 'Annual' : 'Monthly'} Subscription (${plan.includedSeats} Included Seats)`,
        planOrFeatureCode: plan.code,
        quantity: 1,
        unitPrice: basePlanPrice,
        discount: couponDiscountAmount,
        taxableAmount: taxableAmount - (additionalSeatsPrice ? Math.round(additionalSeatsPrice * (1 - couponDiscountPercent / 100) * 100) / 100 : 0),
        tax: Math.round((taxableAmount - (additionalSeatsPrice ? Math.round(additionalSeatsPrice * (1 - couponDiscountPercent / 100) * 100) / 100 : 0)) * (taxRatePercent / 100) * 100) / 100,
        lineTotal: Math.round((basePlanPrice - couponDiscountAmount + Math.round((basePlanPrice - couponDiscountAmount) * (taxRatePercent / 100) * 100) / 100) * 100) / 100,
      },
    ];

    if (additionalSeatsPrice > 0) {
      const extraSeats = seatCount - plan.includedSeats;
      const extraTax = Math.round(additionalSeatsPrice * (taxRatePercent / 100) * 100) / 100;
      lineItems.push({
        description: `Additional Capacity: ${extraSeats} Seats (${isAnnual ? 'Annual' : 'Monthly'})`,
        planOrFeatureCode: 'seat.expansion',
        quantity: extraSeats,
        unitPrice: Math.round((additionalSeatsPrice / extraSeats) * 100) / 100,
        discount: 0,
        taxableAmount: additionalSeatsPrice,
        tax: extraTax,
        lineTotal: Math.round((additionalSeatsPrice + extraTax) * 100) / 100,
      });
    }

    return {
      currency: 'INR',
      billingInterval,
      seatCount,
      basePlanPrice,
      additionalSeatsPrice,
      subtotal,
      annualDiscountAmount: isAnnual ? (plan.monthlyPrice * 12 - plan.annualPrice) : 0,
      couponDiscountAmount,
      totalDiscount,
      taxableAmount,
      taxRatePercent,
      taxAmount,
      totalAmount,
      lineItems,
      annualDiscountPercentComputed: computedAnnualDiscountPercent,
    };
  },
};
