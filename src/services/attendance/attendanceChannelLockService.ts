// src/services/attendance/attendanceChannelLockService.ts
// ============================================================================
// JOY PeopleHR — Attendance Channel Lock Service v1.0.0
// ONE EMPLOYEE = ONE SESSION PER WORKING DAY
// The first accepted attendance CHANNEL (BIOMETRIC or MOBILE) locks the session.
// Cross-channel events are stored as raw evidence — NOT new sessions.
//
// Architecture:
//   CHANNEL = the SOURCE category (BIOMETRIC covers Fingerprint + Face + RFID + Card)
//             (MOBILE covers GPS app, Web Kiosk)
//
// Scenario A — Biometric first:
//   08:52 FINGERPRINT → CHECK_IN  | Source=BIOMETRIC | Session OPEN, Channel LOCKED
//   09:05 FACE        → Evidence  | Source=BIOMETRIC | Same channel — accepted as in-session
//   12:37 RFID        → Evidence  | Source=BIOMETRIC | Same channel — in-session (not checkout)
//   18:07 RFID        → CHECK_OUT | Source=BIOMETRIC | Eligible for checkout → LAST-OUT
//   ✓ ONE attendance record, Source=BIOMETRIC
//
// Scenario B — Mobile first:
//   08:55 Mobile GPS  → CHECK_IN  | Source=MOBILE    | Session OPEN, Channel LOCKED
//   09:03 FINGERPRINT → Evidence  | Source=BIOMETRIC | Cross-channel → stored as evidence only
//   18:02 Mobile GPS  → CHECK_OUT | Source=MOBILE    | Session CLOSED
//   ✓ ONE attendance record, Source=MOBILE
// ============================================================================

export type AttendanceChannel = 'BIOMETRIC' | 'MOBILE' | 'MANUAL' | 'SYSTEM';

export type BiometricMethod = 'FINGERPRINT' | 'FACE' | 'RFID' | 'CARD' | 'PIN' | 'PASSWORD';
export type MobileMethod   = 'GPS' | 'WIFI' | 'BEACON';

export type ChannelLockDecision =
  | 'SESSION_OPENED'          // First punch — session created, channel locked
  | 'IN_SESSION_SAME_CHANNEL' // Same channel, session active → just an evidence punch
  | 'CHECKOUT_SAME_CHANNEL'   // Same channel, eligible for checkout → LAST-OUT
  | 'CROSS_CHANNEL_EVIDENCE'  // Different channel → stored as evidence, session unchanged
  | 'CROSS_CHANNEL_CHECKOUT_BLOCKED' // Attempt to checkout via different channel (policy: block)
  | 'CROSS_CHANNEL_CHECKOUT_ALLOWED' // Attempt to checkout via different channel (policy: allow)
  | 'ALREADY_CHECKED_OUT'     // Session already has a final checkout
  | 'DUPLICATE'               // Too close in time, ignored
  | 'UNMAPPED';               // Employee not found

export interface ChannelLockEvaluation {
  decision: ChannelLockDecision;
  channel: AttendanceChannel;
  method: string;
  sessionId?: string;
  sessionChannel?: AttendanceChannel;
  reason: string;
  isCountedForAttendance: boolean; // Only true if decision affects attendance (check-in or check-out)
  isStoredAsEvidence: boolean;     // True if we keep the raw event in the ledger
}

/**
 * Map a raw source string (as used in attendanceDecisionEngine) to an AttendanceChannel.
 * BIOMETRIC covers ALL physical device methods regardless of modality (fingerprint, face, RFID).
 */
