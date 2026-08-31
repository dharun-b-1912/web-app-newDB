// src/services/recruitment/offerManagementService.ts
// ============================================================================
// Joy PeopleHR — Offer Management 2.0 & AI Offer Letter Engine
// Structured Compensation, Template Rendering, Multi-Tier Approvals, E-Sign & Conversion
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import {
  Offer,
  OfferCompensationComponent,
  OfferBenefit,
  OfferApproval,
  OfferVersion,
  OfferTemplate,
  OfferActivityLog,
  OfferStatus,
} from '../../types/ats';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';
import { Employee } from '../../types';

const STORAGE_KEYS = {
  OFFERS: 'workforce_ats_offers_v2',
  TEMPLATES: 'workforce_ats_offer_templates_v2',
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
    console.error(`[OfferManagementService] Storage error for ${key}:`, err);
  }
}

export const DEFAULT_OFFER_TEMPLATES: OfferTemplate[] = [
  {
    id: 'tmpl-eng-standard',
    name: 'Standard Engineering & Tech Offer',
    category: 'Engineering',
    description: 'Standard full-time employment agreement for software engineers, tech leads, and designers.',
    body_template: `Dear {{candidate.name}},

On behalf of {{organization.name}}, we are delighted to extend an offer of employment for the position of {{job.title}} within our {{job.department}} department.

We were thoroughly impressed by your technical expertise, problem-solving abilities, and alignment with our mission to build next-generation enterprise workforce technologies.

1. POSITION & REPORTING
You will be joining as {{job.title}}, reporting directly to {{offer.reporting_manager}}. Your primary work mode will be {{offer.work_mode}} at our {{job.location}} facility.

2. COMMENCEMENT & PROBATION
Your scheduled date of joining is {{offer.joining_date}}. You will be on probation for an initial period of {{offer.probation_months}} months from your joining date, during which performance and milestones will be evaluated.

3. COMPENSATION & RETENTION INCENTIVE
Your total annualized Cost to Company (CTC) will be INR {{offer.ctc_annual}} ({{offer.ctc_in_words}}). The itemized monthly and annual salary components are outlined in Annexure A attached below.

4. NOTICE PERIOD & SEPARATION
During the probation period, either party may terminate employment by giving 30 days' written notice. Following confirmation, the standard notice period will be {{offer.notice_period_days}} days.

5. BENEFITS & PERKS
As a valued team member, you are eligible for the comprehensive company benefits program detailed in Annexure B.

Please confirm your acceptance of this offer by signing this document electronically before {{offer.expiry_date}}.

We eagerly look forward to welcoming you to the {{organization.name}} family!

Sincerely,
Hari Priya
Head of Talent Acquisition & People Operations
{{organization.name}}`,
    is_default: true,
  },
  {
    id: 'tmpl-exec-leadership',
    name: 'Executive Leadership & Staff Agreement',
    category: 'Leadership',
    description: 'Comprehensive agreement for Principal Architects, Directors, VPs, and Executive Leaders with governance clauses.',
    body_template: `Dear {{candidate.name}},

The Board of Directors and Executive Leadership Team at {{organization.name}} are pleased to present this formal offer for the strategic executive role of {{job.title}}.

We believe your visionary leadership and domain mastery will be instrumental in accelerating our organizational scale and technology excellence.

1. EXECUTIVE APPOINTMENT & SCOPE
You will serve as {{job.title}} overseeing strategic delivery in {{job.department}}, with direct reporting to {{offer.reporting_manager}}.

2. COMPENSATION & EXECUTIVE INCENTIVES
Your annualized Cost to Company (CTC) is fixed at INR {{offer.ctc_annual}}. In addition, you will participate in the Executive Milestone Bonus Plan subject to leadership performance metrics.

3. COMMENCEMENT & CONFIRMATION
Your appointment is effective from {{offer.joining_date}}. The executive notice period is established at {{offer.notice_period_days}} days.

Please review the complete compensation matrix and execution clauses below and execute your electronic signature by {{offer.expiry_date}}.

Warm regards,
Dharun Joy
Chief Executive Officer & Managing Director
{{organization.name}}`,
  },
  {
    id: 'tmpl-contractor-consultant',
    name: 'Fixed-Term Consultant & Contractor Agreement',
    category: 'Consulting',
    description: 'Fixed-duration engagement agreement for specialist technical consultants and domain advisors.',
    body_template: `Dear {{candidate.name}},

{{organization.name}} is pleased to engage your professional services as {{job.title}} on a fixed-term advisory basis starting {{offer.joining_date}}.

Your consulting fee is set at INR {{offer.ctc_annual}} annualized, payable monthly against approved deliverables and invoices.

Please execute your electronic acknowledgment below prior to {{offer.expiry_date}}.

Sincerely,
People Operations Team
{{organization.name}}`,
  },
];

