// src/components/auth/RouteGuard.tsx
// ============================================================
// WorkForceOS — Authorization & Route Boundary Guard
// ============================================================

import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { ShieldAlert, ArrowLeft, Lock, Info, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export interface RouteGuardProps {
  module: string;
  action?: string;
  children: React.ReactNode;
  fallbackNav?: string;
  onNavigate?: (nav: string) => void;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  module,
  action = 'view',
  children,
  fallbackNav,
  onNavigate,
}) => {
  const { hasPermission, primaryRole } = usePermission();

  const isAllowed = hasPermission(module, action);

  // Determine the best fallback route for this role
  const resolvedFallback =
    fallbackNav ??
    (primaryRole === 'Super Admin'
      ? 'platform-dashboard'
      : primaryRole === 'Company Admin' ||
        primaryRole === 'HR Head'
      ? 'dashboard'
      : 'my-workspace');

  if (isAllowed) {
    return <>{children}</>;
  }

  // Determine required permission code
  const isPlatformModule = module.startsWith('platform') || module.startsWith('saas-');
  const requiredPermissionCode = isPlatformModule
    ? `platform.${module.replace(/^platform-/, '')}.${action}`
    : `hrms.${module}.${action}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[440px] p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm my-6 max-w-xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-800/60 shadow-xs">
        <Lock className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        You don't have permission to access this area
      </h2>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-2 leading-relaxed">
        Your current administrative role (<span className="font-semibold text-slate-800 dark:text-slate-200">{primaryRole}</span>) does not include authorization for this section.
      </p>

      {/* Permission Explanation Box */}
      <div className="w-full bg-slate-50 dark:bg-slate-800/70 rounded-xl p-4 my-5 border border-slate-200 dark:border-slate-700 text-left space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>Why can't I access this?</span>
        </div>
        <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <div>
            Required Scope:{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-indigo-600 dark:text-indigo-400 text-[10px]">
              {requiredPermissionCode}
            </code>
          </div>
          <div>
            Contact a <strong>{isPlatformModule ? 'Platform Super Admin' : 'Company Administrator'}</strong> if your job responsibilities require access to this module.
          </div>
        </div>
      </div>

      {onNavigate && (
        <Button
          onClick={() => onNavigate(resolvedFallback)}
          variant="outline"
          size="sm"
          className="border-slate-200 dark:border-slate-700 text-xs"
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          {primaryRole === 'Super Admin'
            ? 'Return to Platform Command Center'
            : primaryRole === 'Company Admin' ||
              primaryRole === 'HR Head'
            ? 'Go to HR Dashboard'
            : 'Return to My Workspace'}
        </Button>
      )}
    </div>
  );
};
