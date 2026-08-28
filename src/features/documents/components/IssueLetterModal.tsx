// src/features/documents/components/IssueLetterModal.tsx
// ============================================================================
// Joy PeopleHR — Issue & Upload Digital Letter Modal
// Enables HR to upload and publish official letters to employees with E-Sign options
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { hrEventBus } from '../../../services/hrEventBus';
import {
  Award,
  FileText,
  Upload,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export interface IssueLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const IssueLetterModal: React.FC<IssueLetterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [employeeId, setEmployeeId] = useState('emp-admin-001');
  const [employeeCode, setEmployeeCode] = useState('JCS-017');
  const [employeeName, setEmployeeName] = useState('Dharun B');
  const [letterType, setLetterType] = useState('INCREMENT');
  const [title, setTitle] = useState('Annual Compensation Revision Letter - 2026');
  const [description, setDescription] = useState('Annual increment revision and updated benefits.');
  const [effectiveDate, setEffectiveDate] = useState('2026-09-01');
  const [requiresSignature, setRequiresSignature] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setIsUploading(true);
      const tenantId = getActiveOrgId();

      try {
        if (isSupabaseEnabled) {
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `tenants/${tenantId}/letters/${employeeId}/${Date.now()}_${sanitizedName}`;

          const { data, error } = await supabase.storage
            .from('employee-documents')
            .upload(path, file, { cacheControl: '3600', upsert: false });

          if (!error && data) {
            const { data: pubData } = supabase.storage
              .from('employee-documents')
              .getPublicUrl(path);
            setFileUrl(pubData.publicUrl);
          } else {
            setFileUrl(`https://workforceos.joycorporate.com/letters/${file.name}`);
          }
        } else {
          setFileUrl(`https://workforceos.joycorporate.com/letters/${file.name}`);
        }
      } catch (err) {
        setFileUrl(`https://workforceos.joycorporate.com/letters/${file.name}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      showToast('Please enter a letter title', 'error');
      return;
    }

    setIsSubmitting(true);
    const tenantId = getActiveOrgId();
    const letterNumber = `LET-${Date.now().toString().slice(-6)}`;

    try {
      if (isSupabaseEnabled) {
        // 1. Insert into digital_letters
        await supabase.from('digital_letters').insert({
          tenant_id: tenantId,
          organization_id: tenantId,
          letter_number: letterNumber,
          employee_id: employeeId,
          employee_code: employeeCode,
          employee_name: employeeName,
          letter_type: letterType,
          title,
          description,
          effective_date: effectiveDate,
          requires_signature: requiresSignature,
          document_url: fileUrl || `https://workforceos.joycorporate.com/letters/${title.replace(/\s+/g, '_')}.pdf`,
          status: 'PUBLISHED',
          issued_date: new Date().toISOString().split('T')[0],
          issued_by_name: 'Haripriya (HR Head)',
        });

        // 2. Realtime outbox event
        await supabase.from('realtime_outbox').insert({
          tenant_id: tenantId,
          entity_type: 'digital_letters',
          entity_id: letterNumber,
          action: 'INSERT',
          payload: {
            letter_number: letterNumber,
            employee_id: employeeId,
            title,
            letter_type: letterType,
          },
        });
      }

      showToast(`✓ Letter "${title}" published and sent to ${employeeName}.`);
      hrEventBus.publish('letter.published' as any, { letterNumber });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to publish digital letter', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Issue & Publish Digital Letter"
      size="lg"
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 flex items-start gap-2">
          <FileCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <p>
            Official letters published here will be securely indexed in Supabase and delivered directly to the employee's Flutter mobile app for viewing and e-signature.
          </p>
        </div>

        {/* 1. Recipient Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-bold text-gray-700">Target Employee:</label>
            <select
              value={employeeCode}
              onChange={e => {
                setEmployeeCode(e.target.value);
                if (e.target.value === 'JCS-017') {
                  setEmployeeId('emp-admin-001');
                  setEmployeeName('Dharun B');
                } else {
                  setEmployeeId('emp-002');
                  setEmployeeName('General Staff');
                }
              }}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-1 focus:ring-[#07563D]"
            >
              <option value="JCS-017">Dharun B (JCS-017) — Software Engineer</option>
              <option value="JCS-018">Haripriya (JCS-018) — HR Head</option>
              <option value="JCS-019">Karthik S (JCS-019) — Lead QA</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-gray-700">Letter Classification Type:</label>
            <select
              value={letterType}
              onChange={e => {
                setLetterType(e.target.value);
                if (e.target.value === 'PROMOTION') setTitle('Promotion & Role Elevation Letter');
                if (e.target.value === 'INCREMENT') setTitle('Annual Compensation Revision Letter - 2026');
                if (e.target.value === 'OFFER') setTitle('Official Letter of Offer');
                if (e.target.value === 'EXPERIENCE') setTitle('Experience & Service Certificate');
              }}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-1 focus:ring-[#07563D]"
            >
              <option value="INCREMENT">Annual Increment / Revision</option>
              <option value="PROMOTION">Promotion & Title Change</option>
              <option value="OFFER">Offer Letter</option>
              <option value="APPOINTMENT">Appointment Letter</option>
              <option value="EXPERIENCE">Experience Certificate</option>
              <option value="RELIEVING">Relieving Letter</option>
              <option value="WARNING">Official HR Advisory</option>
            </select>
          </div>
        </div>

        {/* 2. Letter Title & Description */}
        <div className="space-y-1">
          <label className="font-bold text-gray-700">Official Title / Subject:</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-1 focus:ring-[#07563D]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-bold text-gray-700">Effective Date:</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-1 focus:ring-[#07563D]"
            />
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="reqSig"
              checked={requiresSignature}
              onChange={e => setRequiresSignature(e.target.checked)}
              className="w-4 h-4 text-[#07563D] rounded border-gray-300 focus:ring-[#07563D]"
            />
            <label htmlFor="reqSig" className="font-bold text-gray-700 cursor-pointer">
              Require Employee Digital E-Signature / Acknowledgment
            </label>
          </div>
        </div>

        {/* 3. Document PDF Upload */}
        <div className="space-y-1">
          <label className="font-bold text-gray-700">Official Letter Document (PDF / DOCX):</label>
          <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center text-center">
            {fileName ? (
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{fileName}</span>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <p className="text-xs font-bold text-gray-700">Choose PDF file to upload</p>
                <p className="text-[10px] text-gray-400">PDF up to 15MB</p>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
              className="mt-2 text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl font-bold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePublish}
            disabled={isSubmitting || isUploading}
            className="bg-[#07563D] hover:bg-[#064e37] text-white rounded-xl font-bold"
          >
            {isSubmitting ? 'Publishing...' : 'Publish & Deliver Letter'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