export const STANDARD_BENEFITS: OfferBenefit[] = [
  {
    id: 'ben-01',
    offer_id: '',
    benefit_title: 'Comprehensive Group Health Insurance',
    benefit_description: 'INR 5,00,000 family floater coverage for employee, spouse, and up to 2 children.',
    coverage_amount: 500000,
    is_active: true,
  },
  {
    id: 'ben-02',
    offer_id: '',
    benefit_title: 'Annual Learning & Certification Allowance',
    benefit_description: 'INR 50,000 annual budget for technical certifications, conferences, and books.',
    coverage_amount: 50000,
    is_active: true,
  },
  {
    id: 'ben-03',
    offer_id: '',
    benefit_title: 'Flexible Remote / Hybrid Work Stipend',
    benefit_description: 'INR 25,000 one-time home office setup assistance and monthly internet allowance.',
    coverage_amount: 25000,
    is_active: true,
  },
  {
    id: 'ben-04',
    offer_id: '',
    benefit_title: 'Executive Wellness & Campus Gym Access',
    benefit_description: 'Unlimited access to on-campus fitness centers and annual preventative health checkups.',
    coverage_amount: 15000,
    is_active: true,
  },
];

class OfferManagementService {
  // ==========================================================================
  // 1. STRUCTURED COMPENSATION ENGINE
  // ==========================================================================

  calculateCompensationComponents(offerId: string, annualCtc: number): OfferCompensationComponent[] {
    const basicAnnual = Math.round(annualCtc * 0.5); // 50% Basic
    const hraAnnual = Math.round(annualCtc * 0.2); // 20% HRA
    const pfAnnual = Math.min(Math.round(basicAnnual * 0.12), 144000); // 12% PF
    const variableAnnual = Math.round(annualCtc * 0.1); // 10% Performance Variable
    const bonusAnnual = Math.round(annualCtc * 0.05); // 5% Retention Bonus
    const specialAllowanceAnnual = Math.max(
      annualCtc - (basicAnnual + hraAnnual + pfAnnual + variableAnnual + bonusAnnual),
      0
    );

    return [
      {
        id: `comp-basic-${Date.now()}`,
        offer_id: offerId,
        component_name: 'Basic Salary',
        component_type: 'Basic',
        amount_annual: basicAnnual,
        amount_monthly: Math.round(basicAnnual / 12),
        taxable: true,
        included_in_ctc: true,
        display_order: 1,
      },
      {
        id: `comp-hra-${Date.now()}`,
        offer_id: offerId,
        component_name: 'House Rent Allowance (HRA)',
        component_type: 'HRA',
        amount_annual: hraAnnual,
        amount_monthly: Math.round(hraAnnual / 12),
        taxable: true,
        included_in_ctc: true,
        display_order: 2,
      },
      {
        id: `comp-special-${Date.now()}`,
        offer_id: offerId,
        component_name: 'Special Allowance',
        component_type: 'Special Allowance',
        amount_annual: specialAllowanceAnnual,
        amount_monthly: Math.round(specialAllowanceAnnual / 12),
        taxable: true,
        included_in_ctc: true,
        display_order: 3,
      },
      {
        id: `comp-pf-${Date.now()}`,
        offer_id: offerId,
        component_name: 'Employer Provident Fund (PF)',
        component_type: 'Employer PF',
        amount_annual: pfAnnual,
        amount_monthly: Math.round(pfAnnual / 12),
        taxable: false,
        included_in_ctc: true,
        display_order: 4,
      },
      {
        id: `comp-var-${Date.now()}`,
        offer_id: offerId,
        component_name: 'Annual Performance Variable',
        component_type: 'Performance Variable',
        amount_annual: variableAnnual,
        amount_monthly: Math.round(variableAnnual / 12),
        taxable: true,
        included_in_ctc: true,
        display_order: 5,
      },
      {
        id: `comp-bonus-${Date.now()}`,
        offer_id: offerId,
        component_name: 'Retention & Annual Bonus',
        component_type: 'Joining Bonus',
        amount_annual: bonusAnnual,
        amount_monthly: Math.round(bonusAnnual / 12),
        taxable: true,
        included_in_ctc: true,
        display_order: 6,
      },
    ];
  }

