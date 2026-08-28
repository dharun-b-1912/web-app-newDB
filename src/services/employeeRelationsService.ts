import { supabase, isSupabaseEnabled } from '../lib/supabase';
import {
  ErCase,
  CaseType,
  CaseStatus,
  PriorityLevel,
  ConfidentialityLevel,
  SurveyModel,
  DisciplinaryCase,
  PoshCase,
  PoshCommitteeMember,
  ComplianceRecord,
  HrCommunication,
  KnowledgeArticle,
  CaseTimelineEvent,
  CaseInternalNote,
  SlaConfig,
} from '../types/employeeRelations';

class EmployeeRelationsService {
  private STORAGE_KEY_CASES = 'workforce_er_cases_v2';
  private STORAGE_KEY_SURVEYS = 'workforce_er_surveys_v2';
  private STORAGE_KEY_POSH_MEMBERS = 'workforce_er_posh_members_v2';
  private STORAGE_KEY_COMPLIANCE = 'workforce_er_compliance_v2';
  private STORAGE_KEY_COMMUNICATIONS = 'workforce_er_communications_v2';
  private STORAGE_KEY_KNOWLEDGE = 'workforce_er_knowledge_v2';

  constructor() {
    this.initDefaultRecordsIfEmpty();
  }

  private initDefaultRecordsIfEmpty() {
    if (!localStorage.getItem(this.STORAGE_KEY_POSH_MEMBERS)) {
      const defaultMembers: PoshCommitteeMember[] = [
        {
          id: 'posh-mem-01',
          name: 'Adv. Meenakshi Sundaram',
          role: 'PRESIDING_OFFICER',
          email: 'meenakshi.legal@lawfirm.in',
          is_external: true,
          effective_from: '2025-01-01',
          effective_to: '2027-12-31',
          status: 'ACTIVE',
        },
        {
          id: 'posh-mem-02',
          name: 'Haripriya',
          role: 'MEMBER_SECRETARY',
          email: 'haripriya@joycorporate.com',
          is_external: false,
          effective_from: '2024-01-01',
          effective_to: '2026-12-31',
          status: 'ACTIVE',
        },
        {
          id: 'posh-mem-03',
          name: 'Kavitha Ramachandran',
          role: 'INTERNAL_MEMBER',
          email: 'kavitha.r@joycorporate.com',
          is_external: false,
          effective_from: '2024-01-01',
          effective_to: '2026-12-31',
          status: 'ACTIVE',
        },
      ];
      localStorage.setItem(this.STORAGE_KEY_POSH_MEMBERS, JSON.stringify(defaultMembers));
    }

    if (!localStorage.getItem(this.STORAGE_KEY_KNOWLEDGE)) {
      const defaultArticles: KnowledgeArticle[] = [
        {
          id: 'kb-001',
          title: 'Leave Accrual & Encashment Policy 2026',
          category: 'LEAVE',
          summary: 'Guidelines on earned leave accruals, casual leave limits, and year-end encashment ceilings.',
          content: 'Employees accrue 1.5 earned leaves per month of active service. Up to 15 unused earned leaves can be encashed during the December payroll freeze cycle or carried forward up to a maximum accumulation ceiling of 45 days.',
          author_name: 'Haripriya (HR Head)',
          version: 2,
          status: 'PUBLISHED',
          effective_date: '2026-01-01',
          helpful_votes: 38,
          unhelpful_votes: 1,
          view_count: 312,
          tags: ['leave', 'encashment', 'accrual', 'annual-leave'],
        },
        {
          id: 'kb-002',
          title: 'Biometric Clock-in & Regularization Window',
          category: 'ATTENDANCE',
          summary: 'Standard operating procedure for biometric punch reconciliation and same-month regularization rules.',
          content: 'Biometric logs sync in real-time. In case of missed punches due to external client visits, regularization requests must be submitted within 3 business days and approved by the reporting manager before the 25th of the month.',
          author_name: 'Haripriya (HR Head)',
          version: 1,
          status: 'PUBLISHED',
          effective_date: '2026-01-15',
          helpful_votes: 52,
          unhelpful_votes: 2,
          view_count: 480,
          tags: ['attendance', 'biometric', 'regularization', 'punches'],
        },
        {
          id: 'kb-003',
          title: 'Expense Claim Submission & Proof Guidelines',
          category: 'PAYROLL',
          summary: 'Allowable travel, client entertainment, and local conveyance reimbursement criteria.',
          content: 'All expense claims above ₹500 require a digital GST invoice receipt. Claims must be submitted via the Employee Portal before the 20th of the month for payout in the same month’s salary credit.',
          author_name: 'Finance & HR Operations',
          version: 3,
          status: 'PUBLISHED',
          effective_date: '2026-02-01',
          helpful_votes: 27,
          unhelpful_votes: 0,
          view_count: 245,
          tags: ['reimbursement', 'expenses', 'travel', 'claims'],
        },
      ];
      localStorage.setItem(this.STORAGE_KEY_KNOWLEDGE, JSON.stringify(defaultArticles));
    }
  }

