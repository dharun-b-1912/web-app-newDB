// src/features/people/idcard/components/IdCardLeftSidebar.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Left Master Setup, Templates & Workforce Panel
// ============================================================================

import React, { useState } from 'react';
import {
  CardGeometry,
  CardOrientation,
  CardSideData,
  IdCardPersonRecord,
  CR80_LANDSCAPE,
  CR80_PORTRAIT,
  BackgroundArtworkSettings,
  BackgroundCropSettings,
  BackgroundFitMode,
} from '../idCardTypes';
import {
  LayoutTemplate,
  Sliders,
  Palette,
  Users,
  Image as ImageIcon,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Sparkles,
  Upload,
  Crop,
  Trash2,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RotateCw,
  Layers,
} from 'lucide-react';
import { IdCardArtworkCropModal } from './IdCardArtworkCropModal';

interface IdCardLeftSidebarProps {
  geometry: CardGeometry;
  onUpdateGeometry: (newGeo: CardGeometry) => void;
  onApplyTemplate: (category: 'corporate' | 'campus' | 'minimal' | 'worker' | 'contractor' | 'security') => void;
  frontSide: CardSideData;
  backSide: CardSideData;
  onUpdateSideBg: (side: 'front' | 'back', bg: string, bgImg?: HTMLImageElement | null) => void;
  onUploadSideArtwork: (side: 'front' | 'back', file: File) => Promise<void>;
  onRemoveSideArtwork: (side: 'front' | 'back') => void;
  onUpdateArtworkSettings: (side: 'front' | 'back', settings: Partial<BackgroundArtworkSettings>) => void;
  onCopyArtworkSettings: (fromSide: 'front' | 'back', toSide: 'front' | 'back') => void;
  onClearSideElements: (side: 'front' | 'back') => void;
  logoImg: HTMLImageElement | null;
  onUploadLogo: (file: File) => void;
  onRemoveLogo: () => void;
  employees: IdCardPersonRecord[];
  activeEmployeeIndex: number;
  onSelectEmployeeIndex: (idx: number) => void;
  onOpenPhotoManager: () => void;
  onOpenBulkModal: () => void;
  photoMatchedCount: number;
}

type TabType = 'templates' | 'setup' | 'artwork' | 'workforce';
type ArtworkSubTab = 'front' | 'back' | 'logo' | 'colors';

