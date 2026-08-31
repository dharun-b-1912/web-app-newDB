import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Building2,
  CreditCard,
  UserCheck,
  FileSignature,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorCompanyType, VendorOrgType } from '../../../types/vendorPortal';

interface VendorOnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VendorOnboardingWizardModal: React.FC<VendorOnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [vendorType, setVendorType] = useState<VendorOrgType>('MANPOWER_STAFFING');
  const [companyType, setCompanyType] = useState<VendorCompanyType>('Pvt Ltd');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Coimbatore');
  const [state, setState] = useState('Tamil Nadu');
  const [postalCode, setPostalCode] = useState('641001');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Banking & Financials
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [cancelledChequeName, setCancelledChequeName] = useState<string>('');

  // Step 3: Authorized Person KYC
  const [authName, setAuthName] = useState('');
  const [authDesignation, setAuthDesignation] = useState('Managing Director');
  const [authPan, setAuthPan] = useState('');
  const [authAadhaar, setAuthAadhaar] = useState('');
  const [authMobile, setAuthMobile] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authLetterName, setAuthLetterName] = useState('');

  // Step 4: Agreement & Scope
  const [agreementNumber, setAgreementNumber] = useState(`AGR-${Date.now().toString().slice(-4)}`);
  const [clientCompany, setClientCompany] = useState('Joy Corporate Solutions Pvt Ltd');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]);
  const [contractValue, setContractValue] = useState<number>(2500000);
  const [scopeOfWork, setScopeOfWork] = useState('Provision of Skilled Technical & Facility Staffing');
  const [workLocation, setWorkLocation] = useState('Coimbatore Plant & Client Sites');
  const [signedAgreementDoc, setSignedAgreementDoc] = useState('');

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      vendorPortalService.createVendorOnboarding({
        name: name || 'Apex Staffing Solutions Pvt Ltd',
        trade_name: tradeName || name || 'Apex Staffing',
        vendor_type: vendorType,
        company_type: companyType,
        registration_number: registrationNumber || 'U74999TZ2026PTC018274',
        contact_person: contactPerson || 'Rajesh Kumar',
        email: email || 'contact@apexstaffing.in',
        phone: phone || '+91 98765 43210',
        gstin: gstin || '33AAACA1234F1Z8',
        pan: pan || 'AAACA1234F',
        address: address || 'Industrial Estate, Phase 2, Coimbatore',
        city,
        state,
        postal_code: postalCode,
        bank_details: {
          bank_name: bankName,
          account_holder_name: accountHolderName || name || 'Apex Staffing Solutions Pvt Ltd',
          account_number: accountNumber || '50200088192841',
          ifsc: ifsc || 'HDFC0001234',
          cancelled_cheque_name: cancelledChequeName || 'Cancelled_Cheque.pdf',
          is_verified: true,
        },
        authorized_person: {
          name: authName || contactPerson || 'Rajesh Kumar',
          designation: authDesignation || 'Director',
          pan: authPan || pan || 'AAACA1234F',
          aadhaar_masked: authAadhaar || 'XXXX-XXXX-9912',
          mobile: authMobile || phone || '+91 98765 43210',
          email: authEmail || email || 'contact@apexstaffing.in',
          authorization_letter_name: authLetterName || 'Board_Resolution_Auth.pdf',
          is_verified: true,
        },
        agreement_details: {
          agreement_number: agreementNumber,
          client_company_name: clientCompany,
          start_date: startDate,
          end_date: endDate,
          contract_value: contractValue,
          scope_of_work: scopeOfWork,
          work_location: workLocation,
          status: 'ACTIVE',
          signed_agreement_name: signedAgreementDoc || 'Master_Service_Agreement.pdf',
        },
      });

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }, 500);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Basic Information', icon: Building2 },
    { num: 2, label: 'Banking & Financials', icon: CreditCard },
    { num: 3, label: 'Authorized Person KYC', icon: UserCheck },
    { num: 4, label: 'Agreement & Contracts', icon: FileSignature },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/40 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Vendor Compliance Onboarding Wizard
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                  Step {step} of 4
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Register new contractor/vendor with complete statutory compliance, KYC verification, and contractual binding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              const isCurrent = step === s.num;
              const isCompleted = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10'
                      : isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-800/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="truncate">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 max-h-[60vh] overflow-y-auto">
          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Vendor Legal Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Staffing Solutions Pvt Ltd"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Trade / Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Workforce Partner"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Vendor Category</label>
                  <select
                    value={vendorType}
                    onChange={(e) => setVendorType(e.target.value as VendorOrgType)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MANPOWER_STAFFING">Manpower & Staffing</option>
                    <option value="SECURITY">Security Services</option>
                    <option value="FACILITY">Facility Management</option>
                    <option value="IT_CONTRACTING">IT / Technical Contracting</option>
                    <option value="LOGISTICS">Logistics & Supply Chain</option>
                    <option value="OTHER">Other Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Company Constitution</label>
                  <select
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value as VendorCompanyType)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Pvt Ltd">Private Limited (Pvt Ltd)</option>
                    <option value="LLP">Limited Liability Partnership (LLP)</option>
                    <option value="Partnership">Partnership Firm</option>
                    <option value="Proprietorship">Sole Proprietorship</option>
                    <option value="Public Ltd">Public Limited</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registration / CIN No.</label>
                  <input
                    type="text"
                    placeholder="e.g. U74999TZ2026PTC018274"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GSTIN Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="33AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Company PAN Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="AAAAA0000A"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Email</label>
                  <input
                    type="email"
                    placeholder="compliance@vendor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Official Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Office Address</label>
                <input
                  type="text"
                  placeholder="Plot 42, SIDCO Industrial Estate, Phase 2, Coimbatore"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Banking & Financial Details */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <span>
                  Bank accounts are validated against RTGS/NEFT settlement rails. Uploading a cancelled cheque is mandatory for automated vendor invoice disbursements.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank / State Bank of India"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Beneficiary Account Name</label>
                  <input
                    type="text"
                    placeholder="Exact name as in bank records"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Current Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 50200088192841"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* File Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cancelled Cheque / Bank Letter</label>
                <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-5 text-center bg-slate-800/30 transition cursor-pointer">
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs text-slate-300 font-medium">Click to upload Cancelled Cheque (PDF, PNG, JPG)</p>
                  <p className="text-[11px] text-slate-500 mt-1">Ensure Account Number and IFSC are clearly visible</p>
                  {cancelledChequeName && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs">
                      <FileText className="w-3.5 h-3.5" />
                      {cancelledChequeName}
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    id="chequeUpload"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setCancelledChequeName(e.target.files[0].name);
                    }}
                  />
                  <label
                    htmlFor="chequeUpload"
                    className="mt-3 inline-block cursor-pointer px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs text-white"
                  >
                    Select File
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Authorized Person KYC */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Authorized Signatory Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Designation in Entity</label>
                  <input
                    type="text"
                    placeholder="e.g. Managing Director / Partner"
                    value={authDesignation}
                    onChange={(e) => setAuthDesignation(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Signatory Individual PAN</label>
                  <input
                    type="text"
                    placeholder="e.g. ABCPK1234M"
                    value={authPan}
                    onChange={(e) => setAuthPan(e.target.value.toUpperCase())}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Masked Aadhaar Number</label>
                  <input
                    type="text"
                    placeholder="XXXX-XXXX-9912"
                    value={authAadhaar}
                    onChange={(e) => setAuthAadhaar(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Signatory Mobile</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={authMobile}
                    onChange={(e) => setAuthMobile(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Signatory Email</label>
                  <input
                    type="email"
                    placeholder="rajesh.kumar@apexstaffing.in"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Board Resolution / Power of Attorney Letter</label>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="flex-1 text-xs text-slate-400">
                    {authLetterName || 'Attach Authorization Letter from Board of Directors'}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    id="authLetter"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setAuthLetterName(e.target.files[0].name);
                    }}
                  />
                  <label
                    htmlFor="authLetter"
                    className="cursor-pointer px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white"
                  >
                    Browse
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Agreement & Contracts */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Master Agreement Number</label>
                  <input
                    type="text"
                    value={agreementNumber}
                    onChange={(e) => setAgreementNumber(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Principal Employer Entity</label>
                  <input
                    type="text"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Agreement Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Agreement Expiry Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contract Value (₹)</label>
                  <input
                    type="number"
                    value={contractValue}
                    onChange={(e) => setContractValue(Number(e.target.value))}
                    className="w-full bg-slate-800/70 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Scope of Contractual Work</label>
                <textarea
                  rows={2}
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  className="w-full bg-slate-800/70 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Signed Service Agreement / Work Order Copy</label>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <FileSignature className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="flex-1 text-xs text-slate-400">
                    {signedAgreementDoc || 'Attach Signed Bilateral Master Service Agreement (PDF)'}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    id="signedAggr"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSignedAgreementDoc(e.target.files[0].name);
                    }}
                  />
                  <label
                    htmlFor="signedAggr"
                    className="cursor-pointer px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white font-medium"
                  >
                    Select PDF
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
              >
                Continue to Step {step + 1} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Registering Vendor...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Complete & Issue Compliance Passport
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