  // ==========================================================================
  // 2. TEMPLATE ENGINE & DOCUMENT RENDERER
  // ==========================================================================

  getTemplates(): OfferTemplate[] {
    return getStore<OfferTemplate[]>(STORAGE_KEYS.TEMPLATES, DEFAULT_OFFER_TEMPLATES);
  }

  renderOfferLetterHtml(params: {
    template: OfferTemplate;
    offer: Partial<Offer>;
    organizationName?: string;
  }): string {
    const orgName = params.organizationName || 'Joy Corporate Solutions Pvt Ltd';
    const ctcFormatted = (params.offer.ctc_annual || 1800000).toLocaleString();

    let body = params.template.body_template;
    body = body.replace(/{{candidate\.name}}/g, params.offer.candidate_name || 'Candidate Name');
    body = body.replace(/{{organization\.name}}/g, orgName);
    body = body.replace(/{{job\.title}}/g, params.offer.job_title || 'Software Engineer');
    body = body.replace(/{{job\.department}}/g, params.offer.department_name || 'Engineering');
    body = body.replace(/{{job\.location}}/g, params.offer.location_name || 'Coimbatore HQ Campus');
    body = body.replace(/{{offer\.joining_date}}/g, params.offer.joining_date || '2026-09-15');
    body = body.replace(/{{offer\.work_mode}}/g, params.offer.work_mode || 'Hybrid');
    body = body.replace(/{{offer\.probation_months}}/g, String(params.offer.probation_months || 6));
    body = body.replace(/{{offer\.notice_period_days}}/g, String(params.offer.notice_period_days || 60));
    body = body.replace(/{{offer\.reporting_manager}}/g, params.offer.reporting_manager_name || 'Dharun Joy');
    body = body.replace(/{{offer\.ctc_annual}}/g, ctcFormatted);
    body = body.replace(/{{offer\.ctc_in_words}}/g, `${((params.offer.ctc_annual || 1800000) / 100000).toFixed(1)} Lakhs Per Annum`);
    body = body.replace(/{{offer\.expiry_date}}/g, params.offer.offer_expiry_date || '2026-08-30');

    return body;
  }

  // ==========================================================================
  // 3. AI OFFER ASSISTANT
  // ==========================================================================