export const IdCardLeftSidebar: React.FC<IdCardLeftSidebarProps> = ({
  geometry,
  onUpdateGeometry,
  onApplyTemplate,
  frontSide,
  backSide,
  onUpdateSideBg,
  onUploadSideArtwork,
  onRemoveSideArtwork,
  onUpdateArtworkSettings,
  onCopyArtworkSettings,
  onClearSideElements,
  logoImg,
  onUploadLogo,
  onRemoveLogo,
  employees,
  activeEmployeeIndex,
  onSelectEmployeeIndex,
  onOpenPhotoManager,
  onOpenBulkModal,
  photoMatchedCount,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [artworkSubTab, setArtworkSubTab] = useState<ArtworkSubTab>('front');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropSide, setCropSide] = useState<'front' | 'back'>('front');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Unique departments for filter
  const departments = ['ALL', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.idno || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <aside className="w-80 bg-[#13171c] border-r border-[#252d37] flex flex-col h-full text-[#e6eaee] text-xs select-none">
      {/* Tab Navigation Ribbon */}
      <div className="grid grid-cols-4 border-b border-[#252d37] bg-[#181d24]">
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 flex flex-col items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer border-b-2 ${
            activeTab === 'templates'
              ? 'border-blue-500 text-blue-400 bg-[#13171c]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          <span>Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('setup')}
          className={`py-3 flex flex-col items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer border-b-2 ${
            activeTab === 'setup'
              ? 'border-blue-500 text-blue-400 bg-[#13171c]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Card Size</span>
        </button>

        <button
          onClick={() => setActiveTab('artwork')}
          className={`py-3 flex flex-col items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer border-b-2 ${
            activeTab === 'artwork'
              ? 'border-blue-500 text-blue-400 bg-[#13171c]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Artwork</span>
        </button>

        <button
          onClick={() => setActiveTab('workforce')}
          className={`py-3 flex flex-col items-center gap-1 font-bold text-[11px] transition-colors cursor-pointer border-b-2 ${
            activeTab === 'workforce'
              ? 'border-blue-500 text-blue-400 bg-[#13171c]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>People ({employees.length})</span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ================================================================= */}
        {/* TAB 1: TEMPLATES GALLERY (Landscape & Portrait Dedicated)          */}
        {/* ================================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-300 uppercase text-[10px] tracking-wider">
                {geometry.orientation.toUpperCase()} TEMPLATES
              </span>
              <span className="text-[10px] text-blue-400 font-mono">
                {geometry.w} × {geometry.h} mm
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Applying a template updates both front & back sides while preserving your workforce photo and logo artwork.
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {/* 1. Corporate Executive */}
              <div
                onClick={() => onApplyTemplate('corporate')}
                className="group p-3 rounded-xl bg-[#181d24] hover:bg-[#1f2630] border border-[#27313d] hover:border-blue-500/50 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f2f57] border border-blue-400" />
                    <span>Corporate Executive</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 font-semibold">
                    Standard
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Navy & azure executive design with organization header, logo banner, and credential verification.
                </p>
              </div>

              {/* 2. Manufacturing Worker */}
              <div
                onClick={() => onApplyTemplate('worker')}
                className="group p-3 rounded-xl bg-[#181d24] hover:bg-[#1f2630] border border-[#27313d] hover:border-amber-500/50 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span>Manufacturing & Plant Worker</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-semibold">
                    Safety
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  High-vis safety amber accents with prominent blood group, shift department, and emergency instructions.
                </p>
              </div>

              {/* 3. Contractor / Manpower */}
              <div
                onClick={() => onApplyTemplate('contractor')}
                className="group p-3 rounded-xl bg-[#181d24] hover:bg-[#1f2630] border border-[#27313d] hover:border-teal-500/50 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" />
                    <span>Contractor / Joy Manpower</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 font-semibold">
                    Contract
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Third-party contractor & vendor badge with agency stamping, worksite gate access, and validity term.
                </p>
              </div>

              {/* 4. Campus / Modern */}
              <div
                onClick={() => onApplyTemplate('campus')}
                className="group p-3 rounded-xl bg-[#181d24] hover:bg-[#1f2630] border border-[#27313d] hover:border-emerald-500/50 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#07563D] border border-emerald-400" />
                    <span>Campus & Modern Tech</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold">
                    Modern
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Emerald green theme with circular portrait avatar halo, validity badge, and turnstile barcode/QR.
                </p>
              </div>

              {/* 5. Minimalist Editorial */}
              <div
                onClick={() => onApplyTemplate('minimal')}
                className="group p-3 rounded-xl bg-[#181d24] hover:bg-[#1f2630] border border-[#27313d] hover:border-rose-500/50 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#e63946]" />
                    <span>Minimalist Editorial</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-semibold">
                    Clean
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Swiss-style typography, crimson hairline accents, high-contrast monospace employee credentials.
                </p>
              </div>

              {/* 6. Security & Visitor Pass */}
              <div
                onClick={() => onApplyTemplate('security')}
                className="group p-3 rounded-xl bg-[#181d24] hover:bg-[#1f2630] border border-[#27313d] hover:border-red-500/50 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                    <span>Security & Restricted Access</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-semibold">
                    Secure
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  High-security facility badge with clearance level 3 badge, bold warning banner, and validation token.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: CARD SIZE & BLEED SETUP                                    */}
        {/* ================================================================= */}
        {activeTab === 'setup' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Card Dimensions Preset
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateGeometry(CR80_LANDSCAPE)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    geometry.orientation === 'landscape' && geometry.w === 85.6
                      ? 'bg-blue-950/60 border-blue-500 text-white font-bold'
                      : 'bg-[#181d24] border-[#27313d] text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">CR80 Landscape</div>
                  <div className="text-[10px] font-mono text-gray-400 mt-0.5">85.6 × 54.0 mm</div>
                </button>

                <button
                  onClick={() => onUpdateGeometry(CR80_PORTRAIT)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    geometry.orientation === 'portrait' && geometry.w === 54.0
                      ? 'bg-blue-950/60 border-blue-500 text-white font-bold'
                      : 'bg-[#181d24] border-[#27313d] text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">CR80 Portrait</div>
                  <div className="text-[10px] font-mono text-gray-400 mt-0.5">54.0 × 85.6 mm</div>
                </button>
              </div>
            </div>

            {/* Custom Millimeter Dimensions */}
            <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-3 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Custom Physical Sizing (mm)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Width (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="30"
                    max="150"
                    value={geometry.w}
                    onChange={e =>
                      onUpdateGeometry({
                        ...geometry,
                        w: parseFloat(e.target.value) || 85.6,
                        orientation: (parseFloat(e.target.value) || 85.6) > geometry.h ? 'landscape' : 'portrait',
                      })
                    }
                    className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Height (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="30"
                    max="150"
                    value={geometry.h}
                    onChange={e =>
                      onUpdateGeometry({
                        ...geometry,
                        h: parseFloat(e.target.value) || 54.0,
                        orientation: geometry.w > (parseFloat(e.target.value) || 54.0) ? 'landscape' : 'portrait',
                      })
                    }
                    className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Bleed (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={geometry.bleed}
                    onChange={e => onUpdateGeometry({ ...geometry, bleed: parseFloat(e.target.value) || 3.0 })}
                    className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Safe Margin (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={geometry.safe}
                    onChange={e => onUpdateGeometry({ ...geometry, safe: parseFloat(e.target.value) || 3.0 })}
                    className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <p className="text-[10px] text-gray-400 pt-1">
                Standard ISO/IEC 7810 ID-1 credit card format is 85.60 × 53.98 mm. Most commercial card printing bureaus mandate 3.0 mm bleed.
              </p>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: ADVANCED ARTWORK & BACKGROUND MANAGER                      */}
        {/* ================================================================= */}
        {activeTab === 'artwork' && (
          <div className="space-y-4">
            {/* Sub-tab Navigation */}
            <div className="grid grid-cols-4 gap-1 bg-[#111418] p-1 rounded-xl border border-[#27313d]">
              <button
                type="button"
                onClick={() => setArtworkSubTab('front')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  artworkSubTab === 'front'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Front Side
              </button>
              <button
                type="button"
                onClick={() => setArtworkSubTab('back')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  artworkSubTab === 'back'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Back Side
              </button>
              <button
                type="button"
                onClick={() => setArtworkSubTab('logo')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  artworkSubTab === 'logo'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Logo
              </button>
              <button
                type="button"
                onClick={() => setArtworkSubTab('colors')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  artworkSubTab === 'colors'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Colors
              </button>
            </div>

            {/* A & B. FRONT OR BACK ARTWORK MANAGER */}
            {(artworkSubTab === 'front' || artworkSubTab === 'back') && (() => {
              const curSide = artworkSubTab;
              const otherSide = curSide === 'front' ? 'back' : 'front';
              const sideData = curSide === 'front' ? frontSide : backSide;
              const art = sideData.artwork || {
                fit: 'cover' as BackgroundFitMode,
                x: 0,
                y: 0,
                scale: 1.0,
                rotation: 0,
                opacity: 1.0,
                locked: false,
                visible: true,
              };

              return (
                <div className="space-y-3.5">
                  {/* Image Upload / Active Image Card */}
                  {!sideData.bgImg ? (
                    <div className="bg-[#181d24] border border-[#27313d] hover:border-blue-500/50 rounded-2xl p-4 text-center transition-all group">
                      <div className="w-12 h-12 mx-auto rounded-full bg-[#111418] border border-[#2c3642] flex items-center justify-center text-blue-400 mb-2.5 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        Upload {curSide.toUpperCase()} Card Artwork
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                        Finished front or back ID card design (PNG, JPG, WebP up to 30 MB). Converted directly to CMYK.
                      </p>

                      <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose Artwork File</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) onUploadSideArtwork(curSide, f);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="bg-[#181d24] border border-[#27313d] rounded-2xl p-3.5 space-y-3">
                      {/* Thumbnail & File Details */}
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-20 rounded-lg bg-[#111418] border border-[#2c3642] overflow-hidden shrink-0 relative group">
                          <img
                            src={sideData.bgImg.src}
                            alt={`${curSide} artwork`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCropSide(curSide);
                              setCropModalOpen(true);
                            }}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                            title="Crop and Align"
                          >
                            <Crop className="w-4 h-4 text-blue-400" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> {curSide.toUpperCase()} ACTIVE
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onUpdateArtworkSettings(curSide, { visible: art.visible === false ? true : false })}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title={art.visible === false ? 'Show Artwork' : 'Hide Artwork'}
                              >
                                {art.visible === false ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => onUpdateArtworkSettings(curSide, { locked: !art.locked })}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title={art.locked ? 'Unlock Position' : 'Lock Position'}
                              >
                                {art.locked ? <Lock className="w-3.5 h-3.5 text-blue-400" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-white truncate" title={sideData.bgName}>
                            {sideData.bgName || 'custom-artwork.png'}
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-[#111418] text-gray-300 border border-[#27313d]">
                              {art.naturalWidth || sideData.bgImg.naturalWidth}×{art.naturalHeight || sideData.bgImg.naturalHeight} px
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#111418] text-gray-300 border border-[#27313d]">
                              {art.format || 'PNG'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded font-bold border ${
                              (art.dpi || 300) >= 300
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
                            }`}>
                              {art.dpi || 300} DPI
                            </span>
                          </div>

                          {/* Replace / Remove buttons */}
                          <div className="flex items-center gap-2 mt-2.5">
                            <label className="px-2 py-1 rounded-lg bg-[#111418] hover:bg-[#202731] border border-[#2c3642] text-[11px] font-semibold text-gray-300 hover:text-white cursor-pointer transition-colors flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 text-blue-400" />
                              <span>Replace</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={e => {
                                  const f = e.target.files?.[0];
                                  if (f) onUploadSideArtwork(curSide, f);
                                }}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => onRemoveSideArtwork(curSide)}
                              className="px-2 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 text-[11px] font-semibold text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Image Fitting Strategy */}
                      <div className="pt-2 border-t border-[#27313d]">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                          Image Fitting Strategy
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['cover', 'contain', 'stretch', 'original'] as BackgroundFitMode[]).map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => onUpdateArtworkSettings(curSide, { fit: mode })}
                              className={`py-1.5 px-2 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                                art.fit === mode
                                  ? 'bg-blue-600/20 border border-blue-500 text-blue-400 shadow-xs'
                                  : 'bg-[#111418] border border-[#27313d] text-gray-400 hover:text-white'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {art.fit === 'cover' && 'Fills entire card & bleed. Excess cropped cleanly.'}
                          {art.fit === 'contain' && 'Displays complete image without cropping.'}
                          {art.fit === 'stretch' && 'Stretches exactly to card & bleed dimensions.'}
                          {art.fit === 'original' && 'Preserves natural 1:1 image resolution.'}
                        </p>
                      </div>

                      {/* Visual Crop Modal Launcher */}
                      <button
                        type="button"
                        onClick={() => {
                          setCropSide(curSide);
                          setCropModalOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-blue-950/50 hover:bg-blue-900/60 border border-blue-700/50 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Crop className="w-3.5 h-3.5 text-blue-400" />
                        <span>Open Precision Crop & Pan Tool</span>
                      </button>

                      {/* Transform: Zoom, Offsets, Opacity */}
                      <div className="space-y-2.5 pt-2 border-t border-[#27313d]">
                        {/* Zoom Slider */}
                        <div>
                          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>Artwork Scale</span>
                            <span className="font-mono text-white">{Math.round((art.scale || 1.0) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="3.0"
                            step="0.05"
                            value={art.scale || 1.0}
                            onChange={e => onUpdateArtworkSettings(curSide, { scale: parseFloat(e.target.value) })}
                            className="w-full accent-blue-500 cursor-pointer"
                          />
                        </div>

                        {/* Offsets X & Y in mm */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-400 block mb-0.5">Offset X (mm)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={art.x || 0}
                              onChange={e => onUpdateArtworkSettings(curSide, { x: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-[#111418] border border-[#27313d] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block mb-0.5">Offset Y (mm)</label>
                            <input
                              type="number"
                              step="0.5"
                              value={art.y || 0}
                              onChange={e => onUpdateArtworkSettings(curSide, { y: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-[#111418] border border-[#27313d] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Opacity */}
                        <div>
                          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>Image Opacity</span>
                            <span className="font-mono text-white">{Math.round((art.opacity ?? 1.0) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={art.opacity ?? 1.0}
                            onChange={e => onUpdateArtworkSettings(curSide, { opacity: parseFloat(e.target.value) })}
                            className="w-full accent-blue-500 cursor-pointer"
                          />
                        </div>

                        {/* Alignment buttons */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => onUpdateArtworkSettings(curSide, { x: 0 })}
                            className="flex-1 py-1 rounded bg-[#111418] hover:bg-[#202731] border border-[#27313d] text-[10px] text-gray-300 hover:text-white"
                          >
                            Center X
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateArtworkSettings(curSide, { y: 0 })}
                            className="flex-1 py-1 rounded bg-[#111418] hover:bg-[#202731] border border-[#27313d] text-[10px] text-gray-300 hover:text-white"
                          >
                            Center Y
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateArtworkSettings(curSide, { x: 0, y: 0, scale: 1.0, fit: 'cover' })}
                            className="py-1 px-2 rounded bg-[#111418] hover:bg-[#202731] border border-[#27313d] text-[10px] text-gray-400 hover:text-white"
                            title="Reset Position & Fit"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Color Tint Overlay */}
                      <div className="pt-2 border-t border-[#27313d] space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Color Tint Overlay
                          </label>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {Math.round((art.overlayOpacity || 0) * 100)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={art.overlayColor || '#000000'}
                            onChange={e => onUpdateArtworkSettings(curSide, { overlayColor: e.target.value })}
                            className="w-7 h-7 rounded cursor-pointer border border-[#2d3744] bg-transparent"
                          />
                          <input
                            type="range"
                            min="0"
                            max="0.9"
                            step="0.05"
                            value={art.overlayOpacity || 0}
                            onChange={e => onUpdateArtworkSettings(curSide, { overlayOpacity: parseFloat(e.target.value) })}
                            className="flex-1 accent-blue-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Reusable Cross-Side & Clear Actions */}
                      <div className="pt-2 border-t border-[#27313d] space-y-2">
                        <button
                          type="button"
                          onClick={() => onCopyArtworkSettings(curSide, otherSide)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-[#111418] hover:bg-[#202731] border border-[#27313d] text-gray-300 hover:text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-blue-400" />
                          <span>Copy Settings to {otherSide.toUpperCase()} Side</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onClearSideElements(curSide)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-amber-950/20 hover:bg-amber-900/30 border border-amber-800/30 text-amber-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Clear Foreground Elements (Keep Artwork)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* C. COMPANY LOGO SUB-TAB */}
            {artworkSubTab === 'logo' && (
              <div className="bg-[#181d24] border border-[#27313d] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Company Brand Logo
                  </span>
                  {logoImg && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-[#111418] border border-[#2c3642] flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                    {logoImg ? (
                      <img src={logoImg.src} alt="Company Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-gray-600" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors w-fit shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{logoImg ? 'Replace Logo' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) onUploadLogo(f);
                        }}
                        className="hidden"
                      />
                    </label>

                    {logoImg && (
                      <button
                        type="button"
                        onClick={onRemoveLogo}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 text-[11px] font-semibold text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Logo</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 pt-1 leading-relaxed">
                  Transparent PNG or vector SVG recommended. The logo appears dynamically on both card sides according to template placement.
                </p>
              </div>
            )}

            {/* D. SOLID BACKGROUND COLORS SUB-TAB */}
            {artworkSubTab === 'colors' && (
              <div className="bg-[#181d24] border border-[#27313d] rounded-2xl p-4 space-y-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Solid Card Background Colors
                </div>

                <div>
                  <label className="text-[11px] text-gray-300 block mb-1">Front Card Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={frontSide.bg || '#ffffff'}
                      onChange={e => onUpdateSideBg('front', e.target.value, frontSide.bgImg)}
                      className="w-8 h-8 rounded cursor-pointer border border-[#2d3744] bg-transparent"
                    />
                    <input
                      type="text"
                      value={frontSide.bg || '#ffffff'}
                      onChange={e => onUpdateSideBg('front', e.target.value, frontSide.bgImg)}
                      className="flex-1 bg-[#111418] border border-[#2d3744] rounded-lg px-2.5 py-1 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-gray-300 block mb-1">Back Card Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backSide.bg || '#ffffff'}
                      onChange={e => onUpdateSideBg('back', e.target.value, backSide.bgImg)}
                      className="w-8 h-8 rounded cursor-pointer border border-[#2d3744] bg-transparent"
                    />
                    <input
                      type="text"
                      value={backSide.bg || '#ffffff'}
                      onChange={e => onUpdateSideBg('back', e.target.value, backSide.bgImg)}
                      className="flex-1 bg-[#111418] border border-[#2d3744] rounded-lg px-2.5 py-1 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: WORKFORCE DIRECTORY & PHOTO MATCHER                        */}
        {/* ================================================================= */}
        {activeTab === 'workforce' && (
          <div className="space-y-3">
            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenPhotoManager}
                className="p-2.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/60 text-blue-200 flex flex-col items-center gap-1 cursor-pointer transition-all"
              >
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-[11px]">Photo Manager</span>
                <span className="text-[10px] text-blue-300 font-mono">
                  {photoMatchedCount} / {employees.length} Matched
                </span>
              </button>

              <button
                onClick={onOpenBulkModal}
                className="p-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-200 flex flex-col items-center gap-1 cursor-pointer transition-all"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-[11px]">Bulk Batch</span>
                <span className="text-[10px] text-indigo-300 font-mono">Duplex Sheets</span>
              </button>
            </div>

            {/* Search & Dept Filters */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name or employee ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#181d24] border border-[#27313d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full bg-[#181d24] border border-[#27313d] rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none"
              >
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee List */}
            <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
              {filteredEmployees.map((emp, idx) => {
                const isActive = employees[activeEmployeeIndex]?.id === emp.id;
                const hasPhoto = Boolean(emp.__img || emp.avatar_url);

                return (
                  <div
                    key={emp.id || emp.idno}
                    onClick={() => {
                      const realIndex = employees.findIndex(e => e.id === emp.id);
                      if (realIndex !== -1) onSelectEmployeeIndex(realIndex);
                    }}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-blue-950/60 border-blue-500 text-white shadow-xs'
                        : 'bg-[#181d24] border-[#27313d] text-gray-300 hover:bg-[#1f2630]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#111418] border border-[#2c3642] flex items-center justify-center overflow-hidden shrink-0">
                        {emp.__img ? (
                          <img src={emp.__img.src} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400">
                            {emp.name?.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{emp.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                          <span>{emp.idno}</span>
                          <span>•</span>
                          <span className="truncate">{emp.designation}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-1.5">
                      {hasPhoto ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                          Photo
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-semibold">
                          No Pic
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Visual Crop & Alignment Modal */}
      <IdCardArtworkCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        side={cropSide}
        img={cropSide === 'front' ? frontSide.bgImg : backSide.bgImg}
        geometry={geometry}
        artwork={cropSide === 'front' ? frontSide.artwork : backSide.artwork}
        onApplyCrop={(crop, fit, scale, x, y) => {
          onUpdateArtworkSettings(cropSide, { crop, fit, scale, x, y });
        }}
      />
    </aside>
  );
};

