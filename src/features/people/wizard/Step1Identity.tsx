import React, { useState, useEffect } from 'react';
import { PhotoUploadCard } from './PhotoUploadCard';
import { RefreshCw, CheckCircle2, AlertCircle, Mail, ShieldCheck } from 'lucide-react';
import { Employee } from '../../../types';

export interface Step1FormData {
  photo_url: string;
  employee_code: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  preferred_name: string;
  work_email: string;
  personal_email: string;
  email_type?: 'PERSONAL' | 'WORK' | 'NONE';
  phone: string;
  dob: string;
  gender: string;
}

interface Props {
  formData: Step1FormData;
  onChange: (fields: Partial<Step1FormData>) => void;
  existingEmployees?: Employee[];
  editingEmployeeId?: string;
}

export const Step1Identity: React.FC<Props> = ({
  formData,
  onChange,
  existingEmployees = [],
  editingEmployeeId,
}) => {
  const [emailType, setEmailType] = useState<'PERSONAL' | 'WORK' | 'NONE'>(
    formData.email_type || (formData.work_email ? 'WORK' : formData.personal_email ? 'PERSONAL' : 'WORK')
  );
  const [activeEmail, setActiveEmail] = useState<string>(
    formData.work_email || formData.personal_email || ''
  );
  const [emailError, setEmailError] = useState<string>('');
  const [codeError, setCodeError] = useState<string>('');

  const generateNewCode = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const newCode = `JCS-0${randomNum}`;
    onChange({ employee_code: newCode });
  };

  const otherEmployees = editingEmployeeId
    ? (existingEmployees || []).filter((e) => e.id !== editingEmployeeId)
    : (existingEmployees || []);

  const handleEmailTypeChange = (newType: 'PERSONAL' | 'WORK' | 'NONE') => {
    setEmailType(newType);
    if (newType === 'NONE') {
      setActiveEmail('');
      onChange({
        email_type: 'NONE',
        work_email: '',
        personal_email: '',
      });
      setEmailError('');
    } else if (newType === 'WORK') {
      onChange({
        email_type: 'WORK',
        work_email: activeEmail,
        personal_email: '',
      });
    } else if (newType === 'PERSONAL') {
      onChange({
        email_type: 'PERSONAL',
        personal_email: activeEmail,
        work_email: '',
      });
    }
  };

  const handleEmailValueChange = (val: string) => {
    setActiveEmail(val);
    if (emailType === 'WORK') {
      onChange({ work_email: val, personal_email: '', email_type: 'WORK' });
    } else if (emailType === 'PERSONAL') {
      onChange({ personal_email: val, work_email: '', email_type: 'PERSONAL' });
    }
  };

  // Duplicate check for Email (Optional)
  useEffect(() => {
    if (emailType === 'NONE' || !activeEmail.trim()) {
      setEmailError('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(activeEmail)) {
      setEmailError('Please enter a valid email format.');
      return;
    }

    const isDuplicate = otherEmployees.some(
      (e) =>
        e.work_email?.toLowerCase() === activeEmail.trim().toLowerCase() ||
        (e.profile as any)?.personal_email?.toLowerCase() === activeEmail.trim().toLowerCase()
    );

    if (isDuplicate) {
      setEmailError('An employee already uses this email address in this organization.');
    } else {
      setEmailError('');
    }
  }, [activeEmail, emailType, otherEmployees]);

  // Real Duplicate Check for Employee ID
  useEffect(() => {
    if (!formData.employee_code.trim()) {
      setCodeError('Employee ID is required.');
      return;
    }
    const isDuplicate = otherEmployees.some(
      (e) => e.employee_code?.toLowerCase() === formData.employee_code.trim().toLowerCase()
    );
    if (isDuplicate) {
      setCodeError('This Employee ID is already assigned.');
    } else {
      setCodeError('');
    }
  }, [formData.employee_code, otherEmployees]);

  const initials = `${formData.first_name?.[0] || 'D'}${formData.last_name?.[0] || 'B'}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-gray-900 tracking-tight">
          Employee Identity & Basic Details
        </h3>
        <p className="text-xs text-gray-500">
          Enter the official identification credentials and profile photo for the new employee.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Photo Card */}
        <div className="md:col-span-4">
          <PhotoUploadCard
            photoUrl={formData.photo_url}
            onPhotoChange={(url) => onChange({ photo_url: url })}
            initials={initials}
            employeeName={`${formData.first_name} ${formData.last_name}`.trim()}
          />
        </div>

        {/* Right Column: Identity Fields */}
        <div className="md:col-span-8 space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Anand"
                value={formData.first_name}
                onChange={(e) => onChange({ first_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Middle Name <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Kumar"
                value={formData.middle_name}
                onChange={(e) => onChange({ middle_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Viswanathan"
                value={formData.last_name}
                onChange={(e) => onChange({ last_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
              />
            </div>
          </div>

          {/* Employee ID / Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">
                  Employee ID / Login Code <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateNewCode}
                  className="text-[11px] text-[#07563D] font-bold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Auto-generate
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. JCS-0914"
                value={formData.employee_code}
                onChange={(e) => onChange({ employee_code: e.target.value })}
                className={`w-full px-3 py-2 text-xs font-mono font-bold bg-white border rounded-xl focus:outline-none ${
                  codeError
                    ? 'border-rose-300 focus:ring-1 focus:ring-rose-500'
                    : 'border-gray-200 focus:ring-1 focus:ring-[#07563D]'
                }`}
              />
              {codeError && (
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  {codeError}
                </p>
              )}
            </div>

            {/* Primary Mobile Phone */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Primary Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex rounded-xl shadow-xs overflow-hidden border border-gray-200 focus-within:ring-1 focus-within:ring-[#07563D]">
                <span className="inline-flex items-center px-2.5 text-xs font-bold text-gray-600 bg-gray-50 border-r border-gray-200">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  required
                  placeholder="98765 43210"
                  value={formData.phone}
                  onChange={(e) => onChange({ phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white focus:outline-none font-medium"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Primary channel for Mobile OTP and App access recovery</p>
            </div>
          </div>

          {/* Email Address & Email Type Selector (Flexible / Optional) */}
          <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#07563D]" />
                Email Address <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1 cursor-pointer font-medium text-gray-700">
                  <input
                    type="radio"
                    name="email_type"
                    checked={emailType === 'PERSONAL'}
                    onChange={() => handleEmailTypeChange('PERSONAL')}
                    className="text-[#07563D] focus:ring-[#07563D]"
                  />
                  Personal Email
                </label>
                <label className="flex items-center gap-1 cursor-pointer font-medium text-gray-700">
                  <input
                    type="radio"
                    name="email_type"
                    checked={emailType === 'WORK'}
                    onChange={() => handleEmailTypeChange('WORK')}
                    className="text-[#07563D] focus:ring-[#07563D]"
                  />
                  Company / Work Email
                </label>
                <label className="flex items-center gap-1 cursor-pointer font-medium text-gray-700">
                  <input
                    type="radio"
                    name="email_type"
                    checked={emailType === 'NONE'}
                    onChange={() => handleEmailTypeChange('NONE')}
                    className="text-[#07563D] focus:ring-[#07563D]"
                  />
                  No Email
                </label>
              </div>
            </div>

            {emailType !== 'NONE' ? (
              <div className="relative">
                <input
                  type="email"
                  placeholder={
                    emailType === 'WORK'
                      ? 'employee@joycorporate.com'
                      : 'employee.personal@gmail.com'
                  }
                  value={activeEmail}
                  onChange={(e) => handleEmailValueChange(e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-white border rounded-xl focus:outline-none ${
                    emailError
                      ? 'border-rose-300 focus:ring-1 focus:ring-rose-500 text-rose-900 bg-rose-50/20'
                      : activeEmail && !emailError
                      ? 'border-emerald-300 focus:ring-1 focus:ring-emerald-500'
                      : 'border-gray-200 focus:ring-1 focus:ring-[#07563D]'
                  }`}
                />
                {activeEmail && !emailError && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-2.5" />
                )}
                {emailError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {emailError}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic bg-white/80 p-2 rounded-lg border border-gray-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Employee will authenticate using <strong>Employee ID ({formData.employee_code || 'Code'})</strong> and <strong>Mobile OTP</strong>. No mailbox required.
              </p>
            )}
          </div>

          {/* Preferred Name, Date of Birth & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Preferred Name <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Anand K."
                value={formData.preferred_name}
                onChange={(e) => onChange({ preferred_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => onChange({ dob: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => onChange({ gender: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
