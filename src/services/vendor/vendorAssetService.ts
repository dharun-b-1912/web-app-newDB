// src/services/vendor/vendorAssetService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Vendor Worker Asset & Custody Governance Service
// Manages asset catalog, issuance, returnable vs non-returnable classification,
// damage/loss penalties, multi-tenant scoping, and payroll/invoice deduction linkages.
// ============================================================================

import { ControlledDeductionRecord } from '../../types/payrollAudit';
import { VendorWorkforceService, VendorWorkerRecord } from './vendorWorkforceService';
import { api } from '../api';

export type AssetCategory =
  | 'SAFETY_PPE'
  | 'UNIFORM'
  | 'ID_ACCESS_CARD'
  | 'TOOL_EQUIPMENT'
  | 'IT_HARDWARE'
  | 'COMMUNICATION'
  | 'MEASURING_INSTRUMENT'
  | 'OTHER';

export type AssetReturnableType = 'RETURNABLE' | 'NON_RETURNABLE';

export type AssetCondition = 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'LOST';

export type AssetIssuanceStatus =
  | 'ISSUED'
  | 'RETURNED_VERIFIED'
  | 'RETURN_OVERDUE'
  | 'DAMAGED'
  | 'LOST'
  | 'DEDUCTED';

export type DeductionTarget =
  | 'NO_DEDUCTION'
  | 'WORKER_PAYROLL_DEDUCTION'     // Deducted from worker's wages in Wage Engine
  | 'VENDOR_INVOICE_DEDUCTION'    // Client debit note deducted on vendor invoice
  | 'CLIENT_REIMBURSABLE_BILLING'; // Vendor bills client on invoice (pass-through)

export type DeductionStatus =
  | 'NOT_APPLICABLE'
  | 'PENDING_APPROVAL'
  | 'STAGED_FOR_INVOICE'
  | 'STAGED_FOR_PAYROLL'
  | 'APPLIED_TO_INVOICE'
  | 'APPLIED_TO_PAYROLL'
  | 'WAIVED';

export interface VendorAssetAllocationRecord {
  id: string;
  organizationId: string;
  vendorId: string;
  vendorName?: string;
  siteId?: string;
  siteName?: string;

  // Worker Information (Auto-fetched & linked)
  workerId?: string;
  workerCode: string;
  workerName: string;
  workerRole?: string;
  workerDepartment?: string;

  // Asset Details
  assetName: string;
  category: AssetCategory;
  serialNumber?: string;
  barcode?: string;
  specifications?: string;

  // Pricing & Returnability
  returnableType: AssetReturnableType;
  unitPrice: number; // Cost of asset / amount in ₹
  quantity: number;
  totalValue: number;

  // Issuance Dates
  issuedDate: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  issuedBy: string;

  // Return & Condition Inspection
  conditionAtIssue: AssetCondition;
  conditionAtReturn?: AssetCondition;
  returnRemarks?: string;

  // Status & Deduction / Recovery Workflow
  status: AssetIssuanceStatus;
  deductionTarget: DeductionTarget;
  deductionStatus: DeductionStatus;
  deductionAmount: number; // ₹ amount to deduct from worker wages or vendor invoice
  deductionReason?: string;
  deductionReference?: string;
  linkedInvoiceNumber?: string;
  linkedWageMonth?: string;

  createdAt: string;
  updatedAt: string;
}

export interface AssetCatalogPreset {
  id: string;
  name: string;
  category: AssetCategory;
  returnableType: AssetReturnableType;
  defaultPrice: number;
  defaultDeductionTarget: DeductionTarget;
  defaultDeductionAmount: number;
  description: string;
}