export function resolveChannel(source: string): AttendanceChannel {
  switch (source?.toUpperCase()) {
    case 'BIOMETRIC':
    case 'BIOMETRIC_TCP':
    case 'BIOMETRIC_GATEWAY':
    case 'FINGERPRINT':
    case 'FACE':
    case 'RFID':
    case 'CARD':
    case 'PIN':
    case 'PASSWORD':
    case 'ZKTECOCLOUD':
    case 'ESSL':
    case 'MANTRA':
    case 'SUPREMA':
    case 'MATRIX':
    case 'HIKVISION':
      return 'BIOMETRIC';

    case 'MOBILE':
    case 'MOBILE_GPS':
    case 'GPS':
    case 'WEB_KIOSK':
    case 'KIOSK':
    case 'WIFI':
    case 'BEACON':
      return 'MOBILE';

    case 'MANUAL':
    case 'MANUAL_AUDIT':
    case 'IMPORT':
    case 'API':
    case 'HR_OVERRIDE':
      return 'MANUAL';

    case 'SYSTEM':
    case 'AUTO_CHECKOUT':
    case 'SYSTEM_CRON':
      return 'SYSTEM';

    default:
      return 'BIOMETRIC'; // Default to biometric for unknown device sources
  }
}

/**
 * Policy config for how cross-channel checkouts are handled.
 */
export interface ChannelLockPolicy {
  /** Whether a checkout from a different channel is allowed to close the session (default: false) */
  allowCrossChannelCheckout: boolean;
  /** Duplicate punch suppression window in seconds (default: 60s) */
  duplicateWindowSeconds: number;
  /** Whether MANUAL/HR overrides bypass channel lock (default: true) */
  manualOverrideBypassesLock: boolean;
}

export const DEFAULT_CHANNEL_LOCK_POLICY: ChannelLockPolicy = {
  allowCrossChannelCheckout: false,
  duplicateWindowSeconds: 60,
  manualOverrideBypassesLock: true,
};

/**
 * Evaluate whether an incoming punch should:
 *  a) Open a new session (first punch),
 *  b) Count as a same-channel in-session event,
 *  c) Count as a same-channel checkout,
 *  d) Be stored as cross-channel evidence only, or
 *  e) Be ignored as a duplicate.
 *
 * This is the single authoritative function called by:
 *   - BiometricEventPipelineService (hardware punches)
 *   - MobileAttendanceClientService (GPS punches)
 *   - AttendanceDecisionEngine (unified engine)
 */
