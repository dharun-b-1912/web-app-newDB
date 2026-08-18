// src/services/atsService.ts
// ============================================================================
// WorkForceOS — ATS Service Bridge
// Direct delegation to Recruitment & ATS 2.0 Engine with Zero-Mock Data Policy
// ============================================================================

import {
  Requisition,
  JobOpening,
  Candidate,
  CandidateApplication,
  Interview,
  Offer,
  TalentPool,
  CandidateNote,
  CandidateStage,
  InterviewScorecard,
} from '../types/ats';
import { recruitmentService } from './recruitment/recruitmentService';
import { hrEventBus } from './hrEventBus';

export const atsService = {
  // Requisitions
  async getRequisitionsAsync(params?: any): Promise<Requisition[]> {
    return recruitmentService.getRequisitions(params);
  },

  getRequisitions(): Requisition[] {
    try {
      const raw = localStorage.getItem('workforce_ats_requisitions_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async createRequisition(payload: Partial<Requisition> & { job_title: string }): Promise<Requisition> {
    return recruitmentService.createRequisition(payload);
  },

  async approveRequisitionStep(reqId: string, step: number, comments?: string): Promise<Requisition | null> {
    return recruitmentService.approveRequisitionStep(reqId, step, comments);
  },

  async rejectRequisition(reqId: string, reason: string, rejectedBy: string): Promise<Requisition | null> {
    return recruitmentService.rejectRequisition(reqId, reason, rejectedBy);
  },

  // Job Openings
  async getJobsAsync(params?: any): Promise<JobOpening[]> {
    return recruitmentService.getJobs(params);
  },

  getJobs(): JobOpening[] {
    try {
      const raw = localStorage.getItem('workforce_ats_jobs_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async createJob(payload: Partial<JobOpening> & { job_title: string }): Promise<JobOpening> {
    return recruitmentService.createJob(payload);
  },

  async toggleJobPublication(jobId: string, destination: string, publish: boolean): Promise<JobOpening | null> {
    return recruitmentService.toggleJobPublication(jobId, destination, publish);
  },

  // Candidates
  async getCandidatesAsync(params?: any): Promise<Candidate[]> {
    return recruitmentService.getCandidates(params);
  },

  getCandidates(): Candidate[] {
    try {
      const raw = localStorage.getItem('workforce_ats_candidates_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async createCandidate(payload: Partial<Candidate> & { first_name: string; last_name: string; email: string }): Promise<Candidate> {
    return recruitmentService.createCandidate(payload);
  },

  async updateCandidateStage(candidateId: string, stage: CandidateStage, reason?: string): Promise<Candidate | null> {
    return recruitmentService.updateCandidateStage(candidateId, stage, reason);
  },

  async getCandidateNotes(candidateId: string): Promise<CandidateNote[]> {
    return recruitmentService.getCandidateNotes(candidateId);
  },

  async addCandidateNote(candidateId: string, content: string, isPrivate = true): Promise<CandidateNote> {
    return recruitmentService.addCandidateNote(candidateId, content, isPrivate);
  },

  // Applications
  getApplications(): CandidateApplication[] {
    try {
      const raw = localStorage.getItem('workforce_ats_applications_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Interviews
  async getInterviewsAsync(params?: any): Promise<Interview[]> {
    return recruitmentService.getInterviews(params);
  },

  getInterviews(): Interview[] {
    try {
      const raw = localStorage.getItem('workforce_ats_interviews_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async scheduleInterview(payload: any): Promise<Interview> {
    return recruitmentService.scheduleInterview(payload);
  },

  async submitScorecard(payload: any): Promise<InterviewScorecard> {
    return recruitmentService.submitScorecard(payload);
  },

  // Offers
  async getOffersAsync(params?: any): Promise<Offer[]> {
    return recruitmentService.getOffers(params);
  },

  getOffers(): Offer[] {
    try {
      const raw = localStorage.getItem('workforce_ats_offers_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async createOffer(payload: any): Promise<Offer> {
    return recruitmentService.createOffer(payload);
  },

  async markOfferAccepted(offerId: string): Promise<Offer | null> {
    return recruitmentService.markOfferAccepted(offerId);
  },

  async convertCandidateToEmployee(candidateId: string, offerId?: string) {
    return recruitmentService.convertCandidateToEmployee(candidateId, offerId);
  },

  // Analytics & Metrics
  async getOverviewMetrics(orgId?: string) {
    return recruitmentService.getOverviewMetrics(orgId);
  },

  // Talent Pools
  async getTalentPools(): Promise<TalentPool[]> {
    return recruitmentService.getTalentPools();
  },
};
