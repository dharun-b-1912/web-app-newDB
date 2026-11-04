// src/features/people/idcard/IdCardPressView.tsx
// ============================================================================
// Joy PeopleHR — Enterprise ID Card Studio (Master Component)
// Integrated with Live Supabase Workforce, Smart Photo Matcher, Duplex CMYK PDF,
// 8-Point Precision Placement Editor, and Dedicated Landscape & Portrait Templates
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CardElement,
  CardGeometry,
  CardSide,
  CardSideData,
  IdCardPersonRecord,
  CR80_LANDSCAPE,
  CR80_PORTRAIT,
  ElementType,
  MatchedPhotoRecord,
} from './idCardTypes';
import {
  fetchEmployeesForIdCards,
  getSampleEmployees,
  getTemplateByName,
  createTextElement,
  createImageElement,
  createRectElement,
  createQrElement,
  runPreflightChecks,
  exportCmykPdfFile,
  loadImageFromFile,
} from './idCardService';
import { IdCardToolbar } from './components/IdCardToolbar';
import { IdCardCanvas } from './components/IdCardCanvas';
import { IdCardPropertiesPanel } from './components/IdCardPropertiesPanel';
import { IdCardLayersPanel } from './components/IdCardLayersPanel';
import { IdCardLeftSidebar } from './components/IdCardLeftSidebar';
import { IdCardPhotoManagerModal } from './components/IdCardPhotoManagerModal';
import { IdCardBulkExportModal } from './components/IdCardBulkExportModal';
import { IdCardPreflightModal } from './components/IdCardPreflightModal';
import { IdCardSaveTemplateModal } from './components/IdCardSaveTemplateModal';

interface IdCardPressViewProps {
  onBackToPeople?: () => void;
}

interface HistoryState {
  front: CardSideData;
  back: CardSideData;
  geometry: CardGeometry;
}

