import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { esignService } from '../../../services/document/esignService';
import { DocumentMaster, EsignParticipantRole } from '../../../types';
import { PenTool, Plus, Trash2, Users, Send, ShieldCheck, Clock } from 'lucide-react';

interface CreateEsignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documents: DocumentMaster[];
  defaultDocumentId?: string;
}

export const CreateEsignModal: React.FC<CreateEsignModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  documents,
  defaultDocumentId,
}) => {
  const { showToast } = useToast();

  const [selectedDocId, setSelectedDocId] = useState<string>(defaultDocumentId || (documents[0]?.id || ''));
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [signingMode, setSigningMode] = useState<'SEQUENTIAL' | 'PARALLEL'>('SEQUENTIAL');
  const [expiresInDays, setExpiresInDays] = useState<number>(14);

  const [participants, setParticipants] = useState<
    Array<{ name: string; email: string; role: EsignParticipantRole; sequenceOrder: number }>
  >([
    { name: '', email: '', role: 'SIGNER', sequenceOrder: 1 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  const handleAddParticipant = () => {
    setParticipants(prev => [
      ...prev,
      {
        name: '',
        email: '',
        role: 'SIGNER',
        sequenceOrder: prev.length + 1,
      },
    ]);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleParticipantChange = (index: number, field: string, value: any) => {
    setParticipants(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      showToast('Please select a document to sign.', 'error');
      return;
    }

    const invalidPtp = participants.find(p => !p.name.trim() || !p.email.trim());
    if (invalidPtp) {
      showToast('Please fill out name and email for all signers/participants.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      esignService.createEsignRequest({
        documentId: selectedDocId,
        title: title || `E-Signature Request: ${selectedDoc?.title || 'Document'}`,
        message,
        signingMode,
        expiresInDays,
        participants,
      });

      showToast('E-Signature request dispatched to participants successfully.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create e-sign request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Enterprise E-Signature Workflow" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Document Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Select Document to Sign *
          </label>
          <select
            value={selectedDocId}
            onChange={e => {
              setSelectedDocId(e.target.value);
              const found = documents.find(d => d.id === e.target.value);
              if (found && !title) setTitle(`E-Sign: ${found.title}`);
            }}
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          >
            {documents.map(d => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.subject_name || d.subject_id}) - {d.classification}
              </option>
            ))}
          </select>
        </div>

        {/* Workflow Title & Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Workflow Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. FY26 Employment Contract Execution"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Signing Sequence Mode *
            </label>
            <select
              value={signingMode}
              onChange={e => setSigningMode(e.target.value as any)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="SEQUENTIAL">Sequential (In Order: Signer 1 → Signer 2)</option>
              <option value="PARALLEL">Parallel (All Signers Simultaneously)</option>
            </select>
          </div>
        </div>

        {/* Participants Matrix */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Signing Participants ({participants.length}) *
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddParticipant}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs h-7 text-[#07563D]"
            >
              Add Participant
            </Button>
          </div>

          <div className="space-y-2.5">
            {participants.map((ptp, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-12 gap-2 items-center text-xs"
              >
                <div className="col-span-1 text-center font-bold text-gray-400">
                  #{idx + 1}
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={ptp.name}
                    onChange={e => handleParticipantChange(idx, 'name', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:ring-1 focus:ring-[#07563D] focus:outline-hidden"
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="email"
                    required
                    placeholder="corporate@email.com"
                    value={ptp.email}
                    onChange={e => handleParticipantChange(idx, 'email', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:ring-1 focus:ring-[#07563D] focus:outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={ptp.role}
                    onChange={e => handleParticipantChange(idx, 'role', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-[11px] text-gray-900 focus:ring-1 focus:ring-[#07563D] focus:outline-hidden"
                  >
                    <option value="SIGNER">Signer</option>
                    <option value="APPROVER">Approver</option>
                    <option value="WITNESS">Witness</option>
                    <option value="CC">CC Only</option>
                  </select>
                </div>
                <div className="col-span-1 text-center">
                  {participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expiry and Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Validity Expiry (Days)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={expiresInDays}
              onChange={e => setExpiresInDays(parseInt(e.target.value) || 14)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Custom Email Note
            </label>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Please sign before joining date."
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
          >
            {isSubmitting ? 'Dispatching Invitations...' : 'Launch E-Sign Workflow'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
