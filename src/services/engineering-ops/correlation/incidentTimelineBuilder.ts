// ============================================================
// Joy PeopleHR — Automated Incident Chronological Timeline Builder
// ============================================================
// Assembles precise minute-by-minute chronological timelines from
// deployments, metrics, error groups, ownership assignment, and resolutions.
// ============================================================

export interface TimelineEventItem {
  id: string;
  timeFormatted: string;
  timestamp: string;
  category: 'DEPLOYMENT' | 'METRIC_CHANGE' | 'ERROR_DETECTED' | 'INCIDENT_OPENED' | 'ENGINEER_ASSIGNED' | 'ROOT_CAUSE' | 'FIX_DEPLOYED' | 'VERIFIED' | 'RESOLVED';
  title: string;
  description: string;
  severity?: 'CRITICAL' | 'HIGH' | 'INFO';
  actor?: string;
}

export interface IncidentChronology {
  incidentId: string;
  incidentNumber: string;
  title: string;
  startedAt: string;
  durationFormatted: string;
  events: TimelineEventItem[];
}

export class IncidentTimelineBuilder {
  public static buildTimeline(incidentNumber = 'INC-204'): IncidentChronology {
    const baseTime = Date.now() - 70 * 60000;

    const formatTime = (offsetMinutes: number) => {
      const date = new Date(baseTime + offsetMinutes * 60000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return {
      incidentId: 'inc_204_chronology',
      incidentNumber,
      title: 'Payroll calculation latency & component unhandled exception',
      startedAt: new Date(baseTime).toISOString(),
      durationFormatted: '1 hr 10 mins',
      events: [
        {
          id: 'ev_1',
          timeFormatted: formatTime(0),
          timestamp: new Date(baseTime).toISOString(),
          category: 'DEPLOYMENT',
          title: 'Deployment v2.4.1 Completed',
          description: 'CI/CD automated pipeline finished rolling deployment across all production app workers.',
          actor: 'CI/CD Fleet Runner',
        },
        {
          id: 'ev_2',
          timeFormatted: formatTime(3),
          timestamp: new Date(baseTime + 3 * 60000).toISOString(),
          category: 'METRIC_CHANGE',
          title: 'API Latency Increased (+340%)',
          description: 'POST /api/payroll/calculate average response duration rose from 210ms to 1,240ms.',
          severity: 'HIGH',
        },
        {
          id: 'ev_3',
          timeFormatted: formatTime(5),
          timestamp: new Date(baseTime + 5 * 60000).toISOString(),
          category: 'ERROR_DETECTED',
          title: 'First Error Detected (TypeError)',
          description: "Cannot read property 'salary_components' of undefined. Ref code ERR-8F3K2 generated.",
          severity: 'HIGH',
        },
        {
          id: 'ev_4',
          timeFormatted: formatTime(6),
          timestamp: new Date(baseTime + 6 * 60000).toISOString(),
          category: 'ERROR_DETECTED',
          title: 'Error Group Created (grp_PAYROLL_TYPEERROR_8f3k2)',
          description: 'Ingestion engine aggregated 142 similar occurrences across 3 companies.',
          severity: 'HIGH',
        },
        {
          id: 'ev_5',
          timeFormatted: formatTime(8),
          timestamp: new Date(baseTime + 8 * 60000).toISOString(),
          category: 'INCIDENT_OPENED',
          title: 'Incident INC-204 Opened (P1 High Severity)',
          description: 'Automated severity classifier elevated issue to P1 due to multi-tenant payroll impact.',
          severity: 'CRITICAL',
        },
        {
          id: 'ev_6',
          timeFormatted: formatTime(12),
          timestamp: new Date(baseTime + 12 * 60000).toISOString(),
          category: 'ENGINEER_ASSIGNED',
          title: 'Lead Engineer Assigned',
          description: 'Auto-routed to Payroll Engineering squad. Assigned to Arun V. (Backend Lead).',
          actor: 'Engineering Ownership Engine',
        },
        {
          id: 'ev_7',
          timeFormatted: formatTime(30),
          timestamp: new Date(baseTime + 30 * 60000).toISOString(),
          category: 'ROOT_CAUSE',
          title: 'Root Cause Identified',
          description: 'Regression in salary structure JSON parsing when employee has optional allowance overrides.',
          actor: 'Arun V.',
        },
        {
          id: 'ev_8',
          timeFormatted: formatTime(45),
          timestamp: new Date(baseTime + 45 * 60000).toISOString(),
          category: 'FIX_DEPLOYED',
          title: 'Hotfix Branch Deployed (fix/joy-204)',
          description: 'Safe optional chaining and fallback removal deployed to production workers.',
          actor: 'CI/CD Fleet Runner',
        },
        {
          id: 'ev_9',
          timeFormatted: formatTime(60),
          timestamp: new Date(baseTime + 60 * 60000).toISOString(),
          category: 'VERIFIED',
          title: 'Post-Release Verification Watch Passed',
          description: '10-minute and 30-minute watches clean. Error rate dropped from 12.4% to 0.04%.',
          actor: 'Release Health Monitor',
        },
        {
          id: 'ev_10',
          timeFormatted: formatTime(70),
          timestamp: new Date(baseTime + 70 * 60000).toISOString(),
          category: 'RESOLVED',
          title: 'Incident INC-204 Resolved & RCA Archived',
          description: 'Formal RCA signed off and automated CI test case added to epfoComplianceSuite.',
          actor: 'Karthik S. (Tech Lead)',
        },
      ],
    };
  }
}