export const IdCardPressView: React.FC<IdCardPressViewProps> = ({ onBackToPeople }) => {
  // 1. Workforce & Active Employee State
  const [employees, setEmployees] = useState<IdCardPersonRecord[]>(getSampleEmployees());
  const [activeEmployeeIndex, setActiveEmployeeIndex] = useState<number>(0);
  const [photosMap, setPhotosMap] = useState<Map<string, HTMLImageElement>>(new Map());
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  // 2. Card Geometry & Orientation
  const [geometry, setGeometry] = useState<CardGeometry>(CR80_LANDSCAPE);
  const [activeSide, setActiveSide] = useState<CardSide>('front');

  // 3. Card Sides Content
  const initialTemplates = getTemplateByName('corporate', 'landscape');
  const [frontSide, setFrontSide] = useState<CardSideData>({
    bg: '#ffffff',
    bgImg: null,
    bgName: '',
    els: initialTemplates.front,
  });
  const [backSide, setBackSide] = useState<CardSideData>({
    bg: '#ffffff',
    bgImg: null,
    bgName: '',
    els: initialTemplates.back,
  });

  // 4. Studio Canvas & Selection
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showGuides, setShowGuides] = useState<boolean>(true);

  // 5. History Undo / Redo Stacks
  const [history, setHistory] = useState<HistoryState[]>([
    {
      front: { ...frontSide },
      back: { ...backSide },
      geometry: { ...geometry },
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // 6. Modals
  const [isPhotoManagerOpen, setIsPhotoManagerOpen] = useState(false);
  const [isBulkExportOpen, setIsBulkExportOpen] = useState(false);
  const [isPreflightOpen, setIsPreflightOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);

  // 7. Export Progress
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Load Real Supabase Employees on Mount
  useEffect(() => {
    let isMounted = true;
    fetchEmployeesForIdCards().then(loaded => {
      if (isMounted && loaded && loaded.length > 0) {
        setEmployees(loaded);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Push Snapshot to History
  const pushHistory = useCallback(
    (newFront: CardSideData, newBack: CardSideData, newGeo: CardGeometry) => {
      const snap: HistoryState = {
        front: JSON.parse(JSON.stringify(newFront)),
        back: JSON.parse(JSON.stringify(newBack)),
        geometry: { ...newGeo },
      };
      setHistory(prev => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, snap];
      });
      setHistoryIndex(prev => prev + 1);
    },
    [historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setFrontSide(JSON.parse(JSON.stringify(target.front)));
      setBackSide(JSON.parse(JSON.stringify(target.back)));
      setGeometry({ ...target.geometry });
      setHistoryIndex(historyIndex - 1);
      setSelectedElementId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setFrontSide(JSON.parse(JSON.stringify(target.front)));
      setBackSide(JSON.parse(JSON.stringify(target.back)));
      setGeometry({ ...target.geometry });
      setHistoryIndex(historyIndex + 1);
      setSelectedElementId(null);
    }
  };

  // Active side accessor
  const currentSideData = activeSide === 'front' ? frontSide : backSide;
  const setCurSideElements = (newEls: CardElement[]) => {
    if (activeSide === 'front') {
      const next = { ...frontSide, els: newEls };
      setFrontSide(next);
      pushHistory(next, backSide, geometry);
    } else {
      const next = { ...backSide, els: newEls };
      setBackSide(next);
      pushHistory(frontSide, next, geometry);
    }
  };

  // Update specific element
  const handleUpdateElement = (id: string, updates: Partial<CardElement>) => {
    const updated = currentSideData.els.map(el => (el.id === id ? ({ ...el, ...updates } as CardElement) : el));
    if (activeSide === 'front') {
      setFrontSide({ ...frontSide, els: updated });
    } else {
      setBackSide({ ...backSide, els: updated });
    }
  };

  // Delete Element
  const handleDeleteElement = (id: string) => {
    const remaining = currentSideData.els.filter(e => e.id !== id);
    setCurSideElements(remaining);
    setSelectedElementId(null);
  };

  // Duplicate Element
  const handleDuplicateElement = (id: string) => {
    const target = currentSideData.els.find(e => e.id === id);
    if (!target) return;
    const dup = {
      ...JSON.parse(JSON.stringify(target)),
      id: 'el_' + Date.now(),
      x: target.x + 2,
      y: target.y + 2,
    };
    const next = [...currentSideData.els, dup];
    setCurSideElements(next);
    setSelectedElementId(dup.id);
  };

  // Add New Element
  const handleAddElement = (type: ElementType) => {
    let newEl: CardElement;
    if (type === 'text') {
      newEl = createTextElement({ text: 'New Text', x: 5, y: 5, w: 40, h: 8 });
    } else if (type === 'image') {
      newEl = createImageElement({ x: 5, y: 5, w: 22, h: 28 });
    } else if (type === 'rect') {
      newEl = createRectElement({ x: 0, y: 0, w: geometry.w, h: 6, fill: '#0f2f57' });
    } else {
      newEl = createQrElement({ x: 5, y: 5, w: 16, h: 16 });
    }

    const next = [...currentSideData.els, newEl];
    setCurSideElements(next);
    setSelectedElementId(newEl.id);
  };

  // Alignment Helpers
  const handleAlignElement = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedElementId) return;
    const target = currentSideData.els.find(e => e.id === selectedElementId);
    if (!target) return;

    let nx = target.x;
    let ny = target.y;

    if (alignment === 'left') nx = geometry.safe;
    else if (alignment === 'center') nx = (geometry.w - target.w) / 2;
    else if (alignment === 'right') nx = geometry.w - geometry.safe - target.w;
    else if (alignment === 'top') ny = geometry.safe;
    else if (alignment === 'middle') ny = (geometry.h - target.h) / 2;
    else if (alignment === 'bottom') ny = geometry.h - geometry.safe - target.h;

    handleUpdateElement(target.id, { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 });
  };

  // Orientation Switch
  const handleOrientationChange = (newOrientation: 'landscape' | 'portrait' | 'custom') => {
    if (newOrientation === geometry.orientation) return;
    const targetGeo = newOrientation === 'portrait' ? CR80_PORTRAIT : CR80_LANDSCAPE;
    const templates = getTemplateByName('corporate', newOrientation === 'portrait' ? 'portrait' : 'landscape');

    setGeometry(targetGeo);
    const newFront = { ...frontSide, els: templates.front };
    const newBack = { ...backSide, els: templates.back };
    setFrontSide(newFront);
    setBackSide(newBack);
    setSelectedElementId(null);
    pushHistory(newFront, newBack, targetGeo);
  };

  // Apply Template Category
  const handleApplyTemplate = (category: 'corporate' | 'campus' | 'minimal' | 'worker' | 'contractor' | 'security') => {
    const templates = getTemplateByName(category, geometry.orientation === 'portrait' ? 'portrait' : 'landscape');
    const newFront = { ...frontSide, els: templates.front };
    const newBack = { ...backSide, els: templates.back };
    setFrontSide(newFront);
    setBackSide(newBack);
    setSelectedElementId(null);
    pushHistory(newFront, newBack, geometry);
  };

  // Background update
  const handleUpdateSideBg = (side: 'front' | 'back', bg: string, bgImg?: HTMLImageElement | null) => {
    if (side === 'front') {
      const next = { ...frontSide, bg, bgImg: bgImg || null };
      setFrontSide(next);
      pushHistory(next, backSide, geometry);
    } else {
      const next = { ...backSide, bg, bgImg: bgImg || null };
      setBackSide(next);
      pushHistory(frontSide, next, geometry);
    }
  };

  // Logo Upload
  const handleUploadLogo = async (file: File) => {
    const img = await loadImageFromFile(file);
    setLogoImg(img);
  };

  // Assign photo to employee
  const handleAssignPhotoToEmployee = (employeeId: string, img: HTMLImageElement, fileName: string) => {
    setEmployees(prev =>
      prev.map(e => {
        if (e.id === employeeId || e.idno === employeeId) {
          return {
            ...e,
            __img: img,
            photo: fileName,
            photo_matched: true,
          };
        }
        return e;
      })
    );
    setPhotosMap(prev => {
      const next = new Map(prev);
      next.set(fileName.toLowerCase(), img);
      return next;
    });
  };

  // Bulk Photos Update
  const handleBulkUpdatePhotos = (matchedRecords: MatchedPhotoRecord[]) => {
    const newMap = new Map(photosMap);
    const matchedEmpMap = new Map<string, { img: HTMLImageElement; fileName: string }>();

    matchedRecords.forEach(m => {
      newMap.set(m.fileName.toLowerCase(), m.img);
      if (m.matchedEmployeeId) {
        matchedEmpMap.set(m.matchedEmployeeId, { img: m.img, fileName: m.fileName });
      }
      if (m.matchedEmployeeCode) {
        matchedEmpMap.set(m.matchedEmployeeCode, { img: m.img, fileName: m.fileName });
      }
    });

    setPhotosMap(newMap);
    setEmployees(prev =>
      prev.map(e => {
        const found = matchedEmpMap.get(e.id || '') || matchedEmpMap.get(e.idno);
        if (found) {
          return {
            ...e,
            __img: found.img,
            photo: found.fileName,
            photo_matched: true,
          };
        }
        return e;
      })
    );
  };

  // Preflight Issues Calculation
  const activeEmp = employees[activeEmployeeIndex] || employees[0] || getSampleEmployees()[0];
  const preflightReport = runPreflightChecks(
    { front: frontSide, back: backSide },
    employees,
    geometry,
    logoImg,
    photosMap
  );

  // Quick 1-Click Export CMYK PDF
  const handleQuickExportPdf = async () => {
    setIsExporting(true);
    setExportProgress(10);
    try {
      const blob = await exportCmykPdfFile(
        { front: frontSide, back: backSide },
        [activeEmp],
        geometry,
        {
          dpi: 300,
          layout: 'card',
          paper: '210x297',
          sides: 'both',
          cropMarks: true,
          logo: logoImg,
          photos: photosMap,
          onProgress: pct => setExportProgress(pct),
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JOY_ID_Card_${activeEmp.idno}_${activeEmp.name.replace(/\s+/g, '_')}_CMYK.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
    } catch (err) {
      console.error('Quick export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedElement = currentSideData.els.find(e => e.id === selectedElementId) || null;
  const matchedCount = employees.filter(e => e.__img || e.avatar_url).length;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] w-full bg-[#0a0c0e] text-[#e6eaee] overflow-hidden select-none">
      {/* 1. Top Professional Toolbar */}
      <IdCardToolbar
        onBack={onBackToPeople}
        activeSide={activeSide}
        onSideChange={setActiveSide}
        orientation={geometry.orientation}
        onOrientationChange={handleOrientationChange}
        zoom={zoom}
        onZoomChange={setZoom}
        snapToGrid={snapToGrid}
        onSnapToggle={() => setSnapToGrid(!snapToGrid)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        preflightCount={{ fix: preflightReport.fixCount, check: preflightReport.checkCount }}
        onOpenPreflight={() => setIsPreflightOpen(true)}
        onSaveTemplate={() => setIsSaveTemplateOpen(true)}
        onOpenBulkModal={() => setIsBulkExportOpen(true)}
        onQuickExportPdf={handleQuickExportPdf}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />

      {/* 2. Main 5-Panel Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Control Panel: Templates, Setup, Artwork, Workforce */}
        <IdCardLeftSidebar
          geometry={geometry}
          onUpdateGeometry={newGeo => {
            setGeometry(newGeo);
            pushHistory(frontSide, backSide, newGeo);
          }}
          onApplyTemplate={handleApplyTemplate}
          frontSide={frontSide}
          backSide={backSide}
          onUpdateSideBg={handleUpdateSideBg}
          logoImg={logoImg}
          onUploadLogo={handleUploadLogo}
          employees={employees}
          activeEmployeeIndex={activeEmployeeIndex}
          onSelectEmployeeIndex={setActiveEmployeeIndex}
          onOpenPhotoManager={() => setIsPhotoManagerOpen(true)}
          onOpenBulkModal={() => setIsBulkExportOpen(true)}
          photoMatchedCount={matchedCount}
        />

        {/* Center Interactive Canvas */}
        <IdCardCanvas
          geometry={geometry}
          sideData={currentSideData}
          activeEmployee={activeEmp}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onUndo={handleUndo}
          onRedo={handleRedo}
          zoom={zoom}
          snapToGrid={snapToGrid}
          logoImg={logoImg}
          photosMap={photosMap}
          showGuides={showGuides}
          onToggleGuides={() => setShowGuides(!showGuides)}
        />

        {/* Right Layers Panel */}
        <IdCardLayersPanel
          elements={currentSideData.els}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onReorderElements={setCurSideElements}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onAddElement={handleAddElement}
          activeSide={activeSide}
        />

        {/* Right Precision Properties Panel */}
        <IdCardPropertiesPanel
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          geometry={geometry}
          onAlignElement={handleAlignElement}
        />
      </div>

      {/* Modals */}
      <IdCardPhotoManagerModal
        isOpen={isPhotoManagerOpen}
        onClose={() => setIsPhotoManagerOpen(false)}
        employees={employees}
        onAssignPhotoToEmployee={handleAssignPhotoToEmployee}
        onBulkUpdatePhotos={handleBulkUpdatePhotos}
      />

      <IdCardBulkExportModal
        isOpen={isBulkExportOpen}
        onClose={() => setIsBulkExportOpen(false)}
        employees={employees}
        geometry={geometry}
        frontSide={frontSide}
        backSide={backSide}
        logoImg={logoImg}
        photosMap={photosMap}
      />

      <IdCardPreflightModal
        isOpen={isPreflightOpen}
        onClose={() => setIsPreflightOpen(false)}
        issues={preflightReport.issues}
      />

      <IdCardSaveTemplateModal
        isOpen={isSaveTemplateOpen}
        onClose={() => setIsSaveTemplateOpen(false)}
        geometry={geometry}
        frontSide={frontSide}
        backSide={backSide}
        onSaveSuccess={tmplName => {
          alert(`✓ Saved template "${tmplName}" successfully!`);
        }}
      />
    </div>
  );
};
