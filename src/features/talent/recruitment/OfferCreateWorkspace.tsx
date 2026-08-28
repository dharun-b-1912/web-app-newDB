// src/features/talent/recruitment/OfferCreateWorkspace.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Offer Creation Workspace & AI Letter Generator
// 8-Stage Builder: Candidate, CTC Components, Terms, Benefits, AI Tone Draft & A4 Preview
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  Sparkles,
  Award,
  DollarSign,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  FileText,
  User,
  Building2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Wand2,
  RefreshCw,
  Copy,
  Download,
  Send,
  Eye,
} from 'lucide-react';
import { Candidate, JobOpening, OfferTemplate, OfferBenefit } from '../../../types/ats';
import { offerManagementService, STANDARD_BENEFITS } from '../../../services/recruitment/offerManagementService';
import { recruitmentService } from '../../../services/recruitment/recruitmentService';
import { cn } from '../../../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidate?: Candidate | null;
  onOfferCreated: () => void;
}

const STEPS = [
  { id: 1, label: 'Candidate & Job' },
  { id: 2, label: 'Compensation' },
  { id: 3, label: 'Terms' },
  { id: 4, label: 'Benefits' },
  { id: 5, label: 'Template' },
  { id: 6, label: 'AI Drafting' },
  { id: 7, label: 'Preview & Send' },
];

