// src/components/states/UniversalStateView.tsx
// ============================================================
// Joy PeopleHR Enterprise — Universal UX State Architecture
// Provides standard, accessible, responsive production UX states.
// ============================================================

import React from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Lock, 
  RefreshCw, 
  WifiOff, 
  ArrowRight, 
  ShieldAlert, 
  FileSearch, 
  Sparkles, 
  CopyCheck, 
  ExternalLink,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { Button } from '../ui/Button';

// ------------------------------------------------------------
// 1. Universal Loading State
// ------------------------------------------------------------
export interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading data...',
  description = 'Fetching real-time records from secure cloud store.',
  className = '',
  size = 'md',
}) => {
  const spinnerSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
  const padding = size === 'sm' ? 'p-4' : size === 'lg' ? 'p-12' : 'p-8';

  return (
    <div className={`flex flex-col items-center justify-center text-center ${padding} ${className}`}>
      <div className="relative mb-4">
        <div className={`${spinnerSize} rounded-full border-2 border-emerald-100 border-t-[#07563D] animate-spin`} />
      </div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>
      )}
    </div>
  );
};

// ------------------------------------------------------------
// 2. Actionable Empty State
// ------------------------------------------------------------
export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const UniversalEmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#07563D] dark:text-emerald-400 flex items-center justify-center mb-4 shadow-xs">
        {icon || <FolderOpen className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed">{description}</p>
      
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {actionLabel && onAction && (
            <Button onClick={onAction} size="sm" leftIcon={<Sparkles className="w-4 h-4" />}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button onClick={onSecondaryAction} variant="outline" size="sm">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------
// 3. Action Error & Failure State
// ------------------------------------------------------------
export interface ActionErrorStateProps {
  title?: string;
  errorMessage: string;
  errorCode?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ActionErrorState: React.FC<ActionErrorStateProps> = ({
  title = 'Action Could Not Be Completed',
  errorMessage,
  errorCode,
  onRetry,
  onDismiss,
  className = '',
}) => {
  return (
    <div className={`bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-6 text-left ${className}`}>
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">{title}</h4>
            {errorCode && (
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/80 text-rose-800 dark:text-rose-300">
                {errorCode}
              </span>
            )}
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">{errorMessage}</p>
          
          <div className="flex items-center gap-3 mt-4">
            {onRetry && (
              <Button size="xs" variant="danger" onClick={onRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button size="xs" variant="outline" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// 4. Action Success State with Next Actions
// ------------------------------------------------------------
export interface ActionSuccessStateProps {
  title: string;
  description: string;
  summaryBadge?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  details?: Array<{ label: string; value: string }>;
  className?: string;
}

export const ActionSuccessState: React.FC<ActionSuccessStateProps> = ({
  title,
  description,
  summaryBadge,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  details,
  className = '',
}) => {
  return (
    <div className={`bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 sm:p-8 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-[#07563D] dark:text-emerald-300 flex items-center justify-center mx-auto mb-4 shadow-xs">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      
      {summaryBadge && (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/80 text-[#07563D] dark:text-emerald-300 mb-2">
          {summaryBadge}
        </span>
      )}
      
      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">{description}</p>

      {details && details.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-emerald-100 dark:border-slate-800 my-5 max-w-md mx-auto grid grid-cols-2 gap-2 text-left">
          {details.map((d, i) => (
            <div key={i} className="text-xs">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">{d.label}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{d.value}</span>
            </div>
          ))}
        </div>
      )}

      {(primaryActionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {primaryActionLabel && onPrimaryAction && (
            <Button onClick={onPrimaryAction} size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              {primaryActionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button onClick={onSecondaryAction} variant="outline" size="sm">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------
// 5. Duplicate Record / Conflict State (409 Conflict)
// ------------------------------------------------------------
export interface ConflictStateProps {
  entityType: string;
  duplicateField: string;
  duplicateValue: string;
  existingEntityId?: string;
  onViewExisting?: (id: string) => void;
  onRenameOrModify?: () => void;
  className?: string;
}

export const ConflictState: React.FC<ConflictStateProps> = ({
  entityType,
  duplicateField,
  duplicateValue,
  existingEntityId,
  onViewExisting,
  onRenameOrModify,
  className = '',
}) => {
  return (
    <div className={`bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-6 text-left ${className}`}>
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <CopyCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
            {entityType} Already Exists
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
            A {entityType.toLowerCase()} with {duplicateField} <strong className="font-semibold text-amber-950 dark:text-amber-100">"{duplicateValue}"</strong> is already registered in your organization.
          </p>

          <div className="flex items-center gap-3 mt-4">
            {existingEntityId && onViewExisting && (
              <Button size="xs" variant="primary" onClick={() => onViewExisting(existingEntityId)} rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                View Existing {entityType}
              </Button>
            )}
            {onRenameOrModify && (
              <Button size="xs" variant="outline" onClick={onRenameOrModify}>
                Modify Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------
// 6. Offline Connection State
// ------------------------------------------------------------
export interface OfflineStateProps {
  onReconnect?: () => void;
  className?: string;
}

export const OfflineState: React.FC<OfflineStateProps> = ({
  onReconnect,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-3">
        <WifiOff className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">You Are Currently Offline</h4>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        Joy PeopleHR has cached your unsaved form entries locally. Changes will automatically sync once your internet connection is restored.
      </p>
      {onReconnect && (
        <Button size="xs" variant="outline" onClick={onReconnect} className="mt-4" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Check Connection
        </Button>
      )}
    </div>
  );
};
