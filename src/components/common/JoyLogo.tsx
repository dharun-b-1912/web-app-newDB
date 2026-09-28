// src/components/common/JoyLogo.tsx
// ============================================================================
// Joy PeopleHR — Master Vector Brand Identity Component
// Integrates the official vectorized SVG emblem with interactive state styles
// ============================================================================

import React from 'react';
import { JoyVectorEmblem } from './JoyVectorEmblem';

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

const SIZE_MAP: Record<JoyLogoSize, { emblem: number; text: string; sub: string }> = {
  xs: { emblem: 24, text: 'text-sm', sub: 'text-[9px]' },
  sm: { emblem: 32, text: 'text-base', sub: 'text-[10px]' },
  md: { emblem: 42, text: 'text-lg', sub: 'text-[11px]' },
  lg: { emblem: 54, text: 'text-xl', sub: 'text-xs' },
  xl: { emblem: 72, text: 'text-2xl', sub: 'text-xs' },
  '2xl': { emblem: 96, text: 'text-3xl', sub: 'text-sm' },
  hero: { emblem: 128, text: 'text-4xl', sub: 'text-base' },
};

export const JoyLogo: React.FC<JoyLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = false,
  subtitleText = 'Enterprise Workforce & Governance OS',
  badgeText,
  animated = false,
  glow = false,
  variant = 'light',
  className = '',
  onClick,
}) => {
  const sizeConfig = typeof size === 'number'
    ? { emblem: size, text: 'text-lg', sub: 'text-[11px]' }
    : SIZE_MAP[size] || SIZE_MAP.md;

  const isDark = variant === 'dark';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Emblem Container with Optional Glow & Physics */}
      <div className="relative flex items-center justify-center shrink-0">
        {glow && (
          <div
            className="absolute inset-0 rounded-full bg-emerald-500/25 blur-xl pointer-events-none transform -translate-y-0.5 scale-125 animate-pulse"
            aria-hidden="true"
          />
        )}
        <div
          className={`relative rounded-2xl flex items-center justify-center transition-all duration-300 ${
            animated ? 'animate-[joyFloat_3.5s_ease-in-out_infinite]' : ''
          }`}
          style={{ width: sizeConfig.emblem, height: sizeConfig.emblem }}
        >
          <JoyVectorEmblem
            className={`w-full h-full object-contain filter drop-shadow-sm transition-transform duration-300 ${
              onClick ? 'hover:scale-105 active:scale-95' : ''
            }`}
          />
        </div>
      </div>

      {/* Typography Block */}
      {showText && (
        <div className="flex flex-col min-w-0 leading-tight">
          <div className="flex items-center gap-2">
            <span
              className={`font-black tracking-tight ${sizeConfig.text} ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span className="text-[#02b763]">Joy</span>{' '}
              <span className={isDark ? 'text-slate-100' : 'text-slate-800'}>PeopleHR</span>
            </span>

            {badgeText && (
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-500/10 text-[#029756] border border-emerald-500/20">
                {badgeText}
              </span>
            )}
          </div>

          {showSubtitle && (
            <span
              className={`font-medium tracking-wide uppercase ${sizeConfig.sub} ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {subtitleText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
