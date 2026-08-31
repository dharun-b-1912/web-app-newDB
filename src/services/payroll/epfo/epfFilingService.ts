// src/services/payroll/epfo/epfFilingService.ts
// ============================================================================
// Joy PeopleHR Enterprise HRMS — EPFO Filing Tracker & Challan Reconciliation
// Versioned Filings • TRRN & Challan Matching • Tenant Isolated Store
// ============================================================================

import {
  EPFOFilingRecord,
  EPFOChallanRecord,
  EPFOEcrBatch,
} from '../../../types/epfoCompliance';
import { getActiveOrgId } from '../../attendance/biometricCommandService';

const EPFO_STORAGE_KEYS = {
  FILINGS: 'workforce_epfo_filings_v1',
  BATCHES: 'workforce_epfo_batches_v1',
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
    console.error('[EPFFilingService] Storage error:', e);
  }
}

export class EPFFilingService {
  /**
   * Get all EPFO filing records for tenant
   */
  public static getFilings(tenantId = getActiveOrgId()): EPFOFilingRecord[] {
    return getStore<EPFOFilingRecord[]>(EPFO_STORAGE_KEYS.FILINGS, [], tenantId);
  }

  /**
   * Get all generated batches for tenant
   */
  public static getBatches(tenantId = getActiveOrgId()): EPFOEcrBatch[] {
    return getStore<EPFOEcrBatch[]>(EPFO_STORAGE_KEYS.BATCHES, [], tenantId);
  }

  /**
   * Save or update an EPFO ECR batch
   */
  public static saveBatch(batch: EPFOEcrBatch, tenantId = getActiveOrgId()): void {
    const batches = this.getBatches(tenantId);
    const existingIdx = batches.findIndex(b => b.id === batch.id);

    if (existingIdx >= 0) {
      batches[existingIdx] = batch;
    } else {
      batches.forEach(b => {
        if (b.payroll_run_id === batch.payroll_run_id && b.id !== batch.id) {
          b.is_current = false;
          b.status = 'SUPERSEDED';
        }
      });
      batches.unshift(batch);
    }

    setStore(EPFO_STORAGE_KEYS.BATCHES, batches, tenantId);

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
        id: `epfo-filing-${batch.payroll_run_id}`,
        tenant_id: tenantId,
        payroll_run_id: batch.payroll_run_id,
        pay_period: batch.pay_period,
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

    setStore(EPFO_STORAGE_KEYS.FILINGS, filings, tenantId);
  }

  /**
   * Record manual submission reference / TRRN from EPFO Unified Portal
   */
  public static recordPortalSubmission(params: {
    payrollRunId: string;
    trrnNumber: string;
    submittedBy: string;
    tenantId?: string;
  }): EPFOFilingRecord {
    const { payrollRunId, trrnNumber, submittedBy, tenantId = getActiveOrgId() } = params;
    const filings = this.getFilings(tenantId);
    const filing = filings.find(f => f.payroll_run_id === payrollRunId);
    if (!filing) throw new Error('Filing record not found');

    filing.trrn_number = trrnNumber;
    filing.submission_reference = `TRRN-${trrnNumber}`;
    filing.submitted_at = new Date().toISOString();
    filing.submitted_by = submittedBy;
    filing.status = 'SUBMITTED';
    filing.updated_at = new Date().toISOString();

    setStore(EPFO_STORAGE_KEYS.FILINGS, filings, tenantId);
    return filing;
  }

  /**
   * Record Challan details & reconcile payment
   */
  public static recordChallanPayment(params: {
    payrollRunId: string;
    trnNumber: string;
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
  }): EPFOFilingRecord {
    const {
      payrollRunId,
      trnNumber,
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
    const calculatedLiability = batch
      ? batch.total_epf_contribution + batch.total_eps_contribution + batch.total_epf_eps_difference
      : challanAmount;

    const variance = paidAmount - calculatedLiability;
    let paymentStatus: 'MATCHED' | 'SHORT' | 'EXCESS' | 'PENDING' = 'MATCHED';
    if (Math.abs(variance) > 1.0) {
      paymentStatus = variance < 0 ? 'SHORT' : 'EXCESS';
    }

    const challanRecord: EPFOChallanRecord = {
      id: `epfo-ch-${Date.now()}`,
      filing_id: filing.id,
      tenant_id: tenantId,
      trn_number: trnNumber,
      challan_number: challanNumber,
      challan_date: challanDate,
      payment_reference: paymentReference,
      bank_name: bankName,
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

    setStore(EPFO_STORAGE_KEYS.FILINGS, filings, tenantId);
    return filing;
  }
}
