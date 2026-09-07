import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { X, FileText, CheckCircle2, Download, Upload, Eye, Clock, ShieldCheck } from 'lucide-react';
import { Employee, User } from '../../../types';
import { DocumentRecord } from '../../../services/profileService';
import { profileService } from '../../../services/profileService';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  user: User;
}

export const WorkspaceDocumentsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  user,
}) => {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !user) return;
    setIsLoading(true);
    profileService.getProfileContext(user)
      .then((ctx) => {
        setDocuments(ctx.documents || []);
      })
      .catch((err) => {
        console.error('Failed to load documents:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, user]);

  const handleDownloadOrView = async (doc: DocumentRecord) => {
    if (!isSupabaseEnabled || !doc.fileUrl) {
      showToast('Document file path unavailable.', 'error');
      return;
    }
    try {
      showToast('Generating secure document link...');
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(doc.fileUrl, 900);

      if (error || !data?.signedUrl) {
        showToast('Document could not be opened.', 'error');
        return;
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      showToast('Document access error.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#07563D]/10 text-[#07563D] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Personal Document Vault</h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Verified compliance documents & certificates ({documents.length})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {isLoading ? (
            <div className="py-8 text-center text-gray-400 text-xs font-medium">
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="py-8 text-center text-gray-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-gray-300" />
              <p className="font-semibold text-gray-600">No documents uploaded yet</p>
              <p className="text-[11px] text-gray-400">Upload documents from mobile app or HR portal to see them here.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {documents.map((doc) => (
                <div key={doc.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 hover:bg-white hover:border-[#07563D]/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center flex-shrink-0 font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{doc.type}</p>
                      <p className="text-[11px] text-gray-500 truncate">{doc.fileName} • {doc.fileSize} • {doc.uploadedAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                      doc.verificationStatus === 'Verified'
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        : 'text-amber-700 bg-amber-50 border border-amber-200'
                    }`}>
                      {doc.verificationStatus === 'Verified' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {doc.verificationStatus}
                    </span>
                    <button
                      onClick={() => handleDownloadOrView(doc)}
                      title="View / Download"
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#07563D] hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
            <span className="font-medium">Uploaded from Mobile or Web portal</span>
            <span className="text-[10px] font-bold text-[#07563D] bg-white px-2 py-1 rounded border border-emerald-200">
              Synchronized
            </span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <Button size="md" variant="secondary" onClick={onClose} className="text-xs font-bold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
