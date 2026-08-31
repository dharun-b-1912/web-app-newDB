import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Upload,
  CheckCircle2,
  FileText,
  ScanLine,
  Calendar,
  ShieldCheck,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { OcrExtractionResult } from '../../../types/vendorPortal';

interface DocumentIntelligenceOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const DocumentIntelligenceOcrModal: React.FC<DocumentIntelligenceOcrModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrExtractionResult | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsScanning(true);
    setOcrResult(null);

    try {
      const result = await vendorPortalService.simulateOcrExtraction({
        name: selectedFile.name,
        size: selectedFile.size,
      });
      setOcrResult(result);
    } catch (e) {
      console.error('OCR Extraction failed', e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreateRecord = () => {
    if (!ocrResult) return;

    vendorPortalService.addLicense({
      license_type: ocrResult.detected_document_type as any,
      license_number: ocrResult.extracted_license_number,
      issued_date: ocrResult.extracted_issue_date,
      expiry_date: ocrResult.extracted_expiry_date,
      issuing_authority: ocrResult.extracted_issuing_authority,
      document_name: file?.name || 'Scanned_License.pdf',
      reminders_enabled: true,
    });

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-violet-950/60 via-slate-900 to-indigo-950/40 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Document Intelligence & OCR Extraction
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                  AI Powered
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Upload Contract Labour License, Migrant Permit, or Factory Registration PDF for automated extraction
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!ocrResult && (
            <div className="border-2 border-dashed border-slate-700 hover:border-violet-500/60 rounded-2xl p-8 text-center bg-slate-950/40 transition">
              <input
                type="file"
                id="ocrUpload"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <label htmlFor="ocrUpload" className="cursor-pointer block space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Click or drag license document to scan</p>
                  <p className="text-xs text-slate-400 mt-1">Supports PDF, PNG, JPG files</p>
                </div>
              </label>

              {/* Sample Document Quick Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-400">Or try sample document:</span>
                <button
                  onClick={() => handleFileSelect(new File([''], 'Contract_Labour_License_2026.pdf'))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700"
                >
                  Contract Labour License
                </button>
                <button
                  onClick={() => handleFileSelect(new File([''], 'Migrant_Labour_Permit_ISMW.pdf'))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700"
                >
                  Migrant Labour Permit
                </button>
                <button
                  onClick={() => handleFileSelect(new File([''], 'Factory_License_DISH.pdf'))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700"
                >
                  Factory License
                </button>
              </div>
            </div>
          )}

          {/* Scanning Progress Animation */}
          {isScanning && (
            <div className="p-8 text-center space-y-4 bg-slate-950/60 rounded-2xl border border-violet-500/30 animate-in fade-in">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500 text-violet-300 flex items-center justify-center">
                  <ScanLine className="w-8 h-8 animate-bounce" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Scanning Document & Performing OCR Extraction...</h4>
                <p className="text-xs text-slate-400 mt-1">Analyzing statutory seals, license numbers, and validity periods</p>
              </div>
            </div>
          )}

          {/* OCR Result View */}
          {ocrResult && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Document Successfully Parsed</p>
                    <p className="text-[11px] text-emerald-400/80">
                      Detected: {ocrResult.detected_document_type} (Confidence: {ocrResult.confidence_score}%)
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-lg font-mono">
                  {ocrResult.confidence_score}% Accuracy
                </span>
              </div>

              {/* Extracted Fields Grid */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <p className="text-slate-500 text-[11px]">Detected License Category</p>
                    <p className="text-white font-bold mt-0.5">{ocrResult.detected_document_type}</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <p className="text-slate-500 text-[11px]">Extracted License Number</p>
                    <p className="text-indigo-300 font-mono font-bold mt-0.5">{ocrResult.extracted_license_number}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <p className="text-slate-500 text-[11px]">Extracted Issue Date</p>
                    <p className="text-white font-medium mt-0.5">{ocrResult.extracted_issue_date}</p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <p className="text-slate-500 text-[11px]">Extracted Expiry Date</p>
                    <p className="text-amber-400 font-medium mt-0.5">{ocrResult.extracted_expiry_date}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <p className="text-slate-500 text-[11px]">Issuing Authority / Seal Detected</p>
                  <p className="text-slate-300 mt-0.5">{ocrResult.extracted_issuing_authority}</p>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <p className="text-slate-500 text-[11px] font-mono">Raw OCR Text Snippet:</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-1 italic">
                    "{ocrResult.raw_text_snippet}"
                  </p>
                </div>
              </div>

              {/* Reminder Confirmation Notice */}
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  Automatic Smart Reminders will be scheduled for 90d, 60d, 30d, 15d, 7d, and 1d before {ocrResult.extracted_expiry_date}.
                </span>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
            >
              Cancel
            </button>

            {ocrResult && (
              <button
                onClick={handleCreateRecord}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Auto-Create Compliance Record & Start Reminders
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
