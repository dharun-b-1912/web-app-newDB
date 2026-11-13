// src/features/auth/ForgotPasswordModal.tsx
// ============================================================================
// Joy PeopleHR / WorkForceOS — Multi-Channel Password & Account Recovery Modal
// Supports: (1) Registered Email / Employee ID reset link, (2) Mobile OTP reset
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import { multiMethodAuthService } from '../../services/auth/multiMethodAuthService';

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [channel, setChannel] = useState<'email' | 'mobile_otp'>('email');
  const [identifier, setIdentifier] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedDest, setMaskedDest] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  if (!isOpen) return null;

  const resetAll = () => {
    setIdentifier('');
    setChallengeId(null);
    setMaskedDest(null);
    setOtp('');
    setNewPassword('');
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!identifier.trim()) {
      setErrorMsg(
        channel === 'email'
          ? 'Please enter your registered email address or Employee ID.'
          : 'Please enter your 10-digit registered mobile number.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await multiMethodAuthService.requestPasswordRecovery({
        recoveryMethod: channel,
        identifier: identifier.trim(),
        countryCode,
      });

      if (!res.ok) {
        setErrorMsg(res.message || 'Unable to process recovery request.');
        return;
      }

      if (channel === 'mobile_otp' && res.challengeId) {
        setChallengeId(res.challengeId);
        setMaskedDest(res.maskedDestination || null);
        setCooldown(res.cooldownSeconds || 30);
      } else {
        setSuccessMsg(
          res.message ||
            'Password recovery link dispatched. Check your registered inbox.'
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to process recovery request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteOtpReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;
    setErrorMsg(null);

    if (!/^\d{6}$/.test(otp.trim())) {
      setErrorMsg('Please enter the 6-digit SMS OTP.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await multiMethodAuthService.verifyRecoveryOtpReset({
        challengeId,
        otp: otp.trim(),
        newPassword,
      });
      if (!res.ok) {
        setErrorMsg(res.message || 'Failed to update password.');
        return;
      }
      setSuccessMsg(
        res.message ||
          'Your password has been updated. You can now sign in with your new password.'
      );
      setChallengeId(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to verify OTP and update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#07563D] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Account &amp; Password Recovery
              </h3>
              <p className="text-[11px] text-gray-500">
                Email link or SMS OTP verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close recovery modal"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {successMsg ? (
            <div className="text-center py-3 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900">Recovery Complete</h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{successMsg}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 bg-[#07563D] text-white font-bold text-sm rounded-xl hover:bg-[#05402D]"
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Recovery Channel Selector */}
              {!challengeId && (
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setChannel('email');
                      resetAll();
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      channel === 'email'
                        ? 'bg-white text-[#07563D] shadow-2xs'
                        : 'text-gray-600'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email / Emp ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChannel('mobile_otp');
                      resetAll();
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      channel === 'mobile_otp'
                        ? 'bg-white text-[#07563D] shadow-2xs'
                        : 'text-gray-600'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile OTP</span>
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {!challengeId ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">
                      {channel === 'email'
                        ? 'Registered Email Address or Employee ID'
                        : 'Registered Mobile Number'}
                    </label>
                    {channel === 'mobile_otp' ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-20 px-2.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 font-semibold"
                        />
                        <input
                          type="tel"
                          inputMode="numeric"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="98765 43210"
                          className="flex-1 px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-[#07563D] outline-none"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="employee@company.com or EMP-101"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-[#07563D] outline-none"
                      />
                    )}
                  </div>

                  <p className="text-[11px] text-gray-500">
                    Need manual assistance or account unlock? Contact your organization HR Administrator.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 px-4 bg-[#07563D] text-white font-bold text-xs rounded-xl hover:bg-[#05402D] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>
                        {channel === 'mobile_otp' ? 'Send Reset OTP' : 'Send Reset Link'}
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCompleteOtpReset} className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                    Enter the 6-digit OTP sent to <strong>{maskedDest}</strong> and set your new password.
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">6-Digit OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="w-full px-3.5 py-2.5 text-center tracking-[0.35em] font-bold text-base border border-gray-200 rounded-xl focus:border-[#07563D] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 chars (A-Z, a-z, 0-9)"
                        className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-[#07563D] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {cooldown > 0 ? (
                      <span className="text-gray-500">Resend in {cooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestReset}
                        className="inline-flex items-center gap-1 font-bold text-[#07563D] hover:underline"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend OTP</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="py-2.5 px-5 bg-[#07563D] text-white font-bold text-xs rounded-xl hover:bg-[#05402D] flex items-center gap-2 disabled:opacity-50"
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Update Password</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
