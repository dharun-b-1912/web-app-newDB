// src/services/approvals/domainAdapterInterface.ts
// ============================================================================
// JOY PeopleHR — Gate 3B: Domain Approval Adapter Contract
// Principle: Approval Engine decides whether something is approved.
// Domain Adapters decide what authoritative business mutation happens after approval.
// ============================================================================

import { DomainEventRecord } from '../../types/domainEvents';

export type ApprovalDecision = 'APPROVE' | 'REJECT';

export interface DomainApprovalContext {
  approvalInstanceId: string;
  targetEntityType: string;
  targetEntityId: string;
  organizationId: string;
  actorEmployeeId: string;
  decision: ApprovalDecision;
  comments?: string;
  stepOrder?: number;
}

export interface DomainApprovalResult {
  success: boolean;
  aggregateId: string;
  aggregateType: string;
  emittedEvents: DomainEventRecord[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface DomainApprovalAdapter {
  readonly targetEntityType: string;
  readonly status: 'ACTIVE' | 'DEFERRED';
  execute(ctx: DomainApprovalContext): Promise<DomainApprovalResult>;
}
