// src/services/vendor/purchaseOrderService.ts
// ============================================================================
// Joy PeopleHR — Purchase Order & Procurement Service
// Handles PO creation, calculations, company approvals, vendor responses,
// revisions, and multi-tenant RLS DB operations with resilient fallback
// ============================================================================

import { supabase } from '../../lib/supabase';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderRevision,
  PurchaseOrderApprovalRecord,
  PurchaseOrderStatus,
} from '../../types/vendorPortal';

export class PurchaseOrderService {
  private static inMemoryPOs: Map<string, PurchaseOrder> = new Map();
  private static inMemoryApprovals: Map<string, PurchaseOrderApprovalRecord[]> = new Map();
  private static inMemoryRevisions: Map<string, PurchaseOrderRevision[]> = new Map();

  static {
    const poArjuna: PurchaseOrder = {
      id: 'po-arjuna-2026-07',
      organizationId: 'org-joy-main',
      vendorId: 'JOY MANPOWER SERVICE',
      poNumber: 'PO-ARJUNA-2026-07',
      contractReference: 'CON-ARJUNA-MANPOWER-2026',
      servicePeriod: '2026-07',
      poDate: '2026-07-01',
      validFrom: '2026-07-01',
      validUntil: '2026-07-31',
      currency: 'INR',
      paymentTerms: 'Net 30',
      deliveryLocation: 'Arjuna Natural Plant Site - Unit 2',
      department: 'Manpower Operations',
      subtotalAmount: 101506.0,
      discountAmount: 0,
      taxableAmount: 101506.0,
      taxAmount: 18271.08,
      grandTotal: 119777.08,
      status: 'APPROVED',
      notes: 'Approved Manpower Purchase Order for July 2026 workforce deployment',
      items: [
        {
          id: 'poi-1',
          poId: 'po-arjuna-2026-07',
          category: 'MANPOWER_SERVICES',
          description: "Contract Workforce Wages (Workings gross July'26)",
          quantity: 84.5,
          unit: 'DAYS',
          unitPrice: 620,
          discountPct: 0,
          taxRatePct: 18.0,
          lineTotal: 93473.7,
        },
        {
          id: 'poi-2',
          poId: 'po-arjuna-2026-07',
          category: 'STATUTORY_PF',
          description: 'Employer PF @ 13% on Wages',
          quantity: 1,
          unit: 'MONTH',
          unitPrice: 6810.7,
          discountPct: 0,
          taxRatePct: 18.0,
          lineTotal: 8036.63,
        },
        {
          id: 'poi-3',
          poId: 'po-arjuna-2026-07',
          category: 'STATUTORY_ESI',
          description: 'Employer ESI @ 3.25% on Wages',
          quantity: 1,
          unit: 'MONTH',
          unitPrice: 1702.68,
          discountPct: 0,
          taxRatePct: 18.0,
          lineTotal: 2009.16,
        },
        {
          id: 'poi-4',
          poId: 'po-arjuna-2026-07',
          category: 'SERVICE_CHARGE',
          description: 'Agency Service Charge @ 8% on Gross',
          quantity: 1,
          unit: 'MONTH',
          unitPrice: 6337.2,
          discountPct: 0,
          taxRatePct: 18.0,
          lineTotal: 7477.9,
        },
        {
          id: 'poi-5',
          poId: 'po-arjuna-2026-07',
          category: 'ALLOWANCE_ROOM',
          description: 'Room Allowance (Approved Billable Allowance)',
          quantity: 93,
          unit: 'DAYS',
          unitPrice: 80.0,
          discountPct: 0,
          taxRatePct: 18.0,
          lineTotal: 8779.2,
        },
      ],
      createdAt: '2026-07-01T09:00:00.000Z',
      updatedAt: '2026-07-01T09:00:00.000Z',
    };
    poArjuna.lineItems = poArjuna.items;
    this.inMemoryPOs.set(poArjuna.id, poArjuna);
  }

