// src/utils/saasMasking.ts
// ============================================================================
// Joy PeopleHR — Enterprise SaaS Identifier & Sensitive Value Masking Engine
// Replaces raw internal database UUIDs with professional, hardened SaaS tokens
// ============================================================================

/**
 * Checks if a string contains or matches a standard 36-char UUID.
 */
export function isUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  return uuidRegex.test(val);
}

/**
 * Extracts a deterministic, human-readable 5-character suffix from a UUID or ID.
 */
export function getShortSuffix(val?: string | null): string {
  if (!val || typeof val !== 'string') return '0001';
  // Strip common prefixes
  const clean = val.replace(/^(org|sub|cli|inv|usr|lead|opp|emp)-/i, '').replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length >= 5) {
    return clean.slice(-5).toUpperCase();
  }
  return clean.toUpperCase().padStart(4, '0');
}

/**
 * Formats a raw tenant UUID or internal ID into an enterprise SaaS identifier.
 * Example: 'c47b4659-c113-40fc-9ac1-4d5ecbf1b99d' -> 'TEN-1B99D'
 */
export function formatTenantDisplayId(rawId?: string | null): string {
  if (!rawId || typeof rawId !== 'string') return 'TEN-0001';
  if (isUuid(rawId) || rawId.startsWith('org-')) {
    const suffix = getShortSuffix(rawId);
    return `TEN-${suffix}`;
  }
  // Already nicely formatted (e.g. 'TEN-00124')
  if (/^TEN-[A-Z0-9]+$/i.test(rawId)) {
    return rawId.toUpperCase();
  }
  return `TEN-${getShortSuffix(rawId)}`;
}

/**
 * Formats a raw subscription UUID or internal ID into an enterprise SaaS contract token.
 * Example: 'sub-c47b4659-c113-40fc-9ac1-4d5ecbf1b99d' -> 'SUB-2026-1B99D'
 */
export function formatSubscriptionDisplayId(rawId?: string | null): string {
  if (!rawId || typeof rawId !== 'string') return 'SUB-2026-0001';
  if (isUuid(rawId) || rawId.startsWith('sub-')) {
    const suffix = getShortSuffix(rawId);
    return `SUB-2026-${suffix}`;
  }
  if (/^SUB-[A-Z0-9-]+$/i.test(rawId)) {
    return rawId.toUpperCase();
  }
  return `SUB-2026-${getShortSuffix(rawId)}`;
}

/**
 * Formats an invoice identifier into a compliant commercial numbering string.
 * Example: 'inv-c47b4659' -> 'INV-2026-1B99D'
 */
export function formatInvoiceDisplayId(rawId?: string | null): string {
  if (!rawId || typeof rawId !== 'string') return 'INV-2026-0001';
  // If already statutory compliant like 'INV/26-27/000184', keep as is
  if (rawId.includes('/')) return rawId;
  if (isUuid(rawId) || rawId.startsWith('inv-')) {
    const suffix = getShortSuffix(rawId);
    return `INV-2026-${suffix}`;
  }
  return rawId;
}

/**
 * Masks sensitive API keys, secrets, or card tokens for enterprise UI presentation.
 * Example: 'rzp_test_TqReUSPk2WMRmD' -> 'rzp_test_••••••••2WMRmD'
 */
export function maskSensitiveToken(val?: string | null, visibleStart = 8, visibleEnd = 4): string {
  if (!val || typeof val !== 'string') return '••••••••';
  if (val.length <= visibleStart + visibleEnd) return val;
  const start = val.slice(0, visibleStart);
  const end = val.slice(-visibleEnd);
  return `${start}••••••••${end}`;
}

/**
 * Masks GSTIN or PAN if sensitive masking is requested.
 * Example: '33AABCA4589E1Z2' -> '33AAB••••89E1Z2'
 */
export function maskTaxId(taxId?: string | null): string {
  if (!taxId || typeof taxId !== 'string') return '—';
  if (taxId.length === 15) {
    // Standard GSTIN: keep state code and last 4
    return `${taxId.slice(0, 5)}••••${taxId.slice(-4)}`;
  }
  return taxId;
}

/**
 * Formats or sanitizes a tenant subdomain, preventing raw UUID exposure in domains.
 * Example: 'c47b4659-c113-40fc-9ac1-4d5ccbf1b99d.joypeoplehr.com' -> 'testcompany.joypeoplehr.com'
 */
export function formatTenantDomain(rawDomain?: string | null, legalName?: string | null, rawId?: string | null): string {
  if (!rawDomain && !legalName && !rawId) return 'app.joypeoplehr.com';
  
  if (rawDomain && !isUuid(rawDomain.split('.')[0])) {
    return rawDomain.toLowerCase();
  }

  if (legalName) {
    const cleanName = legalName
      .toLowerCase()
      .replace(/pvt\s*ltd|private\s*limited|ltd|solutions|services/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
    if (cleanName.length >= 3) {
      return `${cleanName}.joypeoplehr.com`;
    }
  }

  const suffix = getShortSuffix(rawId);
  return `ten-${suffix.toLowerCase()}.joypeoplehr.com`;
}
