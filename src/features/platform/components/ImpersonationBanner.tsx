// src/features/platform/components/ImpersonationBanner.tsx
// ============================================================
// WorkForceOS — Active Impersonation Session Banner
// ============================================================

import React, { useState, useEffect } from 'react';
import { ShieldAlert, LogOut, Clock, Building2 } from 'lucide-react';
import { platformImpersonationService } from '../../../services/platform';
import { ImpersonationSession } from '../../../types/platformAdmin';

export const ImpersonationBanner: React.FC = () => {
  const [session, setSession] = useState<ImpersonationSession | null>(() =>
    platformImpersonationService.getActiveSession()
  );
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const checkSession = () => {
      const active = platformImpersonationService.getActiveSession();
      setSession(active);

      if (active) {
        const diffMs = new Date(active.expires_at).getTime() - Date.now();
        if (diffMs <= 0) {
          platformImpersonationService.endImpersonation();
          setSession(null);
        } else {
          const mins = Math.floor(diffMs / 60000);
          const secs = Math.floor((diffMs % 60000) / 1000);
          setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        }
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!session) return null;

  const handleExit = async () => {
    await platformImpersonationService.endImpersonation();
    setSession(null);
    window.location.reload();
  };

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white px-4 py-2 shadow-md flex items-center justify-between gap-4 text-xs font-bold animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-3">
        <span className="p-1 rounded-md bg-white/20">
          <ShieldAlert className="w-4 h-4 text-amber-200 animate-pulse" />
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-black">
            Active Impersonation Session
          </span>
          <span className="flex items-center gap-1 text-white">
            <Building2 className="w-3.5 h-3.5 text-amber-200" />
            Viewing Tenant: <strong className="text-amber-100 underline decoration-amber-300">{session.target_tenant_name}</strong>
          </span>
          <span className="text-amber-200/80 font-normal">
            ({session.reason})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg font-mono text-amber-100">
          <Clock className="w-3.5 h-3.5 text-amber-300" />
          <span>{timeLeft}</span>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1 bg-white text-amber-900 hover:bg-amber-50 rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit Session
        </button>
      </div>
    </div>
  );
};
