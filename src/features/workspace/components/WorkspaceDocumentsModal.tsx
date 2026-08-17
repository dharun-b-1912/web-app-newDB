import React from 'react';
import { Button } from '../../../components/ui/Button';
import { X, FileText, CheckCircle2, Download, Upload, ShieldCheck } from 'lucide-react';
import { Employee, User } from '../../../types';

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
  if (!isOpen) return null;

  const documents = [
    { title: 'Employment Agreement & NDA', type: 'Contract', verified: true, date: '15 Jan 2024' },
    { title: 'Permanent Account Number (PAN Card)', type: 'Statutory KYC', verified: true, date: '15 Jan 2024' },
    { title: 'Aadhaar / National ID Verification', type: 'Identity', verified: true, date: '15 Jan 2024' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Personal Document Vault</h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Verified compliance documents & certificates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="space-y-2.5">
            {documents.map((doc, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{doc.title}</p>
                    <p className="text-[11px] text-gray-500">{doc.type} • Uploaded {doc.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                  <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between text-xs text-purple-900">
            <span className="font-medium">Need to submit an updated certificate or tax form?</span>
            <Button size="sm" variant="secondary" className="text-purple-800 bg-white border-purple-200 font-bold text-xs">
              <Upload className="w-3.5 h-3.5 mr-1" /> Upload Document
            </Button>
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
