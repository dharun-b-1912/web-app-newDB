// src/services/operations/vendorCommercialEngine.ts
// ============================================================================
// Joy PeopleHR — Engine 5: Vendor Commercials, Service Margin & Compliance Engine
// ============================================================================

import { supabase } from '../../lib/supabase';

export interface VendorCommercialAgreement {
  id?: string;
  organization_id: string;
  vendor_id: string;
  vendor_code?: string;
  vendor_name: string;
  margin_type: 'PERCENTAGE' | 'FIXED_PER_WORKER' | 'FIXED_PER_DAY' | 'FIXED_PER_MAN_HOUR';
  margin_value: number; // e.g. 8.0 for 8% or 500 for fixed
  margin_basis: 'BASIC_ONLY' | 'GROSS_ONLY' | 'GROSS_PLUS_OT' | 'TOTAL_LABOUR_COST';
  gst_rate: number; // e.g. 18.0
  tds_rate: number; // e.g. 2.0
  agreement_start_date?: string;
  agreement_end_date?: string;
  labour_license_number?: string;
  labour_license_valid_until?: string;
  form_v_reference?: string;
  migrant_worker_license_number?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING_APPROVAL' | 'TERMINATED';
}

export interface VendorInvoiceCalculationInput {
  agreement: VendorCommercialAgreement;
  workerCount: number;
  totalPresentDays: number;
  totalManHours: number;
  basicWages: number;
  allowances: number;
  overtimeAmount: number;
  employerPfAmount: number;
  employerEsiAmount: number;
  bonusAmount?: number;
}

export interface VendorInvoiceBreakdown {
  basicWages: number;
  allowances: number;
  grossWages: number;
  overtimeAmount: number;
  totalWagesWithOt: number;
  statutoryContributions: number;
  totalLabourCost: number;
  marginBasisAmount: number;
  serviceMarginAmount: number;
  subtotalBeforeGst: number;
  gstAmount: number;
  tdsDeductionAmount: number;
  netPayableToVendor: number;
}

class VendorCommercialEngine {
  /**
   * Calculates the exact vendor billing breakdown and service charge margin
   */
  calculateVendorInvoice(input: VendorInvoiceCalculationInput): VendorInvoiceBreakdown {
    const {
      agreement,
      workerCount,
      totalPresentDays,
      totalManHours,
      basicWages,
      allowances,
      overtimeAmount,
      employerPfAmount,
      employerEsiAmount,
      bonusAmount = 0,
    } = input;

    const grossWages = basicWages + allowances;
    const totalWagesWithOt = grossWages + overtimeAmount;
    const statutoryContributions = employerPfAmount + employerEsiAmount + bonusAmount;
    const totalLabourCost = totalWagesWithOt + statutoryContributions;

    let marginBasisAmount = 0;
    let serviceMarginAmount = 0;

    if (agreement.margin_type === 'PERCENTAGE') {
      if (agreement.margin_basis === 'BASIC_ONLY') {
        marginBasisAmount = basicWages;
      } else if (agreement.margin_basis === 'GROSS_ONLY') {
        marginBasisAmount = grossWages;
      } else if (agreement.margin_basis === 'GROSS_PLUS_OT') {
        marginBasisAmount = totalWagesWithOt;
      } else {
        marginBasisAmount = totalLabourCost;
      }
      serviceMarginAmount = (marginBasisAmount * agreement.margin_value) / 100;
    } else if (agreement.margin_type === 'FIXED_PER_WORKER') {
      marginBasisAmount = workerCount;
      serviceMarginAmount = workerCount * agreement.margin_value;
    } else if (agreement.margin_type === 'FIXED_PER_DAY') {
      marginBasisAmount = totalPresentDays;
      serviceMarginAmount = totalPresentDays * agreement.margin_value;
    } else if (agreement.margin_type === 'FIXED_PER_MAN_HOUR') {
      marginBasisAmount = totalManHours;
      serviceMarginAmount = totalManHours * agreement.margin_value;
    }

    const subtotalBeforeGst = totalLabourCost + serviceMarginAmount;
    const gstAmount = (subtotalBeforeGst * (agreement.gst_rate || 18.0)) / 100;
    const tdsDeductionAmount = (serviceMarginAmount * (agreement.tds_rate || 2.0)) / 100;
    const netPayableToVendor = subtotalBeforeGst + gstAmount - tdsDeductionAmount;

    return {
      basicWages: Number(basicWages.toFixed(2)),
      allowances: Number(allowances.toFixed(2)),
      grossWages: Number(grossWages.toFixed(2)),
      overtimeAmount: Number(overtimeAmount.toFixed(2)),
      totalWagesWithOt: Number(totalWagesWithOt.toFixed(2)),
      statutoryContributions: Number(statutoryContributions.toFixed(2)),
      totalLabourCost: Number(totalLabourCost.toFixed(2)),
      marginBasisAmount: Number(marginBasisAmount.toFixed(2)),
      serviceMarginAmount: Number(serviceMarginAmount.toFixed(2)),
      subtotalBeforeGst: Number(subtotalBeforeGst.toFixed(2)),
      gstAmount: Number(gstAmount.toFixed(2)),
      tdsDeductionAmount: Number(tdsDeductionAmount.toFixed(2)),
      netPayableToVendor: Number(netPayableToVendor.toFixed(2)),
    };
  }

  /**
   * Upserts a vendor commercial agreement and compliance details
   */
  async saveCommercialAgreement(agreement: VendorCommercialAgreement): Promise<VendorCommercialAgreement> {
    const payload = {
      ...agreement,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('vendor_commercial_agreements')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Scans for expiring vendor licenses (e.g. Labour License, Form V, Migrant License)
   */
  async getExpiringLicenses(orgId: string, daysAhead: number = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('vendor_commercial_agreements')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'ACTIVE')
        .lte('labour_license_valid_until', futureDateStr);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[VendorCommercialEngine] Expiry scan error:', err);
      return [];
    }
  }
}

export const vendorCommercialEngine = new VendorCommercialEngine();
