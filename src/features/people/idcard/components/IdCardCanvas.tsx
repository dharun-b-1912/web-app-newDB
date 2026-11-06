// src/features/people/idcard/components/IdCardCanvas.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Precision Interactive Center Canvas
// Live Millimeter Guides, 8-Point Resize, Rotation, Smart Snap, and Keyboard Nudge
// ============================================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  CardElement,
  CardGeometry,
  CardSideData,
  IdCardPersonRecord,
  PreflightIssue,
} from '../idCardTypes';
import {
  drawCardSide,
  drawRoundRect,
  substituteField,
} from '../idCardPdfEngine';

interface IdCardCanvasProps {
  geometry: CardGeometry;
  sideData: CardSideData;
  companionSideData?: CardSideData;
  activeSide?: 'front' | 'back';
  onSideChange?: (side: 'front' | 'back') => void;
  activeEmployee: IdCardPersonRecord;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CardElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  snapToGrid: boolean;
  logoImg: HTMLImageElement | null;
  photosMap: Map<string, HTMLImageElement>;
  showGuides: boolean;
  onToggleGuides: () => void;
}

type DragMode = 'move' | 'resize' | 'rotate' | null;
type HandleType = 'tl' | 'tc' | 'tr' | 'mr' | 'br' | 'bc' | 'bl' | 'ml' | 'rot';

