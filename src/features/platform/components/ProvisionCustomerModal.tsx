// src/features/platform/components/ProvisionCustomerModal.tsx
// ============================================================
// Joy PeopleHR — Enterprise Customer Organization Provisioning Workspace
// ============================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  Search,
  Check,
  Globe,
  Sparkles,
  Lock,
  Zap,
  HelpCircle,
  Clock,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Briefcase,
  Smartphone,
  Mail,
  Shield,
  Tag,
} from 'lucide-react';
import {
  platformProvisioningEngine,
  ProvisioningFormData,
  ProvisioningStepProgress,
  ProvisioningResult,
} from '../../../services/platform/platformProvisioningEngine';
import { billingCalculationEngine } from '../../../services/billing/billingCalculationEngine';
import { platformTierPlansService } from '../../../services/platform/platformTierPlansService';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

export interface ProvisionCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProvisionSuccess?: (newOrgId: string) => void;
}

const INITIAL_FORM: ProvisioningFormData = {
  legal_name: '',
  display_name: '',
  domain: '',
  slug: '',
  industry: 'Software & IT Services',
  company_type: 'Private Limited',
  country: 'India',
  state: 'Tamil Nadu',
  city: 'Chennai',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  environment: 'Production Test Tenant',
  gstin: '',
  pan: '',
  cin: '',
  registered_address: '',
  website: '',
  phone: '',

  admin_first_name: '',
  admin_last_name: '',
  admin_email: '',
  admin_phone: '',
  admin_job_title: 'Head of People Operations',
  admin_language: 'English (US)',
  admin_timezone: 'Asia/Kolkata',

  plan_id: 'plan-professional',
  plan_name: 'Professional',
  billing_cycle: 'Monthly',
  seats: 100,
  auto_renew: true,
  coupon_code: '',
  coupon_discount_percent: 0,

  enabled_features: [],
  feature_overrides: {},
};

