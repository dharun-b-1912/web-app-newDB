// src/features/auth/ForgotPasswordModal.tsx
// ============================================================================
// Joy PeopleHR / WorkForceOS — Production Password Reset Recovery Modal
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const resetState = () => {
    setEmail('');
    setIsLoading(false);
    setIsSubmitted(false);
    setMessage('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const res = await requestPasswordReset(email.trim());
      setIsSubmitted(true);
      setMessage(
        res.message ||
          'If an account exists with this email address, you will receive password reset instructions shortly.'
      );
    } catch (err: any) {
      setIsSubmitted(true);
      setMessage('If an account exists with this email address, you will receive password reset instructions shortly.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reset Password">
      <div className="space-y-4 text-xs font-sans">
        {isSubmitted ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-emerald-950 text-xs">Reset Instructions Dispatched</div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleClose} className="bg-[#073B2A] hover:bg-[#052b1e] text-white">
                Back to Sign In
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Enter your registered work email address. We will send a secure password reset link to recover your account.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Work Email</label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-[#073B2A] hover:bg-[#052b1e] text-white">
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
