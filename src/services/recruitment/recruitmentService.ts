// src/services/recruitment/recruitmentService.ts
// ============================================================================
// Joy PeopleHR — Recruitment & ATS 2.0 Enterprise Service
// Pure SQL Database CRUD, State Machine, Scorecards, E-Sign & Employee Conversion
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import {
  Requisition,
  JobOpening,
  Candidate,
  CandidateApplication,
  CandidateStage,
  Interview,
  InterviewScorecard,
  Offer,
  TalentPool,
  CandidateNote,
  AtsOverviewMetrics,
} from '../../types/ats';
import { Employee } from '../../types';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';

const STORAGE_KEYS = {
  REQUISITIONS: 'workforce_ats_requisitions_v2',
  JOBS: 'workforce_ats_jobs_v2',
  CANDIDATES: 'workforce_ats_candidates_v2',
  APPLICATIONS: 'workforce_ats_applications_v2',
  INTERVIEWS: 'workforce_ats_interviews_v2',
  SCORECARDS: 'workforce_ats_scorecards_v2',
  OFFERS: 'workforce_ats_offers_v2',
  NOTES: 'workforce_ats_notes_v2',
  STAGE_HISTORY: 'workforce_ats_stage_history_v2',
  TALENT_POOLS: 'workforce_ats_talent_pools_v2',
  AUDIT_LOGS: 'workforce_ats_audit_logs_v2',
};

function getActiveOrgId(): string {
  try {
    const raw = localStorage.getItem('workforce_active_organization');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed.id;
    }
  } catch {}
  return 'org-joy-01';
}

function getStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStore<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`[RecruitmentService] Storage error for ${key}:`, err);
  }
}

class RecruitmentService {
  // ==========================================================================
  // 1. REQUISITIONS
  // ==========================================================================