export const ProvisionCustomerModal: React.FC<ProvisionCustomerModalProps> = ({
  isOpen,
  onClose,
  onProvisionSuccess,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<ProvisioningFormData>(INITIAL_FORM);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isExpandOptional, setIsExpandOptional] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showProvisionConfirm, setShowProvisionConfirm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [provisionProgress, setProvisionProgress] = useState<ProvisioningStepProgress[]>([]);
  const [provisionResult, setProvisionResult] = useState<ProvisioningResult | null>(null);

  // Live Validation States
  const [companyStatus, setCompanyStatus] = useState<{ checking: boolean; available?: boolean; message?: string }>({ checking: false });
  const [slugStatus, setSlugStatus] = useState<{ checking: boolean; available?: boolean; message?: string }>({ checking: false });
  const [domainStatus, setDomainStatus] = useState<{ checking: boolean; available?: boolean; message?: string }>({ checking: false });
  const [emailStatus, setEmailStatus] = useState<{ checking: boolean; available?: boolean; message?: string }>({ checking: false });

  // 1. Restore Saved Draft or Initialize
  useEffect(() => {
    if (isOpen) {
      const draft = platformProvisioningEngine.getDraft();
      if (draft && draft.form_data?.legal_name) {
        setFormData(draft.form_data);
        setStep(draft.current_step || 1);
        setLastSavedTime(new Date(draft.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        showToast('Resumed active customer provisioning draft', 'info');
      } else {
        setFormData(INITIAL_FORM);
        setStep(1);
      }
      setProvisionResult(null);
      setProvisionProgress([]);
    }
  }, [isOpen]);

  // 2. Auto-Save Draft on Form Changes (Debounced)
  useEffect(() => {
    if (isOpen && !provisionResult && formData.legal_name) {
      const timer = setTimeout(() => {
        platformProvisioningEngine.saveDraft(step, formData);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData, step, isOpen, provisionResult]);

  // 3. Auto-generate Tenant Slug when Company Name changes
  const handleLegalNameChange = (val: string) => {
    const autoSlug = platformProvisioningEngine.generateTenantSlug(val);
    setFormData((prev) => {
      const cleanShortName = val
        .replace(/\b(private\s+limited|pvt\s+ltd|pvt|ltd|limited|inc|incorporated|llc)\b/gi, '')
        .trim();
      const currentAutoSlug = platformProvisioningEngine.generateTenantSlug(prev.legal_name || '');
      const isSlugAuto = !prev.slug || prev.slug === currentAutoSlug;

      return {
        ...prev,
        legal_name: val,
        display_name: prev.display_name === prev.legal_name || !prev.display_name ? (cleanShortName || val) : prev.display_name,
        domain: (!prev.domain || prev.domain.endsWith('.com')) && autoSlug ? `${autoSlug}.com` : prev.domain,
        slug: isSlugAuto ? autoSlug : prev.slug,
      };
    });
  };

  const handleDisplayNameChange = (val: string) => {
    const autoSlug = platformProvisioningEngine.generateTenantSlug(val);
    setFormData((prev) => {
      const currentAutoSlug = platformProvisioningEngine.generateTenantSlug(prev.display_name || prev.legal_name || '');
      const isSlugAuto = !prev.slug || prev.slug === currentAutoSlug;
      return {
        ...prev,
        display_name: val,
        slug: isSlugAuto && autoSlug ? autoSlug : prev.slug,
      };
    });
  };

  // 4. Live Debounced Company Name Check
  useEffect(() => {
    if (!formData.legal_name || formData.legal_name.trim().length < 3) {
      setCompanyStatus({ checking: false });
      return;
    }
    setCompanyStatus({ checking: true });
    const timer = setTimeout(async () => {
      const res = await platformProvisioningEngine.checkCompanyNameAvailability(formData.legal_name);
      setCompanyStatus({ checking: false, available: res.available, message: res.message });
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.legal_name]);

  // 5. Live Debounced Slug Check
  useEffect(() => {
    if (!formData.slug || formData.slug.trim().length < 2) {
      setSlugStatus({ checking: false });
      return;
    }
    setSlugStatus({ checking: true });
    const timer = setTimeout(async () => {
      const res = await platformProvisioningEngine.checkTenantSlugAvailability(formData.slug);
      setSlugStatus({ checking: false, available: res.available, message: res.message });
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.slug]);

  // 6. Live Debounced Domain Check
  useEffect(() => {
    if (!formData.domain || !formData.domain.includes('.')) {
      setDomainStatus({ checking: false });
      return;
    }
    setDomainStatus({ checking: true });
    const timer = setTimeout(async () => {
      const res = await platformProvisioningEngine.checkDomainAvailability(formData.domain);
      setDomainStatus({ checking: false, available: res.available, message: res.message });
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.domain]);

  // 7. Live Debounced Admin Email Check
  useEffect(() => {
    if (!formData.admin_email || !formData.admin_email.includes('@')) {
      setEmailStatus({ checking: false });
      return;
    }
    setEmailStatus({ checking: true });
    const timer = setTimeout(async () => {
      const res = await platformProvisioningEngine.checkAdminEmailAvailability(formData.admin_email);
      setEmailStatus({ checking: false, available: res.available, message: res.message });
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.admin_email]);

  // 6. Dynamic Plan Specs & Billing Calculations
  const planSpecs = useMemo(() => {
    return [
      { id: 'plan-starter', name: 'Starter', monthly: 18000, annual: 180000, includedSeats: 25, maxSeats: 50, featureCount: 12, desc: 'Essential core HR, leave, and attendance.' },
      { id: 'plan-professional', name: 'Professional', monthly: 45000, annual: 450000, includedSeats: 100, maxSeats: 200, featureCount: 22, desc: 'GPS geofencing, shift scheduling, and statutory compliance.' },
      { id: 'plan-business', name: 'Business', monthly: 85000, annual: 850000, includedSeats: 250, maxSeats: 500, featureCount: 36, desc: 'Payroll, ATS recruitment, video LMS, and WhatsApp.' },
      { id: 'plan-enterprise', name: 'Enterprise', monthly: 180000, annual: 1800000, includedSeats: 500, maxSeats: 5000, featureCount: 48, desc: 'Dedicated VPC, biometric turnstile push & AI Copilot.' },
    ];
  }, []);

  const selectedPlanSpec = useMemo(() => {
    return planSpecs.find((p) => p.name === formData.plan_name) || planSpecs[1];
  }, [planSpecs, formData.plan_name]);

  const billingOutput = useMemo(() => {
    return billingCalculationEngine.calculateBilling({
      plan: {
        id: selectedPlanSpec.id,
        name: selectedPlanSpec.name,
        code: selectedPlanSpec.name.toLowerCase(),
        monthlyPrice: selectedPlanSpec.monthly,
        annualPrice: selectedPlanSpec.annual,
        includedSeats: selectedPlanSpec.includedSeats,
        maximumSeats: selectedPlanSpec.maxSeats,
        additionalSeatPrice: 150,
      },
      seatCount: formData.seats,
      billingInterval: formData.billing_cycle,
      couponDiscountPercent: formData.coupon_discount_percent,
    });
  }, [selectedPlanSpec, formData.seats, formData.billing_cycle, formData.coupon_discount_percent]);

  // 7. Auto-load Feature Entitlements based on Plan
  const allFeatures = useMemo(() => {
    return [
      { code: 'CORE_EMPLOYEE_DIR', name: 'Core Employee Directory & Org Chart', category: 'Core HR', minPlan: 'Starter', desc: 'Centralized staff directory and hierarchical org tree.' },
      { code: 'ESS_PORTAL', name: 'Employee Self-Service (ESS Portal)', category: 'Core HR', minPlan: 'Starter', desc: 'Mobile self-service for profile edits and documents.' },
      { code: 'DOCUMENTS_ESIGN', name: 'Document Management & Digital E-Sign', category: 'Core HR', minPlan: 'Professional', desc: 'Aadhaar e-Sign and automated offer letters.' },
      { code: 'ATTENDANCE_BASIC', name: 'Web & Mobile Attendance Clock-In', category: 'Attendance', minPlan: 'Starter', desc: 'Standard check-in/out logging.' },
      { code: 'ATTENDANCE_GPS', name: 'GPS Geofence Clock-in with Radius Check', category: 'Attendance', minPlan: 'Professional', desc: 'Geofenced mobile check-ins for field teams.' },
      { code: 'ATTENDANCE_ROSTER', name: 'Shift Scheduling & Roster Management', category: 'Attendance', minPlan: 'Professional', desc: 'Rotational shifts and night allowance calculation.' },
      { code: 'BIOMETRIC_ADAPTERS', name: 'Biometric Turnstile Push Daemon', category: 'Hardware', minPlan: 'Enterprise', desc: 'Direct daemon adapter for eSSL and Mantra devices.' },
      { code: 'LEAVE_BASIC', name: 'Leave Applications & Approvals', category: 'Leave', minPlan: 'Starter', desc: 'Standard paid, sick, and casual leave quotas.' },
      { code: 'LEAVE_AUTO_ACCRUAL', name: 'Automated Leave Accruals & Encashment', category: 'Leave', minPlan: 'Professional', desc: 'Monthly accrual engines and sandwich leave rules.' },
      { code: 'PAYROLL_STANDARD', name: 'Standard Monthly Payroll Run', category: 'Payroll', minPlan: 'Starter', desc: 'Salary processing and bank transfer advice.' },
      { code: 'PAYROLL_STATUTORY', name: 'Statutory PF, ESI, PT & Form 16', category: 'Payroll', minPlan: 'Professional', desc: 'Automated statutory filings and tax deductions.' },
      { code: 'EXPENSE_REIMBURSEMENTS', name: 'Expense Claims & OCR Travel Desk', category: 'Payroll', minPlan: 'Business', desc: 'Multi-currency expense approvals with receipt OCR.' },
      { code: 'WHATSAPP_PAYSLIPS', name: 'WhatsApp Payslips & Leave Actions', category: 'Messaging', minPlan: 'Business', desc: 'Direct WhatsApp Cloud API notification bot.' },
      { code: 'ATS_RECRUITMENT', name: 'ATS Recruitment Pipeline & Job Board', category: 'Recruitment', minPlan: 'Business', desc: 'Candidate Kanban boards and resume parsing.' },
      { code: 'AI_COPILOT', name: 'Joy PeopleHR AI Copilot & Search', category: 'AI & Copilot', minPlan: 'Enterprise', desc: 'Natural language HR assistant for company policies.' },
      { code: 'FORENSIC_AUDIT_LOGS', name: '7-Year Tamper-Evident Forensic Audit', category: 'Security', minPlan: 'Enterprise', desc: 'SOC 2 compliant immutable audit trail.' },
    ];
  }, []);

  // Update enabled features when plan changes
  useEffect(() => {
    const planRanks: Record<string, number> = { Starter: 1, Professional: 2, Business: 3, Enterprise: 4 };
    const currentRank = planRanks[formData.plan_name] || 2;
    const includedCodes = allFeatures
      .filter((f) => (planRanks[f.minPlan] || 1) <= currentRank)
      .map((f) => f.code);

    setFormData((prev) => ({
      ...prev,
      enabled_features: includedCodes,
    }));
  }, [formData.plan_name, allFeatures]);

  // Validation Checks per Step
  const isStepValid = useMemo(() => {
    if (step === 1) {
      return (
        formData.legal_name.trim().length >= 3 &&
        companyStatus.available !== false &&
        slugStatus.available !== false &&
        formData.domain.trim().length >= 4 &&
        domainStatus.available !== false &&
        formData.slug.trim().length >= 2
      );
    }
    if (step === 2) {
      return (
        formData.admin_first_name.trim().length >= 2 &&
        formData.admin_email.includes('@') &&
        emailStatus.available !== false
      );
    }
    if (step === 3) {
      return formData.seats >= 5 && formData.seats <= 5000;
    }
    if (step === 4) {
      return formData.enabled_features.length > 0;
    }
    return true;
  }, [step, formData, companyStatus, slugStatus, domainStatus, emailStatus]);

  // Handle Final Provisioning Execution
  const handleExecuteProvision = async () => {
    setShowProvisionConfirm(false);
    setIsSubmitting(true);

    const idempotencyKey = `prov-${formData.slug}-${Date.now()}`;
    const result = await platformProvisioningEngine.provisionCustomer(
      formData,
      (stepProgress) => {
        setProvisionProgress((prev) => {
          const idx = prev.findIndex((p) => p.stepIndex === stepProgress.stepIndex);
          if (idx === -1) return [...prev, stepProgress];
          const copy = [...prev];
          copy[idx] = stepProgress;
          return copy;
        });
      },
      idempotencyKey
    );

    setIsSubmitting(false);
    setProvisionResult(result);

    if (result.success) {
      showToast(`Customer "${formData.legal_name}" provisioned successfully!`, 'success');
      onProvisionSuccess?.(result.organizationId);
    } else {
      showToast(result.message || 'Provisioning encountered an issue.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* ============================================================
            1. HEADER WITH CONTEXT & DRAFT STATUS
           ============================================================ */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-[#047857] flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Create Customer Organization</h2>
              {lastSavedTime && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5 ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Draft saved {lastSavedTime}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 ml-10">
              Set up a new Joy PeopleHR tenant, administrator, subscription and feature access.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (formData.legal_name && !provisionResult) {
                  setShowExitConfirm(true);
                } else {
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================
            2. PROGRESS STEPPER (5 STEPS)
           ============================================================ */}
        {!provisionResult && (
          <div className="px-8 py-3.5 bg-gray-50/70 border-b border-gray-100">
            <div className="flex items-center justify-between">
              {[
                { s: 1, title: 'Organization', desc: 'Tenant identity' },
                { s: 2, title: 'Primary Admin', desc: 'Initial owner' },
                { s: 3, title: 'Subscription', desc: 'Plan & billing' },
                { s: 4, title: 'Features', desc: 'Entitlements' },
                { s: 5, title: 'Review & Provision', desc: 'Verification' },
              ].map((st, idx) => {
                const isPassed = step > st.s;
                const isCurrent = step === st.s;
                return (
                  <React.Fragment key={st.s}>
                    <button
                      onClick={() => isPassed && setStep(st.s)}
                      disabled={!isPassed}
                      className={cn(
                        'flex items-center gap-2.5 text-left transition',
                        isPassed ? 'cursor-pointer' : 'cursor-default'
                      )}
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all',
                          isPassed
                            ? 'bg-[#047857] text-white shadow-xs'
                            : isCurrent
                            ? 'bg-emerald-100 text-[#047857] ring-2 ring-[#047857]'
                            : 'bg-gray-200 text-gray-500'
                        )}
                      >
                        {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : `0${st.s}`}
                      </div>
                      <div>
                        <div className={cn('text-xs font-bold', isCurrent ? 'text-[#047857]' : isPassed ? 'text-gray-900' : 'text-gray-400')}>
                          {st.title}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">{st.desc}</div>
                      </div>
                    </button>
                    {idx < 4 && <div className={cn('flex-1 h-0.5 mx-4', step > idx + 1 ? 'bg-[#047857]' : 'bg-gray-200')} />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            3. WORKSPACE BODY / STEP CONTENT
           ============================================================ */}
        <div className="flex-1 overflow-y-auto px-8 py-6 text-xs">
          {/* ----------------------------------------------------
              EXECUTION PROGRESS SCREEN (WHEN SUBMITTING)
             ---------------------------------------------------- */}
          {isSubmitting && (
            <div className="py-8 max-w-md mx-auto space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-[#047857] flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Provisioning {formData.legal_name}</h3>
                <p className="text-xs text-gray-500 mt-1">Executing atomic database transaction and provisioning tenant.</p>
              </div>

              <div className="space-y-3 text-left bg-gray-50 p-4 rounded-2xl border border-gray-200">
                {provisionProgress.map((p) => (
                  <div key={p.stepIndex} className="flex items-center justify-between text-xs font-semibold">
                    <span className={cn(p.status === 'COMPLETED' ? 'text-[#047857]' : p.status === 'IN_PROGRESS' ? 'text-blue-600' : 'text-gray-400')}>
                      {p.stepName}
                    </span>
                    {p.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-[#047857]" />}
                    {p.status === 'IN_PROGRESS' && <span className="w-3.5 h-3.5 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />}
                    {p.status === 'PENDING' && <span className="w-2 h-2 rounded-full bg-gray-300" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              SUCCESS SCREEN
             ---------------------------------------------------- */}
          {provisionResult && provisionResult.success && (
            <div className="py-8 max-w-lg mx-auto space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{formData.legal_name} Provisioned!</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Tenant slug <strong className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">{provisionResult.tenantSlug}</strong> is active with {formData.plan_name} plan.
                </p>
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 text-left space-y-2.5 text-xs font-medium">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Subscription Plan:</span>
                  <strong className="text-[#047857]">{formData.plan_name} ({formData.seats} Seats)</strong>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Contract Rate:</span>
                  <strong className="font-mono text-gray-900">₹{billingOutput.subtotal.toLocaleString('en-IN')} / {formData.billing_cycle}</strong>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Paid Invoice Reference:</span>
                  <strong className="font-mono text-gray-900">{provisionResult.invoiceId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Primary Administrator:</span>
                  <strong className="text-gray-900">{formData.admin_email}</strong>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Open Organization Console
                </button>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              STEP 1: ORGANIZATION DETAILS
             ---------------------------------------------------- */}
          {!isSubmitting && !provisionResult && step === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="border-b pb-3">
                <h3 className="text-base font-bold text-gray-900">Organization details</h3>
                <p className="text-xs text-gray-500 mt-0.5">Create the tenant identity and basic company profile.</p>
              </div>

              {/* Company Identity */}
              <div className="space-y-4">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Company Identity</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-gray-700">Company Legal Name *</label>
                      {companyStatus.checking && <span className="text-[10px] text-gray-400">Checking...</span>}
                      {!companyStatus.checking && companyStatus.available === true && (
                        <span className="text-[10px] font-bold text-[#047857] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Available
                        </span>
                      )}
                      {!companyStatus.checking && companyStatus.available === false && (
                        <span className="text-[10px] font-bold text-rose-600">Already Registered</span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Joy Corporate Solutions Pvt Ltd"
                      value={formData.legal_name}
                      onChange={(e) => handleLegalNameChange(e.target.value)}
                      className={cn(
                        'w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border text-gray-900 focus:outline-none focus:ring-2',
                        companyStatus.available === false ? 'border-rose-300 focus:ring-rose-500' : 'border-gray-200 focus:ring-[#047857]'
                      )}
                    />
                    {companyStatus.message && (
                      <p className={cn('text-[10px] mt-1 font-medium', companyStatus.available ? 'text-gray-500' : 'text-rose-600')}>
                        {companyStatus.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Display Name (Short Brand) *</label>
                    <input
                      type="text"
                      placeholder="e.g. Joy Corporate Solutions"
                      value={formData.display_name}
                      onChange={(e) => handleDisplayNameChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    />
                  </div>
                </div>

                {/* Domain & Tenant Slug Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-gray-700">Primary Domain *</label>
                      {domainStatus.checking && <span className="text-[10px] text-gray-400">Checking...</span>}
                      {!domainStatus.checking && domainStatus.available === true && (
                        <span className="text-[10px] font-bold text-[#047857] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Available
                        </span>
                      )}
                      {!domainStatus.checking && domainStatus.available === false && (
                        <span className="text-[10px] font-bold text-rose-600">Unavailable</span>
                      )}
                    </div>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. joycorporatesolutions.com"
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        className={cn(
                          'w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-gray-50 border text-gray-900 focus:outline-none focus:ring-2 font-mono text-xs',
                          domainStatus.available === false ? 'border-rose-300 focus:ring-rose-500' : 'border-gray-200 focus:ring-[#047857]'
                        )}
                      />
                    </div>
                    {domainStatus.message && (
                      <p className={cn('text-[10px] mt-1 font-medium', domainStatus.available ? 'text-gray-500' : 'text-rose-600')}>
                        {domainStatus.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-gray-700">Joy PeopleHR Tenant Identifier</label>
                      {slugStatus.checking && <span className="text-[10px] text-gray-400">Checking...</span>}
                      {!slugStatus.checking && slugStatus.available === true && (
                        <span className="text-[10px] font-bold text-[#047857] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Unique ID
                        </span>
                      )}
                      {!slugStatus.checking && slugStatus.available === false && (
                        <span className="text-[10px] font-bold text-rose-600">Duplicate ID</span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 font-mono font-bold text-xs text-gray-400 select-none">org-</span>
                      <input
                        type="text"
                        placeholder="tenant-slug"
                        value={formData.slug}
                        onChange={(e) => {
                          const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setFormData({ ...formData, slug: clean });
                        }}
                        className={cn(
                          'w-full pl-12 pr-28 py-2.5 rounded-xl font-mono text-xs font-bold border focus:outline-none focus:ring-2',
                          slugStatus.available === false
                            ? 'bg-rose-50 border-rose-300 text-rose-700 focus:ring-rose-500'
                            : 'bg-emerald-50/40 border-emerald-300 text-[#047857] focus:ring-[#047857]'
                        )}
                      />
                      <span
                        className={cn(
                          'absolute right-2.5 text-[10px] font-sans px-2 py-0.5 rounded font-bold pointer-events-none',
                          slugStatus.available === false ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-[#047857]'
                        )}
                      >
                        {slugStatus.available === false ? 'Taken' : 'Auto-Generated'}
                      </span>
                    </div>
                    {slugStatus.message && (
                      <p className={cn('text-[10px] mt-1 font-medium', slugStatus.available ? 'text-gray-500' : 'text-rose-600')}>
                        {slugStatus.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Industry & Company Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Industry Vertical *</label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    >
                      <option value="Software & IT Services">Software & IT Services</option>
                      <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                      <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                      <option value="Banking & Financial Services">Banking & Financial Services</option>
                      <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                      <option value="Consulting & Professional Services">Consulting & Professional Services</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Company Legal Type *</label>
                    <select
                      value={formData.company_type}
                      onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    >
                      <option value="Private Limited">Private Limited Company</option>
                      <option value="Public Limited">Public Limited Company</option>
                      <option value="Partnership">Partnership Firm</option>
                      <option value="LLP">Limited Liability Partnership (LLP)</option>
                      <option value="Proprietorship">Sole Proprietorship</option>
                      <option value="Other">Other Enterprise Form</option>
                    </select>
                  </div>
                </div>

                {/* Regional Defaults */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      disabled
                      value={formData.country}
                      className="w-full px-3.5 py-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 cursor-not-allowed font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Timezone</label>
                    <input
                      type="text"
                      disabled
                      value={formData.timezone}
                      className="w-full px-3.5 py-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 cursor-not-allowed font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Currency</label>
                    <input
                      type="text"
                      disabled
                      value="INR (₹)"
                      className="w-full px-3.5 py-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Collapsible Optional Business Information */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setIsExpandOptional(!isExpandOptional)}
                  className="w-full px-4 py-3 flex items-center justify-between font-bold text-gray-700 text-xs hover:bg-gray-100 transition cursor-pointer"
                >
                  <span>Optional Tax & Registration Information (Never Fabricated)</span>
                  {isExpandOptional ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>

                {isExpandOptional && (
                  <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">GSTIN (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. 33AAACA0000F1Z0"
                          value={formData.gstin}
                          onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">PAN (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. AAACA0000F"
                          value={formData.pan}
                          onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">CIN / Reg No. (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. U72900TN2020PTC123456"
                          value={formData.cin}
                          onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              STEP 2: PRIMARY ADMINISTRATOR
             ---------------------------------------------------- */}
          {!isSubmitting && !provisionResult && step === 2 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="border-b pb-3">
                <h3 className="text-base font-bold text-gray-900">Primary administrator</h3>
                <p className="text-xs text-gray-500 mt-0.5">Create the first privileged Organization Owner for this tenant.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Dharun"
                      value={formData.admin_first_name}
                      onChange={(e) => setFormData({ ...formData, admin_first_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. B"
                      value={formData.admin_last_name}
                      onChange={(e) => setFormData({ ...formData, admin_last_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-gray-700">Work Email Address *</label>
                      {emailStatus.checking && <span className="text-[10px] text-gray-400">Validating...</span>}
                      {!emailStatus.checking && emailStatus.available === true && (
                        <span className="text-[10px] font-bold text-[#047857] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Available
                        </span>
                      )}
                      {!emailStatus.checking && emailStatus.available === false && (
                        <span className="text-[10px] font-bold text-rose-600">Existing User</span>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="e.g. dharun@joycorporate.com"
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857] font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.admin_phone}
                        onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857] text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Head of Human Resources"
                      value={formData.admin_job_title}
                      onChange={(e) => setFormData({ ...formData, admin_job_title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#047857]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Assigned Tenant Role</label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-bold flex items-center justify-between">
                      <span>Organization Owner (Primary Admin)</span>
                      <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              STEP 3: SUBSCRIPTION & CAPACITY
             ---------------------------------------------------- */}
          {!isSubmitting && !provisionResult && step === 3 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Subscription & billing</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Choose the commercial plan and capacity for this customer.</p>
                </div>

                {/* Monthly / Annual Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, billing_cycle: 'Monthly' })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer',
                      formData.billing_cycle === 'Monthly' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, billing_cycle: 'Annual' })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5',
                      formData.billing_cycle === 'Annual' ? 'bg-[#047857] text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
                    )}
                  >
                    Annual
                    <span className="text-[10px] bg-emerald-200 text-[#047857] font-bold px-1.5 py-0.2 rounded-full">Save ~17%</span>
                  </button>
                </div>
              </div>

              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {planSpecs.map((plan) => {
                  const isSelected = formData.plan_name === plan.name;
                  const price = formData.billing_cycle === 'Annual' ? plan.annual : plan.monthly;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setFormData({ ...formData, plan_name: plan.name as any, plan_id: plan.id, seats: plan.includedSeats })}
                      className={cn(
                        'p-5 rounded-2xl border-2 transition cursor-pointer space-y-4 bg-white relative flex flex-col justify-between',
                        isSelected
                          ? 'border-[#047857] shadow-md ring-1 ring-[#047857]'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-[#047857] text-white p-1 rounded-full">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">{plan.name}</span>
                        <div className="space-y-0.5">
                          <div className="text-xl font-bold text-gray-900 font-mono">
                            ₹{price.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">/{formData.billing_cycle.toLowerCase()}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2">{plan.desc}</p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 space-y-1.5 text-[11px] font-medium text-gray-600">
                        <div>Seats: <strong>{plan.includedSeats} Included</strong></div>
                        <div>Features: <strong>{plan.featureCount} capabilities</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Seats Counter & Live Price Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs">Seat Capacity</h4>
                    <p className="text-[11px] text-gray-500">Configure total headcount quota allocated to this tenant.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, seats: Math.max(10, formData.seats - 25) })}
                      className="w-9 h-9 rounded-xl bg-white border border-gray-300 text-gray-700 font-bold flex items-center justify-center text-base hover:bg-gray-100 transition cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={formData.seats}
                      onChange={(e) => setFormData({ ...formData, seats: Math.max(5, Number(e.target.value)) })}
                      className="w-24 px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono font-bold text-center text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, seats: formData.seats + 25 })}
                      className="w-9 h-9 rounded-xl bg-white border border-gray-300 text-gray-700 font-bold flex items-center justify-center text-base hover:bg-gray-100 transition cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-500 font-medium">({selectedPlanSpec.includedSeats} included by plan)</span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-gray-900 text-xs">Estimated Billing Summary</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>{formData.plan_name} Plan ({formData.billing_cycle}):</span>
                      <strong className="font-mono text-gray-900">₹{(billingOutput?.basePrice ?? billingOutput?.basePlanPrice ?? 0).toLocaleString('en-IN')}</strong>
                    </div>
                    {((billingOutput?.extraSeatsPrice ?? billingOutput?.additionalSeatsPrice ?? 0) > 0) && (
                      <div className="flex justify-between text-gray-600">
                        <span>Additional Capacity ({formData.seats - selectedPlanSpec.includedSeats} seats):</span>
                        <strong className="font-mono text-gray-900">₹{(billingOutput?.extraSeatsPrice ?? billingOutput?.additionalSeatsPrice ?? 0).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600 border-t pt-2">
                      <span>Subtotal:</span>
                      <strong className="font-mono text-gray-900">₹{(billingOutput?.subtotal ?? 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>GST / Tax (18%):</span>
                      <strong className="font-mono text-gray-900">₹{(billingOutput?.taxAmount ?? 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#047857] border-t pt-2">
                      <span>Total Estimated Invoice:</span>
                      <span className="font-mono">₹{(billingOutput?.totalAmount ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              STEP 4: FEATURES & ENTITLEMENTS
             ---------------------------------------------------- */}
          {!isSubmitting && !provisionResult && step === 4 && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Features & entitlements</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Configure capabilities provisioned to this organization.</p>
                </div>
                <span className="text-xs font-bold text-[#047857] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {formData.enabled_features.length} Features Included by {formData.plan_name} Plan
                </span>
              </div>

              {/* Categorized Features Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allFeatures.map((feat) => {
                  const isEnabled = formData.enabled_features.includes(feat.code);
                  return (
                    <div
                      key={feat.code}
                      onClick={() => {
                        setFormData((prev) => {
                          const current = [...prev.enabled_features];
                          const exists = current.includes(feat.code);
                          return {
                            ...prev,
                            enabled_features: exists ? current.filter((c) => c !== feat.code) : [...current, feat.code],
                            feature_overrides: {
                              ...prev.feature_overrides,
                              [feat.code]: !exists,
                            },
                          };
                        });
                      }}
                      className={cn(
                        'p-4 rounded-xl border transition cursor-pointer flex items-start gap-3',
                        isEnabled ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white opacity-70'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => {}} // Handled by container
                        className="mt-0.5 accent-[#047857] rounded cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-900 text-xs">{feat.name}</div>
                        <p className="text-[11px] text-gray-500">{feat.desc}</p>
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                            {feat.category}
                          </span>
                          <span className="text-[9px] font-medium text-emerald-800">
                            Min: {feat.minPlan}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------
              STEP 5: REVIEW & PROVISION
             ---------------------------------------------------- */}
          {!isSubmitting && !provisionResult && step === 5 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="border-b pb-3">
                <h3 className="text-base font-bold text-gray-900">Review & provision</h3>
                <p className="text-xs text-gray-500 mt-0.5">Verify tenant configuration and commercial terms before provisioning.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Org Card */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs text-gray-900">Organization</span>
                    <button onClick={() => setStep(1)} className="text-xs font-bold text-[#047857] hover:underline">Edit</button>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>Legal Name: <strong>{formData.legal_name}</strong></div>
                    <div>Domain: <strong className="font-mono">{formData.domain}</strong></div>
                    <div>Tenant Slug: <strong className="font-mono text-emerald-800 bg-emerald-50 px-1 rounded">{formData.slug}</strong></div>
                    <div>Type: <strong>{formData.company_type}</strong></div>
                  </div>
                </div>

                {/* Primary Admin Card */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs text-gray-900">Primary Administrator</span>
                    <button onClick={() => setStep(2)} className="text-xs font-bold text-[#047857] hover:underline">Edit</button>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>Name: <strong>{formData.admin_first_name} {formData.admin_last_name}</strong></div>
                    <div>Email: <strong className="font-mono">{formData.admin_email}</strong></div>
                    <div>Role: <strong className="text-blue-700">Organization Owner</strong></div>
                  </div>
                </div>

                {/* Subscription Card */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs text-gray-900">Subscription & Billing</span>
                    <button onClick={() => setStep(3)} className="text-xs font-bold text-[#047857] hover:underline">Edit</button>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>Plan: <strong className="text-[#047857]">{formData.plan_name}</strong></div>
                    <div>Seats: <strong>{formData.seats} Seats</strong></div>
                    <div>Interval: <strong>{formData.billing_cycle}</strong></div>
                    <div>Total Estimated: <strong className="font-mono text-gray-900">₹{(billingOutput?.totalAmount ?? 0).toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>

                {/* Features Card */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs text-gray-900">Feature Entitlements</span>
                    <button onClick={() => setStep(4)} className="text-xs font-bold text-[#047857] hover:underline">Edit</button>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>Enabled: <strong className="text-[#047857]">{formData.enabled_features.length} capabilities</strong></div>
                    <div>Custom Overrides: <strong>{Object.keys(formData.feature_overrides).length > 0 ? 'Yes' : 'None (Plan Defaults)'}</strong></div>
                  </div>
                </div>
              </div>

              {/* Pre-flight Checklist */}
              <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-2">
                <span className="text-xs font-bold text-[#047857] block">Pre-Flight Provisioning Checklist</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-gray-700">
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#047857]" /> Company & domain validated</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#047857]" /> Primary admin account ready</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#047857]" /> Plan & seat capacity confirmed</div>
                  <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#047857]" /> Audit trail ledger initialized</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            4. FOOTER CONTROLS
           ============================================================ */}
        {!provisionResult && (
          <div className="flex items-center justify-between px-8 py-4 border-t border-gray-100 bg-gray-50/70">
            <button
              type="button"
              onClick={() => {
                if (step > 1) {
                  setStep(step - 1);
                } else {
                  setShowExitConfirm(true);
                }
              }}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <div className="flex items-center gap-3">
              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={!isStepValid || isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowProvisionConfirm(true)}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  Provision Customer
                </button>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            CONFIRMATION DIALOG PROMPT
           ---------------------------------------------------- */}
        {showProvisionConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-gray-900">Provision {formData.legal_name}?</h3>
              <p className="text-xs text-gray-600">
                This will create the tenant organization, activate the {formData.plan_name} subscription ({formData.seats} seats), apply feature entitlements, and create the primary admin invitation.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowProvisionConfirm(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 font-bold text-xs hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteProvision}
                  className="px-5 py-2 rounded-xl bg-[#047857] text-white font-bold text-xs hover:bg-[#065f46]"
                >
                  Confirm & Provision
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            UNSAVED EXIT CONFIRMATION PROMPT
           ---------------------------------------------------- */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
              <h3 className="text-base font-bold text-gray-900">Exit Provisioning Wizard?</h3>
              <p className="text-xs text-gray-600">
                Your entered company and administrator details have been saved as a draft. You can resume anytime.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    platformProvisioningEngine.clearDraft();
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl text-rose-600 font-bold text-xs hover:bg-rose-50"
                >
                  Discard Draft
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  className="px-5 py-2 rounded-xl bg-[#047857] text-white font-bold text-xs hover:bg-[#065f46]"
                >
                  Save Draft & Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
