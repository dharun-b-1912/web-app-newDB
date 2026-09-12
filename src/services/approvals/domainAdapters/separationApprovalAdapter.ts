// src/services/approvals/domainAdapters/separationApprovalAdapter.ts
// ============================================================================
// JOY PeopleHR — Module Certification 02: Separation Approval Domain Adapter
// Server-Authoritative Separation Approval Mutation:
// employee_separations -> separation_clearances -> domain_events
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
  DomainEventRecord,
} from '../../../types/domainEvents';
import { separationFnFEngine } from '../../offboarding/separationFnFEngine';

const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class SeparationApprovalAdapter implements DomainApprovalAdapter {
  public readonly targetEntityType = 'SEPARATION';
  public readonly status = 'ACTIVE' as const;

  public async execute(ctx: DomainApprovalContext): Promise<DomainApprovalResult> {
    const now = new Date().toISOString();
    const emittedEvents: DomainEventRecord[] = [];

    // Rejection
    if (ctx.decision === 'REJECT') {
      if (isSupabaseEnabled && isValidUUID(ctx.targetEntityId)) {
        try {
          await supabase
            .from('employee_separations')
            .update({ status: 'REJECTED', updated_at: now })
            .eq('id', ctx.targetEntityId);
        } catch (_) {}
      }

      const event = await domainEventService.publishEvent({
        organization_id: ctx.organizationId,
        event_type: 'separation.rejected',
        aggregate_type: 'SEPARATION',
        aggregate_id: ctx.targetEntityId,
        idempotency_key: `separation.rejected.${ctx.targetEntityId}`,
        payload: {
          separation_id: ctx.targetEntityId,
          rejected_by: ctx.actorEmployeeId,
          reason: ctx.comments || 'Rejected by approver',
        },
        actor_id: ctx.actorEmployeeId,
      });
      emittedEvents.push(event);

      return {
        success: true,
        aggregateId: ctx.targetEntityId,
        aggregateType: 'SEPARATION',
        emittedEvents,
      };
    }

    // Approval
    const result = await separationFnFEngine.approveSeparation({
      separationId: ctx.targetEntityId,
      organizationId: ctx.organizationId,
      actorId: ctx.actorEmployeeId,
      actorRole: 'MANAGER',
      comments: ctx.comments,
    });

    return {
      success: true,
      aggregateId: ctx.targetEntityId,
      aggregateType: 'SEPARATION',
      emittedEvents: result.emittedEvents,
      metadata: {
        status: result.separation.status,
        approvedLwd: result.separation.approved_last_working_date,
      },
    };
  }
}
