// src/components/guards/ModuleRouteGuard.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Route-Level Module Guard
// Protects Against Direct URL Navigation to Paused or Uncertified Modules
// ============================================================================

import React from 'react';
import { moduleRegistryService } from '../../services/platform/moduleRegistryService';
import { usePermission } from '../../hooks/usePermission';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ShieldAlert, ArrowLeft, Lock, Sparkles, LayoutDashboard } from 'lucide-react';

export interface ModuleRouteGuardProps {
  route: string;
  children: React.ReactNode;
  onNavigateHome?: () => void;
}

export const ModuleRouteGuard: React.FC<ModuleRouteGuardProps> = ({
  route,
  children,
  onNavigateHome,
}) => {
  const { primaryRole } = usePermission();
  const isSuperAdmin = primaryRole === 'Super Admin' || (primaryRole as string) === 'Platform Admin';

  const evaluation = moduleRegistryService.evaluateRouteAccess(route, primaryRole, isSuperAdmin);

  if (evaluation.accessible) {
    return <>{children}</>;
  }

  const handleReturn = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/dashboard';
      window.dispatchEvent(new CustomEvent('platform:navigate', { detail: { tab: 'dashboard' } }));
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
      <Card className="max-w-lg w-full p-8 text-center rounded-3xl border border-gray-200/90 shadow-2xl bg-gradient-to-b from-white to-gray-50/50">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 text-amber-900 font-black text-[10px] uppercase tracking-wider mb-3">
          <Sparkles className="w-3 h-3 text-amber-600" />
          Scheduled Platform Release
        </span>

        <h2 className="text-xl font-black text-gray-900 tracking-tight">
          {evaluation.module?.module_name || 'Feature Currently Unavailable'}
        </h2>

        <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-md mx-auto">
          This feature is undergoing scheduled enterprise certification and is not active in the current production release.
        </p>

        <div className="mt-6 p-3.5 bg-gray-50 border border-gray-200/70 rounded-2xl text-left text-xs text-gray-600 space-y-1.5">
          <div className="flex items-center justify-between font-medium">
            <span className="text-gray-400">Target Release:</span>
            <span className="font-bold text-gray-800">
              {evaluation.module?.planned_phase || 'Upcoming Release'}
            </span>
          </div>
          <div className="flex items-center justify-between font-medium">
            <span className="text-gray-400">Environment:</span>
            <span className="font-bold text-emerald-800">Production SaaS Tenant</span>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleReturn}
            className="bg-[#07563D] hover:bg-[#0b7a57] text-white text-xs font-bold gap-2 rounded-xl shadow-xs"
          >
            <LayoutDashboard className="w-4 h-4" />
            Return to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
};
