// src/features/people/idcard/v2/components/steps/IdCardReviewFixStep.tsx
// ============================================================================
// Step 3: Precision Card Review & Actionable Preflight Checklist
// ============================================================================

import React, { useRef } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Upload,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { IdCardCanvasV2 } from '../IdCardCanvasV2';
import {
  CardGeometry,
  CardSide,
  CardSideData,
  IdCardPersonRecord,
  PreflightIssue,
} from '../../../idCardTypes';

interface IdCardReviewFixStepProps {
  sideData: CardSideData;
  activeEmployee: IdCardPersonRecord;
  employeeIndex: number;
  totalEmployees: number;
  geometry: CardGeometry;
  zoom: number;
  onZoomChange: (z: number) => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  activeSide: CardSide;
  onToggleSide: () => void;
  onPrevEmployee: () => void;
  onNextEmployee: () => void;
  onSelectEmployeeIndex: (idx: number) => void;
  logoImg: HTMLImageElement | null;
  photosMap: Map<string, HTMLImageElement>;
  issues: PreflightIssue[];
  onUploadPhotoForPerson: (personId: string, file: File) => void;
  onUploadLogo: (file: File) => void;
  onProceed: () => void;
}

export const IdCardReviewFixStep: React.FC<IdCardReviewFixStepProps> = ({
  sideData,
  activeEmployee,
  employeeIndex,
  totalEmployees,
  geometry,
  zoom,
  onZoomChange,
  showGuides,
  onToggleGuides,
  activeSide,
  onToggleSide,
  onPrevEmployee,
  onNextEmployee,
  onSelectEmployeeIndex,
  logoImg,
  photosMap,
  issues,
  onUploadPhotoForPerson,
  onUploadLogo,
  onProceed,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const checks = issues.filter(i => i.lv === 'check');
  const fixes = issues.filter(i => i.lv === 'fix');
  const oks = issues.filter(i => i.lv === 'ok');

  const hasPhoto = Boolean(
    activeEmployee.__img ||
      (activeEmployee.photo && photosMap.has(activeEmployee.photo.toLowerCase()))
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadPhotoForPerson(activeEmployee.id, e.target.files[0]);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadLogo(e.target.files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        onChange={handleLogoUpload}
        className="hidden"
      />

      {/* Center Main Canvas Viewport */}
      <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 min-h-[420px] overflow-hidden">
        <IdCardCanvasV2
          sideData={sideData}
          activeEmployee={activeEmployee}
          employeeIndex={employeeIndex}
          totalEmployees={totalEmployees}
          geometry={geometry}
          zoom={zoom}
          onZoomChange={onZoomChange}
          showGuides={showGuides}
          onToggleGuides={onToggleGuides}
          activeSide={activeSide}
          onToggleSide={onToggleSide}
          onPrevEmployee={onPrevEmployee}
          onNextEmployee={onNextEmployee}
          logoImg={logoImg}
          photosMap={photosMap}
        />
      </div>

      {/* Right Sidebar: Preflight Quality Audit Checklist */}
      <div className="w-full lg:w-96 bg-white dark:bg-slate-900 flex flex-col shrink-0 overflow-y-auto p-5 border-slate-200 dark:border-slate-800">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Preflight Print Audit</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Automated prepress validation before CMYK rasterization.
            </p>
          </div>

          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              fixes.length > 0
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : checks.length > 0
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
          >
            {fixes.length > 0
              ? `${fixes.length} Fixes Needed`
              : checks.length > 0
              ? `${checks.length} Warnings`
              : '100% Print Ready'}
          </span>
        </div>

        {/* Current Employee Quick Status Card */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Card Preview
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
              {employeeIndex + 1} / {totalEmployees}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-500 shrink-0">
              {hasPhoto && activeEmployee.__img ? (
                <img
                  src={activeEmployee.__img.src}
                  alt={activeEmployee.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                activeEmployee.name.slice(0, 2).toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                {activeEmployee.name}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {activeEmployee.designation} · {activeEmployee.idno}
              </div>
            </div>
          </div>

          <a
            href={`/verify-id-card?emp=${encodeURIComponent(activeEmployee.idno)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-1 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 font-bold text-[11px] flex items-center justify-center gap-1.5 border border-slate-700/80 shadow-xs transition-colors"
            title={`Open live QR verification portal for ${activeEmployee.name} (${activeEmployee.idno})`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              Preview QR Scan (/verify-id-card?emp={activeEmployee.idno})
            </span>
          </a>

          {!hasPhoto && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full mt-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo for {activeEmployee.name.split(' ')[0]}</span>
            </button>
          )}
        </div>

        {/* Preflight Checklist Items */}
        <div className="mt-5 space-y-3 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Audit Checklist ({issues.length} Rules)
          </span>

          <div className="space-y-2">
            {/* Fix Required Items */}
            {fixes.map((issue, idx) => (
              <div
                key={`fix_${idx}`}
                className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1.5"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs font-semibold text-rose-900 dark:text-rose-200 leading-snug">
                    {issue.t}
                  </div>
                </div>
              </div>
            ))}

            {/* Warnings / Checks Items */}
            {checks.map((issue, idx) => {
              const isLogoWarning = issue.t.toLowerCase().includes('logo');
              const isPhotoWarning = issue.t.toLowerCase().includes('photo');

              return (
                <div
                  key={`check_${idx}`}
                  className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs font-semibold text-amber-900 dark:text-amber-200 leading-snug">
                      {issue.t}
                    </div>
                  </div>

                  {isLogoWarning && !logoImg && (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="ml-6 px-2.5 py-1 rounded text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Company Logo</span>
                    </button>
                  )}
                </div>
              );
            })}

            {/* Verified OK Items */}
            {oks.slice(0, 4).map((issue, idx) => (
              <div
                key={`ok_${idx}`}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{issue.t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA to Step 4 */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
          <button
            type="button"
            onClick={onProceed}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
          >
            <span>Confirm & Continue to Generate</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

