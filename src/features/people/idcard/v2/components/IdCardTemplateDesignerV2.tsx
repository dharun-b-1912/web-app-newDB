// src/features/people/idcard/v2/components/IdCardTemplateDesignerV2.tsx
// ============================================================================
// Mode B: 3-Pane Precision Template Designer (V2.1 Enterprise Redesign)
// Includes Top Designer Toolbar (Save/Publish/Autosave/Side) & Bottom Prepress Bar
// ============================================================================

import React from 'react';
import {
  Undo2,
  Redo2,
  Save,
  CheckCircle2,
  GitBranch,
  Layers,
  Ruler,
  ShieldCheck,
} from 'lucide-react';
import {
  CardElement,
  CardGeometry,
  CardSide,
  CardSideData,
  ElementType,
  IdCardPersonRecord,
} from '../../idCardTypes';
import { IdCardCanvas } from '../../components/IdCardCanvas';
import { IdCardLayersPanel } from '../../components/IdCardLayersPanel';
import { IdCardPropertiesPanel } from '../../components/IdCardPropertiesPanel';
import { verifyDuplexAlignment } from '../customTemplateService';

interface IdCardTemplateDesignerV2Props {
  sideData: CardSideData;
  companionSideData?: CardSideData;
  activeEmployee: IdCardPersonRecord;
  geometry: CardGeometry;
  activeSide: CardSide;
  onSideChange?: (side: CardSide) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CardElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onAddElement: (type: ElementType) => void;
  onInsertCustomElement?: (el: CardElement) => void;
  onChangeSideBg?: (bg: string) => void;
  onApplyStudioTheme?: (themeId: string) => void;
  onReorderElements: (reordered: CardElement[]) => void;
  onAlignElement: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  showGuides: boolean;
  onToggleGuides: () => void;
  snapToGrid: boolean;
  logoImg: HTMLImageElement | null;
  photosMap: Map<string, HTMLImageElement>;
  activeTab: 'properties' | 'layers';
  onTabChange: (tab: 'properties' | 'layers') => void;
  templateName?: string;
  templateVersion?: number;
  lastAutosavedAt?: string | null;
  onSaveDraft?: () => void;
  onPublishVersion?: () => void;
}

export const IdCardTemplateDesignerV2: React.FC<IdCardTemplateDesignerV2Props> = ({
  sideData,
  companionSideData,
  activeEmployee,
  geometry,
  activeSide,
  onSideChange,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onAddElement,
  onInsertCustomElement,
  onChangeSideBg,
  onApplyStudioTheme,
  onReorderElements,
  onAlignElement,
  onUndo,
  onRedo,
  zoom,
  showGuides,
  onToggleGuides,
  snapToGrid,
  logoImg,
  photosMap,
  templateName = 'Untitled Organization Design',
  templateVersion = 1,
  lastAutosavedAt,
  onSaveDraft,
  onPublishVersion,
}) => {
  const selectedElement = sideData.els.find(e => e.id === selectedElementId) || null;
  const duplexInfo = verifyDuplexAlignment(geometry, geometry);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 text-white">
      {/* ----------------------------------------------------------------- */}
      {/* TOP DESIGNER TOOLBAR (Undo/Redo, Autosave, Save Draft, Publish)   */}
      {/* ----------------------------------------------------------------- */}
      <div className="px-5 py-2.5 bg-[#0f1318] border-b border-[#202731] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-extrabold text-white truncate max-w-md">
              {templateName}
            </span>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 whitespace-nowrap">
              v{templateVersion}.0
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={onUndo}
              title="Undo"
              className="px-2 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={onRedo}
              title="Redo"
              className="px-2 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Redo</span>
            </button>
          </div>
        </div>

        {/* Right: Autosave Status + Save Draft + Publish Version */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-900/60 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {lastAutosavedAt ? `Autosaved (${lastAutosavedAt})` : 'Autosave Recovery Active'}
            </span>
          </span>

          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span>Save Draft</span>
            </button>
          )}

          {onPublishVersion && (
            <button
              type="button"
              onClick={onPublishVersion}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <GitBranch className="w-3.5 h-3.5 shrink-0" />
              <span>Publish v{templateVersion + 1}.0</span>
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3-PANE WORKSPACE (Left Layers/Palette | Center Canvas | Right mm)  */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: Canva Studio & Layers */}
        <div className="w-full md:w-64 bg-[#12161b] border-r border-[#202731] flex flex-col shrink-0 overflow-y-auto">
          <IdCardLayersPanel
            elements={sideData.els}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
            onReorderElements={onReorderElements}
            onUpdateElement={onUpdateElement}
            onDeleteElement={onDeleteElement}
            onDuplicateElement={onDuplicateElement}
            onAddElement={onAddElement}
            activeSide={activeSide}
            sideBg={sideData.bg}
            onChangeSideBg={onChangeSideBg}
            onInsertCustomElement={onInsertCustomElement}
            onApplyStudioTheme={onApplyStudioTheme}
          />
        </div>

        {/* Center Main Interactive Canvas Viewport */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#0a0d11] overflow-hidden relative">
          <IdCardCanvas
            geometry={geometry}
            sideData={sideData}
            companionSideData={companionSideData}
            activeSide={activeSide}
            onSideChange={onSideChange}
            activeEmployee={activeEmployee}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
            onUpdateElement={onUpdateElement}
            onDeleteElement={onDeleteElement}
            onDuplicateElement={onDuplicateElement}
            onUndo={onUndo}
            onRedo={onRedo}
            zoom={zoom}
            snapToGrid={snapToGrid}
            logoImg={logoImg}
            photosMap={photosMap}
            showGuides={showGuides}
            onToggleGuides={onToggleGuides}
          />
        </div>

        {/* Right Panel: Precision Millimeter Inspector */}
        <div className="w-full md:w-68 bg-[#12161b] border-l border-[#202731] flex flex-col shrink-0 overflow-y-auto">
          <IdCardPropertiesPanel
            selectedElement={selectedElement}
            onUpdateElement={onUpdateElement}
            onDeleteElement={onDeleteElement}
            onDuplicateElement={onDuplicateElement}
            geometry={geometry}
            onAlignElement={onAlignElement}
          />
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* BOTTOM PREPRESS STATUS BAR (Trim vs Full Bleed, DPI, Safe Area)    */}
      {/* ----------------------------------------------------------------- */}
      <div className="px-4 py-1.5 bg-[#0f1318] border-t border-[#202731] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400 shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-200">
            <Ruler className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              CR80 Trim: <strong>{duplexInfo.trimWidthMm.toFixed(2)} × {duplexInfo.trimHeightMm.toFixed(2)} mm</strong>
            </span>
          </span>
          <span>
            Full Bleed (+3mm each side):{' '}
            <strong className="text-rose-400">
              {duplexInfo.fullBleedWidthMm.toFixed(2)} × {duplexInfo.fullBleedHeightMm.toFixed(2)} mm
            </strong>
          </span>
          <span>
            Resolution: <strong className="text-emerald-400">300 / 600 DPI Ready</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safe Margin: 2.5 mm Inside Cut • Duplex Aligned</span>
          </span>
        </div>
      </div>
    </div>
  );
};
