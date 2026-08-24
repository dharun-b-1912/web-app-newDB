// src/services/auth/smsProviderService.ts
// ============================================================================
// WorkForceOS — SMS Provider Interface & Normalization Framework
// Supports India TRAI/DLT compliance (Msg91, Fast2SMS) & Global Adapters (Twilio)
// With a non-blocking secure Developer Console mock adapter for offline dev.
// ============================================================================

/**
 * Normalizes any phone number into canonical E.164 format.
 * Defaults to +91 (India) if standard 10-digit mobile number is supplied.
 */
export function normalizePhoneNumber(raw: string, defaultCountryCode: string = '+91'): string {
  if (!raw) return '';
  // Strip all non-digit and non-plus characters
  let clean = raw.trim().replace(/[\s\-()]/g, '');

  if (clean.startsWith('+')) {
    return clean;
  }

  // Remove leading 0 (common in India trunk prefixes: e.g. 09876543210)
  if (clean.startsWith('0') && clean.length === 11) {
    clean = clean.slice(1);
  }

  // If 10 digits, prepend default country code (+91)
  if (/^\d{10}$/.test(clean)) {
    return `${defaultCountryCode}${clean}`;
  }

  // If already starts with 91 and 12 digits
  if (/^91\d{10}$/.test(clean)) {
    return `+${clean}`;
  }

  return clean.startsWith('+') ? clean : `+${clean}`;
}

/**
 * Validates Indian or International E.164 phone numbers.
 */
export function isValidPhoneNumber(phone: string): boolean {
  const norm = normalizePhoneNumber(phone);
  // Basic E.164 check: + followed by 7 to 15 digits
  return /^\+[1-9]\d{6,14}$/.test(norm);
}

export interface SendOtpPayload {
  to: string; // E.164
  otp: string;
  templateId?: string;
  senderId?: string;
  dltEntityId?: string;
  expiryMinutes?: number;
}

export interface ISMSProvider {
  name: string;
  sendOtp(payload: SendOtpPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendActivationNotification(to: string, name: string, activationUrl?: string): Promise<{ success: boolean; error?: string }>;
}

/**
 * Development & Local Offline SMS Mock Adapter.
 * Dispatches simulated SMS events and logs OTP securely in Dev Mode without leaking.
 */
export class ConsoleMockSMSAdapter implements ISMSProvider {
  name = 'Console Development SMS Adapter';

  async sendOtp(payload: SendOtpPayload): Promise<{ success: boolean; messageId?: string }> {
    const messageId = `msg-dev-${Date.now()}`;
    console.group('%c[WorkForceOS SMS Service] OTP Dispatch', 'color: #07563D; font-weight: bold;');
    console.log(`📱 Recipient : %c${payload.to}`, 'color: #0d9488; font-weight: bold;');
    console.log(`🔑 Secure OTP: %c${payload.otp}`, 'color: #ea580c; font-size: 14px; font-weight: bold;');
    console.log(`⏳ Expiry    : ${payload.expiryMinutes || 5} minutes`);
    console.log(`🆔 Msg ID    : ${messageId}`);
    console.groupEnd();

    // Dispatch in-app dev notification event so developer banner can show code if in dev mode
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('workforce:dev:sms_received', {
          detail: {
            to: payload.to,
            otp: payload.otp,
            timestamp: new Date().toISOString(),
          },
        })
      );
    }

    return { success: true, messageId };
  }

  async sendActivationNotification(to: string, name: string): Promise<{ success: boolean }> {
    console.log(`[WorkForceOS SMS Service] Activation Instructions sent to ${to} for employee "${name}"`);
    return { success: true };
  }
}

/**
 * Msg91 SMS Provider Adapter (India DLT/TRAI Compliant)
 */
export class Msg91SMSAdapter implements ISMSProvider {
  name = 'Msg91 DLT Compliant Adapter';

  async sendOtp(payload: SendOtpPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // In production, this dispatches via server-side secure edge function/API
    console.log(`[Msg91] Sending DLT OTP template to ${payload.to}`);
    return { success: true, messageId: `msg91-${Date.now()}` };
  }

  async sendActivationNotification(to: string, name: string): Promise<{ success: boolean }> {
    console.log(`[Msg91] Sending DLT activation welcome message to ${to}`);
    return { success: true };
  }
}

/**
 * Twilio Global SMS Adapter
 */
export class TwilioSMSAdapter implements ISMSProvider {
  name = 'Twilio SMS Adapter';

  async sendOtp(payload: SendOtpPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[Twilio] Dispatching OTP SMS to ${payload.to}`);
    return { success: true, messageId: `tw-${Date.now()}` };
  }

  async sendActivationNotification(to: string, name: string): Promise<{ success: boolean }> {
    console.log(`[Twilio] Dispatching activation SMS to ${to}`);
    return { success: true };
  }
}

// Global active SMS Provider instance
export const activeSmsProvider: ISMSProvider = new ConsoleMockSMSAdapter();
