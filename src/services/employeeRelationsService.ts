import { supabase, isSupabaseEnabled } from '../lib/supabase';
import {
  ErCase,
  CaseType,
  CaseStatus,
  CaseInternalNote,
  CommunicationUrgency,
  SurveyModel,
  PoshCommitteeMember,
  ComplianceRecord,
  HrCommunication,
  KnowledgeArticle,
  CaseTimelineEvent,
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
    this.syncWithDatabase();
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

  async syncWithDatabase(): Promise<void> {
    if (!isSupabaseEnabled) return;
    try {
      // 1. Sync announcements from company_announcements and communications safely
      const [annRes, commRes] = await Promise.all([
        Promise.resolve(supabase.from('company_announcements').select('*')).catch((err) => ({ data: null, error: err })),
        Promise.resolve(supabase.from('communications').select('*')).catch((err) => ({ data: null, error: err })),
      ]);

      const localComms = this.getCommunications();
      const mergedMap = new Map<string, HrCommunication>();

      for (const item of localComms) {
        mergedMap.set(item.id, item);
      }

      if (annRes.data && annRes.data.length > 0) {
        for (const ann of annRes.data) {
          const mappedUrgency: CommunicationUrgency =
            ann.priority === 'URGENT' ? 'EMERGENCY' : ann.priority === 'HIGH' ? 'IMPORTANT' : 'NORMAL';

          mergedMap.set(ann.id, {
            id: ann.id,
            title: ann.title,
            category: (ann.category as any) || 'ANNOUNCEMENT',
            urgency: mappedUrgency,
            content: ann.body || ann.summary || '',
            target_audience: ann.target_scope === 'ALL' ? 'All Employees' : (ann.target_department || 'Department'),
            published_by: ann.published_by_name || 'HR Head',
            published_at: ann.published_at || ann.created_at || new Date().toISOString(),
            requires_acknowledgement: false,
            version: 1,
            stats: {
              target_count: ann.target_count || 0,
              delivered_count: ann.delivered_count || 0,
              read_count: ann.read_count || 0,
              acknowledged_count: ann.acknowledged_count || 0,
            },
            attachments: [],
          });
        }
      }

      if (commRes.data && commRes.data.length > 0) {
        for (const comm of commRes.data) {
          const mappedUrgency: CommunicationUrgency =
            comm.priority === 'URGENT' ? 'EMERGENCY' : comm.priority === 'IMPORTANT' ? 'IMPORTANT' : 'NORMAL';

          mergedMap.set(comm.id, {
            id: comm.id,
            title: comm.title,
            category: (comm.communication_type as any) || 'ANNOUNCEMENT',
            urgency: mappedUrgency,
            content: comm.body || '',
            target_audience: comm.audience_type === 'ALL' ? 'All Employees' : 'Targeted Group',
            published_by: comm.author_name || comm.published_by || 'HR Head',
            published_at: comm.publish_at || comm.created_at || new Date().toISOString(),
            requires_acknowledgement: comm.requires_acknowledgement || false,
            version: 1,
            stats: {
              target_count: comm.target_count || 0,
              delivered_count: comm.delivered_count || 0,
              read_count: comm.read_count || 0,
              acknowledged_count: comm.acknowledged_count || 0,
            },
            attachments: [],
          });
        }
      }

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
      localStorage.setItem(this.STORAGE_KEY_COMMUNICATIONS, JSON.stringify(mergedList));
      window.dispatchEvent(new CustomEvent('er:communications_updated'));
    } catch (err) {
      console.warn('[EmployeeRelationsService] Database sync notice:', err);
    }
  }

  publishCommunication(comm: Omit<HrCommunication, 'id' | 'published_at'> & { id?: string }): HrCommunication {
    const all = this.getCommunications();
    const id = comm.id || `comm-${Date.now()}`;
    const publishedAt = new Date().toISOString();
    const item: HrCommunication = {
      ...comm,
      id,
      published_at: publishedAt,
    };

    const idx = all.findIndex(c => c.id === id);
    if (idx >= 0) {
      all[idx] = item;
    } else {
      all.unshift(item);
    }

    localStorage.setItem(this.STORAGE_KEY_COMMUNICATIONS, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('er:communications_updated'));

    // Persist to Supabase so Flutter Mobile App receives it immediately
    if (isSupabaseEnabled) {
      // 1. Insert into company_announcements (read by Flutter announcements tab)
      try {
        supabase.from('company_announcements').insert([
          {
            title: item.title,
            summary: item.content.substring(0, 150),
            body: item.content,
            category: item.category || 'COMPANY_NEWS',
            priority: (item.urgency === 'EMERGENCY' || item.urgency === 'URGENT') ? 'URGENT' : (item.urgency === 'IMPORTANT' ? 'HIGH' : 'NORMAL'),
            target_scope: item.target_audience === 'All Employees' ? 'ALL' : 'DEPARTMENT',
            published_by_name: item.published_by || 'Haripriya (HR Head)',
            is_pinned: item.urgency === 'EMERGENCY' || item.urgency === 'URGENT' || item.urgency === 'IMPORTANT',
            published_at: publishedAt,
            status: 'PUBLISHED',
          },
        ]).then(() => {});
      } catch (_) {}

      // 2. Insert into communications table
      try {
        supabase.from('communications').insert([
          {
            title: item.title,
            body: item.content,
            communication_type: item.category || 'ANNOUNCEMENT',
            priority: (item.urgency === 'EMERGENCY' || item.urgency === 'URGENT') ? 'URGENT' : (item.urgency === 'IMPORTANT' ? 'IMPORTANT' : 'NORMAL'),
            status: 'PUBLISHED',
            author_name: item.published_by || 'Haripriya (HR Head)',
            published_by: item.published_by || 'Haripriya (HR Head)',
            publish_at: publishedAt,
            requires_acknowledgement: item.requires_acknowledgement ?? false,
          },
        ]).then(() => {});
      } catch (_) {}

      // 3. Dispatch to notification_events for Flutter mobile app realtime banner
      try {
        supabase.from('notification_events').insert([
          {
            event_type: 'COMPANY_ANNOUNCEMENT',
            category: 'BROADCAST',
            severity: item.urgency === 'EMERGENCY' ? 'CRITICAL' : 'INFO',
            title: `Announcement: ${item.title}`,
            body: item.content.substring(0, 120),
            actor_name: item.published_by || 'HR Head',
            metadata: {
              communication_id: item.id,
              category: item.category,
              urgency: item.urgency,
            },
          },
        ]).then(() => {});
      } catch (_) {}
    }

    return item;
  }

  async deleteCommunication(id: string, title?: string): Promise<boolean> {
    const all = this.getCommunications();
    const itemToDelete = all.find(c => c.id === id);
    const resolvedTitle = title || itemToDelete?.title;

    const updated = all.filter(c => c.id !== id);
    localStorage.setItem(this.STORAGE_KEY_COMMUNICATIONS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('er:communications_updated'));

    if (isSupabaseEnabled) {
      try {
        const promises: PromiseLike<any>[] = [
          supabase.from('company_announcements').delete().eq('id', id),
          supabase.from('communications').delete().eq('id', id),
        ];

        if (resolvedTitle) {
          promises.push(
            supabase.from('company_announcements').delete().eq('title', resolvedTitle),
            supabase.from('communications').delete().eq('title', resolvedTitle),
            supabase.from('notification_events').delete().ilike('title', `%${resolvedTitle}%`)
          );
        }

        await Promise.allSettled(promises);
      } catch (err) {
        console.warn('[EmployeeRelationsService] Delete notice:', err);
      }
    }
    return true;
  }

  async clearAllCommunications(): Promise<boolean> {
    localStorage.setItem(this.STORAGE_KEY_COMMUNICATIONS, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('er:communications_updated'));

    if (isSupabaseEnabled) {
      try {
        await Promise.allSettled([
          supabase.from('company_announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('communications').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          supabase.from('notification_events').delete().eq('event_type', 'COMPANY_ANNOUNCEMENT'),
        ]);
      } catch (err) {
        console.warn('[EmployeeRelationsService] Clear all notice:', err);
      }
    }
    return true;
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
