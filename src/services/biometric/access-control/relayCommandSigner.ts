// src/services/biometric/access-control/relayCommandSigner.ts
// ============================================================================
// Joy PeopleHR — Gate B15: Short-Lived Single-Use Relay Command Signer
// ============================================================================

import { computeSha256 } from '../../operations/vendorGovernancePolicyEngine';
import { AccessDecisionResult } from './accessDecisionEngine';

export interface SignedRelayCommandPayload {
  command_id: string;
  device_id: string;
  employee_id?: string;
  decision: 'ALLOW' | 'DENY';
  relay_duration_ms: number;
  issued_at: string;
  expires_at: string;
  nonce: string;
  signature: string;
}

export class RelayCommandSigner {
  private static readonly MAX_PULSE_DURATION_MS = 5000;
  private static readonly COMMAND_TTL_MS = 5000;

  static signCommand(
    deviceId: string,
    decisionResult: AccessDecisionResult
  ): SignedRelayCommandPayload {
    const commandId = `RELAY_CMD_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const nonce = `NONCE_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + this.COMMAND_TTL_MS);

    // Enforce Max Pulse Duration Invariant
    let durationMs = decisionResult.pulseDurationMs;
    if (durationMs > this.MAX_PULSE_DURATION_MS) {
      durationMs = this.MAX_PULSE_DURATION_MS;
    }
    if (decisionResult.decision !== 'ALLOW') {
      durationMs = 0;
    }

    const rawToSign = `${commandId}|${deviceId}|${decisionResult.employeeId || 'ANON'}|${decisionResult.decision}|${durationMs}|${issuedAt.toISOString()}|${nonce}`;
    const signature = computeSha256(rawToSign);

    return {
      command_id: commandId,
      device_id: deviceId,
      employee_id: decisionResult.employeeId,
      decision: decisionResult.decision === 'ALLOW' ? 'ALLOW' : 'DENY',
      relay_duration_ms: durationMs,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      nonce,
      signature,
    };
  }

  static verifySignature(cmd: SignedRelayCommandPayload): boolean {
    const rawToSign = `${cmd.command_id}|${cmd.device_id}|${cmd.employee_id || 'ANON'}|${cmd.decision}|${cmd.relay_duration_ms}|${cmd.issued_at}|${cmd.nonce}`;
    const expected = computeSha256(rawToSign);
    return expected === cmd.signature;
  }
}
