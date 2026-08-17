// src/features/platform/components/tenants/AcceptInviteModal.tsx
// ============================================================
// WorkForceOS — Supabase Customer Admin Onboarding & Set Password Flow
// ============================================================

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  X,
  Sparkles,
  Building2,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { OrganizationInvitation } from '../../../../services/platform/platformAuthInvitationService';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';

export interface AcceptInviteModalProps {
  isOpen: boolean;
  invitation: OrganizationInvitation;
  onClose: () => void;
  onCompleteAuth: () => void;
}

export const AcceptInviteModal: React.FC<AcceptInviteModalProps> = ({
  isOpen,
  invitation: inv,
  onClose,
  onCompleteAuth,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enableMfa, setEnableMfa] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordValid = password.length >= 8 && password === confirmPassword;

  const handleSetupAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        onCompleteAuth();
      }, 1500);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Accept Invitation</h3>
              <p className="text-[11px] text-gray-500 font-semibold">{inv.organization_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-100 text-[#047857] rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Account Activated Successfully!</h4>
            <p className="text-xs text-gray-500">
              Welcome aboard, <strong>{inv.full_name}</strong>. Signing you into {inv.organization_name}...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSetupAccount} className="space-y-4">
            {/* Invitation Details Banner */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Invited Member:</span>
                <strong className="text-gray-900">{inv.full_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Work Email:</span>
                <strong className="text-gray-900 font-mono">{inv.email}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned Role:</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {inv.role}
                </span>
              </div>
            </div>

            {/* Set Password */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Create Secure Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Confirm Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs font-mono"
              />
            </div>

            {/* MFA Checkbox */}
            <label className="flex items-start gap-2 cursor-pointer p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <input
                type="checkbox"
                checked={enableMfa}
                onChange={(e) => setEnableMfa(e.target.checked)}
                className="mt-0.5 text-[#047857] rounded"
              />
              <div>
                <strong className="text-gray-900 block">Enable Two-Factor Authentication (MFA)</strong>
                <span className="text-[10px] text-gray-500">Recommended for administrative and payroll roles.</span>
              </div>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={!passwordValid || isSubmitting}
                className="bg-[#047857] hover:bg-[#036246] text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Activating Account...' : 'Complete & Sign In'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