// ============================================================================
// STANDARD ASSET CATALOG PRESETS (Auto-populates prices, returnability & rules)
// ============================================================================
export const STANDARD_ASSET_CATALOG: AssetCatalogPreset[] = [
  {
    id: 'CAT-PPE-01',
    name: 'Industrial Safety Helmet & High-Vis Vest',
    category: 'SAFETY_PPE',
    returnableType: 'NON_RETURNABLE',
    defaultPrice: 650,
    defaultDeductionTarget: 'WORKER_PAYROLL_DEDUCTION',
    defaultDeductionAmount: 650,
    description: 'EN 397 Certified Hard Hat + Class 2 reflective safety vest kit',
  },
  {
    id: 'CAT-PPE-02',
    name: 'Steel Toe Safety Boots (ISI 15298)',
    category: 'SAFETY_PPE',
    returnableType: 'NON_RETURNABLE',
    defaultPrice: 1200,
    defaultDeductionTarget: 'WORKER_PAYROLL_DEDUCTION',
    defaultDeductionAmount: 1200,
    description: 'Oil & chemical resistant sole, 200J impact resistant steel cap',
  },
  {
    id: 'CAT-UNI-01',
    name: 'Company Uniform Workwear (2 Sets)',
    category: 'UNIFORM',
    returnableType: 'NON_RETURNABLE',
    defaultPrice: 900,
    defaultDeductionTarget: 'WORKER_PAYROLL_DEDUCTION',
    defaultDeductionAmount: 900,
    description: 'Cotton-poly blend industrial shirts & trousers with vendor insignia',
  },
  {
    id: 'CAT-ID-01',
    name: 'RFID Smart Access & Biometric Gate Card',
    category: 'ID_ACCESS_CARD',
    returnableType: 'RETURNABLE',
    defaultPrice: 350,
    defaultDeductionTarget: 'WORKER_PAYROLL_DEDUCTION',
    defaultDeductionAmount: 350,
    description: '13.56 MHz encrypted contactless badge for site turnstiles',
  },
  {
    id: 'CAT-TOOL-01',
    name: 'Certified Electrical Maintenance Toolkit',
    category: 'TOOL_EQUIPMENT',
    returnableType: 'RETURNABLE',
    defaultPrice: 4500,
    defaultDeductionTarget: 'VENDOR_INVOICE_DEDUCTION',
    defaultDeductionAmount: 4500,
    description: '1000V Insulated VDE pliers, screwdrivers, crimpers & rugged case',
  },
  {
    id: 'CAT-INST-01',
    name: 'Digital Multimeter & AC/DC Testing Clamp',
    category: 'MEASURING_INSTRUMENT',
    returnableType: 'RETURNABLE',
    defaultPrice: 2800,
    defaultDeductionTarget: 'VENDOR_INVOICE_DEDUCTION',
    defaultDeductionAmount: 2800,
    description: 'True RMS digital clamp meter with NIST calibration certificate',
  },
  {
    id: 'CAT-COMM-01',
    name: 'Two-Way UHF Walkie-Talkie Set',
    category: 'COMMUNICATION',
    returnableType: 'RETURNABLE',
    defaultPrice: 3200,
    defaultDeductionTarget: 'VENDOR_INVOICE_DEDUCTION',
    defaultDeductionAmount: 3200,
    description: '16-channel 5W UHF industrial radio transceiver with earpiece',
  },
  {
    id: 'CAT-PPE-03',
    name: 'Full Body Fall Arrest Harness & Lanyard',
    category: 'SAFETY_PPE',
    returnableType: 'RETURNABLE',
    defaultPrice: 2400,
    defaultDeductionTarget: 'VENDOR_INVOICE_DEDUCTION',
    defaultDeductionAmount: 2400,
    description: 'IS 3521 Class A harness with energy absorber & scaffolding hooks',
  },
  {
    id: 'CAT-PPE-04',
    name: 'Protective Goggles & Cartridge Respirator',
    category: 'SAFETY_PPE',
    returnableType: 'NON_RETURNABLE',
    defaultPrice: 450,
    defaultDeductionTarget: 'NO_DEDUCTION',
    defaultDeductionAmount: 0,
    description: 'Anti-fog chemical splash goggles and dual particulate respirator',
  },
  {
    id: 'CAT-IT-01',
    name: 'Rugged Warehouse Handheld Barcode Scanner',
    category: 'IT_HARDWARE',
    returnableType: 'RETURNABLE',
    defaultPrice: 18500,
    defaultDeductionTarget: 'VENDOR_INVOICE_DEDUCTION',
    defaultDeductionAmount: 18500,
    description: 'Android 13 IP65 mobile terminal with 2D long-range imager',
  },
];

const STORAGE_KEY_ASSETS = 'workforceos_vendor_asset_allocations_v1';
const STORAGE_KEY_CONTROLLED_DEDS = 'workforceos_controlled_deductions_v1';

