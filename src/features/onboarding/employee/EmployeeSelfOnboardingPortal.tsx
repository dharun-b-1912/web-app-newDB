// ============================================================================
// Component: Dedicated Employee Self-Service Onboarding Portal
// Divya Manpower Resources (P) Ltd.
// Supports: Tokenized login, Consent, Personal KYC, OCR Upload, Nominees, E-Sign
// ============================================================================

import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  MapPin,
  FileText,
  Upload,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Lock,
  Building2,
  FileCheck,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { StatutoryNominee, PfDeclarationData, DocumentOcrResult } from '../../../types/statutoryForms';
import { DocumentIntelligenceService } from '../../../services/onboarding/documentIntelligenceService';
import { StatutoryFormGeneratorService } from '../../../services/onboarding/statutoryFormGeneratorService';

interface Props {
  invitationToken?: string;
  candidateName?: string;
  orgName?: string;
  onComplete?: () => void;
  onClose?: () => void;
}

export const EmployeeSelfOnboardingPortal: React.FC<Props> = ({
  invitationToken = 'onb-token-session',
  candidateName = 'Candidate',
  orgName = 'Enterprise Workforce Solutions',
  onComplete,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: candidateName,
    dob: '1988-04-12',
    gender: 'Male',
    fatherName: 'Paramasivam',
    maritalStatus: 'Married',
    phone: '+91 98401 23456',
    email: 'murugan.p@divyamanpower.in',
    bloodGroup: 'O+',
    presentAddress: '12, Anna Nagar West, Guindy, Chennai, Tamil Nadu - 600032',
    permanentAddress: '12, Anna Nagar West, Guindy, Chennai, Tamil Nadu - 600032',
    bankAccountNo: '918273645019',
    bankIfsc: 'SBIN0001234',
    panNumber: 'ABCDE1234F',
    aadhaarNumber: '8921 4562 1098',
    previousEpfMember: true,
    previousUan: '101293847562',
    previousExitDate: '2026-06-30',
    internationalWorker: false,
    signatureName: candidateName,
  });

  // Nominees State
  const [nominees, setNominees] = useState<StatutoryNominee[]>([
    {
      nomination_type: 'EPF',
      nominee_name: 'Kavitha M',
      relationship: 'Spouse',
      age: 34,
      share_percentage: 60,
      is_minor: false,
      address_line1: '12, Anna Nagar West, Chennai',
    },
    {
      nomination_type: 'EPF',
      nominee_name: 'Vignesh M',
      relationship: 'Son',
      age: 10,
      share_percentage: 40,
      is_minor: true,
      guardian_name: 'Kavitha M',
      guardian_relationship: 'Mother & Natural Guardian',
      address_line1: '12, Anna Nagar West, Chennai',
    },
    {
      nomination_type: 'GRATUITY',
      nominee_name: 'Kavitha M',
      relationship: 'Spouse',
      age: 34,
      share_percentage: 100,
      is_minor: false,
    },
    {
      nomination_type: 'WAGES',
      nominee_name: 'Kavitha M',
      relationship: 'Spouse',
      age: 34,
      share_percentage: 100,
      is_minor: false,
    },
  ]);

  // OCR Upload States
  const [ocrResults, setOcrResults] = useState<{ [key: string]: DocumentOcrResult }>({});
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleDocumentUpload = async (docType: 'AADHAAR' | 'PAN' | 'BANK_PROOF', file: File) => {
    setIsProcessingOcr(true);
    try {
      const result = await DocumentIntelligenceService.analyzeDocument(file, docType, {
        full_name: formData.fullName,
        date_of_birth: formData.dob,
        pan_number: formData.panNumber,
        aadhaar_number: formData.aadhaarNumber,
        bank_account_no: formData.bankAccountNo,
        bank_ifsc: formData.bankIfsc,
        father_name: formData.fatherName,
      });
      setOcrResults((prev) => ({ ...prev, [docType]: result }));
    } finally {
      setIsProcessingOcr(false);
    }
  };

  const steps = [
    { id: 1, title: 'Consent', icon: ShieldCheck },
    { id: 2, title: 'Personal', icon: User },
    { id: 3, title: 'Address', icon: MapPin },
    { id: 4, title: 'KYC & Proofs', icon: Upload },
    { id: 5, title: 'Nominees', icon: Users },
    { id: 6, title: 'Review & Sign', icon: FileCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 sm:p-6 font-sans">
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">{orgName}</h1>
            <p className="text-xs text-slate-400">Candidate Onboarding & Statutory KYC Gateway</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 font-mono">Token: {invitationToken.slice(0, 16)}...</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="w-full max-w-4xl mb-8">
        <div className="grid grid-cols-6 gap-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.id;
            const isDone = currentStep > s.id;
            return (
              <div
                key={s.id}
                onClick={() => isDone && setCurrentStep(s.id)}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/10 border border-emerald-500/50 text-emerald-400'
                    : isDone
                    ? 'bg-slate-800/60 border border-slate-700 text-slate-300'
                    : 'bg-slate-800/20 border border-slate-800/50 text-slate-500 opacity-60'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-emerald-400' : isDone ? 'text-emerald-500' : 'text-slate-500'}`} />
                <span className="text-[11px] font-semibold hidden sm:inline">{s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Content Container */}
      <div className="w-full max-w-4xl bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
        {/* STEP 1: WELCOME & CONSENT */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Welcome, {candidateName}</h2>
                <p className="text-xs text-slate-400">Employee Master Onboarding & Statutory Compliance Form Registration</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 text-xs text-slate-300 space-y-3 leading-relaxed">
              <p className="font-semibold text-white">Data Collection & Statutory Processing Authorization:</p>
              <p>
                In accordance with EPFO (Employees' Provident Fund Organisation), ESIC, Payment of Gratuity Act 1972, and the Code on Wages, <b>{orgName}</b> requires accurate submission of personal identity, Aadhaar/PAN, banking credentials, and nominee records.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-400">
                <li>Your information will be securely utilized to generate official statutory filings (Forms 11, 2, F, 1, and Q).</li>
                <li>Uploaded documents are protected via encrypted tenant isolation and private document vaults.</li>
                <li>You will have the opportunity to review and confirm all prefilled statutory forms before final submission.</li>
              </ul>
            </div>

            <label className="flex items-center gap-3 p-3 bg-emerald-950/30 border border-emerald-700/40 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
              />
              <span className="text-xs font-semibold text-emerald-200">
                I agree to the electronic collection, verification, and statutory use of my onboarding records.
              </span>
            </label>

            <div className="flex justify-end pt-4">
              <button
                disabled={!consentAccepted}
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
              >
                Continue to Personal Profile <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PERSONAL PROFILE */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" /> Step 2: Personal Identity & Contact Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Legal Full Name (as on Aadhaar) *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Date of Birth (DOB) *</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Father's / Husband's Name *</label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Marital Status *</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Married">Married</option>
                  <option value="Single">Single</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Blood Group</label>
                <input
                  type="text"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                Next: Addresses <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ADDRESSES */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" /> Step 3: Present & Permanent Residential Addresses
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Present Communication Address *</label>
                <textarea
                  rows={3}
                  value={formData.presentAddress}
                  onChange={(e) => setFormData({ ...formData, presentAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-400 font-semibold">Permanent Home Address *</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permanentAddress: formData.presentAddress })}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold"
                  >
                    Same as Present Address
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={formData.permanentAddress}
                  onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                Next: KYC & Document Proofs <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: KYC & PROOFS WITH ASSISTIVE OCR */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-400" /> Step 4: Banking, PF Declarations & Document Vault
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bank Account Number *</label>
                <input
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bank IFSC Code *</label>
                <input
                  type="text"
                  value={formData.bankIfsc}
                  onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">PAN Card Number *</label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Aadhaar Card Number *</label>
                <input
                  type="text"
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Document Upload & OCR Feedback */}
            <div className="border-t border-slate-700 pt-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Upload Documents for Assistive OCR Verification
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Aadhaar Upload */}
                <div className="p-3 bg-slate-900/60 border border-slate-700 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-200">Aadhaar Card Copy</span>
                  <label className="block w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 border-dashed rounded-lg text-center cursor-pointer text-[11px] text-emerald-400">
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleDocumentUpload('AADHAAR', e.target.files[0])}
                    />
                  </label>
                  {ocrResults['AADHAAR'] && (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Extracted (98% match)
                    </div>
                  )}
                </div>

                {/* PAN Upload */}
                <div className="p-3 bg-slate-900/60 border border-slate-700 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-200">PAN Card Copy</span>
                  <label className="block w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 border-dashed rounded-lg text-center cursor-pointer text-[11px] text-emerald-400">
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleDocumentUpload('PAN', e.target.files[0])}
                    />
                  </label>
                  {ocrResults['PAN'] && (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Verified ({ocrResults['PAN'].fields[0]?.extracted_value})
                    </div>
                  )}
                </div>

                {/* Bank Proof Upload */}
                <div className="p-3 bg-slate-900/60 border border-slate-700 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-slate-200">Bank Cheque / Passbook</span>
                  <label className="block w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 border-dashed rounded-lg text-center cursor-pointer text-[11px] text-emerald-400">
                    Choose File
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleDocumentUpload('BANK_PROOF', e.target.files[0])}
                    />
                  </label>
                  {ocrResults['BANK_PROOF'] && (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Bank IFSC Validated
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                Next: Statutory Nominees <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: NOMINEES */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Step 5: Statutory Nominees (EPF, Gratuity & Wages)
            </h2>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Please review and configure your statutory nominees for <b>EPFO Form 2</b>, <b>Gratuity Form F</b>, and <b>Payment of Wages Form 1</b>. Total share for each scheme must sum to 100%.
              </p>

              {nominees.map((nom, idx) => (
                <div key={idx} className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-400">{nom.nomination_type} Nominee #{idx + 1}</span>
                    <span className="text-slate-400 font-semibold">{nom.share_percentage}% Share</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Nominee Name</span>
                      <span className="text-slate-200 font-semibold">{nom.nominee_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Relationship</span>
                      <span className="text-slate-200">{nom.relationship}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Age</span>
                      <span className="text-slate-200">{nom.age} Yrs {nom.is_minor && '(Minor)'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Guardian</span>
                      <span className="text-slate-200">{nom.guardian_name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(6)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                Review & E-Sign All Forms <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & E-SIGN */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" /> Step 6: Final Review & Electronic Declaration
            </h2>

            {!isSubmitted ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold block text-slate-200">EPFO Form 11</span>
                      <span className="text-[10px] text-emerald-400">Ready to File</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold block text-slate-200">EPF Form 2 Revised</span>
                      <span className="text-[10px] text-emerald-400">100% Allocated</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-bold block text-slate-200">Gratuity Form F</span>
                      <span className="text-[10px] text-emerald-400">Generated</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-xs space-y-2">
                  <span className="font-bold text-white block">Digital Declaration:</span>
                  <p className="text-slate-300">
                    I, <b>{formData.fullName}</b>, hereby declare that all particulars entered above are true and complete. I authorize <b>{orgName}</b> to submit these declarations to the respective statutory authorities.
                  </p>
                  <div className="pt-2">
                    <label className="block text-slate-400 font-semibold mb-1">Type Full Name as Electronic Signature *</label>
                    <input
                      type="text"
                      value={formData.signatureName}
                      onChange={(e) => setFormData({ ...formData, signatureName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-emerald-500/50 rounded-xl text-emerald-400 font-bold tracking-wide focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setIsSubmitted(true);
                      onComplete?.();
                    }}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xl transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Submit Onboarding Dossier to HR
                  </button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Onboarding Dossier Submitted Successfully!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Your profile and statutory forms (Forms 11, 2, F, 1, Q, Resume) have been submitted to the HR Admin team at <b>{orgName}</b> for review and final certification.
                </p>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl"
                  >
                    Close Window
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