  generateAiDraft(params: {
    candidateName: string;
    jobTitle: string;
    departmentName: string;
    locationName: string;
    joiningDate: string;
    annualCtc: number;
    probationMonths: number;
    noticePeriodDays: number;
    reportingManager: string;
    tone: 'Professional' | 'Warm' | 'Executive' | 'Concise' | 'Formal';
    organizationName?: string;
  }): string {
    const org = params.organizationName || 'Joy Corporate Solutions Pvt Ltd';
    const ctcLakhs = (params.annualCtc / 100000).toFixed(1);

    if (params.tone === 'Warm') {
      return `Dear ${params.candidateName},

We are absolutely thrilled to offer you the position of ${params.jobTitle} with ${org}!

Throughout our conversations, the entire team was energized by your passion, creativity, and technical depth. We know you will do amazing work here in our ${params.departmentName} group.

Key Terms of Your Offer:
• Role: ${params.jobTitle}
• Direct Manager: ${params.reportingManager}
• Joining Date: ${params.joiningDate}
• Annual CTC: INR ${params.annualCtc.toLocaleString()} (${ctcLakhs} LPA)
• Probation Period: ${params.probationMonths} months
• Notice Period: ${params.noticePeriodDays} days

We take immense pride in our culture of innovation, continuous learning, and employee well-being. We can't wait to build great things together!

Please review the attached compensation annexure and e-sign this offer letter to make it official.

Warmest regards,
Talent Acquisition Team
${org}`;
    }

    if (params.tone === 'Executive') {
      return `Dear ${params.candidateName},

On behalf of the Executive Committee of ${org}, it is my distinct privilege to formally offer you the strategic appointment of ${params.jobTitle}.

Your distinguished track record and leadership acumen position you uniquely to drive high-impact transformation across our ${params.departmentName} division.

Appointment Particulars:
1. Title & Scope: ${params.jobTitle}, reporting directly to ${params.reportingManager}.
2. Effective Commencement: ${params.joiningDate}.
3. Annualized Executive Remuneration: INR ${params.annualCtc.toLocaleString()} (inclusive of fixed emoluments and performance-linked incentives).
4. Executive Transition Notice: ${params.noticePeriodDays} calendar days following the initial ${params.probationMonths}-month probation milestones.

We look forward to your strategic contributions as we continue expanding our enterprise footprint.

Respectfully,
Dharun Joy
Chief Executive Officer & Managing Director
${org}`;
    }

    if (params.tone === 'Concise') {
      return `Dear ${params.candidateName},

${org} is pleased to offer you the position of ${params.jobTitle} in the ${params.departmentName} team.

Summary of Terms:
- Designation: ${params.jobTitle}
- Reporting To: ${params.reportingManager}
- Joining Date: ${params.joiningDate}
- Total Annual CTC: INR ${params.annualCtc.toLocaleString()}
- Probation Period: ${params.probationMonths} Months
- Notice Period: ${params.noticePeriodDays} Days

The itemized compensation breakup and company benefit schedules are attached in Annexure A. Please execute the electronic signature to confirm your acceptance.

Sincerely,
People Operations Team
${org}`;
    }

    // Default: Professional / Formal
    return `Dear ${params.candidateName},

We are pleased to extend an offer of employment for the position of ${params.jobTitle} with ${org} within our ${params.departmentName} department.

1. Role & Reporting: You will serve as ${params.jobTitle} at our ${params.locationName} location, reporting to ${params.reportingManager}.
2. Commencement & Probation: Your joining date is ${params.joiningDate}, with an initial probationary evaluation period of ${params.probationMonths} months.
3. Remuneration: Your annualized Cost to Company (CTC) is INR ${params.annualCtc.toLocaleString()} (${ctcLakhs} LPA).
4. Separation Terms: Following confirmation, the standard notice period is ${params.noticePeriodDays} days.

Please review the detailed compensation table and terms below and sign electronically to accept this offer.

Sincerely,
Hari Priya
Head of Talent Acquisition & People Operations
${org}`;
  }

  generateCandidateEmail(params: {
    candidateName: string;
    jobTitle: string;
    organizationName?: string;
    offerExpiryDate: string;
  }): { subject: string; body: string } {
    const org = params.organizationName || 'Joy Corporate Solutions Pvt Ltd';
    return {
      subject: `Offer of Employment: ${params.jobTitle} at ${org}`,
      body: `Hi ${params.candidateName},

We are delighted to share your formal offer of employment for the ${params.jobTitle} position with ${org}!

Please access your secure candidate offer document using the link below to review your compensation details, benefits annexure, and execute your electronic signature:

👉 https://careers.joycorporate.com/portal/offers/secure-verify

This offer remains valid until ${params.offerExpiryDate}. If you have any questions regarding the terms or benefits, feel free to reach out directly.

We are excited about the prospect of having you on our team!

Warm regards,
Talent Acquisition Team
${org}`,
    };
  }

  // ==========================================================================
  // 4. OFFER CRUD & LIFECYCLE STATE MACHINE
  // ==========================================================================

