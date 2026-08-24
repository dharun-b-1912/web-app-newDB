// src/features/auth/EmployeeActivationModal.tsx
// ============================================================================
// WorkForceOS — Employee First-Time Account Activation Wizard
// Flow: Phone Number -> Verify OTP -> Create Personal Password -> Account Activated
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { employeeAuthService } from '../../services/auth/employeeAuthService';
import { useAuth } from '../../hooks/useAuth';
import {
  Phone,
  KeyRound,
  Lock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: () => void;
}

export const EmployeeActivationModal: React.FC<Props> = ({ isOpen, onClose, onActivated }) => {
  const { showToast } = useToast();
  const { login } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Dev OTP Toast listener for developer convenience
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.otp) {
        setDevOtpHint(e.detail.otp);
      }
    };
    window.addEventListener('workforce:dev:sms_received', handler);
    return () => window.removeEventListener('workforce:dev:sms_received', handler);
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  // Step 1: Submit Phone Number to Request Activation OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      showToast('Please enter your mobile phone number.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await employeeAuthService.requestActivationOtp(phone);
      setPhone(res.phone);
      setEmployeeName(res.employeeName);
      setStep(2);
      setTimerSeconds(60);
      showToast(`Verification code sent to ${res.phone}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send activation code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Validate OTP Code Format & Advance to Password Setup
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      showToast('Please enter the 6-digit verification code.', 'error');
      return;
    }
    setStep(3);
  };

  // Step 3: Set Personal Password & Finalize Account Activation
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await employeeAuthService.verifyActivationAndSetPassword(
        phone,
        otpCode,
        newPassword
      );
      setStep(4);
      showToast('Account activated successfully!', 'success');
      login(user);
    } catch (err: any) {
      showToast(err.message || 'Failed to complete activation.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    onClose();
    if (onActivated) onActivated();
  };

  const resetForm = () => {
    setStep(1);
    setPhone('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setDevOtpHint(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="First-Time Employee Account Activation"
      maxWidth="md"
    >
      <div className="p-6 space-y-6">
        {/* Progress Stepper */}
        <div className="flex items-center justify-between text-xs font-bold text-gray-400 border-b border-gray-100 pb-4">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-[#07563D]' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#07563D] flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Phone</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-[#07563D]' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#07563D] flex items-center justify-center text-[10px]">
              2
            </span>
            <span>OTP</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-[#07563D]' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#07563D] flex items-center justify-center text-[10px]">
              3
            </span>
            <span>Password</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-1.5 ${step === 4 ? 'text-[#07563D]' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#07563D] flex items-center justify-center text-[10px]">
              4
            </span>
            <span>Active</span>
          </div>
        </div>

        {/* STEP 1: Enter Phone Number */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">Enter your registered mobile number</h3>
              <p className="text-xs text-gray-500">
                WorkForceOS will send a secure one-time verification code to verify your identity.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Primary Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex rounded-xl shadow-xs overflow-hidden border border-gray-200 focus-within:ring-1 focus-within:ring-[#07563D]">
                <span className="inline-flex items-center px-3 text-xs font-bold text-gray-600 bg-gray-50 border-r border-gray-200">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  required
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-white focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full justify-center bg-[#07563D] hover:bg-[#064e37] text-white py-2.5 text-xs font-bold shadow-sm"
            >
              {isLoading ? 'Sending SMS Code...' : 'Send Verification OTP'}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>
        )}

        {/* STEP 2: Verify OTP Code */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">Verify 6-Digit Code</h3>
              <p className="text-xs text-gray-500">
                Enter the code sent to <strong className="text-gray-900">{phone}</strong> for employee{' '}
                <strong className="text-[#07563D]">{employeeName}</strong>.
              </p>
            </div>

            {devOtpHint && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                <span>
                  🧪 <strong>Dev Auto-Capture OTP:</strong>{' '}
                  <code className="font-mono font-black text-amber-950 bg-white px-1.5 py-0.5 rounded border">
                    {devOtpHint}
                  </code>
                </span>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtpHint)}
                  className="text-[11px] font-bold text-[#07563D] underline ml-2"
                >
                  Auto-fill
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                One-Time Verification Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                required
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 text-center text-lg font-mono font-black tracking-widest bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Didn't receive the SMS?</span>
              <button
                type="button"
                disabled={timerSeconds > 0 || isLoading}
                onClick={handleRequestOtp}
                className="font-bold text-[#07563D] hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {timerSeconds > 0 ? `Resend code in ${timerSeconds}s` : 'Resend OTP'}
              </button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                className="w-1/3 justify-center text-xs font-bold"
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="w-2/3 justify-center bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold shadow-sm"
              >
                Verify Code
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: Create Personal Password */}
        {step === 3 && (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">Create Personal Password</h3>
              <p className="text-xs text-gray-500">
                Choose a strong personal password to complete your account activation.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full justify-center bg-[#07563D] hover:bg-[#064e37] text-white py-2.5 text-xs font-bold shadow-sm"
            >
              {isLoading ? 'Activating Account...' : 'Set Password & Activate'}
            </Button>
          </form>
        )}

        {/* STEP 4: Activation Complete */}
        {step === 4 && (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#07563D] flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900">Welcome to WorkForceOS!</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Your employee login account has been activated. You are now securely authenticated into your organization workspace.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={handleFinish}
              className="w-full justify-center bg-[#07563D] hover:bg-[#064e37] text-white py-2.5 text-xs font-bold shadow-sm"
            >
              Go to Employee Workspace
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
