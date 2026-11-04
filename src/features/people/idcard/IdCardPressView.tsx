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
  BackgroundArtworkSettings,
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
import { Sparkles, Layers } from 'lucide-react';

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
    bg: initialTemplates.frontBg || '#ffffff',
    bgImg: null,
    bgName: '',
    els: initialTemplates.front,
  });
  const [backSide, setBackSide] = useState<CardSideData>({
    bg: initialTemplates.backBg || '#ffffff',
    bgImg: null,
    bgName: '',
    els: initialTemplates.back,
  });

  // 4. Studio Canvas & Selection
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'properties' | 'layers'>('properties');
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
    const newFront = { ...frontSide, els: templates.front, bg: templates.frontBg || frontSide.bg };
    const newBack = { ...backSide, els: templates.back, bg: templates.backBg || backSide.bg };
    setFrontSide(newFront);
    setBackSide(newBack);
    setSelectedElementId(null);
    pushHistory(newFront, newBack, targetGeo);
  };

  // Apply Template Category
  const handleApplyTemplate = (category: 'corporate' | 'campus' | 'minimal' | 'worker' | 'contractor' | 'security') => {
    const templates = getTemplateByName(category, geometry.orientation === 'portrait' ? 'portrait' : 'landscape');
    const newFront = { ...frontSide, els: templates.front, bg: templates.frontBg || frontSide.bg };
    const newBack = { ...backSide, els: templates.back, bg: templates.backBg || backSide.bg };
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

  // Advanced Artwork Management Handlers
  const handleUploadSideArtwork = async (side: 'front' | 'back', file: File) => {
    const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validFormats.includes(file.type)) {
      alert('Please upload a valid high-resolution JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      alert('Artwork image exceeds 30 MB limit. Please use an optimized print asset.');
      return;
    }

    try {
      const img = await loadImageFromFile(file);
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      const cardTargetW = geometry.orientation === 'portrait' ? 54.0 : 85.6;
      const dpi = Math.round(iw / (cardTargetW / 25.4));
      const format = file.type.includes('png') ? 'PNG' : file.type.includes('webp') ? 'WEBP' : 'JPEG';

      const defaultArtwork: BackgroundArtworkSettings = {
        fit: 'cover',
        x: 0,
        y: 0,
        scale: 1.0,
        rotation: 0,
        opacity: 1.0,
        locked: false,
        visible: true,
        naturalWidth: iw,
        naturalHeight: ih,
        fileSize: file.size,
        format,
        dpi,
      };

      if (side === 'front') {
        const next: CardSideData = {
          ...frontSide,
          bgImg: img,
          bgName: file.name,
          artwork: defaultArtwork,
        };
        setFrontSide(next);
        pushHistory(next, backSide, geometry);
      } else {
        const next: CardSideData = {
          ...backSide,
          bgImg: img,
          bgName: file.name,
          artwork: defaultArtwork,
        };
        setBackSide(next);
        pushHistory(frontSide, next, geometry);
      }
    } catch (err) {
      console.error('Failed to load artwork file:', err);
      alert('Could not read image file. Please verify it is a valid graphic asset.');
    }
  };

  const handleRemoveSideArtwork = (side: 'front' | 'back') => {
    if (!confirm(`Remove ${side.toUpperCase()} background artwork? Foreground elements will be preserved.`)) {
      return;
    }
    if (side === 'front') {
      const next: CardSideData = {
        ...frontSide,
        bgImg: null,
        bgName: '',
        artwork: undefined,
      };
      setFrontSide(next);
      pushHistory(next, backSide, geometry);
    } else {
      const next: CardSideData = {
        ...backSide,
        bgImg: null,
        bgName: '',
        artwork: undefined,
      };
      setBackSide(next);
      pushHistory(frontSide, next, geometry);
    }
  };

  const handleUpdateArtworkSettings = (side: 'front' | 'back', settings: Partial<BackgroundArtworkSettings>) => {
    if (side === 'front') {
      const currentArt = frontSide.artwork || { fit: 'cover', x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 };
      const next: CardSideData = {
        ...frontSide,
        artwork: { ...currentArt, ...settings },
      };
      setFrontSide(next);
      pushHistory(next, backSide, geometry);
    } else {
      const currentArt = backSide.artwork || { fit: 'cover', x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 };
      const next: CardSideData = {
        ...backSide,
        artwork: { ...currentArt, ...settings },
      };
      setBackSide(next);
      pushHistory(frontSide, next, geometry);
    }
  };

  const handleCopyArtworkSettings = (fromSide: 'front' | 'back', toSide: 'front' | 'back') => {
    const src = fromSide === 'front' ? frontSide : backSide;
    if (!src.bgImg || !src.artwork) {
      alert(`The ${fromSide} side has no uploaded artwork to copy.`);
      return;
    }
    if (toSide === 'back') {
      const next: CardSideData = {
        ...backSide,
        bg: src.bg,
        bgImg: src.bgImg,
        bgName: src.bgName,
        artwork: { ...src.artwork },
      };
      setBackSide(next);
      pushHistory(frontSide, next, geometry);
    } else {
      const next: CardSideData = {
        ...frontSide,
        bg: src.bg,
        bgImg: src.bgImg,
        bgName: src.bgName,
        artwork: { ...src.artwork },
      };
      setFrontSide(next);
      pushHistory(next, backSide, geometry);
    }
  };

  const handleClearSideElements = (side: 'front' | 'back') => {
    if (!confirm(`Clear all foreground elements on ${side.toUpperCase()} side? Your uploaded background artwork will stay untouched.`)) {
      return;
    }
    if (side === 'front') {
      const next: CardSideData = {
        ...frontSide,
        els: [],
      };
      setFrontSide(next);
      setSelectedElementId(null);
      pushHistory(next, backSide, geometry);
    } else {
      const next: CardSideData = {
        ...backSide,
        els: [],
      };
      setBackSide(next);
      setSelectedElementId(null);
      pushHistory(frontSide, next, geometry);
    }
  };

  const handleRemoveLogo = () => {
    setLogoImg(null);
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
          onUploadSideArtwork={handleUploadSideArtwork}
          onRemoveSideArtwork={handleRemoveSideArtwork}
          onUpdateArtworkSettings={handleUpdateArtworkSettings}
          onCopyArtworkSettings={handleCopyArtworkSettings}
          onClearSideElements={handleClearSideElements}
          logoImg={logoImg}
          onUploadLogo={handleUploadLogo}
          onRemoveLogo={handleRemoveLogo}
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
          onSelectElement={id => {
            setSelectedElementId(id);
            if (id) setInspectorTab('properties');
          }}
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

        {/* Right Consolidated Tabbed Inspector (Properties | Layers) */}
        <div className="w-80 bg-[#13171c] border-l border-[#252d37] flex flex-col h-full overflow-hidden select-none shrink-0">
          {/* Inspector Tab Switcher */}
          <div className="flex items-center h-11 border-b border-[#252d37] bg-[#181d24] px-2.5 gap-1.5 shrink-0">
            <button
              onClick={() => setInspectorTab('properties')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                inspectorTab === 'properties'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#202731]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Properties</span>
            </button>
            <button
              onClick={() => setInspectorTab('layers')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                inspectorTab === 'layers'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#202731]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layers ({currentSideData.els.length})</span>
            </button>
          </div>

          {/* Inspector Body */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {inspectorTab === 'properties' ? (
              <IdCardPropertiesPanel
                selectedElement={selectedElement}
                onUpdateElement={handleUpdateElement}
                onDeleteElement={handleDeleteElement}
                onDuplicateElement={handleDuplicateElement}
                geometry={geometry}
                onAlignElement={handleAlignElement}
              />
            ) : (
              <IdCardLayersPanel
                elements={currentSideData.els}
                selectedElementId={selectedElementId}
                onSelectElement={id => {
                  setSelectedElementId(id);
                  if (id) setInspectorTab('properties');
                }}
                onReorderElements={setCurSideElements}
                onUpdateElement={handleUpdateElement}
                onDeleteElement={handleDeleteElement}
                onDuplicateElement={handleDuplicateElement}
                onAddElement={handleAddElement}
                activeSide={activeSide}
              />
            )}
          </div>
        </div>
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
        onSelectElement={id => {
          setSelectedElementId(id);
          setInspectorTab('properties');
        }}
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
