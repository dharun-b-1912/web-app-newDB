// src/components/common/JoySplashScreen.tsx
// ============================================================================
// Joy PeopleHR — Master Enterprise Animated Splash & Boot Screen
// Recreated pixel-accurately from official light enterprise concept:
// - Top-right "Enterprise Edition" pill badge
// - Centerpiece squircle card with authentic vector emblem & ambient mint orbs
// - Bold "Joy PeopleHR" typography + "Workforce • Vendors • Payroll • Invoicing • Compliance"
// - Horizontal slender emerald progress bar with right-aligned percentage (e.g. 68%)
// - Status message: "Loading your workspace..." + "This may take a few seconds"
// - Bottom-left "Optimized for low network" wifi pill badge
// - Bottom-right 3-dot pagination carousel indicator
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { JoyVectorEmblem } from './JoyVectorEmblem';
import { Building2, Wifi, CheckCircle2 } from 'lucide-react';

export interface JoySplashScreenProps {
  onFinished?: () => void;
  minDurationMs?: number;
  customStatus?: string;
  theme?: 'light' | 'dark';
  isReady?: boolean;
}

interface BootStage {
  threshold: number;
  message: string;
  detail: string;
}

const BOOT_STAGES: BootStage[] = [
  { threshold: 22, message: 'Initializing Joy Enterprise Engine...', detail: 'Hydrating security state & session tokens' },
  { threshold: 46, message: 'Connecting to Multi-Tenant Core...', detail: 'Verifying organization boundaries & RLS' },
  { threshold: 68, message: 'Loading your workspace...', detail: 'This may take a few seconds' },
  { threshold: 88, message: 'Synchronizing workforce & compliance vault...', detail: 'Calibrating statutory rules and site rosters' },
  { threshold: 100, message: 'System Ready', detail: 'Launching workspace' },
];

