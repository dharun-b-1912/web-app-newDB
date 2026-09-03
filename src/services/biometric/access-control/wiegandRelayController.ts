// src/services/biometric/access-control/wiegandRelayController.ts
// ============================================================================
// Joy PeopleHR — Gate B15: Physical Wiegand 26/34 & Barrier Relay Controller
// Enforces: Single-Use, TTL Expiry, Signature Verification & Fail-Secure Policy
// ============================================================================

import { SignedRelayCommandPayload, RelayCommandSigner } from './relayCommandSigner';

export type RelayExecutionStatus =
  | 'EXECUTED_PULSE'
  | 'REJECTED_EXPIRED_COMMAND'
  | 'REJECTED_REPLAY_ATTEMPT'
  | 'REJECTED_SIGNATURE_MISMATCH'
  | 'REJECTED_DENIED_DECISION';

export interface RelayExecutionResult {
  commandId: string;
  turnstileUnlocked: boolean;
  pulseDurationMs: number;
  status: RelayExecutionStatus;
  executedAt: string;
  reason: string;
}

export class WiegandRelayController {
  private static consumedCommands: Set<string> = new Set();

  static executeRelay(cmd: SignedRelayCommandPayload): RelayExecutionResult {
    const executedAt = new Date().toISOString();
    const now = Date.now();
    const expiry = new Date(cmd.expires_at).getTime();

    // 1. Replay Protection: Check if Command Already Consumed
    if (this.consumedCommands.has(cmd.command_id)) {
      return {
        commandId: cmd.command_id,
        turnstileUnlocked: false,
        pulseDurationMs: 0,
        status: 'REJECTED_REPLAY_ATTEMPT',
        executedAt,
        reason: 'Adversarial Replay Attack Blocked: Command ID already consumed.',
      };
    }

    // 2. Command Expiry (TTL ≤ 5000ms) Check
    if (now > expiry) {
      return {
        commandId: cmd.command_id,
        turnstileUnlocked: false,
        pulseDurationMs: 0,
        status: 'REJECTED_EXPIRED_COMMAND',
        executedAt,
        reason: 'Command Expired: Relay pulse command exceeded 5000ms TTL.',
      };
    }

    // 3. Digital Signature Verification
    if (!RelayCommandSigner.verifySignature(cmd)) {
      return {
        commandId: cmd.command_id,
        turnstileUnlocked: false,
        pulseDurationMs: 0,
        status: 'REJECTED_SIGNATURE_MISMATCH',
        executedAt,
        reason: 'Tampered Signature: Command cryptographic digest mismatch.',
      };
    }

    // Mark as single-use consumed
    this.consumedCommands.add(cmd.command_id);

    // 4. Decision Gate Check
    if (cmd.decision !== 'ALLOW' || cmd.relay_duration_ms <= 0) {
      return {
        commandId: cmd.command_id,
        turnstileUnlocked: false,
        pulseDurationMs: 0,
        status: 'REJECTED_DENIED_DECISION',
        executedAt,
        reason: 'Access Denied by Centralized Policy Engine.',
      };
    }

    // 5. Successful 5-Second Relay Activation
    return {
      commandId: cmd.command_id,
      turnstileUnlocked: true,
      pulseDurationMs: cmd.relay_duration_ms,
      status: 'EXECUTED_PULSE',
      executedAt,
      reason: `Relay pulse activated for ${cmd.relay_duration_ms}ms. Barrier opened.`,
    };
  }
}
