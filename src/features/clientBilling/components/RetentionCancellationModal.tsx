// src/features/clientBilling/components/RetentionCancellationModal.tsx
// ============================================================
// Joy PeopleHR Enterprise — Smart Subscription Retention & Cancellation
// Treats cancellation as a retention experience with pause and downgrade offers.
// ============================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  PauseCircle, 
  TrendingDown, 
  CheckCircle2, 
  ShieldCheck, 
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export interface RetentionCancellationModalProps {
  isOpen: boolean;
  currentPlanName?: string;
  onClose: () => void;
  onConfirmCancel: (reason: string) => Promise<void>;
  onAcceptPause: (days: number) => Promise<void>;
  onAcceptDowngrade: (targetPlan: string) => Promise<void>;
}

export const RetentionCancellationModal: React.FC<RetentionCancellationModalProps> = ({
  isOpen,
  currentPlanName = 'Enterprise Pro',
  onClose,
  onConfirmCancel,
  onAcceptPause,
  onAcceptDowngrade,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedbackNote, setFeedbackNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const REASONS = [
    { id: 'EXPENSIVE', label: 'Too expensive / Budget constraints', icon: TrendingDown },
    { id: 'SEASONAL', label: 'Low usage / Temporary business pause', icon: PauseCircle },
    { id: 'MISSING_FEATURE', label: 'Missing key statutory / biometric feature', icon: HelpCircle },
    { id: 'OTHER', label: 'Other operational reasons', icon: AlertTriangle },
  ];

  const handleSelectReason = (reasonId: string) => {
    setSelectedReason(reasonId);
    setStep(2);
  };

  const handleConfirmFinalCancel = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmCancel(`${selectedReason}: ${feedbackNote}`);
      showToast('Subscription scheduled for cancellation at the end of billing cycle.');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel subscription', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async () => {
    setIsSubmitting(true);
    try {
      await onAcceptPause(30);
      showToast('Your subscription is now paused for 30 days. No fees will be charged.');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to pause subscription', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDowngrade = async () => {
    setIsSubmitting(true);
    try {
      await onAcceptDowngrade('Starter Tier');
      showToast('Plan successfully adjusted to Starter tier at 40% savings!');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to downgrade plan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="md">
      <div className="p-6">
        {/* Step 1: Why are you leaving? */}
        {step === 1 && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              We're Sorry to See You Go
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              Before you cancel your <strong className="font-semibold text-slate-800 dark:text-slate-200">{currentPlanName}</strong> subscription, please tell us the primary reason for leaving:
            </p>

            <div className="space-y-2 mt-4 text-left">
              {REASONS.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectReason(r.id)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#07563D] hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#07563D]" />
                      <span>{r.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#07563D] group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Dynamic Smart Retention Offer */}
        {step === 2 && (
          <div className="space-y-4 text-center">
            {selectedReason === 'EXPENSIVE' ? (
              // Retention Offer: Downgrade discount
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-[#07563D] dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Special Retention Offer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Save <strong>40% on your monthly bill</strong> by switching to our lightweight Starter Tier while keeping all your employees and history intact.
                </p>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 my-5 text-left text-xs space-y-2">
                  <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>Starter Tier</span>
                    <span className="text-[#07563D] dark:text-emerald-400">Save 40%</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Includes Core HR, Attendance, Leave Management, and Employee Self-Service.
                  </div>
                </div>

                <div className="space-y-2">
                  <Button size="md" className="w-full" onClick={handleDowngrade} isLoading={isSubmitting}>
                    Switch to Starter Plan & Save 40%
                  </Button>
                  <Button size="sm" variant="ghost" className="w-full text-slate-400 hover:text-rose-600" onClick={() => setStep(3)}>
                    Continue to Cancellation
                  </Button>
                </div>
              </div>
            ) : selectedReason === 'SEASONAL' ? (
              // Retention Offer: Pause Subscription
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-200">
                  <PauseCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Pause Your Subscription Instead?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  You can pause billing for <strong>30 days</strong>. All employee records, attendance logs, and tax configs will be safely preserved with zero charges.
                </p>

                <div className="space-y-2 mt-5">
                  <Button size="md" className="w-full" onClick={handlePause} isLoading={isSubmitting}>
                    Pause Subscription for 30 Days
                  </Button>
                  <Button size="sm" variant="ghost" className="w-full text-slate-400 hover:text-rose-600" onClick={() => setStep(3)}>
                    Continue to Cancellation
                  </Button>
                </div>
              </div>
            ) : (
              // Generic final step prompt
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Confirm Subscription Cancellation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Your tenant will remain active until the end of your current billing period.
                </p>
                <div className="space-y-2 mt-5">
                  <Button size="md" variant="danger" className="w-full" onClick={handleConfirmFinalCancel} isLoading={isSubmitting}>
                    Confirm Final Cancellation
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={onClose}>
                    Keep My Subscription
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Final Cancellation Confirmation */}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-2 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Final Confirmation
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              Your subscription will cancel at the end of the current billing cycle. After that, administrative access will transition to read-only archival mode.
            </p>

            <div className="space-y-2 pt-4">
              <Button size="md" variant="danger" className="w-full" onClick={handleConfirmFinalCancel} isLoading={isSubmitting}>
                Cancel Subscription
              </Button>
              <Button size="sm" variant="outline" className="w-full" onClick={onClose}>
                Keep My Plan Active
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
