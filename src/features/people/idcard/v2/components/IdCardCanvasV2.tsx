// src/features/people/idcard/v2/components/IdCardCanvasV2.tsx
// ============================================================================
// Canvas Engine V2: Auto-Fit Zoom, Finished-View Default, and Responsive Display
// ============================================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Eye,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  CardGeometry,
  CardSide,
  CardSideData,
  IdCardPersonRecord,
} from '../../idCardTypes';
import { drawCardSide } from '../../idCardPdfEngine';

interface IdCardCanvasV2Props {
  sideData: CardSideData;
  activeEmployee: IdCardPersonRecord;
  employeeIndex: number;
  totalEmployees: number;
  geometry: CardGeometry;
  zoom: number;
  onZoomChange: (z: number) => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  activeSide: CardSide;
  onToggleSide: () => void;
  onPrevEmployee: () => void;
  onNextEmployee: () => void;
  logoImg: HTMLImageElement | null;
  photosMap: Map<string, HTMLImageElement>;
}

export const IdCardCanvasV2: React.FC<IdCardCanvasV2Props> = ({
  sideData,
  activeEmployee,
  employeeIndex,
  totalEmployees,
  geometry,
  zoom,
  onZoomChange,
  showGuides,
  onToggleGuides,
  activeSide,
  onToggleSide,
  onPrevEmployee,
  onNextEmployee,
  logoImg,
  photosMap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Update container dimensions on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute Auto-Fit Zoom Scale
  const handleFitZoom = useCallback(() => {
    if (!containerRef.current) return;
    const availableW = containerRef.current.clientWidth - 80;
    const availableH = containerRef.current.clientHeight - 120;

    // Card dimensions in pixels at 96 DPI screen base (1 mm = 3.7795 px)
    const baseMmToPx = 3.7795;
    const cardPxW = (geometry.w + 2 * (showGuides ? geometry.bleed : 0)) * baseMmToPx;
    const cardPxH = (geometry.h + 2 * (showGuides ? geometry.bleed : 0)) * baseMmToPx;

    const fitScale = Math.min(availableW / cardPxW, availableH / cardPxH);
    // Clamp fit scale between 0.6 and 1.8
    const clamped = Math.max(0.6, Math.min(1.8, Math.round(fitScale * 10) / 10));
    onZoomChange(clamped);
  }, [geometry, showGuides, onZoomChange]);

  // Initial Auto-Fit on mount or geometry change
  useEffect(() => {
    handleFitZoom();
  }, [geometry.w, geometry.h, geometry.orientation, handleFitZoom]);

  // Render Canvas
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    // Base DPI: 150 for crisp interactive preview
    const dpr = window.devicePixelRatio || 1;
    const previewDpi = 150 * zoom;
    const scale = previewDpi / 25.4;

    const bleed = showGuides ? geometry.bleed : 0;
    const totalW = geometry.w + 2 * bleed;
    const totalH = geometry.h + 2 * bleed;

    const pixelW = Math.round(totalW * scale);
    const pixelH = Math.round(totalH * scale);

    cv.width = pixelW * dpr;
    cv.height = pixelH * dpr;
    cv.style.width = `${Math.round(totalW * 3.7795 * zoom)}px`;
    cv.style.height = `${Math.round(totalH * 3.7795 * zoom)}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // If Finished View, clip with CR80 standard 3.18 mm rounded corners
    if (!showGuides) {
      const cr = 3.18 * scale;
      ctx.beginPath();
      ctx.moveTo(cr, 0);
      ctx.arcTo(pixelW, 0, pixelW, pixelH, cr);
      ctx.arcTo(pixelW, pixelH, 0, pixelH, cr);
      ctx.arcTo(0, pixelH, 0, 0, cr);
      ctx.arcTo(0, 0, pixelW, 0, cr);
      ctx.closePath();
      ctx.clip();
    }

    // Draw Card Side (Elements, background, text, photo, QR)
    drawCardSide(ctx, sideData, activeEmployee, geometry, scale, {
      logo: logoImg,
      photos: photosMap,
    });

    // If Guides Mode, overlay Bleed, Trim cut line, and Safe Margin
    if (showGuides) {
      const bPx = geometry.bleed * scale;
      const safePx = geometry.safe * scale;

      // Outer Bleed Shading (Semi-transparent cyan ring)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.fillRect(0, 0, pixelW, bPx); // Top bleed
      ctx.fillRect(0, pixelH - bPx, pixelW, bPx); // Bottom bleed
      ctx.fillRect(0, bPx, bPx, pixelH - 2 * bPx); // Left bleed
      ctx.fillRect(pixelW - bPx, bPx, bPx, pixelH - 2 * bPx); // Right bleed

      // 1. Bleed Outer Edge Line (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, 0, pixelW, pixelH);

      // 2. Trim Line (Cut Line - Magenta Solid)
      ctx.strokeStyle = '#d946ef';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(bPx, bPx, pixelW - 2 * bPx, pixelH - 2 * bPx);

      // 3. Safe Zone Margin Line (Dashed Yellow/Green)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bPx + safePx, bPx + safePx, pixelW - 2 * (bPx + safePx), pixelH - 2 * (bPx + safePx));
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [
    sideData,
    activeEmployee,
    geometry,
    zoom,
    showGuides,
    logoImg,
    photosMap,
  ]);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col items-center justify-between p-6 bg-slate-100 dark:bg-slate-950 overflow-hidden relative select-none"
    >
      {/* Top Floating Controls Bar */}
      <div className="w-full max-w-xl flex items-center justify-between gap-2 z-10">
        {/* Flip Side Button */}
        <button
          type="button"
          onClick={onToggleSide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
          <span>Viewing: {activeSide.toUpperCase()}</span>
        </button>

        {/* Guides Mode Pill */}
        <button
          type="button"
          onClick={onToggleGuides}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
            showGuides
              ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showGuides ? 'Guides: Prepress Mode' : 'Finished Card View'}</span>
        </button>
      </div>

      {/* Main Canvas Card Display Viewport */}
      <div className="flex-1 flex items-center justify-center w-full my-4">
        <div
          className={`relative transition-all duration-200 ${
            !showGuides ? 'shadow-2xl shadow-slate-900/15 rounded-[12px]' : ''
          }`}
        >
          <canvas ref={canvasRef} className="block max-w-full max-h-full" />
        </div>
      </div>

      {/* Bottom Unified Status Bar */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
        {/* Person Pagination Switcher */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            type="button"
            onClick={onPrevEmployee}
            disabled={totalEmployees <= 1}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous Employee"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center px-2">
            <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight truncate max-w-[180px]">
              {activeEmployee.name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {activeEmployee.idno} · ({employeeIndex + 1} of {totalEmployees})
            </div>
          </div>

          <button
            type="button"
            onClick={onNextEmployee}
            disabled={totalEmployees <= 1}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Employee"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Merged Single-Line Physical Spec Legend */}
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {geometry.w} × {geometry.h} mm
          </span>{' '}
          · {geometry.bleed} mm bleed · {geometry.safe} mm safe ·{' '}
          <span className="uppercase">{geometry.orientation}</span>
        </div>
      </div>
    </div>
  );
};
