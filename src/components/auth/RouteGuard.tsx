  import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
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
    (primaryRole === 'Company Admin' ||
    primaryRole === 'HR Head / Super Admin' ||
    primaryRole === 'HR Head'
      ? 'dashboard'
      : 'my-workspace');

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-2xl border border-gray-200/80 shadow-xs my-6">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4 border border-amber-200/60 shadow-xs">
        <ShieldAlert className="w-7 h-7" />
      </div>

      <h2 className="text-lg font-bold text-gray-900 tracking-tight">
        Access Restricted ({primaryRole} Scope)
      </h2>

      <p className="text-xs text-gray-500 max-w-md mt-2 leading-relaxed">
        Your active role (<span className="font-semibold text-gray-700">{primaryRole}</span>) does not have authorization to access the <span className="font-semibold text-gray-700">{module}</span> module. Contact your organization administrator to request access.
      </p>

      {onNavigate && (
        <Button
          onClick={() => onNavigate(resolvedFallback)}
          variant="outline"
          size="sm"
          className="mt-6 border-gray-200"
          leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
        >
          {primaryRole === 'Company Admin' ||
          primaryRole === 'HR Head / Super Admin' ||
          primaryRole === 'HR Head'
            ? 'Go to HR Dashboard'
            : 'Return to My Workspace'}
        </Button>
      )}
    </div>
  );
};
