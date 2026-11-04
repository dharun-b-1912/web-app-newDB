// src/features/people/idcard/components/IdCardArtworkCropModal.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Interactive Artwork Fit & Precision Crop Modal
// Interactive physical card viewport with zoom, pan, bleed guides, and non-destructive crop
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CardGeometry, BackgroundArtworkSettings, BackgroundCropSettings, BackgroundFitMode } from '../idCardTypes';
import { X, Crop, ZoomIn, ZoomOut, RotateCcw, Check, Move, Maximize2, RefreshCw } from 'lucide-react';

interface IdCardArtworkCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'front' | 'back';
  img: HTMLImageElement | null;
  geometry: CardGeometry;
  artwork?: BackgroundArtworkSettings;
  onApplyCrop: (crop: BackgroundCropSettings, fit: BackgroundFitMode, scale: number, x: number, y: number) => void;
}

export const IdCardArtworkCropModal: React.FC<IdCardArtworkCropModalProps> = ({
  isOpen,
  onClose,
  side,
  img,
  geometry,
  artwork,
  onApplyCrop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Crop / Transform state
  const [fit, setFit] = useState<BackgroundFitMode>(artwork?.fit || 'cover');
  const [scale, setScale] = useState<number>(artwork?.scale || 1.0);
  const [offsetX, setOffsetX] = useState<number>(artwork?.x || 0); // in mm
  const [offsetY, setOffsetY] = useState<number>(artwork?.y || 0); // in mm
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      setFit(artwork?.fit || 'cover');
      setScale(artwork?.scale || 1.0);
      setOffsetX(artwork?.x || 0);
      setOffsetY(artwork?.y || 0);
    }
  }, [isOpen, artwork]);

  // Display scale: 4.5 px/mm
  const previewScale = 4.0;
  const b = geometry.bleed;
  const totalW = (geometry.w + 2 * b) * previewScale;
  const totalH = (geometry.h + 2 * b) * previewScale;

  // Render Interactive Crop Preview
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = totalW;
    canvas.height = totalH;

    // Clear
    ctx.fillStyle = '#0f141a';
    ctx.fillRect(0, 0, totalW, totalH);

    ctx.save();
    ctx.scale(previewScale, previewScale);
    ctx.translate(b, b);

    // 1. Draw image with current fit, scale and offset
    const tw = geometry.w + 2 * b;
    const th = geometry.h + 2 * b;
    const iw = img.naturalWidth || img.width || 800;
    const ih = img.naturalHeight || img.height || 600;

    let dw = tw;
    let dh = th;

    if (fit === 'contain') {
      const s = Math.min(tw / iw, th / ih) * scale;
      dw = iw * s;
      dh = ih * s;
    } else if (fit === 'stretch') {
      dw = tw * scale;
      dh = th * scale;
    } else if (fit === 'original') {
      const s = (25.4 / 300) * scale;
      dw = iw * s;
      dh = ih * s;
    } else {
      // cover
      const s = Math.max(tw / iw, th / ih) * scale;
      dw = iw * s;
      dh = ih * s;
    }

    const dx = -b + (tw - dw) / 2 + offsetX;
    const dy = -b + (th - dh) / 2 + offsetY;

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, dx, dy, dw, dh);

    // 2. Draw Bleed Boundary (Cyan)
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(-b, -b, tw, th);

    // 3. Draw Cut Trim Line (Magenta)
    ctx.strokeStyle = '#e5007d';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([]);
    ctx.strokeRect(0, 0, geometry.w, geometry.h);

    // 4. Draw Safe Area (Green dashed)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(geometry.safe, geometry.safe, geometry.w - 2 * geometry.safe, geometry.h - 2 * geometry.safe);

    ctx.restore();
  }, [img, geometry, b, totalW, totalH, previewScale, fit, scale, offsetX, offsetY]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Drag interaction to reposition
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dxPx = e.clientX - dragStart.x;
    const dyPx = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    // Convert pixel delta to millimeters
    const dxMm = dxPx / previewScale;
    const dyMm = dyPx / previewScale;

    setOffsetX(prev => Math.round((prev + dxMm) * 10) / 10);
    setOffsetY(prev => Math.round((prev + dyMm) * 10) / 10);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApply = () => {
    const cropData: BackgroundCropSettings = {
      x: offsetX,
      y: offsetY,
      w: geometry.w,
      h: geometry.h,
    };
    onApplyCrop(cropData, fit, scale, offsetX, offsetY);
    onClose();
  };

  const handleReset = () => {
    setScale(1.0);
    setOffsetX(0);
    setOffsetY(0);
    setFit('cover');
  };

  if (!isOpen || !img) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-2xl bg-[#13171c] border border-[#252d37] rounded-2xl shadow-2xl flex flex-col text-[#e6eaee] overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-[#252d37] px-6 flex items-center justify-between shrink-0 bg-[#181d24]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/70 border border-blue-600/50 flex items-center justify-center text-blue-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {side.toUpperCase()} Background Artwork — Crop & Alignment Tool
              </h3>
              <p className="text-[11px] text-gray-400">
                Pan, zoom and frame artwork against {geometry.w} × {geometry.h} mm physical card dimensions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#111418] hover:bg-[#252d37] border border-[#2c3642] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Center Canvas Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-[#0a0c0e] border-b border-[#252d37] overflow-hidden">
          <div className="relative border border-[#27313d] rounded-lg shadow-xl overflow-hidden cursor-grab active:cursor-grabbing">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="block"
            />
          </div>

          <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e5ff]" /> Bleed (+{geometry.bleed} mm)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e5007d]" /> Cut Trim ({geometry.w} × {geometry.h} mm)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Safe Margin (-{geometry.safe} mm)
            </span>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-5 space-y-4 text-xs bg-[#13171c]">
          {/* Fit Mode Buttons */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
              Image Fitting Strategy
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['cover', 'contain', 'stretch', 'original'] as BackgroundFitMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFit(mode)}
                  className={`py-2 px-3 rounded-lg border text-center font-bold capitalize transition-all cursor-pointer ${
                    fit === mode
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-sm'
                      : 'bg-[#181d24] border-[#27313d] text-gray-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Scale & Offsets */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Zoom Scale</span>
                <span className="font-mono text-white">{Math.round(scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={scale}
                onChange={e => setScale(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Offset X (mm)</span>
                <span className="font-mono text-white">{offsetX.toFixed(1)} mm</span>
              </div>
              <input
                type="number"
                step="0.5"
                value={offsetX}
                onChange={e => setOffsetX(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#181d24] border border-[#27313d] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Offset Y (mm)</span>
                <span className="font-mono text-white">{offsetY.toFixed(1)} mm</span>
              </div>
              <input
                type="number"
                step="0.5"
                value={offsetY}
                onChange={e => setOffsetY(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#181d24] border border-[#27313d] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick Alignments */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOffsetX(0)}
                className="px-2.5 py-1.5 rounded-lg bg-[#181d24] hover:bg-[#202731] border border-[#27313d] text-gray-300 hover:text-white cursor-pointer transition-colors"
              >
                Center X
              </button>
              <button
                type="button"
                onClick={() => setOffsetY(0)}
                className="px-2.5 py-1.5 rounded-lg bg-[#181d24] hover:bg-[#202731] border border-[#27313d] text-gray-300 hover:text-white cursor-pointer transition-colors"
              >
                Center Y
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-lg bg-[#181d24] hover:bg-[#202731] border border-[#27313d] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-[#181d24] hover:bg-[#202731] border border-[#27313d] text-gray-300 font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Alignment</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

