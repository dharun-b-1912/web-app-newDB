import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Building2,
  CreditCard,
  FileSignature,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import {
  VendorConstitutionType,
  MSMEStatus,
  VendorServiceCategory,
  VendorOnboardingSubmission,
} from '../../../types/vendorEcosystem';
import { VendorComplianceApplicabilityEngine } from '../../../services/vendor/vendorComplianceApplicabilityEngine';

interface VendorOnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { num: 1, label: 'Business Profile' },
  { num: 2, label: 'Tax & Identity' },
  { num: 3, label: 'MSME' },
  { num: 4, label: 'Agreement' },
  { num: 5, label: 'Compliance' },
  { num: 6, label: 'Bank & Payout' },
  { num: 7, label: 'Review & Submit' },
];

export const VendorOnboardingWizardModal: React.FC<VendorOnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Business Profile
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [vendorType, setVendorType] = useState('Contract Labour');
  const [constitutionType, setConstitutionType] = useState<VendorConstitutionType>('PRIVATE_LIMITED');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Coimbatore');
  const [state, setState] = useState('Tamil Nadu');
  const [postalCode, setPostalCode] = useState('641001');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  // Step 2: Tax & Identity
  const [pan, setPan] = useState('');
  const [isGstApplicable, setIsGstApplicable] = useState(true);
  const [gstin, setGstin] = useState('');
  const [gstExemptionReason, setGstExemptionReason] = useState('');
  const [panDocName, setPanDocName] = useState('');

  // Step 3: MSME
  const [msmeRegistered, setMsmeRegistered] = useState<MSMEStatus>('NOT_APPLICABLE');
  const [udyamNumber, setUdyamNumber] = useState('');
  const [msmeDocName, setMsmeDocName] = useState('');
  const [msmeExemptionReason, setMsmeExemptionReason] = useState('');

  // Step 4: Commercial Agreement
  const [agreementNumber, setAgreementNumber] = useState(`AGR-${Date.now().toString().slice(-4)}`);
  const [serviceCategory, setServiceCategory] = useState<VendorServiceCategory>('Contract Labour');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
  const [scopeOfWork, setScopeOfWork] = useState('Provision of Skilled Technical & Facility Staffing');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [serviceChargePercentage, setServiceChargePercentage] = useState<number>(8.5);
  const [maxCapacity, setMaxCapacity] = useState<number>(100);
  const [agreementDocName, setAgreementDocName] = useState('');

  // Step 5: Licences & Statutory Documents
  const [labourLicenceApplicable, setLabourLicenceApplicable] = useState(true);
  const [labourLicenceNumber, setLabourLicenceNumber] = useState('');
  const [licenceDocName, setLicenceDocName] = useState('');
  const [formVApplicable, setFormVApplicable] = useState(false);
  const [rcApplicable, setRcApplicable] = useState(false);
  const [rcDocName, setRcDocName] = useState('');
  const [epfApplicable, setEpfApplicable] = useState(true);
  const [epfNumber, setEpfNumber] = useState('');
  const [epfDocName, setEpfDocName] = useState('');
  const [esiApplicable, setEsiApplicable] = useState(true);
  const [esiNumber, setEsiNumber] = useState('');
  const [esiDocName, setEsiDocName] = useState('');

  // Step 6: Bank & Payment
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankBranch, setBankBranch] = useState('Main Branch');
  const [cancelledChequeName, setCancelledChequeName] = useState('');

  if (!isOpen) return null;

  // Build current submission payload for live compliance calculation
  const currentSubmission: VendorOnboardingSubmission = {
    vendor_id: `vnd_${(legalName || 'vendor').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}_${Date.now().toString(36)}`,
    business_profile: {
      legal_name: legalName,
      trade_name: tradeName || legalName,
      vendor_type: vendorType,
      constitution_type: constitutionType,
      registered_address: address,
      city,
      state,
      postal_code: postalCode,
      contact_person: contactPerson,
      email,
      mobile,
    },
    tax_details: {
      pan,
      gstin: isGstApplicable ? gstin : undefined,
      is_gst_applicable: isGstApplicable,
      gst_exemption_reason: !isGstApplicable ? gstExemptionReason : undefined,
      state,
      postal_code: postalCode,
    },
    msme_details: {
      msme_registered: msmeRegistered,
      udyam_registration_number: msmeRegistered === 'YES' ? udyamNumber : undefined,
      msme_certificate_url: msmeDocName ? `/docs/${msmeDocName}` : undefined,
      exemption_reason: msmeRegistered !== 'YES' ? msmeExemptionReason : undefined,
    },
    commercial_agreement: {
      agreement_number: agreementNumber,
      contract_start_date: startDate,
      contract_end_date: endDate,
      service_category: serviceCategory,
      contract_scope: scopeOfWork,
      rate_card_type: 'Per Head Per Month',
      billing_frequency: 'Monthly',
      payment_terms: paymentTerms,
      service_charge_percentage: serviceChargePercentage,
      max_workforce_capacity: maxCapacity,
      agreement_document_url: agreementDocName ? `/docs/${agreementDocName}` : undefined,
    },
    bank_details: {
      account_holder_name: accountHolderName || legalName,
      bank_name: bankName,
      account_number: accountNumber,
      ifsc_code: ifsc,
      bank_branch: bankBranch,
      cancelled_cheque_document_url: cancelledChequeName ? `/docs/${cancelledChequeName}` : undefined,
    },
    statutory_details: {
      epf_applicable: epfApplicable,
      epf_registration_number: epfNumber,
      epf_certificate_url: epfDocName ? `/docs/${epfDocName}` : undefined,
      esi_applicable: esiApplicable,
      esi_registration_number: esiNumber,
      esi_certificate_url: esiDocName ? `/docs/${esiDocName}` : undefined,
      labour_licence_applicable: labourLicenceApplicable,
      labour_licence_number: labourLicenceNumber,
      labour_licence_document_url: licenceDocName ? `/docs/${licenceDocName}` : undefined,
      form_v_applicable: formVApplicable,
      rc_applicable: rcApplicable,
      rc_document_url: rcDocName ? `/docs/${rcDocName}` : undefined,
    },
    uploaded_documents: [
      ...(panDocName ? [{ document_type: 'PAN_CARD', document_name: 'PAN Card', file_name: panDocName, file_url: `/docs/${panDocName}` }] : []),
      ...(gstin ? [{ document_type: 'GST_CERTIFICATE', document_name: 'GST Certificate', file_name: 'GST_Cert.pdf', file_url: '/docs/gst.pdf' }] : []),
      ...(msmeDocName ? [{ document_type: 'MSME_CERTIFICATE', document_name: 'MSME Udyam Certificate', file_name: msmeDocName, file_url: `/docs/${msmeDocName}` }] : []),
      ...(agreementDocName ? [{ document_type: 'COMMERCIAL_AGREEMENT', document_name: 'Service Agreement', file_name: agreementDocName, file_url: `/docs/${agreementDocName}` }] : []),
      ...(cancelledChequeName ? [{ document_type: 'BANK_CANCELLED_CHEQUE', document_name: 'Cancelled Cheque', file_name: cancelledChequeName, file_url: `/docs/${cancelledChequeName}` }] : []),
      ...(licenceDocName ? [{ document_type: 'LABOUR_LICENCE', document_name: 'Labour Licence', file_name: licenceDocName, file_url: `/docs/${licenceDocName}` }] : []),
      ...(epfDocName ? [{ document_type: 'EPF_REGISTRATION', document_name: 'EPF Registration', file_name: epfDocName, file_url: `/docs/${epfDocName}` }] : []),
      ...(esiDocName ? [{ document_type: 'ESI_REGISTRATION', document_name: 'ESI Registration', file_name: esiDocName, file_url: `/docs/${esiDocName}` }] : []),
      ...(rcDocName ? [{ document_type: 'VEHICLE_RC', document_name: 'Vehicle RC', file_name: rcDocName, file_url: `/docs/${rcDocName}` }] : []),
    ],
  };

  const complianceEval = VendorComplianceApplicabilityEngine.evaluateSubmission(currentSubmission);

  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (!legalName.trim() || !contactPerson.trim() || !email.trim()) {
        setErrorMessage('Please fill in mandatory fields: Legal Name, Contact Person, and Email.');
        return;
      }
    } else if (step === 2) {
      if (!pan.trim()) {
        setErrorMessage('PAN is mandatory.');
        return;
      }
      if (isGstApplicable && !gstin.trim()) {
        setErrorMessage('GSTIN is required unless GST is marked not applicable with a reason.');
        return;
      }
    }
    if (step < 7) setStep(step + 1);
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = vendorPortalService.submitVendorOnboarding(currentSubmission);
      if (!result.success) {
        setErrorMessage(result.error || 'Submission failed compliance validation.');
        setIsSubmitting(false);
        return;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#064E3B] via-[#07563D] to-[#043629] text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Vendor Lifecycle</span>
              <span>•</span>
              <span>Self-Service Onboarding</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">Vendor Onboarding & KYC Registration</h2>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Enter organizational, tax, MSME, commercial agreement, and conditional statutory compliance details.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200/70 flex items-center justify-between overflow-x-auto scrollbar-none gap-2">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-2 shrink-0 text-xs font-bold ${
                step === s.num
                  ? 'text-emerald-800'
                  : step > s.num
                  ? 'text-gray-700'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                  step === s.num
                    ? 'bg-emerald-800 text-white'
                    : step > s.num
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className="hidden sm:inline whitespace-nowrap">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Wizard Form Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* STEP 1: BUSINESS PROFILE */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-800" />
                Step 1: Business Profile & Constitution
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Vendor Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Apex Industrial Solutions Pvt Ltd"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Trade / Brand Name</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="e.g. Apex Workforce"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Entity Constitution / Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={constitutionType}
                    onChange={(e) => setConstitutionType(e.target.value as VendorConstitutionType)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                  >
                    <option value="PRIVATE_LIMITED">Private Limited (Pvt Ltd)</option>
                    <option value="PUBLIC_LIMITED">Public Limited</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="PARTNERSHIP">Partnership Firm</option>
                    <option value="PROPRIETORSHIP">Proprietorship (Single Owner)</option>
                    <option value="OTHER">Other Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Service Category</label>
                  <select
                    value={vendorType}
                    onChange={(e) => setVendorType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                  >
                    <option value="Contract Labour">Contract Labour (CLRA)</option>
                    <option value="Security">Security & Guarding</option>
                    <option value="Housekeeping">Housekeeping & Facility</option>
                    <option value="Transport">Transport & Logistics</option>
                    <option value="Canteen">Canteen & Catering</option>
                    <option value="Technical & Engineering">Technical & Engineering Staff</option>
                    <option value="Other">Other Services</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Contact Person <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. S. Ramesh"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. contact@vendor.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Registered Office Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, Industrial Estate"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TAX & IDENTITY */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-800" />
                Step 2: Tax & Statutory Identity (PAN / GST)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Permanent Account Number (PAN) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="e.g. AABCS1234K"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">PAN Card Document</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={panDocName}
                      onChange={(e) => setPanDocName(e.target.value)}
                      placeholder="PAN_Card_Signed.pdf"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setPanDocName('PAN_Card_Signed.pdf')}
                      className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" /> Attach
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Goods & Services Tax (GSTIN) Applicability</span>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!isGstApplicable}
                      onChange={(e) => setIsGstApplicable(!e.target.checked)}
                      className="rounded border-gray-300 text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>GST Not Applicable</span>
                  </label>
                </div>

                {isGstApplicable ? (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      GSTIN Registration Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      maxLength={15}
                      placeholder="e.g. 33AABCS1234K1Z5"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:outline-hidden uppercase"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Reason for GST Exemption / Non-Applicability <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={gstExemptionReason}
                      onChange={(e) => setGstExemptionReason(e.target.value)}
                      placeholder="e.g. Annual aggregate turnover below threshold (₹20 Lakhs) / Composition scheme"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: MSME */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-800" />
                Step 3: MSME / Udyam Registration Status
              </h3>

              <p className="text-xs text-gray-500">
                MSME registration is conditional. Vendors without MSME registration may proceed by marking Not Applicable.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {(['YES', 'NO', 'NOT_APPLICABLE'] as MSMEStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setMsmeRegistered(status)}
                    className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      msmeRegistered === status
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {status === 'YES' ? 'MSME Registered (Yes)' : status === 'NO' ? 'Not Registered (No)' : 'Not Applicable'}
                  </button>
                ))}
              </div>

              {msmeRegistered === 'YES' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Udyam Registration Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={udyamNumber}
                      onChange={(e) => setUdyamNumber(e.target.value)}
                      placeholder="e.g. UDYAM-TN-03-0012345"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:outline-hidden uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">MSME Certificate PDF</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={msmeDocName}
                        onChange={(e) => setMsmeDocName(e.target.value)}
                        placeholder="Udyam_Certificate.pdf"
                        className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setMsmeDocName('Udyam_Certificate.pdf')}
                        className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" /> Attach
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {msmeRegistered !== 'YES' && (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Optional Reason / Notes</label>
                  <input
                    type="text"
                    value={msmeExemptionReason}
                    onChange={(e) => setMsmeExemptionReason(e.target.value)}
                    placeholder="e.g. Not applicable / Exempted entity"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 4: COMMERCIAL AGREEMENT */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-emerald-800" />
                Step 4: Commercial Agreement & Service Level Agreement
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Agreement Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={agreementNumber}
                    onChange={(e) => setAgreementNumber(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Service Charge Margin (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={serviceChargePercentage}
                    onChange={(e) => setServiceChargePercentage(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Max Capacity (Heads)</label>
                  <input
                    type="number"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden bg-white"
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Agreement PDF Document</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={agreementDocName}
                    onChange={(e) => setAgreementDocName(e.target.value)}
                    placeholder="Executed_Agreement_Signed.pdf"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setAgreementDocName('Executed_Agreement_Signed.pdf')}
                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" /> Attach
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: LICENCES & STATUTORY COMPLIANCE */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-800" />
                Step 5: Conditional Licences & Statutory Coverage
              </h3>

              <div className="space-y-3">
                {/* Labour Licence */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">Contract Labour Licence</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        Conditional
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">Applicable to contract labour providers exceeding statutory employee thresholds.</p>
                    {labourLicenceApplicable && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <input
                          type="text"
                          value={labourLicenceNumber}
                          onChange={(e) => setLabourLicenceNumber(e.target.value)}
                          placeholder="Licence No (e.g. TN-CBE-CLA-9901)"
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setLicenceDocName('Labour_Licence.pdf')}
                          className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-bold"
                        >
                          {licenceDocName ? 'Attached ✓' : 'Upload PDF'}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={labourLicenceApplicable}
                    onChange={(e) => setLabourLicenceApplicable(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-800 mt-1 cursor-pointer"
                  />
                </div>

                {/* EPF Registration */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">EPF Registration Certificate</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                        Conditional
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">Applicable if vendor has active EPFO code for deploying workers.</p>
                    {epfApplicable && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <input
                          type="text"
                          value={epfNumber}
                          onChange={(e) => setEpfNumber(e.target.value)}
                          placeholder="EPF Code (e.g. CBCBE0012345)"
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setEpfDocName('EPF_Registration.pdf')}
                          className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-bold"
                        >
                          {epfDocName ? 'Attached ✓' : 'Upload PDF'}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={epfApplicable}
                    onChange={(e) => setEpfApplicable(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-800 mt-1 cursor-pointer"
                  />
                </div>

                {/* ESI Registration */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">ESI Registration Certificate</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                        Conditional
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">Applicable if vendor workforce is covered under ESIC scheme.</p>
                    {esiApplicable && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <input
                          type="text"
                          value={esiNumber}
                          onChange={(e) => setEsiNumber(e.target.value)}
                          placeholder="ESI Code (e.g. 51000123450000101)"
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setEsiDocName('ESI_Registration.pdf')}
                          className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-bold"
                        >
                          {esiDocName ? 'Attached ✓' : 'Upload PDF'}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={esiApplicable}
                    onChange={(e) => setEsiApplicable(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-800 mt-1 cursor-pointer"
                  />
                </div>

                {/* Vehicle RC */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">Vehicle Registration Certificate (RC)</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-800">
                        Transport Only
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">Applicable strictly to transport and fleet vendors providing vehicle logistics.</p>
                    {rcApplicable && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setRcDocName('Fleet_Vehicle_RC.pdf')}
                          className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-bold"
                        >
                          {rcDocName ? 'Attached ✓' : 'Upload Vehicle RC PDF'}
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={rcApplicable}
                    onChange={(e) => setRcApplicable(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-800 mt-1 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: BANK & PAYMENT */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-800" />
                Step 6: Bank Disbursement & Payout Mandate
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Account Holder Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder={legalName || 'Account Holder'}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Bank Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 50200088192841"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-700 focus:outline-hidden uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Cancelled Cheque / Bank Statement PDF <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cancelledChequeName}
                    onChange={(e) => setCancelledChequeName(e.target.value)}
                    placeholder="Cancelled_Cheque_Signed.pdf"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setCancelledChequeName('Cancelled_Cheque_Signed.pdf')}
                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" /> Attach
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: REVIEW & SUBMIT */}
          {step === 7 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                Step 7: Final Submission & Compliance Evaluation
              </h3>

              {/* Compliance Status Card */}
              <div
                className={`p-4 rounded-2xl border ${
                  complianceEval.isCompliant
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {complianceEval.isCompliant ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                    <div>
                      <h4 className="font-bold text-xs">
                        {complianceEval.isCompliant
                          ? 'All Applicable Requirements Satisfied'
                          : 'Compliance Incomplete'}
                      </h4>
                      <p className="text-[11px] opacity-80">
                        {complianceEval.satisfiedRequirements.length} / {complianceEval.applicableRequirements.length} applicable documents verified.
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-white/70">
                    {complianceEval.isCompliant ? '100% READY' : 'PENDING REVIEW'}
                  </span>
                </div>
              </div>

              {/* Review Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-2">
                  <span className="font-bold text-gray-900 block border-b pb-1">Legal Identity</span>
                  <div>Name: <span className="font-bold">{legalName || '—'}</span></div>
                  <div>Constitution: <span className="font-semibold">{constitutionType}</span></div>
                  <div>PAN: <span className="font-mono font-bold">{pan || '—'}</span></div>
                  <div>GST: <span className="font-mono font-bold">{isGstApplicable ? (gstin || '—') : 'Not Applicable'}</span></div>
                  <div>MSME: <span className="font-semibold">{msmeRegistered}</span></div>
                </div>

                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-2">
                  <span className="font-bold text-gray-900 block border-b pb-1">Commercials & Payout</span>
                  <div>Agreement: <span className="font-mono font-bold">{agreementNumber}</span></div>
                  <div>Period: <span className="font-semibold">{startDate} to {endDate}</span></div>
                  <div>Bank: <span className="font-semibold">{bankName}</span></div>
                  <div>Account: <span className="font-mono font-bold">{accountNumber ? `•••• •••• ${accountNumber.slice(-4)}` : '—'}</span></div>
                  <div>IFSC: <span className="font-mono font-bold">{ifsc || '—'}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-2">
            {step < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Onboarding Package'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
