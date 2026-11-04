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
  substituteField,
} from '../idCardPdfEngine';

interface IdCardCanvasProps {
  geometry: CardGeometry;
  sideData: CardSideData;
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
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  // Base Scale: 1 mm = 6.0 pixels for portrait or 4.8 pixels for landscape at zoom 1.0
  const baseScale = (geometry.orientation === 'portrait' ? 6.0 : 4.8) * zoom;
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

    // Clear background
    ctx.fillStyle = '#0b0e11';
    ctx.fillRect(0, 0, totalW, totalH);

    // 1. Draw Card Content (with bleed)
    drawCardSide(ctx, sideData, activeEmployee, geometry, baseScale, {
      logo: logoImg,
      photos: photosMap,
      isPreview: true,
    });

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

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full relative overflow-auto bg-[#0a0c0e] flex flex-col items-center justify-center p-6 select-none"
    >
      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, #334155 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Floating Canvas Framing */}
      <div className="relative shadow-2xl rounded-sm border border-[#252d37] bg-black">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair block"
        />
      </div>

      {/* Bottom Guideline Legend & Quick Info */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs select-none z-10 bg-[#13171c]/90 px-4 py-1.5 rounded-full border border-[#252d37] shadow-lg">
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
          <span className="text-gray-300 font-medium">Trim (Cut Line: {geometry.w} × {geometry.h} mm)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-[#00e5ff]" />
          <span className="text-gray-300 font-medium">Bleed (+{geometry.bleed} mm)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 border-t border-dashed border-[#10b981]" />
          <span className="text-gray-300 font-medium">Safe Margin ({geometry.safe} mm inside)</span>
        </div>

        <span className="text-gray-600">|</span>

        <span className="text-gray-400 font-mono text-[11px]">
          Arrow: 0.1 mm  •  Shift+Arrow: 1 mm  •  Delete: Remove
        </span>
      </div>
    </div>
  );
};

