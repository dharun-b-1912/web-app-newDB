// src/services/resilience/requestContext.ts
// ============================================================================
// JOY PeopleHR — Request Context & Distributed Tracing
// Unique Request ID Generation • Metadata Propagation
// ============================================================================

export interface RequestMetadata {
  requestId: string;
  organizationId: string;
  userId: string;
  source: 'WEB_APP' | 'MOBILE_APP' | 'BIOMETRIC_CONNECTOR' | 'BACKGROUND_WORKER';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export function generateRequestId(prefix = 'req'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

export function createRequestMetadata(
  orgId: string,
  userId: string,
  source: RequestMetadata['source'] = 'WEB_APP'
): RequestMetadata {
  return {
    requestId: generateRequestId(),
    organizationId: orgId,
    userId,
    source,
    timestamp: new Date().toISOString(),
  };
}
