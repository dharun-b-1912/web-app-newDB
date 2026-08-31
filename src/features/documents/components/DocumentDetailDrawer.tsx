import React, { useState, useEffect } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { documentVerificationService } from '../../../services/document/documentVerificationService';
import { documentAuditService } from '../../../services/document/documentAuditService';
import { documentService } from '../../../services/document/documentService';
import { DocumentMaster } from '../../../types';
import {
  X,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  Lock,
  Layers,
  History,
  AlertTriangle,
  Building,
  User,
  Plus,
  Eye,
  Trash2,
} from 'lucide-react';

interface DocumentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentMaster | null;
  onRefresh: () => void;
  onOpenPreview: (doc: DocumentMaster) => void;
  onOpenShare: (doc: DocumentMaster) => void;
}

export const DocumentDetailDrawer: React.FC<DocumentDetailDrawerProps> = ({
  isOpen,
  onClose,
  document,
  onRefresh,
  onOpenPreview,
  onOpenShare,
}) => {
  const { showToast } = useToast();
  const [currentDoc, setCurrentDoc] = useState<DocumentMaster | null>(document);
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'audit' | 'verification'>('overview');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [isUploadingVersion, setIsUploadingVersion] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    setCurrentDoc(document);
  }, [document]);

  if (!isOpen || !currentDoc) return null;

  const handleVerify = async () => {
    if (!currentDoc) return;
    setIsVerifying(true);
    try {
      await documentVerificationService.verifyDocument(currentDoc.id, 'Verified by HR compliance reviewer.');
      setCurrentDoc(prev => (prev ? { ...prev, verification_status: 'VERIFIED' } : null));
      showToast('Document verified successfully.', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to verify document.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!currentDoc) return;
    if (!rejectionReason.trim()) {
      showToast('Please provide a formal rejection reason.', 'error');
      return;
    }
    setIsVerifying(true);
    try {
      await documentVerificationService.rejectDocument(currentDoc.id, rejectionReason);
      setCurrentDoc(prev => (prev ? { ...prev, verification_status: 'REJECTED' } : null));
      showToast('Document marked as rejected.', 'success');
      setIsRejectModalOpen(false);
      setRejectionReason('');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject document.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${currentDoc.title}" from the system and clean it completely from backend storage & databases?`)) {
      return;
    }
    try {
      await documentService.deleteDocument(currentDoc.id);
      showToast(`✓ "${currentDoc.title}" permanently deleted.`, 'success');
      onRefresh();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document.', 'error');
    }
  };

  const handleVersionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploadingVersion(true);
      try {
        await documentService.uploadNewVersion(currentDoc.id, file, 'Updated version via document drawer');
        showToast('New document version uploaded successfully.', 'success');
        onRefresh();
      } catch (err: any) {
        showToast(err.message || 'Failed to upload version.', 'error');
      } finally {
        setIsUploadingVersion(false);
      }
    }
  };

  const auditLogs = documentAuditService.getLogs(currentDoc.id);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#07563D]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-gray-900">{currentDoc.title}</h2>
                <Badge variant={currentDoc.verification_status === 'VERIFIED' ? 'emerald' : (currentDoc.verification_status === 'REJECTED' ? 'danger' : 'amber')}>
                  {currentDoc.verification_status}
                </Badge>
              </div>
              <span className="text-xs text-gray-500 mt-0.5 block">
                Subject: <strong>{currentDoc.subject_name || currentDoc.subject_id}</strong> ({currentDoc.subject_type})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operational Action Strip */}
        <div className="px-6 py-3 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onOpenPreview(currentDoc)}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs h-7"
            >
              Secure Preview
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenShare(currentDoc)}
              leftIcon={<Share2 className="w-3.5 h-3.5" />}
              className="text-xs h-7"
            >
              Share Link
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {currentDoc.verification_status !== 'VERIFIED' && (
              <>
                <Button
                  size="sm"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isVerifying}
                  onClick={() => setIsRejectModalOpen(true)}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                  className="text-xs h-7 text-red-600 hover:bg-red-50"
                >
                  Reject
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-xs h-7 text-red-600 hover:bg-red-50 hover:border-red-300"
              title="Delete completely from backend"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-gray-200 flex items-center gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Overview & Security
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'versions'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Version History ({currentDoc.version_count || 1})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-[#07563D] text-[#07563D]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* TAB 1: OVERVIEW & SECURITY */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-medium">Classification</span>
                  <span className="font-extrabold text-gray-900 mt-0.5 block uppercase">
                    {currentDoc.classification}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-medium">Category</span>
                  <span className="font-extrabold text-gray-900 mt-0.5 block">{currentDoc.category_code}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-medium">Requested By</span>
                  <span className="font-extrabold text-gray-900 mt-0.5 block">{currentDoc.created_by || 'HR Admin'}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-medium">Target Employee</span>
                  <span className="font-extrabold text-gray-900 mt-0.5 block">
                    {currentDoc.subject_name || currentDoc.subject_id}
                  </span>
                </div>
              </div>

              {/* Expiry / Verification Banner */}
              {currentDoc.expires_at && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>Expires on <strong>{currentDoc.expires_at}</strong></span>
                  </div>
                  <Badge variant="amber" className="text-[10px]">
                    {currentDoc.days_until_expiry !== undefined ? `${currentDoc.days_until_expiry} days left` : 'Expiring Soon'}
                  </Badge>
                </div>
              )}

              {/* Cryptographic & Storage Card */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs">
                <div className="flex items-center gap-2 text-gray-900 font-bold">
                  <Lock className="w-4 h-4 text-[#07563D]" />
                  Storage & Envelope Encryption Metadata
                </div>
                <div className="space-y-1.5 font-mono text-[11px] text-gray-600">
                  <div>
                    <span className="text-gray-400">File Name: </span>
                    {currentDoc.current_version?.file_name || 'document.pdf'}
                  </div>
                  <div>
                    <span className="text-gray-400">File Size: </span>
                    {currentDoc.current_version ? `${(currentDoc.current_version.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : '1.5 MB'}
                  </div>
                  <div>
                    <span className="text-gray-400">Algorithm: </span>
                    AES-256-GCM (KMS Protected)
                  </div>
                  <div className="break-all">
                    <span className="text-gray-400">SHA-256 Hash: </span>
                    {currentDoc.current_version?.content_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                  </div>
                  <div className="break-all">
                    <span className="text-gray-400">Storage Key: </span>
                    {currentDoc.current_version?.storage_path || 'tenant/org-joy-01/documents/...'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VERSIONS */}
          {activeTab === 'versions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Document Versions</h3>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    onChange={handleVersionUpload}
                    disabled={isUploadingVersion}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#07563D] hover:underline">
                    <Plus className="w-3.5 h-3.5" />
                    {isUploadingVersion ? 'Uploading...' : 'Upload New Version'}
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                {(currentDoc.versions || []).map(v => (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                      v.id === currentDoc.current_version_id
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={v.id === currentDoc.current_version_id ? 'emerald' : 'neutral'} className="text-[10px]">
                          V{v.version_number} {v.id === currentDoc.current_version_id ? '(Current)' : ''}
                        </Badge>
                        <span className="font-bold text-gray-900">{v.file_name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[11px]">
                      Uploaded by <strong>{v.uploaded_by_name}</strong> • {(v.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {v.change_notes && <p className="text-gray-600 text-[11px] italic">"{v.change_notes}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Immutable Access History</h3>
              <div className="space-y-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{log.action}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(log.created_at).toLocaleTimeString()} • {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-600">Actor: <strong>{log.actor_name}</strong> ({log.actor_role})</p>
                    {log.details && (
                      <p className="text-[10px] font-mono text-gray-500 truncate">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {isRejectModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-start gap-3 text-red-900">
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-base">Reject Document Verification</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Provide a mandatory compliance reason. The employee/uploader will be notified to re-upload.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Blurry scan copy, expired validity, mismatch in name..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={!rejectionReason.trim()}
                  onClick={handleReject}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
