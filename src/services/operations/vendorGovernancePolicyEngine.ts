// src/services/operations/vendorGovernancePolicyEngine.ts
// ============================================================================
// Joy PeopleHR — Enterprise Vendor Governance Policy & Suspension Cascade Engine
// 1. Vendor Suspension & Governance State Machine (ACTIVE -> AT_RISK -> RESTRICTED -> SUSPENDED -> TERMINATED)
// 2. Controlled Worker Deployment State Machine (DRAFT -> ACTIVE -> RETURNED/COMPLETED)
// 3. Deterministic SHA-256 Canonical Financial & Compliance Snapshot Seal
// ============================================================================

import { supabase } from '../../lib/supabase';
import { enterpriseNotificationEngine } from './enterpriseNotificationEngine';

export type VendorGovernanceStatus =
  | 'ACTIVE'
  | 'AT_RISK'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'TERMINATED';

export type GovernanceTriggerEvent =
  | 'LICENSE_EXPIRED'
  | 'FORM_V_EXPIRED'
  | 'CRITICAL_COMPLIANCE_SCORE'
  | 'PF_ESI_DEFAULT'
  | 'FRAUD_INVESTIGATION'
  | 'CONTRACT_TERMINATED'
  | 'MANUAL_SUSPENSION';

export type DeploymentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DOCUMENT_VERIFICATION'
  | 'SAFETY_CLEARANCE'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'SUSPENDED'
  | 'RETURNED_TO_VENDOR'
  | 'COMPLETED'
  | 'CANCELLED';

export interface GovernanceCascadeRules {
  canDeployNewWorkers: boolean;
  attendanceAction: 'ALLOW' | 'POLICY_BASED' | 'BLOCK' | 'EXCEPTION_ONLY';
  invoiceSubmissionAction: 'ALLOW' | 'HOLD_REVIEW' | 'BLOCK' | 'CLOSED';
  paymentAction: 'ALLOW' | 'EXISTING_ONLY' | 'HOLD' | 'FINAL_SETTLEMENT_ONLY';
}

export interface ImmutableFinancialSnapshot {
  agreement_version: string;
  po_reference: string;
  rate_snapshot: Record<string, any>;
  attendance_snapshot: {
    total_billable_days: number;
    clocked_ot_hours: number;
    approved_ot_hours: number;
    rejected_ot_hours: number;
    billable_ot_hours: number;
  };
  commercial_snapshot: {
    margin_basis: string;
    margin_pct: number;
    margin_amount: number;
    gross_wages: number;
    subtotal: number;
  };
  tax_snapshot: {
    gst_rate: number;
    gst_amount: number;
    tds_rate: number;
    tds_amount: number;
    net_payable: number;
  };
  compliance_snapshot: {
    vendor_compliance_score: number;
    vendor_performance_score: number;
    labour_license_valid: boolean;
    pf_esi_submitted: boolean;
    worker_kyc_pct: number;
  };
  calculation_hash: string;
  calculated_at: string;
  approved_by: string;
  approved_at: string;
}

/**
 * Deterministic JSON stringifier with key sorting for cryptographic hashing
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map((key) => `"${key}":${canonicalizeJson(obj[key])}`);
  return '{' + parts.join(',') + '}';
}

/**
 * Cryptographic SHA-256 calculation hash generator
 */
