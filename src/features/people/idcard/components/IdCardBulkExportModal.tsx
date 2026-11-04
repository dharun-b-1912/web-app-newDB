// src/features/people/idcard/components/IdCardBulkExportModal.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Production Bulk Batch Generation & Duplex Sheets
// ============================================================================

import React, { useState } from 'react';
import {
  IdCardPersonRecord,
  CardGeometry,
  CardSideData,
  ExportLayout,
  ExportSides,
  ExportDpi,
} from '../idCardTypes';
import {
  exportCmykPdfFile,
} from '../idCardService';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Users,
  Layers,
  FileSpreadsheet,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface IdCardBulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: IdCardPersonRecord[];
  geometry: CardGeometry;
  frontSide: CardSideData;
  backSide: CardSideData;
  logoImg: HTMLImageElement | null;
  photosMap: Map<string, HTMLImageElement>;
}

export const IdCardBulkExportModal: React.FC<IdCardBulkExportModalProps> = ({
  isOpen,
  onClose,
  employees,
  geometry,
  frontSide,
  backSide,
  logoImg,
  photosMap,
}) => {
  // Selected Employees IDs
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(
    new Set(employees.map(e => e.id || e.idno))
  );

  // Export Settings
  const [layout, setLayout] = useState<ExportLayout>('sheet');
  const [paper, setPaper] = useState<string>('210x297'); // A4 default
  const [sides, setSides] = useState<ExportSides>('both');
  const [dpi, setDpi] = useState<ExportDpi>(300);
  const [cropMarks, setCropMarks] = useState<boolean>(true);

  // Generation Progress
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');

  if (!isOpen) return null;

  // Toggle selection
  const toggleEmp = (id: string) => {
    setSelectedEmpIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedEmpIds(new Set(employees.map(e => e.id || e.idno)));
  };

  const selectNone = () => {
    setSelectedEmpIds(new Set());
  };

  const targetEmployees = employees.filter(e => selectedEmpIds.has(e.id || e.idno));
  const missingPhotosCount = targetEmployees.filter(e => !e.__img && (!e.photo || !photosMap.has(e.photo.toLowerCase()))).length;

  // Run the batch PDF generation
  const handleStartGeneration = async () => {
    if (targetEmployees.length === 0) return;

    setIsExporting(true);
    setProgressPct(5);
    setProgressText('Preparing workforce assets & color profiles…');

    try {
      const blob = await exportCmykPdfFile(
        { front: frontSide, back: backSide },
        targetEmployees,
        geometry,
        {
          dpi,
          layout,
          paper,
          sides,
          cropMarks,
          logo: logoImg,
          photos: photosMap,
          onProgress: (pct, text) => {
            setProgressPct(pct);
            setProgressText(text);
          },
        }
      );

      // Trigger automatic browser download
      const targetFileName = `JOY_ID_Cards_Batch_${geometry.orientation}_${targetEmployees.length}Staff_${layout === 'sheet' ? 'DuplexA4Sheet' : 'SingleCards'}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = targetFileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);

      setProgressText(`✓ Successfully exported print PDF with ${targetEmployees.length} cards!`);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Bulk generation error:', err);
      setProgressText(`Error: ${err.message || 'Failed to generate PDF'}`);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-3xl bg-[#13171c] border border-[#252d37] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] text-[#e6eaee] overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-[#252d37] px-6 flex items-center justify-between shrink-0 bg-[#181d24]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/70 border border-indigo-600/50 flex items-center justify-center text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Bulk ID Card Generation & Print Sheets</h3>
              <p className="text-[11px] text-gray-400">
                Commercial CMYK PDF with duplex page mirroring, bleed, and vector crop marks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="w-8 h-8 rounded-lg bg-[#111418] hover:bg-[#252d37] border border-[#2c3642] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Layout & Print Sheet Settings */}
          <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Print Sheet Layout & Format
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Layout Format</label>
                <select
                  value={layout}
                  onChange={e => setLayout(e.target.value as ExportLayout)}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="sheet">A4 Multi-Card Print Sheet (Duplex Aligned)</option>
                  <option value="card">1 Card Per Page (with Slug & Crop Marks)</option>
                </select>
              </div>

              {layout === 'sheet' && (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Paper Size</label>
                  <select
                    value={paper}
                    onChange={e => setPaper(e.target.value)}
                    className="w-full bg-[#111418] border border-[#2d3744] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="210x297">A4 Sheet (210 × 297 mm)</option>
                    <option value="297x420">A3 Sheet (297 × 420 mm)</option>
                    <option value="320x450">SRA3 Commercial Press (320 × 450 mm)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#252d37]">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Printed Sides</label>
                <select
                  value={sides}
                  onChange={e => setSides(e.target.value as ExportSides)}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="both">Front & Back (Duplex)</option>
                  <option value="front">Front Side Only</option>
                  <option value="back">Back Side Only</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Print Resolution</label>
                <select
                  value={dpi}
                  onChange={e => setDpi(parseInt(e.target.value) as ExportDpi)}
                  className="w-full bg-[#111418] border border-[#2d3744] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value={300}>300 DPI (Commercial Standard)</option>
                  <option value={600}>600 DPI (High Definition)</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={cropMarks}
                    onChange={e => setCropMarks(e.target.checked)}
                    className="rounded border-[#2d3744] text-indigo-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold">Print Crop Marks</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. Employee Roster Selection */}
          <div className="bg-[#181d24] border border-[#27313d] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                  Select Workforce ({targetEmployees.length} of {employees.length} chosen)
                </span>
                {missingPhotosCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {missingPhotosCount} missing photo
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={selectNone}
                  className="text-xs text-gray-400 hover:text-gray-300 font-semibold cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Scrollable Checkbox List */}
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 border border-[#252d37] rounded-lg p-2 bg-[#111418]">
              {employees.map(emp => {
                const isSelected = selectedEmpIds.has(emp.id || emp.idno);
                const hasPhoto = Boolean(emp.__img || emp.avatar_url);

                return (
                  <label
                    key={emp.id || emp.idno}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-950/40 text-white' : 'hover:bg-[#181d24] text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEmp(emp.id || emp.idno)}
                        className="rounded border-[#2d3744] text-indigo-600 focus:ring-0"
                      />
                      <span className="font-bold text-xs">{emp.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">({emp.idno})</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-gray-400">{emp.department}</span>
                      {hasPhoto ? (
                        <span className="text-emerald-400 font-bold">✓ Photo</span>
                      ) : (
                        <span className="text-amber-400 font-bold">⚠ No Pic</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Progress Bar during generation */}
          {isExporting && (
            <div className="bg-[#181d24] border border-indigo-700/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-indigo-300 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{progressText}</span>
                </span>
                <strong className="text-white">{progressPct}%</strong>
              </div>
              <div className="w-full bg-[#111418] rounded-full h-2 overflow-hidden border border-[#252d37]">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-16 border-t border-[#252d37] px-6 flex items-center justify-between shrink-0 bg-[#181d24]">
          <div className="text-xs text-gray-400 font-mono">
            {layout === 'sheet' ? 'Duplex mirror active on back side' : '1 Card/page with crop marks'}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-[#1c2229] hover:bg-[#28323c] border border-[#2c3642] text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleStartGeneration}
              disabled={isExporting || targetEmployees.length === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate Batch ({targetEmployees.length} Cards)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

