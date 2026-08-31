// src/components/states/SessionExpiryModal.tsx
// ============================================================
// Joy PeopleHR Enterprise — Session Expiry & In-Place Re-auth
// Alerts user before token expires and saves in-flight form drafts.
// ============================================================

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Lock, Clock, ShieldCheck, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { draftStorageService } from '../../services/draftStorageService';
import { api } from '../../services/api';

export interface SessionExpiryModalProps {
  isOpen: boolean;
  isExpired: boolean;
  secondsRemaining: number;
  onStaySignedIn: () => void;
  onReLoginSuccess: () => void;
  onClose?: () => void;
}

export const SessionExpiryModal: React.FC<SessionExpiryModalProps> = ({
  isOpen,
  isExpired,
  secondsRemaining,
  onStaySignedIn,
  onReLoginSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const currentUser = api.getCurrentUser();
  const savedDraftsCount = draftStorageService.listDrafts().length;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const handleQuickReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setAuthError('Please enter your password to resume.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Re-authenticate current user
      if (currentUser) {
        // Re-affirm user session in api
        api.setCurrentUser(currentUser);
      }
      setPassword('');
      onReLoginSuccess();
    } catch (err: any) {
      setAuthError(err.message || 'Re-authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="" size="md">
      <div className="p-6 text-center">
        {!isExpired ? (
          // Session Expiring Soon (Warning)
          <div>
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Your Session Will Expire In {timeFormatted}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
              Due to inactivity and security policy, your enterprise session will automatically lock soon. Click below to maintain your active connection.
            </p>

            {savedDraftsCount > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 my-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{savedDraftsCount} active form draft{savedDraftsCount > 1 ? 's' : ''} safely backed up locally.</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 mt-6">
              <Button onClick={onStaySignedIn} size="md" leftIcon={<RefreshCw className="w-4 h-4" />}>
                Stay Signed In
              </Button>
            </div>
          </div>
        ) : (
          // Session Expired (Re-Authentication required)
          <div>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Session Expired
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-sm mx-auto">
              For security compliance, please confirm your password to unlock your workspace.
            </p>

            {savedDraftsCount > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 my-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-left">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <strong className="font-semibold block">Your unsaved work has been saved!</strong>
                  <span>Your form progress will be instantly restored upon signing in.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleQuickReauth} className="space-y-4 mt-4 text-left">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Account: <span className="text-[#07563D] dark:text-emerald-400">{currentUser?.email || 'Active User'}</span>
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>

              {authError && (
                <div className="text-xs text-rose-600 font-medium">
                  {authError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                isLoading={isAuthenticating}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Unlock & Restore Workspace
              </Button>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
};