export function computeSha256(str: string): string {
  // Pure JS fast SHA-256 implementation
  function rotateRight(n: number, x: number) {
    return (x >>> n) | (x << (32 - n));
  }
  function choice(x: number, y: number, z: number) {
    return (x & y) ^ (~x & z);
  }
  function majority(x: number, y: number, z: number) {
    return (x & y) ^ (x & z) ^ (y & z);
  }
  function sigma0(x: number) {
    return rotateRight(2, x) ^ rotateRight(13, x) ^ rotateRight(22, x);
  }
  function sigma1(x: number) {
    return rotateRight(6, x) ^ rotateRight(11, x) ^ rotateRight(25, x);
  }
  function gamma0(x: number) {
    return rotateRight(7, x) ^ rotateRight(18, x) ^ (x >>> 3);
  }
  function gamma1(x: number) {
    return rotateRight(17, x) ^ rotateRight(19, x) ^ (x >>> 10);
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128) bytes.push(code);
    else if (code < 2048) {
      bytes.push((code >> 6) | 192, (code & 63) | 128);
    } else {
      bytes.push((code >> 12) | 224, ((code >> 6) & 63) | 128, (code & 63) | 128);
    }
  }

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) {
    bytes.push((bitLen >>> (i * 8)) & 255);
  }

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    const W: number[] = new Array(64);
    for (let i = 0; i < 16; i++) {
      const idx = chunk + i * 4;
      W[i] = (bytes[idx] << 24) | (bytes[idx + 1] << 16) | (bytes[idx + 2] << 8) | bytes[idx + 3];
    }
    for (let i = 16; i < 64; i++) {
      W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const T1 = (h + sigma1(e) + choice(e, f, g) + K[i] + W[i]) | 0;
      const T2 = (sigma0(a) + majority(a, b, c)) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + T1) | 0;
      d = c;
      c = b;
      b = a;
      a = (T1 + T2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  return H.map((h) => ('00000000' + (h >>> 0).toString(16)).slice(-8)).join('');
}

class VendorGovernancePolicyEngine {
  /**
   * 1. Evaluates what operational actions are allowed based on Vendor Governance Status
   */
  getGovernanceCascadeRules(status: VendorGovernanceStatus): GovernanceCascadeRules {
    switch (status) {
      case 'ACTIVE':
        return {
          canDeployNewWorkers: true,
          attendanceAction: 'ALLOW',
          invoiceSubmissionAction: 'ALLOW',
          paymentAction: 'ALLOW',
        };
      case 'AT_RISK':
        return {
          canDeployNewWorkers: true,
          attendanceAction: 'ALLOW',
          invoiceSubmissionAction: 'ALLOW',
          paymentAction: 'ALLOW',
        };
      case 'RESTRICTED':
        return {
          canDeployNewWorkers: false,
          attendanceAction: 'POLICY_BASED',
          invoiceSubmissionAction: 'HOLD_REVIEW',
          paymentAction: 'EXISTING_ONLY',
        };
      case 'SUSPENDED':
        return {
          canDeployNewWorkers: false,
          attendanceAction: 'BLOCK',
          invoiceSubmissionAction: 'BLOCK',
          paymentAction: 'HOLD',
        };
      case 'TERMINATED':
        return {
          canDeployNewWorkers: false,
          attendanceAction: 'BLOCK',
          invoiceSubmissionAction: 'CLOSED',
          paymentAction: 'FINAL_SETTLEMENT_ONLY',
        };
    }
  }

