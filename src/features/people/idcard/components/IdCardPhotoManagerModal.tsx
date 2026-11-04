// src/features/people/idcard/components/IdCardPhotoManagerModal.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Dedicated Employee Photo Manager
// Folder Upload, ZIP Import, Smart Code Matching, and Manual Assignment Drawer
// ============================================================================

import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  IdCardPersonRecord,
  MatchedPhotoRecord,
} from '../idCardTypes';
import {
  matchUploadedPhotos,
  loadImageFromFile,
  loadImageFromDataUrl,
} from '../idCardService';
import {
  X,
  Upload,
  FolderOpen,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Sparkles,
  Camera,
  Trash2,
  RefreshCw,
  Crop,
} from 'lucide-react';

interface IdCardPhotoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: IdCardPersonRecord[];
  onAssignPhotoToEmployee: (employeeId: string, img: HTMLImageElement, fileName: string) => void;
  onBulkUpdatePhotos: (matchedRecords: MatchedPhotoRecord[]) => void;
}

type PhotoTab = 'matched' | 'unmatched' | 'missing';

export const IdCardPhotoManagerModal: React.FC<IdCardPhotoManagerModalProps> = ({
  isOpen,
  onClose,
  employees,
  onAssignPhotoToEmployee,
  onBulkUpdatePhotos,
}) => {
  const [activeTab, setActiveTab] = useState<PhotoTab>('matched');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Stores all loaded photos in memory
  const [matchedList, setMatchedList] = useState<MatchedPhotoRecord[]>([]);
  const [unmatchedList, setUnmatchedList] = useState<MatchedPhotoRecord[]>([]);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process raw files into images and run the smart matcher
  const handleRawFiles = async (files: File[]) => {
    setIsProcessing(true);
    setStatusMsg(`Reading ${files.length} image files…`);

    try {
      const validFiles: { fileName: string; fileSize: number; dataUrl: string; img: HTMLImageElement }[] = [];

      for (const file of files) {
        if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
          continue;
        }

        const img = await loadImageFromFile(file);
        const dataUrl = img.src;
        validFiles.push({
          fileName: file.name,
          fileSize: file.size,
          dataUrl,
          img,
        });
      }

      setStatusMsg(`Matching ${validFiles.length} photos against ${employees.length} workforce profiles…`);

      const { matched, unmatched } = matchUploadedPhotos(validFiles, employees);

      setMatchedList(prev => [...prev, ...matched]);
      setUnmatchedList(prev => [...prev, ...unmatched]);

      // Apply matches to workforce
      if (matched.length > 0) {
        onBulkUpdatePhotos(matched);
      }

      setStatusMsg(`✓ Successfully auto-matched ${matched.length} employee photographs!`);
    } catch (err: any) {
      console.error('Photo import error:', err);
      setStatusMsg(`Error importing photos: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1. Multi-Files Upload
  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleRawFiles(files);
  };

  // 2. Folder Upload (webkitdirectory)
  const onFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleRawFiles(files);
  };

  // 3. ZIP Archive Upload & Extraction
  const onZipSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMsg(`Extracting ZIP archive: ${file.name}…`);

    try {
      const zip = await JSZip.loadAsync(file);
      const extractedFiles: File[] = [];

      const entries = Object.keys(zip.files);
      for (const path of entries) {
        const zipEntry = zip.files[path];
        if (zipEntry.dir) continue;
        if (!/\.(jpe?g|png|webp)$/i.test(path)) continue;

        const blob = await zipEntry.async('blob');
        const fileName = path.split('/').pop() || path;
        extractedFiles.push(new File([blob], fileName, { type: blob.type || 'image/jpeg' }));
      }

      setStatusMsg(`Extracted ${extractedFiles.length} images from ZIP.`);
      await handleRawFiles(extractedFiles);
    } catch (err: any) {
      console.error('ZIP extraction error:', err);
      setStatusMsg(`Failed to extract ZIP: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Employee Match Override
  const handleManualAssign = (photoItem: MatchedPhotoRecord, targetEmpId: string) => {
    const emp = employees.find(e => e.id === targetEmpId || e.idno === targetEmpId);
    if (!emp) return;

    onAssignPhotoToEmployee(emp.id || emp.idno, photoItem.img, photoItem.fileName);

    // Move from unmatched to matched
    setUnmatchedList(prev => prev.filter(p => p.id !== photoItem.id));
    setMatchedList(prev => [
      ...prev,
      {
        ...photoItem,
        matchedEmployeeId: emp.id,
        matchedEmployeeCode: emp.idno,
        matchedEmployeeName: emp.name,
        matchScore: 100,
        matchMethod: 'MANUAL',
      },
    ]);
  };

  // Missing Photos Roster
  const missingEmployees = employees.filter(e => !e.__img && !matchedList.some(m => m.matchedEmployeeId === e.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-4xl bg-[#13171c] border border-[#252d37] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] text-[#e6eaee] overflow-hidden">
        {/* Modal Header */}
        <div className="h-14 border-b border-[#252d37] px-6 flex items-center justify-between shrink-0 bg-[#181d24]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/70 border border-blue-600/50 flex items-center justify-center text-blue-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Employee Photo Manager</h3>
              <p className="text-[11px] text-gray-400">
                Bulk upload photos via Folder or ZIP with automatic Employee ID matching
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#111418] hover:bg-[#252d37] border border-[#2c3642] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Action Strip */}
        <div className="p-4 bg-[#111418] border-b border-[#252d37] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Multiple Photos Picker */}
            <input
              ref={filesInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={onFilesSelected}
              className="hidden"
            />
            <button
              onClick={() => filesInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg bg-[#1c2229] hover:bg-[#28323c] border border-[#2c3642] text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Select Photos</span>
            </button>

            {/* Folder Picker */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              onChange={onFolderSelected}
              className="hidden"
            />
            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg bg-[#1c2229] hover:bg-[#28323c] border border-[#2c3642] text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Upload entire photo directory from computer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Folder</span>
            </button>

            {/* ZIP File Picker */}
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={onZipSelected}
              className="hidden"
            />
            <button
              onClick={() => zipInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-lg bg-[#1c2229] hover:bg-[#28323c] border border-[#2c3642] text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Extract ZIP bundle with photos"
            >
              <FileArchive className="w-3.5 h-3.5 text-purple-400" />
              <span>Import ZIP</span>
            </button>
          </div>

          {statusMsg && (
            <div className="text-xs text-blue-300 font-mono flex items-center gap-1.5">
              {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* Gallery Tabs & Search */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-[#252d37]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('matched')}
              className={`pb-2.5 font-bold text-xs flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'matched'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Matched ({matchedList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('unmatched')}
              className={`pb-2.5 font-bold text-xs flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'unmatched'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Unmatched ({unmatchedList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('missing')}
              className={`pb-2.5 font-bold text-xs flex items-center gap-1.5 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'missing'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Missing Photo ({missingEmployees.length})</span>
            </button>
          </div>

          <div className="relative mb-2">
            <Search className="w-3 h-3 absolute left-2.5 top-2 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="bg-[#181d24] border border-[#27313d] rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Gallery Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: MATCHED PHOTOS */}
          {activeTab === 'matched' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {matchedList
                .filter(
                  p =>
                    (p.matchedEmployeeName || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
                    (p.matchedEmployeeCode || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
                    p.fileName.toLowerCase().includes(searchFilter.toLowerCase())
                )
                .map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#181d24] border border-[#27313d] flex flex-col items-center group relative shadow-xs"
                  >
                    <div className="w-24 h-28 rounded-lg overflow-hidden bg-black border border-[#2c3642] mb-2 relative">
                      <img src={item.dataUrl} alt={item.fileName} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-emerald-950/90 text-emerald-300 font-mono text-[9px] border border-emerald-700">
                        {item.matchMethod}
                      </span>
                    </div>

                    <div className="w-full text-center">
                      <div className="font-bold text-xs text-white truncate" title={item.matchedEmployeeName}>
                        {item.matchedEmployeeName}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">{item.matchedEmployeeCode}</div>
                      <div className="text-[9px] text-gray-500 truncate mt-0.5" title={item.fileName}>
                        {item.fileName}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 2: UNMATCHED PHOTOS (with Manual Match Dropdown) */}
          {activeTab === 'unmatched' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {unmatchedList
                .filter(p => p.fileName.toLowerCase().includes(searchFilter.toLowerCase()))
                .map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#181d24] border border-amber-900/40 flex items-center gap-3"
                  >
                    <div className="w-16 h-20 rounded-lg overflow-hidden bg-black border border-[#2c3642] shrink-0">
                      <img src={item.dataUrl} alt={item.fileName} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="text-xs font-bold text-amber-300 truncate" title={item.fileName}>
                        {item.fileName}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {(item.fileSize / 1024).toFixed(0)} KB • Unassigned
                      </div>

                      {/* Manual Assignment Selector */}
                      <select
                        onChange={e => {
                          if (e.target.value) handleManualAssign(item, e.target.value);
                        }}
                        defaultValue=""
                        className="w-full bg-[#111418] border border-[#2d3744] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="" disabled>
                          Assign to Employee…
                        </option>
                        {employees.map(emp => (
                          <option key={emp.id || emp.idno} value={emp.id || emp.idno}>
                            {emp.idno} - {emp.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 3: MISSING EMPLOYEE PHOTOS */}
          {activeTab === 'missing' && (
            <div className="space-y-1.5">
              {missingEmployees
                .filter(
                  e =>
                    e.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    e.idno.toLowerCase().includes(searchFilter.toLowerCase())
                )
                .map(emp => (
                  <div
                    key={emp.id || emp.idno}
                    className="p-3 rounded-xl bg-[#181d24] border border-[#27313d] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#111418] border border-rose-900/40 flex items-center justify-center font-bold text-rose-400 text-xs">
                        {emp.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{emp.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {emp.idno} • {emp.designation} • {emp.department}
                        </div>
                      </div>
                    </div>

                    <label className="px-2.5 py-1 rounded bg-[#1c2229] hover:bg-[#28323c] border border-[#2c3642] text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={async e => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const img = await loadImageFromFile(f);
                            onAssignPhotoToEmployee(emp.id || emp.idno, img, f.name);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-14 border-t border-[#252d37] px-6 flex items-center justify-between shrink-0 bg-[#181d24]">
          <div className="text-xs text-gray-400">
            Filenames matching employee code (e.g. <code className="text-blue-300 font-mono">EMP-20418.jpg</code>) match automatically.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};

