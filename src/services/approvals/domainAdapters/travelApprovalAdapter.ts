// src/services/approvals/domainAdapters/travelApprovalAdapter.ts
// ============================================================================
// JOY PeopleHR — Gate 3B: Travel Approval Domain Adapter
// STATUS: DEFERRED
// Rationale: As mandated by Gate 3 Architectural Specification, Travel Expense
// is not yet a certified module with an authoritative database table.
// Rather than speculative placeholder code, this adapter is explicitly marked DEFERRED.
// ============================================================================

import {
  DomainApprovalAdapter,
  DomainApprovalContext,
  DomainApprovalResult,
} from '../domainAdapterInterface';

export class TravelApprovalAdapter implements DomainApprovalAdapter {
  public readonly targetEntityType = 'TRAVEL';
  public readonly status = 'DEFERRED' as const;

  public async execute(ctx: DomainApprovalContext): Promise<DomainApprovalResult> {
    throw new Error(
      `[TravelApprovalAdapter] Travel domain adapter execution is DEFERRED pending authoritative travel schema certification. (Target: ${ctx.targetEntityId})`
    );
  }
}
