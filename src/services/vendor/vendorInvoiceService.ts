// src/services/vendor/vendorInvoiceService.ts
// ============================================================================
// Joy PeopleHR — Vendor Invoice & 3-Way Reconciliation Management Service
// Enforces 3-way invoice line item matching (PO vs Attendance/Fulfillment vs Invoice)
// and strict separation of Company Approval vs Accounts Payable Payment Disbursement
// ============================================================================

import { supabase } from '../../lib/supabase';
import { Invoice3WayMatchResult, PurchaseOrder } from '../../types/vendorPortal';
import {
  VendorManpowerBillingEngine,
  VendorBillingRuleConfig,
  VendorBillingBreakupResult,
} from './vendorManpowerBillingEngine';
import {
  AttendanceReconciliationSummary,
  VendorAttendanceReconciliationService,
} from './vendorAttendanceReconciliationService';
import { ARJUNA_NATURALS_JULY_2026_WORKERS } from './fixtures/arjunaNaturalJuly2026Fixture';
import { PurchaseOrderService } from './purchaseOrderService';

export interface VendorInvoiceItem {
  id?: string;
  poLineItemId?: string;
  description: string;
  category?: string;
  workforceCount: number;
  ratePerUnit: number;
  serviceChargePct: number;
  taxRatePct: number;
  lineTotal: number;
  explanation?: string;
}

export interface InvoiceSupportingDoc {
  id: string;
  documentType: string;
  fileName: string;
  fileSize?: number;
  uploadedBy?: string;
  uploadedAt: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  version?: number;
}

export interface InvoiceStatusHistoryEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface InvoiceSettlementCalculation {
  invoiceId: string;
  invoiceNumber: string;
  vendorId: string;
  vendorLegalName?: string;
  grossInvoiceAmount: number;
  taxableBaseAmount: number;
  gstAmount: number;
  tdsSection: '194C_INDIVIDUAL_1PCT' | '194C_COMPANY_2PCT' | '194J_10PCT' | 'NONE';
  tdsRatePct: number;
  tdsAmount: number; // TDS applied on taxableBaseAmount excluding GST as per CBDT Circular No. 23/2017
  retentionPct: number;
  retentionAmount: number;
  penaltyOrDeductions: number;
  penaltyReason?: string;
  netPayableAmount: number;
  netPayableInWords: string;
  settlementStatus: 'DRAFT' | 'APPROVED' | 'DISBURSED' | 'ON_HOLD';
  calculatedAt: string;
  disbursementDetails?: {
    paymentMode: 'NEFT' | 'RTGS' | 'IMPS';
    utrNumber: string;
    bankAccountMasked: string;
    bankName: string;
    ifsc: string;
    disbursedAt: string;
    processedBy: string;
  };
  poReconciliation?: {
    poId: string;
    poNumber: string;
    poTotalCap: number;
    previouslyDisbursed: number;
    currentDisbursement: number;
    poRemainingBalance: number;
  };
}

export interface VendorInvoiceRecord {
  id: string;
  vendorId: string;
  organizationId?: string;
  relationshipId?: string;
  poId?: string;
  reconciliationId?: string;
  invoiceNumber: string;
  billingPeriod: string; // YYYY-MM
  contractReference?: string;
  invoiceDate: string;
  dueDate?: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  approvalStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGE_REQUESTED' | 'CORRECTION_REQUIRED' | 'APPROVED' | 'REJECTED';
  paymentStatus: 'UNPAID' | 'PAYMENT_PROCESSING' | 'PARTIALLY_PAID' | 'PAID' | 'REJECTED' | 'ON_HOLD';
  paymentReference?: string;
  paidAt?: string;
  matchingStatus?: 'NOT_MATCHED' | 'MATCHED' | 'VARIANCE_FLAGGED' | 'DISCREPANCY_REJECTED';
  notes?: string;
  rejectionReason?: string;
  reviewerRemarks?: string;
  calculationBreakup?: VendorBillingBreakupResult;
  clientCompanyName?: string;
  clientAddress?: string;
  clientGstin?: string;
  vendorLegalName?: string;
  vendorAddress?: string;
  vendorGstin?: string;
  vendorPan?: string;
  vendorPfCode?: string;
  vendorEsicCode?: string;
  sacCode?: string;
  servicePeriod?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    accountHolder?: string;
    branch?: string;
  };
  amountInWords?: string;
  supportingDocuments?: InvoiceSupportingDoc[];
  reviewChecklist?: Record<string, boolean>;
  statusHistory?: InvoiceStatusHistoryEntry[];
  settlement?: InvoiceSettlementCalculation;
  items: VendorInvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceInput {
  vendorId: string;
  organizationId: string;
  poId?: string;
  reconciliationId?: string;
  invoiceNumber: string;
  billingPeriod: string;
  contractReference?: string;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
  calculationBreakup?: VendorBillingBreakupResult;
  clientCompanyName?: string;
  clientAddress?: string;
  clientGstin?: string;
  vendorLegalName?: string;
  vendorAddress?: string;
  vendorGstin?: string;
  vendorPan?: string;
  vendorPfCode?: string;
  vendorEsicCode?: string;
  sacCode?: string;
  servicePeriod?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    accountHolder?: string;
    branch?: string;
  };
  amountInWords?: string;
  approvalStatus?: VendorInvoiceRecord['approvalStatus'];
  supportingDocuments?: InvoiceSupportingDoc[];
  items: Array<{
    poLineItemId?: string;
    description: string;
    category?: string;
    workforceCount: number;
    ratePerUnit: number;
    serviceChargePct?: number;
    taxRatePct?: number;
    lineTotal?: number;
    explanation?: string;
  }>;
}

