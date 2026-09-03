// ============================================================
// Joy PeopleHR — Hardened PII & Sensitive Data Scrubber
// ============================================================
// Deep recursive sanitizer to prevent sensitive personal, authentication,
// and financial data from ever leaking into client logs or remote telemetry.
// Tested across deep nested structures, arrays of objects, and header tokens.
// ============================================================

const SENSITIVE_KEYS = new Set([
  // Authentication & Secrets
  'password',
  'passwd',
  'password_hash',
  'otp',
  'token',
  'access_token',
  'refresh_token',
  'service_role',
  'service_role_key',
  'anon_key',
  'secret',
  'secret_key',
  'api_key',
  'apikey',
  'auth_bearer',
  'authorization',

  // Statutory & National Identifiers
  'aadhaar',
  'aadhaar_number',
  'aadhaar_masked',
  'pan',
  'pan_number',
  'pan_masked',
  'pf_uan',
  'uan',
  'esi_number',
  'ssn',
  'ssn_masked',
  'passport_number',
  'passport',
  'driving_license',

  // Banking & Financial
  'bank_account_number',
  'account_number',
  'accountnumber',
  'bank_account',
  'ifsc',
  'ifsc_code',
  'routing_number',
  'cvv',
  'cvv2',
  'credit_card',
  'card_number',
  'cardnumber',

  // Compensation & Payroll Details
  'salary',
  'gross_salary',
  'net_salary',
  'ctc',
  'basic_salary',
  'hourly_rate',
  'bonus_amount',
  'take_home_pay',
  'hra_amount',
  'special_allowance'
]);

export class PiiScrubber {
  /**
   * Recursively sanitizes any payload, masking sensitive keys across nested objects and arrays
   */
  public static scrub<T = any>(data: T, depth = 0): T {
    if (depth > 15) return '[MAX_DEPTH_REACHED]' as any;
    if (data === null || data === undefined) return data;

    // Handle primitive types
    if (typeof data !== 'object') {
      if (typeof data === 'string') {
        return this.sanitizeString(data) as any;
      }
      return data;
    }

    // Handle Dates
    if (data instanceof Date) return data.toISOString() as any;

    // Handle Errors
    if (data instanceof Error) {
      return {
        name: data.name,
        message: this.sanitizeString(data.message),
        stack: this.sanitizeString(data.stack || ''),
      } as any;
    }

    // Handle Arrays (e.g. employees: [ { pan: '...' } ])
    if (Array.isArray(data)) {
      return data.map((item) => this.scrub(item, depth + 1)) as any;
    }

    // Handle Plain Objects (including deeply nested keys like context.employee.bank.accountNumber)
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const cleanKey = key.toLowerCase().replace(/[-_]/g, '');

      let isSensitive = false;
      for (const sensitiveKey of SENSITIVE_KEYS) {
        const cleanSensitive = sensitiveKey.replace(/[-_]/g, '');
        if (cleanKey === cleanSensitive || cleanKey.includes(cleanSensitive)) {
          isSensitive = true;
          break;
        }
      }

      if (isSensitive) {
        sanitized[key] = this.maskSensitiveValue(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.scrub(value, depth + 1);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  }

  /**
   * Masks a single sensitive value based on its type
   */
  public static maskSensitiveValue(value: any): string {
    if (value === null || value === undefined) return '***MASKED***';
    const str = String(value).trim();
    if (str.length === 0) return '***EMPTY***';
    if (str.length <= 4) return '***MASKED***';
    return `***MASKED(${str.slice(-4)})***`;
  }

  /**
   * Scans a string for embedded patterns (Bearer tokens, 12-digit Aadhaar, 10-char PAN, Credit cards, IFSC)
   */
  public static sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') return str;

    return str
      // Mask Bearer tokens & JWTs
      .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer ***MASKED_TOKEN***')
      .replace(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, '***MASKED_JWT***')
      // Mask 16 digit Credit/Debit Cards
      .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '***CARD-MASKED***')
      // Mask 12 digit Aadhaar numbers (with optional spaces/dashes)
      .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '***AADHAAR-MASKED***')
      // Mask Indian PAN numbers (5 letters, 4 digits, 1 letter)
      .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi, '***PAN-MASKED***')
      // Mask IFSC Codes (4 letters, 0, 6 letters/digits)
      .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/gi, '***IFSC-MASKED***')
      // Mask Email addresses partially
      .replace(/([a-zA-Z0-9_\-.+]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, (_match, user, domain) => {
        const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : '***';
        return `${maskedUser}@${domain}`;
      });
  }
}
