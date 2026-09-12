import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import {
  Vendor,
  VendorType,
  VendorStatus,
  VendorContract,
  VendorDocument,
} from '../../../types';
import { vendorService } from '../../../services/vendorService';
import {
  Building2,
  Users,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Save,
  Clock,
  ExternalLink,
  X,
  UploadCloud,
  Check,
  Plus,
  Trash2,
  FileCheck,
} from 'lucide-react';

const DRAFT_STORAGE_KEY = 'workforce_vendor_creation_draft';

export interface VendorCreateWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (vendor: Vendor) => void;
}

const WIZARD_STEPS = [
  { step: 1, title: 'Identity', desc: 'Legal details & type' },
  { step: 2, title: 'Contact', desc: 'Contact person & address' },
  { step: 3, title: 'Compliance', desc: 'Registration & licenses' },
  { step: 4, title: 'Agreement', desc: 'Service contract & terms' },
  { step: 5, title: 'Payment', desc: 'Bank & payout mandate' },
  { step: 6, title: 'Documents', desc: 'Licenses & proofs' },
  { step: 7, title: 'Review', desc: 'Verification & activation' },
];

export const VendorCreateWizardModal: React.FC<VendorCreateWizardModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Identity
    legal_name: '',
    trade_name: '',
    vendor_type: 'MANPOWER_PROVIDER' as VendorType,
    status: 'PENDING_VERIFICATION' as VendorStatus,
    logo_url: '',
    vendor_code_preview: 'VEN-000003',

    // Step 2: Contact & Address
    primary_contact_name: '',
    primary_contact_designation: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    alternate_phone: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    postal_code: '641001',
    country: 'India',

    // Step 3: Legal & Compliance
    registration_number: '',
    tax_id: '',
    pan: '',
    gstin: '',
    manpower_license_no: '',
    manpower_license_expiry: '',
    max_workforce_capacity: 100,
    authorized_workforce_categories: ['Contract Labour', 'Facility Operations', 'Technical Support'],

    // Step 4: Agreement
    contract_number: 'MSA-2026-VND-01',
    contract_type: 'Master Service Agreement (MSA)',
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    renewal_date: '',
    notice_period_days: 30,
    payment_terms: 'Net 30',
    currency: 'INR',

    // Step 5: Payment
    bank_name: 'HDFC Bank Ltd',
    account_name: '',
    account_number: '',
    ifsc_code: 'HDFC0001234',
    swift_code: '',
    bank_branch: 'Main Branch',
    payment_method: 'Bank Transfer',

    // Step 6: Documents
    attached_documents: [
      { type: 'Agreement', name: 'Master_Service_Agreement.pdf', status: 'VERIFIED' },
      { type: 'GST Certificate', name: 'GST_Certificate.pdf', status: 'VERIFIED' },
    ],

    notes: '',
  });

  // Restore Draft on Open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.legal_name) {
          setFormData((prev) => ({ ...prev, ...parsed }));
          showToast('Resumed previously saved vendor draft', 'info');
        }
      }
    } catch (_) {}
  }, [isOpen]);

  const updateFormData = (fields: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      showToast('Vendor draft saved successfully!', 'success');
    } catch (_) {}
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.legal_name.trim()) {
        showToast('Please enter the Vendor Legal Name', 'error');
        return false;
      }
    } else if (step === 2) {
      if (!formData.primary_contact_name.trim()) {
        showToast('Please enter the Primary Contact Person', 'error');
        return false;
      }
      if (!formData.primary_contact_email.trim() || !formData.primary_contact_email.includes('@')) {
        showToast('Please enter a valid primary contact email', 'error');
        return false;
      }
      if (!formData.primary_contact_phone.trim()) {
        showToast('Please enter the primary contact phone number', 'error');
        return false;
      }
    } else if (step === 3) {
      if (formData.vendor_type === 'MANPOWER_PROVIDER' && !formData.manpower_license_no.trim()) {
        showToast('Manpower Providers require a Labour Supply License number', 'error');
        return false;
      }
    }
    return true;
  };

  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    matchedField?: string;
    matchedValue?: string;
    existingVendor?: Vendor;
  }>({ isOpen: false });

  const checkDuplicate = (): boolean => {
    const res = vendorService.checkDuplicateVendor({
      gstin: formData.gstin,
      pan: formData.pan,
      legalName: formData.legal_name,
      registrationNumber: formData.registration_number,
    });
    if (res.isDuplicate && res.existingVendor) {
      setDuplicateModal({
        isOpen: true,
        matchedField: res.matchedField,
        matchedValue: res.matchedValue,
        existingVendor: res.existingVendor,
      });
      return true;
    }
    return false;
  };

  const handleAttachExistingRelationship = async () => {
    if (!duplicateModal.existingVendor) return;
    try {
      setIsSubmitting(true);
      const rel = await vendorService.createCompanyRelationship({
        vendorId: duplicateModal.existingVendor.id,
        companyId: 'comp-joy-coimbatore-02',
        companyName: 'JOY Coimbatore Pvt Ltd',
        siteLocation: formData.address_line1 || 'Main Facility',
        contractStartDate: formData.contract_start_date,
        contractEndDate: formData.contract_end_date,
        serviceChargePercentage: 8.5,
        paymentTerms: formData.payment_terms || 'Net 30',
        maxWorkforceCapacity: formData.max_workforce_capacity || 50,
      });
      showToast(
        `Attached ${duplicateModal.existingVendor.legal_name} to Company (Relationship ${rel.relationship_id})`,
        'success'
      );
      setDuplicateModal({ isOpen: false });
      onCreated(duplicateModal.existingVendor);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to attach relationship', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 1 || currentStep === 3) {
      if (checkDuplicate()) return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = async (activateImmediately: boolean) => {
    if (checkDuplicate()) return;
    setIsSubmitting(true);
    try {
      const maskedAcct = formData.account_number
        ? `•••• •••• ${formData.account_number.slice(-4)}`
        : '•••• •••• 1234';

      const payload: Partial<Vendor> = {
        legal_name: formData.legal_name,
        trade_name: formData.trade_name || formData.legal_name,
        vendor_type: formData.vendor_type,
        status: activateImmediately ? 'ACTIVE' : formData.status,
        registration_number: formData.registration_number,
        tax_id: formData.tax_id || formData.gstin || formData.pan,
        pan: formData.pan,
        gstin: formData.gstin,
        primary_contact_name: formData.primary_contact_name,
        primary_contact_designation: formData.primary_contact_designation,
        primary_contact_email: formData.primary_contact_email,
        primary_contact_phone: formData.primary_contact_phone,
        alternate_phone: formData.alternate_phone,
        website: formData.website,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        manpower_license_no: formData.manpower_license_no,
        manpower_license_expiry: formData.manpower_license_expiry,
        max_workforce_capacity: formData.max_workforce_capacity,
        authorized_workforce_categories: formData.authorized_workforce_categories,
        contract_start_date: formData.contract_start_date,
        contract_end_date: formData.contract_end_date,
        payment_terms: formData.payment_terms,
        currency: formData.currency,
        payment_method: formData.payment_method,
        bank_name: formData.bank_name,
        account_name: formData.account_name || formData.legal_name,
        account_number_masked: maskedAcct,
        ifsc_code: formData.ifsc_code,
        swift_code: formData.swift_code,
        bank_branch: formData.bank_branch,
        notes: formData.notes,
      };

      const created = await vendorService.createVendor(payload);

      // Create primary contract
      await vendorService.createContract({
        vendor_id: created.id,
        contract_number: formData.contract_number,
        contract_type: formData.contract_type,
        start_date: formData.contract_start_date,
        end_date: formData.contract_end_date,
        notice_period_days: formData.notice_period_days,
        payment_terms: formData.payment_terms,
        currency: formData.currency,
        status: 'ACTIVE',
      });

      // Clear draft
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      showToast(`Vendor ${created.legal_name} created successfully!`, 'success');
      onCreated(created);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create vendor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isManpower = formData.vendor_type === 'MANPOWER_PROVIDER';
  const progressPercent = Math.round(((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Vendor / Manpower Provider"
      maxWidth="5xl"
      hideHeader={true}
    >
      <div className="flex flex-col h-full max-h-[88vh] bg-white rounded-2xl overflow-hidden">
        {/* Modern Top Header Bar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#07563D] shrink-0 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-gray-900 tracking-tight">
                  Register Vendor & Workforce Partner
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#07563D] border border-emerald-200">
                  Step {currentStep} of {WIZARD_STEPS.length}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Enterprise onboarding with statutory compliance, commercial agreements, and payout setup
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSaveDraft}
              className="text-xs h-8 px-3 border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save Draft
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main 2-Column Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[520px]">
          {/* Left Column: Sidebar Stepper */}
          <div className="w-full md:w-72 bg-slate-50/80 border-b md:border-b-0 md:border-r border-gray-100 p-4 sm:p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 px-2">
                Onboarding Stages
              </p>
              {WIZARD_STEPS.map((s) => {
                const isCurrent = s.step === currentStep;
                const isPast = s.step < currentStep;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      if (s.step < currentStep || validateStep(currentStep)) {
                        setCurrentStep(s.step);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-white text-[#07563D] shadow-xs border border-emerald-300 font-bold'
                        : isPast
                        ? 'text-gray-800 hover:bg-white/80 border border-transparent font-medium'
                        : 'text-gray-400 hover:bg-gray-100/50 border border-transparent cursor-not-allowed opacity-75'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                        isCurrent
                          ? 'bg-[#07563D] text-white shadow-2xs'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs truncate ${isCurrent ? 'text-[#07563D] font-black' : isPast ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                        {s.title}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {s.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Progress Box in Sidebar */}
            <div className="pt-4 mt-4 border-t border-gray-200/60 hidden md:block">
              <div className="p-3 bg-white rounded-xl border border-gray-200/70 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Overall Completion</span>
                  <span className="text-[#07563D] font-mono">{progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#07563D] h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Current: {WIZARD_STEPS[currentStep - 1].title} ({WIZARD_STEPS[currentStep - 1].desc})
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Form Canvas & Action Bar */}
          <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-white">
            <div className="p-6 sm:p-8 space-y-6">
              {/* Step Header */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#07563D] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    Stage 0{currentStep} / 0{WIZARD_STEPS.length}
                  </span>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">
                    {WIZARD_STEPS[currentStep - 1].title} — {WIZARD_STEPS[currentStep - 1].desc}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {currentStep === 1 && 'Define legal trade entity, operational category, and master verification status.'}
                  {currentStep === 2 && 'Provide primary business coordinates, key operational liaison, and registered office.'}
                  {currentStep === 3 && 'Statutory registrations, tax identifiers, and labour supply licensing.'}
                  {currentStep === 4 && 'Master service agreement, contract duration, payment terms, and notice period.'}
                  {currentStep === 5 && 'Verified payout bank coordinates for automated invoice settlement.'}
                  {currentStep === 6 && 'Mandatory statutory proofs, agreements, and registration certificates.'}
                  {currentStep === 7 && 'Review all vendor particulars before final activation.'}
                </p>
              </div>

              {/* Step 1: Identity */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Legal Business Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ABC Workforce Solutions Pvt Ltd"
                        value={formData.legal_name}
                        onChange={(e) => updateFormData({ legal_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-bold text-gray-800"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Registered trade name as per Certificate of Incorporation</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Trade / DBA Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ABC Workforce"
                        value={formData.trade_name}
                        onChange={(e) => updateFormData({ trade_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none text-gray-800"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Operating or brand name known to site workforce</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Vendor Classification Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.vendor_type}
                        onChange={(e) => updateFormData({ vendor_type: e.target.value as VendorType })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-bold text-[#07563D]"
                      >
                        <option value="MANPOWER_PROVIDER">Manpower Provider / Labour Supply</option>
                        <option value="RECRUITMENT_AGENCY">Recruitment & Contingent Placement</option>
                        <option value="CONTRACTOR">Independent Contractor / Agency</option>
                        <option value="IT_SERVICE_PROVIDER">IT & Tech Support Vendor</option>
                        <option value="FACILITY_SERVICE_PROVIDER">Facilities & Security Agency</option>
                        <option value="CONSULTING">Professional Consulting Firm</option>
                        <option value="OTHER">Other Supplier</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Initial Operating Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => updateFormData({ status: e.target.value as VendorStatus })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-semibold text-gray-800"
                      >
                        <option value="PENDING_VERIFICATION">Pending Verification</option>
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active (Immediate Activation)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#07563D] shrink-0 mt-0.5" />
                    <div className="text-xs text-[#07563D] leading-relaxed">
                      <span className="font-bold">Enterprise Onboarding Safeguard:</span> Vendors registered in Joy PeopleHR undergo automated verification against GSTIN and MSME registries. Manpower providers can be assigned workforce deployments and roster tracking once approved.
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Contact & Address */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-600 mb-3">
                      Primary Authorized Liaison
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Primary Contact Person <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Chandran"
                          value={formData.primary_contact_name}
                          onChange={(e) => updateFormData({ primary_contact_name: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Contact Designation
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Operations Director"
                          value={formData.primary_contact_designation}
                          onChange={(e) => updateFormData({ primary_contact_designation: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Official Work Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="contracts@vendor.in"
                          value={formData.primary_contact_email}
                          onChange={(e) => updateFormData({ primary_contact_email: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="+91 98400 11223"
                          value={formData.primary_contact_phone}
                          onChange={(e) => updateFormData({ primary_contact_phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Alternate Phone
                        </label>
                        <input
                          type="text"
                          placeholder="+91 44 2233 4455"
                          value={formData.alternate_phone}
                          onChange={(e) => updateFormData({ alternate_phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Corporate Website
                        </label>
                        <input
                          type="text"
                          placeholder="https://vendor.in"
                          value={formData.website}
                          onChange={(e) => updateFormData({ website: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-600 mb-3">
                      Registered Corporate Address
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Address Line 1</label>
                        <input
                          type="text"
                          placeholder="45 Anna Salai, Industrial Estate"
                          value={formData.address_line1}
                          onChange={(e) => updateFormData({ address_line1: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">City</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => updateFormData({ city: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">State / Province</label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) => updateFormData({ state: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Postal Code</label>
                        <input
                          type="text"
                          value={formData.postal_code}
                          onChange={(e) => updateFormData({ postal_code: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Country</label>
                        <input
                          type="text"
                          value={formData.country}
                          onChange={(e) => updateFormData({ country: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Legal & Compliance */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-600 mb-3">
                      Statutory Identifiers & Tax Codes
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Registration / CIN</label>
                        <input
                          type="text"
                          placeholder="U74999TN2020PTC134567"
                          value={formData.registration_number}
                          onChange={(e) => updateFormData({ registration_number: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">GSTIN Number</label>
                        <input
                          type="text"
                          placeholder="33AABCW1234F1Z5"
                          value={formData.gstin}
                          onChange={(e) => updateFormData({ gstin: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Company PAN</label>
                        <input
                          type="text"
                          placeholder="AABCW1234F"
                          value={formData.pan}
                          onChange={(e) => updateFormData({ pan: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Manpower Specific Controls */}
                  {isManpower && (
                    <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-amber-800" />
                        <div>
                          <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                            Manpower Supply License & Statutory Capacity
                          </h4>
                          <p className="text-[11px] text-amber-700">Contract Labour Regulation and Abolition Act (CLRA) compliance</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Labour Supply License No <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ML-TN-CHN-2022-8901"
                            value={formData.manpower_license_no}
                            onChange={(e) => updateFormData({ manpower_license_no: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            License Expiry Date
                          </label>
                          <input
                            type="date"
                            value={formData.manpower_license_expiry}
                            onChange={(e) => updateFormData({ manpower_license_expiry: e.target.value })}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Max Workforce Capacity
                          </label>
                          <input
                            type="number"
                            value={formData.max_workforce_capacity}
                            onChange={(e) => updateFormData({ max_workforce_capacity: parseInt(e.target.value, 10) || 50 })}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Agreement */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Contract / MSA Reference</label>
                      <input
                        type="text"
                        value={formData.contract_number}
                        onChange={(e) => updateFormData({ contract_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Contract Type</label>
                      <select
                        value={formData.contract_type}
                        onChange={(e) => updateFormData({ contract_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-medium"
                      >
                        <option value="Master Service Agreement (MSA)">Master Service Agreement (MSA)</option>
                        <option value="Contingent Staffing Agreement">Contingent Staffing Agreement</option>
                        <option value="Statement of Work (SOW)">Statement of Work (SOW)</option>
                        <option value="Fixed Retainer Contract">Fixed Retainer Contract</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Contract Start Date</label>
                      <input
                        type="date"
                        value={formData.contract_start_date}
                        onChange={(e) => updateFormData({ contract_start_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Contract End Date</label>
                      <input
                        type="date"
                        value={formData.contract_end_date}
                        onChange={(e) => updateFormData({ contract_end_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Payment Terms</label>
                      <select
                        value={formData.payment_terms}
                        onChange={(e) => updateFormData({ payment_terms: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-medium"
                      >
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 45">Net 45 Days</option>
                        <option value="Due on Receipt">Due on Receipt</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Notice Period (Days)</label>
                      <input
                        type="number"
                        value={formData.notice_period_days}
                        onChange={(e) => updateFormData({ notice_period_days: parseInt(e.target.value, 10) || 30 })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Payment */}
              {currentStep === 5 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Disbursement Bank Name</label>
                      <input
                        type="text"
                        placeholder="HDFC Bank Ltd"
                        value={formData.bank_name}
                        onChange={(e) => updateFormData({ bank_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Account Beneficiary Name</label>
                      <input
                        type="text"
                        placeholder="ABC Workforce Solutions Pvt Ltd"
                        value={formData.account_name}
                        onChange={(e) => updateFormData({ account_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Account Number</label>
                      <input
                        type="password"
                        placeholder="Enter full account number"
                        value={formData.account_number}
                        onChange={(e) => updateFormData({ account_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="HDFC0001234"
                        value={formData.ifsc_code}
                        onChange={(e) => updateFormData({ ifsc_code: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-mono uppercase font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Bank Branch</label>
                      <input
                        type="text"
                        placeholder="Main Branch, Chennai"
                        value={formData.bank_branch}
                        onChange={(e) => updateFormData({ bank_branch: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Payout Currency</label>
                      <input
                        type="text"
                        value={formData.currency}
                        onChange={(e) => updateFormData({ currency: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-2 focus:ring-emerald-100 focus:outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Payout information is encrypted and masked on standard displays. Dual-maker validation is applied upon approval.</span>
                  </div>
                </div>
              )}

              {/* Step 6: Documents */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Review and verify statutory proofs and executed contract documents.
                  </p>

                  <div className="space-y-3">
                    {formData.attached_documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between hover:bg-white transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center shrink-0">
                            <FileCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{doc.type}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{doc.name}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center hover:border-emerald-300 transition-colors bg-white">
                    <UploadCloud className="w-7 h-7 mx-auto text-gray-400 mb-1" />
                    <p className="text-xs font-bold text-gray-700">Attach Additional Statutory Proof</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">PDF, PNG or JPG up to 10MB (Form V, RC copy, or Cancelled Cheque)</p>
                  </div>
                </div>
              )}

              {/* Step 7: Review & Activate */}
              {currentStep === 7 && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <h4 className="text-base font-black text-gray-900">{formData.legal_name || 'Vendor Name'}</h4>
                        <p className="text-gray-500 font-medium">{formData.vendor_type} · {formData.city}, {formData.state}</p>
                      </div>
                      <Badge variant="emerald">{formData.status}</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Primary Liaison</span>
                        <span className="font-bold text-gray-900 block mt-0.5">
                          {formData.primary_contact_name || 'Not specified'} ({formData.primary_contact_phone || 'N/A'})
                        </span>
                        <span className="text-gray-500 text-[11px] block">{formData.primary_contact_email || 'N/A'}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Contract Reference</span>
                        <span className="font-mono font-bold text-gray-900 block mt-0.5">{formData.contract_number}</span>
                        <span className="text-gray-500 text-[11px] block">{formData.contract_start_date} to {formData.contract_end_date}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Statutory Tax & License</span>
                        <span className="font-mono font-semibold text-gray-900 block mt-0.5">
                          GSTIN: {formData.gstin || 'Pending'} · PAN: {formData.pan || 'Pending'}
                        </span>
                        {isManpower && (
                          <span className="text-amber-700 font-mono text-[11px] block">
                            CLRA Lic: {formData.manpower_license_no || 'Pending'}
                          </span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Payout Account</span>
                        <span className="font-bold text-gray-900 block mt-0.5">{formData.bank_name}</span>
                        <span className="font-mono text-gray-500 text-[11px] block">IFSC: {formData.ifsc_code} · {formData.payment_terms}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#07563D] shrink-0" />
                    <p className="text-xs text-[#07563D] leading-snug">
                      Ready to register. Submitting will create the vendor record and establish active contract parameters in Joy PeopleHR.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Navigation Footer */}
            <div className="px-6 sm:px-8 py-4 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between sticky bottom-0 z-10 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                leftIcon={<Save className="w-3.5 h-3.5" />}
                className="text-xs border-gray-200 text-gray-700 hover:bg-white"
              >
                Save Draft
              </Button>

              <div className="flex items-center gap-3">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                    className="text-xs border-gray-200 text-gray-700 hover:bg-white"
                  >
                    Back
                  </Button>
                )}

                {currentStep < 7 ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleNext}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="text-xs font-bold bg-[#07563D] hover:bg-[#05432f] text-white px-5 shadow-xs"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleFinalSubmit(true)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    className="text-xs font-bold bg-[#07563D] hover:bg-[#05432f] text-white px-5 shadow-xs"
                  >
                    {isSubmitting ? 'Registering...' : 'Register & Activate Vendor'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Vendor Protection Dialog */}
      {duplicateModal.isOpen && duplicateModal.existingVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">Vendor Already Exists</h3>
                <p className="text-xs text-gray-500 mt-1">
                  A registered Vendor Master matching{' '}
                  <strong className="text-gray-800">{duplicateModal.matchedField}</strong> (
                  <span className="font-mono text-amber-700 font-bold">{duplicateModal.matchedValue}</span>) is already
                  present in the Joy PeopleHR ecosystem.
                </p>

                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                  <div className="font-semibold text-gray-900 text-sm">
                    {duplicateModal.existingVendor.legal_name}
                  </div>
                  <div className="text-gray-500 flex items-center gap-2">
                    <span>Code: <strong>{duplicateModal.existingVendor.vendor_code}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className="text-emerald-700">{duplicateModal.existingVendor.status}</strong></span>
                  </div>
                  <div className="text-gray-500 text-[11px]">
                    City: {duplicateModal.existingVendor.city || 'Coimbatore'} • Contact: {duplicateModal.existingVendor.primary_contact_name}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-[11px] text-indigo-900">
                  💡 <strong>Best Practice:</strong> To avoid creating duplicate vendor masters across sibling companies,
                  attach your company commercial relationship to this existing vendor.
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDuplicateModal({ isOpen: false })}
                    className="w-full sm:w-auto text-xs"
                  >
                    Cancel / Review Form
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={handleAttachExistingRelationship}
                    className="w-full sm:w-auto text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Use Existing Vendor & Create Relationship
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
