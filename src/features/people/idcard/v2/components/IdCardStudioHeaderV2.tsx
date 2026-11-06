// src/features/people/idcard/v2/components/IdCardStudioHeaderV2.tsx
// ============================================================================
// Regrouped High-Productivity Header for ID Card Studio V2
// Max 6 primary actions per mode at 1440px viewport.
// ============================================================================

import React from 'react';
import {
  ArrowLeft,
  Eye,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Sparkles,
  Layers,
  Settings2,
} from 'lucide-react';
import { CardSide, PreflightIssue } from '../../idCardTypes';
import { IssueStep, StudioMode } from '../types';

interface IdCardStudioHeaderV2Props {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  step: IssueStep;
  onStepChange: (step: IssueStep) => void;
  activeSide: CardSide;
  onSideChange: (side: CardSide) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onZoomFit: () => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  issues: PreflightIssue[];
  onOpenWarnings: () => void;
  selectedPeopleCount: number;
  isGenerating?: boolean;
  onPrimaryAction: () => void;
  onBackToPeople: () => void;
  onToggleV1V2: () => void;
}

export const IdCardStudioHeaderV2PropsDefault = {};

export const IdCardStudioHeaderV2: React.FC<IdCardStudioHeaderV2Props> = ({
  mode,
  onModeChange,
  step,
  onStepChange,
  activeSide,
  onSideChange,
  zoom,
  onZoomChange,
  onZoomFit,
  showGuides,
  onToggleGuides,
  issues,
  onOpenWarnings,
  selectedPeopleCount,
  isGenerating = false,
  onPrimaryAction,
  onBackToPeople,
  onToggleV1V2,
}) => {
  const warningCount = issues.filter(i => i.lv === 'check' || i.lv === 'fix').length;
  const showCanvasControls = mode === 'design' || step === 'review';

  // Determine primary CTA text based on current step and mode
  let primaryCtaText = 'Next: Select People';
  let PrimaryIcon = ArrowRight;

  if (mode === 'design') {
    primaryCtaText = 'Save Template';
    PrimaryIcon = Sparkles;
  } else {
    switch (step) {
      case 'template':
        primaryCtaText = `Next: Select People (${selectedPeopleCount})`;
        PrimaryIcon = ArrowRight;
        break;
      case 'people':
        primaryCtaText = `Next: Review & Fix (${selectedPeopleCount})`;
        PrimaryIcon = ArrowRight;
        break;
      case 'review':
        primaryCtaText = 'Next: Print Options';
        PrimaryIcon = ArrowRight;
        break;
      case 'generate':
        primaryCtaText = isGenerating ? 'Generating...' : `Generate ${selectedPeopleCount} Cards`;
        PrimaryIcon = Printer;
        break;
    }
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-5 py-3 flex items-center justify-between gap-4 shrink-0 select-none shadow-sm">
      {/* ------------------------------------------------------------- */}
      {/* GROUP 1 (LEFT): Navigation, Branding, Mode Switcher           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onBackToPeople}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Back to Workforce Directory"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          <span>Workforce</span>
        </button>

        <div className="h-5 w-px bg-slate-800 hidden sm:block shrink-0" />

        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 shrink-0" />
          <span className="font-extrabold text-sm tracking-tight text-white">ID Card Studio</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/50">
            V2
          </span>
        </div>

        {/* Mode Switcher Pill (Single-line labels, clean horizontal spacing) */}
        <div className="flex items-center p-1 rounded-xl bg-slate-800/90 border border-slate-700/70 ml-1 shrink-0">
          <button
            type="button"
            onClick={() => onModeChange('issue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              mode === 'issue'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Issue Cards
          </button>
          <button
            type="button"
            onClick={() => onModeChange('design')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              mode === 'design'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Edit Template
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GROUP 2 (CENTER): Contextual Canvas Controls (Design / Review)*/}
      {/* ------------------------------------------------------------- */}
      {showCanvasControls ? (
        <div className="flex items-center gap-2 shrink-0">
          {/* Front / Back Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-slate-700/70 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => onSideChange('front')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeSide === 'front'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => onSideChange('back')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeSide === 'back'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Back
            </button>
          </div>

          {/* Zoom Controls with 1-Click "Fit" */}
          <div className="hidden xl:flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700/70 text-xs whitespace-nowrap shrink-0">
            <button
              type="button"
              onClick={onZoomFit}
              className="px-2 py-0.5 rounded-md font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1"
              title="Auto-Fit Card to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span>Fit</span>
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(0.4, zoom - 0.1))}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] font-bold text-slate-200 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Guides Toggle Pill */}
          <button
            type="button"
            onClick={onToggleGuides}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showGuides
                ? 'bg-cyan-950/70 border-cyan-700/70 text-cyan-300'
                : 'bg-slate-800 border-slate-700/70 text-slate-300 hover:text-white'
            }`}
            title={showGuides ? 'Showing print bleed and cut guides' : 'Showing finished card preview'}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{showGuides ? 'Print Guides On' : 'Finished View'}</span>
          </button>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* ------------------------------------------------------------- */}
      {/* GROUP 3 (RIGHT): Warnings Drawer, Primary Contextual CTA       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Preflight Warnings Button */}
        <button
          type="button"
          onClick={onOpenWarnings}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border whitespace-nowrap ${
            warningCount > 0
              ? 'bg-amber-950/70 border-amber-700/60 text-amber-300 hover:bg-amber-900/80 shadow-xs'
              : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
          }`}
          title={`${warningCount} preflight items to review`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span>{warningCount > 0 ? `${warningCount} Warnings` : 'Preflight OK'}</span>
        </button>

        {/* V1 / V2 Switcher pill */}
        <button
          type="button"
          onClick={onToggleV1V2}
          className="hidden 2xl:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/60 transition-colors cursor-pointer whitespace-nowrap"
          title="Switch between Studio V2 and Legacy Press V1"
        >
          <span>V1/V2</span>
        </button>

        {/* The ONE Primary Contextual Stepper Button (Shown in Issue Mode; Design Mode uses the Designer Toolbar for Save Draft / Publish) */}
        {mode !== 'design' && (
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={isGenerating || (step === 'people' && selectedPeopleCount === 0)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              step === 'generate'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <PrimaryIcon className="w-4 h-4 shrink-0" />
            <span>{primaryCtaText}</span>
          </button>
        )}
      </div>
    </header>
  );
};

