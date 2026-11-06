// src/features/people/idcard/components/IdCardLayersPanel.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Canva-Efficient Creative Studio & Layers Dock
// Includes 1-Click Canva Themes, Creative Typography/Sticker Blocks,
// Background Color Swatches, and Z-Index Layer Stack.
// ============================================================================

import React, { useState } from 'react';
import {
  CardElement,
  CardSide,
  ElementType,
} from '../idCardTypes';
import { CANVA_STUDIO_THEMES } from '../v2/canvaStudioThemes';
import {
  Type,
  Image as ImageIcon,
  Square,
  QrCode,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  Palette,
  Wand2,
} from 'lucide-react';

interface IdCardLayersPanelProps {
  elements: CardElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onReorderElements: (newElements: CardElement[]) => void;
  onUpdateElement: (id: string, updates: Partial<CardElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onAddElement: (type: ElementType) => void;
  activeSide: CardSide;
  sideBg?: string;
  onChangeSideBg?: (bg: string) => void;
  onInsertCustomElement?: (el: CardElement) => void;
  onApplyStudioTheme?: (themeId: string) => void;
}

const STUDIO_BG_SWATCHES = [
  { hex: '#ffe600', label: 'Cyber Yellow' },
  { hex: '#0a0a0a', label: 'Matte Black' },
  { hex: '#090d16', label: 'Obsidian' },
  { hex: '#faf8f5', label: 'Warm Paper' },
  { hex: '#ffffff', label: 'Pure White' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#ff3b30', label: 'Vermilion' },
  { hex: '#1e293b', label: 'Slate Ink' },
];

export const IdCardLayersPanel: React.FC<IdCardLayersPanelProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onReorderElements,
  onUpdateElement,
  onAddElement,
  activeSide,
  sideBg = '#ffffff',
  onChangeSideBg,
  onInsertCustomElement,
  onApplyStudioTheme,
}) => {
  const [subTab, setSubTab] = useState<'canva' | 'layers'>('canva');

  // Move layer up/down
  const moveLayer = (idx: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= elements.length) return;

    const copy = [...elements];
    const item = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = item;
    onReorderElements(copy);
  };

  const getElementLabel = (el: CardElement) => {
    if (el.type === 'text') {
      const firstLine = el.text.split('\n')[0].trim();
      if (el.hollow) return `${firstLine} (Outline)`;
      if (el.rotation === 270 || el.rotation === 90) return `${firstLine} (Vertical)`;
      return firstLine || 'Empty Text';
    }
    if (el.type === 'image') {
      if (el.src === 'photo') {
        return el.shape === 'arch' ? 'Arch Cutout Portrait' : 'Employee Photo';
      }
      if (el.src === 'logo') return 'Company Logo';
      return el.srcName || 'Custom Graphic';
    }
    if (el.type === 'rect') {
      if (el.graphicKind === 'doodle_arrow') return 'Looped Doodle Arrow';
      if (el.graphicKind === 'icon_phone') return 'Phone Icon';
      if (el.graphicKind === 'icon_mail') return 'Email Icon';
      if (el.graphicKind === 'icon_pin') return 'Location Pin Icon';
      if (el.graphicKind === 'wave_header') return 'Wave Header';
      if (el.graphicKind === 'halftone_dots') return 'Halftone Dots';
      return `Shape (${el.w}×${el.h}mm)`;
    }
    if (el.type === 'qr') {
      return el.caption ? `Framed QR (${el.caption})` : 'Verification QR';
    }
    return 'Element';
  };

  const insertPresetElement = (preset: string) => {
    if (!onInsertCustomElement) {
      onAddElement('text');
      return;
    }
    const id = `el_${preset}_${Date.now()}`;
    if (preset === 'vert_solid') {
      onInsertCustomElement({
        id,
        type: 'text',
        x: -16,
        y: 48,
        w: 48,
        h: 10,
        rotation: 270,
        text: 'GRAPHIC',
        font: 'Poppins',
        size: 23,
        weight: 800,
        color: '#0a0a0a',
        align: 'left',
        uppercase: true,
        fit: false,
      });
    } else if (preset === 'vert_hollow') {
      onInsertCustomElement({
        id,
        type: 'text',
        x: -9,
        y: 48,
        w: 48,
        h: 10,
        rotation: 270,
        text: 'DESIGNER',
        font: 'Poppins',
        size: 22,
        weight: 800,
        color: '#0a0a0a',
        hollow: true,
        strokeColor: '#0a0a0a',
        strokeWidth: 1.15,
        align: 'left',
        uppercase: true,
        fit: false,
      });
    } else if (preset === 'hello_greeting') {
      onInsertCustomElement({
        id,
        type: 'text',
        x: 5.5,
        y: 6.5,
        w: 28,
        h: 11,
        text: "Hello, I'm\n{first_name}",
        font: 'Poppins',
        size: 13.5,
        weight: 700,
        color: '#0a0a0a',
        align: 'left',
        lineHeight: 1.08,
        fit: true,
      });
    } else if (preset === 'doodle_arrow') {
      onInsertCustomElement({
        id,
        type: 'rect',
        graphicKind: 'doodle_arrow',
        x: 18,
        y: 11,
        w: 11.5,
        h: 12.5,
        fill: '#0a0a0a',
        stroke: '#0a0a0a',
        strokeWidth: 0.48,
        radius: 0,
      });
    } else if (preset === 'arch_cutout_photo') {
      onInsertCustomElement({
        id,
        type: 'image',
        src: 'photo',
        shape: 'arch',
        fit: 'cover',
        filter: 'contrast_bw',
        shadow: true,
        x: 13.5,
        y: 27.6,
        w: 38.5,
        h: 58.0,
        radius: 18,
        border: 1.35,
        borderColor: '#ffffff',
      });
    } else if (preset === 'framed_qr') {
      onInsertCustomElement({
        id,
        type: 'qr',
        x: 13.5,
        y: 44.5,
        w: 27,
        h: 27.5,
        qrData: 'https://app.joypeoplehr.com/verify-id-card?emp={idno}',
        color: '#0a0a0a',
        bgColor: '#ffffff',
        frameRadius: 2.2,
        caption: '_{idno}_',
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#13171c] w-full text-[#e6eaee] text-xs select-none">
      {/* Top Mode Switcher: Canva Studio vs Layers Stack */}
      <div className="p-2.5 border-b border-[#252d37] bg-[#181d24]">
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#0f1318] border border-[#252d37] mb-2.5">
          <button
            type="button"
            onClick={() => setSubTab('canva')}
            className={`py-1.5 rounded-md font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'canva'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Canva Studio</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('layers')}
            className={`py-1.5 rounded-md font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'layers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers ({elements.length})</span>
          </button>
        </div>

        {/* Standard Quick-Add Row (Always Accessible) */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => onAddElement('text')}
            className="px-2 py-1.5 rounded-lg bg-[#111418] hover:bg-[#252d37] border border-[#2c3642] flex flex-col items-center gap-1 text-[10px] text-gray-300 hover:text-white cursor-pointer transition-colors"
            title="Add Text Element"
          >
            <Type className="w-3.5 h-3.5 text-blue-400" />
            <span>+ Text</span>
          </button>

          <button
            onClick={() => onAddElement('image')}
            className="px-2 py-1.5 rounded-lg bg-[#111418] hover:bg-[#252d37] border border-[#2c3642] flex flex-col items-center gap-1 text-[10px] text-gray-300 hover:text-white cursor-pointer transition-colors"
            title="Add Image or Photo Box"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Photo</span>
          </button>

          <button
            onClick={() => onAddElement('rect')}
            className="px-2 py-1.5 rounded-lg bg-[#111418] hover:bg-[#252d37] border border-[#2c3642] flex flex-col items-center gap-1 text-[10px] text-gray-300 hover:text-white cursor-pointer transition-colors"
            title="Add Rectangle or Graphic Sticker"
          >
            <Square className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Shape</span>
          </button>

          <button
            onClick={() => onAddElement('qr')}
            className="px-2 py-1.5 rounded-lg bg-[#111418] hover:bg-[#252d37] border border-[#2c3642] flex flex-col items-center gap-1 text-[10px] text-gray-300 hover:text-white cursor-pointer transition-colors"
            title="Add Dynamic Verification QR"
          >
            <QrCode className="w-3.5 h-3.5 text-purple-400" />
            <span>+ QR</span>
          </button>
        </div>
      </div>

      {/* BODY CONTENT */}
      {subTab === 'canva' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* 1. 1-Click Canva Studio Themes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Canva Studio Themes (Front + Back)</span>
              </span>
            </div>
            <div className="space-y-2">
              {CANVA_STUDIO_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onApplyStudioTheme && onApplyStudioTheme(theme.id)}
                  className="w-full text-left p-2.5 rounded-xl bg-[#181d24] hover:bg-[#1f2630] border border-[#27313d] hover:border-emerald-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: theme.frontBg }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 -ml-2 shrink-0"
                        style={{ backgroundColor: theme.backBg }}
                      />
                      <span className="font-bold text-white text-[11px] group-hover:text-emerald-300 transition-colors">
                        {theme.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 shrink-0">
                      {theme.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-snug">
                    {theme.tagline}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Side Background Swatches */}
          {onChangeSideBg && (
            <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-amber-400" />
                  <span>{activeSide === 'front' ? 'Front' : 'Back'} Background Color</span>
                </span>
                <input
                  type="color"
                  value={sideBg.startsWith('#') ? sideBg : '#ffe600'}
                  onChange={e => onChangeSideBg(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  title="Custom Hex Color"
                />
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {STUDIO_BG_SWATCHES.map(sw => (
                  <button
                    key={sw.hex}
                    type="button"
                    onClick={() => onChangeSideBg(sw.hex)}
                    title={sw.label}
                    className={`w-6 h-6 rounded-md border transition-transform cursor-pointer hover:scale-110 ${
                      sideBg.toLowerCase() === sw.hex
                        ? 'border-emerald-400 ring-2 ring-emerald-500/30'
                        : 'border-white/20'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. 1-Click Canva Creative Blocks */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              1-Click Canva Creative Blocks
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => insertPresetElement('vert_solid')}
                className="p-2 rounded-lg bg-[#181d24] hover:bg-[#222933] border border-[#27313d] text-left cursor-pointer"
              >
                <div className="font-extrabold text-[11px] text-amber-300">Vertical -90° Title</div>
                <div className="text-[9px] text-gray-400">Rotated bold display text</div>
              </button>

              <button
                type="button"
                onClick={() => insertPresetElement('vert_hollow')}
                className="p-2 rounded-lg bg-[#181d24] hover:bg-[#222933] border border-[#27313d] text-left cursor-pointer"
              >
                <div className="font-extrabold text-[11px] text-cyan-300">Hollow Outline -90°</div>
                <div className="text-[9px] text-gray-400">Stroked knockout display</div>
              </button>

              <button
                type="button"
                onClick={() => insertPresetElement('hello_greeting')}
                className="p-2 rounded-lg bg-[#181d24] hover:bg-[#222933] border border-[#27313d] text-left cursor-pointer"
              >
                <div className="font-bold text-[11px] text-white">Hello, I'm &#123;first_name&#125;</div>
                <div className="text-[9px] text-gray-400">Friendly badge header</div>
              </button>

              <button
                type="button"
                onClick={() => insertPresetElement('doodle_arrow')}
                className="p-2 rounded-lg bg-[#181d24] hover:bg-[#222933] border border-[#27313d] text-left cursor-pointer"
              >
                <div className="font-bold text-[11px] text-emerald-300">Looped Doodle Arrow</div>
                <div className="text-[9px] text-gray-400">Dashed vector pointer</div>
              </button>

              <button
                type="button"
                onClick={() => insertPresetElement('arch_cutout_photo')}
                className="p-2 rounded-lg bg-[#181d24] hover:bg-[#222933] border border-[#27313d] text-left cursor-pointer"
              >
                <div className="font-bold text-[11px] text-pink-300">Arch Cutout Photo</div>
                <div className="text-[9px] text-gray-400">B&W + white sticker rim</div>
              </button>

              <button
                type="button"
                onClick={() => insertPresetElement('framed_qr')}
                className="p-2 rounded-lg bg-[#181d24] hover:bg-[#222933] border border-[#27313d] text-left cursor-pointer"
              >
                <div className="font-bold text-[11px] text-purple-300">Framed QR Card</div>
                <div className="text-[9px] text-gray-400">White card + @handle</div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Layer Stack Tab */
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {elements.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              No elements on {activeSide} side.<br />
              Click buttons above to add.
            </div>
          ) : (
            elements.map((el, idx) => {
              const isSelected = el.id === selectedElementId;
              return (
                <div
                  key={el.id}
                  onClick={() => onSelectElement(el.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/60 border-blue-500 text-white shadow-xs'
                      : 'bg-[#181d24] border-[#252d37] text-gray-300 hover:bg-[#1f2630]'
                  }`}
                >
                  {/* Type Icon & Label */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {el.type === 'text' && <Type className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    {el.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {el.type === 'rect' && <Square className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {el.type === 'qr' && <QrCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />}

                    <span className="truncate font-medium text-xs">
                      {getElementLabel(el)}
                    </span>
                  </div>

                  {/* Layer Control Icons */}
                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    <button
                      onClick={e => moveLayer(idx, 'up', e)}
                      disabled={idx === 0}
                      className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Bring Forward"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={e => moveLayer(idx, 'down', e)}
                      disabled={idx === elements.length - 1}
                      className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Send Backward"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onUpdateElement(el.id, { locked: !el.locked });
                      }}
                      className={`p-1 rounded cursor-pointer ${el.locked ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
                      title={el.locked ? 'Unlock' : 'Lock'}
                    >
                      {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onUpdateElement(el.id, { hidden: !el.hidden });
                      }}
                      className={`p-1 rounded cursor-pointer ${el.hidden ? 'text-rose-400' : 'text-gray-500 hover:text-gray-300'}`}
                      title={el.hidden ? 'Show' : 'Hide'}
                    >
                      {el.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
