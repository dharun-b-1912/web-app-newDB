// src/components/common/JoyLoadingSpinner.tsx
// ============================================================================
// Joy PeopleHR — Animated Vector Loading Indicator
// High-fidelity vector spinner featuring orbiting gradient rings & pulsing emblem
// ============================================================================

import React from 'react';
import { JoyVectorEmblem } from './JoyVectorEmblem';

export interface JoyLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  variant?: 'light' | 'dark' | 'glass';
  className?: string;
}

export const JoyLoadingSpinner: React.FC<JoyLoadingSpinnerProps> = ({
  size = 'md',
  message,
  subMessage,
  fullScreen = false,
  variant = 'light',
  className = '',
}) => {
  const isDark = variant === 'dark';

  const sizeMap = {
    sm: { container: 'w-12 h-12', emblem: 'w-6 h-6', ringRadius: 20, stroke: 2.5 },
    md: { container: 'w-20 h-20', emblem: 'w-10 h-10', ringRadius: 36, stroke: 3 },
    lg: { container: 'w-28 h-28', emblem: 'w-14 h-14', ringRadius: 50, stroke: 3.5 },
    xl: { container: 'w-36 h-36', emblem: 'w-20 h-20', ringRadius: 66, stroke: 4 },
  }[size];

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Animated Centerpiece with Orbiting Rings */}
      <div className={`relative flex items-center justify-center ${sizeMap.container}`}>
        {/* Soft Radial Ambient Glow */}
        <div
          className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse pointer-events-none"
          aria-hidden="true"
        />

        {/* Outer Pulsing Concentric Aura */}
        <div
          className="absolute inset-1 rounded-full border border-emerald-500/30 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none opacity-40"
          aria-hidden="true"
        />

        {/* Smooth Orbiting SVG Gradient Ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-[spin_1.6s_linear_infinite]"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="joySpinnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#02b763" stopOpacity="1" />
              <stop offset="50%" stopColor="#2dd684" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#026b44" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="joySpinnerTrack" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#02b763" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#026b44" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r={sizeMap.ringRadius}
            stroke="url(#joySpinnerTrack)"
            strokeWidth={sizeMap.stroke}
          />

          {/* Active Spinning Arc */}
          <circle
            cx="50"
            cy="50"
            r={sizeMap.ringRadius}
            stroke="url(#joySpinnerGrad)"
            strokeWidth={sizeMap.stroke}
            strokeLinecap="round"
            strokeDasharray="90 140"
          />
        </svg>

        {/* Counter-rotating Inner Micro-dots */}
        <svg
          className="absolute inset-0 w-full h-full animate-[spin_3s_linear_infinite_reverse] opacity-60"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="50"
            cy="50"
            r={sizeMap.ringRadius - 6}
            stroke="#02b763"
            strokeWidth="1.5"
            strokeDasharray="4 24"
            strokeLinecap="round"
          />
        </svg>

        {/* Joy Vector Emblem with Floating Pulse */}
        <div
          className={`relative z-10 flex items-center justify-center ${sizeMap.emblem} animate-[joyPulse_2s_ease-in-out_infinite]`}
        >
          <JoyVectorEmblem className="w-full h-full drop-shadow-md" />
        </div>
      </div>

      {/* Optional Loading Messages */}
      {(message || subMessage) && (
        <div className="flex flex-col items-center text-center space-y-1 max-w-sm px-4">
          {message && (
            <p
              className={`text-sm font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-800'
              }`}
            >
              {message}
            </p>
          )}
          {subMessage && (
            <p
              className={`text-xs ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {subMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md transition-all duration-300 ${
          isDark ? 'bg-slate-950/85' : 'bg-slate-50/90'
        }`}
      >
        {content}
      </div>
    );
  }

  return content;
};
