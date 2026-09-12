// src/services/vendor/vendorOnboardingLifecycleEngine.ts
// ============================================================================
// JOY PeopleHR — Server-Authoritative Vendor Lifecycle State Machine Engine
// Validates transitions, blocks illegal skips, and records immutable audit trails
// ============================================================================

import { VendorOnboardingStatus } from '../../types/vendorEcosystem';
import { hrEventBus } from '../hrEventBus';
import { CANONICAL_DOMAIN_EVENTS } from '../../types/domainEvents';

const ALLOWED_TRANSITIONS: Record<VendorOnboardingStatus, VendorOnboardingStatus[]> = {
  INVITED: ['DRAFT', 'EXPIRED', 'TERMINATED'],
  DRAFT: ['SUBMITTED', 'TERMINATED'],
  SUBMITTED: ['UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'],
  CORRECTION_REQUIRED: ['RESUBMITTED', 'REJECTED', 'TERMINATED'],
  RESUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED'],
  APPROVED: ['ACTIVE', 'SUSPENDED', 'TERMINATED'],
  ACTIVE: ['SUSPENDED', 'TERMINATED', 'INACTIVE'],
  SUSPENDED: ['ACTIVE', 'TERMINATED'],
  PENDING_VERIFICATION: ['ACTIVE', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CORRECTION_REQUIRED'],
  INACTIVE: ['ACTIVE', 'TERMINATED'],
  REJECTED: [],
  EXPIRED: [],
  TERMINATED: [],
};

export class VendorOnboardingLifecycleEngine {
  /**
   * Deterministically verifies if a proposed state transition is valid under the state machine
   */
  public static canTransition(current: VendorOnboardingStatus, target: VendorOnboardingStatus): boolean {
    if (current === target) return true;
    const allowed = ALLOWED_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }

  /**
   * Authoritatively asserts that a state transition is legal, throwing error if illegal
   */
  public static assertTransition(
    vendorId: string,
    current: VendorOnboardingStatus,
    target: VendorOnboardingStatus,
    actorId = 'SYSTEM'
  ): void {
    if (!this.canTransition(current, target)) {
      const msg = `ILLEGAL_STATE_TRANSITION: Vendor ${vendorId} cannot transition from ${current} to ${target}. Allowed next states: [${(ALLOWED_TRANSITIONS[current] || []).join(', ')}]`;
      console.error(`[VendorLifecycleEngine] ${msg}`);
      throw new Error(msg);
    }
  }

  /**
   * Maps lifecycle status transitions to canonical domain events
   */
  public static getDomainEventForStatus(status: VendorOnboardingStatus): string {
    switch (status) {
      case 'INVITED':
        return 'vendor.invited';
      case 'DRAFT':
        return 'vendor.onboarding_started';
      case 'SUBMITTED':
        return 'vendor.submitted';
      case 'CORRECTION_REQUIRED':
        return 'vendor.correction_requested';
      case 'RESUBMITTED':
        return 'vendor.resubmitted';
      case 'APPROVED':
        return 'vendor.approved';
      case 'ACTIVE':
        return 'vendor.activated';
      case 'REJECTED':
        return 'vendor.rejected';
      case 'SUSPENDED':
        return 'vendor.suspended';
      case 'TERMINATED':
        return 'vendor.terminated';
      default:
        return 'vendor.updated';
    }
  }
}