export const JoySplashScreen: React.FC<JoySplashScreenProps> = ({
  onFinished,
  minDurationMs = 2400,
  customStatus,
  theme = 'light',
  isReady = true,
}) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(8);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const isFinishedCalledRef = useRef(false);

  useEffect(() => {
    const startTime = performance.now();
    let animFrame: number;
    const maxSafetyDurationMs = Math.min(minDurationMs + 400, 1400);

    const triggerExit = () => {
      if (isFinishedCalledRef.current) return;
      isFinishedCalledRef.current = true;
      setProgress(100);
      setStageIndex(4);
      setIsFadingOut(true);
      setTimeout(() => {
        if (onFinished) {
          onFinished();
        }
      }, 350);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawRatio = Math.min(elapsed / minDurationMs, 1);

      // Force finish if max safety duration exceeded to guarantee zero UI lock
      if (elapsed >= maxSafetyDurationMs) {
        triggerExit();
        return;
      }

      // If background initialization is not ready yet, hold at 90%
      const effectiveCap = isReady ? 1 : 0.90;
      const currentRatio = Math.min(rawRatio, effectiveCap);

      const calculatedProgress = Math.min(100, Math.max(8, Math.round(currentRatio * 100)));
      setProgress(calculatedProgress);

      if (calculatedProgress < 25) {
        setStageIndex(0);
      } else if (calculatedProgress < 50) {
        setStageIndex(1);
      } else if (calculatedProgress < 75) {
        setStageIndex(2);
      } else if (calculatedProgress < 95) {
        setStageIndex(3);
      } else {
        setStageIndex(4);
      }

      // When reaching 100% and background ready, trigger smooth exit
      if (currentRatio >= 1 && (isReady || elapsed >= minDurationMs)) {
        triggerExit();
        return;
      }

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [minDurationMs, isReady, onFinished]);

  const currentStage = BOOT_STAGES[Math.min(stageIndex, BOOT_STAGES.length - 1)];
  const isDark = theme === 'dark';
  const isComplete = progress === 100;

  // Active dot index based on progress (0 -> 1 -> 2)
  const activeDotIndex = progress < 45 ? 0 : progress < 85 ? 1 : 2;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col justify-between p-6 sm:p-10 select-none transition-all duration-500 ease-out ${
        isFadingOut
          ? 'opacity-0 scale-[1.015] filter blur-xs pointer-events-none'
          : 'opacity-100 scale-100'
      } ${
        isDark
          ? 'bg-[#06140E] text-white'
          : 'bg-[#FCFDFC] text-slate-900'
      }`}
    >
      {/* =====================================================================
          TOP BAR: Enterprise Edition Badge (Right Aligned)
          ===================================================================== */}
      <div className="w-full flex items-center justify-end relative z-10">
        <div
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-2xs ${
            isDark
              ? 'bg-slate-900/80 border-slate-700 text-slate-300'
              : 'bg-white/95 border-slate-200/90 text-slate-700'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Enterprise Edition</span>
        </div>
      </div>

      {/* =====================================================================
          CENTERPIECE: Vector Emblem Squircle, Typography & Progress Bar
          ===================================================================== */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-lg mx-auto relative z-10 space-y-6">
        {/* Emblem Squircle Card with Ambient Mint Orbs */}
        <div className="relative flex items-center justify-center">
          {/* Ambient Blurred Light Mint Orbs (as shown in concept image) */}
          <div className="w-48 h-48 rounded-full bg-emerald-100/70 blur-2xl absolute -top-8 -left-10 pointer-events-none" />
          <div className="w-40 h-40 rounded-full bg-teal-100/60 blur-xl absolute -bottom-6 -right-6 pointer-events-none" />

          {/* Accent Solid Emerald Dot (as in concept image top-right of logo) */}
          <div className="w-3 h-3 rounded-full bg-[#02b763] absolute -top-2 -right-4 z-20 shadow-xs animate-pulse" />

          {/* Pure White Squircle Card with Soft Diffuse Drop Shadow */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] bg-white border border-slate-100/90 shadow-[0_20px_50px_rgba(2,183,99,0.18),0_4px_12px_rgba(0,0,0,0.03)] flex items-center justify-center p-4 sm:p-5 relative z-10">
            <JoyVectorEmblem className="w-full h-full object-contain filter drop-shadow-xs" />
          </div>
        </div>

        {/* Brand Typographic Lockup */}
        <div className="text-center space-y-2 pt-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#111827]">
            <span className="text-[#02b763]">Joy</span> PeopleHR
          </h1>

          <div className="text-xs sm:text-sm font-medium text-slate-500 tracking-normal flex items-center justify-center flex-wrap gap-2">
            <span>Workforce</span>
            <span className="text-emerald-500 font-bold">•</span>
            <span>Vendors</span>
            <span className="text-emerald-500 font-bold">•</span>
            <span>Payroll</span>
            <span className="text-emerald-500 font-bold">•</span>
            <span>Invoicing</span>
            <span className="text-emerald-500 font-bold">•</span>
            <span>Compliance</span>
          </div>
        </div>

        {/* Slender Emerald Progress Bar + Right-Aligned Percentage */}
        <div className="w-full max-w-[440px] pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Progress Track */}
            <div className="flex-1 h-2 sm:h-2.5 bg-slate-100/90 rounded-full overflow-hidden p-0.5 border border-slate-200/70">
              <div
                className="h-full rounded-full bg-[#02b763] transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(2,183,99,0.35)] relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* Subtle glint shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[joyShimmer_1.4s_infinite]" />
              </div>
            </div>

            {/* Percentage Number (Right Aligned in Emerald) */}
            <span className="text-xs sm:text-sm font-bold text-[#02b763] font-mono tabular-nums shrink-0">
              {progress}%
            </span>
          </div>

          {/* Dynamic Status Text */}
          <div className="text-center space-y-1 pt-1">
            <h2 className="text-base sm:text-lg font-bold text-[#1f2937] tracking-tight">
              {customStatus || currentStage.message}
            </h2>
            <p className="text-xs text-slate-400 font-normal">
              {currentStage.detail}
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BOTTOM BAR: Low Network Pill (Left) & 3-Dot Carousel Indicator (Right)
          ===================================================================== */}
      <div className="w-full flex items-center justify-between relative z-10">
        {/* Bottom Left: Low Network Optimized Pill Badge */}
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 text-[#065f46] text-xs font-semibold shadow-2xs">
          <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Optimized for low network</span>
        </div>

        {/* Bottom Right: 3-Dot Carousel Indicator */}
        <div className="flex items-center gap-2" title="Boot stage milestones">
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              activeDotIndex === 0
                ? 'bg-[#02b763] scale-125'
                : 'bg-slate-200'
            }`}
          />
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              activeDotIndex === 1
                ? 'bg-[#02b763] scale-125'
                : 'bg-slate-200'
            }`}
          />
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              activeDotIndex === 2
                ? 'bg-[#02b763] scale-125'
                : 'bg-slate-200'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