export const OfferCreateWorkspace: React.FC<Props> = ({
  isOpen,
  onClose,
  candidate: initialCandidate,
  onOfferCreated,
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);

  // Form State
  const [selectedCandidateId, setSelectedCandidateId] = useState(initialCandidate?.id || '');
  const [candidateName, setCandidateName] = useState(initialCandidate?.display_name || '');
  const [candidateEmail, setCandidateEmail] = useState(initialCandidate?.email || '');
  const [candidatePhone, setCandidatePhone] = useState(initialCandidate?.phone || '+91 98400 12345');
  const [selectedJobId, setSelectedJobId] = useState(initialCandidate?.applied_job_id || '');
  const [jobTitle, setJobTitle] = useState(initialCandidate?.applied_job_title || 'Staff Frontend Architect');
  const [departmentName, setDepartmentName] = useState(initialCandidate?.department_name || 'Engineering');
  const [locationName, setLocationName] = useState('Coimbatore HQ Campus');
  const [reportingManager, setReportingManager] = useState('Dharun Joy');
  const [employmentType, setEmploymentType] = useState('Full Time');
  const [workMode, setWorkMode] = useState('Hybrid');

  // Compensation
  const [annualCtc, setAnnualCtc] = useState(1800000);

  // Terms
  const [joiningDate, setJoiningDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [probationMonths, setProbationMonths] = useState(6);
  const [noticePeriodDays, setNoticePeriodDays] = useState(60);
  const [offerExpiryDate, setOfferExpiryDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  // Benefits
  const [selectedBenefits, setSelectedBenefits] = useState<OfferBenefit[]>(STANDARD_BENEFITS);

  // Template & AI
  const [selectedTemplateId, setSelectedTemplateId] = useState('tmpl-eng-standard');
  const [aiTone, setAiTone] = useState<'Professional' | 'Warm' | 'Executive' | 'Concise' | 'Formal'>('Professional');
  const [letterBody, setLetterBody] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPrerequisites();
    }
  }, [isOpen]);

  const loadPrerequisites = async () => {
    try {
      const [cList, jList] = await Promise.all([
        recruitmentService.getCandidates(),
        recruitmentService.getJobs(),
      ]);
      setCandidates(cList);
      setJobs(jList);
      setTemplates(offerManagementService.getTemplates());

      if (initialCandidate) {
        setCandidateName(initialCandidate.display_name || `${initialCandidate.first_name} ${initialCandidate.last_name}`);
        setCandidateEmail(initialCandidate.email);
        setCandidatePhone(initialCandidate.phone || '+91 98400 12345');
        setSelectedCandidateId(initialCandidate.id);
        setJobTitle(initialCandidate.applied_job_title || 'Software Engineer');
        setDepartmentName(initialCandidate.department_name || 'Engineering');
      } else if (cList.length > 0 && !selectedCandidateId) {
        const first = cList[0];
        setSelectedCandidateId(first.id);
        setCandidateName(first.display_name || `${first.first_name} ${first.last_name}`);
        setCandidateEmail(first.email);
        setCandidatePhone(first.phone || '+91 98400 12345');
        setJobTitle(first.applied_job_title || 'Software Engineer');
        setDepartmentName(first.department_name || 'Engineering');
      }

      // Initial draft generation
      generateInitialDraft();
    } catch (err) {
      console.error('[OfferCreateWorkspace] error:', err);
    }
  };

  const handleCandidateChange = (candId: string) => {
    const cand = candidates.find(c => c.id === candId);
    if (!cand) return;
    setSelectedCandidateId(cand.id);
    setCandidateName(cand.display_name || `${cand.first_name} ${cand.last_name}`);
    setCandidateEmail(cand.email);
    setCandidatePhone(cand.phone || '+91 98400 12345');
    setJobTitle(cand.applied_job_title || 'Software Engineer');
    setDepartmentName(cand.department_name || 'Engineering');
  };

  const generateInitialDraft = () => {
    const draft = offerManagementService.generateAiDraft({
      candidateName: candidateName || 'Arun Kumar',
      jobTitle: jobTitle || 'Senior Frontend Architect',
      departmentName: departmentName || 'Engineering',
      locationName,
      joiningDate,
      annualCtc,
      probationMonths,
      noticePeriodDays,
      reportingManager,
      tone: aiTone,
    });
    setLetterBody(draft);
  };

  const handleAiRefine = (tone: 'Professional' | 'Warm' | 'Executive' | 'Concise' | 'Formal') => {
    setAiTone(tone);
    setIsGeneratingAi(true);
    setTimeout(() => {
      const draft = offerManagementService.generateAiDraft({
        candidateName,
        jobTitle,
        departmentName,
        locationName,
        joiningDate,
        annualCtc,
        probationMonths,
        noticePeriodDays,
        reportingManager,
        tone,
      });
      setLetterBody(draft);
      setIsGeneratingAi(false);
      showToast(`Offer letter rewritten with ${tone} tone!`);
    }, 400);
  };

  const calculatedComponents = offerManagementService.calculateCompensationComponents('temp', annualCtc);
  const basic = calculatedComponents.find(c => c.component_type === 'Basic')?.amount_annual || 0;
  const hra = calculatedComponents.find(c => c.component_type === 'HRA')?.amount_annual || 0;
  const pf = calculatedComponents.find(c => c.component_type === 'Employer PF')?.amount_annual || 0;
  const variable = calculatedComponents.find(c => c.component_type === 'Performance Variable')?.amount_annual || 0;
  const special = calculatedComponents.find(c => c.component_type === 'Special Allowance')?.amount_annual || 0;

  const handleFinalSubmit = async (sendImmediately: boolean) => {
    setIsSubmitting(true);
    try {
      const newOffer = await offerManagementService.createOffer({
        candidate_id: selectedCandidateId,
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        candidate_phone: candidatePhone,
        job_id: selectedJobId || 'JOB-2026-101',
        job_title: jobTitle,
        department_name: departmentName,
        location_name: locationName,
        reporting_manager_name: reportingManager,
        employment_type: employmentType,
        work_mode: workMode,
        joining_date: joiningDate,
        ctc_annual: annualCtc,
        probation_months: probationMonths,
        notice_period_days: noticePeriodDays,
        offer_expiry_date: offerExpiryDate,
        template_id: selectedTemplateId,
        custom_letter_body: letterBody,
        ai_tone: aiTone,
      });

      if (sendImmediately) {
        await offerManagementService.sendOfferForEsign(newOffer.id);
        showToast(`Offer ${newOffer.id} generated and dispatched for E-Signature!`);
      } else {
        showToast(`Offer ${newOffer.id} submitted for HR & Finance approval!`);
      }

      onOfferCreated();
      onClose();
    } catch {
      showToast('Error creating offer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* Workspace Top Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#07563D] text-white flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-gray-900">Offer Management Workspace</h2>
                <Badge variant="emerald" size="sm" className="text-[10px] gap-1">
                  <Sparkles className="w-3 h-3" /> AI Assistant Active
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                Candidate: <strong className="text-gray-900">{candidateName}</strong> • Role: <strong className="text-gray-900">{jobTitle}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs rounded-xl">
              Exit
            </Button>
          </div>
        </div>

        {/* 8-Stage Progress Tracker */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {STEPS.map(s => {
              const isActive = currentStep === s.id;
              const isPast = currentStep > s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(s.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition',
                    isActive
                      ? 'bg-[#07563D] text-white shadow-2xs'
                      : isPast
                      ? 'bg-emerald-100 text-[#07563D]'
                      : 'text-gray-400 hover:bg-gray-100'
                  )}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono bg-black/10">
                    {s.id}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Body Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Candidate & Job */}
          {currentStep === 1 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <h3 className="text-sm font-black text-gray-900">Step 1 — Candidate & Position Verification</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Select Candidate *</label>
                  <select
                    value={selectedCandidateId}
                    onChange={e => handleCandidateChange(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white font-bold"
                  >
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.display_name || `${c.first_name} ${c.last_name}`} — {c.applied_job_title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Candidate Email</label>
                    <input
                      type="email"
                      value={candidateEmail}
                      onChange={e => setCandidateEmail(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Candidate Phone</label>
                    <input
                      type="text"
                      value={candidatePhone}
                      onChange={e => setCandidatePhone(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Position / Designation *</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-gray-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={departmentName}
                      onChange={e => setDepartmentName(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Compensation Breakdown */}
          {currentStep === 2 && (
            <div className="space-y-5 max-w-3xl mx-auto">
              <div>
                <h3 className="text-sm font-black text-gray-900">Step 2 — Structured Compensation Configuration</h3>
                <p className="text-xs text-gray-500">Configure itemized annualized and monthly earnings components</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Annual CTC (INR) *</label>
                <input
                  type="number"
                  step="50000"
                  value={annualCtc}
                  onChange={e => setAnnualCtc(Number(e.target.value))}
                  className="w-full p-3 text-lg font-mono font-black text-gray-900 rounded-2xl border border-emerald-300 focus:ring-2 focus:ring-[#07563D]"
                />
              </div>

              {/* Itemized Salary Components Breakdown Table */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase border-b border-gray-200 pb-2">
                  <span>Salary Component</span>
                  <span>Monthly (INR)</span>
                  <span>Annual (INR)</span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-800">
                  <span>Basic Salary (50%)</span>
                  <span className="font-mono">₹{Math.round(basic / 12).toLocaleString()}</span>
                  <span className="font-mono font-bold">₹{basic.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-800">
                  <span>House Rent Allowance - HRA (20%)</span>
                  <span className="font-mono">₹{Math.round(hra / 12).toLocaleString()}</span>
                  <span className="font-mono font-bold">₹{hra.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-800">
                  <span>Special Allowance</span>
                  <span className="font-mono">₹{Math.round(special / 12).toLocaleString()}</span>
                  <span className="font-mono font-bold">₹{special.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-800">
                  <span>Employer PF Contribution (12%)</span>
                  <span className="font-mono">₹{Math.round(pf / 12).toLocaleString()}</span>
                  <span className="font-mono font-bold">₹{pf.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-800">
                  <span>Annual Performance Variable (10%)</span>
                  <span className="font-mono">₹{Math.round(variable / 12).toLocaleString()}</span>
                  <span className="font-mono font-bold">₹{variable.toLocaleString()}</span>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-sm font-black text-[#07563D]">
                  <span>Total Cost to Company (CTC):</span>
                  <span className="font-mono">₹{annualCtc.toLocaleString()} / year</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Employment Terms */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <h3 className="text-sm font-black text-gray-900">Step 3 — Employment Governance & Terms</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Date of Joining *</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={e => setJoiningDate(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Offer Expiry Date *</label>
                  <input
                    type="date"
                    value={offerExpiryDate}
                    onChange={e => setOfferExpiryDate(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Probation Period (Months)</label>
                  <select
                    value={probationMonths}
                    onChange={e => setProbationMonths(Number(e.target.value))}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
                  >
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months (Standard)</option>
                    <option value={12}>12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Notice Period (Days)</label>
                  <select
                    value={noticePeriodDays}
                    onChange={e => setNoticePeriodDays(Number(e.target.value))}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
                  >
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days (Standard)</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reporting Manager</label>
                  <input
                    type="text"
                    value={reportingManager}
                    onChange={e => setReportingManager(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Work Mode</label>
                  <select
                    value={workMode}
                    onChange={e => setWorkMode(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="Office">On-Campus Office</option>
                    <option value="Remote">100% Remote</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Benefits */}
          {currentStep === 4 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <h3 className="text-sm font-black text-gray-900">Step 4 — Employee Benefits & Wellness Perks</h3>
              <div className="space-y-3">
                {STANDARD_BENEFITS.map((ben, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-gray-200/80 bg-white flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold text-xs">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-900">{ben.benefit_title}</h5>
                        <p className="text-[11px] text-gray-500">{ben.benefit_description}</p>
                      </div>
                    </div>
                    <Badge variant="emerald" size="sm" className="text-[10px]">
                      Included
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Template Selector */}
          {currentStep === 5 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <h3 className="text-sm font-black text-gray-900">Step 5 — Select Organization Offer Template</h3>
              <div className="space-y-3">
                {templates.map(tmpl => (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={cn(
                      'p-4 rounded-2xl border cursor-pointer transition shadow-2xs',
                      selectedTemplateId === tmpl.id
                        ? 'border-[#07563D] bg-emerald-50/50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900">{tmpl.name}</h4>
                      <Badge variant="gray" size="sm" className="text-[9px]">
                        {tmpl.category}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{tmpl.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: AI Drafting Assistant */}
          {currentStep === 6 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* AI Controls Panel */}
              <div className="space-y-4 lg:col-span-1">
                <Card className="p-4 rounded-2xl border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#07563D]">
                    <Sparkles className="w-4 h-4" /> AI Tone Customization
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Select a tone preset to automatically adjust executive framing and greeting style.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {(['Professional', 'Warm', 'Executive', 'Concise'] as const).map(tone => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => handleAiRefine(tone)}
                        className={cn(
                          'p-2 rounded-xl text-xs font-bold border transition text-center',
                          aiTone === tone
                            ? 'bg-[#07563D] text-white border-[#07563D]'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Verified Authoritative Data:</span>
                    <span className="font-bold text-emerald-800">INR {annualCtc.toLocaleString()}</span>
                  </div>
                </Card>
              </div>

              {/* Live Editable Textarea */}
              <div className="space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Offer Letter Body (AI Drafted)
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">Editable Markdown/Text</span>
                </div>
                <textarea
                  value={letterBody}
                  onChange={e => setLetterBody(e.target.value)}
                  rows={14}
                  className="w-full p-4 text-xs font-mono rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D] bg-white shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* STEP 7: Interactive A4 Document Preview */}
          {currentStep === 7 && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Realistic A4 Document Simulation */}
              <div className="bg-white p-8 rounded-3xl border border-gray-300 shadow-lg space-y-6 font-serif text-gray-900 max-w-3xl mx-auto">
                {/* Formal Letter Header */}
                <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
                  <div>
                    <h1 className="text-lg font-bold tracking-tight text-[#07563D]">
                      JOY CORPORATE SOLUTIONS PVT LTD
                    </h1>
                    <p className="text-[11px] text-gray-600 font-sans mt-0.5">
                      Coimbatore Tech Park, Avinashi Road, Coimbatore 641018
                    </p>
                  </div>
                  <div className="text-right text-[11px] font-sans text-gray-500">
                    <div>Date: <strong>{new Date().toLocaleDateString()}</strong></div>
                    <div>Offer Ref: <strong>OFR-2026-PREVIEW</strong></div>
                  </div>
                </div>

                {/* Candidate Address Block */}
                <div className="text-xs font-sans space-y-0.5">
                  <p className="font-bold text-gray-900">{candidateName}</p>
                  <p className="text-gray-600">{candidateEmail} • {candidatePhone}</p>
                </div>

                {/* Letter Body Content */}
                <div className="text-xs font-sans leading-relaxed whitespace-pre-line text-gray-800">
                  {letterBody}
                </div>

                {/* Annexure A: Compensation Breakdown Table */}
                <div className="pt-4 border-t border-gray-200 font-sans space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase">Annexure A — Itemized Compensation Breakup</h4>
                  <table className="w-full text-xs text-left border border-gray-200">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-2 border-b">Salary Component</th>
                        <th className="p-2 border-b text-right">Monthly (INR)</th>
                        <th className="p-2 border-b text-right">Annual (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr>
                        <td className="p-2">Basic Salary (50%)</td>
                        <td className="p-2 text-right font-mono">₹{Math.round(basic / 12).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold">₹{basic.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-2">House Rent Allowance (HRA)</td>
                        <td className="p-2 text-right font-mono">₹{Math.round(hra / 12).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold">₹{hra.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-2">Special Allowance</td>
                        <td className="p-2 text-right font-mono">₹{Math.round(special / 12).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold">₹{special.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="p-2">Employer Provident Fund (PF)</td>
                        <td className="p-2 text-right font-mono">₹{Math.round(pf / 12).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold">₹{pf.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-emerald-50/50 font-bold text-[#07563D]">
                        <td className="p-2">Total Annualized CTC:</td>
                        <td className="p-2 text-right font-mono">₹{Math.round(annualCtc / 12).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono">₹{annualCtc.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signature Block */}
                <div className="pt-6 border-t border-gray-200 grid grid-cols-2 gap-6 font-sans text-xs">
                  <div>
                    <p className="text-gray-500">Authorized Signatory</p>
                    <div className="h-10 mt-2 flex items-center font-bold text-[#07563D]">Hari Priya</div>
                    <p className="text-[11px] text-gray-500">Head of People Operations</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Candidate Acceptance & Signature</p>
                    <div className="h-10 mt-2 border-b border-dashed border-gray-300 flex items-center text-gray-300 italic">
                      Digital E-Sign Placeholder
                    </div>
                    <p className="text-[11px] text-gray-500">Date & E-Signature</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Workspace Bottom Action Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="text-xs rounded-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Previous Step
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1 rounded-xl"
              >
                Continue to Step {currentStep + 1} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleFinalSubmit(false)}
                  className="text-xs rounded-xl border-emerald-300 text-[#07563D]"
                >
                  Submit for Approval
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleFinalSubmit(true)}
                  className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs gap-1.5 rounded-xl shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Dispatching...' : 'Dispatch E-Sign Immediately'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
