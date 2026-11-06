// src/features/people/idcard/v2/components/steps/IdCardTemplatePickerStep.tsx
// ============================================================================
// JOY PeopleHR ID Card Studio V2.1 — Organization ID Card Design Library
// Enterprise Workspace: Blank Design, Upload Artwork, Import Design, My Designs
// (Generic starter templates and automatic demo selection removed per V2.1 spec)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  ArrowRight,
  Upload,
  Palette,
  Building2,
  FileCheck2,
  Plus,
  Download,
  FileCode2,
  GitBranch,
  Share2,
  Copy,
  Archive,
  FolderOpen,
  Edit3,
  X,
} from 'lucide-react';
import { IdCardCustomTemplate, TemplateCardInfo, CustomCardSideDef } from '../../types';
import { CardGeometry, CardSideData, IdCardPersonRecord } from '../../../idCardTypes';
import { drawCardSide, drawRoundRect } from '../../../idCardPdfEngine';
import {
  generateDesignGuideSpecKit,
  exportIdTemplateBundle,
} from '../../customTemplateService';

interface TemplateSideThumbnailCanvasProps {
  sideConfig: CustomCardSideDef;
  geometry: CardGeometry;
  sampleEmployee: IdCardPersonRecord;
  label: string;
}

const TemplateSideThumbnailCanvas: React.FC<TemplateSideThumbnailCanvasProps> = ({
  sideConfig,
  geometry,
  sampleEmployee,
  label,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [empImg, setEmpImg] = useState<HTMLImageElement | null>(sampleEmployee?.__img || null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [overlayImg, setOverlayImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (sampleEmployee?.__img) {
      setEmpImg(sampleEmployee.__img);
      return;
    }
    if (!sampleEmployee?.avatar_url) {
      setEmpImg(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) {
        sampleEmployee.__img = img;
        setEmpImg(img);
      }
    };
    img.src = sampleEmployee.avatar_url;
    return () => {
      cancelled = true;
    };
  }, [sampleEmployee]);

  useEffect(() => {
    const dataUrl = sideConfig.baseAsset?.dataUrl;
    if (!dataUrl) {
      setBgImg(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setBgImg(img);
    };
    img.src = dataUrl;
    return () => {
      cancelled = true;
    };
  }, [sideConfig.baseAsset?.dataUrl]);

  useEffect(() => {
    const overlayUrl = sideConfig.overlayAsset?.dataUrl;
    if (!overlayUrl) {
      setOverlayImg(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setOverlayImg(img);
    };
    img.src = overlayUrl;
    return () => {
      cancelled = true;
    };
  }, [sideConfig.overlayAsset?.dataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    const isPortraitCard = geometry.orientation === 'portrait' || geometry.h >= geometry.w;
    const targetW = isPortraitCard ? 136 : 196;
    const scale = targetW / geometry.w;
    const targetH = Math.round(geometry.h * scale);

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(targetW * dpr);
    canvas.height = Math.round(targetH * dpr);
    canvas.style.width = `${targetW}px`;
    canvas.style.height = `${targetH}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, targetW, targetH);

    // Clip to CR80 rounded corners
    const cornerRadiusPx = 3.18 * scale;
    drawRoundRect(ctx, 0, 0, targetW, targetH, cornerRadiusPx);
    ctx.clip();

    const trimGeometry: CardGeometry = {
      ...geometry,
      bleed: 0,
    };

    const sideData: CardSideData = {
      bg: sideConfig.bg || '#ffffff',
      bgImg,
      bgName: sideConfig.baseAsset?.name || sideConfig.bgName || '',
      overlayImg,
      overlayName: sideConfig.overlayAsset?.name || '',
      els: sideConfig.elements || [],
    };

    const recordWithPhoto: IdCardPersonRecord = {
      ...sampleEmployee,
      __img: empImg || sampleEmployee?.__img,
    };

    drawCardSide(ctx, sideData, recordWithPhoto, trimGeometry, scale, {
      logo: null,
      photos: new Map(),
      isPreview: true,
      showGuides: false,
    });

    ctx.restore();
  }, [sideConfig, geometry, sampleEmployee, empImg, bgImg, overlayImg]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="rounded-[11px] overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.35),0_0_0_1px_rgba(148,163,184,0.25)] bg-white dark:bg-slate-900 relative">
        <canvas ref={canvasRef} className="block" />
        {/* Accessible screen-reader text summary */}
        <span className="sr-only">
          {sampleEmployee?.name || 'Employee'} {sampleEmployee?.designation || ''}{' '}
          {sampleEmployee?.org || 'Organization'}
        </span>
      </div>
      <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};

interface IdCardTemplatePickerStepProps {
  selectedTemplateId: string;
  onSelectTemplateId: (id: string) => void;
  geometry: CardGeometry;
  onOrientationChange: (orientation: 'landscape' | 'portrait') => void;
  sampleEmployee: IdCardPersonRecord;
  onProceed: () => void;
  onOpenUploadWizard: () => void;
  onOpenDesigner: () => void;
  customTemplates: IdCardCustomTemplate[];
  onSelectCustomTemplate?: (tpl: IdCardCustomTemplate) => void;
  onBumpTemplateVersion?: (tpl: IdCardCustomTemplate) => void;
  onImportTemplateBundle?: (file: File) => void;
  onCloneStarterTemplate?: (starter: TemplateCardInfo) => void;
  onCreateBlankDesign?: () => void;
  onCloneOrganizationTemplate?: (tpl: IdCardCustomTemplate) => void;
  onArchiveOrganizationTemplate?: (tpl: IdCardCustomTemplate) => void;
  onEditOrganizationTemplate?: (tpl: IdCardCustomTemplate) => void;
  onImportDefaultEpsPackage?: () => void;
  importError?: string | null;
}

type LibraryStatusFilter = 'ACTIVE' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

export const IdCardTemplatePickerStep: React.FC<IdCardTemplatePickerStepProps> = ({
  selectedTemplateId,
  onSelectTemplateId,
  geometry,
  onOrientationChange,
  sampleEmployee,
  onProceed,
  onOpenUploadWizard,
  onOpenDesigner,
  customTemplates,
  onSelectCustomTemplate,
  onBumpTemplateVersion,
  onImportTemplateBundle,
  onCreateBlankDesign,
  onCloneOrganizationTemplate,
  onArchiveOrganizationTemplate,
  onEditOrganizationTemplate,
  onImportDefaultEpsPackage,
  importError,
}) => {
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>('ACTIVE');
  const [isDesignGuideOpen, setIsDesignGuideOpen] = useState(false);
  const [guideOrientation, setGuideOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const bundleInputRef = useRef<HTMLInputElement>(null);
  const orgSectionRef = useRef<HTMLDivElement>(null);

  const activeGuideKit = generateDesignGuideSpecKit(guideOrientation);

  const handleDownloadGuideSvg = () => {
    const blob = new Blob([activeGuideKit.svgGuideContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `joy-idcard-guide-cr80-${guideOrientation}-${activeGuideKit.widthPx}x${activeGuideKit.heightPx}-300dpi.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSpecReadme = () => {
    const blob = new Blob([activeGuideKit.readmeMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JOY_ID_CARD_DESIGNER_SPEC_${guideOrientation.toUpperCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBundle = (e: React.MouseEvent, tpl: IdCardCustomTemplate) => {
    e.stopPropagation();
    const json = exportIdTemplateBundle(tpl);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${slug}-v${tpl.version}.idtemplate.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeCount = customTemplates.filter(t => t.status !== 'archived').length;
  const archivedCount = customTemplates.filter(t => t.status === 'archived').length;

  const filteredTemplates = customTemplates.filter(t => {
    if (statusFilter === 'ACTIVE') return t.status !== 'archived';
    if (statusFilter === 'PUBLISHED') return t.status === 'published';
    if (statusFilter === 'DRAFT') return t.status === 'draft';
    if (statusFilter === 'ARCHIVED') return t.status === 'archived';
    return true;
  });

  const selectedCustomTemplate = customTemplates.find(t => t.id === selectedTemplateId && t.status !== 'archived');
  const isPortrait = geometry.orientation === 'portrait';
  const trimLabel = isPortrait ? '53.98 × 85.60 mm' : '85.60 × 53.98 mm';
  const bleedLabel = isPortrait ? '59.98 × 91.60 mm' : '91.60 × 59.98 mm';

  const handleBlankDesignClick = () => {
    if (onCreateBlankDesign) {
      onCreateBlankDesign();
    } else {
      onOpenDesigner();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/*Hidden File Input for .idtemplate / JSON import*/}
      <input
        ref={bundleInputRef}
        type="file"
        accept=".json,.idtemplate"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f && onImportTemplateBundle) onImportTemplateBundle(f);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP WORKSPACE HEADER & PHYSICAL CR80 GEOMETRY BAR          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              ID Card Design Library
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {sampleEmployee?.org || 'Organization Workspace'}
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
            <span>Organization Design & Print Workspace</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {activeCount} Saved {activeCount === 1 ? 'Design' : 'Designs'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create a blank CR80 design, upload finished front & back artwork, or import a portable <code className="font-mono">.idtemplate</code> package.
          </p>
        </div>

        {/* Physical Card Format & Bleed Specification Pill */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="px-2.5 py-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">CR80 Trim:</span> {trimLabel} ·{' '}
            <span className="font-bold text-emerald-700 dark:text-emerald-400">Full Bleed (+3mm):</span> {bleedLabel}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOrientationChange('landscape')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                geometry.orientation === 'landscape'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Landscape (85.60 × 53.98 mm)
            </button>
            <button
              type="button"
              onClick={() => onOrientationChange('portrait')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                geometry.orientation === 'portrait'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Portrait (53.98 × 85.60 mm)
            </button>
          </div>
        </div>
      </div>

      {/* Defensive Import Validation Error Banner */}
      {importError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
          <span>
            <strong>Template Import Blocked:</strong> {importError}
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. FOUR-CARD NEW EXPERIENCE CREATION HUB                      */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            New Design Experience
          </span>
          <button
            type="button"
            onClick={() => setIsDesignGuideOpen(true)}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Download 300 DPI Designer Spec Kit (.SVG + .MD)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: Blank Design */}
          <button
            type="button"
            onClick={handleBlankDesignClick}
            className="p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Create Blank Design
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Start from an empty CR80 canvas in the 3-pane editor with millimetre rulers, bleed guides, and live layers.
                </p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-slate-800 dark:text-slate-200 group-hover:translate-x-1 transition-transform">
              <span>Open Blank Canvas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Action 2: Upload Artwork */}
          <button
            type="button"
            onClick={onOpenUploadWizard}
            className="p-5 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 hover:border-emerald-500 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Upload Artwork
                  </h3>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    BYOD
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Import finished front and back designs (PNG, WebP, SVG, PDF, EPS) with 1-click bleed check and field binding.
                </p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Start Upload Wizard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Action 3: Import Template (.idtemplate / JSON) */}
          <button
            type="button"
            onClick={() => bundleInputRef.current?.click()}
            className="p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Import Template
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Load a validated <code className="font-mono">.idtemplate</code> package or native JSON design configuration from another branch.
                </p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>Select .idtemplate / JSON</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Action 4: Open My Designs */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ACTIVE');
              orgSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500 dark:hover:border-amber-500 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Open My Designs ({activeCount})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Browse, clone, version, or edit your organization's saved draft and published card templates.
                </p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>View Saved Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. ORGANIZATION TEMPLATES LIBRARY (NO GENERIC STARTERS)       */}
      {/* ------------------------------------------------------------- */}
      <div ref={orgSectionRef} className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Organization Templates ({filteredTemplates.length})
            </h3>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'ACTIVE', label: `Active (${activeCount})` },
                { key: 'PUBLISHED', label: 'Published' },
                { key: 'DRAFT', label: 'Drafts' },
                { key: 'ARCHIVED', label: `Archived (${archivedCount})` },
              ] as { key: LibraryStatusFilter; label: string }[]
            ).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map(tpl => {
              const isSelected = selectedTemplateId === tpl.id;
              const isArchived = tpl.status === 'archived';
              const tplPortrait = tpl.geometry.orientation === 'portrait';
              const tplTrim = tplPortrait ? '53.98×85.60 mm' : '85.60×53.98 mm';

              return (
                <div
                  key={tpl.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Organization template ${tpl.name} version ${tpl.version}`}
                  onClick={() => {
                    if (isArchived) return;
                    onSelectTemplateId(tpl.id);
                    if (onSelectCustomTemplate) onSelectCustomTemplate(tpl);
                  }}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isArchived) {
                      e.preventDefault();
                      onSelectTemplateId(tpl.id);
                      if (onSelectCustomTemplate) onSelectCustomTemplate(tpl);
                    }
                  }}
                  className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between relative ${
                    isArchived
                      ? 'opacity-70 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-default'
                      : isSelected
                      ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-lg ring-4 ring-emerald-500/10 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Dual Front & Back Live Preview Container */}
                    <div className="rounded-2xl bg-slate-100 dark:bg-slate-950 p-3 flex items-center justify-center gap-3 relative overflow-hidden border border-slate-200/70 dark:border-slate-800">
                      {isSelected && !isArchived && (
                        <div className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* True WYSIWYG Front & Back Canvas Thumbnails */}
                      <TemplateSideThumbnailCanvas
                        sideConfig={tpl.sides.front}
                        geometry={tpl.geometry}
                        sampleEmployee={sampleEmployee}
                        label="Front"
                      />

                      <TemplateSideThumbnailCanvas
                        sideConfig={tpl.sides.back}
                        geometry={tpl.geometry}
                        sampleEmployee={sampleEmployee}
                        label="Back"
                      />
                    </div>

                    {/* Metadata */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {tpl.name}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              tpl.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : tpl.status === 'draft'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {tpl.status}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            v{tpl.version}.0
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {tpl.description || 'Front + Back · CR80 Organization Template'}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Front + Back · CR80 ({tplTrim})</span>
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          v{tpl.version}.0
                          {tpl.versionHistory && tpl.versionHistory.length > 0
                            ? ` (${tpl.versionHistory.length} snapshot${tpl.versionHistory.length > 1 ? 's' : ''})`
                            : ''}{' '}
                          • {tpl.issuedCardsCount ? `${tpl.issuedCardsCount} issued` : 'CMYK ICC'}
                        </span>
                      </div>

                      {/* Enterprise Template Lifecycle Actions */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              if (onEditOrganizationTemplate) {
                                onEditOrganizationTemplate(tpl);
                              } else {
                                onSelectTemplateId(tpl.id);
                                if (onSelectCustomTemplate) onSelectCustomTemplate(tpl);
                                onOpenDesigner();
                              }
                            }}
                            title="Open in 3-Pane Precision Editor"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {onCloneOrganizationTemplate && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onCloneOrganizationTemplate(tpl);
                              }}
                              title="Clone organization template as a new Draft"
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-700 hover:text-emerald-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Copy className="w-3 h-3 text-emerald-600" />
                              <span>Clone</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              if (onBumpTemplateVersion) onBumpTemplateVersion(tpl);
                            }}
                            title="Lock current version snapshot and publish next version"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-700 hover:text-emerald-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <GitBranch className="w-3 h-3 text-emerald-600" />
                            <span>Bump to v{tpl.version + 1}.0</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={e => handleExportBundle(e, tpl)}
                            title="Export portable .idtemplate.json package"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/50 text-slate-700 hover:text-blue-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Share2 className="w-3 h-3 text-blue-600" />
                            <span>Export .idtemplate</span>
                          </button>

                          {!isArchived && onArchiveOrganizationTemplate && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onArchiveOrganizationTemplate(tpl);
                              }}
                              title="Archive template while preserving issued-card history"
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Archive className="w-3 h-3" />
                              <span>Archive</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Clean, Purposeful Organization Empty State (No Generic Starters Injected) */
          <div className="p-10 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center bg-white dark:bg-slate-900/60 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="max-w-lg mx-auto space-y-1.5">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                No Saved Organization Templates Yet
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your organization workspace starts clean without generic demo templates. Create a blank CR80 design, upload your front and back artwork, or import an existing <code className="font-mono">.idtemplate</code> package to begin issuing employee cards.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleBlankDesignClick}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Create Blank Design</span>
              </button>

              <button
                type="button"
                onClick={onOpenUploadWizard}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Artwork</span>
              </button>

              <button
                type="button"
                onClick={() => bundleInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Import Template (.idtemplate / JSON)</span>
              </button>

              {onImportDefaultEpsPackage && (
                <button
                  type="button"
                  onClick={onImportDefaultEpsPackage}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition-colors cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Import Yellow Geometric EPS Package</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. FLOATING BOTTOM ACTION BAR                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="sticky bottom-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl z-20">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Active Organization Template:</span>
          {selectedCustomTemplate ? (
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              {selectedCustomTemplate.name} (v{selectedCustomTemplate.version}.0 · {selectedCustomTemplate.geometry.orientation} · Trim {trimLabel})
            </p>
          ) : (
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
              No organization template selected — create, upload, or import a design above to proceed
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onProceed}
          disabled={!selectedCustomTemplate}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs shadow-md shadow-emerald-900/20 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <span>Continue to Select People</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. PREPRESS DESIGNER SPEC KIT MODAL (300 DPI)                 */}
      {/* ------------------------------------------------------------- */}
      {isDesignGuideOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>CR80 Prepress Designer Spec Kit (300 DPI)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Canva • Figma • Illustrator • PSD
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Download exact 300 DPI bleed/trim/punch-slot guide templates for your graphic designer or print vendor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDesignGuideOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left: Visual Guide Artboard Preview (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-1.5 mb-3 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGuideOrientation('portrait')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      guideOrientation === 'portrait' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Portrait (709×1082 px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuideOrientation('landscape')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      guideOrientation === 'landscape' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Landscape (1082×709 px)
                  </button>
                </div>

                <img
                  src={activeGuideKit.svgDataUrl}
                  alt="Prepress Guide"
                  className="max-h-72 rounded-lg shadow-lg border border-slate-800"
                />
              </div>

              {/* Right: Spec Sheet & Download Buttons (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {activeGuideKit.readmeMarkdown}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadGuideSvg}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download 300 DPI Vector Guide (.SVG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSpecReadme}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode2 className="w-4 h-4" />
                    <span>Download Designer Spec README (.MD)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
