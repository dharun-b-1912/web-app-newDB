// src/services/approvals/domainAdapters/fnfApprovalAdapter.ts
// ============================================================================
// JOY PeopleHR — Module Certification 02: FnF Settlement Approval Domain Adapter
// Server-Authoritative FnF Approval Mutation:
// fnf_settlements -> domain_events -> terminal exit
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

export class FnFApprovalAdapter implements DomainApprovalAdapter {
  public readonly targetEntityType = 'FNF';
  public readonly status = 'ACTIVE' as const;

  public async execute(ctx: DomainApprovalContext): Promise<DomainApprovalResult> {
    const now = new Date().toISOString();
    const emittedEvents: DomainEventRecord[] = [];

    // Rejection
    if (ctx.decision === 'REJECT') {
      if (isSupabaseEnabled && isValidUUID(ctx.targetEntityId)) {
        try {
          await supabase
            .from('fnf_settlements')
            .update({ payment_status: 'REJECTED', updated_at: now })
            .eq('id', ctx.targetEntityId);
        } catch (_) {}
      }

      const event = await domainEventService.publishEvent({
        organization_id: ctx.organizationId,
        event_type: 'fnf.rejected',
        aggregate_type: 'FNF',
        aggregate_id: ctx.targetEntityId,
        idempotency_key: `fnf.rejected.${ctx.targetEntityId}`,
        payload: {
          settlement_id: ctx.targetEntityId,
          rejected_by: ctx.actorEmployeeId,
          reason: ctx.comments || 'Rejected by finance approver',
        },
        actor_id: ctx.actorEmployeeId,
      });
      emittedEvents.push(event);

      return {
        success: true,
        aggregateId: ctx.targetEntityId,
        aggregateType: 'FNF',
        emittedEvents,
      };
    }

    // Approval
    const result = await separationFnFEngine.approveFnFSettlement({
      settlementId: ctx.targetEntityId,
      organizationId: ctx.organizationId,
      actorId: ctx.actorEmployeeId,
      actorRole: 'FINANCE_HEAD',
      comments: ctx.comments,
    });

    return {
      success: true,
      aggregateId: ctx.targetEntityId,
      aggregateType: 'FNF',
      emittedEvents: result.emittedEvents,
      metadata: {
        paymentStatus: result.settlement.payment_status,
        netPayable: result.settlement.net_settlement_payable,
      },
    };
  }
}
