// src/features/platform/components/tenants/SupportAccessBanner.tsx
// ============================================================
// WorkForceOS — Persistent Support Access Session Banner
// ============================================================

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, LogOut, UserCheck } from 'lucide-react';
import { SupportAccessSession } from '../../../../services/platform/platformSupportAccessService';
import { Button } from '../../../../components/ui/Button';

export interface SupportAccessBannerProps {
  session: SupportAccessSession | null;
  onExitSession: () => void;
}

export const SupportAccessBanner: React.FC<SupportAccessBannerProps> = ({
  session,
  onExitSession,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        onExitSession();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session, onExitSession]);

  if (!session || session.status !== 'ACTIVE') return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs font-semibold z-50 sticky top-0 border-b border-amber-600 animate-in slide-in-from-top duration-300">
      {/* Identity Information */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 bg-amber-900/90 text-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-extrabold animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5" /> Support Access Active
        </span>

        <span className="hidden sm:inline">
          Accessing: <strong className="text-black font-bold">{session.organization_name}</strong>
        </span>

        <span className="hidden md:inline text-amber-900">•</span>

        <span className="hidden md:inline">
          Signed in as: <strong className="text-black font-bold">{session.platform_actor_name}</strong> ({session.platform_actor_role})
        </span>

        <span className="hidden lg:inline text-amber-900">•</span>

        <span className="hidden lg:inline text-amber-900 font-medium">
          Reason: {session.reason}
        </span>
      </div>

      {/* Countdown Timer & Exit Action */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-mono text-black font-bold bg-amber-400/80 px-2.5 py-1 rounded-lg border border-amber-600/30">
          <Clock className="w-3.5 h-3.5 text-amber-950" />
          <span>{formattedTime}</span>
        </div>

        <button
          onClick={onExitSession}
          className="px-3 py-1 bg-amber-950 hover:bg-black text-amber-50 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <LogOut className="w-3.5 h-3.5" /> Exit Support Access
        </button>
      </div>
    </div>
  );
};
