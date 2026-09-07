import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileText, Download, Eye, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { profileService } from '../../../services/profileService';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { DocumentRecord } from '../../../services/profileService';

export const EssDocumentsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  const handleDownload = async (doc: DocumentRecord) => {
    if (!isSupabaseEnabled || !doc.fileUrl) {
      showToast('Document file path unavailable.', 'error');
      return;
    }
    try {
      showToast(`Generating secure link for ${doc.type}...`);
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(doc.fileUrl, 900);

      if (error || !data?.signedUrl) {
        showToast('Document could not be opened.', 'error');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      showToast('Document download error.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#07563D]" />
            <span>My Documents & KYC Vault ({documents.length})</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Secure employee document repository: ID proof, educational certificates, and compliance files.</p>
        </div>

        <Badge variant="emerald">Secure Ownership Validated</Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 text-xs font-medium">
            Loading your official documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No documents uploaded yet</p>
            <p className="text-xs text-gray-400">Documents uploaded from mobile or HR desk will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Document Title</th>
                <th className="p-4 font-mono">Category</th>
                <th className="p-4 font-mono">Uploaded Date</th>
                <th className="p-4 text-center">Verification Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-sans font-extrabold text-gray-900">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#07563D] shrink-0" />
                      <div>
                        <span>{doc.type}</span>
                        <span className="block text-[10px] text-gray-400 font-normal font-mono">{doc.fileName} ({doc.fileSize})</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-sans"><Badge variant="emerald">{doc.category || 'Personal'}</Badge></td>
                  <td className="p-4 text-gray-600 font-sans">{doc.uploadedAt}</td>
                  <td className="p-4 text-center font-sans">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      doc.verificationStatus === 'Verified'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200'
                    }`}>
                      {doc.verificationStatus === 'Verified' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {doc.verificationStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right font-sans">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => handleDownload(doc)}
                    >
                      View / Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
