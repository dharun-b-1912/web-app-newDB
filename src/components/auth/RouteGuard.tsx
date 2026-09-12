import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { ShieldAlert, ArrowLeft, Lock, Info, HelpCircle, Sparkles, LayoutDashboard } from 'lucide-react';
import { Button } from '../ui/Button';
import { moduleRegistryService } from '../../services/platform/moduleRegistryService';

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
  const isSuperAdmin = primaryRole === 'Super Admin' || (primaryRole as string) === 'Platform Admin';

  // Determine the best fallback route for this role
  const resolvedFallback =
    fallbackNav ??
    (primaryRole === 'Super Admin'
      ? 'platform-dashboard'
      : primaryRole === 'Company Admin' ||
        primaryRole === 'HR Head'
      ? 'dashboard'
      : 'my-workspace');

  // 1. Centralized Module Registry Lifecycle Check (PAUSED / HIDDEN / RELEASE SCOPE)
  const moduleEval = moduleRegistryService.evaluateRouteAccess(module, primaryRole, isSuperAdmin);
  if (!moduleEval.accessible) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="max-w-md w-full p-8 text-center rounded-3xl border border-gray-200/90 shadow-xl bg-gradient-to-b from-white to-gray-50/50">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 text-amber-900 font-black text-[10px] uppercase tracking-wider mb-3">
            <Sparkles className="w-3 h-3 text-amber-600" />
            Scheduled Platform Release
          </span>

          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {moduleEval.module?.module_name || 'Feature Currently Unavailable'}
          </h2>

          <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-sm mx-auto">
            This module is undergoing scheduled enterprise certification and is not active in the current production release.
          </p>

          <div className="mt-6 p-3.5 bg-gray-50 border border-gray-200/70 rounded-2xl text-left text-xs text-gray-600 space-y-1.5">
            <div className="flex items-center justify-between font-medium">
              <span className="text-gray-400">Target Release:</span>
              <span className="font-bold text-gray-800">
                {moduleEval.module?.planned_phase || 'Upcoming Release'}
              </span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span className="text-gray-400">Environment:</span>
              <span className="font-bold text-emerald-800">Production SaaS Tenant</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate ? onNavigate(resolvedFallback) : undefined}
              className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs font-bold gap-2 rounded-xl shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4" />
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Role-Based Access Control
  const isAllowed = hasPermission(module, action);

  // Gracefully bypass internal auth/accept-invite routes that might linger during redirection
  const isAuthOrUtilityRoute =
    !module ||
    module === 'login' ||
    module === 'activate' ||
    module.includes('accept-invite') ||
    module.includes('auth') ||
    module.includes('invitation');

  // Vendor Admin has explicit authorization over all vendor modules
  const isVendorAllowed =
    primaryRole === 'Vendor Admin' && (module.startsWith('vendor') || module.includes('vendor'));

  if (isAllowed || isAuthOrUtilityRoute || isVendorAllowed) {
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
