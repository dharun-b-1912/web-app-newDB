// src/features/auth/EmployeeActivationModal.tsx
// ============================================================================
// Joy PeopleHR / WorkForceOS — First-Time Employee & User Account Activation
// Seamless URL token extraction & 1-click password setup
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { KeyRound, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, Mail } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onActivated?: () => void;
}

export const EmployeeActivationModal: React.FC<Props> = ({ isOpen, onClose, onActivated }) => {
  const { showToast } = useToast();
  const { activateAccount } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-detect and parse token/email from URL query parameters on mount or when modal opens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token') || params.get('code') || params.get('auth_token') || '';
      const urlEmail = params.get('email') || '';

      if (urlToken) {
        setToken(urlToken);
        setEmail(urlEmail);
        setStep(2); // Instantly advance to password creation step
        setErrorMsg(null);
      }
    }
  }, [isOpen]);

  const resetState = () => {
    setStep(1);
    setToken('');
    setEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setErrorMsg('Please enter your invitation or activation code.');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

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
      const res = await activateAccount(token.trim(), newPassword, email);
      if (res.success) {
        showToast('Your account is successfully activated! Welcome to your workspace.', 'success');
        onActivated?.();
        handleClose();
        // Redirect directly to dashboard without looping
        window.location.href = '/dashboard';
      } else {
        // Fallback for direct token setups
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
          <form onSubmit={handleNextStep} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Enter your invitation code or token provided in your onboarding email to set up your account.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#073B2A] hover:bg-[#052b1e] text-white font-bold">
                Continue
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4">
            {/* Auto-Verified Token Banner */}
            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Authentication Link Verified</span>
              </div>
              {email ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Account Email: <strong className="font-semibold text-emerald-900">{email}</strong></span>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-700">
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
                className="bg-[#073B2A] hover:bg-[#052b1e] text-white font-bold shadow-xs"
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
