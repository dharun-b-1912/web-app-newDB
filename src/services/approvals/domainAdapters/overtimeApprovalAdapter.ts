// src/services/approvals/domainAdapters/overtimeApprovalAdapter.ts
// ============================================================================
// JOY PeopleHR — Gate 3B: Overtime Approval Domain Adapter
// Server-Authoritative Overtime Mutation:
// overtime_records -> attendance_daily verification -> payroll_eligible -> domain_events
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

export class OvertimeApprovalAdapter implements DomainApprovalAdapter {
  public readonly targetEntityType = 'OVERTIME';
  public readonly status = 'ACTIVE' as const;

  public async execute(ctx: DomainApprovalContext): Promise<DomainApprovalResult> {
    const now = new Date().toISOString();
    const emittedEvents: DomainEventRecord[] = [];

    // ────────────────────────────────────────────────────────────────────────
    // Handle REJECTION
    // ────────────────────────────────────────────────────────────────────────
    if (ctx.decision === 'REJECT') {
      if (isSupabaseEnabled) {
        try {
          await supabase
            .from('overtime_records')
            .update({
              status: 'REJECTED',
              payroll_eligible: false,
              updated_at: now,
            })
            .eq('id', ctx.targetEntityId);
        } catch (dbErr) {
          console.warn('[OvertimeApprovalAdapter] DB rejection update notice:', dbErr);
        }
      }

      this.updateLocalOvertimeStatus(ctx.targetEntityId, 'REJECTED', false);

      const rejEvent = await domainEventService.publishEvent({
        organization_id: ctx.organizationId,
        event_type: CANONICAL_DOMAIN_EVENTS.OVERTIME_REJECTED,
        aggregate_type: 'OVERTIME',
        aggregate_id: ctx.targetEntityId,
        idempotency_key: IdempotencyKeyGenerator.overtimeRejected(ctx.targetEntityId),
        payload: {
          overtime_record_id: ctx.targetEntityId,
          rejected_by: ctx.actorEmployeeId,
          reason: ctx.comments || 'Rejected by approver',
        },
        actor_id: ctx.actorEmployeeId,
      });
      emittedEvents.push(rejEvent);

      return {
        success: true,
        aggregateId: ctx.targetEntityId,
        aggregateType: 'OVERTIME',
        emittedEvents,
      };
    }

    // ────────────────────────────────────────────────────────────────────────
    // Handle APPROVAL
    // ────────────────────────────────────────────────────────────────────────
    let otRecord: any = null;

    // 1. Fetch overtime record
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('overtime_records')
          .select('*')
          .eq('id', ctx.targetEntityId)
          .maybeSingle();
        if (data && !error) otRecord = data;
      } catch (err) {
        console.warn('[OvertimeApprovalAdapter] Error querying overtime_records:', err);
      }
    }

    if (!otRecord) {
      otRecord = this.getLocalOvertimeRecord(ctx.targetEntityId);
    }

    if (!otRecord) {
      throw new Error(`[OvertimeApprovalAdapter] Overtime record ${ctx.targetEntityId} not found.`);
    }

    const employeeId = otRecord.employee_id;
    const attendanceDate = otRecord.attendance_date || otRecord.date || now.split('T')[0];
    const approvedHours = Number(otRecord.approved_hours || otRecord.requested_hours || otRecord.expected_hours || 2.0);
    const otMinutes = Math.round(approvedHours * 60);

    // 2. Validate attendance relationship
    let attendanceExists = false;
    if (isSupabaseEnabled) {
      try {
        const { data: attDaily } = await supabase
          .from('attendance_daily')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('attendance_date', attendanceDate)
          .maybeSingle();

        if (attDaily) {
          attendanceExists = true;
          // Update attendance_daily overtime minutes & eligibility
          await supabase
            .from('attendance_daily')
            .update({
              overtime_minutes: otMinutes,
              overtime_eligible: true,
              updated_at: now,
            })
            .eq('id', attDaily.id);
        }
      } catch (attErr) {
        console.warn('[OvertimeApprovalAdapter] Error checking attendance relationship:', attErr);
      }
    }

    // Update local attendance mirror
    this.updateLocalAttendanceOvertime(employeeId, attendanceDate, otMinutes);

    // 3. Mark Overtime Record Approved and Payroll Eligible
    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('overtime_records')
          .update({
            status: 'APPROVED',
            approved_hours: approvedHours,
            payroll_eligible: true,
            approved_by: ctx.actorEmployeeId,
            approved_at: now,
            updated_at: now,
          })
          .eq('id', ctx.targetEntityId);
      } catch (dbErr) {
        console.warn('[OvertimeApprovalAdapter] Error updating overtime_records:', dbErr);
      }
    }

    this.updateLocalOvertimeStatus(ctx.targetEntityId, 'APPROVED', true, approvedHours);

    // 4. Emit Domain Event
    const event = await domainEventService.publishEvent({
      organization_id: ctx.organizationId,
      event_type: CANONICAL_DOMAIN_EVENTS.OVERTIME_APPROVED,
      aggregate_type: 'OVERTIME',
      aggregate_id: ctx.targetEntityId,
      idempotency_key: IdempotencyKeyGenerator.overtimeApproved(ctx.targetEntityId),
      payload: {
        overtime_record_id: ctx.targetEntityId,
        employee_id: employeeId,
        attendance_date: attendanceDate,
        approved_hours: approvedHours,
        payroll_eligible: true,
        attendance_verified: attendanceExists,
        approved_by: ctx.actorEmployeeId,
        approved_at: now,
      },
      actor_id: ctx.actorEmployeeId,
    });
    emittedEvents.push(event);

    return {
      success: true,
      aggregateId: ctx.targetEntityId,
      aggregateType: 'OVERTIME',
      emittedEvents,
      metadata: {
        approvedHours,
        payrollEligible: true,
        attendanceVerified: attendanceExists,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Local Store Fallbacks
  // ──────────────────────────────────────────────────────────────────────────
  private getLocalOvertimeRecord(id: string): any {
    if (typeof window === 'undefined') {
      const list = (globalThis as any).__JOY_OVERTIME_RECORDS__ || [];
      return list.find((r: any) => r.id === id);
    }
    try {
      const raw = localStorage.getItem('workforceos_overtime_records_v2');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.id === id);
    } catch {
      return null;
    }
  }

  private updateLocalOvertimeStatus(id: string, status: string, payrollEligible: boolean, approvedHours?: number): void {
    if (typeof window === 'undefined') {
      const list = (globalThis as any).__JOY_OVERTIME_RECORDS__ || [];
      const item = list.find((r: any) => r.id === id);
      if (item) {
        item.status = status;
        item.payroll_eligible = payrollEligible;
        if (approvedHours !== undefined) item.approved_hours = approvedHours;
      }
      return;
    }
    try {
      const raw = localStorage.getItem('workforceos_overtime_records_v2');
      const list = raw ? JSON.parse(raw) : [];
      const item = list.find((r: any) => r.id === id);
      if (item) {
        item.status = status;
        item.payroll_eligible = payrollEligible;
        if (approvedHours !== undefined) item.approved_hours = approvedHours;
        localStorage.setItem('workforceos_overtime_records_v2', JSON.stringify(list));
      }
    } catch {}
  }

  private updateLocalAttendanceOvertime(employeeId: string, date: string, otMinutes: number): void {
    if (typeof window === 'undefined') {
      const list = (globalThis as any).__JOY_ATTENDANCE_DAILY__ || [];
      const item = list.find((a: any) => a.employee_id === employeeId && (a.attendance_date === date || a.date === date));
      if (item) {
        item.overtime_minutes = otMinutes;
        item.overtime_eligible = true;
      }
      return;
    }
    try {
      const raw = localStorage.getItem('workforceos_attendance_daily_v2');
      const list = raw ? JSON.parse(raw) : [];
      const item = list.find((a: any) => a.employee_id === employeeId && (a.attendance_date === date || a.date === date));
      if (item) {
        item.overtime_minutes = otMinutes;
        item.overtime_eligible = true;
        localStorage.setItem('workforceos_attendance_daily_v2', JSON.stringify(list));
      }
    } catch {}
  }
}
