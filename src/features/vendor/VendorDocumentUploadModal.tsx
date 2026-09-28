// src/features/vendor/VendorDocumentUploadModal.tsx
// ============================================================================
// Joy People HR — Vendor Document Upload Modal
// Dedicated Private Storage Bucket: vendor-private-documents
// ============================================================================

import React, { useState } from 'react';
import {
  Upload,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Calendar,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import {
  VendorPrivateDocumentService,
  PRIVATE_VENDOR_BUCKET,
} from '../../services/vendor/vendorPrivateDocumentService';
import {
  DocumentRequirementDefinition,
  STANDARD_COMPLIANCE_REQUIREMENTS,
} from '../../services/vendor/vendorComplianceService';
import { VendorCompanyProfile } from '../../types/vendorPortal';

export interface VendorDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRequirement?: DocumentRequirementDefinition | null;
  vendorProfile: VendorCompanyProfile;
  selectedPeriod: string;
  selectedSiteId: string;
  onUploadSuccess: (doc: any) => void;
}

export const VendorDocumentUploadModal: React.FC<VendorDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  selectedRequirement,
  vendorProfile,
  selectedPeriod,
  selectedSiteId,
  onUploadSuccess,
}) => {
  const [selectedDocType, setSelectedDocType] = useState<string>(
    selectedRequirement?.documentType || 'GSTIN_CERTIFICATE'
  );
  const [file, setFile] = useState<File | null>(null);
  const [externalReference, setExternalReference] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resetForm = React.useCallback(() => {
    setFile(null);
    setExternalReference('');
    setExpiryDate('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      resetForm();
      if (selectedRequirement) {
        setSelectedDocType(selectedRequirement.documentType);
      }
    }
  }, [isOpen, selectedRequirement, resetForm]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRemoveFile = () => {
    setFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const currentReq =
    STANDARD_COMPLIANCE_REQUIREMENTS.find((r) => r.documentType === selectedDocType) ||
    selectedRequirement ||
    STANDARD_COMPLIANCE_REQUIREMENTS[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validation = VendorPrivateDocumentService.validateDocument(selected);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid file format or size.');
        setFile(null);
        return;
      }
      setFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const validation = VendorPrivateDocumentService.validateDocument(dropped);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid file format or size.');
        setFile(null);
        return;
      }
      setFile(dropped);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a PDF or image file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await VendorPrivateDocumentService.uploadPrivateDocument({
        organizationId: vendorProfile.organizationId || 'org-joy-main',
        vendorId: vendorProfile.vendorCode || '',
        vendorCode: vendorProfile.vendorCode,
        vendorName: vendorProfile.legalName,
        siteId: selectedSiteId,
        subFolder: currentReq.category === 'COMPANY_REGISTRATION' ? 'company/registration' : 'compliance',
        file,
        documentCategory: currentReq.category as any,
        documentType: currentReq.documentType,
        title: currentReq.title,
        uploadedBy: vendorProfile.authorizedContact?.email || 'vendor-user',
        requesterRole: 'VENDOR_ADMIN',
        requesterVendorId: vendorProfile.vendorCode || '',
        expiresAt: expiryDate || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Upload failed.');
        setIsUploading(false);
        return;
      }

      setSuccessMessage(`Document "${file.name}" uploaded successfully to ${PRIVATE_VENDOR_BUCKET}`);
      setTimeout(() => {
        onUploadSuccess({
          category: currentReq.category,
          documentType: currentReq.documentType,
          periodType: currentReq.periodType,
          title: currentReq.title,
          fileName: file.name,
          externalReference,
          storagePath: res.document?.storagePath || '',
          fileSizeBytes: file.size,
          mimeType: file.type || 'application/pdf',
          uploadedAt: new Date().toISOString(),
          status: 'SUBMITTED',
        });
        resetForm();
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload document.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#047857]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Compliance Document</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Dedicated Bucket:</span>
                <span className="font-mono text-slate-700 font-semibold">{PRIVATE_VENDOR_BUCKET}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          {/* Document Requirement Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Document Requirement
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {STANDARD_COMPLIANCE_REQUIREMENTS.map((r) => (
                <option key={r.documentType} value={r.documentType}>
                  [{r.periodType}] {r.title} ({r.category})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">{currentReq.description}</p>
          </div>

          {/* Vendor Scope Metadata */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Vendor Organization</span>
              <span className="font-semibold text-slate-800 text-xs truncate block">{vendorProfile.legalName}</span>
              <span className="font-mono text-[10px] text-slate-500 font-bold">{vendorProfile.vendorCode}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Reporting Period</span>
              <span className="font-semibold text-slate-800 text-xs">
                {currentReq.periodType === 'ONE_TIME' ? 'One-Time Statutory Master' : selectedPeriod}
              </span>
            </div>
          </div>

          {/* File Dropzone */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Document File (PDF, PNG, JPG, XLSX - Max 20MB) <span className="text-rose-500">*</span>
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                file
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-slate-300 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/30'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs truncate max-w-[280px]">{file.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {(file.size / 1024).toFixed(1)} KB · {file.type || 'application/pdf'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Drag &amp; Drop file here, or click to browse</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports signed PDF scans, Challan receipts, or spreadsheets</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="vendor-file-upload-input"
                  />
                  <label
                    htmlFor="vendor-file-upload-input"
                    className="mt-3 inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    Browse Files
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Reference & Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Reference / Challan / TRRN No. (Optional)
              </label>
              <input
                type="text"
                value={externalReference}
                onChange={(e) => setExternalReference(e.target.value)}
                placeholder="e.g. TRRN 10123984129"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                License Expiry Date (If applicable)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="px-5 py-2 rounded-lg bg-[#047857] hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Encrypting &amp; Vaulting...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Upload &amp; Vault PDF</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
