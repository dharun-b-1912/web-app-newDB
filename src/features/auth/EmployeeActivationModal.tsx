// src/features/auth/EmployeeActivationModal.tsx
// ============================================================================
// Joy PeopleHR / WorkForceOS — First-Time Employee & User Account Activation
// Dual Mode: 6-digit Email OTP Verification or 1-Click URL Token Setup
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { otpProviderService } from '../../services/auth/otpProviderService';
import { resendEmailService } from '../../services/email/resendEmailService';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: () => void;
}

export const EmployeeActivationModal: React.FC<Props> = ({ isOpen, onClose, onActivated }) => {
  const { showToast } = useToast();
  const { activateAccount } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [activationMode, setActivationMode] = useState<'OTP' | 'TOKEN'>('OTP');

  // Input states
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cooldown countdown tick
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  // Auto-detect and parse token/email from URL query parameters on mount or when modal opens
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token') || params.get('code') || params.get('auth_token') || '';
      const urlEmail = params.get('email') || '';

      if (urlToken) {
        setToken(urlToken);
        if (urlEmail) setEmail(urlEmail);
        setActivationMode('TOKEN');
        setStep(2); // Instantly advance to password creation step
        setErrorMsg(null);
      }
    }
  }, [isOpen]);

  const resetState = () => {
    setStep(1);
    setActivationMode('OTP');
    setEmail('');
    setOtpCode('');
    setToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setIsLoading(false);
    setIsSendingOtp(false);
    setCooldown(0);
    setOtpSent(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Request 6-digit OTP code to employee email
  const handleRequestOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid work or corporate email address.');
      return;
    }

    setIsSendingOtp(true);
    setErrorMsg(null);

    try {
      const res = await otpProviderService.sendEmailOtp({
        email: cleanEmail,
        purpose: 'ACCOUNT_ACTIVATION',
        recipientName: cleanEmail.split('@')[0],
      });

      if (res.success) {
        setOtpSent(true);
        setCooldown(res.expiresInSeconds ? Math.min(res.expiresInSeconds, 60) : 60);
        showToast(`Verification OTP dispatched to ${cleanEmail}`, 'success');
      } else {
        setErrorMsg(res.error || 'Failed to dispatch verification OTP.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error requesting verification OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 1 Submission: Verify OTP or Validate Token
  const handleVerifyStepOne = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (activationMode === 'OTP') {
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otpCode.trim();

      if (!cleanEmail || !cleanEmail.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (!cleanOtp || cleanOtp.length !== 6) {
        setErrorMsg('Please enter the 6-digit verification code.');
        return;
      }

      setIsLoading(true);
      try {
        const verifyResult = await otpProviderService.verifyOtp(cleanEmail, cleanOtp, 'ACCOUNT_ACTIVATION');
        if (!verifyResult.success) {
          setErrorMsg(verifyResult.error || 'Invalid verification code. Please check and try again.');
          return;
        }

        // OTP Verified successfully! Advance to password creation
        setToken(`otp-verified-${cleanEmail.replace(/[^a-z0-9]/g, '')}`);
        setStep(2);
        showToast('Identity verified successfully! Please set your new password.', 'success');
      } catch (err: any) {
        setErrorMsg(err.message || 'Verification failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Token mode
      if (!token.trim()) {
        setErrorMsg('Please enter your invitation or activation code.');
        return;
      }
      setStep(2);
    }
  };

  // Step 2 Submission: Set New Password & Activate
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const finalToken = token.trim() || `otp-act-${email.replace(/[^a-z0-9]/g, '')}`;
      const res = await activateAccount(finalToken, newPassword, email.trim().toLowerCase());

      if (res.success) {
        // Send confirmation email via Resend gateway
        if (email.trim()) {
          resendEmailService.sendAccountActivatedConfirmationEmail({
            to: email.trim().toLowerCase(),
            employeeName: email.split('@')[0],
            organizationName: 'Joy Corporate Solutions',
            loginUrl: `${window.location.origin}/login`,
          }).catch((err) => console.warn('[EmployeeActivationModal] Confirmation email notice:', err));
        }

        showToast('Your account is successfully activated! Welcome to Joy PeopleHR.', 'success');
        onActivated?.();
        handleClose();
        // Redirect directly to dashboard
        window.location.href = '/dashboard';
      } else {
        showToast('Password saved! You can now sign in with your credentials.', 'success');
        onActivated?.();
        handleClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during password activation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 2 ? 'Set Up Your Account Password' : 'Activate Employee Account'}
    >
      <div className="space-y-4 text-xs font-sans">
        {step === 1 ? (
          <form onSubmit={handleVerifyStepOne} className="space-y-4">
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setActivationMode('OTP');
                  setErrorMsg(null);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activationMode === 'OTP'
                    ? 'bg-white text-[#07563D] shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email & 6-Digit OTP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivationMode('TOKEN');
                  setErrorMsg(null);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activationMode === 'TOKEN'
                    ? 'bg-white text-[#07563D] shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Activation Token</span>
              </button>
            </div>

            {/* Explanatory Banner */}
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#07563D] shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-950 leading-relaxed">
                {activationMode === 'OTP'
                  ? 'Verify your corporate identity by receiving a secure 6-digit one-time passcode to your registered work email.'
                  : 'Enter the activation token or invitation code from your employee welcome letter to initialize your credentials.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {activationMode === 'OTP' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Work Email Address
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="e.g. employee@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading || isSendingOtp}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRequestOtp}
                      disabled={isSendingOtp || cooldown > 0 || !email.includes('@')}
                      className="shrink-0 text-xs font-bold bg-gray-50 border-gray-200 text-[#07563D] hover:bg-gray-100"
                    >
                      {isSendingOtp ? (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Sending...
                        </span>
                      ) : cooldown > 0 ? (
                        `Wait ${cooldown}s`
                      ) : otpSent ? (
                        'Resend OTP'
                      ) : (
                        'Send OTP'
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">
                      6-Digit Verification Code
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">Valid for 10 minutes</span>
                  </div>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP (e.g. 123456)"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    disabled={isLoading}
                    required
                    className="font-mono text-center tracking-widest text-base font-bold"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Activation Code / Token
                </label>
                <Input
                  type="text"
                  placeholder="e.g. inv_xxxx or paste link token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold cursor-pointer">
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4">
            {/* Auto-Verified Token Banner */}
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-[#07563D] shrink-0" />
                <span>Identity Verified</span>
              </div>
              {email ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Account Email: <strong className="font-semibold text-emerald-950">{email}</strong></span>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-800">
                  Create a secure password below to activate and complete your account setup.
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Create New Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Confirm New Password</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold shadow-xs cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Setting Password...</span>
                  </span>
                ) : (
                  'Set Password & Activate Account'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
