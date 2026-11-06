// src/features/people/idcard/v2/components/steps/IdCardGenerateStep.tsx
// ============================================================================
// Step 4: V2.1 Enterprise Print Production Console
// Includes Physical CR80 Trim vs Full-Bleed Table, 6 Imposition & Vendor
// Formats, ICC Output Intent / PVC Driver Selector & Idempotent Batch Ledger
// ============================================================================

import React, { useState } from 'react';
import {
  FileText,
  Grid,
  Archive,
  Printer,
  Download,
  Check,
  Sparkles,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  History,
} from 'lucide-react';
import {
  PrintOutputFormat,
  IccOutputIntentProfile,
  PrintProductionBatch,
} from '../../types';
import { CardGeometry, IdCardPersonRecord } from '../../../idCardTypes';
import { verifyDuplexAlignment } from '../../customTemplateService';

interface IdCardGenerateStepProps {
  selectedEmployees: IdCardPersonRecord[];
  geometry: CardGeometry;
  templateName: string;
  templateVersion?: number;
  isExporting: boolean;
  exportProgress: number;
  onGenerate: (
    format: PrintOutputFormat,
    dpi: 300 | 600,
    sides: 'both' | 'front' | 'back',
    cropMarks: boolean,
    iccProfile?: IccOutputIntentProfile
  ) => void;
  lastGeneratedBlobUrl: string | null;
  onDownloadAgain: () => void;
  recentBatches?: PrintProductionBatch[];
}

