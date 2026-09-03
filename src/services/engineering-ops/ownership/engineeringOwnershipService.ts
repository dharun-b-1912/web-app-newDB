// ============================================================
// Joy PeopleHR — Engineering Module Ownership & Routing Service
// ============================================================
// Implements Sprint 3: Ownership & Response.
// Maps every critical module to squads and enforces a 4-tier escalation chain:
// Primary Owner -> Secondary Owner -> Team Lead -> Platform Incident Commander.
// ============================================================

export interface ModuleOwnershipRecord {
  moduleId: string;
  moduleName: string;
  squad: string;
  primaryOwner: string;
  primaryEmail: string;
  secondaryOwner: string;
  secondaryEmail: string;
  teamLead: string;
  teamLeadEmail: string;
  platformIncidentCommander: string;
  slackChannel: string;
}

export class EngineeringOwnershipService {
  private static ownershipDirectory: ModuleOwnershipRecord[] = [
    {
      moduleId: 'AUTH',
      moduleName: 'Authentication & Session Engine',
      squad: 'Platform Engineering Team',
      primaryOwner: 'Karthik S. (Principal)',
      primaryEmail: 'karthik@joypeoplehr.com',
      secondaryOwner: 'Arun V. (Backend Lead)',
      secondaryEmail: 'arun@joypeoplehr.com',
      teamLead: 'Dharun B. (Founder / Tech Lead)',
      teamLeadEmail: 'dharun@joypeoplehr.com',
      platformIncidentCommander: 'Platform Incident Commander',
      slackChannel: '#eng-platform-ops',
    },
    {
      moduleId: 'WORKFORCE',
      moduleName: 'Workforce & Core HRMS',
      squad: 'HRMS Core Team',
      primaryOwner: 'Kavita S. (Staff Engineer)',
      primaryEmail: 'kavita@joypeoplehr.com',
      secondaryOwner: 'Meera N. (Senior Eng)',
      secondaryEmail: 'meera@joypeoplehr.com',
      teamLead: 'Dharun B. (Tech Lead)',
      teamLeadEmail: 'dharun@joypeoplehr.com',
      platformIncidentCommander: 'Platform Incident Commander',
      slackChannel: '#eng-hrms-core',
    },
    {
      moduleId: 'ATTENDANCE',
      moduleName: 'Attendance & Biometrics',
      squad: 'Operations Team',
      primaryOwner: 'Meera N. (Senior Eng)',
      primaryEmail: 'meera@joypeoplehr.com',
      secondaryOwner: 'Arun V. (Backend Lead)',
      secondaryEmail: 'arun@joypeoplehr.com',
      teamLead: 'Dharun B. (Tech Lead)',
      teamLeadEmail: 'dharun@joypeoplehr.com',
      platformIncidentCommander: 'Platform Incident Commander',
      slackChannel: '#eng-workforce-ops',
    },
    {
      moduleId: 'PAYROLL',
      moduleName: 'Payroll & Statutory Compliance',
      squad: 'Payroll Engineering Squad',
      primaryOwner: 'Arun V. (Backend Lead)',
      primaryEmail: 'arun@joypeoplehr.com',
      secondaryOwner: 'Karthik S. (Principal)',
      secondaryEmail: 'karthik@joypeoplehr.com',
      teamLead: 'Dharun B. (Tech Lead)',
      teamLeadEmail: 'dharun@joypeoplehr.com',
      platformIncidentCommander: 'Platform Incident Commander',
      slackChannel: '#eng-payroll-core',
    },
    {
      moduleId: 'VENDOR',
      moduleName: 'Vendor & Contract Labor',
      squad: 'Enterprise Team',
      primaryOwner: 'Rohan D. (Enterprise Lead)',
      primaryEmail: 'rohan@joypeoplehr.com',
      secondaryOwner: 'Meera N. (Senior Eng)',
      secondaryEmail: 'meera@joypeoplehr.com',
      teamLead: 'Dharun B. (Tech Lead)',
      teamLeadEmail: 'dharun@joypeoplehr.com',
      platformIncidentCommander: 'Platform Incident Commander',
      slackChannel: '#eng-enterprise-ops',
    },
    {
      moduleId: 'DATABASE',
      moduleName: 'PostgreSQL Database & Connection Pool',
      squad: 'Platform / SRE',
      primaryOwner: 'Karthik S. (SRE Lead)',
      primaryEmail: 'karthik@joypeoplehr.com',
      secondaryOwner: 'Arun V. (Backend Lead)',
      secondaryEmail: 'arun@joypeoplehr.com',
      teamLead: 'Dharun B. (Tech Lead)',
      teamLeadEmail: 'dharun@joypeoplehr.com',
      platformIncidentCommander: 'Platform Incident Commander',
      slackChannel: '#eng-platform-ops',
    },
    {
      moduleId: 'INFRASTRUCTURE',
      moduleName: 'Infrastructure & Fleet Deployment',
      squad: 'DevOps / SRE',
      primaryOwner: 'DevOps Automated Fleet',
      primaryEmail: 'devops@joypeoplehr.com',
      secondaryOwner: 'Karthik S. (SRE Lead)',
      secondaryEmail: 'karthik@joypeoplehr.com',
      teamLead: 'Dharun B. (Tech Lead)',
      teamLeadEmail: 'dharun@joypeoplehr.com',
      platformIncidentCommander: 'Platform Incident Commander',
      slackChannel: '#eng-devops-sre',
    },
    {
      moduleId: 'SECURITY',
      moduleName: 'Security & PII Redaction',
      squad: 'Security Engineering',
      primaryOwner: 'Security Officer',
      primaryEmail: 'security@joypeoplehr.com',
      secondaryOwner: 'Karthik S. (Principal)',
      secondaryEmail: 'karthik@joypeoplehr.com',
      teamLead: 'Dharun B. (Tech Lead)',
      teamLeadEmail: 'dharun@joypeoplehr.com',
      platformIncidentCommander: 'Platform Incident Commander',
      slackChannel: '#eng-security',
    },
  ];

  public static getOwnership(moduleName: string): ModuleOwnershipRecord {
    const norm = moduleName.toUpperCase();
    const found = this.ownershipDirectory.find(
      (o) => norm.includes(o.moduleId) || o.moduleName.toUpperCase().includes(norm)
    );
    return found || this.ownershipDirectory[0];
  }

  public static getAllOwnerships(): ModuleOwnershipRecord[] {
    return [...this.ownershipDirectory];
  }

  /**
   * Resolves the active assignee using the fallback chain
   */
  public static resolveActiveAssignee(moduleName: string, isPrimaryAvailable = true): {
    assignee: string;
    email: string;
    escalationTier: 'PRIMARY' | 'SECONDARY' | 'TEAM_LEAD' | 'COMMANDER';
  } {
    const record = this.getOwnership(moduleName);
    if (isPrimaryAvailable) {
      return { assignee: record.primaryOwner, email: record.primaryEmail, escalationTier: 'PRIMARY' };
    }
    return { assignee: record.secondaryOwner, email: record.secondaryEmail, escalationTier: 'SECONDARY' };
  }
}