// Zero-mock policy: Asset allocations start empty and are populated strictly by live operations and database records
const SEED_ALLOCATIONS: VendorAssetAllocationRecord[] = [];

export interface AutoFetchedWorkerOption {
  code: string;
  name: string;
  role: string;
  department: string;
  vendorId?: string;
  status?: string;
}

const MOCK_ASSET_IDS = new Set(['AST-2026-001', 'AST-2026-002', 'AST-2026-003', 'AST-2026-004', 'AST-2026-005']);
const MOCK_WORKER_CODES = new Set(['20385', '20392', '20398', '20401', '20412', '20420', '20433']);
const MOCK_DED_IDS = new Set(['DED-REC-001', 'DED-REC-002', 'DED-REC-003']);

let inMemoryAllocations: VendorAssetAllocationRecord[] = [];
let inMemoryControlledDeds: ControlledDeductionRecord[] = [];

export class VendorAssetService {
  /**
   * Purges all legacy mock data from storage and memory
   */
  public static clearMockData(): void {
    inMemoryAllocations = [];
    inMemoryControlledDeds = [];
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_ASSETS);
        localStorage.removeItem(STORAGE_KEY_CONTROLLED_DEDS);
      }
    } catch (_) {}
  }

  /**
   * Retrieves persistent allocations from localStorage or in-memory fallback, purging any legacy mock items
   */
  public static getAllocations(params?: {
    organizationId?: string;
    vendorId?: string;
    siteId?: string;
  }): VendorAssetAllocationRecord[] {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ASSETS) : null;
      let list: VendorAssetAllocationRecord[] = raw ? JSON.parse(raw) : inMemoryAllocations;

      // Purge any legacy mock records from old sessions
      const cleanList = list.filter((a) => !MOCK_ASSET_IDS.has(a.id));
      if (cleanList.length !== list.length) {
        list = cleanList;
        inMemoryAllocations = cleanList;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(cleanList));
        }
      }

      if (params?.organizationId) {
        list = list.filter((a) => !a.organizationId || a.organizationId === params.organizationId);
      }
      if (params?.vendorId) {
        list = list.filter((a) => !a.vendorId || a.vendorId === params.vendorId);
      }
      if (params?.siteId) {
        list = list.filter((a) => !a.siteId || a.siteId === params.siteId);
      }

      return list;
    } catch {
      return [...inMemoryAllocations];
    }
  }

  /**
   * Persists updated allocations array to localStorage and in-memory store
   */
  public static saveAllocations(list: VendorAssetAllocationRecord[]): void {
    const cleanList = list.filter((a) => !MOCK_ASSET_IDS.has(a.id));
    inMemoryAllocations = [...cleanList];
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ASSETS, JSON.stringify(cleanList));
      }
    } catch (e) {
      console.warn('[VendorAssetService] Failed to persist allocations:', e);
    }
  }

  /**
   * Automatically aggregates live worker candidates from VendorWorkforceService, Supabase DB, and master employees
   */
  public static async getAvailableWorkers(vendorCode?: string): Promise<AutoFetchedWorkerOption[]> {
    const map = new Map<string, AutoFetchedWorkerOption>();

    // 1. Live Vendor Workers from Supabase vendor_workers table
    try {
      const vendorWorkers = await VendorWorkforceService.getVendorWorkers(vendorCode || '');
      for (const w of vendorWorkers) {
        if (!MOCK_WORKER_CODES.has(w.workerCode)) {
          map.set(w.workerCode, {
            code: w.workerCode,
            name: w.fullName,
            role: w.designation || 'Field Staff',
            department: w.department || 'Operations',
            vendorId: w.vendorId,
            status: w.status,
          });
        }
      }
    } catch (e) {
      console.warn('[VendorAssetService] Error loading vendor workers via service:', e);
    }

    // 2. From local persistent store in VendorWorkforceService
    try {
      const localWorkers = VendorWorkforceService.getLocalWorkers();
      for (const w of localWorkers) {
        if (!vendorCode || !w.vendorId || w.vendorId === vendorCode) {
          const key = w.workerCode || w.id;
          if (!MOCK_WORKER_CODES.has(key) && !map.has(key)) {
            map.set(key, {
              code: key,
              name: w.fullName,
              role: w.designation || 'Field Staff',
              department: w.department || 'Operations',
              vendorId: w.vendorId,
              status: w.status,
            });
          }
        }
      }
    } catch (e) {
      console.warn('[VendorAssetService] Error loading local workers:', e);
    }

    // 3. From actual master employees via API (e.g., live Supabase employees: Danya R, Thirumalai R K, Dharun B)
    try {
      const empList = (await api.getEmployees()) || [];
      for (const emp of empList) {
        const c = emp.employee_code || emp.id;
        if (c && !map.has(c) && !MOCK_WORKER_CODES.has(c)) {
          const empVendorId = emp.vendor_id || emp.employment?.vendor_id;
          const matchesVendor = !vendorCode || !empVendorId || empVendorId === vendorCode;
          if (matchesVendor) {
            const name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
            map.set(c, {
              code: c,
              name,
              role: (emp as any).designation || emp.designation_title || 'Staff',
              department: (emp as any).department || emp.department_name || 'General',
              status: emp.status || 'ACTIVE',
            });
          }
        }
      }
    } catch (e) {
      console.warn('[VendorAssetService] Error loading employees:', e);
    }

    // Return strictly authentic, non-mock records
    return Array.from(map.values()).filter((w) => !MOCK_WORKER_CODES.has(w.code));
  }

  /**
   * Issues a new asset to a worker with automated pricing and deduction rules
   */
  public static issueAsset(input: {
    organizationId: string;
    vendorId: string;
    vendorName?: string;
    siteId?: string;
    siteName?: string;
    workerCode: string;
    workerName: string;
    workerRole?: string;
    workerDepartment?: string;
    assetName: string;
    category: AssetCategory;
    serialNumber?: string;
    barcode?: string;
    specifications?: string;
    returnableType: AssetReturnableType;
    unitPrice: number;
    quantity?: number;
    issuedDate?: string;
    expectedReturnDate?: string;
    issuedBy?: string;
    conditionAtIssue?: AssetCondition;
    deductionTarget: DeductionTarget;
    deductionAmount: number;
    deductionReason?: string;
  }): VendorAssetAllocationRecord {
    const list = this.getAllocations();
    const qty = input.quantity && input.quantity > 0 ? input.quantity : 1;
    const totalVal = Math.round(input.unitPrice * qty * 100) / 100;

    const refNumber = `AST-DED-${Date.now().toString().slice(-5)}`;

    const newRecord: VendorAssetAllocationRecord = {
      id: `AST-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      organizationId: input.organizationId,
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      siteId: input.siteId,
      siteName: input.siteName,
      workerCode: input.workerCode,
      workerName: input.workerName,
      workerRole: input.workerRole || 'Contract Worker',
      workerDepartment: input.workerDepartment || 'Operations',
      assetName: input.assetName,
      category: input.category,
      serialNumber: input.serialNumber,
      barcode: input.barcode,
      specifications: input.specifications,
      returnableType: input.returnableType,
      unitPrice: input.unitPrice,
      quantity: qty,
      totalValue: totalVal,
      issuedDate: input.issuedDate || new Date().toISOString().split('T')[0],
      expectedReturnDate: input.returnableType === 'RETURNABLE' ? input.expectedReturnDate : undefined,
      issuedBy: input.issuedBy || 'Operations Lead',
      conditionAtIssue: input.conditionAtIssue || 'NEW',
      status: 'ISSUED',
      deductionTarget: input.deductionTarget,
      deductionStatus: input.deductionAmount > 0 ? 'PENDING_APPROVAL' : 'NOT_APPLICABLE',
      deductionAmount: input.deductionAmount,
      deductionReason: input.deductionReason || (input.deductionAmount > 0 ? `${input.assetName} issue recovery` : undefined),
      deductionReference: input.deductionAmount > 0 ? refNumber : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newRecord);
    this.saveAllocations(list);

    // If worker deduction is selected, auto-stage into controlled deductions
    if (input.deductionTarget === 'WORKER_PAYROLL_DEDUCTION' && input.deductionAmount > 0) {
      this.pushToControlledPayrollDeductions(newRecord);
    }

    return newRecord;
  }

  /**
   * Process asset return with condition inspection
   */
  public static processReturn(params: {
    allocationId: string;
    actualReturnDate: string;
    conditionAtReturn: AssetCondition;
    returnRemarks?: string;
    assessedDamagePenalty?: number;
    penaltyDeductionTarget?: DeductionTarget;
  }): VendorAssetAllocationRecord {
    const list = this.getAllocations();
    const idx = list.findIndex((a) => a.id === params.allocationId);
    if (idx === -1) throw new Error('Asset allocation record not found');

    const asset = list[idx];
    const isDamagedOrLost = params.conditionAtReturn === 'DAMAGED' || params.conditionAtReturn === 'LOST';
    const penaltyAmt = params.assessedDamagePenalty || 0;

    const updated: VendorAssetAllocationRecord = {
      ...asset,
      actualReturnDate: params.actualReturnDate,
      conditionAtReturn: params.conditionAtReturn,
      returnRemarks: params.returnRemarks,
      status: params.conditionAtReturn === 'DAMAGED'
        ? 'DAMAGED'
        : params.conditionAtReturn === 'LOST'
        ? 'LOST'
        : 'RETURNED_VERIFIED',
      updatedAt: new Date().toISOString(),
    };

    if (isDamagedOrLost && penaltyAmt > 0) {
      updated.deductionAmount = penaltyAmt;
      updated.deductionTarget = params.penaltyDeductionTarget || 'VENDOR_INVOICE_DEDUCTION';
      updated.deductionStatus = 'PENDING_APPROVAL';
      updated.deductionReason = `${asset.assetName} [${params.conditionAtReturn}] recovery penalty`;
      updated.deductionReference = `DMG-REC-${Date.now().toString().slice(-4)}`;

      if (updated.deductionTarget === 'WORKER_PAYROLL_DEDUCTION') {
        this.pushToControlledPayrollDeductions(updated);
      }
    }

    list[idx] = updated;
    this.saveAllocations(list);
    return updated;
  }

  /**
   * Push an asset recovery deduction into the Governed / Controlled Payroll Deductions registry
   */
  public static pushToControlledPayrollDeductions(asset: VendorAssetAllocationRecord): void {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CONTROLLED_DEDS) : null;
      const records: ControlledDeductionRecord[] = raw ? JSON.parse(raw) : [];

      const categoryMap: Record<AssetCategory, any> = {
        UNIFORM: 'UNIFORM',
        SAFETY_PPE: 'SAFETY_SHOE',
        TOOL_EQUIPMENT: 'TOOL_EQUIPMENT_LOSS',
        IT_HARDWARE: 'TOOL_EQUIPMENT_LOSS',
        COMMUNICATION: 'TOOL_EQUIPMENT_LOSS',
        MEASURING_INSTRUMENT: 'TOOL_EQUIPMENT_LOSS',
        ID_ACCESS_CARD: 'OTHER_GOVERNED_DEDUCTION',
        OTHER: 'OTHER_GOVERNED_DEDUCTION',
      };

      const newDed: ControlledDeductionRecord = {
        id: `DED-AST-${Date.now().toString().slice(-5)}`,
        employeeId: `EMP-${asset.workerCode}`,
        employeeCode: asset.workerCode,
        employeeName: asset.workerName,
        category: categoryMap[asset.category] || 'OTHER_GOVERNED_DEDUCTION',
        amount: asset.deductionAmount,
        reason: asset.deductionReason || `${asset.assetName} asset recovery`,
        referenceNumber: asset.deductionReference || `AST-${asset.id}`,
        source: 'HR_WELFARE_LEDGER',
        enteredBy: 'Asset Management Desk',
        approvedBy: 'HR Operations Lead',
        supportingDocRef: `ASSET-ISSUANCE-${asset.id}.pdf`,
        effectivePeriod: asset.linkedWageMonth || '2026-09',
        createdAt: new Date().toISOString(),
        status: 'APPROVED',
      };

      // Avoid duplicate references
      if (!records.some((r) => r.referenceNumber === newDed.referenceNumber)) {
        records.unshift(newDed);
        inMemoryControlledDeds = [...records];
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_CONTROLLED_DEDS, JSON.stringify(records));
        }
      }
    } catch (e) {
      console.warn('[VendorAssetService] Error pushing to controlled deductions:', e);
    }
  }

  public static getControlledDeductions(): ControlledDeductionRecord[] {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CONTROLLED_DEDS) : null;
      let list: ControlledDeductionRecord[] = raw ? JSON.parse(raw) : inMemoryControlledDeds;
      const cleanList = list.filter((d) => !MOCK_DED_IDS.has(d.id));
      if (cleanList.length !== list.length) {
        list = cleanList;
        inMemoryControlledDeds = cleanList;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_CONTROLLED_DEDS, JSON.stringify(cleanList));
        }
      }
      return list;
    } catch {
      return inMemoryControlledDeds;
    }
  }

  /**
   * Marks deduction as staged for the Vendor Invoice / 3-Way Match debit note
   */
  public static stageForInvoice(allocationId: string, invoiceRef?: string): VendorAssetAllocationRecord {
    const list = this.getAllocations();
    const idx = list.findIndex((a) => a.id === allocationId);
    if (idx === -1) throw new Error('Allocation record not found');

    list[idx] = {
      ...list[idx],
      deductionStatus: 'STAGED_FOR_INVOICE',
      linkedInvoiceNumber: invoiceRef || `INV-DEB-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString(),
    };

    this.saveAllocations(list);
    return list[idx];
  }

  /**
   * Delete or archive an allocation
   */
  public static deleteAllocation(id: string): void {
    const list = this.getAllocations().filter((a) => a.id !== id);
    this.saveAllocations(list);
  }

  /**
   * Calculates KPI summary statistics
   */
  public static getSummaryMetrics(params?: {
    organizationId?: string;
    vendorId?: string;
    siteId?: string;
  }) {
    const list = this.getAllocations(params);

    const totalAllocated = list.length;
    const returnableInField = list.filter((a) => a.returnableType === 'RETURNABLE' && a.status === 'ISSUED').length;
    const nonReturnableIssued = list.filter((a) => a.returnableType === 'NON_RETURNABLE').length;
    const overdueOrDamaged = list.filter((a) => a.status === 'DAMAGED' || a.status === 'LOST' || a.status === 'RETURN_OVERDUE').length;
    const totalAssetValue = list.reduce((sum, a) => sum + (a.totalValue || 0), 0);
    const totalDeductions = list.reduce((sum, a) => sum + (a.deductionAmount || 0), 0);
    const pendingDeductions = list
      .filter((a) => a.deductionStatus === 'PENDING_APPROVAL' || a.deductionStatus === 'STAGED_FOR_INVOICE' || a.deductionStatus === 'STAGED_FOR_PAYROLL')
      .reduce((sum, a) => sum + (a.deductionAmount || 0), 0);

    return {
      totalAllocated,
      returnableInField,
      nonReturnableIssued,
      overdueOrDamaged,
      totalAssetValue,
      totalDeductions,
      pendingDeductions,
    };
  }

  /**
   * Exports full asset custody register to CSV
   */
  public static exportToCSV(params?: {
    organizationId?: string;
    vendorId?: string;
    siteId?: string;
  }): { blob: Blob; fileName: string } {
    const list = this.getAllocations(params);

    const headers = [
      'Allocation ID',
      'Worker Code',
      'Worker Name',
      'Designation',
      'Asset Name',
      'Category',
      'Serial / Barcode',
      'Type',
      'Unit Price (INR)',
      'Qty',
      'Total Value (INR)',
      'Issued Date',
      'Expected Return',
      'Actual Return',
      'Status',
      'Deduction Target',
      'Deduction Amount (INR)',
      'Deduction Status',
      'Deduction Reference',
    ];

    const rows = list.map((a) => [
      a.id,
      a.workerCode,
      `"${a.workerName}"`,
      `"${a.workerRole || ''}"`,
      `"${a.assetName}"`,
      a.category,
      a.serialNumber || 'N/A',
      a.returnableType,
      a.unitPrice,
      a.quantity,
      a.totalValue,
      a.issuedDate,
      a.expectedReturnDate || 'N/A',
      a.actualReturnDate || 'N/A',
      a.status,
      a.deductionTarget,
      a.deductionAmount,
      a.deductionStatus,
      a.deductionReference || 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `Vendor_Worker_Asset_Custody_Register_${new Date().toISOString().split('T')[0]}.csv`;

    return { blob, fileName };
  }
}
