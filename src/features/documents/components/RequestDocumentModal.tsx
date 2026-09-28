// src/features/documents/components/RequestDocumentModal.tsx
// ============================================================================
// Joy PeopleHR — Request Document from Employee Modal
// Dispatches Document Requirement + Instant Realtime Push Notification to Flutter
// Uses the configurable document_types catalog (Supabase + local fallback)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { documentService } from '../../../services/document/documentService';
import { documentRequestService } from '../../../services/documents/documentRequestService';
import { api } from '../../../services/api';
import { supabase } from '../../../lib/supabase';
import { Employee } from '../../../types';
import {
  EMPLOYEE_DOCUMENT_CATALOG,
  DOCUMENT_CATEGORY_LABELS,
  groupDocumentCatalogByCategory,
  loadDocumentCatalog,
  type DocumentTypeDefinition,
  type DocumentCatalogCategory,
} from '../../../types/documentCatalog';
import {
  Send,
  Smartphone,
  ChevronDown,
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

  // Catalog-driven document type selection
  const [catalog, setCatalog] = useState<DocumentTypeDefinition[]>(EMPLOYEE_DOCUMENT_CATALOG);
  const [selectedDocType, setSelectedDocType] = useState<DocumentTypeDefinition>(EMPLOYEE_DOCUMENT_CATALOG[0]);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCatalogCategory | 'ALL'>('ALL');

  const [customTitle, setCustomTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load catalog from Supabase (with local fallback)
    loadDocumentCatalog(supabase, 'EMPLOYEE').then(setCatalog);

    // Load employees
    api.getEmployees().then(emps => {
      const list = Array.isArray(emps) ? emps : (emps as any)?.data ?? [];
      setEmployees(list);
      if (!selectedEmployeeId && list.length > 0) {
        setSelectedEmployeeId(list[0].id);
        setSelectedEmployeeName(`${list[0].first_name} ${list[0].last_name}`);
      }
    }).catch(() => setEmployees([]));

    // Default due date: 7 days from today
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split('T')[0]);
  }, [isOpen]);

  // Filtered catalog items based on selected category
  const visibleDocs = selectedCategory === 'ALL'
    ? catalog
    : catalog.filter(d => d.category === selectedCategory);

  // Available categories from current catalog
  const availableCategories = Array.from(
    new Set(catalog.map(d => d.category))
  ) as DocumentCatalogCategory[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      showToast('Please select an employee.', 'error');
      return;
    }
    if (!selectedDocType) {
      showToast('Please select a document type.', 'error');
      return;
    }

    const correlationId = `WF-DOCREQ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const title = customTitle.trim() || selectedDocType.displayName;

    setIsSubmitting(true);
    try {
      // 1. Persist to local documentService store
      await documentService.createDocumentRequirement({
        employeeId: selectedEmployeeId,
        employeeName: selectedEmployeeName,
        documentTypeCode: selectedDocType.code,
        title,
        description: description || `Please upload a clear copy of your ${selectedDocType.displayName}.`,
        dueDate: dueDate || undefined,
        required: isRequired,
        correlationId,
      });

      // 2. Persist to documentRequestService (for mobile request feed)
      await documentRequestService.createRequest({
        employeeId: selectedEmployeeId,
        employeeName: selectedEmployeeName,
        documentTypeId: selectedDocType.code,
        documentTitle: title,
        documentCode: selectedDocType.code,
        category: selectedDocType.category as any,
        isRequired,
        dueDate,
        message: description || `Please upload a clear copy of your ${selectedDocType.displayName}.`,
      });

      // 3. Persist to Supabase document_requests table (Flutter sync)
      try {
        await supabase.from('document_requests').insert({
          document_type_id: selectedDocType.code,
          document_title: title,
          category: selectedDocType.category,
          employee_id: selectedEmployeeId,
          is_required: isRequired,
          status: 'REQUESTED',
          due_date: dueDate || null,
          request_message: description || null,
        });
      } catch (dbErr) {
        // Non-fatal: local store + documentRequestService already have the record
        console.warn('[RequestDocumentModal] Supabase insert warning:', dbErr);
      }

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
    <Modal isOpen={isOpen} onClose={onClose} title="Request Document from Employee" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Realtime Notification Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
          <Smartphone className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Realtime In-App Notification:</span> When submitted, the employee will receive an instant <strong>in-app notification</strong> &amp; badge in their mobile app to upload this document.
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
                {emp.first_name} {emp.last_name} ({emp.employee_code || emp.id}) • {(emp as any).department || 'Operations'}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter Pills */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Document Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-[#07563D] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {availableCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#07563D] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {DOCUMENT_CATEGORY_LABELS[cat]?.label ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* Document Type Selection — grouped by category */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Required Document Type *
          </label>
          <div className="relative">
            <select
              value={selectedDocType?.code ?? ''}
              onChange={e => {
                const found = catalog.find(d => d.code === e.target.value);
                if (found) setSelectedDocType(found);
              }}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden appearance-none"
            >
              {selectedCategory === 'ALL'
                ? (() => {
                    const grouped = groupDocumentCatalogByCategory(visibleDocs);
                    return Array.from(grouped.entries()).map(([cat, docs]) => (
                      <optgroup key={cat} label={DOCUMENT_CATEGORY_LABELS[cat]?.label ?? cat}>
                        {docs.map(d => (
                          <option key={d.code} value={d.code}>
                            {d.displayName}{d.isMandatory ? ' ★' : ''}
                          </option>
                        ))}
                      </optgroup>
                    ));
                  })()
                : visibleDocs.map(d => (
                    <option key={d.code} value={d.code}>
                      {d.displayName}{d.isMandatory ? ' ★' : ''}
                    </option>
                  ))
              }
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {selectedDocType && (
            <p className="mt-1 text-[10px] text-gray-500">
              {selectedDocType.description || DOCUMENT_CATEGORY_LABELS[selectedDocType.category]?.description}
              {selectedDocType.isReviewRequired && (
                <span className="ml-1.5 text-amber-600 font-semibold">• HR review required after upload</span>
              )}
            </p>
          )}
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
            placeholder={selectedDocType?.displayName || 'e.g. Upload PAN Card front photo'}
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
