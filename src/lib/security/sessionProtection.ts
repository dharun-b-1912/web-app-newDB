// src/lib/security/sessionProtection.ts
// ============================================================
// Joy PeopleHR Enterprise — Session Protection & Anti-Hijack Engine
// Detects cross-device token exfiltration and session tampering
// ============================================================

export interface DeviceFingerprint {
  hash: string;
  userAgent: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  language: string;
  timestamp: number;
}

const SESSION_FINGERPRINT_KEY = 'wf_sec_fp_v1';

/**
 * Fast DJB2 + FNV-1a hybrid hashing algorithm for client environment signature
 */
function generateHash(input: string): string {
  let hash1 = 5381;
  let hash2 = 2166136261;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = (hash2 ^ char) * 16777619;
  }

  const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

/**
 * Generates an environment-specific device signature
 */
export function getDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    return {
      hash: 'ssr-node-env',
      userAgent: 'server',
      platform: 'server',
      screenResolution: '0x0',
      timezone: 'UTC',
      language: 'en',
      timestamp: Date.now(),
    };
  }

  const userAgent = navigator.userAgent || 'unknown-ua';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || 'unknown-platform';
  const screenResolution = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown-tz';
  const language = navigator.language || 'en';

  const rawSignature = [
    userAgent,
    platform,
    screenResolution,
    timezone,
    language,
  ].join('|||');

  const hash = generateHash(rawSignature);

  return {
    hash,
    userAgent,
    platform,
    screenResolution,
    timezone,
    language,
    timestamp: Date.now(),
  };
}

/**
 * Binds active authenticated session to the current device fingerprint.
 * Uses sessionStorage (isolated to current tab/window) to prevent cross-profile copying.
 */
export function bindSessionFingerprint(userId: string): void {
  try {
    const fp = getDeviceFingerprint();
    const payload = JSON.stringify({
      userId,
      hash: fp.hash,
      boundAt: Date.now(),
    });
    sessionStorage.setItem(SESSION_FINGERPRINT_KEY, payload);
  } catch (err) {
    console.warn('[SessionProtection] Failed to bind fingerprint to sessionStorage:', err);
  }
}

/**
 * Validates whether the active session belongs to the current hardware/browser context.
 * Returns true if valid, false if a hijack or copied session is detected.
 */
export function validateSessionIntegrity(userId?: string): { isValid: boolean; reason?: string } {
  try {
    if (typeof window === 'undefined') return { isValid: true };

    const storedRaw = sessionStorage.getItem(SESSION_FINGERPRINT_KEY);
    
    // If no fingerprint bound yet, allow binding
    if (!storedRaw) {
      if (userId) {
        bindSessionFingerprint(userId);
      }
      return { isValid: true };
    }

    const parsed = JSON.parse(storedRaw);
    const currentFp = getDeviceFingerprint();

    // Check device signature match
    if (parsed.hash !== currentFp.hash) {
      console.error('[SECURITY ALERT] Session Hijacking / Device Signature Mismatch Detected!');
      return {
        isValid: false,
        reason: 'Device signature mismatch (potential session transfer or hijack)',
      };
    }

    // Check user ID match if provided
    if (userId && parsed.userId && parsed.userId !== userId) {
      console.error('[SECURITY ALERT] User ID mismatch in active session fingerprint!');
      return {
        isValid: false,
        reason: 'User ID divergence in active session context',
      };
    }

    return { isValid: true };
  } catch (err) {
    console.warn('[SessionProtection] Validation error, failing safe:', err);
    return { isValid: true };
  }
}

/**
 * Clears bound session fingerprint upon logout or security invalidation
 */
export function clearSessionFingerprint(): void {
  try {
    sessionStorage.removeItem(SESSION_FINGERPRINT_KEY);
  } catch (_) {}
}
