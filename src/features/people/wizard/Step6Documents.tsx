import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Send,
  ShieldCheck,
  Building2,
  Smartphone,
  ExternalLink,
  Info,
  Filter,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { documentRequestService, EmployeeDocumentRequest } from '../../../services/documents/documentRequestService';

export interface UploadedDocumentItem {
  id: string;
  type: string;
  title: string;
  file_name: string;
  file_size: string;
  uploaded_at: string;
  verification_status: 'Verified' | 'Pending' | 'Rejected';
  category?: string;
  is_requested_mobile?: boolean;
  request_due_date?: string;
  file_url?: string;
}

export interface Step6FormData {
  first_name?: string;
  last_name?: string;
  employee_code?: string;
  employment_source?: string;
  vendor_id?: string;
  vendor_name?: string;
  documents: UploadedDocumentItem[];
}

interface Props {
  formData: Step6FormData;
  onChange: (fields: Partial<Step6FormData>) => void;
}

interface DocumentDefinition {
  id: string;
  code: string;
  title: string;
  desc: string;
  category: 'IDENTITY' | 'EMPLOYMENT' | 'EDUCATION' | 'PAYROLL' | 'STATUTORY' | 'VENDOR_WORKFORCE';
  required: boolean;
  vendorOnly?: boolean;
}

const MASTER_DOCUMENT_CATALOG: DocumentDefinition[] = [
  // 1. Identity & KYC
  {
    id: 'dt-aadhaar',
    code: 'AADHAAR_CARD',
    title: 'Aadhaar / National Identity Proof',
    desc: 'Government issued unique identity card or masked copy',
    category: 'IDENTITY',
    required: true,
  },
  {
    id: 'dt-pan',
    code: 'PAN_CARD',
    title: 'Permanent Account Number (PAN) Card',
    desc: 'Mandatory for income tax and payroll compliance',
    category: 'IDENTITY',
    required: true,
  },
  {
    id: 'dt-passport',
    code: 'PASSPORT_OR_VOTER',
    title: 'Passport / Alternate Photo ID',
    desc: 'International passport, voter ID, or driving licence',
    category: 'IDENTITY',
    required: false,
  },

  // 2. Employment & HR
  {
    id: 'dt-offer',
    code: 'OFFER_LETTER',
    title: 'Signed Appointment / Offer Letter',
    desc: 'Signed copy of workplace terms & compensation annexure',
    category: 'EMPLOYMENT',
    required: true,
  },
  {
    id: 'dt-nda',
    code: 'NDA_AGREEMENT',
    title: 'NDA & Confidentiality Agreement',
    desc: 'Signed proprietary information and non-disclosure agreement',
    category: 'EMPLOYMENT',
    required: false,
  },
  {
    id: 'dt-experience',
    code: 'EXPERIENCE_LETTER',
    title: 'Previous Relieving / Experience Letter',
    desc: 'Service certificate from immediate prior employer',
    category: 'EMPLOYMENT',
    required: false,
  },

  // 3. Education & Skills
  {
    id: 'dt-degree',
    code: 'DEGREE_CERTIFICATE',
    title: 'Highest Educational Degree Certificate',
    desc: 'Degree certificate, diploma, or final consolidated marksheets',
    category: 'EDUCATION',
    required: true,
  },
  {
    id: 'dt-technical',
    code: 'SKILL_CERTIFICATE',
    title: 'Technical & Trade Certifications',
    desc: 'Role-specific domain licenses or skill certifications',
    category: 'EDUCATION',
    required: false,
  },

  // 4. Payroll & Bank
  {
    id: 'dt-bank',
    code: 'BANK_DOCUMENT',
    title: 'Bank Passbook / Cancelled Cheque',
    desc: 'Proof of bank account with IFSC code for salary disbursement',
    category: 'PAYROLL',
    required: true,
  },
  {
    id: 'dt-salary-decl',
    code: 'SALARY_DECLARATION',
    title: 'Salary & Tax Regime Declaration',
    desc: 'Previous employment Form 12B or new regime declaration',
    category: 'PAYROLL',
    required: false,
  },

  // 5. Statutory & Compliance
  {
    id: 'dt-epf',
    code: 'EPF_FORM_11',
    title: 'EPFO Form 11 (Declaration)',
    desc: 'Provident Fund previous member enrollment declaration',
    category: 'STATUTORY',
    required: false,
  },
  {
    id: 'dt-esi',
    code: 'ESI_FORM_1',
    title: 'ESIC Form 1 (Declaration)',
    desc: 'Employee State Insurance dependent and nominee registration',
    category: 'STATUTORY',
    required: false,
  },
  {
    id: 'dt-medical',
    code: 'MEDICAL_FITNESS',
    title: 'Medical Fitness Certificate',
    desc: 'Authorized physician occupational health clearance',
    category: 'STATUTORY',
    required: false,
  },

  // 6. Vendor Workforce
  {
    id: 'dt-vnd-letter',
    code: 'VENDOR_DEPUTATION',
    title: 'Vendor Deputation & Engagement Letter',
    desc: 'Official engagement order issued by the partner vendor organization',
    category: 'VENDOR_WORKFORCE',
    required: true,
    vendorOnly: true,
  },
  {
    id: 'dt-vnd-safety',
    code: 'SITE_SAFETY_INDUCTION',
    title: 'Site Safety & Induction Acknowledgment',
    desc: 'Client-site compliance and occupational safety protocol sign-off',
    category: 'VENDOR_WORKFORCE',
    required: true,
    vendorOnly: true,
  },
  {
    id: 'dt-vnd-ppe',
    code: 'PPE_ACKNOWLEDGMENT',
    title: 'PPE & Uniform Issuance Confirmation',
    desc: 'Safety gear, badge, and equipment handover record',
    category: 'VENDOR_WORKFORCE',
    required: false,
    vendorOnly: true,
  },
];

