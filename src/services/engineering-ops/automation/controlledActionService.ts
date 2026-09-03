// ============================================================
// Joy PeopleHR — Controlled Action Service
// ============================================================
// Executes safe automated reliability actions (Level 4) and maintains
// the human sign-off approval queue for Level 3 operational workflows.
// ============================================================

import { AutomationPolicyEngine, AutomationSafetyLevel } from './automationPolicyEngine';
import { ObservabilityLogger } from '../../observability/observabilityLogger';

export interface ControlledActionLog {
  id: string;
  actionName: string;
  category: string;
  safetyLevel: AutomationSafetyLevel;
  status: 'EXECUTED_AUTOMATICALLY' | 'PENDING_HUMAN_APPROVAL' | 'APPROVED_AND_EXECUTED' | 'REJECTED';
  triggeredBy: string;
  approvedBy?: string;
  payload?: any;
  resultMessage: string;
  timestamp: string;
}

export class ControlledActionService {
  private static actionLogs: ControlledActionLog[] = [
    {
      id: 'act_001',
      actionName: 'Increase Telemetry Sampling Rate',
      category: 'OBSERVABILITY',
      safetyLevel: 'LEVEL_4_AUTOMATE',
      status: 'EXECUTED_AUTOMATICALLY',
      triggeredBy: 'PredictiveRiskEngine (PAYROLL score: 100/100)',
      resultMessage: 'Telemetry sampling rate increased from 10% to 100% for Payroll Engine.',
      timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
    },
    {
      id: 'act_002',
      actionName: 'Capture Diagnostic Snapshot',
      category: 'DIAGNOSTICS',
      safetyLevel: 'LEVEL_4_AUTOMATE',
      status: 'EXECUTED_AUTOMATICALLY',
      triggeredBy: 'HistoricalBaselineEngine (Deviation: +962%)',
      resultMessage: 'Captured memory profile and connection pool metrics snapshot.',
      timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    },
    {
      id: 'act_003',
      actionName: 'Notify Module Primary Owner via Slack/Pager',
      category: 'COMMUNICATION',
      safetyLevel: 'LEVEL_1_INFORM',
      status: 'EXECUTED_AUTOMATICALLY',
      triggeredBy: 'EngineeringOwnershipService (#payroll-squad)',
      resultMessage: 'Dispatched P1 alert to Arun V. (Backend Lead) on #eng-payroll-alerts.',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: 'act_004',
      actionName: 'Pre-Stage Production Rollback Package',
      category: 'DEPLOYMENT',
      safetyLevel: 'LEVEL_3_REQUIRE_APPROVAL',
      status: 'PENDING_HUMAN_APPROVAL',
      triggeredBy: 'IncidentIntelligenceAssistant (INC-204)',
      resultMessage: 'Rollback target v2.4.0 staged. Awaiting Platform Incident Commander approval.',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    },
  ];

  public static getActionLogs(): ControlledActionLog[] {
    return [...this.actionLogs];
  }

  public static getPendingApprovals(): ControlledActionLog[] {
    return this.actionLogs.filter((a) => a.status === 'PENDING_HUMAN_APPROVAL');
  }

  public static triggerAction(actionName: string, triggeredBy: string, payload?: any): ControlledActionLog {
    const auth = AutomationPolicyEngine.validateActionAuthorization(actionName);
    const id = `act_${Date.now()}`;
    const now = new Date().toISOString();

    if (!auth.rule || !auth.rule.isAllowedInProduction) {
      const rejectedLog: ControlledActionLog = {
        id,
        actionName,
        category: auth.rule?.category || 'DATA_MODIFICATION',
        safetyLevel: auth.rule?.safetyLevel || 'LEVEL_0_OBSERVE',
        status: 'REJECTED',
        triggeredBy,
        resultMessage: auth.rejectionReason || 'Action rejected by safety shield policy.',
        timestamp: now,
      };
      this.actionLogs.unshift(rejectedLog);
      return rejectedLog;
    }

    if (auth.requiresApproval) {
      const pendingLog: ControlledActionLog = {
        id,
        actionName,
        category: auth.rule.category,
        safetyLevel: auth.rule.safetyLevel,
        status: 'PENDING_HUMAN_APPROVAL',
        triggeredBy,
        payload,
        resultMessage: 'Action pre-staged. Awaiting explicit engineer authorization.',
        timestamp: now,
      };
      this.actionLogs.unshift(pendingLog);
      return pendingLog;
    }

    // Execute automatically
    const executedLog: ControlledActionLog = {
      id,
      actionName,
      category: auth.rule.category,
      safetyLevel: auth.rule.safetyLevel,
      status: 'EXECUTED_AUTOMATICALLY',
      triggeredBy,
      payload,
      resultMessage: `Successfully executed safe automated action: ${actionName}`,
      timestamp: now,
    };

    ObservabilityLogger.security('AUTOMATION_EXECUTED', `Controlled action executed: ${actionName}`, 'INFO', {
      actionId: id,
      triggeredBy,
    });

    this.actionLogs.unshift(executedLog);
    return executedLog;
  }

  public static approveAction(actionId: string, approvedBy: string): boolean {
    const act = this.actionLogs.find((a) => a.id === actionId);
    if (!act || act.status !== 'PENDING_HUMAN_APPROVAL') return false;

    act.status = 'APPROVED_AND_EXECUTED';
    act.approvedBy = approvedBy;
    act.resultMessage = `Approved by ${approvedBy} and executed successfully.`;

    ObservabilityLogger.security('AUTOMATION_APPROVED', `Action ${act.actionName} approved by ${approvedBy}`, 'INFO', {
      actionId,
      approvedBy,
    });

    return true;
  }

  public static rejectAction(actionId: string, rejectedBy: string): boolean {
    const act = this.actionLogs.find((a) => a.id === actionId);
    if (!act || act.status !== 'PENDING_HUMAN_APPROVAL') return false;

    act.status = 'REJECTED';
    act.resultMessage = `Rejected by ${rejectedBy}.`;
    return true;
  }
}