  /**
   * 2. Executes a Vendor Governance Suspension Cascade
   */
  async triggerGovernanceCascade(params: {
    organizationId: string;
    vendorId: string;
    vendorName: string;
    event: GovernanceTriggerEvent;
    targetStatus: VendorGovernanceStatus;
    reason: string;
    actorName: string;
  }): Promise<{ success: boolean; newStatus: VendorGovernanceStatus; rules: GovernanceCascadeRules }> {
    const rules = this.getGovernanceCascadeRules(params.targetStatus);

    try {
      await supabase
        .from('vendor_commercial_agreements')
        .update({
          status: params.targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('vendor_id', params.vendorId);

      await enterpriseNotificationEngine.dispatchEvent({
        organizationId: params.organizationId,
        eventType: params.targetStatus === 'SUSPENDED' ? 'VENDOR_RISK_CRITICAL' : 'VENDOR_LICENSE_EXPIRING',
        recipientId: 'compliance-team',
        recipientName: 'Compliance Officer',
        title: `🚨 Vendor Governance Alert: ${params.vendorName} is now ${params.targetStatus}`,
        message: `Triggered by ${params.event}: ${params.reason}. Action required by Compliance & Finance teams.`,
        variables: {
          vendor_id: params.vendorId,
          governance_status: params.targetStatus,
        },
      });

      return { success: true, newStatus: params.targetStatus, rules };
    } catch (err: any) {
      console.error('[GovernanceEngine] Cascade exception:', err);
      return { success: false, newStatus: params.targetStatus, rules };
    }
  }

  /**
   * 3. Validates and transitions a Contract Worker Deployment State Machine
   */
  validateDeploymentTransition(
    currentStatus: DeploymentStatus,
    targetStatus: DeploymentStatus
  ): { valid: boolean; reason?: string } {
    const validTransitions: Record<DeploymentStatus, DeploymentStatus[]> = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['DOCUMENT_VERIFICATION', 'CANCELLED', 'ON_HOLD'],
      DOCUMENT_VERIFICATION: ['SAFETY_CLEARANCE', 'ON_HOLD', 'CANCELLED'],
      SAFETY_CLEARANCE: ['PENDING_APPROVAL', 'ON_HOLD', 'CANCELLED'],
      PENDING_APPROVAL: ['APPROVED', 'ON_HOLD', 'CANCELLED'],
      APPROVED: ['ACTIVE', 'ON_HOLD', 'CANCELLED'],
      ACTIVE: ['ON_HOLD', 'SUSPENDED', 'RETURNED_TO_VENDOR', 'COMPLETED'],
      ON_HOLD: ['DOCUMENT_VERIFICATION', 'SAFETY_CLEARANCE', 'ACTIVE', 'CANCELLED'],
      SUSPENDED: ['ACTIVE', 'RETURNED_TO_VENDOR', 'COMPLETED'],
      RETURNED_TO_VENDOR: [],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[currentStatus]?.includes(targetStatus) ?? false;
    if (!allowed) {
      return {
        valid: false,
        reason: `Illegal state transition: Cannot change deployment from "${currentStatus}" to "${targetStatus}".`,
      };
    }
    return { valid: true };
  }

  /**
   * 4. Generates an Immutable Financial Snapshot with deterministic SHA-256 seal
   */
  generateImmutableSnapshot(params: {
    agreementVersion: string;
    poReference: string;
    rateSnapshot: Record<string, any>;
    attendanceSnapshot: {
      total_billable_days: number;
      clocked_ot_hours: number;
      approved_ot_hours: number;
      rejected_ot_hours: number;
      billable_ot_hours: number;
    };
    commercialSnapshot: {
      margin_basis: string;
      margin_pct: number;
      margin_amount: number;
      gross_wages: number;
      subtotal: number;
    };
    taxSnapshot: {
      gst_rate: number;
      gst_amount: number;
      tds_rate: number;
      tds_amount: number;
      net_payable: number;
    };
    complianceSnapshot: {
      vendor_compliance_score: number;
      vendor_performance_score: number;
      labour_license_valid: boolean;
      pf_esi_submitted: boolean;
      worker_kyc_pct: number;
    };
    approvedBy: string;
  }): ImmutableFinancialSnapshot {
    const rawObject = {
      agreement_version: params.agreementVersion,
      po_reference: params.poReference,
      rate_snapshot: params.rateSnapshot,
      attendance_snapshot: params.attendanceSnapshot,
      commercial_snapshot: params.commercialSnapshot,
      tax_snapshot: params.taxSnapshot,
      compliance_snapshot: params.complianceSnapshot,
    };

    const canonicalJson = canonicalizeJson(rawObject);
    const sha256Hex = computeSha256(canonicalJson);
    const calculationHash = `SHA256:${sha256Hex}`;

    return {
      agreement_version: params.agreementVersion,
      po_reference: params.poReference,
      rate_snapshot: params.rateSnapshot,
      attendance_snapshot: params.attendanceSnapshot,
      commercial_snapshot: params.commercialSnapshot,
      tax_snapshot: params.taxSnapshot,
      compliance_snapshot: params.complianceSnapshot,
      calculation_hash: calculationHash,
      calculated_at: new Date().toISOString(),
      approved_by: params.approvedBy,
      approved_at: new Date().toISOString(),
    };
  }
}

export const vendorGovernancePolicyEngine = new VendorGovernancePolicyEngine();
