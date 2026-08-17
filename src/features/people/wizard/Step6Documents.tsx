import React, { useState } from 'react';
import { FileText, Upload, CheckCircle2, AlertCircle, Trash2, Eye } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';

export interface UploadedDocumentItem {
  id: string;
  type: string;
  title: string;
  file_name: string;
  file_size: string;
  uploaded_at: string;
  verification_status: 'Verified' | 'Pending' | 'Rejected';
}

export interface Step6FormData {
  documents: UploadedDocumentItem[];
}

interface Props {
  formData: Step6FormData;
  onChange: (fields: Partial<Step6FormData>) => void;
}

const REQUIRED_DOC_TYPES = [
  { id: 'gov_id', title: 'National Identity Proof', desc: 'Aadhaar Card, Passport, or National ID', required: true },
  { id: 'offer_letter', title: 'Signed Offer / Appointment Letter', desc: 'Signed workplace acceptance document', required: false },
  { id: 'education', title: 'Highest Educational Degree Certificate', desc: 'Degree certificate or mark sheets', required: false },
  { id: 'experience', title: 'Previous Relieving / Experience Letter', desc: 'From immediate prior employer', required: false },
];

export const Step6Documents: React.FC<Props> = ({ formData, onChange }) => {
  const { showToast } = useToast();
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleSimulatedUpload = (docType: string, title: string, file: File) => {
    setUploadingDocId(docType);
    setUploadProgress(20);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          const sizeKb = `${Math.round(file.size / 1024)} KB`;
          const newDoc: UploadedDocumentItem = {
            id: `doc-${Date.now()}`,
            type: docType,
            title,
            file_name: file.name,
            file_size: sizeKb,
            uploaded_at: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            verification_status: 'Pending',
          };

          // Filter out existing doc of same type and append
          const existing = (formData.documents || []).filter((d) => d.type !== docType);
          onChange({ documents: [...existing, newDoc] });
          setUploadingDocId(null);
          showToast(`Document "${title}" uploaded successfully.`, 'success');
          return 100;
        }
        return prev + 35;
      });
    }, 200);
  };

  const handleRemoveDocument = (docId: string) => {
    onChange({
      documents: (formData.documents || []).filter((d) => d.id !== docId),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-gray-900 tracking-tight">
          Verification & Onboarding Documents
        </h3>
        <p className="text-xs text-gray-500">
          Upload statutory ID proof, employment contracts, and academic credentials.
        </p>
      </div>

      <div className="space-y-3">
        {REQUIRED_DOC_TYPES.map((docDef) => {
          const uploadedDoc = (formData.documents || []).find((d) => d.type === docDef.id);
          const isUploading = uploadingDocId === docDef.id;

          return (
            <div
              key={docDef.id}
              className={`p-4 rounded-2xl border transition-all ${
                uploadedDoc
                  ? 'bg-emerald-50/20 border-emerald-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      uploadedDoc
                        ? 'bg-emerald-100 text-[#07563D]'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-900">
                        {docDef.title}
                      </span>
                      {docDef.required && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">{docDef.desc}</p>

                    {uploadedDoc && (
                      <p className="text-[11px] text-emerald-800 font-semibold pt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {uploadedDoc.file_name} ({uploadedDoc.file_size}) · Uploaded on {uploadedDoc.uploaded_at}
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload Action / Uploaded Status */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isUploading ? (
                    <div className="w-28 space-y-1">
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#07563D] h-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold block text-center">
                        Uploading {uploadProgress}%
                      </span>
                    </div>
                  ) : uploadedDoc ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        ✓ Uploaded
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(uploadedDoc.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleSimulatedUpload(docDef.id, docDef.title, f);
                        }}
                      />
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 shadow-2xs">
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-[#07563D]" />
                        Upload File
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
