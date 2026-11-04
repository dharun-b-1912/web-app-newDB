// src/features/people/idcard/components/IdCardToolbar.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Top Professional Action Ribbon
// ============================================================================

import React from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Magnet,
  ShieldCheck,
  AlertTriangle,
  Download,
  Users,
  Save,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CardSide, CardOrientation } from '../idCardTypes';

interface IdCardToolbarProps {
  onBack?: () => void;
  activeSide: CardSide;
  onSideChange: (side: CardSide) => void;
  orientation: CardOrientation;
  onOrientationChange: (orientation: CardOrientation) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  snapToGrid: boolean;
  onSnapToggle: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  preflightCount: { fix: number; check: number };
  onOpenPreflight: () => void;
  onSaveTemplate: () => void;
  onOpenBulkModal: () => void;
  onQuickExportPdf: () => void;
  isExporting: boolean;
  exportProgress?: number;
}

export const IdCardToolbar: React.FC<IdCardToolbarProps> = ({
  onBack,
  activeSide,
  onSideChange,
  orientation,
  onOrientationChange,
  zoom,
  onZoomChange,
  snapToGrid,
  onSnapToggle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  preflightCount,
  onOpenPreflight,
  onSaveTemplate,
  onOpenBulkModal,
  onQuickExportPdf,
  isExporting,
  exportProgress,
}) => {
  return (
    <header className="h-13 bg-[#13171c] border-b border-[#252d37] px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Left: Branding & Back Navigation */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="px-2.5 py-1.5 rounded-lg bg-[#1c2229] hover:bg-[#28323c] text-xs font-semibold text-gray-300 hover:text-white border border-[#2c3642] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Return to Employee Directory"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Workforce</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 gap-0.5">
            <span className="w-2 h-2 rounded-full bg-[#00a6d6]" />
            <span className="w-2 h-2 rounded-full bg-[#e5007d]" />
            <span className="w-2 h-2 rounded-full bg-[#ffd400]" />
            <span className="w-2 h-2 rounded-full bg-[#e6eaee]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-black tracking-tight text-white">ID Card Studio</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              CMYK 300DPI
            </span>
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center bg-[#1c2229] rounded-lg p-0.5 border border-[#2a3440] ml-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#28323c] transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#28323c] transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Side Switch & Orientation & Zoom */}
      <div className="flex items-center gap-3">
        {/* Front / Back Switch */}
        <div className="flex items-center bg-[#1c2229] rounded-lg p-0.5 border border-[#2a3440]">
          <button
            onClick={() => onSideChange('front')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeSide === 'front'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Front Side
          </button>
          <button
            onClick={() => onSideChange('back')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeSide === 'back'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Back Side
          </button>
        </div>

        {/* Orientation Toggle */}
        <div className="hidden md:flex items-center bg-[#1c2229] rounded-lg p-0.5 border border-[#2a3440]">
          <button
            onClick={() => onOrientationChange('landscape')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              orientation === 'landscape'
                ? 'bg-[#2a3543] text-white shadow-xs'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="CR80 Landscape: 85.6 x 54 mm"
          >
            Landscape (85.6×54)
          </button>
          <button
            onClick={() => onOrientationChange('portrait')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              orientation === 'portrait'
                ? 'bg-[#2a3543] text-white shadow-xs'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="CR80 Portrait: 54 x 85.6 mm"
          >
            Portrait (54×85.6)
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden lg:flex items-center bg-[#1c2229] rounded-lg p-0.5 border border-[#2a3440]">
          <button
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
            className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs font-mono font-bold text-gray-300 select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(3.0, zoom + 0.1))}
            className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onZoomChange(1.0)}
            className="p-1 rounded text-gray-400 hover:text-white cursor-pointer"
            title="Reset Zoom to 100%"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>

        {/* Snap to Grid Toggle */}
        <button
          onClick={onSnapToggle}
          className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            snapToGrid
              ? 'bg-blue-950/70 border-blue-600 text-blue-300'
              : 'bg-[#1c2229] border-[#2a3440] text-gray-400 hover:text-gray-200'
          }`}
          title="Snap to 1 mm Grid"
        >
          <Magnet className="w-3 h-3" />
          <span className="hidden xl:inline">Snap</span>
        </button>
      </div>

      {/* Right: Preflight, Save, Bulk, Export CMYK */}
      <div className="flex items-center gap-2">
        {/* Preflight Badge */}
        <button
          onClick={onOpenPreflight}
          className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
            preflightCount.fix > 0
              ? 'bg-rose-950 border-rose-700 text-rose-300 animate-pulse'
              : preflightCount.check > 0
              ? 'bg-amber-950 border-amber-700 text-amber-300'
              : 'bg-emerald-950 border-emerald-700 text-emerald-300'
          }`}
          title="Preflight Quality & Print Check"
        >
          {preflightCount.fix > 0 || preflightCount.check > 0 ? (
            <AlertTriangle className="w-3 h-3 text-amber-400" />
          ) : (
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
          )}
          <span>
            {preflightCount.fix > 0
              ? `${preflightCount.fix} Print Fixes`
              : preflightCount.check > 0
              ? `${preflightCount.check} Warnings`
              : 'Preflight OK'}
          </span>
        </button>

        {/* Save Template */}
        <button
          onClick={onSaveTemplate}
          className="px-2.5 py-1.5 rounded-lg bg-[#1c2229] hover:bg-[#28323c] text-xs font-semibold text-gray-300 hover:text-white border border-[#2a3440] flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Save Current Design as Reusable Template"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Save Template</span>
        </button>

        {/* Bulk Generation & Print Sheet */}
        <button
          onClick={onOpenBulkModal}
          className="px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Generate Batch Duplex Cards & A4 Print Sheets"
        >
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Bulk Cards</span>
        </button>

        {/* Commercial CMYK Export */}
        <button
          onClick={onQuickExportPdf}
          disabled={isExporting}
          className="px-3.5 py-1.5 rounded-lg bg-[#00a6d6] hover:bg-[#0092bd] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          title="Export Print-Ready DeviceCMYK PDF with Bleed and Crop Marks"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? `Exporting (${exportProgress || 0}%)` : 'Export CMYK PDF'}</span>
        </button>
      </div>
    </header>
  );
};

