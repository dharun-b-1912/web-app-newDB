// src/components/common/CompanyLogoUpload.tsx
// ============================================================================
// Joy PeopleHR — Company Logo Uploader & Auto-Compression Component
// Drag-and-drop / file browser with client-side image compression & live preview
// ============================================================================

import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Check, RefreshCw } from 'lucide-react';
import { optimizeCompanyLogo, uploadLogoToBucket, OptimizedImageResult } from '../../utils/imageOptimizer';

interface CompanyLogoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  companyName?: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

export const CompanyLogoUpload: React.FC<CompanyLogoUploadProps> = ({
  value,
  onChange,
  onRemove,
  companyName,
  label = 'Company Logo',
  compact = false,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<{ sizeFormatted: string; width: number; height: number } | null>(null);

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, or WebP).');
      return;
    }

    setIsProcessing(true);
    try {
      const result: OptimizedImageResult = await optimizeCompanyLogo(file);
      setStats({
        sizeFormatted: result.sizeFormatted,
        width: result.width,
        height: result.height,
      });

      // Attempt bucket upload with fallback
      const finalUrl = await uploadLogoToBucket(file, companyName ? companyName.toLowerCase().replace(/\s+/g, '-') : 'company');
      onChange(finalUrl);
    } catch (err: any) {
      console.error('[CompanyLogoUpload] Error processing logo:', err);
      alert(`Could not process logo: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStats(null);
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>{label}</span>
          {stats && (
            <span className="text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              {stats.sizeFormatted} • {stats.width}×{stats.height}px
            </span>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileProcess(e.target.files[0]);
          }
        }}
      />

      {value ? (
        // Preview Active Logo
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 group relative hover:border-slate-300 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-16 sm:w-20 rounded-lg bg-white border border-slate-200 p-1.5 flex items-center justify-center overflow-hidden shadow-2xs">
              <img
                src={value}
                alt={companyName || 'Company Logo'}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="min-w-0 text-xs">
              <span className="font-bold text-slate-800 block truncate">
                {companyName || 'Company Logo'}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <Check className="h-3 w-3" /> Ready for Quotations & Proposals
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 px-2 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition"
              title="Remove logo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        // Upload Drag & Drop Box
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl cursor-pointer transition-all flex items-center justify-center text-center select-none ${
            compact ? 'p-3' : 'p-4 sm:p-5'
          } ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 animate-pulse py-1">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Optimizing & Compressing Logo...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                <Upload className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">
                  Upload Company Logo
                </div>
                <div className="text-[10px] text-slate-400">
                  PNG, SVG, JPG • Auto-compressed for proposals
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
