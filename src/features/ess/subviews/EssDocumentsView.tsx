import React, { useState, useEffect } from 'react';
import { essApi } from '../../../services/essApi';
import { EssDocumentItem } from '../../../types/ess';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileText, Download, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EssDocumentsView: React.FC = () => {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<EssDocumentItem[]>([]);

  useEffect(() => {
    setDocuments(essApi.getDocuments());
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#07563D]" />
            <span>My Documents & Policy Acknowledgements</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Secure employee document vault: Offer letter, appointment letter, tax documents, policies & HR letters</p>
        </div>

        <Badge variant="emerald">Secure Ownership Validated</Badge>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Document Title</th>
              <th className="p-4 font-mono">Category</th>
              <th className="p-4 font-mono">Uploaded Date</th>
              <th className="p-4 text-center">Policy Acknowledgement</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {documents.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-sans font-extrabold text-gray-900">{doc.title}</td>
                <td className="p-4 font-sans"><Badge variant="emerald">{doc.category}</Badge></td>
                <td className="p-4 text-gray-600">{doc.date_uploaded}</td>
                <td className="p-4 text-center font-sans">
                  {doc.requires_acknowledgement ? (
                    <Badge variant="emerald">Acknowledged</Badge>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
                <td className="p-4 text-right font-sans">
                  <Button size="sm" variant="outline" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={() => showToast(`Downloading ${doc.title}...`)}>
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