  /**
   * Helper: check if string is a valid UUID
   */
  private static isUuid(val?: string): boolean {
    return (
      typeof val === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
    );
  }

  /**
   * Decimal-safe calculation of PO line totals, taxes, and grand totals
   */
  public static calculateTotals(
    items: Omit<PurchaseOrderItem, 'id' | 'poId' | 'lineTotal'>[]
  ): {
    calculatedItems: Omit<PurchaseOrderItem, 'id' | 'poId'>[];
    subtotalAmount: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    grandTotal: number;
  } {
    const rawItems = items || [];
    let subtotalAmount = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    const calculatedItems = rawItems.map((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const discPct = Number(item.discountPct) || 0;
      const taxRate = Number(item.taxRatePct) || 18.0;

      const baseAmount = Math.round(qty * price * 100) / 100;
      const itemDisc = Math.round(baseAmount * (discPct / 100) * 100) / 100;
      const itemTaxable = baseAmount - itemDisc;
      const itemTax = Math.round(itemTaxable * (taxRate / 100) * 100) / 100;
      const lineTotal = itemTaxable + itemTax;

      subtotalAmount += baseAmount;
      discountAmount += itemDisc;
      taxAmount += itemTax;

      return {
        ...item,
        quantity: qty,
        unitPrice: price,
        discountPct: discPct,
        taxRatePct: taxRate,
        lineTotal: Math.round(lineTotal * 100) / 100,
      };
    });

    const taxableAmount = subtotalAmount - discountAmount;
    const grandTotal = taxableAmount + taxAmount;

    return {
      calculatedItems,
      subtotalAmount: Math.round(subtotalAmount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }

  /**
   * Create a Purchase Order (Company HR / Procurement)
   */
  public static async createPurchaseOrder(input: {
    organizationId: string;
    vendorId: string;
    vendorName?: string;
    vendorCode?: string;
    relationshipId?: string;
    poNumber?: string;
    contractReference?: string;
    vendorContactEmail?: string;
    servicePeriod?: string;
    poDate?: string;
    validFrom?: string;
    validUntil?: string;
    currency?: string;
    paymentTerms?: string;
    paymentTermsDays?: number;
    deliveryLocation?: string;
    costCenter?: string;
    department?: string;
    requestingManager?: string;
    notes?: string;
    submitForApproval?: boolean;
    createdBy?: string;
    lineItems?: Omit<PurchaseOrderItem, 'id' | 'poId' | 'lineTotal'>[];
    items?: Omit<PurchaseOrderItem, 'id' | 'poId' | 'lineTotal'>[];
  }): Promise<{ success: boolean; po?: PurchaseOrder; error?: string }> {
    const rawItems = input.lineItems || input.items || [];
    const poNumber = input.poNumber || `PO-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const totals = this.calculateTotals(rawItems);
    const initialStatus: PurchaseOrderStatus = input.submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT';
    const period = input.servicePeriod || new Date().toISOString().substring(0, 7);

    // Build model
    const fallbackId = `po-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const calculatedItemsList: PurchaseOrderItem[] = totals.calculatedItems.map((item, idx) => ({
      id: `poi-${idx + 1}-${Date.now()}`,
      poId: fallbackId,
      description: item.description,
      category: item.category || 'MANPOWER_SERVICES',
      quantity: item.quantity,
      unit: item.unit || 'HOURS',
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
      taxRatePct: item.taxRatePct,
      lineTotal: item.lineTotal,
      servicePeriod: item.servicePeriod || period,
      notes: item.notes,
    }));

    const memoryPo: PurchaseOrder = {
      id: fallbackId,
      organizationId: input.organizationId,
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      vendorCode: input.vendorCode,
      relationshipId: input.relationshipId,
      poNumber,
      contractReference: input.contractReference,
      servicePeriod: period,
      poDate: input.poDate || new Date().toISOString().split('T')[0],
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      currency: input.currency || 'INR',
      paymentTerms: input.paymentTerms || (input.paymentTermsDays ? `Net ${input.paymentTermsDays}` : 'Net 30'),
      deliveryLocation: input.deliveryLocation,
      costCenter: input.costCenter,
      department: input.department,
      requestingManager: input.requestingManager,
      subtotalAmount: totals.subtotalAmount,
      discountAmount: totals.discountAmount,
      taxableAmount: totals.taxableAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      status: initialStatus,
      notes: input.notes,
      items: calculatedItemsList,
      lineItems: calculatedItemsList,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in-memory
    this.inMemoryPOs.set(memoryPo.id, memoryPo);

    // Attempt DB persistence if UUIDs are valid
    if (this.isUuid(input.organizationId) && this.isUuid(input.vendorId)) {
      try {
        const { data: poRow, error: poErr } = await supabase
          .from('purchase_orders')
          .insert({
            organization_id: input.organizationId,
            vendor_id: input.vendorId,
            relationship_id: this.isUuid(input.relationshipId) ? input.relationshipId : null,
            po_number: poNumber,
            contract_reference: input.contractReference,
            service_period: period,
            po_date: input.poDate || new Date().toISOString().split('T')[0],
            valid_from: input.validFrom,
            valid_until: input.validUntil,
            currency: input.currency || 'INR',
            payment_terms: memoryPo.paymentTerms,
            delivery_location: input.deliveryLocation,
            cost_center: input.costCenter,
            department: input.department,
            requesting_manager: input.requestingManager,
            subtotal_amount: totals.subtotalAmount,
            discount_amount: totals.discountAmount,
            taxable_amount: totals.taxableAmount,
            tax_amount: totals.taxAmount,
            grand_total: totals.grandTotal,
            status: initialStatus,
            notes: input.notes,
            created_by: this.isUuid(input.createdBy) ? input.createdBy : null,
          })
          .select()
          .single();

        if (poErr) {
          console.warn('[PurchaseOrderService] DB Insert notice:', poErr.message || poErr);
        } else if (poRow) {
          const itemInserts = totals.calculatedItems.map((item) => ({
            po_id: poRow.id,
            description: item.description,
            category: item.category || 'MANPOWER_SERVICES',
            quantity: item.quantity,
            unit: item.unit || 'HOURS',
            unit_price: item.unitPrice,
            discount_pct: item.discountPct,
            tax_rate_pct: item.taxRatePct,
            line_total: item.lineTotal,
            service_period: item.servicePeriod || period,
            notes: item.notes,
          }));

          const { data: itemRows } = await supabase.from('purchase_order_items').insert(itemInserts).select();

          const dbModel = this.mapDbToModel(poRow, itemRows || []);
          this.inMemoryPOs.set(dbModel.id, dbModel);
          return { success: true, po: dbModel };
        }
      } catch (err: any) {
        console.warn('[PurchaseOrderService] DB Insert fallback to memory store:', err.message || err);
      }
    }

    return { success: true, po: memoryPo };
  }

  /**
   * Internal Company PO Approval / Rejection Action
   */
  public static async approvePurchaseOrder(
    inputOrPoId:
      | string
      | {
          poId: string;
          approverId?: string;
          approverName?: string;
          approverRole?: string;
          action?: 'APPROVED' | 'REJECTED';
          comments?: string;
        },
    approverNameOrEmail?: string,
    comments?: string
  ): Promise<{ success: boolean; po?: PurchaseOrder; error?: string }> {
    let poId: string;
    let approverName: string;
    let approverRole: string;
    let action: 'APPROVED' | 'REJECTED';
    let commentStr: string | undefined;

    if (typeof inputOrPoId === 'string') {
      poId = inputOrPoId;
      approverName = approverNameOrEmail || 'Company HR Approver';
      approverRole = 'COMPANY_APPROVER';
      action = 'APPROVED';
      commentStr = comments;
    } else {
      poId = inputOrPoId.poId;
      approverName = inputOrPoId.approverName || approverNameOrEmail || 'Company HR Approver';
      approverRole = inputOrPoId.approverRole || 'COMPANY_APPROVER';
      action = inputOrPoId.action || 'APPROVED';
      commentStr = inputOrPoId.comments || comments;
    }

    const nextStatus: PurchaseOrderStatus = action === 'APPROVED' ? 'SENT_TO_VENDOR' : 'REJECTED';

    // 1. Update in-memory
    const existingPo = this.inMemoryPOs.get(poId);
    if (existingPo) {
      existingPo.status = nextStatus;
      existingPo.updatedAt = new Date().toISOString();
      const approvalRecord: PurchaseOrderApprovalRecord = {
        id: `appr-${Date.now()}`,
        poId,
        approverName,
        approverRole,
        action,
        comments: commentStr,
        createdAt: new Date().toISOString(),
      };
      existingPo.approvals = [...(existingPo.approvals || []), approvalRecord];
      const prevList = this.inMemoryApprovals.get(poId) || [];
      this.inMemoryApprovals.set(poId, [...prevList, approvalRecord]);
    }

    // 2. Update DB if UUID
    if (this.isUuid(poId)) {
      try {
        const { data: updatedPo, error: updateErr } = await supabase
          .from('purchase_orders')
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', poId)
          .select()
          .single();

        if (!updateErr && updatedPo) {
          await supabase.from('purchase_order_approvals').insert({
            po_id: poId,
            approver_name: approverName,
            approver_role: approverRole,
            action,
            comments: commentStr,
          });

          const { data: items } = await supabase.from('purchase_order_items').select('*').eq('po_id', poId);
          const dbModel = this.mapDbToModel(updatedPo, items || []);
          this.inMemoryPOs.set(poId, dbModel);
          return { success: true, po: dbModel };
        }
      } catch (err: any) {
        console.warn('[PurchaseOrderService] DB Approve fallback:', err.message || err);
      }
    }

    if (existingPo) {
      return { success: true, po: existingPo };
    }

    return { success: true, po: existingPo };
  }

  /**
   * Vendor Portal Action: Accept, Reject, or Request Changes to PO
   */
  public static async respondToPurchaseOrder(input: {
    poId: string;
    actorName?: string;
    action?: 'ACCEPT' | 'REJECT' | 'REQUEST_CHANGES';
    responseType?: 'ACCEPT' | 'REJECT' | 'REQUEST_CHANGES';
    note?: string;
    remarks?: string;
    changeCategory?: string;
    actorEmail?: string;
  }): Promise<{ success: boolean; po?: PurchaseOrder; error?: string }> {
    const act = input.action || input.responseType || 'ACCEPT';
    const note = input.note || input.remarks;
    const actor = input.actorName || input.actorEmail || 'Vendor User';

    let nextStatus: PurchaseOrderStatus = 'ACCEPTED';
    if (act === 'REJECT') nextStatus = 'REJECTED';
    if (act === 'REQUEST_CHANGES') nextStatus = 'CHANGE_REQUESTED';

    // 1. Update in-memory
    const existingPo = this.inMemoryPOs.get(input.poId);
    if (existingPo) {
      existingPo.status = nextStatus;
      existingPo.vendorResponseNote = note;
      existingPo.vendorRespondedAt = new Date().toISOString();
      existingPo.updatedAt = new Date().toISOString();

      if (act === 'REQUEST_CHANGES') {
        const rev: PurchaseOrderRevision = {
          id: `rev-${Date.now()}`,
          poId: input.poId,
          revisionNumber: (existingPo.revisions?.length || 0) + 1,
          changeCategory: input.changeCategory || 'PRICING_QUANTITY',
          changeDescription: note || 'Vendor requested PO modifications',
          requestedByType: 'VENDOR',
          actorName: actor,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        existingPo.revisions = [...(existingPo.revisions || []), rev];
        const prevRevs = this.inMemoryRevisions.get(input.poId) || [];
        this.inMemoryRevisions.set(input.poId, [...prevRevs, rev]);
      }
    }

    // 2. Update DB if UUID
    if (this.isUuid(input.poId)) {
      try {
        const { data: updatedPo, error: updateErr } = await supabase
          .from('purchase_orders')
          .update({
            status: nextStatus,
            vendor_response_note: note,
            vendor_responded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.poId)
          .select()
          .single();

        if (!updateErr && updatedPo) {
          if (act === 'REQUEST_CHANGES') {
            await supabase.from('purchase_order_revisions').insert({
              po_id: input.poId,
              revision_number: 1,
              change_category: input.changeCategory || 'PRICING_QUANTITY',
              change_description: note || 'Vendor requested PO modifications',
              requested_by_type: 'VENDOR',
              actor_name: actor,
              status: 'PENDING',
            });
          }

          const { data: items } = await supabase.from('purchase_order_items').select('*').eq('po_id', input.poId);
          const dbModel = this.mapDbToModel(updatedPo, items || []);
          this.inMemoryPOs.set(input.poId, dbModel);
          return { success: true, po: dbModel };
        }
      } catch (err: any) {
        console.warn('[PurchaseOrderService] DB Respond fallback:', err.message || err);
      }
    }

    if (existingPo) {
      return { success: true, po: existingPo };
    }

    return { success: false, error: 'Purchase Order not found.' };
  }

  public static async recordVendorResponse(input: {
    poId: string;
    vendorId?: string;
    responseType?: 'ACCEPT' | 'REJECT' | 'REQUEST_CHANGES';
    action?: 'ACCEPT' | 'REJECT' | 'REQUEST_CHANGES';
    actorEmail?: string;
    remarks?: string;
    note?: string;
    changeCategory?: string;
  }) {
    return this.respondToPurchaseOrder({
      poId: input.poId,
      actorName: input.actorEmail || 'Vendor User',
      action: input.action || input.responseType || 'ACCEPT',
      note: input.note || input.remarks,
      changeCategory: input.changeCategory,
    });
  }

  /**
   * Fetch Purchase Orders filtered by Org ID or Vendor ID
   */
  public static async getPurchaseOrders(params: {
    organizationId?: string;
    vendorId?: string;
    status?: PurchaseOrderStatus;
  }): Promise<{ success: boolean; pos: PurchaseOrder[]; error?: string }> {
    let dbPos: PurchaseOrder[] = [];

    // Query DB if parameters are valid UUIDs
    const canQueryDb =
      (!params.organizationId || this.isUuid(params.organizationId)) &&
      (!params.vendorId || this.isUuid(params.vendorId));

    if (canQueryDb) {
      try {
        let query = supabase.from('purchase_orders').select('*, purchase_order_items(*)');
        if (params.organizationId) query = query.eq('organization_id', params.organizationId);
        if (params.vendorId) query = query.eq('vendor_id', params.vendorId);
        if (params.status) query = query.eq('status', params.status);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          dbPos = data.map((row) => this.mapDbToModel(row, row.purchase_order_items || []));
        }
      } catch (err: any) {
        console.warn('[PurchaseOrderService] getPurchaseOrders DB query fallback:', err.message || err);
      }
    }

    // Merge in-memory POs
    const memoryFiltered = Array.from(this.inMemoryPOs.values()).filter((p) => {
      if (params.organizationId && p.organizationId && params.organizationId !== 'default' && params.organizationId !== 'org-joy-main' && p.organizationId !== params.organizationId) return false;
      if (params.vendorId) {
        const pVen = p.vendorId.toLowerCase();
        const paramVen = params.vendorId.toLowerCase();
        const isExactMatch = pVen === paramVen;
        const isJoyAlias =
          (pVen === 'joy manpower service' && (paramVen === 'vnd-joy-01' || paramVen === 'vnd-arjuna-01')) ||
          ((pVen === 'vnd-joy-01' || pVen === 'vnd-arjuna-01') && paramVen === 'joy manpower service');
        if (!isExactMatch && !isJoyAlias) return false;
      }
      if (params.status && p.status !== params.status) return false;
      return true;
    });

    // Deduplicate by ID
    const mergedMap = new Map<string, PurchaseOrder>();
    dbPos.forEach((p) => mergedMap.set(p.id, p));
    memoryFiltered.forEach((p) => {
      if (!mergedMap.has(p.id)) mergedMap.set(p.id, p);
    });

    const finalPos = Array.from(mergedMap.values());
    return { success: true, pos: finalPos };
  }

  public static async listPurchaseOrders(params: {
    organizationId?: string;
    vendorId?: string;
    status?: PurchaseOrderStatus;
  }): Promise<PurchaseOrder[]> {
    const res = await this.getPurchaseOrders(params);
    return res.pos || [];
  }

  /**
   * Fetch a single Purchase Order by ID
   */
  public static async getPurchaseOrderById(poId: string): Promise<PurchaseOrder | null> {
    const memory = this.inMemoryPOs.get(poId);
    if (memory) return memory;

    // Also check by poNumber
    for (const po of this.inMemoryPOs.values()) {
      if (po.poNumber === poId) return po;
    }

    if (this.isUuid(poId)) {
      try {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select('*, purchase_order_items(*)')
          .eq('id', poId)
          .maybeSingle();
        if (!error && data) {
          return this.mapDbToModel(data, data.purchase_order_items || []);
        }
      } catch (err: any) {
        console.warn('[PurchaseOrderService] getPurchaseOrderById error:', err.message || err);
      }
    }
    return null;
  }

  /**
   * Helper: Map DB row to TypeScript Model
   */
  private static mapDbToModel(poRow: any, itemRows: any[]): PurchaseOrder {
    const items: PurchaseOrderItem[] = (itemRows || []).map((it) => ({
      id: it.id,
      poId: it.po_id,
      description: it.description,
      category: it.category,
      quantity: Number(it.quantity) || 0,
      unit: it.unit,
      unitPrice: Number(it.unit_price) || 0,
      discountPct: Number(it.discount_pct) || 0,
      taxRatePct: Number(it.tax_rate_pct) || 18,
      lineTotal: Number(it.line_total) || 0,
      servicePeriod: it.service_period,
      notes: it.notes,
    }));

    return {
      id: poRow.id,
      organizationId: poRow.organization_id,
      vendorId: poRow.vendor_id,
      relationshipId: poRow.relationship_id,
      poNumber: poRow.po_number,
      contractReference: poRow.contract_reference,
      servicePeriod: poRow.service_period,
      poDate: poRow.po_date,
      validFrom: poRow.valid_from,
      validUntil: poRow.valid_until,
      currency: poRow.currency || 'INR',
      paymentTerms: poRow.payment_terms || 'Net 30',
      deliveryLocation: poRow.delivery_location,
      costCenter: poRow.cost_center,
      department: poRow.department,
      requestingManager: poRow.requesting_manager,
      subtotalAmount: Number(poRow.subtotal_amount) || 0,
      discountAmount: Number(poRow.discount_amount) || 0,
      taxableAmount: Number(poRow.taxable_amount) || 0,
      taxAmount: Number(poRow.tax_amount) || 0,
      grandTotal: Number(poRow.grand_total) || 0,
      status: poRow.status,
      vendorResponseNote: poRow.vendor_response_note,
      vendorRespondedAt: poRow.vendor_responded_at,
      notes: poRow.notes,
      items,
      lineItems: items,
      createdBy: poRow.created_by,
      createdAt: poRow.created_at,
      updatedAt: poRow.updated_at,
    };
  }
}