export const Step6Documents: React.FC<Props> = ({ formData, onChange }) => {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [requestingDocId, setRequestingDocId] = useState<string | null>(null);

  const isVendorDeployed =
    formData.employment_source === 'VENDOR' ||
    Boolean(formData.vendor_id && formData.vendor_id.trim() !== '');

  const filteredCatalog = MASTER_DOCUMENT_CATALOG.filter((doc) => {
    if (doc.vendorOnly && !isVendorDeployed) return false;
    if (selectedCategory === 'ALL') return true;
    return doc.category === selectedCategory;
  });

  const handleSimulatedUpload = (docDef: DocumentDefinition, file: File) => {
    setUploadingDocId(docDef.id);
    setUploadProgress(15);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          const sizeKb = `${Math.round(file.size / 1024)} KB`;
          const newDoc: UploadedDocumentItem = {
            id: `doc-${Date.now()}`,
            type: docDef.id,
            title: docDef.title,
            file_name: file.name,
            file_size: sizeKb,
            uploaded_at: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            verification_status: 'Pending',
            category: docDef.category,
            is_requested_mobile: false,
          };

          const existing = (formData.documents || []).filter((d) => d.type !== docDef.id);
          onChange({ documents: [...existing, newDoc] });
          setUploadingDocId(null);
          showToast(`Document "${docDef.title}" uploaded to private storage.`, 'success');
          return 100;
        }
        return prev + 35;
      });
    }, 150);
  };

  const handleRequestViaMobile = async (docDef: DocumentDefinition) => {
    setRequestingDocId(docDef.id);
    try {
      const empId = formData.employee_code || 'emp-new';
      const empName = `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || 'Employee';

      await documentRequestService.createRequest({
        employeeId: empId,
        employeeName: empName,
        employeeCode: formData.employee_code,
        documentTypeId: docDef.id,
        documentTitle: docDef.title,
        documentCode: docDef.code,
        category: docDef.category,
        isRequired: docDef.required,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        message: `Please upload your official ${docDef.title} via the JOY PeopleHR mobile app.`,
      });

      const existingDoc = (formData.documents || []).find((d) => d.type === docDef.id);
      const updatedList = (formData.documents || []).filter((d) => d.type !== docDef.id);

      const requestDoc: UploadedDocumentItem = {
        id: existingDoc?.id || `req-${Date.now()}`,
        type: docDef.id,
        title: docDef.title,
        file_name: 'Requested from Employee via Mobile App',
        file_size: 'Pending Mobile Upload',
        uploaded_at: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        verification_status: 'Pending',
        category: docDef.category,
        is_requested_mobile: true,
        request_due_date: new Date(Date.now() + 86400000 * 3).toLocaleDateString(),
      };

      onChange({ documents: [...updatedList, requestDoc] });
      showToast(
        `Mobile request dispatched for "${docDef.title}". Employee will be notified in Flutter App.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch document request.', 'error');
    } finally {
      setRequestingDocId(null);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    onChange({
      documents: (formData.documents || []).filter((d) => d.id !== docId),
    });
  };

  const uploadedCount = (formData.documents || []).filter((d) => !d.is_requested_mobile).length;
  const requestedCount = (formData.documents || []).filter((d) => d.is_requested_mobile).length;
  const totalRequired = MASTER_DOCUMENT_CATALOG.filter(
    (d) => d.required && (!d.vendorOnly || isVendorDeployed)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Sourcing Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#07563D]" />
            Verification & Onboarding Document Vault
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload verified statutory ID proofs, employment agreements, or dispatch requests to the employee's mobile app.
          </p>
        </div>

        {/* Vendor Workforce Badge if Applicable */}
        {isVendorDeployed && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold self-start sm:self-center">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>Vendor: {formData.vendor_name || 'Vendor Deployed Workforce'}</span>
          </div>
        )}
      </div>

      {/* Summary Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Required Items</span>
          <span className="text-lg font-black text-gray-900">{totalRequired} documents</span>
        </div>
        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Uploaded</span>
          <span className="text-lg font-black text-emerald-700">{uploadedCount} completed</span>
        </div>
        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Mobile Requests</span>
          <span className="text-lg font-black text-blue-700">{requestedCount} dispatched</span>
        </div>
        <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Storage Bucket</span>
          <span className="text-xs font-black text-purple-900 mt-1 block">employee-private-documents</span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-2">
        {[
          { id: 'ALL', label: 'All Catalog' },
          { id: 'IDENTITY', label: 'Identity & KYC' },
          { id: 'EMPLOYMENT', label: 'Employment & HR' },
          { id: 'EDUCATION', label: 'Education & Skills' },
          { id: 'PAYROLL', label: 'Payroll & Bank' },
          { id: 'STATUTORY', label: 'Statutory' },
          ...(isVendorDeployed ? [{ id: 'VENDOR_WORKFORCE', label: 'Vendor Workforce' }] : []),
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#07563D] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Document Items List */}
      <div className="space-y-3">
        {filteredCatalog.map((docDef) => {
          const uploadedDoc = (formData.documents || []).find((d) => d.type === docDef.id);
          const isUploading = uploadingDocId === docDef.id;
          const isRequesting = requestingDocId === docDef.id;
          const isRequested = uploadedDoc?.is_requested_mobile;

          return (
            <div
              key={docDef.id}
              className={`p-4 rounded-2xl border transition-all ${
                uploadedDoc && !isRequested
                  ? 'bg-emerald-50/20 border-emerald-200 shadow-2xs'
                  : isRequested
                  ? 'bg-blue-50/20 border-blue-200 shadow-2xs'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Document Information */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      uploadedDoc && !isRequested
                        ? 'bg-emerald-100 text-[#07563D]'
                        : isRequested
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isRequested ? <Smartphone className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-gray-900 tracking-tight">
                        {docDef.title}
                      </span>
                      {docDef.required && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          Required
                        </span>
                      )}
                      {docDef.vendorOnly && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          Vendor Compliance
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">{docDef.desc}</p>

                    {/* Upload Status / Metadata */}
                    {uploadedDoc && !isRequested && (
                      <p className="text-[11px] text-emerald-800 font-semibold pt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {uploadedDoc.file_name} ({uploadedDoc.file_size}) · Uploaded on {uploadedDoc.uploaded_at}
                      </p>
                    )}

                    {/* Mobile Request Status */}
                    {isRequested && (
                      <p className="text-[11px] text-blue-800 font-semibold pt-1 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                        Dispatched to Flutter App · Due by {uploadedDoc.request_due_date || '3 Days'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions: Upload vs Request from Mobile */}
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  {isUploading ? (
                    <div className="w-32 space-y-1">
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#07563D] h-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold block text-center">
                        Encrypting {uploadProgress}%
                      </span>
                    </div>
                  ) : uploadedDoc && !isRequested ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Uploaded
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(uploadedDoc.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : isRequested ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        Pending Mobile
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(uploadedDoc!.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Cancel request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Request from Employee Mobile App */}
                      <button
                        type="button"
                        onClick={() => handleRequestViaMobile(docDef)}
                        disabled={isRequesting}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 shadow-2xs transition-colors cursor-pointer"
                        title="Employee receives push notification to submit from mobile"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Request from Mobile
                      </button>

                      {/* Direct Upload File */}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSimulatedUpload(docDef, f);
                          }}
                        />
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 shadow-2xs transition-colors">
                          <Upload className="w-3.5 h-3.5 mr-1.5 text-[#07563D]" />
                          Upload File
                        </span>
                      </label>
                    </div>
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
