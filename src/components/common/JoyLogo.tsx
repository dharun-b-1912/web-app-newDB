// src/components/common/JoyLogo.tsx
// ============================================================================
// Joy PeopleHR — Master Corporate Brand Identity Component
// Uses official corporate branding master assets with bulletproof inline SVG fallback
// JOY PeopleHR | People First. Work Simplified.
// ============================================================================

import React, { useState } from 'react';

export type JoyLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';

export interface JoyLogoProps {
  size?: JoyLogoSize | number;
  showText?: boolean;
  showSubtitle?: boolean;
  subtitleText?: string;
  badgeText?: string;
  animated?: boolean;
  glow?: boolean;
  variant?: 'light' | 'dark' | 'emerald' | 'monochrome';
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP: Record<JoyLogoSize, { height: number; emblemSize: number }> = {
  xs: { height: 26, emblemSize: 24 },
  sm: { height: 38, emblemSize: 34 },
  md: { height: 46, emblemSize: 42 },
  lg: { height: 56, emblemSize: 50 },
  xl: { height: 70, emblemSize: 64 },
  '2xl': { height: 90, emblemSize: 82 },
  hero: { height: 110, emblemSize: 100 },
};

const LOGO_SOURCES = [
  '/joy-corporate-logo-transparent.png',
  '/joy-corporate-logo.png',
  '/joy-logo-transparent.svg',
  '/joy-logo.svg',
];

export const JoyLogo: React.FC<JoyLogoProps> = ({
  size = 'md',
  showText = true,
  badgeText,
  animated = false,
  glow = false,
  variant = 'light',
  className = '',
  onClick,
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [useVectorFallback, setUseVectorFallback] = useState(false);

  const config = typeof size === 'number'
    ? { height: size, emblemSize: Math.round(size * 0.9) }
    : SIZE_MAP[size] || SIZE_MAP.md;

  const isDark = variant === 'dark';

  const handleImgError = () => {
    if (sourceIndex < LOGO_SOURCES.length - 1) {
      setSourceIndex(prev => prev + 1);
    } else {
      setUseVectorFallback(true);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 select-none ${
        onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
      } ${className}`}
    >
      {/* Optional Ambient Glow Backdrop */}
      {glow && (
        <div
          className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-lg pointer-events-none transform -translate-y-0.5 scale-110 animate-pulse"
          aria-hidden="true"
        />
      )}

      {useVectorFallback ? (
        /* Bulletproof Zero-Network Inline SVG Fallback */
        <div className="flex items-center gap-2.5">
          <svg
            style={{ height: `${config.height}px`, width: `${config.height}px` }}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`shrink-0 ${animated ? 'animate-[joyFloat_3.5s_ease-in-out_infinite]' : ''}`}
          >
            <circle cx="50" cy="50" r="48" fill="#07563D" />
            <circle cx="34" cy="36" r="7" fill="#34D399" />
            <circle cx="66" cy="36" r="7" fill="#34D399" />
            <path
              d="M30 52 C30 72 70 72 70 52"
              stroke="#FFFFFF"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="50" cy="40" r="4" fill="#FFFFFF" />
          </svg>
          {showText && (
            <div className="flex flex-col justify-center leading-none">
              <div className="flex items-baseline gap-1">
                <span className="font-black text-base tracking-tight text-[#07563D]">JOY</span>
                <span className="font-extrabold text-base tracking-tight text-gray-900">PeopleHR</span>
              </div>
              <span className="text-[9px] font-semibold text-gray-500 tracking-wider uppercase mt-0.5">
                People First. Work Simplified.
              </span>
            </div>
          )}
          {badgeText && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-500/10 text-[#029756] border border-emerald-500/20 shrink-0 self-center">
              {badgeText}
            </span>
          )}
        </div>
      ) : showText ? (
        /* Full Corporate Logo Placement: Emblem + JOY PeopleHR + Tagline */
        <div className="relative flex items-center shrink-0">
          <img
            src={LOGO_SOURCES[sourceIndex]}
            alt="JOY PeopleHR — People First. Work Simplified."
            onError={handleImgError}
            style={{ height: `${config.height}px` }}
            className={`w-auto max-w-full object-contain filter drop-shadow-2xs transition-transform duration-200 ${
              isDark ? 'brightness-110 contrast-125' : ''
            } ${animated ? 'animate-[joyFloat_3.5s_ease-in-out_infinite]' : ''}`}
            loading="eager"
            decoding="async"
          />

          {badgeText && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-500/10 text-[#029756] border border-emerald-500/20 shrink-0 self-center">
              {badgeText}
            </span>
          )}
        </div>
      ) : (
        /* Standalone Emblem / Mark Mode */
        <div
          className={`relative rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${
            animated ? 'animate-[joyFloat_3.5s_ease-in-out_infinite]' : ''
          }`}
          style={{ width: `${config.emblemSize}px`, height: `${config.emblemSize}px` }}
        >
          <img
            src="/joy-logo-mark.png"
            alt="JOY PeopleHR Emblem"
            onError={() => setUseVectorFallback(true)}
            className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95"
            loading="eager"
            decoding="async"
          />
        </div>
      )}
    </div>
  );
};
