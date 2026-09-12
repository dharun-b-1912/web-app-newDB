// src/services/approvals/domainAdapters/leaveApprovalAdapter.ts
// ============================================================================
// JOY PeopleHR — Gate 3B: Leave Approval Domain Adapter
// Server-Authoritative Leave Mutation:
// leave_requests -> leave_ledger_entries -> leave_balances -> domain_events
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import {
  DomainApprovalAdapter,
  DomainApprovalContext,
  DomainApprovalResult,
} from '../domainAdapterInterface';
import { domainEventService } from '../../events/domainEventService';
import {
  CANONICAL_DOMAIN_EVENTS,
  IdempotencyKeyGenerator,
  DomainEventRecord,
} from '../../../types/domainEvents';
import { leaveEngine } from '../../leave/leaveEngine';

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class LeaveApprovalAdapter implements DomainApprovalAdapter {
  public readonly targetEntityType = 'LEAVE';
  public readonly status = 'ACTIVE' as const;

  public async execute(ctx: DomainApprovalContext): Promise<DomainApprovalResult> {
    const now = new Date().toISOString();
    const emittedEvents: DomainEventRecord[] = [];

    // ────────────────────────────────────────────────────────────────────────
    // Handle REJECTION
    // ────────────────────────────────────────────────────────────────────────
    if (ctx.decision === 'REJECT') {
      if (isSupabaseEnabled && isValidUUID(ctx.targetEntityId)) {
        try {
          await supabase
            .from('leave_requests')
            .update({
              status: 'REJECTED',
              updated_at: now,
            })
            .eq('id', ctx.targetEntityId);
        } catch (dbErr) {
          console.warn('[LeaveApprovalAdapter] DB rejection update error:', dbErr);
        }
      }

      // Also update local storage if present
      this.updateLocalLeaveRequestStatus(ctx.targetEntityId, 'REJECTED');

      // Emit domain event
      const rejEvent = await domainEventService.publishEvent({
        organization_id: ctx.organizationId,
        event_type: CANONICAL_DOMAIN_EVENTS.LEAVE_REJECTED,
        aggregate_type: 'LEAVE',
        aggregate_id: ctx.targetEntityId,
        idempotency_key: IdempotencyKeyGenerator.leaveRejected(ctx.targetEntityId),
        payload: {
          leave_request_id: ctx.targetEntityId,
          rejected_by: ctx.actorEmployeeId,
          reason: ctx.comments || 'Rejected by approver',
        },
        actor_id: ctx.actorEmployeeId,
      });
      emittedEvents.push(rejEvent);

      return {
        success: true,
        aggregateId: ctx.targetEntityId,
        aggregateType: 'LEAVE',
        emittedEvents,
      };
    }

    // ────────────────────────────────────────────────────────────────────────
    // Handle APPROVAL (Atomic Multi-Table Mutation via LeaveEngine)
    // ────────────────────────────────────────────────────────────────────────
    const approvalResult = await leaveEngine.approveLeaveRequest({
      requestId: ctx.targetEntityId,
      organizationId: ctx.organizationId,
      actorId: ctx.actorEmployeeId,
      actorRole: 'MANAGER',
      comments: ctx.comments,
    });

    return {
      success: true,
      aggregateId: ctx.targetEntityId,
      aggregateType: 'LEAVE',
      emittedEvents: approvalResult.emittedEvents,
      metadata: {
        newClosingBalance: approvalResult.newClosingBalance,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Local Store Fallbacks
  // ──────────────────────────────────────────────────────────────────────────
  private getLocalLeaveRequest(id: string): any {
    if (typeof window === 'undefined') {
      const list = (globalThis as any).__JOY_LEAVE_REQUESTS__ || [];
      return list.find((r: any) => r.id === id);
    }
    try {
      const raw = localStorage.getItem('workforceos_leave_requests_v2');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.id === id);
    } catch {
      return null;
    }
  }

  private updateLocalLeaveRequestStatus(id: string, status: string): void {
    if (typeof window === 'undefined') {
      const list = (globalThis as any).__JOY_LEAVE_REQUESTS__ || [];
      const item = list.find((r: any) => r.id === id);
      if (item) item.status = status;
      return;
    }
    try {
      const raw = localStorage.getItem('workforceos_leave_requests_v2');
      const list = raw ? JSON.parse(raw) : [];
      const item = list.find((r: any) => r.id === id);
      if (item) {
        item.status = status;
        localStorage.setItem('workforceos_leave_requests_v2', JSON.stringify(list));
      }
    } catch {}
  }

  private getLocalLeaveBalance(empId: string, typeId: string, year: number): any {
    if (typeof window === 'undefined') {
      const balances = (globalThis as any).__JOY_LEAVE_BALANCES__ || [];
      return balances.find((b: any) => b.employee_id === empId && b.calendar_year === year);
    }
    try {
      const raw = localStorage.getItem('workforceos_leave_balances_v2');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((b: any) => b.employee_id === empId && b.calendar_year === year);
    } catch {
      return null;
    }
  }

  private updateLocalLeaveBalance(empId: string, typeId: string, year: number, data: any): void {
    if (typeof window === 'undefined') {
      let balances = (globalThis as any).__JOY_LEAVE_BALANCES__ || [];
      const idx = balances.findIndex((b: any) => b.employee_id === empId && b.calendar_year === year);
      if (idx !== -1) {
        balances[idx] = { ...balances[idx], ...data };
      } else {
        balances.push({ employee_id: empId, leave_type_id: typeId, calendar_year: year, ...data });
      }
      (globalThis as any).__JOY_LEAVE_BALANCES__ = balances;
      return;
    }
    try {
      const raw = localStorage.getItem('workforceos_leave_balances_v2');
      let list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((b: any) => b.employee_id === empId && b.calendar_year === year);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
      } else {
        list.push({ employee_id: empId, leave_type_id: typeId, calendar_year: year, ...data });
      }
      localStorage.setItem('workforceos_leave_balances_v2', JSON.stringify(list));
    } catch {}
  }

  private insertLocalLedgerEntry(entry: any): void {
    if (typeof window === 'undefined') {
      const list = (globalThis as any).__JOY_LEAVE_LEDGER__ || [];
      list.push(entry);
      (globalThis as any).__JOY_LEAVE_LEDGER__ = list;
      return;
    }
    try {
      const raw = localStorage.getItem('workforceos_leave_ledger_v2');
      const list = raw ? JSON.parse(raw) : [];
      list.push(entry);
      localStorage.setItem('workforceos_leave_ledger_v2', JSON.stringify(list));
    } catch {}
  }
}