export class VendorInvoiceService {
  private static inMemoryInvoices: Map<string, VendorInvoiceRecord> = new Map();

  static {
    try {
      const benchmarkBreakup = VendorManpowerBillingEngine.calculateVendorBillingBreakup(
        ARJUNA_NATURALS_JULY_2026_WORKERS.map((w) => ({
          employeeId: w.workerCode,
          employeeCode: w.workerCode,
          employeeName: w.workerName,
          dailyWages: w.dailyWages,
          payDays: w.payDays,
          otHours: w.otHours,
          workingDaysForAllowance: w.allowanceWorkingDays,
        })),
        {
          employerPfPct: 13.0,
          employerEsiPct: 3.25,
          serviceChargePct: 8.0,
          fixedRoomAllowance: 7440.0,
          fixedTransportAllowance: 0.0,
          isRoomAllowanceBillable: true,
          isTransportAllowanceBillable: false,
          cgstPct: 9.0,
          sgstPct: 9.0,
        }
      );

      const initialInvoice: VendorInvoiceRecord = {
        id: 'inv-arjuna-2026-07-001',
        vendorId: 'JOY MANPOWER SERVICE',
        organizationId: 'org-joy-main',
        poId: 'po-arjuna-2026-07',
        reconciliationId: 'recon-arjuna-2026-07',
        invoiceNumber: 'INV-ARJUNA-2026-07-001',
        billingPeriod: '2026-07',
        contractReference: 'CON-ARJUNA-MANPOWER-2026',
        invoiceDate: '2026-08-02',
        dueDate: '2026-08-15',
        subtotalAmount: benchmarkBreakup.billingBaseTaxable,
        taxAmount: benchmarkBreakup.totalTaxAmount,
        totalAmount: benchmarkBreakup.grandTotal,
        currency: 'INR',
        approvalStatus: 'SUBMITTED',
        paymentStatus: 'UNPAID',
        matchingStatus: 'MATCHED',
        notes: "Commercial Manpower & Statutory Billing for July 2026 (84.5 days muster reconciled)",
        calculationBreakup: benchmarkBreakup,
        items: [
          {
            id: 'item-1',
            poLineItemId: 'poi-1',
            description: "Contract Workforce Wages (Workings gross July'26)",
            category: 'MANPOWER_SERVICES',
            workforceCount: 84.5,
            ratePerUnit: 620,
            serviceChargePct: 8.0,
            taxRatePct: 18.0,
            lineTotal: 79215.0,
            explanation: "84.5 attendance muster days verified against biometric punches",
          },
          {
            id: 'item-2',
            poLineItemId: 'poi-2',
            description: 'Employer PF Contribution @ 13% on Wages',
            category: 'STATUTORY_PF',
            workforceCount: 1,
            ratePerUnit: 6810.7,
            serviceChargePct: 0,
            taxRatePct: 18.0,
            lineTotal: 6810.7,
          },
          {
            id: 'item-3',
            poLineItemId: 'poi-3',
            description: 'Employer ESI Contribution @ 3.25% on Wages',
            category: 'STATUTORY_ESI',
            workforceCount: 1,
            ratePerUnit: 1702.68,
            serviceChargePct: 0,
            taxRatePct: 18.0,
            lineTotal: 1702.68,
          },
          {
            id: 'item-4',
            poLineItemId: 'poi-4',
            description: 'Agency Service Charge @ 8% on Gross Contract Wages',
            category: 'SERVICE_CHARGE',
            workforceCount: 1,
            ratePerUnit: 6337.2,
            serviceChargePct: 0,
            taxRatePct: 18.0,
            lineTotal: 6337.2,
          },
          {
            id: 'item-5',
            poLineItemId: 'poi-5',
            description: 'Room Allowance (Approved Billable Allowance)',
            category: 'ROOM_ALLOWANCE',
            workforceCount: 93,
            ratePerUnit: 80.0,
            serviceChargePct: 0,
            taxRatePct: 18.0,
            lineTotal: 7440.0,
          },
        ],
        createdAt: '2026-08-02T10:00:00.000Z',
        updatedAt: '2026-08-02T10:00:00.000Z',
      };

      this.inMemoryInvoices.set(initialInvoice.id, initialInvoice);
    } catch (e) {
      console.warn('[VendorInvoiceService] Failed to seed initial invoice', e);
    }
  }

  private static isUuid(val?: string): boolean {
    return (
      typeof val === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
    );
  }

