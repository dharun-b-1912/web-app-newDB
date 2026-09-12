// src/services/approvals/domainAdapters/vendorOnboardingApprovalAdapter.ts
// ============================================================================
// JOY PeopleHR — Unified Approval Engine Adapter: Vendor Onboarding
// Handles Authoritative Business Mutations & Domain Events for Vendor Approvals
// ============================================================================

import {
  DomainApprovalAdapter,
  DomainApprovalContext,
  DomainApprovalResult,
} from '../domainAdapterInterface';
import { DomainEventRecord } from '../../../types/domainEvents';
import { vendorService } from '../../vendorService';
import { vendorPortalService } from '../../vendorPortalService';
import { hrEventBus } from '../../hrEventBus';
import { VendorOnboardingLifecycleEngine } from '../../vendor/vendorOnboardingLifecycleEngine';

export class VendorOnboardingApprovalAdapter implements DomainApprovalAdapter {
  public readonly targetEntityType = 'VENDOR_ONBOARDING';
  public readonly status = 'ACTIVE';

  public async execute(ctx: DomainApprovalContext): Promise<DomainApprovalResult> {
    const emittedEvents: DomainEventRecord[] = [];
    const vendorId = ctx.targetEntityId;

    try {
      if (ctx.decision === 'APPROVE') {
        // Update vendor status to APPROVED, then ACTIVE
        await vendorService.updateVendorStatus(vendorId, 'APPROVED');
        await vendorService.updateVendorStatus(vendorId, 'ACTIVE');

        // Also activate the vendor organization in the portal directory
        vendorPortalService.activateVendor(vendorId);

        const now = new Date().toISOString();
        const eventRecord: DomainEventRecord = {
          id: `evt_vapp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          organization_id: ctx.organizationId,
          event_type: 'vendor.approved',
          aggregate_type: 'vendor',
          aggregate_id: vendorId,
          idempotency_key: `vapp_${vendorId}_${Date.now()}`,
          payload: {
            vendorId,
            decision: 'APPROVE',
            comments: ctx.comments || 'Approved by Principal Employer HR Reviewer',
            approvedAt: now,
          },
          actor_id: ctx.actorEmployeeId,
          status: 'COMPLETED',
          retry_count: 0,
          max_retries: 3,
          available_at: now,
          created_at: now,
        };

        emittedEvents.push(eventRecord);
        hrEventBus.emit('vendor.approved', {
          vendor_id: vendorId,
          organization_id: ctx.organizationId,
          actor_id: ctx.actorEmployeeId,
          timestamp: now,
        });

        // Also emit vendor.activated
        const actEvent: DomainEventRecord = {
          id: `evt_vact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          organization_id: ctx.organizationId,
          event_type: 'vendor.activated',
          aggregate_type: 'vendor',
          aggregate_id: vendorId,
          idempotency_key: `vact_${vendorId}_${Date.now()}`,
          payload: {
            vendorId,
            activatedAt: now,
          },
          actor_id: ctx.actorEmployeeId,
          status: 'COMPLETED',
          retry_count: 0,
          max_retries: 3,
          available_at: now,
          created_at: now,
        };
        emittedEvents.push(actEvent);
        hrEventBus.emit('vendor.activated', {
          vendor_id: vendorId,
          organization_id: ctx.organizationId,
          timestamp: now,
        });

        return {
          success: true,
          aggregateId: vendorId,
          aggregateType: 'vendor',
          emittedEvents,
          metadata: { status: 'ACTIVE', activated: true },
        };
      } else {
        // REJECT or CORRECTION_REQUIRED
        const isCorrection = ctx.comments?.toLowerCase().includes('correction') || false;
        const nextStatus = isCorrection ? 'CORRECTION_REQUIRED' : 'REJECTED';

        await vendorService.updateVendorStatus(vendorId, nextStatus, ctx.comments);

        const eventType = isCorrection ? 'vendor.correction_requested' : 'vendor.rejected';
        const now = new Date().toISOString();
        const eventRecord: DomainEventRecord = {
          id: `evt_vrej_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          organization_id: ctx.organizationId,
          event_type: eventType,
          aggregate_type: 'vendor',
          aggregate_id: vendorId,
          idempotency_key: `vrej_${vendorId}_${Date.now()}`,
          payload: {
            vendorId,
            decision: ctx.decision,
            status: nextStatus,
            reason: ctx.comments || 'Rejected during Company Admin Review',
            decidedAt: now,
          },
          actor_id: ctx.actorEmployeeId,
          status: 'COMPLETED',
          retry_count: 0,
          max_retries: 3,
          available_at: now,
          created_at: now,
        };

        emittedEvents.push(eventRecord);
        hrEventBus.emit(eventType, {
          vendor_id: vendorId,
          organization_id: ctx.organizationId,
          reason: ctx.comments,
          timestamp: now,
        });

        return {
          success: true,
          aggregateId: vendorId,
          aggregateType: 'vendor',
          emittedEvents,
          metadata: { status: nextStatus, reason: ctx.comments },
        };
      }
    } catch (err: any) {
      console.error('[VendorOnboardingApprovalAdapter] Execution failed:', err);
      return {
        success: false,
        aggregateId: vendorId,
        aggregateType: 'vendor',
        emittedEvents: [],
        error: err.message || 'Vendor onboarding approval execution error',
      };
    }
  }
}
