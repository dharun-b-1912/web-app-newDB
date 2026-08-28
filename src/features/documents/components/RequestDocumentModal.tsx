// src/features/documents/components/RequestDocumentModal.tsx
// ============================================================================
// Joy PeopleHR — Request Document from Employee Modal
// Dispatches Document Requirement + Instant Realtime Push Notification to Flutter
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { documentService } from '../../../services/document/documentService';
import { api } from '../../../services/api';
import { Employee, DocumentTypeMaster } from '../../../types';
import {
  Send,
  FileText,
  User,
  Calendar,
  AlertCircle,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

interface RequestDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestDocumentModal: React.FC<RequestDocumentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');

  const [documentTypes, setDocumentTypes] = useState<DocumentTypeMaster[]>([]);
  const [selectedDocTypeCode, setSelectedDocTypeCode] = useState<string>('PAN_CARD');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const types = documentService.getDocumentTypes();
      setDocumentTypes(types);

      const fetchEmployees = async () => {
        try {
          const emps = await api.getEmployees();
          if (Array.isArray(emps) && emps.length > 0) {
            setEmployees(emps);
            if (!selectedEmployeeId) {
              setSelectedEmployeeId(emps[0].id);
              setSelectedEmployeeName(`${emps[0].first_name} ${emps[0].last_name}`);
            }
          }
        } catch {
          setEmployees([]);
        }
      };
      fetchEmployees();

      // Default due date: 7 days from today
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const activeDocType = documentTypes.find(t => t.code === selectedDocTypeCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      showToast('Please select an employee.', 'error');
      return;
    }

    const correlationId = `WF-DOCREQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    setIsSubmitting(true);
    try {
      await documentService.createDocumentRequirement({
        employeeId: selectedEmployeeId,
        employeeName: selectedEmployeeName,
        documentTypeCode: selectedDocTypeCode,
        title: customTitle || activeDocType?.name || 'Required Document',
        description: description || `Please upload a clear copy of your ${activeDocType?.name || 'document'}.`,
        dueDate: dueDate || undefined,
        required: isRequired,
        correlationId,
      });

      showToast(
        `✓ Document request created & in-app notification delivered to ${selectedEmployeeName}'s mobile app.`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch document request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Document from Employee" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Realtime Notification Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
          <Smartphone className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Realtime In-App Notification:</span> When submitted, the employee will receive an instant <strong>in-app notification</strong> & badge in their mobile app to upload this document.
          </div>
        </div>

        {/* Employee Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Target Employee *
          </label>
          <select
            value={selectedEmployeeId}
            onChange={e => {
              setSelectedEmployeeId(e.target.value);
              const found = employees.find(emp => emp.id === e.target.value);
              if (found) setSelectedEmployeeName(`${found.first_name} ${found.last_name}`);
            }}
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} ({emp.employee_code || emp.id}) • {emp.department || 'Operations'}
              </option>
            ))}
          </select>
        </div>

        {/* Document Type Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Required Document Type *
          </label>
          <select
            value={selectedDocTypeCode}
            onChange={e => setSelectedDocTypeCode(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          >
            {documentTypes.map(t => (
              <option key={t.code} value={t.code}>
                {t.name} ({t.default_classification.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Custom Instructions / Title */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Instructions / Request Title
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
            placeholder={activeDocType?.name || 'e.g. Upload PAN Card front photo'}
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Additional Instructions for Employee
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="e.g. Please ensure all 4 corners and the QR code are clearly legible."
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Due Date & Mandatory Flag */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Submission Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isRequiredCheck"
              checked={isRequired}
              onChange={e => setIsRequired(e.target.checked)}
              className="w-4 h-4 text-[#07563D] rounded-sm focus:ring-[#07563D]"
            />
            <label htmlFor="isRequiredCheck" className="text-xs font-bold text-gray-800 cursor-pointer">
              Mandatory Requirement
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            leftIcon={<Send className="w-3.5 h-3.5" />}
            className="bg-[#07563D] hover:bg-[#064e37] text-white"
          >
            {isSubmitting ? 'Dispatching...' : 'Dispatch Request to Mobile'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
