// src/components/states/ContextualForbiddenView.tsx
// ============================================================
// Joy PeopleHR Enterprise — Contextual Role-Aware 403 Forbidden State
// Provides friendly, actionable permission denial explanations.
// ============================================================

import React from 'react';
import { Lock, ShieldAlert, ArrowLeft, Info, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { usePermission } from '../../hooks/usePermission';

export interface ContextualForbiddenViewProps {
  moduleName?: string;
  requiredPermission?: string;
  onNavigateHome?: () => void;
  onRequestAccess?: () => void;
  className?: string;
}

export const ContextualForbiddenView: React.FC<ContextualForbiddenViewProps> = ({
  moduleName = 'this restricted module',
  requiredPermission,
  onNavigateHome,
  onRequestAccess,
  className = '',
}) => {
  const { primaryRole } = usePermission();

  const isPlatformTarget = moduleName.toLowerCase().includes('platform') || moduleName.toLowerCase().includes('super admin');
  const isEmployeeRole = primaryRole === 'Employee';

  return (
    <div className={`flex flex-col items-center justify-center min-h-[480px] p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-8 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 border border-amber-200 dark:border-amber-800/60 shadow-xs">
        <Lock className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        {isPlatformTarget ? 'Platform Administrator Access Required' : 'Access Restricted'}
      </h2>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-2 leading-relaxed">
        {isPlatformTarget ? (
          <>This area is reserved strictly for Joy PeopleHR platform administrators and security officers.</>
        ) : isEmployeeRole ? (
          <>You are signed in with the <strong className="font-semibold text-slate-700 dark:text-slate-300">Employee Self-Service</strong> role. Administrative permissions are managed by your HR department.</>
        ) : (
          <>Your administrative profile (<strong className="font-semibold text-slate-700 dark:text-slate-300">{primaryRole}</strong>) does not currently have permission to access {moduleName}.</>
        )}
      </p>

      {/* Permission Detail Box */}
      <div className="w-full bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-4 my-6 border border-slate-200 dark:border-slate-700 text-left space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>Authorization Scope Details</span>
        </div>
        <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
          {requiredPermission && (
            <div>
              Required Policy:{' '}
              <code className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
                {requiredPermission}
              </code>
            </div>
          )}
          <div>
            If your responsibilities require this privilege, contact your <strong>Company Administrator</strong> to update your assigned role permissions in the RBAC settings.
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onNavigateHome && (
          <Button
            onClick={onNavigateHome}
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Return to Dashboard
          </Button>
        )}
        {onRequestAccess && (
          <Button
            onClick={onRequestAccess}
            variant="outline"
            size="sm"
            leftIcon={<HelpCircle className="w-4 h-4" />}
          >
            Request Role Elevation
          </Button>
        )}
      </div>
    </div>
  );
};
