// src/components/common/JoyLogo.tsx
// ============================================================================
// Joy PeopleHR — Master Corporate Brand Identity Component
// Uses the official corporate branding master asset:
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
  const [imgError, setImgError] = useState(false);

  const config = typeof size === 'number'
    ? { height: size, emblemSize: Math.round(size * 0.9) }
    : SIZE_MAP[size] || SIZE_MAP.md;

  const isDark = variant === 'dark';

  // Primary source paths (served from /public)
  const fullLogoSrc = '/joy-corporate-logo-transparent.png';
  const fallbackLogoSrc = '/joy-corporate-logo.png';
  const emblemSrc = '/joy-logo-mark.png';

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

      {showText ? (
        /* Full Corporate Logo Placement: Emblem + JOY PeopleHR + Tagline */
        <div className="relative flex items-center shrink-0">
          <img
            src={imgError ? fallbackLogoSrc : fullLogoSrc}
            alt="JOY PeopleHR — People First. Work Simplified."
            onError={() => {
              if (!imgError) setImgError(true);
            }}
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
        /* Standalone Emblem / Mark Mode (e.g., collapsed sidebar or avatar lockup) */
        <div
          className={`relative rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 ${
            animated ? 'animate-[joyFloat_3.5s_ease-in-out_infinite]' : ''
          }`}
          style={{ width: `${config.emblemSize}px`, height: `${config.emblemSize}px` }}
        >
          <img
            src={emblemSrc}
            alt="JOY PeopleHR Emblem"
            className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95"
            loading="eager"
            decoding="async"
          />
        </div>
      )}
    </div>
  );
};
