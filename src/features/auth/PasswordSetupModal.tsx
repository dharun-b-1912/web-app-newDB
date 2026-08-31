// src/features/auth/PasswordSetupModal.tsx
// ============================================================
// Joy PeopleHR / WorkForceOS — Mandatory First-Login Password Setup Modal
// ============================================================

import React, { useState } from 'react';
import { Lock, ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';

export const PasswordSetupModal: React.FC = () => {
  const { updatePassword, mustChangePassword, clearMustChangePassword, user } = useAuth();
  const { showToast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!mustChangePassword || !user) return null;

  // Validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isFormValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setErrorMsg('Please ensure all password requirements are satisfied.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await updatePassword(newPassword);
      if (res.success) {
        showToast('Password updated successfully. Welcome to your workspace!', 'success');
        clearMustChangePassword();
      } else {
        setErrorMsg(res.errorMessage || 'Unable to update password. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-emerald-900 to-[#073B2A] text-white">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold">Set Your Permanent Password</h2>
          <p className="text-xs text-emerald-200/80 mt-1">
            You signed in with a temporary credential. For security, please create a new permanent password to access your workspace.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter at least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Confirm Password</label>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {/* Password Requirements Checklist */}
          <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-[11px]">
            <div className="font-bold text-gray-700 text-xs mb-1">Password Requirements:</div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-gray-300'}`} />
              <span className={hasMinLength ? 'text-gray-700 font-medium' : 'text-gray-400'}>At least 8 characters</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpperCase && hasLowerCase ? 'text-emerald-600' : 'text-gray-300'}`} />
              <span className={hasUpperCase && hasLowerCase ? 'text-gray-700 font-medium' : 'text-gray-400'}>Uppercase & lowercase letters</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-gray-300'}`} />
              <span className={hasNumber ? 'text-gray-700 font-medium' : 'text-gray-400'}>At least one number</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 ${passwordsMatch ? 'text-emerald-600' : 'text-gray-300'}`} />
              <span className={passwordsMatch ? 'text-gray-700 font-medium' : 'text-gray-400'}>Passwords match</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full bg-[#073B2A] hover:bg-[#052b1e] text-white py-2.5 rounded-xl font-bold text-xs"
          >
            {isLoading ? 'Updating Password...' : 'Save Password & Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
};
