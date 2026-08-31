// src/services/payroll/esic/esiFilingService.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — ESIC Filing Tracker & Challan Reconciliation
// Versioned Filings • Challan & Payment Matching • Tenant Isolated Store
// ============================================================================

import {
  ESICFilingRecord,
  ESICPaymentChallanRecord,
  ESICUploadBatch,
  ESICFilingStatus,
} from '../../../types/esicCompliance';
import { getActiveOrgId } from '../../attendance/biometricCommandService';

const ESIC_STORAGE_KEYS = {
  FILINGS: 'workforce_esic_filings_v1',
  BATCHES: 'workforce_esic_batches_v1',
  MASTER_IPS: 'workforce_esic_master_ips_v1',
};

function getStore<T>(key: string, fallback: T, tenantId = getActiveOrgId()): T {
  try {
    const raw = localStorage.getItem(`${key}_${tenantId}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStore<T>(key: string, val: T, tenantId = getActiveOrgId()): void {
  try {
    localStorage.setItem(`${key}_${tenantId}`, JSON.stringify(val));
  } catch (e) {
    console.error('[ESIFilingService] Storage error:', e);
  }
}

export class ESIFilingService {
  /**
   * Get all ESIC filing records for tenant
   */
  public static getFilings(tenantId = getActiveOrgId()): ESICFilingRecord[] {
    return getStore<ESICFilingRecord[]>(ESIC_STORAGE_KEYS.FILINGS, [], tenantId);
  }

  /**
   * Get all generated batches for tenant
   */
  public static getBatches(tenantId = getActiveOrgId()): ESICUploadBatch[] {
    return getStore<ESICUploadBatch[]>(ESIC_STORAGE_KEYS.BATCHES, [], tenantId);
  }

  /**
   * Save or update an ESIC upload batch
   */
  public static saveBatch(batch: ESICUploadBatch, tenantId = getActiveOrgId()): void {
    const batches = this.getBatches(tenantId);
    const existingIdx = batches.findIndex(b => b.id === batch.id);

    if (existingIdx >= 0) {
      batches[existingIdx] = batch;
    } else {
      // Mark prior version for this run as superseded
      batches.forEach(b => {
        if (b.payroll_run_id === batch.payroll_run_id && b.id !== batch.id) {
          b.is_current = false;
          b.status = 'SUPERSEDED';
        }
      });
      batches.unshift(batch);
    }

    setStore(ESIC_STORAGE_KEYS.BATCHES, batches, tenantId);

    // Update or create Filing Record
    const filings = this.getFilings(tenantId);
    let filing = filings.find(f => f.payroll_run_id === batch.payroll_run_id);

    if (filing) {
      filing.active_batch_id = batch.id;
      filing.file_version = batch.version;
      filing.file_name = batch.file_name;
      filing.status = batch.status;
      filing.updated_at = new Date().toISOString();
    } else {
      filing = {
        id: `filing-${batch.payroll_run_id}`,
        tenant_id: tenantId,
        payroll_run_id: batch.payroll_run_id,
        pay_period: batch.pay_period,
        contribution_period: batch.contribution_period,
        active_batch_id: batch.id,
        file_version: batch.version,
        file_name: batch.file_name,
        status: batch.status,
        history_versions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      filings.unshift(filing);
    }

    setStore(ESIC_STORAGE_KEYS.FILINGS, filings, tenantId);
  }

  /**
   * Record manual submission reference after HR uploads to official ESIC portal
   */
  public static recordPortalSubmission(params: {
    payrollRunId: string;
    submissionReference: string;
    submittedBy: string;
    tenantId?: string;
  }): ESICFilingRecord {
    const { payrollRunId, submissionReference, submittedBy, tenantId = getActiveOrgId() } = params;
    const filings = this.getFilings(tenantId);
    const filing = filings.find(f => f.payroll_run_id === payrollRunId);
    if (!filing) throw new Error('Filing record not found');

    filing.portal_submission_reference = submissionReference;
    filing.submitted_at = new Date().toISOString();
    filing.submitted_by = submittedBy;
    filing.status = 'SUBMITTED';
    filing.updated_at = new Date().toISOString();

    setStore(ESIC_STORAGE_KEYS.FILINGS, filings, tenantId);
    return filing;
  }

  /**
   * Record Challan details & reconcile payment
   */
  public static recordChallanPayment(params: {
    payrollRunId: string;
    challanNumber: string;
    challanDate: string;
    paymentReference: string;
    bankName: string;
    challanAmount: number;
    paidAmount: number;
    paymentDate: string;
    recordedBy: string;
    notes?: string;
    tenantId?: string;
  }): ESICFilingRecord {
    const {
      payrollRunId,
      challanNumber,
      challanDate,
      paymentReference,
      bankName,
      challanAmount,
      paidAmount,
      paymentDate,
      recordedBy,
      notes,
      tenantId = getActiveOrgId(),
    } = params;

    const filings = this.getFilings(tenantId);
    const filing = filings.find(f => f.payroll_run_id === payrollRunId);
    if (!filing) throw new Error('Filing record not found');

    const batches = this.getBatches(tenantId);
    const batch = batches.find(b => b.id === filing.active_batch_id);
    const calculatedLiability = batch ? batch.total_liability_amount : challanAmount;

    const variance = paidAmount - calculatedLiability;
    let paymentStatus: 'MATCHED' | 'SHORT' | 'EXCESS' | 'PENDING' = 'MATCHED';
    if (Math.abs(variance) > 1.0) {
      paymentStatus = variance < 0 ? 'SHORT' : 'EXCESS';
    }

    const challanRecord: ESICPaymentChallanRecord = {
      id: `esic-ch-${Date.now()}`,
      filing_id: filing.id,
      tenant_id: tenantId,
      challan_number: challanNumber,
      challan_date: challanDate,
      payment_reference_number: paymentReference,
      bank_transaction_id: `TXN-${Date.now()}`,
      bank_name: bankName,
      calculated_liability: calculatedLiability,
      challan_amount: challanAmount,
      paid_amount: paidAmount,
      payment_date: paymentDate,
      payment_status: paymentStatus,
      variance_amount: variance,
      notes,
      recorded_by: recordedBy,
      created_at: new Date().toISOString(),
    };

    filing.challan_record = challanRecord;
    filing.status = paymentStatus === 'MATCHED' ? 'RECONCILED' : 'PAID';
    filing.updated_at = new Date().toISOString();

    setStore(ESIC_STORAGE_KEYS.FILINGS, filings, tenantId);
    return filing;
  }
}
