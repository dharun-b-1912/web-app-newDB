import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { documentSharingService } from '../../../services/document/documentSharingService';
import { DocumentMaster } from '../../../types';
import { Share2, Lock, Clock, Check, Copy } from 'lucide-react';

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentMaster | null;
}

export const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const { showToast } = useToast();

  const [email, setEmail] = useState<string>('');
  const [durationHours, setDurationHours] = useState<number>(48);
  const [canView, setCanView] = useState<boolean>(true);
  const [canDownload, setCanDownload] = useState<boolean>(false);
  const [canPrint, setCanPrint] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [generatedShare, setGeneratedShare] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!document) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter a valid recipient email address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const share = documentSharingService.createShare({
        documentId: document.id,
        sharedWithEmail: email,
        durationHours,
        canView,
        canDownload,
        canPrint,
        reason,
      });

      setGeneratedShare(share);
      showToast('Secure temporary share link generated.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate share link.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedShare) {
      const link = `${window.location.origin}/documents/shared/${generatedShare.access_token_hash}`;
      navigator.clipboard.writeText(link);
      showToast('Share link copied to clipboard.', 'success');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Time-Bounded Secure Document Sharing" size="md">
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between">
          <div>
            <span className="text-gray-400 block">Target Document</span>
            <span className="font-bold text-gray-900">{document.title}</span>
          </div>
          <Badge variant="purple" className="text-[10px]">
            {document.classification.toUpperCase()}
          </Badge>
        </div>

        {!generatedShare ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="external.partner@company.com"
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Link Expiry Window *
              </label>
              <select
                value={durationHours}
                onChange={e => setDurationHours(parseInt(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
              >
                <option value={2}>2 Hours (High Security / Single View)</option>
                <option value={24}>24 Hours (Standard Review)</option>
                <option value={48}>48 Hours (Standard)</option>
                <option value={168}>7 Days (Contract Signoff)</option>
              </select>
            </div>

            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Granted Capabilities
              </label>
              <div className="space-y-1.5 text-xs text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canView}
                    disabled
                    className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] h-4 w-4"
                  />
                  <span>View Document (Encrypted Stream Viewer)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canDownload}
                    onChange={e => setCanDownload(e.target.checked)}
                    className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] h-4 w-4"
                  />
                  <span>Allow Direct File Download</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canPrint}
                    onChange={e => setCanPrint(e.target.checked)}
                    className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] h-4 w-4"
                  />
                  <span>Allow Controlled Printing (Watermarked)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Reason / Justification
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Statutory compliance audit"
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
              >
                {isSubmitting ? 'Generating...' : 'Generate Scoped Share Link'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-xs text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <Lock className="w-4 h-4 text-emerald-700" />
                Temporary Access Token Generated
              </div>
              <p className="font-mono text-[11px] bg-white p-2.5 rounded-xl border border-emerald-200 break-all select-all">
                {`${window.location.origin}/documents/shared/${generatedShare.access_token_hash}`}
              </p>
              <p className="text-[11px] text-emerald-800">
                Expires on: <strong>{new Date(generatedShare.expires_at).toLocaleString()}</strong>
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                leftIcon={<Copy className="w-4 h-4" />}
                className="text-xs"
              >
                Copy Link
              </Button>
              <Button
                onClick={onClose}
                className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