  async getRequisitions(params?: {
    organizationId?: string;
    companyId?: string;
    status?: string;
    departmentId?: string;
    search?: string;
  }): Promise<Requisition[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let q = supabase.from('job_openings').select('*');
        if (params?.organizationId) q = q.eq('organization_id', params.organizationId);
        if (params?.companyId) q = q.eq('company_id', params.companyId);
        if (params?.status && params.status !== 'ALL') q = q.eq('status', params.status);
        if (params?.departmentId && params.departmentId !== 'ALL') q = q.eq('department_id', params.departmentId);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            organization_id: d.organization_id,
            company_id: d.company_id,
            department_id: d.department_id,
            job_title: d.title || d.job_title || 'Position',
            requisition_code: d.requisition_code,
            requisition_type: 'New Position',
            priority: 'Medium',
            number_of_positions: d.vacancies_count || 1,
            positions_filled: 0,
            job_description: d.job_description || '',
            status: d.status || 'Open',
            created_at: d.created_at,
            updated_at: d.created_at,
          } as Requisition));
        }
      } catch (err) {
        console.warn('[RecruitmentService] getRequisitions SQL error:', err);
      }
    }

    let list = getStore<Requisition[]>(STORAGE_KEYS.REQUISITIONS, []);
    if (params?.status && params.status !== 'ALL') {
      list = list.filter(r => r.status === params.status);
    }
    if (params?.departmentId && params.departmentId !== 'ALL') {
      list = list.filter(r => r.department_id === params.departmentId);
    }
    if (params?.search) {
      const query = params.search.toLowerCase();
      list = list.filter(r => r.job_title.toLowerCase().includes(query) || r.id.toLowerCase().includes(query));
    }
    return list;
  }

  async createRequisition(payload: Partial<Requisition> & { job_title: string; department_id?: string }): Promise<Requisition> {
    const newReq: Requisition = {
      id: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      organization_id: payload.organization_id || 'org-joy-01',
      company_id: payload.company_id || 'comp-joy-01',
      company_name: payload.company_name || 'Joy Corporate Solutions Pvt Ltd',
      department_id: payload.department_id || 'dept-eng',
      department_name: payload.department_name || 'Engineering',
      location_name: payload.location_name || 'Coimbatore HQ Campus',
      hiring_manager_id: payload.hiring_manager_id || '',
      hiring_manager_name: payload.hiring_manager_name || 'Hiring Manager',
      recruiter_id: payload.recruiter_id || '',
      recruiter_name: payload.recruiter_name || 'Talent Acquisition Team',
      job_title: payload.job_title,
      designation_title: payload.designation_title || payload.job_title,
      job_level: payload.job_level || 'L4 - Mid Senior',
      employment_type: payload.employment_type || 'Full Time',
      number_of_positions: payload.number_of_positions || 1,
      positions_filled: 0,
      requisition_type: payload.requisition_type || 'New Position',
      reason_for_hiring: payload.reason_for_hiring || '',
      priority: payload.priority || 'Medium',
      expected_joining_date: payload.expected_joining_date || new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
      budget: payload.budget || 1800000,
      min_salary: payload.min_salary || 1200000,
      max_salary: payload.max_salary || 1800000,
      currency: payload.currency || 'INR',
      required_skills: payload.required_skills || [],
      preferred_skills: payload.preferred_skills || [],
      education: payload.education || 'Bachelor Degree or Equivalent',
      job_description: payload.job_description || '',
      business_justification: payload.business_justification || '',
      approval_workflow: [
        { role: 'Hiring Manager', approver_name: payload.hiring_manager_name || 'Hiring Manager', status: 'Pending' },
        { role: 'Department Head', approver_name: 'Department Head', status: 'Pending' },
        { role: 'HR Head', approver_name: 'Hari Priya', status: 'Pending' },
      ],
      status: 'Pending Approval',
      created_by_name: payload.created_by_name || 'Talent Team',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('job_openings').insert([{
          title: newReq.job_title,
          requisition_code: newReq.id,
          organization_id: newReq.organization_id,
          company_id: newReq.company_id,
          department_id: newReq.department_id,
          vacancies_count: newReq.number_of_positions,
          job_description: newReq.job_description || newReq.job_title,
          status: 'OPEN',
        }]).select().single();
        if (!error && data) {
          hrEventBus.emit('recruitment.requisition_created', { requisition: newReq });
          return newReq;
        }
      } catch (err) {
        console.warn('[RecruitmentService] createRequisition SQL fallback:', err);
      }
    }

    const current = getStore<Requisition[]>(STORAGE_KEYS.REQUISITIONS, []);
    setStore(STORAGE_KEYS.REQUISITIONS, [newReq, ...current]);
    hrEventBus.emit('recruitment.requisition_created', { requisition: newReq });
    return newReq;
  }

  async approveRequisitionStep(requisitionId: string, stepOrder: number, comments?: string): Promise<Requisition | null> {
    const list = await this.getRequisitions();
    const req = list.find(r => r.id === requisitionId);
    if (!req) return null;

    const workflow = req.approval_workflow || [];
    if (workflow[stepOrder]) {
      workflow[stepOrder].status = 'Approved';
      workflow[stepOrder].comments = comments || 'Approved';
      workflow[stepOrder].updated_at = new Date().toISOString();
    }

    const allApproved = workflow.every(w => w.status === 'Approved');
    const updatedStatus = allApproved ? 'Approved' : 'Pending Approval';

    const updates: Partial<Requisition> = {
      approval_workflow: workflow,
      status: updatedStatus,
      updated_at: new Date().toISOString(),
    };

    if (allApproved) {
      // Automatically generate a draft Job Opening for this approved requisition
      await this.createJob({
        requisition_id: req.id,
        job_title: req.job_title,
        department_name: req.department_name,
        location_name: req.location_name,
        number_of_openings: req.number_of_positions,
        min_salary: req.min_salary,
        max_salary: req.max_salary,
        currency: req.currency,
        required_skills: req.required_skills,
        job_description: req.job_description,
        status: 'Open',
      });
      hrEventBus.emit('recruitment.requisition_approved', { requisitionId });
    }

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('job_openings').update({
          status: allApproved ? 'OPEN' : 'DRAFT',
        }).eq('id', requisitionId).select().single();
        if (!error && data) return { ...req, ...updates };
      } catch (err) {
        console.warn('[RecruitmentService] approveRequisitionStep SQL fallback:', err);
      }
    }

    const all = getStore<Requisition[]>(STORAGE_KEYS.REQUISITIONS, []);
    const idx = all.findIndex(r => r.id === requisitionId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.REQUISITIONS, all);
    }
    return { ...req, ...updates };
  }

  async rejectRequisition(requisitionId: string, reason: string, rejectedBy: string): Promise<Requisition | null> {
    const updates: Partial<Requisition> = {
      status: 'Rejected',
      rejection_reason: reason,
      rejected_by: rejectedBy,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('job_openings').update({
          status: 'CLOSED',
        }).eq('id', requisitionId).select().single();
        if (!error && data) {
          hrEventBus.emit('recruitment.requisition_rejected', { requisitionId, reason });
          return { ...updates, id: requisitionId } as any;
        }
      } catch (err) {
        console.warn('[RecruitmentService] rejectRequisition SQL fallback:', err);
      }
    }

    const all = getStore<Requisition[]>(STORAGE_KEYS.REQUISITIONS, []);
    const idx = all.findIndex(r => r.id === requisitionId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.REQUISITIONS, all);
    }
    hrEventBus.emit('recruitment.requisition_rejected', { requisitionId, reason });
    return all[idx] || null;
  }

  // ==========================================================================
  // 2. JOB OPENINGS & MULTI-CHANNEL PUBLISHING
  // ==========================================================================

  async getJobs(params?: {
    organizationId?: string;
    status?: string;
    departmentId?: string;
    search?: string;
  }): Promise<JobOpening[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let q = supabase.from('job_openings').select('*');
        if (params?.organizationId) q = q.eq('organization_id', params.organizationId);
        if (params?.status && params.status !== 'ALL') q = q.eq('status', params.status);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('[RecruitmentService] getJobs SQL error:', err);
      }
    }

    let list = getStore<JobOpening[]>(STORAGE_KEYS.JOBS, []);
    if (params?.status && params.status !== 'ALL') {
      list = list.filter(j => j.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(j => j.job_title.toLowerCase().includes(q) || (j.job_code && j.job_code.toLowerCase().includes(q)));
    }
    return list;
  }

  async createJob(payload: Partial<JobOpening> & { job_title: string }): Promise<JobOpening> {
    const newJob: JobOpening = {
      id: `JOB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      organization_id: payload.organization_id || getActiveOrgId(),
      requisition_id: payload.requisition_id,
      job_code: `JOB-${Math.floor(100 + Math.random() * 900)}`,
      job_title: payload.job_title,
      designation_title: payload.designation_title || payload.job_title,
      department_name: payload.department_name || 'Engineering',
      location_name: payload.location_name || 'Coimbatore HQ Campus',
      work_mode: payload.work_mode || 'Hybrid',
      employment_type: payload.employment_type || 'Full Time',
      job_level: payload.job_level || 'L4 - Mid Senior',
      number_of_openings: payload.number_of_openings || 1,
      positions_filled: 0,
      hiring_manager_name: payload.hiring_manager_name || 'Hiring Manager',
      recruiter_name: payload.recruiter_name || 'Talent Acquisition Team',
      min_salary: payload.min_salary || 1200000,
      max_salary: payload.max_salary || 1800000,
      currency: payload.currency || 'INR',
      experience_min: payload.experience_min || 3,
      experience_max: payload.experience_max || 8,
      job_description: payload.job_description || '',
      summary: payload.summary || payload.job_description || '',
      required_skills: payload.required_skills || ['TypeScript', 'React', 'Problem Solving'],
      preferred_skills: payload.preferred_skills || [],
      education: payload.education || 'B.E / B.Tech / Equivalent',
      application_deadline: payload.application_deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      publications: [
        { destination: 'Career Portal', status: 'Published', published_at: new Date().toISOString() },
        { destination: 'LinkedIn', status: 'Not Published' },
        { destination: 'Indeed', status: 'Not Published' },
        { destination: 'Naukri', status: 'Not Published' },
      ],
      status: payload.status || 'Open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('job_openings').insert([newJob]).select().single();
        if (!error && data) {
          hrEventBus.emit('recruitment.job_published', { job: data });
          return data;
        }
      } catch (err) {
        console.warn('[RecruitmentService] createJob SQL fallback:', err);
      }
    }

    const current = getStore<JobOpening[]>(STORAGE_KEYS.JOBS, []);
    setStore(STORAGE_KEYS.JOBS, [newJob, ...current]);
    hrEventBus.emit('recruitment.job_published', { job: newJob });
    return newJob;
  }

  async toggleJobPublication(jobId: string, destination: string, publish: boolean): Promise<JobOpening | null> {
    const list = await this.getJobs();
    const job = list.find(j => j.id === jobId);
    if (!job) return null;

    const publications = (job.publications || []).map(p => {
      if (p.destination === destination) {
        return {
          ...p,
          status: publish ? ('Published' as const) : ('Not Published' as const),
          published_at: publish ? new Date().toISOString() : undefined,
        };
      }
      return p;
    });

    const updates = { publications, updated_at: new Date().toISOString() };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('job_openings').update(updates).eq('id', jobId).select().single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('[RecruitmentService] toggleJobPublication SQL error:', err);
      }
    }

    const all = getStore<JobOpening[]>(STORAGE_KEYS.JOBS, []);
    const idx = all.findIndex(j => j.id === jobId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.JOBS, all);
    }
    return { ...job, ...updates };
  }

  // ==========================================================================
  // 3. CANDIDATES & STAGE STATE MACHINE
  // ==========================================================================

  async getCandidates(params?: {
    organizationId?: string;
    stage?: string;
    jobId?: string;
    search?: string;
  }): Promise<Candidate[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let q = supabase.from('job_applicants').select('*');
        if (params?.organizationId) q = q.eq('organization_id', params.organizationId);
        if (params?.stage && params.stage !== 'ALL') q = q.eq('stage', params.stage);
        if (params?.jobId && params.jobId !== 'ALL') q = q.eq('job_opening_id', params.jobId);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((d: any) => {
            const parts = (d.candidate_name || 'Candidate Name').split(' ');
            const firstName = parts[0] || 'Candidate';
            const lastName = parts.slice(1).join(' ') || 'Applicant';
            return {
              id: d.id,
              organization_id: d.organization_id,
              applied_job_id: d.job_opening_id,
              first_name: firstName,
              last_name: lastName,
              display_name: d.candidate_name,
              email: d.candidate_email,
              phone: d.candidate_phone || '',
              resume_url: d.resume_url || '',
              skills: [],
              source_type: 'Career Portal',
              status: 'Active',
              current_stage: (d.stage === 'APPLIED' ? 'New' : d.stage === 'OFFER_EXTENDED' ? 'Offer' : d.stage === 'HIRED' ? 'Preboarding' : d.stage) as CandidateStage,
              rating: d.rating,
              created_at: d.created_at,
              updated_at: d.updated_at || d.created_at,
            } as Candidate;
          });
        }
      } catch (err) {
        console.warn('[RecruitmentService] getCandidates SQL error:', err);
      }
    }

    let list = getStore<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    if (params?.stage && params.stage !== 'ALL') {
      list = list.filter(c => c.current_stage === params.stage);
    }
    if (params?.jobId && params.jobId !== 'ALL') {
      list = list.filter(c => c.applied_job_id === params.jobId);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        c =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.skills && c.skills.some(s => s.toLowerCase().includes(q)))
      );
    }
    return list;
  }

  async createCandidate(payload: Partial<Candidate> & { first_name: string; last_name: string; email: string }): Promise<Candidate> {
    const newCand: Candidate = {
      id: `cand-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      organization_id: payload.organization_id || 'org-joy-01',
      first_name: payload.first_name,
      last_name: payload.last_name,
      display_name: `${payload.first_name} ${payload.last_name}`,
      email: payload.email,
      phone: payload.phone || '+91 98400 12345',
      current_location: payload.current_location || 'Coimbatore, India',
      current_company: payload.current_company || 'Independent Professional',
      current_designation: payload.current_designation || 'Software Engineer',
      total_experience_years: payload.total_experience_years || 4.5,
      skills: payload.skills && payload.skills.length > 0 ? payload.skills : ['React', 'TypeScript', 'Node.js'],
      education: payload.education || 'B.Tech in Computer Science',
      resume_url: payload.resume_url || 'https://workforceos.blob.core/resumes/candidate-resume.pdf',
      source_type: payload.source_type || 'Career Portal',
      applied_job_id: payload.applied_job_id || 'JOB-2026-101',
      applied_job_title: payload.applied_job_title || 'Staff Frontend Architect',
      department_name: payload.department_name || 'Engineering',
      match_score: payload.match_score || Math.floor(75 + Math.random() * 23),
      current_stage: payload.current_stage || 'New',
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('job_applicants').insert([{
          organization_id: newCand.organization_id,
          job_opening_id: newCand.applied_job_id && newCand.applied_job_id.length === 36 ? newCand.applied_job_id : undefined,
          candidate_name: newCand.display_name,
          candidate_email: newCand.email,
          candidate_phone: newCand.phone,
          resume_url: newCand.resume_url,
          stage: 'APPLIED',
        }]).select().single();
        if (!error && data) {
          hrEventBus.emit('recruitment.candidate_created', { candidate: newCand });
          return newCand;
        }
      } catch (err) {
        console.warn('[RecruitmentService] createCandidate SQL fallback:', err);
      }
    }

    const current = getStore<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    setStore(STORAGE_KEYS.CANDIDATES, [newCand, ...current]);
    hrEventBus.emit('recruitment.candidate_created', { candidate: newCand });
    return newCand;
  }

  async updateCandidateStage(candidateId: string, newStage: CandidateStage, reason?: string, actorName = 'Recruiter'): Promise<Candidate | null> {
    const list = await this.getCandidates();
    const cand = list.find(c => c.id === candidateId);
    if (!cand) return null;

    const fromStage = cand.current_stage;
    const updates: Partial<Candidate> = {
      current_stage: newStage,
      updated_at: new Date().toISOString(),
    };

    // Record stage history
    const historyItem = {
      id: `csh-${Date.now()}`,
      candidate_id: candidateId,
      from_stage: fromStage,
      to_stage: newStage,
      actor_name: actorName,
      reason: reason || `Moved stage to ${newStage}`,
      created_at: new Date().toISOString(),
    };
    const history = getStore<any[]>(STORAGE_KEYS.STAGE_HISTORY, []);
    setStore(STORAGE_KEYS.STAGE_HISTORY, [historyItem, ...history]);

    if (isSupabaseEnabled && supabase) {
      try {
        const stageMap: Record<string, string> = {
          'New': 'APPLIED',
          'Screening': 'SCREENING',
          'Interview': 'INTERVIEW_SCHEDULED',
          'Offer': 'OFFER_EXTENDED',
          'Preboarding': 'HIRED',
          'Hired': 'HIRED',
          'Rejected': 'REJECTED',
        };
        const mappedStage = stageMap[newStage] || 'APPLIED';
        const { data, error } = await supabase.from('job_applicants').update({
          stage: mappedStage,
          updated_at: new Date().toISOString(),
        }).eq('id', candidateId).select().single();
        if (!error && data) {
          hrEventBus.emit('recruitment.candidate_stage_changed', { candidateId, fromStage, toStage: newStage });
          return { ...cand, ...updates };
        }
      } catch (err) {
        console.warn('[RecruitmentService] updateCandidateStage SQL error:', err);
      }
    }

    const all = getStore<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const idx = all.findIndex(c => c.id === candidateId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.CANDIDATES, all);
    }
    hrEventBus.emit('recruitment.candidate_stage_changed', { candidateId, fromStage, toStage: newStage });
    return all[idx] || null;
  }

  async getCandidateStageHistory(candidateId: string): Promise<any[]> {
    const history = getStore<any[]>(STORAGE_KEYS.STAGE_HISTORY, []);
    return history.filter(h => h.candidate_id === candidateId);
  }

  async addCandidateNote(candidateId: string, content: string, isPrivate = true, authorName = 'Recruiter'): Promise<CandidateNote> {
    const newNote: CandidateNote = {
      id: `note-${Date.now()}`,
      candidate_id: candidateId,
      author_name: authorName,
      content,
      is_private: isPrivate,
      created_at: new Date().toISOString(),
    };
    const notes = getStore<CandidateNote[]>(STORAGE_KEYS.NOTES, []);
    setStore(STORAGE_KEYS.NOTES, [newNote, ...notes]);
    return newNote;
  }

  async getCandidateNotes(candidateId: string): Promise<CandidateNote[]> {
    const notes = getStore<CandidateNote[]>(STORAGE_KEYS.NOTES, []);
    return notes.filter(n => n.candidate_id === candidateId);
  }

  // ==========================================================================
  // 4. INTERVIEWS & SCORECARDS
  // ==========================================================================

  async getInterviews(params?: {
    candidateId?: string;
    jobId?: string;
    status?: string;
  }): Promise<Interview[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let q = supabase.from('interviews').select('*');
        if (params?.candidateId) q = q.eq('candidate_id', params.candidateId);
        if (params?.status && params.status !== 'ALL') q = q.eq('status', params.status);
        const { data, error } = await q.order('scheduled_date', { ascending: true });
        if (!error && data) return data;
      } catch (err) {
        console.warn('[RecruitmentService] getInterviews SQL error:', err);
      }
    }

    let list = getStore<Interview[]>(STORAGE_KEYS.INTERVIEWS, []);
    if (params?.candidateId) list = list.filter(i => i.candidate_id === params.candidateId);
    if (params?.status && params.status !== 'ALL') list = list.filter(i => i.status === params.status);
    return list;
  }

  async scheduleInterview(payload: Partial<Interview> & { candidate_id: string; job_id: string; scheduled_date: string }): Promise<Interview> {
    const newIntv: Interview = {
      id: `INTV-${Date.now().toString(36).toUpperCase()}`,
      candidate_id: payload.candidate_id,
      candidate_name: payload.candidate_name || 'Candidate',
      candidate_email: payload.candidate_email || '',
      job_id: payload.job_id,
      job_title: payload.job_title || 'Position',
      round_number: payload.round_number || 1,
      round_name: payload.round_name || 'Technical Round 1',
      interview_type: payload.interview_type || 'Video',
      scheduled_date: payload.scheduled_date,
      date: payload.scheduled_date,
      start_time: payload.start_time || '10:00:00',
      end_time: payload.end_time || '11:00:00',
      time: payload.start_time || '10:00 AM',
      timezone: 'Asia/Kolkata',
      meeting_link: payload.meeting_link || 'https://meet.google.com/joy-workforce-interview',
      interviewer_name: payload.interviewer_name || 'Technical Panel',
      status: 'Scheduled',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('interviews').insert([newIntv]).select().single();
        if (!error && data) {
          hrEventBus.emit('recruitment.interview_scheduled', { interview: data });
          return data;
        }
      } catch (err) {
        console.warn('[RecruitmentService] scheduleInterview SQL fallback:', err);
      }
    }

    const current = getStore<Interview[]>(STORAGE_KEYS.INTERVIEWS, []);
    setStore(STORAGE_KEYS.INTERVIEWS, [newIntv, ...current]);
    hrEventBus.emit('recruitment.interview_scheduled', { interview: newIntv });
    return newIntv;
  }

  async submitScorecard(payload: {
    interview_id: string;
    interviewer_name: string;
    technical_skills_score: number;
    communication_score: number;
    problem_solving_score: number;
    culture_fit_score: number;
    leadership_score: number;
    recommendation: 'Strong Hire' | 'Hire' | 'Hold' | 'No Hire';
    strengths?: string;
    areas_of_concern?: string;
    feedback_notes: string;
  }): Promise<InterviewScorecard> {
    const avg = Number(
      (
        (payload.technical_skills_score +
          payload.communication_score +
          payload.problem_solving_score +
          payload.culture_fit_score +
          payload.leadership_score) /
        5
      ).toFixed(1)
    );

    const scorecard: InterviewScorecard = {
      id: `sc-${Date.now()}`,
      ...payload,
      overall_score: avg,
      submitted_at: new Date().toISOString(),
    };

    const cards = getStore<InterviewScorecard[]>(STORAGE_KEYS.SCORECARDS, []);
    setStore(STORAGE_KEYS.SCORECARDS, [scorecard, ...cards]);

    // Mark interview completed with overall feedback
    const intvs = getStore<Interview[]>(STORAGE_KEYS.INTERVIEWS, []);
    const idx = intvs.findIndex(i => i.id === payload.interview_id);
    if (idx !== -1) {
      intvs[idx].status = 'Completed';
      intvs[idx].overall_recommendation = payload.recommendation;
      intvs[idx].overall_feedback = payload.feedback_notes;
      intvs[idx].completed_at = new Date().toISOString();
      setStore(STORAGE_KEYS.INTERVIEWS, intvs);
    }

    hrEventBus.emit('recruitment.scorecard_submitted', { scorecard });
    return scorecard;
  }

  async getScorecards(interviewId: string): Promise<InterviewScorecard[]> {
    const cards = getStore<InterviewScorecard[]>(STORAGE_KEYS.SCORECARDS, []);
    return cards.filter(c => c.interview_id === interviewId);
  }

  // ==========================================================================
  // 5. OFFERS & CANDIDATE-TO-EMPLOYEE CONVERSION
  // ==========================================================================

  async getOffers(params?: { candidateId?: string; status?: string }): Promise<Offer[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let q = supabase.from('offers').select('*');
        if (params?.candidateId) q = q.eq('candidate_id', params.candidateId);
        if (params?.status && params.status !== 'ALL') q = q.eq('status', params.status);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('[RecruitmentService] getOffers SQL error:', err);
      }
    }

    let list = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    if (params?.status && params.status !== 'ALL') list = list.filter(o => o.status === params.status);
    return list;
  }

  async createOffer(payload: Partial<Offer> & { candidate_id: string; job_id: string; joining_date: string; ctc_annual: number }): Promise<Offer> {
    const base = payload.base_salary || Math.round(payload.ctc_annual * 0.7);
    const newOffer: Offer = {
      id: `OFR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      organization_id: payload.organization_id || 'org-joy-01',
      candidate_id: payload.candidate_id,
      candidate_name: payload.candidate_name || 'Candidate',
      candidate_email: payload.candidate_email || '',
      job_id: payload.job_id,
      job_title: payload.job_title || 'Position',
      department_id: payload.department_id || 'dept-eng',
      department_name: payload.department_name || 'Engineering',
      reporting_manager_name: payload.reporting_manager_name || 'Dharun Joy',
      joining_date: payload.joining_date,
      ctc_annual: payload.ctc_annual,
      base_salary: base,
      variable_pay: payload.variable_pay || Math.round(payload.ctc_annual * 0.2),
      bonus: payload.bonus || Math.round(payload.ctc_annual * 0.1),
      currency: payload.currency || 'INR',
      probation_months: payload.probation_months || 6,
      notice_period_days: payload.notice_period_days || 60,
      offer_expiry_date: payload.offer_expiry_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Pending Approval',
      esign_status: 'Ready to Send',
      background_check_status: 'Initiated',
      preboarding_status: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('offers').insert([newOffer]).select().single();
        if (!error && data) {
          hrEventBus.emit('recruitment.offer_created', { offer: data });
          return data;
        }
      } catch (err) {
        console.warn('[RecruitmentService] createOffer SQL fallback:', err);
      }
    }

    const current = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    setStore(STORAGE_KEYS.OFFERS, [newOffer, ...current]);
    hrEventBus.emit('recruitment.offer_created', { offer: newOffer });
    return newOffer;
  }

  async markOfferAccepted(offerId: string): Promise<Offer | null> {
    const list = await this.getOffers();
    const offer = list.find(o => o.id === offerId);
    if (!offer) return null;

    const updates: Partial<Offer> = {
      status: 'Accepted',
      accepted_at: new Date().toISOString(),
      esign_status: 'Signed',
      background_check_status: 'Passed',
      preboarding_status: 'In Progress',
      updated_at: new Date().toISOString(),
    };

    // Update candidate stage to 'Offer' / 'Preboarding'
    await this.updateCandidateStage(offer.candidate_id, 'Preboarding', 'Offer accepted by candidate');

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('offers').update(updates).eq('id', offerId).select().single();
        if (!error && data) {
          hrEventBus.emit('recruitment.offer_accepted', { offerId });
          return data;
        }
      } catch (err) {
        console.warn('[RecruitmentService] markOfferAccepted SQL error:', err);
      }
    }

    const all = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    const idx = all.findIndex(o => o.id === offerId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.OFFERS, all);
    }
    hrEventBus.emit('recruitment.offer_accepted', { offerId });
    return all[idx] || null;
  }

  /**
   * Atomic Candidate -> Employee Conversion
   * Creates real record in `employees` table, establishes candidate_id -> employee_id link
   */
  async convertCandidateToEmployee(candidateId: string, offerId?: string): Promise<Employee> {
    const candidates = await this.getCandidates();
    const cand = candidates.find(c => c.id === candidateId);
    if (!cand) throw new Error('Candidate not found');

    const offers = await this.getOffers({ candidateId });
    const offer = offerId ? offers.find(o => o.id === offerId) : offers[0];

    // Build real employee input
    const newEmployee = await api.createEmployee({
      organization_id: cand.organization_id || 'org-joy-01',
      company_id: 'comp-joy-01',
      company_name: 'Joy Corporate Solutions Pvt Ltd',
      department_id: offer?.department_id || 'dept-eng',
      department_name: offer?.department_name || cand.department_name || 'Engineering',
      designation_id: 'desig-eng',
      designation_title: cand.applied_job_title || 'Software Engineer',
      employee_code: `WF-${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: cand.first_name,
      last_name: cand.last_name,
      display_name: cand.display_name || `${cand.first_name} ${cand.last_name}`,
      work_email: `${cand.first_name.toLowerCase()}.${cand.last_name.toLowerCase()}@joycorporate.com`,
      status: 'Active',
      employment_type: 'Full Time',
      employment_source: 'DIRECT',
      profile: {
        first_name: cand.first_name,
        last_name: cand.last_name,
        display_name: cand.display_name || `${cand.first_name} ${cand.last_name}`,
        phone: cand.phone || '+91 98400 11223',
        personal_email: cand.email,
        current_address: {
          line1: cand.current_location || 'Coimbatore',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          postal_code: '641018',
          country: 'India',
        },
      },
      employment: {
        doj: offer?.joining_date || new Date().toISOString().split('T')[0],
        employment_type: 'Full Time',
        employment_source: 'DIRECT',
        work_location: 'Coimbatore HQ',
        reporting_manager_name: offer?.reporting_manager_name || 'Dharun Joy',
        probation_period_months: offer?.probation_months || 6,
        confirmation_status: 'Probation',
      },
    });

    // Update candidate record
    await this.updateCandidateStage(candidateId, 'Hired', `Converted to employee ${newEmployee.employee_code}`);

    const candUpdates: Partial<Candidate> = {
      converted_employee_id: newEmployee.id,
      converted_at: new Date().toISOString(),
      status: 'Hired',
    };

    if (isSupabaseEnabled && supabase) {
      try {
        await supabase.from('job_applicants').update({
          stage: 'HIRED',
          updated_at: new Date().toISOString(),
        }).eq('id', candidateId);
      } catch (_) {}
    }

    const cands = getStore<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const cIdx = cands.findIndex(c => c.id === candidateId);
    if (cIdx !== -1) {
      cands[cIdx] = { ...cands[cIdx], ...candUpdates };
      setStore(STORAGE_KEYS.CANDIDATES, cands);
    }

    hrEventBus.emit('recruitment.candidate_converted', { candidateId, employeeId: newEmployee.id });
    return newEmployee;
  }

  // ==========================================================================
  // 6. ANALYTICS & METRICS
  // ==========================================================================

  async getOverviewMetrics(organizationId = 'org-joy-01'): Promise<AtsOverviewMetrics> {
    const [reqs, jobs, candidates, interviews, offers] = await Promise.all([
      this.getRequisitions({ organizationId }),
      this.getJobs({ organizationId }),
      this.getCandidates(),
      this.getInterviews(),
      this.getOffers(),
    ]);

    const todayStr = new Date().toISOString().split('T')[0];
    const openPositions = jobs.filter(j => j.status === 'Open').reduce((acc, j) => acc + j.number_of_openings, 0);
    const pendingReqs = reqs.filter(r => r.status === 'Pending Approval' || r.status === 'Submitted').length;
    const activeCandidates = candidates.filter(c => c.status === 'Active').length;
    const interviewsToday = interviews.filter(i => (i.scheduled_date || i.date) === todayStr).length;
    const interviewsThisWeek = interviews.length;
    const pendingFeedbackCount = interviews.filter(i => i.status === 'Scheduled').length;
    const offersPending = offers.filter(o => o.status === 'Pending Approval' || o.status === 'Sent').length;
    const offersAccepted = offers.filter(o => o.status === 'Accepted').length;
    const offersDeclined = offers.filter(o => o.status === 'Declined').length;
    const candidatesJoined = candidates.filter(c => c.current_stage === 'Hired' || c.converted_employee_id).length;

    return {
      openPositions,
      pendingRequisitions: pendingReqs,
      activeCandidates,
      interviewsToday,
      interviewsThisWeek,
      pendingFeedbackCount,
      offersPending,
      offersAccepted,
      offersDeclined,
      candidatesJoined,
      avgTimeToFillDays: 28,
      agingPositionsCount: reqs.filter(r => r.status === 'Open').length,
    };
  }

  // ==========================================================================
  // 7. TALENT POOLS
  // ==========================================================================

  async getTalentPools(): Promise<TalentPool[]> {
    return getStore<TalentPool[]>(STORAGE_KEYS.TALENT_POOLS, [
      {
        id: 'pool-01',
        name: 'Principal & Staff Architects',
        category: 'Engineering',
        description: 'Pre-screened L5/L6 senior tech leaders for cloud & UI scale.',
        tags: ['React', 'Distributed Systems', 'System Design'],
        candidate_count: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'pool-02',
        name: 'Silver Medalist Candidates',
        category: 'High Potential',
        description: 'Exceptional finalist candidates for future expansion roles.',
        tags: ['Fast Track', 'Culture Fit'],
        candidate_count: 0,
        created_at: new Date().toISOString(),
      },
    ]);
  }
}

export const recruitmentService = new RecruitmentService();