export function evaluateChannelLock(params: {
  incomingSource: string;    // Raw source string from the device/system
  incomingMethod?: string;   // e.g. FINGERPRINT, FACE, GPS
  punchIntent?: 'CHECK_IN' | 'CHECK_OUT' | 'AUTO';
  punchTimestamp: string;    // ISO string
  isNearShiftEnd?: boolean;  // True if current time is past shift end - tolerance
  elapsedMinutesSinceCheckIn?: number; // How long since first punch

  /** Current session state — null if no session exists today */
  currentSession: {
    sessionId: string;
    channel: AttendanceChannel;
    checkedInAt: string;
    isCheckedOut: boolean;
    lastPunchAt?: string;
  } | null;

  policy?: ChannelLockPolicy;
}): ChannelLockEvaluation {
  const policy = params.policy ?? DEFAULT_CHANNEL_LOCK_POLICY;
  const incomingChannel = resolveChannel(params.incomingSource);
  const punchTime = new Date(params.punchTimestamp);

  // ─── MANUAL/SYSTEM always bypass channel lock ───────────────────────────
  if (incomingChannel === 'MANUAL' || incomingChannel === 'SYSTEM') {
    if (params.currentSession?.isCheckedOut) {
      return {
        decision: 'ALREADY_CHECKED_OUT',
        channel: incomingChannel,
        method: params.incomingMethod || incomingChannel,
        sessionId: params.currentSession.sessionId,
        sessionChannel: params.currentSession.channel,
        reason: 'Session already finalized. Manual override can re-open via HR regularization.',
        isCountedForAttendance: false,
        isStoredAsEvidence: true,
      };
    }
    return {
      decision: params.currentSession ? 'CHECKOUT_SAME_CHANNEL' : 'SESSION_OPENED',
      channel: incomingChannel,
      method: params.incomingMethod || 'MANUAL',
      sessionId: params.currentSession?.sessionId,
      sessionChannel: incomingChannel,
      reason: 'Manual/System override — channel lock bypassed.',
      isCountedForAttendance: true,
      isStoredAsEvidence: true,
    };
  }

  // ─── NO ACTIVE SESSION → First punch of the day ─────────────────────────
  if (!params.currentSession) {
    return {
      decision: 'SESSION_OPENED',
      channel: incomingChannel,
      method: params.incomingMethod || incomingChannel,
      reason: `First valid punch of workday via ${incomingChannel}. Session opened and channel locked.`,
      isCountedForAttendance: true,
      isStoredAsEvidence: true,
    };
  }

  // ─── SESSION EXISTS AND ALREADY CHECKED OUT ──────────────────────────────
  if (params.currentSession.isCheckedOut) {
    return {
      decision: 'ALREADY_CHECKED_OUT',
      channel: incomingChannel,
      method: params.incomingMethod || incomingChannel,
      sessionId: params.currentSession.sessionId,
      sessionChannel: params.currentSession.channel,
      reason: `Attendance session for today is already finalized (checked out). Event stored as evidence.`,
      isCountedForAttendance: false,
      isStoredAsEvidence: true,
    };
  }

  const sessionChannel = params.currentSession.channel;

  // ─── DUPLICATE WINDOW CHECK ──────────────────────────────────────────────
  if (params.currentSession.lastPunchAt) {
    const lastPunch = new Date(params.currentSession.lastPunchAt);
    const gapSeconds = (punchTime.getTime() - lastPunch.getTime()) / 1000;
    if (gapSeconds >= 0 && gapSeconds < policy.duplicateWindowSeconds) {
      return {
        decision: 'DUPLICATE',
        channel: incomingChannel,
        method: params.incomingMethod || incomingChannel,
        sessionId: params.currentSession.sessionId,
        sessionChannel,
        reason: `Punch suppressed — duplicate within ${policy.duplicateWindowSeconds}s window (${Math.round(gapSeconds)}s since last punch).`,
        isCountedForAttendance: false,
        isStoredAsEvidence: true,
      };
    }
  }

  // ─── CROSS-CHANNEL EVENT ─────────────────────────────────────────────────
  if (incomingChannel !== sessionChannel) {
    const isTryingToCheckout = params.punchIntent === 'CHECK_OUT' || params.isNearShiftEnd;

    if (isTryingToCheckout && policy.allowCrossChannelCheckout) {
      return {
        decision: 'CROSS_CHANNEL_CHECKOUT_ALLOWED',
        channel: incomingChannel,
        method: params.incomingMethod || incomingChannel,
        sessionId: params.currentSession.sessionId,
        sessionChannel,
        reason: `Cross-channel checkout accepted (policy: allowCrossChannelCheckout=true). Session was locked to ${sessionChannel}, checkout via ${incomingChannel}.`,
        isCountedForAttendance: true,
        isStoredAsEvidence: true,
      };
    }

    if (isTryingToCheckout && !policy.allowCrossChannelCheckout) {
      return {
        decision: 'CROSS_CHANNEL_CHECKOUT_BLOCKED',
        channel: incomingChannel,
        method: params.incomingMethod || incomingChannel,
        sessionId: params.currentSession.sessionId,
        sessionChannel,
        reason: `Cross-channel checkout blocked. Session locked to ${sessionChannel}. Checkout via ${incomingChannel} is not permitted (policy: allowCrossChannelCheckout=false). Event stored as evidence.`,
        isCountedForAttendance: false,
        isStoredAsEvidence: true,
      };
    }

    // General cross-channel in-session event (not a checkout)
    return {
      decision: 'CROSS_CHANNEL_EVIDENCE',
      channel: incomingChannel,
      method: params.incomingMethod || incomingChannel,
      sessionId: params.currentSession.sessionId,
      sessionChannel,
      reason: `Cross-channel event detected. Session locked to ${sessionChannel}; ${incomingChannel} event stored as raw evidence only. Attendance unchanged.`,
      isCountedForAttendance: false,
      isStoredAsEvidence: true,
    };
  }

  // ─── SAME CHANNEL ────────────────────────────────────────────────────────
  // Check if this punch is a valid checkout (explicit OUT, or near/past shift end)
  const isExplicitCheckout = params.punchIntent === 'CHECK_OUT';
  const isNearShiftEnd = params.isNearShiftEnd ?? false;
  const hasBeenInsideMinimumWindow = (params.elapsedMinutesSinceCheckIn ?? 0) >= 30; // At least 30m since check-in

  const isEligibleForCheckout = isExplicitCheckout || (isNearShiftEnd && hasBeenInsideMinimumWindow);

  if (isEligibleForCheckout) {
    return {
      decision: 'CHECKOUT_SAME_CHANNEL',
      channel: incomingChannel,
      method: params.incomingMethod || incomingChannel,
      sessionId: params.currentSession.sessionId,
      sessionChannel,
      reason: `Same-channel checkout accepted via ${incomingChannel} (${params.incomingMethod || ''}). Last-Out principle: session stays open until a later valid checkout.`,
      isCountedForAttendance: true,
      isStoredAsEvidence: true,
    };
  }

  // Same channel, not a checkout — just an in-session biometric verification
  return {
    decision: 'IN_SESSION_SAME_CHANNEL',
    channel: incomingChannel,
    method: params.incomingMethod || incomingChannel,
    sessionId: params.currentSession.sessionId,
    sessionChannel,
    reason: `Same-channel in-session event (${incomingChannel} / ${params.incomingMethod || ''}). Session already active. Stored as biometric verification evidence.`,
    isCountedForAttendance: false,
    isStoredAsEvidence: true,
  };
}

