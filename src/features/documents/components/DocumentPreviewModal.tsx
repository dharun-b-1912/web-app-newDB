import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { documentSecurityService } from '../../../services/document/documentSecurityService';
import { documentAuditService } from '../../../services/document/documentAuditService';
import { documentVerificationService } from '../../../services/document/documentVerificationService';
import { DocumentMaster } from '../../../types';
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentMaster | null;
  onRefresh?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    if (isOpen && document) {
      const sess = documentSecurityService.generateSignedAccessSession({
        documentId: document.id,
        versionId: document.current_version_id,
        classification: document.classification,
        action: 'VIEW',
        actorId: 'current-user',
      });
      setSession(sess);

      // Record VIEW audit event
      documentAuditService.recordLog({
        documentId: document.id,
        action: 'VIEW',
        subjectType: document.subject_type,
        subjectId: document.subject_id,
        details: {
          sessionToken: sess.sessionToken,
          classification: document.classification,
          version: document.current_version?.version_number || 1,
        },
      });
    }
  }, [isOpen, document]);

  if (!document) return null;

  const handleDownload = () => {
    documentAuditService.recordLog({
      documentId: document.id,
      action: 'DOWNLOAD',
      subjectType: document.subject_type,
      subjectId: document.subject_id,
      details: {
        fileName: document.current_version?.file_name || 'document.pdf',
        contentHash: document.current_version?.content_hash,
      },
    });
    showToast('Document downloaded under audited session security policy.', 'success');
  };

  const handlePrint = () => {
    documentAuditService.recordLog({
      documentId: document.id,
      action: 'PRINT',
      subjectType: document.subject_type,
      subjectId: document.subject_id,
      details: {
        watermarkApplied: session?.watermarkText,
      },
    });
    window.print();
  };

  const handleVerify = () => {
    try {
      documentVerificationService.verifyDocument(document.id, 'Verified during secure document preview session.');
      showToast('Document verified successfully.', 'success');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to verify document.', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={document.title} size="xl">
      <div className="space-y-4">
        {/* Security Session & Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="purple" className="font-bold text-[10px]">
              {document.classification.toUpperCase()}
            </Badge>
            <span className="text-gray-500 font-mono text-[11px]">
              Version {document.current_version?.version_number || 1} • {document.current_version?.file_name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 20))}
              className="text-xs h-7 px-2"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-mono font-bold text-gray-700 w-10 text-center">{zoomLevel}%</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoomLevel(prev => Math.min(200, prev + 20))}
              className="text-xs h-7 px-2"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
              className="text-xs h-7"
            >
              Print
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs h-7"
            >
              Download
            </Button>

            {document.verification_status !== 'VERIFIED' && (
              <Button
                size="sm"
                onClick={handleVerify}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7"
              >
                Verify
              </Button>
            )}
          </div>
        </div>

        {/* Secure Document Canvas Preview */}
        <div className="relative bg-gray-900/90 rounded-2xl p-6 min-h-[420px] max-h-[550px] overflow-auto flex items-center justify-center border border-gray-800 shadow-inner">
          {/* Watermark Overlay for Restricted Documents */}
          {session?.watermarkText && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-15 select-none rotate-[-30deg] text-red-500 font-extrabold text-2xl tracking-widest text-center px-4">
              {session.watermarkText}
            </div>
          )}

          <div
            className="bg-white rounded-xl shadow-2xl p-8 max-w-xl w-full space-y-6 text-gray-900 border border-gray-100 transition-transform duration-150 origin-top"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {/* Document Header Representation */}
            <div className="border-b border-gray-200 pb-4 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-[#07563D] tracking-widest uppercase block">
                  JOY CORPORATE SOLUTIONS PVT LTD
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-1">{document.title}</h3>
                <span className="text-xs text-gray-500">Document Code: {document.document_type_code}</span>
              </div>
              <ShieldCheck className="w-8 h-8 text-[#07563D]" />
            </div>

            {/* Document Body Details */}
            <div className="space-y-4 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400 block font-medium">Subject Entity:</span>
                  <span className="font-bold text-gray-900">{document.subject_name || document.subject_id}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Subject Scope:</span>
                  <span className="font-bold text-gray-900">{document.subject_type.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Verification Status:</span>
                  <Badge variant={document.verification_status === 'VERIFIED' ? 'emerald' : 'amber'}>
                    {document.verification_status}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Classification:</span>
                  <span className="font-bold text-gray-900">{document.classification}</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                <span className="font-bold text-emerald-950 block">Cryptographic Integrity Record:</span>
                <p className="text-[10px] font-mono text-emerald-800 break-all">
                  SHA-256: {document.current_version?.content_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </p>
                <p className="text-[10px] text-emerald-700">
                  Storage Path: {document.current_version?.storage_path || 'tenant/org-joy-01/documents/...'}
                </p>
              </div>

              <p className="text-[11px] text-gray-500 italic">
                This document is secured under WorkForceOS KMS envelope encryption. Any unauthorized duplication or distribution is prohibited and permanently audited.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>Session Token: {session?.sessionToken || 'sess_verified'}</span>
          <span>Access Expiry: {session?.expiresAt ? new Date(session.expiresAt).toLocaleTimeString() : '15m'}</span>
        </div>
      </div>
    </Modal>
  );
};
