import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { getActiveOrgId } from '../attendance/biometricCommandService';
import { hrEventBus } from '../hrEventBus';

export interface ExpenseClaim {
  id: string;
  claim_number: string;
  tenant_id: string;
  organization_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  category: string; // TRAVEL, FOOD, LODGING, CLIENT_MEETING, TOOLS, OTHER
  amount: number;
  approved_amount?: number;
  currency: string;
  expense_date: string;
  description: string;
  receipt_url?: string;
  receipt_filename?: string;
  status: 'DRAFT' | 'PENDING' | 'MANAGER_APPROVED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REIMBURSED';
  approver_id?: string;
  approver_name?: string;
  approver_comment?: string;
  rejection_reason?: string;
  reimbursement_date?: string;
  reimbursement_reference?: string;
  submitted_at: string;
  reviewed_at?: string;
}

const STORAGE_KEY_CLAIMS = 'workforceos_expense_claims_v1';

class ExpenseClaimService {
  private memoryCache: ExpenseClaim[] = [];

  private getStorageKey(tenantId = getActiveOrgId()): string {
    return `${STORAGE_KEY_CLAIMS}_${tenantId}`;
  }

  private loadLocalStore(tenantId = getActiveOrgId()): ExpenseClaim[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(tenantId));
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  private saveLocalStore(items: ExpenseClaim[], tenantId = getActiveOrgId()): void {
    try {
      localStorage.setItem(this.getStorageKey(tenantId), JSON.stringify(items));
    } catch (_) {}
  }

  public async fetchClaims(tenantId = getActiveOrgId()): Promise<ExpenseClaim[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('expense_claims')
          .select('*')
          .order('submitted_at', { ascending: false });

        if (!error && data !== null) {
          this.memoryCache = data;
          this.saveLocalStore(data, tenantId);
          return data;
        }
        if (error) {
          console.warn('[ExpenseClaimService] DB query error:', error);
        }
      } catch (err) {
        console.warn('[ExpenseClaimService] DB query notice:', err);
      }
    }
    const local = this.loadLocalStore(tenantId);
    this.memoryCache = local;
    return local;
  }

  public async approveClaim(
    claimId: string,
    approvedAmount: number,
    approverId: string,
    approverName: string,
    comment?: string,
    tenantId = getActiveOrgId()
  ): Promise<void> {
    const list = this.memoryCache.length > 0 ? this.memoryCache : this.loadLocalStore(tenantId);
    const updated = list.map((c) =>
      c.id === claimId
        ? {
            ...c,
            status: 'APPROVED' as const,
            approved_amount: approvedAmount,
            approver_id: approverId,
            approver_name: approverName,
            approver_comment: comment,
            reviewed_at: new Date().toISOString(),
          }
        : c
    );
    this.memoryCache = updated;
    this.saveLocalStore(updated, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('expense_claims')
          .update({
            status: 'APPROVED',
            approved_amount: approvedAmount,
            approver_id: approverId,
            approver_name: approverName,
            approver_comment: comment,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', claimId);

        // Realtime Outbox Event
        await supabase.from('realtime_outbox').insert({
          tenant_id: tenantId,
          entity_type: 'expense_claims',
          entity_id: claimId,
          action: 'UPDATE',
          payload: { id: claimId, status: 'APPROVED', approved_amount: approvedAmount },
        });
      } catch (err) {
        console.warn('[ExpenseClaimService] approveClaim DB notice:', err);
      }
    }

    hrEventBus.publish('expense.approved' as any, { claimId });
  }

  public async rejectClaim(
    claimId: string,
    reason: string,
    approverId: string,
    approverName: string,
    tenantId = getActiveOrgId()
  ): Promise<void> {
    const list = this.memoryCache.length > 0 ? this.memoryCache : this.loadLocalStore(tenantId);
    const updated = list.map((c) =>
      c.id === claimId
        ? {
            ...c,
            status: 'REJECTED' as const,
            rejection_reason: reason,
            approver_id: approverId,
            approver_name: approverName,
            reviewed_at: new Date().toISOString(),
          }
        : c
    );
    this.memoryCache = updated;
    this.saveLocalStore(updated, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('expense_claims')
          .update({
            status: 'REJECTED',
            rejection_reason: reason,
            approver_id: approverId,
            approver_name: approverName,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', claimId);

        await supabase.from('realtime_outbox').insert({
          tenant_id: tenantId,
          entity_type: 'expense_claims',
          entity_id: claimId,
          action: 'UPDATE',
          payload: { id: claimId, status: 'REJECTED', rejection_reason: reason },
        });
      } catch (err) {
        console.warn('[ExpenseClaimService] rejectClaim DB notice:', err);
      }
    }

    hrEventBus.publish('expense.rejected' as any, { claimId, reason });
  }

  public async reimburseClaim(
    claimId: string,
    referenceNumber: string,
    tenantId = getActiveOrgId()
  ): Promise<void> {
    const list = this.memoryCache.length > 0 ? this.memoryCache : this.loadLocalStore(tenantId);
    const now = new Date().toISOString();
    const updated = list.map((c) =>
      c.id === claimId
        ? {
            ...c,
            status: 'REIMBURSED' as const,
            reimbursement_reference: referenceNumber,
            reimbursement_date: now,
          }
        : c
    );
    this.memoryCache = updated;
    this.saveLocalStore(updated, tenantId);

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('expense_claims')
          .update({
            status: 'REIMBURSED',
            reimbursement_reference: referenceNumber,
            reimbursement_date: now,
            updated_at: now,
          })
          .eq('id', claimId);

        await supabase.from('realtime_outbox').insert({
          tenant_id: tenantId,
          entity_type: 'expense_claims',
          entity_id: claimId,
          action: 'UPDATE',
          payload: { id: claimId, status: 'REIMBURSED', reimbursement_reference: referenceNumber },
        });
      } catch (err) {
        console.warn('[ExpenseClaimService] reimburseClaim DB notice:', err);
      }
    }

    hrEventBus.publish('expense.reimbursed' as any, { claimId, referenceNumber });
  }
}

export const expenseClaimService = new ExpenseClaimService();
