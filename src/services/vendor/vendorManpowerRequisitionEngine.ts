// src/services/vendor/vendorManpowerRequisitionEngine.ts
// ============================================================================
// JOY PeopleHR — Company ↔ Vendor Manpower Requisition & Proposal Engine
// Manages Company Requisitions (Site, Headcount, Role, Shift) → Vendor Proposals → Approvals
// ============================================================================

import { hrEventBus } from '../hrEventBus';
import { vendorService } from '../vendorService';
import { vendorPortalService } from '../vendorPortalService';
import { VendorEmployee } from '../../types/vendorPortal';

export type RequisitionStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'ACKNOWLEDGED'
  | 'PROPOSALS_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PARTIALLY_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'FULFILLED'
  | 'CANCELLED';

export interface ManpowerRequisition {
  id: string;
  organization_id: string;
  company_id: string;
  company_name: string;
  vendor_id: string;
  vendor_name: string;
  contract_id: string;
  contract_number: string;
  requisition_code: string;
  site_name: string;
  department_name: string;
  shift_code: string;
  required_role: string;
  required_headcount: number;
  approved_headcount: number;
  start_date: string;
  end_date: string;
  daily_wage_rate: number;
  ot_hourly_rate: number;
  status: RequisitionStatus;
  notes?: string;
  proposed_worker_ids: string[];
  approved_worker_ids: string[];
  rejected_worker_ids: string[];
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'workforce_vendor_manpower_requisitions';

function getStoredRequisitions(): ManpowerRequisition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredRequisitions(list: ManpowerRequisition[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('[VendorManpowerRequisitionEngine] Storage error:', err);
  }
}

export class VendorManpowerRequisitionEngine {
  /**
   * Company Admin creates a formal Manpower Requirement for a Vendor
   */
  public static createRequisition(params: {
    organizationId: string;
    companyId: string;
    companyName: string;
    vendorId: string;
    vendorName: string;
    contractId: string;
    contractNumber: string;
    siteName: string;
    departmentName: string;
    shiftCode: string;
    requiredRole: string;
    requiredHeadcount: number;
    startDate: string;
    endDate: string;
    dailyWageRate: number;
    otHourlyRate: number;
    notes?: string;
  }): ManpowerRequisition {
    const list = getStoredRequisitions();
    const reqCode = `REQ-${Date.now().toString(36).toUpperCase().slice(-5)}`;

    const newReq: ManpowerRequisition = {
      id: `mreq-${Date.now().toString(36)}`,
      organization_id: params.organizationId,
      company_id: params.companyId,
      company_name: params.companyName,
      vendor_id: params.vendorId,
      vendor_name: params.vendorName,
      contract_id: params.contractId,
      contract_number: params.contractNumber,
      requisition_code: reqCode,
      site_name: params.siteName,
      department_name: params.departmentName,
      shift_code: params.shiftCode,
      required_role: params.requiredRole,
      required_headcount: params.requiredHeadcount,
      approved_headcount: 0,
      start_date: params.startDate,
      end_date: params.endDate,
      daily_wage_rate: params.dailyWageRate,
      ot_hourly_rate: params.otHourlyRate,
      status: 'REQUESTED',
      notes: params.notes,
      proposed_worker_ids: [],
      approved_worker_ids: [],
      rejected_worker_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveStoredRequisitions([newReq, ...list]);
    hrEventBus.emit('vendor.manpower_requested', newReq);
    return newReq;
  }

  /**
   * Vendor acknowledges requisition and proposes specific qualified workers
   */
  public static proposeWorkers(requisitionId: string, workerIds: string[]): ManpowerRequisition {
    const list = getStoredRequisitions();
    const idx = list.findIndex((r) => r.id === requisitionId);
    if (idx === -1) throw new Error(`Requisition ${requisitionId} not found`);

    const req = list[idx];
    const uniqueWorkers = Array.from(new Set([...req.proposed_worker_ids, ...workerIds]));

    const updated: ManpowerRequisition = {
      ...req,
      proposed_worker_ids: uniqueWorkers,
      status: 'PROPOSALS_SUBMITTED',
      updated_at: new Date().toISOString(),
    };

    list[idx] = updated;
    saveStoredRequisitions(list);
    hrEventBus.emit('vendor.workers_proposed', updated);
    return updated;
  }

  /**
   * Company Admin reviews proposed workers, approving or requesting corrections
   */
  public static reviewProposals(
    requisitionId: string,
    decisions: {
      approvedWorkerIds: string[];
      rejectedWorkerIds: string[];
      reviewerNotes?: string;
    }
  ): { requisition: ManpowerRequisition; deployedCount: number } {
    const list = getStoredRequisitions();
    const idx = list.findIndex((r) => r.id === requisitionId);
    if (idx === -1) throw new Error(`Requisition ${requisitionId} not found`);

    const req = list[idx];
    const newApproved = Array.from(new Set([...req.approved_worker_ids, ...decisions.approvedWorkerIds]));
    const newRejected = Array.from(new Set([...req.rejected_worker_ids, ...decisions.rejectedWorkerIds]));

    const isFullyApproved = newApproved.length >= req.required_headcount;
    const nextStatus: RequisitionStatus = isFullyApproved
      ? 'APPROVED'
      : newApproved.length > 0
      ? 'PARTIALLY_APPROVED'
      : 'UNDER_REVIEW';

    // Auto-create active deployments for approved workers
    let deployedCount = 0;
    for (const workerId of decisions.approvedWorkerIds) {
      try {
        vendorPortalService.assignWorkerDeployment({
          worker_id: workerId,
          vendor_id: req.vendor_id,
          company_id: req.company_id,
          company_name: req.company_name,
          site_name: req.site_name,
          department_name: req.department_name,
          daily_wage_rate: req.daily_wage_rate,
          designation: req.required_role,
        });
        deployedCount++;
      } catch (err) {
        console.warn(`[VendorManpowerRequisitionEngine] Deployment error for worker ${workerId}:`, err);
      }
    }

    const updated: ManpowerRequisition = {
      ...req,
      approved_worker_ids: newApproved,
      rejected_worker_ids: newRejected,
      approved_headcount: newApproved.length,
      status: nextStatus,
      notes: decisions.reviewerNotes || req.notes,
      updated_at: new Date().toISOString(),
    };

    list[idx] = updated;
    saveStoredRequisitions(list);
    hrEventBus.emit('vendor.proposals_reviewed', { requisition: updated, deployedCount });
    return { requisition: updated, deployedCount };
  }

  public static getRequisitions(filter?: { vendorId?: string; companyId?: string }): ManpowerRequisition[] {
    const list = getStoredRequisitions();
    return list.filter((r) => {
      if (filter?.vendorId && r.vendor_id !== filter.vendorId) return false;
      if (filter?.companyId && r.company_id !== filter.companyId) return false;
      return true;
    });
  }
}
