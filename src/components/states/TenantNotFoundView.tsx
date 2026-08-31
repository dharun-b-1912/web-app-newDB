// src/components/states/TenantNotFoundView.tsx
// ============================================================
// Joy PeopleHR Enterprise — Multi-Tenant Safe 404 State
// Protects tenant isolation boundaries by returning safe 404s for cross-tenant probes.
// ============================================================

import React from 'react';
import { FileSearch, ArrowLeft, ShieldCheck, Home } from 'lucide-react';
import { Button } from '../ui/Button';

export interface TenantNotFoundViewProps {
  title?: string;
  description?: string;
  onNavigateHome?: () => void;
  className?: string;
}

export const TenantNotFoundView: React.FC<TenantNotFoundViewProps> = ({
  title = 'Resource Not Found',
  description = "The requested resource could not be found or you do not have permission to view it within your active tenant workspace.",
  onNavigateHome,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[480px] p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-8 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-5 border border-slate-200 dark:border-slate-700 shadow-xs">
        <FileSearch className="w-8 h-8" />
      </div>

      <div className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 mb-2">
        HTTP 404
      </div>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h2>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-2 leading-relaxed">
        {description}
      </p>

      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 my-6 border border-slate-200 dark:border-slate-700 text-left flex items-start gap-3 w-full">
        <ShieldCheck className="w-5 h-5 text-[#07563D] dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          <strong className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">Tenant Boundary Isolation</strong>
          All records, URLs, and employee profiles are isolated strictly to your licensed organization.
        </div>
      </div>

      {onNavigateHome && (
        <Button
          onClick={onNavigateHome}
          size="sm"
          leftIcon={<Home className="w-4 h-4" />}
        >
          Return to Active Workspace
        </Button>
      )}
    </div>
  );
};
