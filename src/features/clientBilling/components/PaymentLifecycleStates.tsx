// src/features/clientBilling/components/PaymentLifecycleStates.tsx
// ============================================================
// Joy PeopleHR Enterprise — Tri-State Payment Lifecycle
// Provides dedicated states for Payment Success, Pending, and Failed.
// ============================================================

import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  CreditCard, 
  ShieldCheck, 
  HelpCircle,
  Building2,
  FileText
} from 'lucide-react';

// ------------------------------------------------------------
// 1. Payment Success View
// ------------------------------------------------------------
export interface PaymentSuccessViewProps {
  companyName: string;
  planName: string;
  amountFormatted: string;
  invoiceNumber?: string;
  onStartSetup: () => void;
  onDownloadInvoice?: () => void;
}

export const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  companyName,
  planName,
  amountFormatted,
  invoiceNumber = 'INV-2026-0042',
  onStartSetup,
  onDownloadInvoice,
}) => {
  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-[#07563D] dark:text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#07563D] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-3 inline-block">
        TRANSACTION CONFIRMED
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        Welcome to Joy PeopleHR!
      </h1>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
        Your payment for the <strong className="font-semibold text-slate-800 dark:text-slate-200">{planName}</strong> plan has been processed successfully. Your enterprise tenant has been provisioned.
      </p>

      {/* Summary Card */}
      <Card className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 my-6 text-left space-y-3">
        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <span className="text-slate-500">Organization:</span>
          <span className="font-bold text-slate-900 dark:text-white">{companyName}</span>
        </div>
        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <span className="text-slate-500">Plan Tier:</span>
          <span className="font-semibold text-[#07563D] dark:text-emerald-400">{planName}</span>
        </div>
        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <span className="text-slate-500">Amount Paid:</span>
          <span className="font-bold text-slate-900 dark:text-white">{amountFormatted}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Invoice Ref:</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">{invoiceNumber}</span>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={onStartSetup} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Start Company Onboarding
        </Button>
        {onDownloadInvoice && (
          <Button size="lg" variant="outline" onClick={onDownloadInvoice} leftIcon={<FileText className="w-4 h-4" />}>
            Download Receipt
          </Button>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// 2. Payment Pending / Processing View
// ------------------------------------------------------------
export interface PaymentPendingViewProps {
  transactionId?: string;
  onRefreshStatus: () => void;
  onContactSupport?: () => void;
}

export const PaymentPendingView: React.FC<PaymentPendingViewProps> = ({
  transactionId = 'TXN-90218-PENDING',
  onRefreshStatus,
  onContactSupport,
}) => {
  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-200 dark:border-amber-800">
        <Clock className="w-9 h-9 animate-spin" />
      </div>

      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-3 inline-block">
        PAYMENT PROCESSING
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        Awaiting Gateway Confirmation
      </h1>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
        We are waiting for real-time settlement confirmation from your bank / payment provider. Please keep this tab open.
      </p>

      <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 my-6 text-xs text-amber-900 dark:text-amber-200 text-left flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">Idempotent Webhook Verification</strong>
          Your transaction (<span className="font-mono">{transactionId}</span>) is being monitored. Your tenant will automatically activate upon confirmation.
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="md" onClick={onRefreshStatus} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Check Payment Status
        </Button>
        {onContactSupport && (
          <Button size="md" variant="outline" onClick={onContactSupport}>
            Contact Support
          </Button>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// 3. Payment Failed View
// ------------------------------------------------------------
export interface PaymentFailedViewProps {
  failureReason?: string;
  onRetryPayment: () => void;
  onChangeMethod?: () => void;
  onContactSupport?: () => void;
}

export const PaymentFailedView: React.FC<PaymentFailedViewProps> = ({
  failureReason = 'Payment authorization was declined by the card issuing bank.',
  onRetryPayment,
  onChangeMethod,
  onContactSupport,
}) => {
  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-200 dark:border-rose-800">
        <AlertCircle className="w-9 h-9" />
      </div>

      <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 mb-3 inline-block">
        PAYMENT DECLINED
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        Payment Could Not Be Completed
      </h1>

      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
        Your card or payment method was not charged. Your organization workspace has not been activated.
      </p>

      {/* Failure diagnostic box */}
      <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 my-6 text-xs text-rose-900 dark:text-rose-200 text-left">
        <strong className="font-semibold block mb-1">Reason:</strong>
        <p className="leading-relaxed">{failureReason}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="md" variant="danger" onClick={onRetryPayment} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Retry Payment
        </Button>
        {onChangeMethod && (
          <Button size="md" variant="outline" onClick={onChangeMethod} leftIcon={<CreditCard className="w-4 h-4" />}>
            Use Different Card
          </Button>
        )}
        {onContactSupport && (
          <Button size="md" variant="ghost" onClick={onContactSupport}>
            Need Help?
          </Button>
        )}
      </div>
    </div>
  );
};
