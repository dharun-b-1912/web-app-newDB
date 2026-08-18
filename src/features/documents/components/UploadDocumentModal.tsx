import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { documentService } from '../../../services/document/documentService';
import { documentSecurityService } from '../../../services/document/documentSecurityService';
import { api } from '../../../services/api';
import {
  DocumentSubjectType,
  DocumentClassification,
  DocumentTypeMaster,
  Employee,
} from '../../../types';
import {
  UploadCloud,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Building,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultSubjectType?: DocumentSubjectType;
  defaultSubjectId?: string;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultSubjectType = 'employee',
  defaultSubjectId,
}) => {
  const { showToast } = useToast();

  const [subjectType, setSubjectType] = useState<DocumentSubjectType>(defaultSubjectType);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(defaultSubjectId || '');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('');

  const [documentTypes, setDocumentTypes] = useState<DocumentTypeMaster[]>([]);
  const [selectedDocTypeCode, setSelectedDocTypeCode] = useState<string>('PAN_CARD');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [classification, setClassification] = useState<DocumentClassification>('restricted');
  const [issuedAt, setIssuedAt] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [requiresVerification, setRequiresVerification] = useState<boolean>(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHashPreview, setFileHashPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const types = documentService.getDocumentTypes();
      setDocumentTypes(types);

      const fetchEmps = async () => {
        try {
          const emps = await api.getEmployees();
          setEmployees(Array.isArray(emps) ? emps : []);
          if (!selectedSubjectId && emps.length > 0) {
            setSelectedSubjectId(emps[0].id);
            setSelectedSubjectName(`${emps[0].first_name} ${emps[0].last_name}`);
          }
        } catch {
          setEmployees([]);
        }
      };
      fetchEmps();
    }
  }, [isOpen]);

  const activeDocType = documentTypes.find(t => t.code === selectedDocTypeCode);

  useEffect(() => {
    if (activeDocType) {
      setClassification(activeDocType.default_classification);
      if (!title || title.trim() === '') {
        setTitle(`${selectedSubjectName ? `${selectedSubjectName} - ` : ''}${activeDocType.name}`);
      }
    }
  }, [selectedDocTypeCode, selectedSubjectName]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const val = documentSecurityService.validateFile(file, activeDocType?.max_size_bytes || 10485760);
      if (!val.isValid) {
        showToast(val.error || 'Invalid file format or size.', 'error');
        return;
      }
      setSelectedFile(file);
      const hash = await documentSecurityService.generateContentHash(file, file.size);
      setFileHashPreview(hash);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a valid document file to upload.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await documentService.uploadDocument({
        subjectType,
        subjectId: selectedSubjectId || 'comp-joy-01',
        subjectName: selectedSubjectName || 'Company Record',
        documentTypeCode: selectedDocTypeCode,
        categoryCode: activeDocType?.category_id || 'IDENTITY',
        title: title || `${selectedDocTypeCode} Record`,
        description,
        classification,
        file: selectedFile,
        issuedAt: issuedAt || undefined,
        expiresAt: expiresAt || undefined,
        requiresVerification,
      });

      showToast('Document uploaded, hashed, and encrypted into private storage successfully.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload document.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Secure Document Ingestion & Storage" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Security Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
          <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Enterprise Security Policy:</span> Files are hashed with{' '}
            <strong>SHA-256</strong>, protected with KMS Envelope Encryption, and stored in isolated private object keys.
            No public URLs are ever exposed.
          </div>
        </div>

        {/* Step 1: Subject Scope */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Subject Scope *
            </label>
            <select
              value={subjectType}
              onChange={e => {
                const val = e.target.value as DocumentSubjectType;
                setSubjectType(val);
                if (val === 'company') {
                  setSelectedSubjectId('comp-joy-01');
                  setSelectedSubjectName('Joy Corporate Solutions Pvt Ltd');
                }
              }}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="employee">Direct Employee</option>
              <option value="vendor_worker">Vendor / Contract Worker</option>
              <option value="vendor">Vendor / Manpower Provider</option>
              <option value="candidate">Recruitment Candidate</option>
              <option value="company">Company / Legal Entity</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Select Subject Entity *
            </label>
            {subjectType === 'employee' || subjectType === 'vendor_worker' ? (
              <select
                value={selectedSubjectId}
                onChange={e => {
                  setSelectedSubjectId(e.target.value);
                  const found = employees.find(emp => emp.id === e.target.value);
                  if (found) setSelectedSubjectName(`${found.first_name} ${found.last_name}`);
                }}
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code || emp.id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedSubjectName}
                onChange={e => setSelectedSubjectName(e.target.value)}
                placeholder="e.g. ABC Workforce Solutions Pvt Ltd"
                className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
              />
            )}
          </div>
        </div>

        {/* Step 2: Document Type Master */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Document Type Master *
            </label>
            <select
              value={selectedDocTypeCode}
              onChange={e => setSelectedDocTypeCode(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              {documentTypes.map(dt => (
                <option key={dt.id} value={dt.code}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Security Classification *
            </label>
            <select
              value={classification}
              onChange={e => setClassification(e.target.value as DocumentClassification)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="restricted">Restricted (Sensitive KYC / Identity / Pay)</option>
              <option value="confidential">Confidential (Contracts / NDA / SOW)</option>
              <option value="internal">Internal (General HR / Certificates)</option>
              <option value="public_internal">Public Internal (Company Policies)</option>
            </select>
          </div>
        </div>

        {/* Document Title & Description */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Document Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Official document title"
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* File Drag & Drop Box */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Select Document File (PDF, PNG, JPEG) *
          </label>
          <div className="border-2 border-dashed border-gray-300 hover:border-[#07563D] rounded-2xl p-4 text-center cursor-pointer transition-colors bg-gray-50/50">
            <input
              type="file"
              id="docFileUpload"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="docFileUpload" className="cursor-pointer space-y-1 block">
              <UploadCloud className="w-8 h-8 text-gray-400 mx-auto" />
              <span className="text-xs font-bold text-gray-800 block">
                {selectedFile ? selectedFile.name : 'Click or browse to choose document'}
              </span>
              <span className="text-[10px] text-gray-400 block">
                {selectedFile
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for SHA-256 Hashing`
                  : 'Max file size 10MB • AES-256 Encrypted'}
              </span>
            </label>
          </div>

          {fileHashPreview && (
            <div className="mt-2 p-2 bg-gray-100 rounded-xl text-[10px] font-mono text-gray-600 flex items-center justify-between">
              <span>SHA-256: {fileHashPreview.substring(0, 32)}...</span>
              <Badge variant="emerald" className="text-[9px]">
                Integrity Verified
              </Badge>
            </div>
          )}
        </div>

        {/* Dates & Verification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Issue / Effective Date
            </label>
            <input
              type="date"
              value={issuedAt}
              onChange={e => setIssuedAt(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Expiry Date (if applicable)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Verification Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="reqVerifCheck"
            checked={requiresVerification}
            onChange={e => setRequiresVerification(e.target.checked)}
            className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] h-4 w-4"
          />
          <label htmlFor="reqVerifCheck" className="text-xs font-bold text-gray-800 cursor-pointer">
            Queue for HR Verification & Compliance Signoff
          </label>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedFile || !title.trim()}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
          >
            {isSubmitting ? 'Ingesting & Hashing...' : 'Securely Ingest Document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
