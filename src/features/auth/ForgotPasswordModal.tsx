// src/features/auth/ForgotPasswordModal.tsx
// ============================================================================
// Joy PeopleHR — Production Employee Password Recovery (Phone OTP Flow)
// Flow: Enter Registered Phone -> OTP -> Create New Password -> Sessions Revoked
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { employeeAuthService } from '../../services/auth/employeeAuthService';
import { useToast } from '../../components/ui/Toast';
import { CheckCircle, Phone, Lock, KeyRound, ArrowRight, RotateCcw } from 'lucide-react';

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.otp) {
        setDevOtpHint(e.detail.otp);
      }
    };
    window.addEventListener('workforce:dev:sms_received', handler);
    return () => window.removeEventListener('workforce:dev:sms_received', handler);
  }, []);

  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      showToast('Please enter your registered phone number.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await employeeAuthService.requestPasswordResetOtp(phone);
      setPhone(res.phone);
      setStep(2);
      setTimerSeconds(60);
      showToast(`Password reset code dispatched to ${res.phone}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to request reset code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      showToast('Please enter the 6-digit verification code.', 'error');
      return;
    }
    setStep(3);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await employeeAuthService.resetPasswordWithOtp(phone, otpCode, newPassword);
      showToast(res.message, 'success');
      handleClose();
    } catch (err: any) {
      showToast(err.message || 'Password reset failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setPhone('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setDevOtpHint(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset Employee Password"
      maxWidth="md"
    >
      <div className="p-6 space-y-6">
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">Enter Registered Mobile Number</h3>
              <p className="text-xs text-gray-500">
                Joy PeopleHR will send a secure password reset OTP code to your registered mobile number.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Registered Phone <span className="text-rose-500">*</span>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose} className="text-xs font-bold">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold shadow-sm"
              >
                {isLoading ? 'Sending SMS...' : 'Send Reset Code'}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">Enter Verification Code</h3>
              <p className="text-xs text-gray-500">
                Enter the 6-digit password reset code sent to <strong className="text-gray-900">{phone}</strong>.
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
                6-Digit OTP <span className="text-rose-500">*</span>
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
              <button
                type="button"
                disabled={timerSeconds > 0 || isLoading}
                onClick={handleRequestOtp}
                className="font-bold text-[#07563D] hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {timerSeconds > 0 ? `Resend in ${timerSeconds}s` : 'Resend Code'}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} className="text-xs font-bold">
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold shadow-sm"
              >
                Verify Code
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">Set New Password</h3>
              <p className="text-xs text-gray-500">
                Choose a strong new password. Any other active device sessions will be revoked.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
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

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
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
              {isLoading ? 'Updating Password...' : 'Reset Password & Invalidate Other Sessions'}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  );
};
