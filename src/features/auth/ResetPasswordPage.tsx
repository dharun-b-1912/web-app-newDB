// src/features/auth/ResetPasswordPage.tsx
// ============================================================================
// Joy PeopleHR Enterprise — Secure Password Reset & Recovery Page
// Handles /auth/reset-password via Supabase Auth Recovery Session
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export interface ResetPasswordPageProps {
  onNavigateToLogin?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigateToLogin }) => {
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(true);

  useEffect(() => {
    // Supabase Auth recovery tokens auto-establish a recovery session via hash fragments (#access_token=...&type=recovery)
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        // Wait briefly in case URL hash is being exchanged
        setTimeout(async () => {
          const { data: retryData } = await supabase.auth.getSession();
          if (!retryData?.session) {
            setHasValidSession(false);
          }
        }, 1200);
      }
    };
    checkSession();
  }, []);

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const strengthScore = Object.values(passwordChecks).filter(Boolean).length;
  const isPasswordValid = strengthScore >= 4 && passwordChecks.length;
  const doPasswordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid || !doPasswordsMatch) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setIsSuccess(true);
      showToast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Reset Failed',
        description: err.message || 'Could not update password.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#073B2A] to-[#0D9488] shadow-lg shadow-emerald-950/15 mb-3">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create New Password</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Joy PeopleHR Secure Credential Reset</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-8">
          {isSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Password Changed Successfully</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Your Joy PeopleHR account is now secured with your new password.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={handleGoToLogin}
                  className="w-full bg-[#073B2A] hover:bg-[#064E3B] text-white text-xs font-bold h-11 rounded-xl shadow-md"
                >
                  Continue to Login
                </Button>
              </div>
            </div>
          ) : !hasValidSession ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Session Expired or Invalid Link</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                  Your password recovery session has expired or the link is invalid. Please request a fresh reset link.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  onClick={handleGoToLogin}
                  className="bg-[#073B2A] hover:bg-[#064E3B] text-white px-6 text-xs font-bold"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="pl-9 pr-10 h-11 text-xs"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Checklist */}
                <div className="mt-2.5 space-y-2">
                  <div className="grid grid-cols-5 gap-1.5 h-1.5">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={cn(
                          'rounded-full transition-all duration-300',
                          strengthScore >= lvl
                            ? strengthScore <= 2
                              ? 'bg-rose-500'
                              : strengthScore <= 4
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-slate-200'
                        )}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[11px]">
                    <span className={cn('flex items-center gap-1.5', passwordChecks.length ? 'text-emerald-700 font-medium' : 'text-slate-400')}>
                      {passwordChecks.length ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-300" />}
                      8+ characters
                    </span>
                    <span className={cn('flex items-center gap-1.5', passwordChecks.upper ? 'text-emerald-700 font-medium' : 'text-slate-400')}>
                      {passwordChecks.upper ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-300" />}
                      Uppercase letter
                    </span>
                    <span className={cn('flex items-center gap-1.5', passwordChecks.lower ? 'text-emerald-700 font-medium' : 'text-slate-400')}>
                      {passwordChecks.lower ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-300" />}
                      Lowercase letter
                    </span>
                    <span className={cn('flex items-center gap-1.5', passwordChecks.number || passwordChecks.special ? 'text-emerald-700 font-medium' : 'text-slate-400')}>
                      {passwordChecks.number || passwordChecks.special ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-300" />}
                      Number or symbol
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="pl-9 h-11 text-xs"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
                {confirmPassword && !doPasswordsMatch && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">Passwords do not match.</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !isPasswordValid || !doPasswordsMatch}
                className="w-full h-11 bg-[#073B2A] hover:bg-[#064E3B] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
