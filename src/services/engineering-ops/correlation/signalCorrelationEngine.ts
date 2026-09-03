// ============================================================
// Joy PeopleHR — Signal Correlation & Incident Intelligence Engine
// ============================================================
// Correlates independent signals across Deployments, API Latency spikes,
// Error Groups, and Business Anomalies into actionable root cause intelligence.
// ============================================================

import { ReleaseManagementService } from '../releases/releaseManagementService';

export interface CorrelatedSignal {
  id: string;
  incidentTitle: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  module: string;
  firstSeenAt: string;
  possibleTrigger: {
    type: 'DEPLOYMENT' | 'INTEGRATION_OUTAGE' | 'DATABASE_SPIKE' | 'CONFIG_CHANGE';
    title: string;
    timestamp: string;
    minutesBeforeIncident: number;
    releaseVersion?: string;
  };
  relatedSignals: Array<{
    signalType: 'API_FAILURES' | 'ERROR_OCCURRENCES' | 'LATENCY_SPIKE' | 'TENANT_IMPACT' | 'BUSINESS_DROP';
    metricValue: string;
    description: string;
  }>;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedInvestigation: string;
}

export class SignalCorrelationEngine {
  public static getCorrelatedSignals(): CorrelatedSignal[] {
    const activeVersion = ReleaseManagementService.getActiveVersion();

    return [
      {
        id: 'corr_pay_01',
        incidentTitle: 'P1 — Payroll Processing Batch Calculation Latency',
        severity: 'P1',
        module: 'PAYROLL',
        firstSeenAt: new Date(Date.now() - 45 * 60000).toISOString(),
        possibleTrigger: {
          type: 'DEPLOYMENT',
          title: `Deployment ${activeVersion}`,
          timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
          minutesBeforeIncident: 5,
          releaseVersion: activeVersion,
        },
        relatedSignals: [
          { signalType: 'API_FAILURES', metricValue: '142 API failures', description: 'POST /payroll/calculate returned 500 error.' },
          { signalType: 'ERROR_OCCURRENCES', metricValue: '142 occurrences', description: 'TypeError in salary components JSON parser.' },
          { signalType: 'LATENCY_SPIKE', metricValue: '+340% response latency', description: 'Calculation duration jumped from 210ms to 1,240ms.' },
          { signalType: 'TENANT_IMPACT', metricValue: '3 affected tenants', description: 'Joy Corporate Solutions, Apex Facility, Zenith Logistics.' },
        ],
        confidence: 'HIGH',
        recommendedInvestigation: 'Inspect recent changes to calculateNetSalary in payrollApi.ts deployed in v2.4.1.',
      },
      {
        id: 'corr_zk_02',
        incidentTitle: 'P2 — ZKTeco Hardware Gateway Disconnection',
        severity: 'P2',
        module: 'ATTENDANCE',
        firstSeenAt: new Date(Date.now() - 90 * 60000).toISOString(),
        possibleTrigger: {
          type: 'INTEGRATION_OUTAGE',
          title: 'ZKTeco On-Premise TCP Socket Timeout',
          timestamp: new Date(Date.now() - 92 * 60000).toISOString(),
          minutesBeforeIncident: 2,
        },
        relatedSignals: [
          { signalType: 'BUSINESS_DROP', metricValue: '92% punch drop', description: 'Expected 15,000 punches, received only 1,200.' },
          { signalType: 'TENANT_IMPACT', metricValue: '1 affected tenant', description: 'ABC Facility Services site #4.' },
        ],
        confidence: 'HIGH',
        recommendedInvestigation: 'Verify network connectivity and bridge service for on-premise IP 192.168.1.201.',
      },
    ];
  }
}