  // ─── Case Management Engine ────────────────────────────────────────────────
  getCases(typeFilter?: CaseType): ErCase[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_CASES);
      const list: ErCase[] = data ? JSON.parse(data) : [];
      if (typeFilter) {
        return list.filter(c => c.case_type === typeFilter);
      }
      return list;
    } catch {
      return [];
    }
  }

  saveCase(caseData: Omit<ErCase, 'id' | 'case_number' | 'created_at' | 'updated_at' | 'timeline' | 'sla'> & { id?: string; case_number?: string; sla?: SlaConfig }): ErCase {
    const all = this.getCases();
    const timestamp = new Date().toISOString();
    const prefix = caseData.case_type === 'GRIEVANCE'
      ? 'GRV'
      : caseData.case_type === 'DISCIPLINARY'
      ? 'DIS'
      : caseData.case_type === 'POSH'
      ? 'POSH'
      : caseData.case_type === 'HR_SUPPORT'
      ? 'HLP'
      : 'CAS';

    const caseNumber = caseData.case_number || `${prefix}-2026-${String(all.length + 101).padStart(6, '0')}`;
    const caseId = caseData.id || `case-${Date.now()}`;

    const existingIdx = all.findIndex(c => c.id === caseId || c.case_number === caseNumber);

    const initialTimeline: CaseTimelineEvent[] = existingIdx >= 0 ? all[existingIdx].timeline : [
      {
        id: `tl-${Date.now()}`,
        actor_name: caseData.created_by,
        actor_role: 'Submitter',
        timestamp,
        action: 'Case Created',
        note: `Case registered under category: ${caseData.category}`,
      },
    ];

    const record: ErCase = {
      ...caseData,
      id: caseId,
      case_number: caseNumber,
      created_at: existingIdx >= 0 ? all[existingIdx].created_at : timestamp,
      updated_at: timestamp,
      timeline: initialTimeline,
      attachments: caseData.attachments || [],
      internal_notes: caseData.internal_notes || [],
      tasks: caseData.tasks || [],
      sla: caseData.sla || {
        acknowledgement_hours: 4,
        first_response_hours: 24,
        resolution_hours: 120,
        consumed_pct: 15,
        is_overdue: false,
      },
    };

    if (existingIdx >= 0) {
      all[existingIdx] = record;
    } else {
      all.unshift(record);
    }

    localStorage.setItem(this.STORAGE_KEY_CASES, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('er:cases_updated'));
    return record;
  }

  addInternalNote(caseId: string, authorName: string, authorRole: string, note: string, visibility: 'INTERNAL' | 'EMPLOYEE_VISIBLE' = 'INTERNAL') {
    const all = this.getCases();
    const c = all.find(item => item.id === caseId);
    if (!c) return;

    const newNote: CaseInternalNote = {
      id: `note-${Date.now()}`,
      author_name: authorName,
      author_role: authorRole,
      note,
      created_at: new Date().toISOString(),
      visibility,
    };

    c.internal_notes.push(newNote);
    c.updated_at = new Date().toISOString();
    c.timeline.push({
      id: `tl-${Date.now()}`,
      actor_name: authorName,
      actor_role: authorRole,
      timestamp: new Date().toISOString(),
      action: visibility === 'INTERNAL' ? 'Added Internal Confidential Note' : 'Sent Response to Employee',
    });

    localStorage.setItem(this.STORAGE_KEY_CASES, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('er:cases_updated'));
  }

  updateCaseStatus(caseId: string, status: CaseStatus, actorName: string, notes?: string) {
    const all = this.getCases();
    const c = all.find(item => item.id === caseId);
    if (!c) return;

    c.status = status;
    c.updated_at = new Date().toISOString();
    if (status === 'RESOLVED' || status === 'CLOSED') {
      c.closed_at = new Date().toISOString();
      if (notes) c.resolution_notes = notes;
    }

    c.timeline.push({
      id: `tl-${Date.now()}`,
      actor_name: actorName,
      actor_role: 'HR Officer',
      timestamp: new Date().toISOString(),
      action: `Status changed to ${status}`,
      note: notes,
    });

    localStorage.setItem(this.STORAGE_KEY_CASES, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('er:cases_updated'));
  }

  // ─── Engagement & Surveys ─────────────────────────────────────────────────
  getSurveys(): SurveyModel[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_SURVEYS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveSurvey(survey: Omit<SurveyModel, 'id' | 'created_at'> & { id?: string }): SurveyModel {
    const all = this.getSurveys();
    const id = survey.id || `srv-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const record: SurveyModel = {
      ...survey,
      id,
      created_at: timestamp,
    };

    const existingIdx = all.findIndex(s => s.id === id);
    if (existingIdx >= 0) {
      all[existingIdx] = record;
    } else {
      all.unshift(record);
    }

    localStorage.setItem(this.STORAGE_KEY_SURVEYS, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('er:surveys_updated'));
    return record;
  }

  // ─── POSH Committee ───────────────────────────────────────────────────────
  getPoshCommitteeMembers(): PoshCommitteeMember[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_POSH_MEMBERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  savePoshMember(member: Omit<PoshCommitteeMember, 'id'> & { id?: string }): PoshCommitteeMember {
    const all = this.getPoshCommitteeMembers();
    const id = member.id || `posh-mem-${Date.now()}`;
    const record: PoshCommitteeMember = { ...member, id };

    const idx = all.findIndex(m => m.id === id);
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.push(record);
    }

    localStorage.setItem(this.STORAGE_KEY_POSH_MEMBERS, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('er:posh_updated'));
    return record;
  }

  // ─── Statutory Compliance ─────────────────────────────────────────────────
  getComplianceRecords(): ComplianceRecord[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_COMPLIANCE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveComplianceRecord(record: Omit<ComplianceRecord, 'id'> & { id?: string }): ComplianceRecord {
    const all = this.getComplianceRecords();
    const id = record.id || `cmp-${Date.now()}`;
    const item: ComplianceRecord = { ...record, id };

    const idx = all.findIndex(c => c.id === id);
    if (idx >= 0) {
      all[idx] = item;
    } else {
      all.unshift(item);
    }

    localStorage.setItem(this.STORAGE_KEY_COMPLIANCE, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('er:compliance_updated'));
    return item;
  }

  // ─── HR Communications ───────────────────────────────────────────────────
  getCommunications(): HrCommunication[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_COMMUNICATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  publishCommunication(comm: Omit<HrCommunication, 'id' | 'published_at'> & { id?: string }): HrCommunication {
    const all = this.getCommunications();
    const id = comm.id || `comm-${Date.now()}`;
    const item: HrCommunication = {
      ...comm,
      id,
      published_at: new Date().toISOString(),
    };

    const idx = all.findIndex(c => c.id === id);
    if (idx >= 0) {
      all[idx] = item;
    } else {
      all.unshift(item);
    }

    localStorage.setItem(this.STORAGE_KEY_COMMUNICATIONS, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('er:communications_updated'));
    return item;
  }

  // ─── Knowledge Centre ─────────────────────────────────────────────────────
  getKnowledgeArticles(searchQuery?: string, category?: string): KnowledgeArticle[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_KNOWLEDGE);
      let list: KnowledgeArticle[] = data ? JSON.parse(data) : [];
      if (category && category !== 'ALL') {
        list = list.filter(a => a.category === category);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(
          a =>
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q) ||
            a.tags.some(t => t.toLowerCase().includes(q))
        );
      }
      return list;
    } catch {
      return [];
    }
  }

  voteKnowledgeArticle(articleId: string, isHelpful: boolean) {
    const all = this.getKnowledgeArticles();
    const article = all.find(a => a.id === articleId);
    if (!article) return;

    if (isHelpful) article.helpful_votes += 1;
    else article.unhelpful_votes += 1;

    localStorage.setItem(this.STORAGE_KEY_KNOWLEDGE, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('er:knowledge_updated'));
  }
}

export const employeeRelationsService = new EmployeeRelationsService();
