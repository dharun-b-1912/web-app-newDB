// src/features/vendor/VendorOnboardingWizardModal.tsx
// ============================================================================
// Joy PeopleHR — Enterprise 5-Step Vendor Onboarding & Account Activation Wizard
// Company Details -> Statutory Profile -> Bank & Contacts -> Client Assignment -> Review & Activation
// Real-time duplicate checking, draft persistence, relational mapping & activation automation
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  VendorOnboardingSubmission,
  VendorCompanyStructure,
} from '../../types/vendorPortal';
import {
  VendorOnboardingService,
  OnboardingRelationalDependencies,
} from '../../services/vendor/vendorOnboardingService';
import { VendorPrivateDocumentService } from '../../services/vendor/vendorPrivateDocumentService';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  Eye,
  EyeOff,
  Sparkles,
  Send,
  Save,
  Clock,
  Check,
  RefreshCw,
} from 'lucide-react';

interface VendorOnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onComplete: (submission: VendorOnboardingSubmission) => void;
}

export const VendorOnboardingWizardModal: React.FC<VendorOnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [showMaskedAccount, setShowMaskedAccount] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string>('Saved to database just now');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sendActivationEmail, setSendActivationEmail] = useState<boolean>(true);

  // Relational dependencies
  const [dependencies, setDependencies] = useState<OnboardingRelationalDependencies | null>(null);

  const [formData, setFormData] = useState<VendorOnboardingSubmission>({
    id: `vsub_${Date.now()}`,
    organizationId: organizationId || 'org-joy-main',
    currentStep: 1,
    status: 'DRAFT',
    company: {
      legalName: '',
      tradeName: '',
      vendorCode: VendorOnboardingService.generateVendorCode('VND'),
      companyStructure: 'PRIVATE_LIMITED',
      pan: '',
      gstin: '',
      msmeNumber: '',
      registeredAddress: {
        street: '',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641004',
        country: 'India',
      },
      authorizedContact: {
        fullName: '',
        email: '',
        phone: '',
        designation: 'Managing Director',
      },
    },
    statutory: {
      esiRegistrationNumber: '',
      pfRegistrationNumber: '',
      laborLicenseNumber: '',
      migrantLabourLicenseNumber: '',
      msmeRegistrationNumber: '',
      professionalTaxNumber: '',
      isoCertificationNumber: '',
      sezLutcCopyNumber: '',
      nonPanDeclaration: false,
      nonTanDeclaration: false,
      irnDeclaration: false,
      conflictOfInterestDeclaration: false,
      statutoryExpiryDates: {
        clraExpiry: '2027-03-31',
        pfExpiry: '2028-12-31',
        esiExpiry: '2028-12-31',
      },
      statutoryDocStoragePaths: {},
    },
    banking: {
      accountHolderName: '',
      bankName: 'HDFC Bank Ltd',
      accountNumber: '',
      ifscCode: 'HDFC0001234',
      branch: 'Coimbatore Main Branch',
      authorizedContact: {
        fullName: '',
        email: '',
        phone: '',
      },
      financeBillingContact: {
        fullName: '',
        email: '',
        phone: '',
      },
      complianceContact: {
        fullName: '',
        email: '',
        phone: '',
      },
    },
    clientAssignment: {
      clientCompanyId: 'comp-arjuna-main',
      clientCompanyName: 'Arjuna Natural Pvt Ltd',
      businessUnit: 'Industrial Manpower Operations',
      siteName: 'Factory Premises — Unit 1 Plant',
      serviceCategory: 'Contract Manpower Supply',
      contractCode: 'CON-ARJUNA-MANPOWER-2026',
      masterPoNumber: 'PO-ARJUNA-2026-07-001',
      clraFormVNumber: 'CLRA/TN/2026/889',
      maxWorkforceCapacity: 150,
      serviceChargePercentage: 8.0,
      contractStartDate: '2026-04-01',
      contractEndDate: '2027-03-31',
      rateCardReference: 'STD-MANPOWER-620',
      billingConfiguration: 'MONTHLY_MUSTER_RECONCILIATION',
      workforceAllocationRules: 'DAILY_ATTENDANCE_INGESTION',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Load active draft and dependencies on open
  useEffect(() => {
    if (!isOpen) return;

    VendorOnboardingService.getOnboardingDependencies(organizationId).then((deps) => {
      setDependencies(deps);
    });

    VendorOnboardingService.getActiveDraft(organizationId).then((res) => {
      if (res.success && res.draft) {
        setFormData(res.draft);
        setStep(res.draft.currentStep || 1);
        setSaveStatus(`Draft resumed from ${new Date(res.draft.updatedAt).toLocaleTimeString()}`);
      }
    });
  }, [isOpen, organizationId]);

  // Real-time duplicate checking on PAN / GSTIN / Email change
  useEffect(() => {
    if (!formData.company.pan && !formData.company.gstin && !formData.company.authorizedContact.email) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      const dup = await VendorOnboardingService.checkDuplicateVendor({
        pan: formData.company.pan,
        gstin: formData.company.gstin,
        email: formData.company.authorizedContact.email,
        excludeSubmissionId: formData.id,
      });

      if (dup.isDuplicate) {
        setDuplicateWarning(dup.reason || 'A matching vendor record already exists.');
      } else {
        setDuplicateWarning(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.company.pan, formData.company.gstin, formData.company.authorizedContact.email]);

  // Debounced auto-save draft
  const triggerAutoSave = (updated: VendorOnboardingSubmission) => {
    setIsSaving(true);
    setSaveStatus('Saving to database...');

    VendorOnboardingService.saveDraft(updated).then((res) => {
      setIsSaving(false);
      if (res.success) {
        const time = new Date(res.savedAt).toLocaleTimeString();
        setSaveStatus(`Saved to database at ${time}`);
      } else {
        setSaveStatus('Draft save failed');
      }
    });
  };

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(docKey);
    const res = await VendorPrivateDocumentService.uploadPrivateDocument({
      organizationId: formData.organizationId,
      vendorId: formData.company.vendorCode,
      subFolder: 'company/registration',
      file,
      documentCategory: 'COMPANY_REGISTRATION',
      uploadedBy: 'Company HR Admin',
    });

    setUploadingDoc(null);
    if (res.success && res.metadata) {
      const updated = {
        ...formData,
        statutory: {
          ...formData.statutory,
          statutoryDocStoragePaths: {
            ...(formData.statutory.statutoryDocStoragePaths || {}),
            [docKey]: res.metadata.storagePath,
          },
        },
      };
      setFormData(updated);
      triggerAutoSave(updated);
    } else {
      alert(res.error || 'Upload failed');
    }
  };

  const handleNext = () => {
    const validation = VendorOnboardingService.validateStep(formData, step);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    const nextStep = Math.min(step + 1, 5);
    setStep(nextStep);

    const updated = { ...formData, currentStep: nextStep };
    setFormData(updated);
    triggerAutoSave(updated);
  };

  const handleBack = () => {
    setErrors([]);
    const prevStep = Math.max(step - 1, 1);
    setStep(prevStep);

    const updated = { ...formData, currentStep: prevStep };
    setFormData(updated);
    triggerAutoSave(updated);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveStatus('Saving draft...');
    const res = await VendorOnboardingService.saveDraft(formData);
    setIsSaving(false);
    if (res.success) {
      setSaveStatus(`Saved draft at ${new Date(res.savedAt).toLocaleTimeString()}`);
    }
  };

  const handleFinalSubmit = async (mode: 'SUBMIT_FOR_APPROVAL' | 'REGISTER_AND_ACTIVATE') => {
    setIsSubmitting(true);
    setErrors([]);

    const result = await VendorOnboardingService.registerAndActivateVendor(formData, {
      sendActivationEmail: mode === 'REGISTER_AND_ACTIVATE' ? sendActivationEmail : false,
      actorName: 'Company HR Admin',
    });

    setIsSubmitting(false);

    if (result.success && result.submission) {
      onComplete(result.submission);
      onClose();
    } else {
      setErrors([result.error || 'Failed to complete vendor onboarding.']);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl text-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-[#047857]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#047857] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Vendor Governance
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {isSaving ? (
                    <span className="text-amber-600 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">{saveStatus}</span>
                  )}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">Register &amp; Activate Manpower Vendor</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              title="Save current progress"
            >
              <Save className="w-3.5 h-3.5 text-gray-500" />
              Save Progress
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="border-b border-gray-200 bg-white px-6 py-3">
          <div className="grid grid-cols-5 gap-2 text-center text-xs font-medium">
            {[
              { num: 1, title: 'Company Details', icon: Building2 },
              { num: 2, title: 'Statutory Profile', icon: ShieldCheck },
              { num: 3, title: 'Bank & Contacts', icon: CreditCard },
              { num: 4, title: 'Client & Site', icon: MapPin },
              { num: 5, title: 'Review & Activate', icon: CheckCircle2 },
            ].map((s) => {
              const isCurrent = step === s.num;
              const isDone = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-2 rounded-xl p-2 transition-all ${
                    isCurrent
                      ? 'bg-emerald-50 text-[#047857] border border-emerald-300 font-bold shadow-xs'
                      : isDone
                      ? 'bg-emerald-50/50 text-[#047857]'
                      : 'bg-gray-50 text-gray-400 border border-transparent'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrent || isDone ? 'bg-[#047857] text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="truncate hidden md:inline">{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Duplicate Warning Alert */}
          {duplicateWarning && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-950">Duplicate Registration Detected</div>
                <p className="mt-0.5">{duplicateWarning}</p>
                <p className="mt-1 text-[11px] text-amber-700">
                  Please verify if this vendor is already active in your directory before proceeding.
                </p>
              </div>
            </div>
          )}

          {/* Validation Errors Box */}
          {errors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              <div className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Please resolve the following before continuing:
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* STEP 1: COMPANY DETAILS */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700">Legal Registered Name *</label>
                  <input
                    type="text"
                    value={formData.company.legalName}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        company: { ...formData.company, legalName: e.target.value },
                      };
                      setFormData(updated);
                    }}
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. JOY MANPOWER SERVICE"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Trade / Brand Name</label>
                  <input
                    type="text"
                    value={formData.company.tradeName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company: { ...formData.company, tradeName: e.target.value },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. Joy Manpower"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">Vendor Code *</label>
                    <span className="text-[10px] font-bold text-[#047857] bg-emerald-50 px-1.5 py-0.5 rounded">
                      Editable
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.company.vendorCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company: { ...formData.company, vendorCode: e.target.value.toUpperCase() },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. VND-1001"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-[#047857] focus:border-[#047857] focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700">Company Structure *</label>
                  <select
                    value={formData.company.companyStructure}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        company: {
                          ...formData.company,
                          companyStructure: e.target.value as VendorCompanyStructure,
                        },
                      };
                      setFormData(updated);
                      triggerAutoSave(updated);
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                  >
                    <option value="PRIVATE_LIMITED">Private Limited</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="PROPRIETORSHIP">Proprietorship</option>
                    <option value="LLP">LLP</option>
                    <option value="PUBLIC_LIMITED">Public Limited</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Company PAN *</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.company.pan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company: { ...formData.company, pan: e.target.value.toUpperCase() },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. AOAPR4773D"
                    className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:outline-none ${
                      formData.company.pan && !VendorOnboardingService.isValidPAN(formData.company.pan)
                        ? 'border-rose-300 bg-rose-50/50'
                        : 'border-gray-200 bg-white focus:border-[#047857]'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">GSTIN *</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.company.gstin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company: { ...formData.company, gstin: e.target.value.toUpperCase() },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. 33AOAPR4773D1Z2"
                    className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:outline-none ${
                      formData.company.gstin && !VendorOnboardingService.isValidGSTIN(formData.company.gstin)
                        ? 'border-rose-300 bg-rose-50/50'
                        : 'border-gray-200 bg-white focus:border-[#047857]'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">MSME / Udyam Number</label>
                  <input
                    type="text"
                    value={formData.company.msmeNumber || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company: { ...formData.company, msmeNumber: e.target.value.toUpperCase() },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="UDYAM-TN-03-0012345"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:border-[#047857] focus:outline-none"
                  />
                </div>
              </div>

              {/* Registered Address */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Registered Office Address</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[11px] text-gray-500 font-medium">Street / Building Address *</label>
                    <input
                      type="text"
                      value={formData.company.registeredAddress.street}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          company: {
                            ...formData.company,
                            registeredAddress: { ...formData.company.registeredAddress, street: e.target.value },
                          },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="No.16, Krishna Complex, Avinashi Main Road"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium">City *</label>
                    <input
                      type="text"
                      value={formData.company.registeredAddress.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          company: {
                            ...formData.company,
                            registeredAddress: { ...formData.company.registeredAddress, city: e.target.value },
                          },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="Coimbatore"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium">Pincode *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.company.registeredAddress.pincode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          company: {
                            ...formData.company,
                            registeredAddress: { ...formData.company.registeredAddress, pincode: e.target.value },
                          },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="641407"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Authorized Contact Person */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#047857]" />
                    Authorized Contact Person (Account Owner &amp; Activation Recipient)
                  </span>
                  <span className="text-[11px] text-emerald-700">Will receive single-use activation email</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-700 font-medium">Full Name *</label>
                    <input
                      type="text"
                      value={formData.company.authorizedContact.fullName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          company: {
                            ...formData.company,
                            authorizedContact: { ...formData.company.authorizedContact, fullName: e.target.value },
                          },
                          banking: {
                            ...formData.banking,
                            authorizedContact: {
                              fullName: e.target.value,
                              email: formData.company.authorizedContact.email,
                              phone: formData.company.authorizedContact.phone,
                            },
                          },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="e.g. S. Ramanathan"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-700 font-medium">Authorized Contact Email *</label>
                    <input
                      type="email"
                      value={formData.company.authorizedContact.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          company: {
                            ...formData.company,
                            authorizedContact: { ...formData.company.authorizedContact, email: e.target.value },
                          },
                          banking: {
                            ...formData.banking,
                            authorizedContact: {
                              fullName: formData.company.authorizedContact.fullName,
                              email: e.target.value,
                              phone: formData.company.authorizedContact.phone,
                            },
                          },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="ramanathan@joymanpower.com"
                      className={`mt-1 w-full rounded-xl border px-3.5 py-2 text-xs text-gray-900 focus:outline-none ${
                        formData.company.authorizedContact.email &&
                        !VendorOnboardingService.isValidEmail(formData.company.authorizedContact.email)
                          ? 'border-rose-300 bg-rose-50/50'
                          : 'border-gray-200 bg-white focus:border-[#047857]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-700 font-medium">Authorized Contact Phone *</label>
                    <input
                      type="tel"
                      value={formData.company.authorizedContact.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          company: {
                            ...formData.company,
                            authorizedContact: { ...formData.company.authorizedContact, phone: e.target.value },
                          },
                          banking: {
                            ...formData.banking,
                            authorizedContact: {
                              fullName: formData.company.authorizedContact.fullName,
                              email: formData.company.authorizedContact.email,
                              phone: e.target.value,
                            },
                          },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="+91 98765 43210"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: STATUTORY PROFILE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">ESIC Registration Code *</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      Statutory 3.25%
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.statutory.esiRegistrationNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statutory: { ...formData.statutory, esiRegistrationNumber: e.target.value },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. 56001195190001001"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:border-[#047857] focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-gray-500">Document Upload</span>
                    <label className="text-[#047857] font-semibold hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingDoc === 'esi' ? 'Uploading...' : 'Upload C-11'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'esi')}
                        disabled={uploadingDoc === 'esi'}
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">EPFO Establishment Code *</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      Statutory 13.0%
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formData.statutory.pfRegistrationNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statutory: { ...formData.statutory, pfRegistrationNumber: e.target.value },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. CB/CBE/1724259000"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:border-[#047857] focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                    <span className="text-gray-500">Document Upload</span>
                    <label className="text-[#047857] font-semibold hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingDoc === 'pf' ? 'Uploading...' : 'Upload PF Letter'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'pf')}
                        disabled={uploadingDoc === 'pf'}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700">Contract Labour Licence (CLRA)</label>
                  <input
                    type="text"
                    value={formData.statutory.laborLicenseNumber || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statutory: { ...formData.statutory, laborLicenseNumber: e.target.value },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. CLRA/TN/CBE/2026/0491"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:border-[#047857] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Migrant Labour Licence (ISMW)</label>
                  <input
                    type="text"
                    value={formData.statutory.migrantLabourLicenseNumber || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statutory: { ...formData.statutory, migrantLabourLicenseNumber: e.target.value },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. ISMW/TN/2026/012"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:border-[#047857] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Professional Tax Registration</label>
                  <input
                    type="text"
                    value={formData.statutory.professionalTaxNumber || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statutory: { ...formData.statutory, professionalTaxNumber: e.target.value },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    placeholder="e.g. PT/CBE/2026/778"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:border-[#047857] focus:outline-none"
                  />
                </div>
              </div>

              {/* Statutory Declarations Checkboxes */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-2.5">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Statutory Compliance Declarations</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.statutory.irnDeclaration || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          statutory: { ...formData.statutory, irnDeclaration: e.target.checked },
                        })
                      }
                      className="rounded text-[#047857] focus:ring-emerald-500"
                    />
                    <span>E-Invoicing IRN Exemption Declaration filed</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.statutory.conflictOfInterestDeclaration || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          statutory: { ...formData.statutory, conflictOfInterestDeclaration: e.target.checked },
                        })
                      }
                      className="rounded text-[#047857] focus:ring-emerald-500"
                    />
                    <span>Declaration of No Conflict of Interest signed</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BANK & CONTACTS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#047857]" />
                    Bank Account Mandate (Disbursement Information)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMaskedAccount(!showMaskedAccount)}
                    className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                  >
                    {showMaskedAccount ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {showMaskedAccount ? 'Reveal Account Number' : 'Mask Account Number'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700">Account Holder Legal Name *</label>
                    <input
                      type="text"
                      value={formData.banking.accountHolderName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          banking: { ...formData.banking, accountHolderName: e.target.value },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="JOY MANPOWER SERVICE"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700">Bank Name *</label>
                    <input
                      type="text"
                      value={formData.banking.bankName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          banking: { ...formData.banking, bankName: e.target.value },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="HDFC Bank Ltd"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700">Account Number *</label>
                    <input
                      type={showMaskedAccount ? 'password' : 'text'}
                      value={formData.banking.accountNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          banking: { ...formData.banking, accountNumber: e.target.value },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="e.g. 987654321098"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700">IFSC Code *</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={formData.banking.ifscCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          banking: { ...formData.banking, ifscCode: e.target.value.toUpperCase() },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="e.g. HDFC0001234"
                      className={`mt-1 w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:outline-none ${
                        formData.banking.ifscCode && !VendorOnboardingService.isValidIFSC(formData.banking.ifscCode)
                          ? 'border-rose-300 bg-rose-50/50'
                          : 'border-gray-200 bg-white focus:border-[#047857]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700">Branch Name</label>
                    <input
                      type="text"
                      value={formData.banking.branch}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          banking: { ...formData.banking, branch: e.target.value },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="Coimbatore Main Branch"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Finance & Billing Contact */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Finance / Invoicing Contact (For payment remittance advice)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-600 font-medium">Contact Name</label>
                    <input
                      type="text"
                      value={formData.banking.financeBillingContact?.fullName || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          banking: {
                            ...formData.banking,
                            financeBillingContact: {
                              fullName: e.target.value,
                              email: formData.banking.financeBillingContact?.email || '',
                              phone: formData.banking.financeBillingContact?.phone || '',
                            },
                          },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="Accounts Officer"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 font-medium">Contact Email</label>
                    <input
                      type="email"
                      value={formData.banking.financeBillingContact?.email || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          banking: {
                            ...formData.banking,
                            financeBillingContact: {
                              fullName: formData.banking.financeBillingContact?.fullName || '',
                              email: e.target.value,
                              phone: formData.banking.financeBillingContact?.phone || '',
                            },
                          },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="accounts@joymanpower.com"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 font-medium">Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.banking.financeBillingContact?.phone || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          banking: {
                            ...formData.banking,
                            financeBillingContact: {
                              fullName: formData.banking.financeBillingContact?.fullName || '',
                              email: formData.banking.financeBillingContact?.email || '',
                              phone: e.target.value,
                            },
                          },
                        })
                      }
                      onBlur={() => triggerAutoSave(formData)}
                      placeholder="+91 98765 11223"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#047857] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CLIENT & SITE MAPPING */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700">Client Legal Entity / Company *</label>
                  <select
                    value={formData.clientAssignment.clientCompanyId}
                    onChange={(e) => {
                      const selectedComp = dependencies?.clientCompanies.find((c) => c.id === e.target.value);
                      const updated = {
                        ...formData,
                        clientAssignment: {
                          ...formData.clientAssignment,
                          clientCompanyId: e.target.value,
                          clientCompanyName: selectedComp?.name || formData.clientAssignment.clientCompanyName,
                        },
                      };
                      setFormData(updated);
                      triggerAutoSave(updated);
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                  >
                    {dependencies?.clientCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.gstin})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Assigned Site / Plant Location *</label>
                  <select
                    value={formData.clientAssignment.siteName}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        clientAssignment: { ...formData.clientAssignment, siteName: e.target.value },
                      };
                      setFormData(updated);
                      triggerAutoSave(updated);
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                  >
                    {dependencies?.clientSites.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} — {s.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700">Contract / MSA Reference *</label>
                  <select
                    value={formData.clientAssignment.contractCode}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        clientAssignment: { ...formData.clientAssignment, contractCode: e.target.value },
                      };
                      setFormData(updated);
                      triggerAutoSave(updated);
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                  >
                    {dependencies?.activeContracts.map((c) => (
                      <option key={c.id} value={c.contractCode}>
                        {c.contractCode} ({c.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Associated Purchase Order (PO)</label>
                  <select
                    value={formData.clientAssignment.masterPoNumber}
                    onChange={(e) => {
                      const updated = {
                        ...formData,
                        clientAssignment: { ...formData.clientAssignment, masterPoNumber: e.target.value },
                      };
                      setFormData(updated);
                      triggerAutoSave(updated);
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                  >
                    {dependencies?.purchaseOrders.map((p) => (
                      <option key={p.id} value={p.poNumber}>
                        {p.poNumber} (Budget: ₹{p.budget.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Approved Service Charge Margin (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.clientAssignment.serviceChargePercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        clientAssignment: {
                          ...formData.clientAssignment,
                          serviceChargePercentage: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700">Max Workforce Capacity (Headcount) *</label>
                  <input
                    type="number"
                    value={formData.clientAssignment.maxWorkforceCapacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        clientAssignment: {
                          ...formData.clientAssignment,
                          maxWorkforceCapacity: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-bold text-[#047857] focus:border-[#047857] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Contract Start Date *</label>
                  <input
                    type="date"
                    value={formData.clientAssignment.contractStartDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        clientAssignment: { ...formData.clientAssignment, contractStartDate: e.target.value },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700">Contract End Date *</label>
                  <input
                    type="date"
                    value={formData.clientAssignment.contractEndDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        clientAssignment: { ...formData.clientAssignment, contractEndDate: e.target.value },
                      })
                    }
                    onBlur={() => triggerAutoSave(formData)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#047857] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & ACTIVATE */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                  Pre-Activation Review &amp; Statutory Readiness
                </h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Review the compiled vendor dossier before final registration. Once activated, the authorized contact will receive an automated invitation to set up their password and access the vendor portal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Company & Statutory */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2.5 shadow-xs">
                  <div className="text-xs font-bold uppercase text-gray-400">Legal Entity &amp; Statutory Profile</div>
                  <div className="text-base font-bold text-gray-900">{formData.company.legalName || 'N/A'}</div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>Vendor Code:</span>
                    <span className="font-mono font-bold text-[#047857]">{formData.company.vendorCode}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>Company Structure:</span>
                    <span className="font-semibold text-gray-800">{formData.company.companyStructure}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>PAN Number:</span>
                    <span className="font-mono text-gray-800">{formData.company.pan}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>GSTIN:</span>
                    <span className="font-mono text-gray-800">{formData.company.gstin}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>ESIC Code:</span>
                    <span className="font-mono text-gray-800">{formData.statutory.esiRegistrationNumber}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>EPFO Code:</span>
                    <span className="font-mono text-gray-800">{formData.statutory.pfRegistrationNumber}</span>
                  </div>
                </div>

                {/* Card 2: Bank & Client Assignment */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2.5 shadow-xs">
                  <div className="text-xs font-bold uppercase text-gray-400">Bank &amp; Client Assignment</div>
                  <div className="text-base font-bold text-gray-900">{formData.banking.bankName}</div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>Account Number:</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {VendorOnboardingService.maskAccountNumber(formData.banking.accountNumber)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>IFSC Code:</span>
                    <span className="font-mono text-gray-800">{formData.banking.ifscCode}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>Client Company:</span>
                    <span className="font-semibold text-gray-800">{formData.clientAssignment.clientCompanyName}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>Assigned Site:</span>
                    <span className="text-gray-800">{formData.clientAssignment.siteName}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>Contract &amp; PO:</span>
                    <span className="font-mono text-gray-800">
                      {formData.clientAssignment.contractCode} | {formData.clientAssignment.masterPoNumber}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 flex justify-between">
                    <span>Workforce Cap:</span>
                    <span className="font-bold text-[#047857]">{formData.clientAssignment.maxWorkforceCapacity} Workers</span>
                  </div>
                </div>
              </div>

              {/* Pre-Activation Checklist & Email Trigger Box */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Automated Account Activation Settings
                </span>

                <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-emerald-200">
                  <input
                    type="checkbox"
                    id="chk-send-email"
                    checked={sendActivationEmail}
                    onChange={(e) => setSendActivationEmail(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-[#047857] focus:ring-emerald-500"
                  />
                  <label htmlFor="chk-send-email" className="text-xs text-gray-800 cursor-pointer">
                    <span className="font-bold text-emerald-900 block">
                      Dispatch Automated Account Activation Email
                    </span>
                    <span className="text-gray-500 block mt-0.5">
                      Send a secure, single-use activation link to authorized contact{' '}
                      <strong>{formData.company.authorizedContact.email || '(No email entered)'}</strong> allowing them to set up their password and enter the Vendor Portal.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/80 px-6 py-4">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-xs"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          <div className="flex items-center gap-3">
            {step < 5 ? (
              <button
                onClick={handleNext}
                className="rounded-lg bg-[#047857] px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-xs transition-all cursor-pointer"
              >
                Continue to Step {step + 1} →
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleFinalSubmit('SUBMIT_FOR_APPROVAL')}
                  disabled={isSubmitting}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save as Pending Review
                </button>
                <button
                  onClick={() => handleFinalSubmit('REGISTER_AND_ACTIVATE')}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#047857] px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Registering...' : '✓ Register Vendor & Send Activation Email'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