  async getOffers(params?: {
    status?: string;
    candidateId?: string;
    search?: string;
  }): Promise<Offer[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let q = supabase.from('offers').select('*');
        if (params?.status && params.status !== 'ALL') q = q.eq('status', params.status);
        if (params?.candidateId) q = q.eq('candidate_id', params.candidateId);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('[OfferManagementService] getOffers SQL error:', err);
      }
    }

    let list = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    if (params?.status && params.status !== 'ALL') {
      list = list.filter(o => o.status === params.status);
    }
    if (params?.candidateId) {
      list = list.filter(o => o.candidate_id === params.candidateId);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        o =>
          (o.candidate_name && o.candidate_name.toLowerCase().includes(q)) ||
          o.id.toLowerCase().includes(q) ||
          (o.job_title && o.job_title.toLowerCase().includes(q))
      );
    }
    return list;
  }

  async getOfferById(id: string): Promise<Offer | null> {
    const list = await this.getOffers();
    return list.find(o => o.id === id) || null;
  }

  async createOffer(payload: {
    candidate_id: string;
    candidate_name: string;
    candidate_email: string;
    candidate_phone?: string;
    job_id: string;
    job_title: string;
    department_name: string;
    location_name?: string;
    reporting_manager_name?: string;
    employment_type?: string;
    work_mode?: string;
    joining_date: string;
    ctc_annual: number;
    probation_months?: number;
    notice_period_days?: number;
    offer_expiry_date?: string;
    template_id?: string;
    custom_letter_body?: string;
    ai_tone?: 'Professional' | 'Warm' | 'Executive' | 'Concise' | 'Formal';
    author_name?: string;
  }): Promise<Offer> {
    const offerId = `OFR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const components = this.calculateCompensationComponents(offerId, payload.ctc_annual);
    const base = components.find(c => c.component_type === 'Basic')?.amount_annual || Math.round(payload.ctc_annual * 0.5);
    const variable = components.find(c => c.component_type === 'Performance Variable')?.amount_annual || 0;
    const bonus = components.find(c => c.component_type === 'Joining Bonus')?.amount_annual || 0;

    const templates = this.getTemplates();
    const selectedTemplate = templates.find(t => t.id === payload.template_id) || templates[0];

    const renderedHtml = payload.custom_letter_body || this.renderOfferLetterHtml({
      template: selectedTemplate,
      offer: { ...payload, ctc_annual: payload.ctc_annual },
    });

    const initialVersion: OfferVersion = {
      id: `ver-1-${Date.now()}`,
      offer_id: offerId,
      version_number: 1,
      document_title: `Employment Offer Letter — ${payload.candidate_name}`,
      rendered_html: renderedHtml,
      ai_generated: !!payload.ai_tone,
      ai_tone: payload.ai_tone || 'Professional',
      changes_summary: 'Initial offer draft generated',
      author_name: payload.author_name || 'Talent Acquisition Team',
      created_at: new Date().toISOString(),
    };

    const initialApprovals: OfferApproval[] = [
      { id: `appr-1-${Date.now()}`, offer_id: offerId, step_order: 1, approver_role: 'HR Head', approver_name: 'Hari Priya', status: 'Pending' },
      { id: `appr-2-${Date.now()}`, offer_id: offerId, step_order: 2, approver_role: 'Finance Controller', approver_name: 'Finance Reviewer', status: 'Pending' },
    ];

    const initialLogs: OfferActivityLog[] = [
      { id: `log-1-${Date.now()}`, offer_id: offerId, action: 'Offer Created', actor_name: payload.author_name || 'Recruiter', new_status: 'Draft', details: `Draft generated with CTC INR ${payload.ctc_annual.toLocaleString()}`, created_at: new Date().toISOString() },
    ];

    const newOffer: Offer = {
      id: offerId,
      organization_id: (payload as any).organization_id || getActiveOrgId(),
      candidate_id: payload.candidate_id,
      candidate_name: payload.candidate_name,
      candidate_email: payload.candidate_email,
      candidate_phone: payload.candidate_phone || '+91 98400 12345',
      job_id: payload.job_id,
      job_title: payload.job_title,
      department_name: payload.department_name,
      location_name: payload.location_name || 'Coimbatore HQ Campus',
      reporting_manager_name: payload.reporting_manager_name || 'Dharun Joy',
      employment_type: payload.employment_type || 'Full Time',
      work_mode: payload.work_mode || 'Hybrid',
      joining_date: payload.joining_date,
      ctc_annual: payload.ctc_annual,
      base_salary: base,
      variable_pay: variable,
      bonus: bonus,
      currency: 'INR',
      probation_months: payload.probation_months || 6,
      notice_period_days: payload.notice_period_days || 60,
      offer_expiry_date: payload.offer_expiry_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'Pending Approval',
      template_id: selectedTemplate.id,
      template_name: selectedTemplate.name,
      current_version_number: 1,
      rendered_letter_html: renderedHtml,
      components,
      benefits: STANDARD_BENEFITS.map(b => ({ ...b, offer_id: offerId })),
      approvals: initialApprovals,
      versions: [initialVersion],
      activity_logs: initialLogs,
      esign_provider: 'Joy PeopleHR E-Sign',
      esign_status: 'Ready to Send',
      background_check_status: 'Pending',
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
        console.warn('[OfferManagementService] createOffer SQL fallback:', err);
      }
    }

    const current = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    setStore(STORAGE_KEYS.OFFERS, [newOffer, ...current]);
    hrEventBus.emit('recruitment.offer_created', { offer: newOffer });
    return newOffer;
  }

  async approveOfferStep(offerId: string, stepOrder: number, comments?: string, approverName = 'HR Head'): Promise<Offer | null> {
    const list = await this.getOffers();
    const offer = list.find(o => o.id === offerId);
    if (!offer) return null;

    const approvals = offer.approvals || [];
    if (approvals[stepOrder]) {
      approvals[stepOrder].status = 'Approved';
      approvals[stepOrder].comments = comments || 'Approved terms and budget';
      approvals[stepOrder].decided_at = new Date().toISOString();
    }

    const allApproved = approvals.every(a => a.status === 'Approved');
    const updatedStatus: OfferStatus = allApproved ? 'Approved' : 'Pending Approval';

    const log: OfferActivityLog = {
      id: `log-${Date.now()}`,
      offer_id: offerId,
      action: `Approved by ${approverName}`,
      actor_name: approverName,
      previous_status: offer.status,
      new_status: updatedStatus,
      details: comments || 'Approved',
      created_at: new Date().toISOString(),
    };

    const updates: Partial<Offer> = {
      approvals,
      status: updatedStatus,
      activity_logs: [log, ...(offer.activity_logs || [])],
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase) {
      try {
        await supabase.from('offers').update(updates).eq('id', offerId);
      } catch (_) {}
    }

    const all = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    const idx = all.findIndex(o => o.id === offerId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.OFFERS, all);
    }
    hrEventBus.emit('recruitment.offer_created', { offerId, status: updatedStatus });
    return { ...offer, ...updates };
  }

  async sendOfferForEsign(offerId: string): Promise<Offer | null> {
    const list = await this.getOffers();
    const offer = list.find(o => o.id === offerId);
    if (!offer) return null;

    const envelopeId = `ENV-${Date.now().toString(36).toUpperCase()}`;
    const log: OfferActivityLog = {
      id: `log-${Date.now()}`,
      offer_id: offerId,
      action: 'Dispatched for E-Signature',
      actor_name: 'Talent Acquisition Team',
      previous_status: offer.status,
      new_status: 'Sent',
      details: `Dispatched e-signature envelope ${envelopeId} to ${offer.candidate_email}`,
      created_at: new Date().toISOString(),
    };

    const updates: Partial<Offer> = {
      status: 'Sent',
      sent_at: new Date().toISOString(),
      esign_envelope_id: envelopeId,
      esign_status: 'Sent to Candidate',
      activity_logs: [log, ...(offer.activity_logs || [])],
      updated_at: new Date().toISOString(),
    };

    const all = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    const idx = all.findIndex(o => o.id === offerId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.OFFERS, all);
    }
    hrEventBus.emit('recruitment.offer_created', { offerId, status: 'Sent' });
    return { ...offer, ...updates };
  }

  async simulateCandidateSignature(offerId: string): Promise<Offer | null> {
    const list = await this.getOffers();
    const offer = list.find(o => o.id === offerId);
    if (!offer) return null;

    const log: OfferActivityLog = {
      id: `log-${Date.now()}`,
      offer_id: offerId,
      action: 'Offer Signed by Candidate',
      actor_name: offer.candidate_name || 'Candidate',
      previous_status: offer.status,
      new_status: 'Accepted',
      details: 'Digital signature verified and webhook received from E-Sign Gateway',
      created_at: new Date().toISOString(),
    };

    const updates: Partial<Offer> = {
      status: 'Accepted',
      accepted_at: new Date().toISOString(),
      signed_at: new Date().toISOString(),
      esign_status: 'Signed & Completed',
      background_check_status: 'Initiated',
      preboarding_status: 'In Progress',
      activity_logs: [log, ...(offer.activity_logs || [])],
      updated_at: new Date().toISOString(),
    };

    const all = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    const idx = all.findIndex(o => o.id === offerId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.OFFERS, all);
    }
    hrEventBus.emit('recruitment.offer_accepted', { offerId });
    return { ...offer, ...updates };
  }

  async revokeOffer(offerId: string, reason: string): Promise<Offer | null> {
    const list = await this.getOffers();
    const offer = list.find(o => o.id === offerId);
    if (!offer) return null;

    const log: OfferActivityLog = {
      id: `log-${Date.now()}`,
      offer_id: offerId,
      action: 'Offer Revoked',
      actor_name: 'HR Head',
      previous_status: offer.status,
      new_status: 'Revoked',
      details: `Revocation Reason: ${reason}`,
      created_at: new Date().toISOString(),
    };

    const updates: Partial<Offer> = {
      status: 'Revoked',
      declined_reason: reason,
      activity_logs: [log, ...(offer.activity_logs || [])],
      updated_at: new Date().toISOString(),
    };

    const all = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    const idx = all.findIndex(o => o.id === offerId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.OFFERS, all);
    }
    return { ...offer, ...updates };
  }

  async convertCandidateToEmployee(candidateId: string, offerId?: string): Promise<Employee> {
    const offers = await this.getOffers();
    const offer = offerId ? offers.find(o => o.id === offerId) : offers.find(o => o.candidate_id === candidateId);
    if (!offer) throw new Error('Offer details not found');

    const [first, ...rest] = (offer.candidate_name || 'Candidate Name').split(' ');
    const last = rest.join(' ') || 'Employee';

    const created = await api.createEmployee({
      organization_id: (offer as any).organization_id || getActiveOrgId(),
      company_id: (offer as any).company_id || 'comp-joy-01',
      company_name: (offer as any).company_name || 'Joy Corporate Solutions Pvt Ltd',
      department_id: offer.department_id || 'dept-eng',
      department_name: offer.department_name || 'Engineering',
      designation_id: 'desig-eng',
      designation_title: offer.job_title || 'Software Engineer',
      employee_code: `WF-${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: first,
      last_name: last,
      display_name: offer.candidate_name,
      work_email: `${first.toLowerCase()}.${last.toLowerCase()}@joycorporate.com`,
      status: 'Active',
      employment_type: offer.employment_type || 'Full Time',
      employment_source: 'DIRECT',
      profile: {
        first_name: first,
        last_name: last,
        display_name: offer.candidate_name,
        phone: offer.candidate_phone || '+91 98400 12345',
        personal_email: offer.candidate_email,
        current_address: {
          line1: offer.location_name || 'Coimbatore',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          postal_code: '641018',
          country: 'India',
        },
      },
      employment: {
        doj: offer.joining_date,
        employment_type: offer.employment_type || 'Full Time',
        employment_source: 'DIRECT',
        work_location: offer.location_name || 'Coimbatore HQ Campus',
        reporting_manager_name: offer.reporting_manager_name || 'Dharun Joy',
        probation_period_months: offer.probation_months || 6,
        confirmation_status: 'Probation',
      },
    });

    // Mark offer preboarding completed
    const updates: Partial<Offer> = {
      preboarding_status: 'Completed',
      status: 'Accepted',
      updated_at: new Date().toISOString(),
    };
    const all = getStore<Offer[]>(STORAGE_KEYS.OFFERS, []);
    const idx = all.findIndex(o => o.id === offer.id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setStore(STORAGE_KEYS.OFFERS, all);
    }

    hrEventBus.emit('recruitment.candidate_converted', { candidateId, employeeId: created.id });
    return created;
  }
}

export const offerManagementService = new OfferManagementService();
