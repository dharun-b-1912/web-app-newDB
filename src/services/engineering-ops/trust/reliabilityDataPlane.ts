// ============================================================
// Joy PeopleHR — Reliability Data Plane
// ============================================================
// Single authoritative ingestion pipeline orchestrating Normalization,
// PII Scrubbing, Multi-Tenant Partitioning, Synthetic Isolation, and Data Trust.
// ============================================================

import { PredictionDataTrustEngine, TrustedTelemetryEvent } from './predictionDataTrustEngine';
import { PiiScrubber } from '../../observability/piiScrubber';
import { ObservabilityLogger } from '../../observability/observabilityLogger';

export interface RawTelemetryPayload {
  id?: string;
  timestamp?: string;
  moduleId: string;
  stream?: string;
  action: string;
  message?: string;
  payload?: any;
  tenantId?: string;
  isSynthetic?: boolean;
  isMock?: boolean;
}

export class ReliabilityDataPlane {
  /**
   * Processes incoming raw telemetry through the 5-stage Reliability Data Plane
   */
  public static processTelemetry(raw: RawTelemetryPayload): TrustedTelemetryEvent {
    // Stage 1: Event Normalization & Timestamp Integrity
    const id = raw.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = raw.timestamp || new Date().toISOString();
    const stream = raw.stream || 'APPLICATION';

    // Stage 2: PII Scrubbing (Zero salary / password / PAN leakage)
    const scrubbedMessage = raw.message ? PiiScrubber.scrub(raw.message) : undefined;
    const scrubbedPayload = raw.payload ? PiiScrubber.scrub(raw.payload) : undefined;

    // Stage 3 & 4: Multi-Tenant Boundary & Synthetic Isolation
    const tenantId = raw.tenantId || 'joy_corp_tenant_01';
    const isSynthetic = raw.isSynthetic === true;

    // Stage 5: Prediction Data Trust Gate Evaluation
    const trustedEvent = PredictionDataTrustEngine.evaluateEventTrust({
      id,
      timestamp,
      moduleId: raw.moduleId,
      stream,
      action: raw.action,
      payload: { message: scrubbedMessage, ...scrubbedPayload },
      isSynthetic,
      isMock: raw.isMock,
      tenantId,
    });

    if (trustedEvent.trustClassification === 'VERIFIED') {
      ObservabilityLogger.app('DATA_PLANE_INGESTED', `Reliability Data Plane verified event ${id}`, {
        moduleId: raw.moduleId,
        completeness: trustedEvent.quality.completenessScore,
      });
    }

    return trustedEvent;
  }
}
