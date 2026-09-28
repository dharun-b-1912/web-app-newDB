// src/services/whatsapp/phoneUtils.ts
// ============================================================================
// Phone Normalization, Validation & Privacy Masking Utilities for WhatsApp & SMS
// Complies with Telecom Regulatory Authority of India (TRAI) and Meta E.164 standard
// ============================================================================

/**
 * Normalizes an input phone number to the standard Indian E.164 format without '+' (e.g. 919876543210).
 * Handles inputs like '9876543210', '+91 98765 43210', '09876543210', '91-9876543210'.
 */
export function normalizeIndianPhone(inputPhone: string | null | undefined): string {
  if (!inputPhone) {
    throw new Error('Phone number is required for WhatsApp dispatch.');
  }

  // Strip all non-digit characters
  const digits = inputPhone.replace(/\D/g, '');

  if (digits.length === 10) {
    // 10-digit Indian Mobile: 9876543210 -> 919876543210
    return `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // 11-digit leading zero: 09876543210 -> 919876543210
    return `91${digits.substring(1)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // Already has country code 91: 919876543210
    return digits;
  } else if (digits.length >= 10 && digits.length <= 15) {
    // International standard number without '+'
    return digits;
  }

  throw new Error(`Invalid phone number format: "${inputPhone}". Expected a valid 10-digit mobile number.`);
}

/**
 * Validates if the phone number is a valid 10-digit Indian mobile number.
 */
export function isValidIndianMobile(phone: string | null | undefined): boolean {
  if (!phone) return false;
  try {
    const normalized = normalizeIndianPhone(phone);
    // 91 followed by 6, 7, 8, or 9 and 9 more digits
    return /^91[6-9]\d{9}$/.test(normalized);
  } catch {
    return false;
  }
}

/**
 * Masks sensitive phone numbers for audit logs and UI display (e.g. +91 ****** 4321).
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return 'N/A';
  try {
    const normalized = normalizeIndianPhone(phone);
    const last4 = normalized.slice(-4);
    return `+91 ****** ${last4}`;
  } catch {
    return '******' + (phone ? phone.slice(-4) : '');
  }
}

/**
 * Masks Bank Account Numbers for Payslips / WhatsApp text (e.g. "XXXX5821").
 */
export function maskBankAccount(accountNo: string | null | undefined): string {
  if (!accountNo) return 'XXXX-XXXX';
  const clean = accountNo.trim();
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `XXXX${last4}`;
}