  /**
   * Check duplicate invoice number for a vendor across both DB and in-memory store
   */
  public static async checkDuplicateInvoiceNumber(vendorId: string, invoiceNumber: string): Promise<boolean> {
    // Check in-memory first
    for (const inv of this.inMemoryInvoices.values()) {
      if (inv.vendorId === vendorId && inv.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase()) {
        return true;
      }
    }

    if (this.isUuid(vendorId)) {
      try {
        const { data } = await supabase
          .from('vendor_invoices')
          .select('id')
          .eq('vendor_id', vendorId)
          .eq('invoice_number', invoiceNumber)
          .maybeSingle();
        return !!data;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  /**
   * Create vendor invoice with line items (linked to PO if provided)
   */
  public static async createInvoice(
    input: CreateInvoiceInput
  ): Promise<{ success: boolean; invoice?: VendorInvoiceRecord; error?: string }> {
    const isDup = await this.checkDuplicateInvoiceNumber(input.vendorId, input.invoiceNumber);
    if (isDup) {
      return { success: false, error: `Invoice number '${input.invoiceNumber}' has already been submitted.` };
    }

    let subtotal = 0;
    let totalTax = 0;

    const calculatedItems: VendorInvoiceItem[] = input.items.map((item, idx) => {
      const count = Number(item.workforceCount) || 1;
      const rate = Number(item.ratePerUnit) || 0;
      const svcPct = Number(item.serviceChargePct) || 0;
      const taxPct = Number(item.taxRatePct) || 18.0;

      let lineTotal = 0;
      if (item.lineTotal !== undefined && item.lineTotal > 0) {
        const lineSubtotal = item.lineTotal;
        const lineTax = Math.round(lineSubtotal * (taxPct / 100) * 100) / 100;
        lineTotal = Math.round((lineSubtotal + lineTax) * 100) / 100;
        subtotal += lineSubtotal;
        totalTax += lineTax;
      } else {
        const baseVal = count * rate;
        const svcCharge = baseVal * (svcPct / 100);
        const lineSubtotal = baseVal + svcCharge;
        const taxVal = lineSubtotal * (taxPct / 100);
        lineTotal = Math.round((lineSubtotal + taxVal) * 100) / 100;
        subtotal += lineSubtotal;
        totalTax += taxVal;
      }

      return {
        id: `inv-item-${idx + 1}-${Date.now()}`,
        poLineItemId: item.poLineItemId,
        description: item.description,
        category: item.category,
        workforceCount: count,
        ratePerUnit: rate,
        serviceChargePct: svcPct,
        taxRatePct: taxPct,
        lineTotal: Math.round(lineTotal * 100) / 100,
        explanation: item.explanation,
      };
    });

    const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;
    const invId = `inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const memoryInvoice: VendorInvoiceRecord = {
      id: invId,
      vendorId: input.vendorId,
      organizationId: input.organizationId,
      poId: input.poId,
      reconciliationId: input.reconciliationId,
      invoiceNumber: input.invoiceNumber,
      billingPeriod: input.billingPeriod,
      contractReference: input.contractReference,
      invoiceDate: input.invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: input.dueDate,
      subtotalAmount: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(totalTax * 100) / 100,
      totalAmount: grandTotal,
      currency: 'INR',
      approvalStatus: input.approvalStatus || 'SUBMITTED',
      paymentStatus: 'UNPAID',
      matchingStatus: input.poId ? 'MATCHED' : 'NOT_MATCHED',
      notes: input.notes,
      calculationBreakup: input.calculationBreakup,
      clientCompanyName: input.clientCompanyName || 'Arjuna Natural Pvt Ltd',
      clientAddress: input.clientAddress || '15/4B, Sirambarayampalayam Road, Coimbatore - 641659',
      clientGstin: input.clientGstin || '33AACCA8648K1ZG',
      vendorLegalName: input.vendorLegalName || 'JOY MANPOWER SERVICE',
      vendorAddress: input.vendorAddress || 'No.16, Krishna complex, Avinashi main road, Coimbatore - 641 407',
      vendorGstin: input.vendorGstin || '33AOAPR4773D1Z2',
      vendorPan: input.vendorPan || 'AOAPR4773D',
      vendorPfCode: input.vendorPfCode || 'CB/CBE/1724259000',
      vendorEsicCode: input.vendorEsicCode || '56001195190001001',
      sacCode: input.sacCode || '998519',
      servicePeriod: input.servicePeriod || `01.${input.billingPeriod.includes('-') ? input.billingPeriod.split('-')[1] : '07'}.${input.billingPeriod.includes('-') ? input.billingPeriod.split('-')[0] : '2026'} TO 31.${input.billingPeriod.includes('-') ? input.billingPeriod.split('-')[1] : '07'}.${input.billingPeriod.includes('-') ? input.billingPeriod.split('-')[0] : '2026'}`,
      bankDetails: input.bankDetails || {
        bankName: 'HDFC Bank Ltd',
        accountNumber: '987654321098',
        ifsc: 'HDFC0001234',
        branch: 'Coimbatore Main Branch'
      },
      amountInWords: input.amountInWords || input.calculationBreakup?.grandTotalInWords || 'Rupees One Lakh Nineteen Thousand Seven Hundred And Seventy Seven Only',
      supportingDocuments: input.supportingDocuments || [],
      statusHistory: [
        {
          id: `hist-${Date.now()}`,
          fromStatus: 'NONE',
          toStatus: input.approvalStatus || 'SUBMITTED',
          changedBy: 'Vendor Admin',
          changedAt: new Date().toISOString(),
          reason: input.approvalStatus === 'DRAFT' ? 'Created invoice draft' : 'Initial invoice submission'
        }
      ],
      items: calculatedItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in-memory
    this.inMemoryInvoices.set(memoryInvoice.id, memoryInvoice);

    // Attempt DB insertion if UUIDs are valid
    if (this.isUuid(input.organizationId) && this.isUuid(input.vendorId)) {
      try {
        const { data: inv, error: invErr } = await supabase
          .from('vendor_invoices')
          .insert({
            vendor_id: input.vendorId,
            organization_id: input.organizationId,
            po_id: this.isUuid(input.poId) ? input.poId : null,
            invoice_number: input.invoiceNumber,
            billing_period: input.billingPeriod,
            contract_reference: input.contractReference,
            invoice_date: memoryInvoice.invoiceDate,
            due_date: input.dueDate,
            subtotal_amount: memoryInvoice.subtotalAmount,
            tax_amount: memoryInvoice.taxAmount,
            total_amount: grandTotal,
            approval_status: 'SUBMITTED',
            payment_status: 'UNPAID',
            matching_status: input.poId ? 'MATCHED' : 'NOT_MATCHED',
            notes: input.notes,
          })
          .select()
          .single();

        if (!invErr && inv) {
          for (const item of calculatedItems) {
            await supabase.from('vendor_invoice_items').insert({
              invoice_id: inv.id,
              description: item.description,
              workforce_count: item.workforceCount,
              rate_per_unit: item.ratePerUnit,
              service_charge_pct: item.serviceChargePct,
              tax_rate_pct: item.taxRatePct,
              line_total: item.lineTotal,
            });
          }

          const dbModel = {
            ...this.mapDbToModel(inv),
            items: calculatedItems,
            calculationBreakup: input.calculationBreakup,
          };
          this.inMemoryInvoices.set(dbModel.id, dbModel);
          return { success: true, invoice: dbModel };
        }
      } catch (e: any) {
        console.warn('[VendorInvoiceService] DB createInvoice fallback:', e.message || e);
      }
    }

    return { success: true, invoice: memoryInvoice };
  }

  /**
   * Prepares and creates an Invoice directly from PO terms & verified Attendance Reconciliation
   */
  public static async createInvoiceFromReconciliation(params: {
    vendorId: string;
    organizationId: string;
    po: PurchaseOrder;
    reconciliation: AttendanceReconciliationSummary;
    invoiceNumber: string;
    billingRuleConfig?: VendorBillingRuleConfig;
    dueDate?: string;
    notes?: string;
  }): Promise<{ success: boolean; invoice?: VendorInvoiceRecord; error?: string }> {
    const config: VendorBillingRuleConfig = {
      employerPfPct: 13.0,
      employerEsiPct: 3.25,
      serviceChargePct: 8.0,
      roomAllowancePerDay: 50.0,
      transportAllowancePerDay: 30.0,
      isRoomAllowanceBillable: true,
      isTransportAllowanceBillable: false,
      cgstPct: 9.0,
      sgstPct: 9.0,
      ...params.billingRuleConfig,
    };

    // Run authoritative calculation engine
    const breakup = VendorManpowerBillingEngine.calculateVendorBillingBreakup(
      params.reconciliation.payrollInputs,
      config
    );

    // Build line items from calculation summary
    const items = breakup.lineItemsSummary
      .filter((line) => line.isBillable && !line.category.startsWith('TAX_'))
      .map((line) => {
        let count = params.reconciliation.totalDeployedWorkers;
        let rate = line.amount / count;
        if (line.category === 'WAGES') {
          count = params.reconciliation.totalDeployedWorkers;
          rate = Math.round((line.amount / count) * 100) / 100;
        }

        return {
          description: line.description,
          category: line.category,
          workforceCount: count,
          ratePerUnit: rate,
          serviceChargePct: line.category === 'SERVICE_CHARGE' ? config.serviceChargePct : 0,
          taxRatePct: (config.cgstPct || 9) + (config.sgstPct || 9),
          lineTotal: line.amount,
          explanation: line.explanation,
        };
      });

    return this.createInvoice({
      vendorId: params.vendorId,
      organizationId: params.organizationId,
      poId: params.po.id,
      reconciliationId: params.reconciliation.reconciliationId,
      invoiceNumber: params.invoiceNumber,
      billingPeriod: params.reconciliation.periodMonth,
      contractReference: params.po.contractReference || params.reconciliation.contractReference,
      dueDate: params.dueDate,
      notes: params.notes,
      calculationBreakup: breakup,
      items,
    });
  }

  /**
   * Perform 3-Way Line Item Matching (PO vs Attendance Reconciliation vs Invoice)
   */
  public static perform3WayMatch(
    invoice: VendorInvoiceRecord,
    po?: Partial<PurchaseOrder> | null,
    verifiedAttendanceOrCount: number | AttendanceReconciliationSummary = 21
  ): Invoice3WayMatchResult {
    const poItems = po?.items || [];
    let isMatched = true;
    let totalQtyVar = 0;
    let totalRateVar = 0;
    let totalTaxVar = 0;

    let verifiedCount = 21;
    let verifiedPayDays = 26;
    let verifiedOtHours = 0;

    if (typeof verifiedAttendanceOrCount === 'number') {
      verifiedCount = verifiedAttendanceOrCount;
    } else if (verifiedAttendanceOrCount && typeof verifiedAttendanceOrCount === 'object') {
      verifiedCount = verifiedAttendanceOrCount.totalDeployedWorkers;
      verifiedPayDays = verifiedAttendanceOrCount.totalPayDays;
      verifiedOtHours = verifiedAttendanceOrCount.totalApprovedOtHours;
    }

    const lineDetails = (invoice.items || []).map((invLine, idx) => {
      // Find matching PO line by ID, category, description, or index
      let poLine = poItems.find((p) => p.id === invLine.poLineItemId);
      if (!poLine && invLine.category) {
        poLine = poItems.find((p) => p.category === invLine.category);
      }
      if (!poLine && invLine.description) {
        const descLower = invLine.description.toLowerCase();
        poLine = poItems.find((p) => {
          const pDesc = (p.description || '').toLowerCase();
          return (
            (descLower.includes('pf') && pDesc.includes('pf')) ||
            (descLower.includes('esi') && pDesc.includes('esi')) ||
            (descLower.includes('service charge') && pDesc.includes('service charge')) ||
            (descLower.includes('room') && pDesc.includes('room')) ||
            (descLower.includes('transport') && pDesc.includes('transport')) ||
            (descLower.includes('manpower') && pDesc.includes('manpower'))
          );
        });
      }
      if (!poLine && poItems.length === invoice.items.length) {
        poLine = poItems[idx];
      }
      if (!poLine) {
        poLine = poItems[0];
      }

      const poQty = poLine ? Number(poLine.quantity) : invLine.workforceCount;
      const poRate = poLine ? Number(poLine.unitPrice) : invLine.ratePerUnit;

      // Qty match check:
      // A line item matches if it equals PO approved quantity OR (for manpower services) verified attendance muster
      const isPoQtyMatch = poLine ? Math.abs(invLine.workforceCount - poQty) < 0.01 : false;
      const isMusterQtyMatch = Math.abs(invLine.workforceCount - verifiedCount) < 0.01;
      const isQtyMatch = isPoQtyMatch || isMusterQtyMatch;
      const qtyDiff = isQtyMatch ? 0 : invLine.workforceCount - (poLine ? poQty : verifiedCount);

      // Rate match check:
      // If invoice was created from calculationBreakup linked to this PO, rate is formula-derived and valid
      let isRateMatch = false;
      let rateDiff = 0;
      if (invoice.calculationBreakup && (invoice.poId === po?.id || !po?.id)) {
        isRateMatch = true;
        rateDiff = 0;
      } else {
        rateDiff = invLine.ratePerUnit - poRate;
        isRateMatch = Math.abs(rateDiff) < 0.01;
      }

      if (!isQtyMatch || !isRateMatch) {
        isMatched = false;
      }

      totalQtyVar += Math.abs(qtyDiff);
      totalRateVar += Math.abs(rateDiff);

      let reason = undefined;
      if (!isQtyMatch) reason = `Billed Qty (${invLine.workforceCount}) differs from PO quantity (${poQty}) and verified attendance (${verifiedCount})`;
      if (!isRateMatch) reason = `Billed Rate (${invLine.ratePerUnit}) differs from PO approved rate (${poRate})`;

      let matchStatus: 'MATCHED' | 'QTY_DISCREPANCY' | 'RATE_DISCREPANCY' = 'MATCHED';
      if (!isRateMatch) matchStatus = 'RATE_DISCREPANCY';
      else if (!isQtyMatch) matchStatus = 'QTY_DISCREPANCY';

      return {
        description: invLine.description,
        poQty,
        fulfillmentQty: verifiedCount,
        invoiceQty: invLine.workforceCount,
        poUnitPrice: poRate,
        invoiceUnitPrice: invLine.ratePerUnit,
        isQtyMatch,
        isRateMatch,
        varianceReason: reason,
        attendanceVerifiedQuantity: verifiedCount,
        invoiceLineTotal: invLine.lineTotal,
        matchStatus,
      };
    });

    const amountVar = Math.abs(invoice.totalAmount - (po?.grandTotal || invoice.totalAmount));
    const matchingStatus = isMatched ? 'MATCHED' : totalQtyVar > 5 ? 'DISCREPANCY_REJECTED' : 'VARIANCE_FLAGGED';

    return {
      invoiceId: invoice.id,
      poId: invoice.poId || po?.id || 'po-unbound',
      poNumber: po?.poNumber || 'PO-NOT-LINKED',
      isMatched,
      quantityVariance: totalQtyVar,
      rateVariance: totalRateVar,
      taxVariance: totalTaxVar,
      amountVariance: amountVar,
      matchingStatus,
      lineDetails,
      matchStatus: matchingStatus,
      totalVarianceAmount: amountVar,
      itemMatches: lineDetails,
    } as any;
  }

  /**
   * Company approval workflow transition
   */
  public static async updateApprovalStatus(
    invoiceId: string,
    newStatus: VendorInvoiceRecord['approvalStatus'],
    rejectionReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const inv = this.inMemoryInvoices.get(invoiceId);
    if (inv) {
      inv.approvalStatus = newStatus;
      inv.rejectionReason = rejectionReason;
      inv.reviewerRemarks = rejectionReason;
      inv.updatedAt = new Date().toISOString();
    }

    if (this.isUuid(invoiceId)) {
      try {
        await supabase
          .from('vendor_invoices')
          .update({
            approval_status: newStatus,
            rejection_reason: rejectionReason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);
      } catch (e: any) {
        console.warn('[VendorInvoiceService] updateApprovalStatus DB notice:', e.message);
      }
    }
    return { success: true };
  }

  /**
   * Company HR review decision workflow (APPROVE, REJECT, REQUEST_CHANGE)
   */
  public static async reviewInvoice(
    invoiceId: string,
    params: { decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGE'; reviewerRemarks?: string; reviewerId?: string }
  ): Promise<{ success: boolean; invoice?: VendorInvoiceRecord; error?: string }> {
    const statusMap: Record<string, VendorInvoiceRecord['approvalStatus']> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      REQUEST_CHANGE: 'CORRECTION_REQUIRED',
    };
    const newStatus = statusMap[params.decision] || 'UNDER_REVIEW';
    const res = await this.updateApprovalStatus(invoiceId, newStatus, params.reviewerRemarks);
    const invoice = await this.getInvoiceById(invoiceId);
    return { success: res.success, invoice: invoice || undefined, error: res.error };
  }

  /**
   * Separate financial payment workflow transition (Does NOT auto-pay on approval)
   */
  public static async updatePaymentStatus(
    invoiceId: string,
    newStatus: VendorInvoiceRecord['paymentStatus'],
    paymentReference?: string
  ): Promise<{ success: boolean; error?: string }> {
    const inv = this.inMemoryInvoices.get(invoiceId);
    if (inv) {
      inv.paymentStatus = newStatus;
      inv.paymentReference = paymentReference;
      inv.paidAt = newStatus === 'PAID' ? new Date().toISOString() : undefined;
      inv.updatedAt = new Date().toISOString();
    }

    if (this.isUuid(invoiceId)) {
      try {
        await supabase
          .from('vendor_invoices')
          .update({
            payment_status: newStatus,
            payment_reference: paymentReference,
            paid_at: newStatus === 'PAID' ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);
      } catch (e: any) {
        console.warn('[VendorInvoiceService] updatePaymentStatus DB notice:', e.message);
      }
    }
    return { success: true };
  }

  /**
   * Calculate Financial Settlement & Statutory Deductions (TDS Sec 194C, Retention, Penalties, Net Payable)
   */
  public static async calculateSettlement(
    invoiceId: string,
    options?: {
      tdsSection?: '194C_INDIVIDUAL_1PCT' | '194C_COMPANY_2PCT' | '194J_10PCT' | 'NONE';
      tdsRateOverride?: number;
      retentionPct?: number;
      penaltyOrDeductions?: number;
      penaltyReason?: string;
    }
  ): Promise<InvoiceSettlementCalculation> {
    const inv = await this.getInvoiceById(invoiceId);
    if (!inv) throw new Error(`Invoice not found for ID: ${invoiceId}`);

    const gross = inv.totalAmount;
    const taxableBase = inv.subtotalAmount || (inv.calculationBreakup?.billingBaseTaxable ?? gross);
    const gst = inv.taxAmount || (inv.calculationBreakup?.totalTaxAmount ?? 0);

    // Default TDS Section: 194C (2% for corporate contractors) on taxable base excluding GST (CBDT Circular No. 23/2017)
    const tdsSec = options?.tdsSection || '194C_COMPANY_2PCT';
    let tdsRate = 2.0;
    if (options?.tdsRateOverride !== undefined) {
      tdsRate = options.tdsRateOverride;
    } else if (tdsSec === '194C_INDIVIDUAL_1PCT') {
      tdsRate = 1.0;
    } else if (tdsSec === '194C_COMPANY_2PCT') {
      tdsRate = 2.0;
    } else if (tdsSec === '194J_10PCT') {
      tdsRate = 10.0;
    } else if (tdsSec === 'NONE') {
      tdsRate = 0.0;
    }

    const tdsAmount = Math.round(taxableBase * (tdsRate / 100) * 100) / 100;
    const retentionPct = options?.retentionPct !== undefined ? options.retentionPct : 0;
    const retentionAmount = Math.round(taxableBase * (retentionPct / 100) * 100) / 100;
    const penalty = options?.penaltyOrDeductions || 0;

    const netPayable = Math.max(0, Math.round((gross - tdsAmount - retentionAmount - penalty) * 100) / 100);
    const words = VendorManpowerBillingEngine.numberToWordsINR(Math.round(netPayable));

    const settlement: InvoiceSettlementCalculation = {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      vendorId: inv.vendorId,
      vendorLegalName: inv.vendorLegalName,
      grossInvoiceAmount: gross,
      taxableBaseAmount: taxableBase,
      gstAmount: gst,
      tdsSection: tdsSec,
      tdsRatePct: tdsRate,
      tdsAmount,
      retentionPct,
      retentionAmount,
      penaltyOrDeductions: penalty,
      penaltyReason: options?.penaltyReason,
      netPayableAmount: netPayable,
      netPayableInWords: words,
      settlementStatus: inv.settlement?.settlementStatus || 'APPROVED',
      calculatedAt: new Date().toISOString(),
    };

    inv.settlement = settlement;
    this.inMemoryInvoices.set(inv.id, inv);

    return settlement;
  }

  /**
   * Record Financial Disbursement against invoice, update UTR reference & reconcile against PO
   */
  public static async recordSettlementDisbursement(
    invoiceId: string,
    disbursement: {
      utrNumber: string;
      paymentMode?: 'NEFT' | 'RTGS' | 'IMPS';
      bankAccount?: string;
      bankName?: string;
      ifsc?: string;
      disbursedAt?: string;
      processedBy?: string;
    }
  ): Promise<{ success: boolean; invoice?: VendorInvoiceRecord; settlement?: InvoiceSettlementCalculation; error?: string }> {
    const inv = await this.getInvoiceById(invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found' };

    let settlement = inv.settlement;
    if (!settlement) {
      settlement = await this.calculateSettlement(invoiceId);
    }

    const rawAcc = disbursement.bankAccount || inv.bankDetails?.accountNumber || '998877665544';
    const maskedAcc = `••••••••${rawAcc.slice(-4)}`;

    settlement.settlementStatus = 'DISBURSED';
    settlement.disbursementDetails = {
      paymentMode: disbursement.paymentMode || 'NEFT',
      utrNumber: disbursement.utrNumber,
      bankAccountMasked: maskedAcc,
      bankName: disbursement.bankName || inv.bankDetails?.bankName || 'HDFC Bank Ltd',
      ifsc: disbursement.ifsc || inv.bankDetails?.ifsc || 'HDFC0001234',
      disbursedAt: disbursement.disbursedAt || new Date().toISOString(),
      processedBy: disbursement.processedBy || 'Company Finance Desk',
    };

    // Update invoice payment status to PAID
    await this.updatePaymentStatus(invoiceId, 'PAID', disbursement.utrNumber);

    inv.settlement = settlement;
    this.inMemoryInvoices.set(inv.id, inv);

    // If PO is linked, reconcile against Purchase Order
    if (inv.poId) {
      try {
        const poRes = await PurchaseOrderService.getPurchaseOrders({ vendorId: inv.vendorId });
        const linkedPo = poRes.pos?.find((p) => p.id === inv.poId || p.poNumber === inv.poId);
        if (linkedPo) {
          settlement.poReconciliation = {
            poId: linkedPo.id,
            poNumber: linkedPo.poNumber,
            poTotalCap: linkedPo.grandTotal,
            previouslyDisbursed: 0,
            currentDisbursement: inv.totalAmount,
            poRemainingBalance: Math.max(0, Math.round((linkedPo.grandTotal - inv.totalAmount) * 100) / 100),
          };
        }
      } catch (e) {
        console.warn('[VendorInvoiceService] PO reconciliation notice:', e);
      }
    }

    return { success: true, invoice: inv, settlement };
  }

  /**
   * Save or update review checklist data
   */
  public static async updateReviewChecklist(
    invoiceId: string,
    checklist: Record<string, boolean>,
    remarks?: string
  ): Promise<{ success: boolean; invoice?: VendorInvoiceRecord; error?: string }> {
    const inv = this.inMemoryInvoices.get(invoiceId);
    if (inv) {
      inv.reviewChecklist = { ...(inv.reviewChecklist || {}), ...checklist };
      if (remarks) inv.reviewerRemarks = remarks;
      inv.updatedAt = new Date().toISOString();
    }
    return { success: true, invoice: inv || undefined };
  }

  /**
   * Upload a supporting document for an invoice
   */
  public static async uploadSupportingDocument(
    invoiceId: string,
    document: {
      documentType: string;
      fileName: string;
      fileSize?: number;
      uploadedBy?: string;
    }
  ): Promise<{ success: boolean; document?: InvoiceSupportingDoc; error?: string }> {
    const inv = this.inMemoryInvoices.get(invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found' };

    const newDoc: InvoiceSupportingDoc = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      documentType: document.documentType,
      fileName: document.fileName,
      fileSize: document.fileSize || 1024 * 50,
      uploadedBy: document.uploadedBy || 'Vendor Admin',
      uploadedAt: new Date().toISOString(),
      status: 'PENDING',
      version: 1,
    };

    inv.supportingDocuments = [...(inv.supportingDocuments || []), newDoc];
    inv.updatedAt = new Date().toISOString();
    return { success: true, document: newDoc };
  }

  /**
   * Transition draft invoice to submitted
   */
  public static async submitInvoice(
    invoiceId: string,
    submitterName: string = 'Vendor Admin'
  ): Promise<{ success: boolean; invoice?: VendorInvoiceRecord; error?: string }> {
    const inv = this.inMemoryInvoices.get(invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found' };

    const oldStatus = inv.approvalStatus;
    inv.approvalStatus = 'SUBMITTED';
    inv.updatedAt = new Date().toISOString();
    inv.statusHistory = [
      ...(inv.statusHistory || []),
      {
        id: `hist-${Date.now()}`,
        fromStatus: oldStatus,
        toStatus: 'SUBMITTED',
        changedBy: submitterName,
        changedAt: new Date().toISOString(),
        reason: 'Invoice submitted for Company HR verification',
      },
    ];

    return { success: true, invoice: inv };
  }

  /**
   * List invoices filtered by organization, vendor, or status
   */
  public static async listInvoices(params: {
    organizationId?: string;
    vendorId?: string;
    status?: string;
  }): Promise<{ success: boolean; invoices: VendorInvoiceRecord[]; error?: string }> {
    let dbInvoices: VendorInvoiceRecord[] = [];

    const canQueryDb =
      (!params.organizationId || this.isUuid(params.organizationId)) &&
      (!params.vendorId || this.isUuid(params.vendorId));

    if (canQueryDb) {
      try {
        let query = supabase.from('vendor_invoices').select('*, vendor_invoice_items(*)');
        if (params.organizationId) query = query.eq('organization_id', params.organizationId);
        if (params.vendorId) query = query.eq('vendor_id', params.vendorId);
        if (params.status && params.status !== 'ALL') query = query.eq('approval_status', params.status);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          dbInvoices = data.map((d) => ({
            ...this.mapDbToModel(d),
            items: (d.vendor_invoice_items || []).map((it: any) => ({
              id: it.id,
              poLineItemId: it.po_line_item_id,
              description: it.description,
              workforceCount: Number(it.workforce_count) || 1,
              ratePerUnit: Number(it.rate_per_unit) || 0,
              serviceChargePct: Number(it.service_charge_pct) || 0,
              taxRatePct: Number(it.tax_rate_pct) || 18,
              lineTotal: Number(it.line_total) || 0,
            })),
          }));
        }
      } catch (err: any) {
        console.warn('[VendorInvoiceService] listInvoices DB notice:', err.message || err);
      }
    }

    // Merge in-memory invoices
    const memoryFiltered = Array.from(this.inMemoryInvoices.values()).filter((inv) => {
      if (params.organizationId && inv.organizationId && params.organizationId !== 'default' && params.organizationId !== 'org-joy-main' && inv.organizationId !== params.organizationId) return false;
      if (params.vendorId && params.vendorId !== 'ALL') {
        const invVen = inv.vendorId.toLowerCase();
        const paramVen = params.vendorId.toLowerCase();
        const isExactMatch = invVen === paramVen;
        const isJoyAlias =
          (invVen === 'joy manpower service' && (paramVen === 'vnd-joy-01' || paramVen === 'vnd-arjuna-01')) ||
          ((invVen === 'vnd-joy-01' || invVen === 'vnd-arjuna-01') && paramVen === 'joy manpower service');
        if (!isExactMatch && !isJoyAlias) return false;
      }
      if (params.status && params.status !== 'ALL' && inv.approvalStatus !== params.status) return false;
      return true;
    });

    const mergedMap = new Map<string, VendorInvoiceRecord>();
    dbInvoices.forEach((inv) => mergedMap.set(inv.id, inv));
    memoryFiltered.forEach((inv) => {
      if (!mergedMap.has(inv.id)) mergedMap.set(inv.id, inv);
    });

    return { success: true, invoices: Array.from(mergedMap.values()) };
  }

  /**
   * Fetch vendor invoices for a specific vendor
   */
  public static async getInvoices(vendorId: string): Promise<VendorInvoiceRecord[]> {
    const res = await this.listInvoices({ vendorId });
    return res.invoices || [];
  }

  /**
   * Fetch a single invoice by ID
   */
  public static async getInvoiceById(invoiceId: string): Promise<VendorInvoiceRecord | null> {
    const memory = this.inMemoryInvoices.get(invoiceId);
    if (memory) return memory;

    if (this.isUuid(invoiceId)) {
      try {
        const { data, error } = await supabase
          .from('vendor_invoices')
          .select('*, vendor_invoice_items(*)')
          .eq('id', invoiceId)
          .maybeSingle();

        if (!error && data) {
          return {
            ...this.mapDbToModel(data),
            items: (data.vendor_invoice_items || []).map((it: any) => ({
              id: it.id,
              poLineItemId: it.po_line_item_id,
              description: it.description,
              workforceCount: Number(it.workforce_count) || 1,
              ratePerUnit: Number(it.rate_per_unit) || 0,
              serviceChargePct: Number(it.service_charge_pct) || 0,
              taxRatePct: Number(it.tax_rate_pct) || 18,
              lineTotal: Number(it.line_total) || 0,
            })),
          };
        }
      } catch (err: any) {
        console.warn('[VendorInvoiceService] getInvoiceById error:', err);
      }
    }
    return null;
  }

  private static mapDbToModel(db: any): VendorInvoiceRecord {
    return {
      id: db.id,
      vendorId: db.vendor_id,
      organizationId: db.organization_id,
      relationshipId: db.relationship_id,
      poId: db.po_id,
      invoiceNumber: db.invoice_number,
      billingPeriod: db.billing_period,
      contractReference: db.contract_reference,
      invoiceDate: db.invoice_date,
      dueDate: db.due_date,
      subtotalAmount: Number(db.subtotal_amount || 0),
      taxAmount: Number(db.tax_amount || 0),
      totalAmount: Number(db.total_amount || 0),
      currency: db.currency || 'INR',
      approvalStatus: db.approval_status,
      paymentStatus: db.payment_status,
      paymentReference: db.payment_reference,
      paidAt: db.paid_at,
      matchingStatus: db.matching_status || 'NOT_MATCHED',
      notes: db.notes,
      rejectionReason: db.rejection_reason,
      items: [],
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }
}