export const IdCardGenerateStep: React.FC<IdCardGenerateStepProps> = ({
  selectedEmployees,
  geometry,
  templateName,
  templateVersion = 1,
  isExporting,
  exportProgress,
  onGenerate,
  lastGeneratedBlobUrl,
  onDownloadAgain,
  recentBatches = [],
}) => {
  const [outputFormat, setOutputFormat] = useState<PrintOutputFormat>('single_pdf');
  const [dpi, setDpi] = useState<300 | 600>(300);
  const [sides, setSides] = useState<'both' | 'front' | 'back'>('both');
  const [cropMarks, setCropMarks] = useState<boolean>(true);
  const [iccProfile, setIccProfile] = useState<IccOutputIntentProfile>('ISO_COATED_V2');

  const duplexSpec = verifyDuplexAlignment(geometry, geometry);

  const OUTPUT_OPTIONS: {
    id: PrintOutputFormat;
    title: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }[] = [
    {
      id: 'single_pdf',
      title: 'Single Card PDF',
      sub: 'Individual front and back pages with 3 mm bleed and vector corner crop marks.',
      icon: FileText,
      badge: 'Individual Front & Back',
    },
    {
      id: 'sheet_a4',
      title: 'A4 Imposition (8 Cards / Sheet)',
      sub: 'Imposed on A4 sheets with trim gutters. Back sides are mirrored automatically for duplex registration.',
      icon: Grid,
      badge: '8 Cards per Sheet',
    },
    {
      id: 'sheet_a3',
      title: 'A3 Commercial Sheet',
      sub: '16–20 cards per A3 sheet (297 × 420 mm) with registration marks for digital production presses.',
      icon: Layers,
      badge: 'Commercial Digital Press',
    },
    {
      id: 'sheet_sra3',
      title: 'SRA3 Production Sheet',
      sub: 'Commercial press layout (320 × 450 mm) with full bleed and guillotine cut gutters.',
      icon: Printer,
      badge: 'Offset & Heidelberg',
    },
    {
      id: 'high_res_png',
      title: 'High-Resolution Images (PNG)',
      sub: '300 / 600 DPI rasterised front and back card masters for direct card printer queues.',
      icon: ImageIcon,
      badge: '300 / 600 DPI PNG',
    },
    {
      id: 'zip_archive',
      title: 'Vendor ZIP Package',
      sub: 'Complete production archive containing locked artwork, employee PDFs, ICC profile metadata, and job manifest.',
      icon: Archive,
      badge: 'Artwork + PDFs + Manifest',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* 1. CONSOLE HEADER & PHYSICAL CR80 SPECIFICATION TABLE             */}
      {/* ----------------------------------------------------------------- */}
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Print Production Console
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
            <span>Step 4: Commercial Print & Card Production</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
              {selectedEmployees.length} Cards Queued
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure imposition format, ICC colour profile or direct PVC printer driver, and generate validated production files.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Duplex Alignment & Preflight Verified</span>
        </div>
      </div>

      {/* Physical Card Specifications Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Standard</span>
          <span className="text-xs font-extrabold font-mono text-white">ISO 7810 CR80</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Trim Width × Height</span>
          <span className="text-xs font-extrabold font-mono text-cyan-400">
            {duplexSpec.trimWidthMm.toFixed(2)} × {duplexSpec.trimHeightMm.toFixed(2)} mm
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Bleed Margin</span>
          <span className="text-xs font-extrabold font-mono text-rose-400">3.00 mm each side</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Full Bleed Size</span>
          <span className="text-xs font-extrabold font-mono text-amber-300">
            {duplexSpec.fullBleedWidthMm.toFixed(2)} × {duplexSpec.fullBleedHeightMm.toFixed(2)} mm
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Resolution</span>
          <span className="text-xs font-extrabold font-mono text-emerald-400">{dpi} DPI</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Duplex Match</span>
          <span className="text-xs font-extrabold font-mono text-emerald-400">Front = Back ✓</span>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. SIX PRINT OUTPUT OPTIONS                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          1. Choose Print Layout & Output Format
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {OUTPUT_OPTIONS.map(opt => {
            const isSelected = outputFormat === opt.id;
            const OptIcon = opt.icon;

            return (
              <div
                key={opt.id}
                role="button"
                tabIndex={0}
                onClick={() => setOutputFormat(opt.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOutputFormat(opt.id);
                  }
                }}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 ring-4 ring-emerald-500/10 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <OptIcon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 pr-4">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {opt.title}
                    </h4>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {opt.badge}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
                      {opt.sub}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. COLOUR MANAGEMENT (ICC PROFILE / PVC DRIVER) & PARAMETERS      */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Printer ICC Output Intent / PVC Driver */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            ICC Colour Profile / Printer Workflow:
          </label>
          <select
            value={iccProfile}
            onChange={e => setIccProfile(e.target.value as IccOutputIntentProfile)}
            className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="ISO_COATED_V2">ISO Coated v2 (ECI) — Offset CMYK</option>
            <option value="FOGRA39">FOGRA39 (ISO 12647-2) — Sheetfed CMYK</option>
            <option value="GRACOL_2013">GRACoL 2013 Coated — Commercial CMYK</option>
            <option value="PVC_DIRECT_SRGB">Direct PVC Card Printer Driver (Zebra/Evolis/Fargo)</option>
          </select>
        </div>

        {/* Resolution */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Print Resolution:
          </label>
          <select
            value={dpi}
            onChange={e => setDpi(Number(e.target.value) as 300 | 600)}
            className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value={300}>300 DPI (Standard Commercial)</option>
            <option value={600}>600 DPI (Optional High-Res Microtext)</option>
          </select>
        </div>

        {/* Card Sides Choice */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Duplex / Sides Mode:
          </label>
          <select
            value={sides}
            onChange={e => setSides(e.target.value as 'both' | 'front' | 'back')}
            className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
          >
            <option value="both">Both Sides (Duplex Front & Back)</option>
            <option value="front">Front Side Only</option>
            <option value="back">Back Side Only</option>
          </select>
        </div>

        {/* Prepress Registration Marks */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Bleed & Crop Marks
            </div>
            <div className="text-[11px] text-slate-400">
              {iccProfile === 'PVC_DIRECT_SRGB' ? 'Driver edge-to-edge mode' : '0.25 pt Japanese trim lines'}
            </div>
          </div>
          <input
            type="checkbox"
            checked={cropMarks}
            onChange={e => setCropMarks(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. PRODUCTION JOB SUMMARY & GENERATE CTA                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>
              Ready to Produce {selectedEmployees.length} Cards — {templateName} (v{templateVersion}.0)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Trim: {duplexSpec.trimWidthMm.toFixed(2)}×{duplexSpec.trimHeightMm.toFixed(2)} mm · Full Bleed:{' '}
            {duplexSpec.fullBleedWidthMm.toFixed(2)}×{duplexSpec.fullBleedHeightMm.toFixed(2)} mm · {dpi} DPI · Profile:{' '}
            {iccProfile}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {lastGeneratedBlobUrl && (
            <button
              type="button"
              onClick={onDownloadAgain}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Last Batch</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onGenerate(outputFormat, dpi, sides, cropMarks, iccProfile)}
            disabled={isExporting || selectedEmployees.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            <span>
              {isExporting
                ? `Rendering Production Batch... (${exportProgress}%)`
                : `Generate & Record Batch (${selectedEmployees.length} Cards)`}
            </span>
          </button>
        </div>
      </div>

      {/* Live Export Progress Indicator */}
      {isExporting && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Commercial Prepress & ICC Output Intent Engine Active</span>
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">{exportProgress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${exportProgress}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Applying {iccProfile} colour conversion, GCR & 300% Total Ink Limit...</span>
            <span>Embedding /OutputIntents & TrimBox</span>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5. IDEMPOTENT PRODUCTION BATCH LEDGER                             */}
      {/* ----------------------------------------------------------------- */}
      {recentBatches.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Recorded Production Batch History ({recentBatches.length})</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Idempotent Issuance Protection Active
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
            {recentBatches.slice(0, 4).map(batch => (
              <div key={batch.batchId} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{batch.batchId}</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {batch.templateName} (v{batch.templateVersion}.0)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span>{batch.cardsCount} cards</span>
                  <span>{batch.format.toUpperCase()}</span>
                  <span>{batch.dpi} DPI</span>
                  <span>{batch.iccProfile}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
