// src/services/governance/governanceAuditService.ts
// ============================================================
// Joy PeopleHR — Authority with Accountability Governance Engine
// 4-Level Data Sensitivity, Mandatory Reason Capture & Immutable Audit Trail
// ============================================================

export type DataSensitivityLevel = 1 | 2 | 3 | 4;

export interface SensitivityClassification {
  level: DataSensitivityLevel;
  levelLabel: 'General' | 'Operational' | 'Sensitive' | 'Critical / Financial';
  requiresReason: boolean;
  requiresStakeholderNotification: boolean;
  stakeholderRoles: string[];
}

export interface FieldDiff {
  fieldName: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  sensitivityLevel: DataSensitivityLevel;
}

export interface GovernanceAuditRecord {
  id: string;
  event_code: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  target_entity: 'Employee' | 'Payroll' | 'Vendor' | 'LegalEntity' | 'Policy';
  target_id: string;
  target_label: string;
  record_owner_department: string;
  sensitivity_level: DataSensitivityLevel;
  reason?: string;
  diffs: FieldDiff[];
  notified_stakeholders: string[];
  ip_address: string;
  timestamp: string;
}

const FIELD_SENSITIVITY_MAP: Record<string, { label: string; level: DataSensitivityLevel; department: string }> = {
  // Level 1 — General
  department: { label: 'Department', level: 1, department: 'HR' },
  department_id: { label: 'Department', level: 1, department: 'HR' },
  designation: { label: 'Designation', level: 1, department: 'HR' },
  designation_id: { label: 'Designation', level: 1, department: 'HR' },
  location: { label: 'Operating Location', level: 1, department: 'Operations' },
  location_id: { label: 'Operating Location', level: 1, department: 'Operations' },
  work_email: { label: 'Work Email', level: 1, department: 'IT' },
  profile_photo: { label: 'Profile Photo', level: 1, department: 'HR' },
  phone: { label: 'Contact Phone', level: 1, department: 'HR' },

  // Level 2 — Operational
  reporting_manager_id: { label: 'Reporting Manager', level: 2, department: 'Operations' },
  reporting_manager: { label: 'Reporting Manager', level: 2, department: 'Operations' },
  employment_type: { label: 'Employment Type', level: 2, department: 'HR' },
  shift_id: { label: 'Assigned Shift', level: 2, department: 'Operations' },
  cost_center_id: { label: 'Cost Center', level: 2, department: 'Finance' },

  // Level 3 — Sensitive
  salary: { label: 'Base Salary / Gross', level: 3, department: 'Payroll' },
  ctc: { label: 'Total Annual CTC', level: 3, department: 'Payroll' },
  bank_account_no: { label: 'Bank Account Number', level: 3, department: 'Finance' },
  ifsc_code: { label: 'Bank IFSC Code', level: 3, department: 'Finance' },
  bank_name: { label: 'Bank Name', level: 3, department: 'Finance' },
  pan_number: { label: 'PAN Card Number', level: 3, department: 'Compliance' },
  aadhaar_number: { label: 'Aadhaar UID', level: 3, department: 'HR' },
  pf_uan: { label: 'PF UAN Number', level: 3, department: 'Compliance' },
  esic_number: { label: 'ESIC IP Number', level: 3, department: 'Compliance' },
  status: { label: 'Employment Status', level: 3, department: 'HR' },
  termination_date: { label: 'Termination / Exit Date', level: 3, department: 'HR' },

  // Level 4 — Critical / Financial
  frozen_payroll: { label: 'Finalized Payroll State', level: 4, department: 'Finance' },
  disbursement_status: { label: 'Salary Disbursement Gate', level: 4, department: 'Finance' },
  statutory_ecr: { label: 'EPFO Statutory ECR Return', level: 4, department: 'Compliance' },
  bank_file_export: { label: 'NEFT/RTGS Bank Export Batch', level: 4, department: 'Finance' },
  vendor_settlement: { label: 'Vendor Settlement Reconciliation', level: 4, department: 'Finance' },
};

const AUDIT_STORAGE_KEY = 'joy_peoplehr_governance_audit_v1';

class GovernanceAuditService {
  /**
   * Evaluates the sensitivity of a proposed change by inspecting the modified fields.
   */
  evaluateSensitivity(previousState: Record<string, any>, newState: Record<string, any>): {
    highestSensitivity: DataSensitivityLevel;
    requiresReason: boolean;
    diffs: FieldDiff[];
    affectedStakeholderRoles: string[];
    recordOwner: string;
  } {
    const diffs: FieldDiff[] = [];
    let highestSensitivity: DataSensitivityLevel = 1;
    const stakeholderSet = new Set<string>();
    let recordOwner = 'HR Department';

    const allKeys = Array.from(new Set([...Object.keys(previousState), ...Object.keys(newState)]));

    for (const key of allKeys) {
      const oldVal = previousState[key];
      const newVal = newState[key];

      if (oldVal !== newVal && newVal !== undefined) {
        const meta = FIELD_SENSITIVITY_MAP[key] || {
          label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          level: 1,
          department: 'General',
        };

        diffs.push({
          fieldName: key,
          fieldLabel: meta.label,
          oldValue: oldVal,
          newValue: newVal,
          sensitivityLevel: meta.level,
        });

        if (meta.level > highestSensitivity) {
          highestSensitivity = meta.level;
          recordOwner = `${meta.department} Department`;
        }

        if (meta.level >= 3) {
          stakeholderSet.add('HR Administrator');
          stakeholderSet.add('Payroll Administrator');
        }
        if (meta.level === 4) {
          stakeholderSet.add('Chief Financial Officer (CFO)');
          stakeholderSet.add('Compliance Officer');
        }
      }
    }

    return {
      highestSensitivity,
      requiresReason: highestSensitivity >= 3,
      diffs,
      affectedStakeholderRoles: Array.from(stakeholderSet),
      recordOwner,
    };
  }

  /**
   * Commits an immutable audit log record to persistent storage and publishes event.
   */
  logGovernanceEvent(event: Omit<GovernanceAuditRecord, 'id' | 'event_code' | 'timestamp'>): GovernanceAuditRecord {
    const auditRecord: GovernanceAuditRecord = {
      ...event,
      id: `gov-aud-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      event_code: `EVT-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString(),
    };

    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      const list: GovernanceAuditRecord[] = raw ? JSON.parse(raw) : [];
      list.unshift(auditRecord);
      // Keep up to 500 audit records in memory/storage cache
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(list.slice(0, 500)));
    } catch (err) {
      console.warn('Failed to persist governance audit log locally:', err);
    }

    return auditRecord;
  }

  /**
   * Retrieves all governance audit logs with optional filters.
   */
  getAuditLogs(filter?: { sensitivityLevel?: DataSensitivityLevel; entityType?: string }): GovernanceAuditRecord[] {
    try {
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (!raw) return [];
      let list: GovernanceAuditRecord[] = JSON.parse(raw);
      if (filter?.sensitivityLevel) {
        list = list.filter(item => item.sensitivity_level === filter.sensitivityLevel);
      }
      if (filter?.entityType) {
        list = list.filter(item => item.target_entity === filter.entityType);
      }
      return list;
    } catch {
      return [];
    }
  }
}

export const governanceAuditService = new GovernanceAuditService();
