// src/services/biometric/certification/wiegandRelayController.ts
// ============================================================================
// Joy PeopleHR — Gate B15: Wiegand Turnstile & Barrier Relay Controller
// ============================================================================

import { computeSha256 } from '../../operations/vendorGovernancePolicyEngine';

export interface SignedAccessCommand {
  commandId: string;
  employeeId: string;
  deviceId: string;
  locationId: string;
  accessDecision: 'ALLOW' | 'DENY';
  reason: string;
  relayPulseDurationSeconds: number; // 5s for ALLOW, 0s for DENY
  issuedAt: string;
  expiresAt: string; // 5-second TTL
  signature: string;
}

export class WiegandRelayController {
  static issueSignedCommand(params: {
    employeeId: string;
    deviceId: string;
    locationId: string;
    workerActive: boolean;
    locationAuthorized: boolean;
    vendorCompliant: boolean;
  }): SignedAccessCommand {
    const isAllowed = params.workerActive && params.locationAuthorized && params.vendorCompliant;
    const commandId = `RELAY_CMD_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 5000); // 5000ms TTL

    let reason = 'ACCESS_AUTHORIZED_TURNSTILE_OPEN';
    if (!params.workerActive) reason = 'DENIED_WORKER_INACTIVE';
    else if (!params.locationAuthorized) reason = 'DENIED_LOCATION_UNAUTHORIZED';
    else if (!params.vendorCompliant) reason = 'DENIED_VENDOR_NON_COMPLIANT';

    const raw = `${commandId}|${params.employeeId}|${params.deviceId}|${isAllowed ? 'ALLOW' : 'DENY'}|${issuedAt.toISOString()}`;
    const signature = computeSha256(raw);

    return {
      commandId,
      employeeId: params.employeeId,
      deviceId: params.deviceId,
      locationId: params.locationId,
      accessDecision: isAllowed ? 'ALLOW' : 'DENY',
      reason,
      relayPulseDurationSeconds: isAllowed ? 5 : 0,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      signature,
    };
  }

  static verifyAndExecuteRelay(command: SignedAccessCommand): {
    turnstileActivated: boolean;
    status: 'EXECUTED_5S_PULSE' | 'COMMAND_EXPIRED' | 'COMMAND_DENIED' | 'SIGNATURE_MISMATCH';
  } {
    const now = Date.now();
    const expiry = new Date(command.expiresAt).getTime();

    if (now > expiry) {
      return { turnstileActivated: false, status: 'COMMAND_EXPIRED' };
    }

    if (command.accessDecision !== 'ALLOW') {
      return { turnstileActivated: false, status: 'COMMAND_DENIED' };
    }

    return { turnstileActivated: true, status: 'EXECUTED_5S_PULSE' };
  }
}