/**
 * Human-readable label for a channel lock decision.
 */
export function getDecisionLabel(decision: ChannelLockDecision): string {
  switch (decision) {
    case 'SESSION_OPENED':                return '✓ Check-In (Session Opened)';
    case 'IN_SESSION_SAME_CHANNEL':       return '◎ In-Session Verification';
    case 'CHECKOUT_SAME_CHANNEL':         return '✓ Check-Out (Last-Out)';
    case 'CROSS_CHANNEL_EVIDENCE':        return '◷ Cross-Channel Evidence (Stored)';
    case 'CROSS_CHANNEL_CHECKOUT_BLOCKED':return '✗ Cross-Channel Checkout (Blocked)';
    case 'CROSS_CHANNEL_CHECKOUT_ALLOWED':return '✓ Cross-Channel Checkout (Allowed)';
    case 'ALREADY_CHECKED_OUT':           return '✗ Already Checked Out';
    case 'DUPLICATE':                     return '⊘ Duplicate (Suppressed)';
    case 'UNMAPPED':                      return '⚠ Unmapped Employee';
    default:                              return decision;
  }
}

/**
 * Badge color for UI rendering of each decision.
 */
export function getDecisionBadgeColor(decision: ChannelLockDecision): string {
  switch (decision) {
    case 'SESSION_OPENED':
    case 'CHECKOUT_SAME_CHANNEL':
    case 'CROSS_CHANNEL_CHECKOUT_ALLOWED':
      return 'emerald';
    case 'IN_SESSION_SAME_CHANNEL':
      return 'blue';
    case 'CROSS_CHANNEL_EVIDENCE':
      return 'amber';
    case 'CROSS_CHANNEL_CHECKOUT_BLOCKED':
    case 'ALREADY_CHECKED_OUT':
      return 'orange';
    case 'DUPLICATE':
      return 'gray';
    case 'UNMAPPED':
      return 'red';
    default:
      return 'gray';
  }
}
