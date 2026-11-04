// src/features/people/idcard/components/IdCardPropertiesPanel.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Precision Properties & Dynamic Chip Panel
// ============================================================================

import React from 'react';
import {
  CardElement,
  CardGeometry,
  TextElement,
  ImageElement,
  RectElement,
  QrElement,
  ID_CARD_FONTS,
  DYNAMIC_FIELD_CHIPS,
} from '../idCardTypes';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Type,
  Image as ImageIcon,
  Square,
  QrCode,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface IdCardPropertiesPanelProps {
  selectedElement: CardElement | null;
  onUpdateElement: (id: string, updates: Partial<CardElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  geometry: CardGeometry;
  onAlignElement: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
}

export const IdCardPropertiesPanel: React.FC<IdCardPropertiesPanelProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  geometry,
  onAlignElement,
}) => {
  if (!selectedElement) {
    return (
      <aside className="w-80 bg-[#13171c] border-l border-[#252d37] p-5 flex flex-col justify-between text-gray-400 select-none overflow-y-auto">
        <div className="flex flex-col items-center text-center py-10">
          <div className="w-12 h-12 rounded-full bg-[#1c2229] border border-[#2c3642] flex items-center justify-center mb-3 text-blue-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-200 mb-1">No Element Selected</h4>
          <p className="text-xs text-gray-400 leading-relaxed max-w-[220px]">
            Click any element on the card to edit its physical millimetre coordinates, typography, or styling.
          </p>
        </div>

        {/* Card Dimensions Card */}
        <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-3.5 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Active Card Specifications
          </div>
          <div className="space-y-1.5 font-mono text-gray-300">
            <div className="flex justify-between">
              <span>Card Size:</span>
              <strong className="text-white">{geometry.w} × {geometry.h} mm</strong>
            </div>
            <div className="flex justify-between">
              <span>Orientation:</span>
              <strong className="text-blue-400 uppercase">{geometry.orientation}</strong>
            </div>
            <div className="flex justify-between">
              <span>Bleed:</span>
              <strong className="text-cyan-400">+{geometry.bleed} mm</strong>
            </div>
            <div className="flex justify-between">
              <span>Safe Margin:</span>
              <strong className="text-emerald-400">-{geometry.safe} mm</strong>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const el = selectedElement;

  return (
    <aside className="w-80 bg-[#13171c] border-l border-[#252d37] flex flex-col h-full text-[#e6eaee] text-xs select-none overflow-hidden">
      {/* Header with Element Type & Quick Actions */}
      <div className="h-12 border-b border-[#252d37] px-4 flex items-center justify-between shrink-0 bg-[#181d24]">
        <div className="flex items-center gap-2">
          {el.type === 'text' && <Type className="w-4 h-4 text-blue-400" />}
          {el.type === 'image' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
          {el.type === 'rect' && <Square className="w-4 h-4 text-amber-400" />}
          {el.type === 'qr' && <QrCode className="w-4 h-4 text-purple-400" />}
          <span className="font-bold text-gray-200 uppercase tracking-wide text-[11px]">
            {el.type} Properties
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Lock / Unlock */}
          <button
            onClick={() => onUpdateElement(el.id, { locked: !el.locked })}
            className={`p-1.5 rounded hover:bg-[#252d37] transition-colors cursor-pointer ${
              el.locked ? 'text-amber-400' : 'text-gray-400'
            }`}
            title={el.locked ? 'Unlock Element' : 'Lock Element'}
          >
            {el.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Hide / Show */}
          <button
            onClick={() => onUpdateElement(el.id, { hidden: !el.hidden })}
            className="p-1.5 rounded hover:bg-[#252d37] text-gray-400 hover:text-white transition-colors cursor-pointer"
            title={el.hidden ? 'Show Element' : 'Hide Element'}
          >
            {el.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* Duplicate */}
          <button
            onClick={() => onDuplicateElement(el.id)}
            className="p-1.5 rounded hover:bg-[#252d37] text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDeleteElement(el.id)}
            className="p-1.5 rounded hover:bg-rose-950/60 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Delete (Delete/Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. Precise Millimeter Coordinates & Size */}
        <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
            Placement & Size (mm)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">X Position</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={el.x}
                  onChange={e => onUpdateElement(el.id, { x: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-2 top-1 text-[10px] text-gray-500 font-mono">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Y Position</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={el.y}
                  onChange={e => onUpdateElement(el.id, { y: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-2 top-1 text-[10px] text-gray-500 font-mono">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Width</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={el.w}
                  onChange={e => onUpdateElement(el.id, { w: Math.max(1, parseFloat(e.target.value) || 1) })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-2 top-1 text-[10px] text-gray-500 font-mono">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Height</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={el.h}
                  onChange={e => onUpdateElement(el.id, { h: Math.max(1, parseFloat(e.target.value) || 1) })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <span className="absolute right-2 top-1 text-[10px] text-gray-500 font-mono">mm</span>
              </div>
            </div>
          </div>

          {/* Rotation & Opacity */}
          <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-[#252d37]">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Rotation (°)</label>
              <input
                type="number"
                min="0"
                max="360"
                value={el.rotation || 0}
                onChange={e => onUpdateElement(el.id, { rotation: (parseInt(e.target.value) || 0) % 360 })}
                className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Opacity (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round((typeof el.opacity === 'number' ? el.opacity : 1) * 100)}
                onChange={e => onUpdateElement(el.id, { opacity: Math.min(1, Math.max(0, parseInt(e.target.value) || 100) / 100) })}
                className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Alignment Toolbar */}
        <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Card Alignment
          </div>
          <div className="grid grid-cols-6 gap-1 bg-[#111418] p-1 rounded-lg border border-[#252d37]">
            <button
              onClick={() => onAlignElement('left')}
              className="p-1.5 rounded hover:bg-[#252d37] text-gray-400 hover:text-white flex justify-center cursor-pointer"
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlignElement('center')}
              className="p-1.5 rounded hover:bg-[#252d37] text-gray-400 hover:text-white flex justify-center cursor-pointer"
              title="Align Center Horizontal"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlignElement('right')}
              className="p-1.5 rounded hover:bg-[#252d37] text-gray-400 hover:text-white flex justify-center cursor-pointer"
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlignElement('top')}
              className="p-1.5 rounded hover:bg-[#252d37] text-gray-400 hover:text-white flex justify-center cursor-pointer"
              title="Align Top"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlignElement('middle')}
              className="p-1.5 rounded hover:bg-[#252d37] text-gray-400 hover:text-white flex justify-center cursor-pointer"
              title="Align Middle Vertical"
            >
              <AlignJustify className="w-3.5 h-3.5 rotate-90" />
            </button>
            <button
              onClick={() => onAlignElement('bottom')}
              className="p-1.5 rounded hover:bg-[#252d37] text-gray-400 hover:text-white flex justify-center cursor-pointer"
              title="Align Bottom"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. Text Element Properties */}
        {el.type === 'text' && (
          <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-3 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              Typography & Text
            </div>

            {/* Content Textarea */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Content / Template</label>
              <textarea
                rows={3}
                value={(el as TextElement).text}
                onChange={e => onUpdateElement(el.id, { text: e.target.value })}
                className="w-full bg-[#111418] border border-[#2d3744] rounded p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                placeholder="Enter text or dynamic {fields}..."
              />
            </div>

            {/* Dynamic Field Chips */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1.5">Insert Dynamic HR Field:</label>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1 bg-[#111418] rounded-lg border border-[#252d37]">
                {DYNAMIC_FIELD_CHIPS.map(chip => (
                  <button
                    key={chip.field}
                    onClick={() => {
                      const cur = (el as TextElement).text;
                      const next = cur ? `${cur} ${chip.field}` : chip.field;
                      onUpdateElement(el.id, { text: next });
                    }}
                    className="px-2 py-0.5 rounded bg-[#1c232c] hover:bg-blue-600 hover:text-white text-[10px] font-mono text-blue-300 border border-[#2b3746] transition-colors cursor-pointer"
                    title={`Example: ${chip.example}`}
                  >
                    {chip.field}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family & Size */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Font</label>
                <select
                  value={(el as TextElement).font}
                  onChange={e => onUpdateElement(el.id, { font: e.target.value })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {ID_CARD_FONTS.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Font Size (pt)</label>
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="48"
                  value={(el as TextElement).size}
                  onChange={e => onUpdateElement(el.id, { size: parseFloat(e.target.value) || 9 })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Font Weight & Color */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Weight</label>
                <select
                  value={(el as TextElement).weight}
                  onChange={e => onUpdateElement(el.id, { weight: parseInt(e.target.value) || 400 })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={400}>Regular (400)</option>
                  <option value={500}>Medium (500)</option>
                  <option value={600}>SemiBold (600)</option>
                  <option value={700}>Bold (700)</option>
                  <option value={800}>ExtraBold (800)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={(el as TextElement).color || '#14181c'}
                    onChange={e => onUpdateElement(el.id, { color: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border border-[#2d3744] bg-transparent"
                  />
                  <input
                    type="text"
                    value={(el as TextElement).color}
                    onChange={e => onUpdateElement(el.id, { color: e.target.value })}
                    className="flex-1 bg-[#111418] border border-[#2d3744] rounded px-1.5 py-1 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Alignment & Options */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 bg-[#111418] p-0.5 rounded border border-[#252d37]">
                {(['left', 'center', 'right'] as const).map(al => (
                  <button
                    key={al}
                    onClick={() => onUpdateElement(el.id, { align: al })}
                    className={`px-2 py-1 rounded capitalize text-xs ${
                      (el as TextElement).align === al ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {al}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                <input
                  type="checkbox"
                  checked={(el as TextElement).fit}
                  onChange={e => onUpdateElement(el.id, { fit: e.target.checked })}
                  className="rounded border-[#2d3744] text-blue-600 focus:ring-0"
                />
                <span className="text-[11px]">Auto-Shrink</span>
              </label>
            </div>
          </div>
        )}

        {/* 4. Image Element Properties */}
        {el.type === 'image' && (
          <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-3 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Image & Frame Settings
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Image Source</label>
              <select
                value={(el as ImageElement).src}
                onChange={e => onUpdateElement(el.id, { src: e.target.value as any })}
                className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="photo">Employee Photo (from Workforce)</option>
                <option value="logo">Company Logo</option>
                <option value="custom">Custom Graphic</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Shape</label>
                <select
                  value={(el as ImageElement).shape}
                  onChange={e => onUpdateElement(el.id, { shape: e.target.value as any })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="rect">Rectangle</option>
                  <option value="rounded">Rounded Box</option>
                  <option value="circle">Circle / Halo</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Fit Mode</label>
                <select
                  value={(el as ImageElement).fit}
                  onChange={e => onUpdateElement(el.id, { fit: e.target.value as any })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="cover">Cover (Fill & Crop)</option>
                  <option value="contain">Contain (Preserve Aspect)</option>
                </select>
              </div>
            </div>

            {(el as ImageElement).shape === 'rounded' && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Corner Radius</span>
                  <span className="font-mono">{(el as ImageElement).radius} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={(el as ImageElement).radius}
                  onChange={e => onUpdateElement(el.id, { radius: parseFloat(e.target.value) || 0 })}
                  className="w-full accent-blue-500"
                />
              </div>
            )}

            {/* Border settings */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#252d37]">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Border (mm)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.2"
                  value={(el as ImageElement).border || 0}
                  onChange={e => onUpdateElement(el.id, { border: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Border Color</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={(el as ImageElement).borderColor || '#ffffff'}
                    onChange={e => onUpdateElement(el.id, { borderColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border border-[#2d3744] bg-transparent"
                  />
                  <input
                    type="text"
                    value={(el as ImageElement).borderColor || '#ffffff'}
                    onChange={e => onUpdateElement(el.id, { borderColor: e.target.value })}
                    className="flex-1 bg-[#111418] border border-[#2d3744] rounded px-1.5 py-1 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Shape / Rect Element Properties */}
        {el.type === 'rect' && (
          <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-3 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Shape & Fill Color
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Fill Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(el as RectElement).fill}
                  onChange={e => onUpdateElement(el.id, { fill: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-[#2d3744] bg-transparent"
                />
                <input
                  type="text"
                  value={(el as RectElement).fill}
                  onChange={e => onUpdateElement(el.id, { fill: e.target.value })}
                  className="flex-1 bg-[#111418] border border-[#2d3744] rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Corner Radius</span>
                <span className="font-mono">{(el as RectElement).radius || 0} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={(el as RectElement).radius || 0}
                onChange={e => onUpdateElement(el.id, { radius: parseFloat(e.target.value) || 0 })}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        )}

        {/* 6. QR Code Element Properties */}
        {el.type === 'qr' && (
          <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-3 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Verification QR Code
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Target Verification URL / Data</label>
              <textarea
                rows={2}
                value={(el as QrElement).qrData}
                onChange={e => onUpdateElement(el.id, { qrData: e.target.value })}
                className="w-full bg-[#111418] border border-[#2d3744] rounded p-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">QR Color</label>
                <input
                  type="color"
                  value={(el as QrElement).color || '#000000'}
                  onChange={e => onUpdateElement(el.id, { color: e.target.value })}
                  className="w-full h-7 rounded cursor-pointer border border-[#2d3744] bg-transparent"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Background</label>
                <input
                  type="color"
                  value={(el as QrElement).bgColor || '#ffffff'}
                  onChange={e => onUpdateElement(el.id, { bgColor: e.target.value })}
                  className="w-full h-7 rounded cursor-pointer border border-[#2d3744] bg-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

