// src/features/people/idcard/components/IdCardLayersPanel.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Element Layers & Quick Insert Bar
// ============================================================================

import React from 'react';
import {
  CardElement,
  CardSide,
  ElementType,
} from '../idCardTypes';
import {
  Plus,
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
  Trash2,
  Copy,
  Layers,
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
}

export const IdCardLayersPanel: React.FC<IdCardLayersPanelProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onReorderElements,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onAddElement,
  activeSide,
}) => {
  // Move layer up (higher in stack / forward)
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
      return firstLine || 'Empty Text';
    }
    if (el.type === 'image') {
      if (el.src === 'photo') return 'Employee Photo';
      if (el.src === 'logo') return 'Company Logo';
      return el.srcName || 'Custom Graphic';
    }
    if (el.type === 'rect') {
      return `Shape (${el.w}×${el.h}mm)`;
    }
    if (el.type === 'qr') {
      return 'Verification QR';
    }
    return 'Element';
  };

  return (
    <div className="flex flex-col h-full bg-[#13171c] border-l border-[#252d37] w-72 text-[#e6eaee] text-xs select-none">
      {/* Quick Add Elements Header */}
      <div className="p-3 border-b border-[#252d37] bg-[#181d24]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 font-bold text-gray-300 text-[11px] uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Layers ({activeSide.toUpperCase()})</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">{elements.length} items</span>
        </div>

        {/* Add Buttons */}
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
            title="Add Rectangle or Color Band"
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

      {/* Layer Stack (Rendered in Reverse so top layer is at top of UI) */}
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
                  {/* Reorder Up / Down */}
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

                  {/* Lock */}
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

                  {/* Hide */}
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
    </div>
  );
};

