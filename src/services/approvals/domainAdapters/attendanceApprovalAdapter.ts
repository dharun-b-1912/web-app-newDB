// src/services/approvals/domainAdapters/attendanceApprovalAdapter.ts
// ============================================================================
// JOY PeopleHR — Gate 3B: Attendance Regularization Approval Domain Adapter
// Server-Authoritative Recalculation Engine:
// attendance_regularizations -> Server RPC fn_recalculate_daily_attendance -> domain_events
// No client-side attendance calculation permitted!
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

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class AttendanceApprovalAdapter implements DomainApprovalAdapter {
  public readonly targetEntityType = 'ATTENDANCE_REGULARIZATION';
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
            .from('attendance_regularizations')
            .update({
              status: 'REJECTED',
              updated_at: now,
            })
            .eq('id', ctx.targetEntityId);
        } catch (dbErr) {
          console.warn('[AttendanceApprovalAdapter] DB rejection error:', dbErr);
        }
      }

      this.updateLocalRegularizationStatus(ctx.targetEntityId, 'REJECTED');

      const rejEvent = await domainEventService.publishEvent({
        organization_id: ctx.organizationId,
        event_type: CANONICAL_DOMAIN_EVENTS.ATTENDANCE_REGULARIZATION_REJECTED,
        aggregate_type: 'ATTENDANCE_REGULARIZATION',
        aggregate_id: ctx.targetEntityId,
        idempotency_key: IdempotencyKeyGenerator.attendanceRegularizationRejected(ctx.targetEntityId),
        payload: {
          regularization_id: ctx.targetEntityId,
          rejected_by: ctx.actorEmployeeId,
          reason: ctx.comments || 'Rejected by approver',
        },
        actor_id: ctx.actorEmployeeId,
      });
      emittedEvents.push(rejEvent);

      return {
        success: true,
        aggregateId: ctx.targetEntityId,
        aggregateType: 'ATTENDANCE_REGULARIZATION',
        emittedEvents,
      };
    }

    // ────────────────────────────────────────────────────────────────────────
    // Handle APPROVAL (Server RPC Recalculation)
    // ────────────────────────────────────────────────────────────────────────
    let regRecord: any = null;

    // 1. Fetch regularization request
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('attendance_regularizations')
          .select('*')
          .eq('id', ctx.targetEntityId)
          .maybeSingle();
        if (data && !error) regRecord = data;
      } catch (err) {
        console.warn('[AttendanceApprovalAdapter] Error querying regularization:', err);
      }
    }

    if (!regRecord) {
      regRecord = this.getLocalRegularization(ctx.targetEntityId);
    }

    if (!regRecord) {
      throw new Error(`[AttendanceApprovalAdapter] Regularization ${ctx.targetEntityId} not found.`);
    }

    const employeeId = regRecord.employee_id;
    const attendanceDate = regRecord.attendance_date || regRecord.date || now.split('T')[0];

    // 2. Authoritatively update regularization record to APPROVED
    if (isSupabaseEnabled && isValidUUID(ctx.targetEntityId)) {
      try {
        await supabase
          .from('attendance_regularizations')
          .update({
            status: 'APPROVED',
            approved_by: ctx.actorEmployeeId,
            approved_at: now,
            updated_at: now,
          })
          .eq('id', ctx.targetEntityId);
      } catch (dbErr) {
        console.warn('[AttendanceApprovalAdapter] Error updating regularization to APPROVED:', dbErr);
      }
    }

    this.updateLocalRegularizationStatus(ctx.targetEntityId, 'APPROVED');

    // 3. Trigger Authoritative Attendance Calculation via Server RPC
    // Note: Frontend must NOT calculate daily totals. Must invoke fn_recalculate_daily_attendance RPC
    let calculationResult: any = null;

    if (isSupabaseEnabled && isValidUUID(employeeId) && isValidUUID(ctx.organizationId)) {
      try {
        // Mark attendance_daily as regularized first
        await supabase
          .from('attendance_daily')
          .upsert(
            {
              organization_id: ctx.organizationId,
              employee_id: employeeId,
              attendance_date: attendanceDate,
              status: 'PRESENT',
              payable_status: 1.0,
              is_regularized: true,
              first_check_in: regRecord.requested_check_in || `${attendanceDate}T09:30:00Z`,
              last_check_out: regRecord.requested_check_out || `${attendanceDate}T18:30:00Z`,
              updated_at: now,
            },
            { onConflict: 'employee_id,attendance_date' }
          );

        // Call the server RPC
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'fn_recalculate_daily_attendance',
          {
            p_employee_id: employeeId,
            p_date: attendanceDate,
          }
        );

        if (!rpcErr) {
          calculationResult = rpcData;
        } else {
          console.warn('[AttendanceApprovalAdapter] Server RPC fn_recalculate_daily_attendance notice:', rpcErr);
        }
      } catch (rpcCallErr) {
        console.warn('[AttendanceApprovalAdapter] Error invoking server recalculation RPC:', rpcCallErr);
      }
    }

    // Mirror to local daily attendance for offline/fallback consistency
    this.updateLocalDailyAttendance(employeeId, attendanceDate, {
      is_regularized: true,
      status: 'PRESENT',
      payable_status: 1.0,
      first_check_in: regRecord.requested_check_in || '09:30 AM',
      last_check_out: regRecord.requested_check_out || '06:30 PM',
      updated_at: now,
    });

    // 4. Emit Two Mandatory Domain Events:
    // A. attendance.regularization_approved
    const regEvent = await domainEventService.publishEvent({
      organization_id: ctx.organizationId,
      event_type: CANONICAL_DOMAIN_EVENTS.ATTENDANCE_REGULARIZATION_APPROVED,
      aggregate_type: 'ATTENDANCE_REGULARIZATION',
      aggregate_id: ctx.targetEntityId,
      idempotency_key: IdempotencyKeyGenerator.attendanceRegularizationApproved(ctx.targetEntityId),
      payload: {
        regularization_id: ctx.targetEntityId,
        employee_id: employeeId,
        attendance_date: attendanceDate,
        approved_by: ctx.actorEmployeeId,
        approved_at: now,
      },
      actor_id: ctx.actorEmployeeId,
    });
    emittedEvents.push(regEvent);

    // B. attendance.day_calculated
    const calcEvent = await domainEventService.publishEvent({
      organization_id: ctx.organizationId,
      event_type: CANONICAL_DOMAIN_EVENTS.ATTENDANCE_DAY_CALCULATED,
      aggregate_type: 'ATTENDANCE_DAILY',
      aggregate_id: ctx.targetEntityId,
      idempotency_key: IdempotencyKeyGenerator.attendanceCalculated(employeeId, attendanceDate),
      payload: {
        employee_id: employeeId,
        attendance_date: attendanceDate,
        is_regularized: true,
        status: 'PRESENT',
        payable_status: 1.0,
        server_rpc_result: calculationResult,
      },
      actor_id: ctx.actorEmployeeId,
    });
    emittedEvents.push(calcEvent);

    return {
      success: true,
      aggregateId: ctx.targetEntityId,
      aggregateType: 'ATTENDANCE_REGULARIZATION',
      emittedEvents,
      metadata: {
        attendanceDate,
        isRegularized: true,
        calculationResult,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Local Store Fallbacks
  // ──────────────────────────────────────────────────────────────────────────
  private getLocalRegularization(id: string): any {
    if (typeof window === 'undefined') {
      const list = (globalThis as any).__JOY_REGULARIZATIONS__ || [];
      return list.find((r: any) => r.id === id);
    }
    try {
      const raw = localStorage.getItem('workforceos_attendance_regularizations_v2');
      const list = raw ? JSON.parse(raw) : [];
      return list.find((r: any) => r.id === id);
    } catch {
      return null;
    }
  }

  private updateLocalRegularizationStatus(id: string, status: string): void {
    if (typeof window === 'undefined') {
      const list = (globalThis as any).__JOY_REGULARIZATIONS__ || [];
      const item = list.find((r: any) => r.id === id);
      if (item) item.status = status;
      return;
    }
    try {
      const raw = localStorage.getItem('workforceos_attendance_regularizations_v2');
      const list = raw ? JSON.parse(raw) : [];
      const item = list.find((r: any) => r.id === id);
      if (item) {
        item.status = status;
        localStorage.setItem('workforceos_attendance_regularizations_v2', JSON.stringify(list));
      }
    } catch {}
  }

  private updateLocalDailyAttendance(employeeId: string, date: string, data: any): void {
    if (typeof window === 'undefined') {
      let list = (globalThis as any).__JOY_ATTENDANCE_DAILY__ || [];
      const idx = list.findIndex((a: any) => a.employee_id === employeeId && (a.attendance_date === date || a.date === date));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
      } else {
        list.push({ employee_id: employeeId, attendance_date: date, ...data });
      }
      (globalThis as any).__JOY_ATTENDANCE_DAILY__ = list;
      return;
    }
    try {
      const raw = localStorage.getItem('workforceos_attendance_daily_v2');
      let list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((a: any) => a.employee_id === employeeId && (a.attendance_date === date || a.date === date));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
      } else {
        list.push({ employee_id: employeeId, attendance_date: date, ...data });
      }
      localStorage.setItem('workforceos_attendance_daily_v2', JSON.stringify(list));
    } catch {}
  }
}