export const IdCardCanvas: React.FC<IdCardCanvasProps> = ({
  geometry,
  sideData,
  companionSideData,
  activeSide = 'front',
  onSideChange,
  activeEmployee,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onUndo,
  onRedo,
  zoom,
  snapToGrid,
  logoImg,
  photosMap,
  showGuides,
  onToggleGuides,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const companionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dual3DView, setDual3DView] = useState<boolean>(true);

  // Interaction State
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementStartBounds, setElementStartBounds] = useState<{ x: number; y: number; w: number; h: number; rot: number }>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    rot: 0,
  });

  // Base Scale: fits both Front + Back side-by-side cleanly on 1440px+ viewports
  const baseScale = (geometry.orientation === 'portrait' ? (dual3DView && companionSideData ? 3.5 : 5.2) : 4.2) * zoom;
  const b = geometry.bleed;
  const totalW = (geometry.w + 2 * b) * baseScale;
  const totalH = (geometry.h + 2 * b) * baseScale;

  // Selected element lookup
  const selectedElement = sideData.els.find(e => e.id === selectedElementId) || null;

  // Coordinate Conversion: Screen Pixels -> Card Millimeters
  const screenToMm = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      const pxX = clientX - rect.left;
      const pxY = clientY - rect.top;
      // Subtract bleed offset and scale
      const mmX = pxX / baseScale - b;
      const mmY = pxY / baseScale - b;
      return { x: mmX, y: mmY };
    },
    [baseScale, b]
  );

  // Snap to 1.0 mm (or 0.5 mm)
  const snapVal = (v: number) => {
    if (!snapToGrid) return Math.round(v * 10) / 10;
    return Math.round(v);
  };

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support High-DPI Displays (Retina)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(totalW * dpr);
    canvas.height = Math.round(totalH * dpr);
    canvas.style.width = `${totalW}px`;
    canvas.style.height = `${totalH}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear canvas with transparent studio backdrop so CR80 rounded corners look physical
    ctx.clearRect(0, 0, totalW, totalH);

    // Clip to ISO CR80 3.18mm Rounded Trim Box when in Finished View (showGuides === false)
    ctx.save();
    if (!showGuides) {
      drawRoundRect(
        ctx,
        b * baseScale,
        b * baseScale,
        geometry.w * baseScale,
        geometry.h * baseScale,
        3.18 * baseScale
      );
      ctx.clip();
    }

    // 1. Draw Card Content
    drawCardSide(ctx, sideData, activeEmployee, geometry, baseScale, {
      logo: logoImg,
      photos: photosMap,
      isPreview: true,
      showGuides,
    });
    ctx.restore();

    // Subtle 3D PVC Specular Rim Light when in Finished View
    if (!showGuides) {
      ctx.save();
      drawRoundRect(
        ctx,
        b * baseScale + 0.5,
        b * baseScale + 0.5,
        geometry.w * baseScale - 1,
        geometry.h * baseScale - 1,
        3.18 * baseScale
      );
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Guidelines if enabled
    if (showGuides) {
      ctx.save();
      ctx.translate(b * baseScale, b * baseScale);

      // A. Bleed Outer Edge (Cyan solid line)
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(-b * baseScale, -b * baseScale, (geometry.w + 2 * b) * baseScale, (geometry.h + 2 * b) * baseScale);

      // B. Trim Cut Line (Magenta solid line)
      ctx.strokeStyle = '#e5007d';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      ctx.strokeRect(0, 0, geometry.w * baseScale, geometry.h * baseScale);

      // C. Safe Margin Area (Dashed green line, 3mm inside trim)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        geometry.safe * baseScale,
        geometry.safe * baseScale,
        (geometry.w - 2 * geometry.safe) * baseScale,
        (geometry.h - 2 * geometry.safe) * baseScale
      );

      ctx.restore();
    }

    // 3. Draw Bounding Box & Handles for Selected Element
    if (selectedElement && !selectedElement.hidden) {
      ctx.save();
      ctx.translate(b * baseScale, b * baseScale);

      const ex = selectedElement.x * baseScale;
      const ey = selectedElement.y * baseScale;
      const ew = selectedElement.w * baseScale;
      const eh = selectedElement.h * baseScale;
      const ecx = ex + ew / 2;
      const ecy = ey + eh / 2;

      // Handle Rotation
      if (selectedElement.rotation && selectedElement.rotation !== 0) {
        ctx.translate(ecx, ecy);
        ctx.rotate((selectedElement.rotation * Math.PI) / 180);
        ctx.translate(-ecx, -ecy);
      }

      // Selection Outline
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(ex, ey, ew, eh);

      // 8 Resize Handles
      const hs = 6; // Handle half-size in px
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 1.5;

      const handles: { h: HandleType; x: number; y: number }[] = [
        { h: 'tl', x: ex, y: ey },
        { h: 'tc', x: ex + ew / 2, y: ey },
        { h: 'tr', x: ex + ew, y: ey },
        { h: 'mr', x: ex + ew, y: ey + eh / 2 },
        { h: 'br', x: ex + ew, y: ey + eh },
        { h: 'bc', x: ex + ew / 2, y: ey + eh },
        { h: 'bl', x: ex, y: ey + eh },
        { h: 'ml', x: ex, y: ey + eh / 2 },
      ];

      handles.forEach(p => {
        ctx.fillRect(p.x - hs / 2, p.y - hs / 2, hs, hs);
        ctx.strokeRect(p.x - hs / 2, p.y - hs / 2, hs, hs);
      });

      // Rotation Handle at Top
      const rotY = ey - 18;
      ctx.beginPath();
      ctx.moveTo(ex + ew / 2, ey);
      ctx.lineTo(ex + ew / 2, rotY);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ex + ew / 2, rotY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }, [sideData, activeEmployee, geometry, zoom, showGuides, selectedElement, logoImg, photosMap, totalW, totalH, baseScale, b]);

  // Keyboard Shortcuts: Arrow nudge, Delete, Undo/Redo, Duplicate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
        return;
      }

      if (!selectedElement) return;

      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onDuplicateElement(selectedElement.id);
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteElement(selectedElement.id);
        return;
      }

      // Arrow Key Nudges: Default 0.1 mm, Shift 1.0 mm
      const step = e.shiftKey ? 1.0 : 0.1;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        onUpdateElement(selectedElement.id, {
          x: Math.round((selectedElement.x + dx) * 10) / 10,
          y: Math.round((selectedElement.y + dy) * 10) / 10,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, onUpdateElement, onDeleteElement, onDuplicateElement, onUndo, onRedo]);

  // Mouse Down: Hit test handles or elements
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = screenToMm(e.clientX, e.clientY);
    if (!pt) return;

    // 1. If an element is selected, check its handles first
    if (selectedElement) {
      const ex = selectedElement.x;
      const ey = selectedElement.y;
      const ew = selectedElement.w;
      const eh = selectedElement.h;
      const handleTol = 8 / baseScale; // Tolerance in mm

      // Check rotation handle (top center offset)
      if (Math.abs(pt.x - (ex + ew / 2)) < handleTol && Math.abs(pt.y - (ey - 18 / baseScale)) < handleTol) {
        setDragMode('rotate');
        setActiveHandle('rot');
        setDragStartPos({ x: e.clientX, y: e.clientY });
        setElementStartBounds({ x: ex, y: ey, w: ew, h: eh, rot: selectedElement.rotation || 0 });
        return;
      }

      // Check 8 resize handles
      const handlePoints: { h: HandleType; x: number; y: number }[] = [
        { h: 'tl', x: ex, y: ey },
        { h: 'tc', x: ex + ew / 2, y: ey },
        { h: 'tr', x: ex + ew, y: ey },
        { h: 'mr', x: ex + ew, y: ey + eh / 2 },
        { h: 'br', x: ex + ew, y: ey + eh },
        { h: 'bc', x: ex + ew / 2, y: ey + eh },
        { h: 'bl', x: ex, y: ey + eh },
        { h: 'ml', x: ex, y: ey + eh / 2 },
      ];

      for (const hp of handlePoints) {
        if (Math.abs(pt.x - hp.x) < handleTol && Math.abs(pt.y - hp.y) < handleTol) {
          setDragMode('resize');
          setActiveHandle(hp.h);
          setDragStartPos({ x: e.clientX, y: e.clientY });
          setElementStartBounds({ x: ex, y: ey, w: ew, h: eh, rot: selectedElement.rotation || 0 });
          return;
        }
      }

      // If clicked inside the currently selected element, start moving it
      if (pt.x >= ex && pt.x <= ex + ew && pt.y >= ey && pt.y <= ey + eh) {
        setDragMode('move');
        setDragStartPos({ x: e.clientX, y: e.clientY });
        setElementStartBounds({ x: ex, y: ey, w: ew, h: eh, rot: selectedElement.rotation || 0 });
        return;
      }
    }

    // 2. Hit test other elements from top to bottom
    const reversed = [...sideData.els].reverse();
    for (const el of reversed) {
      if (el.hidden || el.locked) continue;
      if (pt.x >= el.x && pt.x <= el.x + el.w && pt.y >= el.y && pt.y <= el.y + el.h) {
        onSelectElement(el.id);
        setDragMode('move');
        setDragStartPos({ x: e.clientX, y: e.clientY });
        setElementStartBounds({ x: el.x, y: el.y, w: el.w, h: el.h, rot: el.rotation || 0 });
        return;
      }
    }

    // Clicked empty canvas space
    onSelectElement(null);
  };

  // Mouse Move: Execute Move / Resize / Rotate
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragMode || !selectedElement) return;

    const deltaPxX = e.clientX - dragStartPos.x;
    const deltaPxY = e.clientY - dragStartPos.y;
    const deltaMmX = deltaPxX / baseScale;
    const deltaMmY = deltaPxY / baseScale;

    if (dragMode === 'move') {
      const nextX = snapVal(elementStartBounds.x + deltaMmX);
      const nextY = snapVal(elementStartBounds.y + deltaMmY);
      onUpdateElement(selectedElement.id, { x: nextX, y: nextY });
    } else if (dragMode === 'resize' && activeHandle) {
      let nx = elementStartBounds.x;
      let ny = elementStartBounds.y;
      let nw = elementStartBounds.w;
      let nh = elementStartBounds.h;

      if (activeHandle.includes('r')) {
        nw = Math.max(3, snapVal(elementStartBounds.w + deltaMmX));
      }
      if (activeHandle.includes('l')) {
        const potentialW = elementStartBounds.w - deltaMmX;
        if (potentialW >= 3) {
          nw = snapVal(potentialW);
          nx = snapVal(elementStartBounds.x + deltaMmX);
        }
      }
      if (activeHandle.includes('b')) {
        nh = Math.max(3, snapVal(elementStartBounds.h + deltaMmY));
      }
      if (activeHandle.includes('t')) {
        const potentialH = elementStartBounds.h - deltaMmY;
        if (potentialH >= 3) {
          nh = snapVal(potentialH);
          ny = snapVal(elementStartBounds.y + deltaMmY);
        }
      }

      onUpdateElement(selectedElement.id, { x: nx, y: ny, w: nw, h: nh });
    } else if (dragMode === 'rotate') {
      const pt = screenToMm(e.clientX, e.clientY);
      if (pt) {
        const cx = elementStartBounds.x + elementStartBounds.w / 2;
        const cy = elementStartBounds.y + elementStartBounds.h / 2;
        const radians = Math.atan2(pt.y - cy, pt.x - cx);
        let degrees = Math.round((radians * 180) / Math.PI) + 90;
        if (degrees < 0) degrees += 360;
        // Snap rotation to 15-degree increments if Shift is held
        if (e.shiftKey) {
          degrees = Math.round(degrees / 15) * 15;
        }
        onUpdateElement(selectedElement.id, { rotation: degrees % 360 });
      }
    }
  };

  const handleMouseUp = () => {
    setDragMode(null);
    setActiveHandle(null);
  };

  // Render Companion Side (Front/Back Side-by-Side 3D Studio Preview)
  useEffect(() => {
    const compCanvas = companionCanvasRef.current;
    if (!compCanvas || !companionSideData || !dual3DView) return;
    const ctx = compCanvas.getContext('2d');
    if (!ctx) return;

    const compScale = baseScale * 0.86;
    const compW = (geometry.w + 2 * b) * compScale;
    const compH = (geometry.h + 2 * b) * compScale;
    const dpr = window.devicePixelRatio || 1;
    compCanvas.width = Math.round(compW * dpr);
    compCanvas.height = Math.round(compH * dpr);
    compCanvas.style.width = `${compW}px`;
    compCanvas.style.height = `${compH}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, compW, compH);

    drawRoundRect(
      ctx,
      b * compScale,
      b * compScale,
      geometry.w * compScale,
      geometry.h * compScale,
      3.18 * compScale
    );
    ctx.clip();

    drawCardSide(ctx, companionSideData, activeEmployee, geometry, compScale, {
      logo: logoImg,
      photos: photosMap,
      isPreview: true,
      showGuides: false,
    });

    // Subtle 3D PVC Specular Rim Light
    drawRoundRect(
      ctx,
      b * compScale + 0.5,
      b * compScale + 0.5,
      geometry.w * compScale - 1,
      geometry.h * compScale - 1,
      3.18 * compScale
    );
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.restore();
  }, [companionSideData, dual3DView, activeEmployee, geometry, baseScale, b, logoImg, photosMap]);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full relative overflow-auto bg-[#0a0c0e] flex flex-col items-center justify-center p-4 select-none"
    >
      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, #334155 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Side-by-Side 3D Physical PVC Cards Stage */}
      <div className="relative z-10 flex flex-row items-center justify-center gap-5">
        {/* Active Editable Side Card */}
        <div className="flex flex-col items-center">
          <div className="mb-2 flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Editing {activeSide === 'front' ? 'Front Side' : 'Back Side'} (Interactive)
            </span>
          </div>
          <div
            className="relative transition-transform duration-200"
            style={{
              filter: showGuides
                ? 'drop-shadow(0 20px 35px rgba(0,0,0,0.65))'
                : 'drop-shadow(0 28px 42px rgba(0,0,0,0.75)) drop-shadow(0 8px 16px rgba(0,0,0,0.45))',
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-crosshair block"
            />
          </div>
        </div>

        {/* Companion Side Live 3D Preview (Click to switch side) */}
        {companionSideData && dual3DView && (
          <div
            onClick={() => onSideChange && onSideChange(activeSide === 'front' ? 'back' : 'front')}
            className="flex flex-col items-center group cursor-pointer transition-all hover:scale-[1.02]"
            title={`Click to switch and edit ${activeSide === 'front' ? 'Back Side' : 'Front Side'}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800/90 text-slate-300 border border-slate-700 group-hover:border-emerald-500/50 group-hover:text-emerald-300 transition-colors">
                {activeSide === 'front' ? 'Back Side Preview (Click to Edit)' : 'Front Side Preview (Click to Edit)'}
              </span>
            </div>
            <div
              className="relative opacity-95 group-hover:opacity-100 transition-opacity"
              style={{
                filter:
                  'drop-shadow(0 26px 38px rgba(0,0,0,0.72)) drop-shadow(0 8px 14px rgba(0,0,0,0.42))',
              }}
            >
              <canvas ref={companionCanvasRef} className="block pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Guideline Legend & Quick Info */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3.5 text-xs select-none z-10 bg-[#13171c]/90 px-4 py-1.5 rounded-full border border-[#252d37] shadow-lg">
        {companionSideData && (
          <>
            <button
              type="button"
              onClick={() => setDual3DView(v => !v)}
              className="flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${dual3DView ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              <span>{dual3DView ? 'Front + Back 3D View' : 'Single Side View'}</span>
            </button>
            <span className="text-gray-600">|</span>
          </>
        )}

        <button
          onClick={onToggleGuides}
          className="flex items-center gap-1.5 font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <span className={`w-2.5 h-2.5 rounded-full ${showGuides ? 'bg-emerald-500' : 'bg-gray-600'}`} />
          <span>Guides {showGuides ? 'On' : 'Off'}</span>
        </button>

        <span className="text-gray-600">|</span>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-[#e5007d]" />
          <span className="text-gray-300 font-medium">CR80 Trim ({geometry.w} × {geometry.h} mm • R3.18mm)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-[#00e5ff]" />
          <span className="text-gray-300 font-medium">Bleed (+{geometry.bleed} mm)</span>
        </div>

        <span className="text-gray-600">|</span>

        <span className="text-gray-400 font-mono text-[11px]">
          Arrow: 0.1 mm  •  Shift+Arrow: 1 mm  •  Delete: Remove
        </span>
      </div>
    </div>
  );
};

