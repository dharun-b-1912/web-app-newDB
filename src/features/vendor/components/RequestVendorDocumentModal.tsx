import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { FileText, Send, Calendar, AlertTriangle, ShieldCheck, Layers } from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';

interface RequestVendorDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorOrganization;
  onSuccess?: () => void;
}

const DOCUMENT_PRESETS = [
  {
    title: 'Contract Labour License Renewal (CLRA Form VI)',
    desc: 'Mandatory statutory renewal certificate under Section 12 of Contract Labour (R&A) Act.',
    priority: 'CRITICAL' as const,
  },
  {
    title: 'Monthly EPFO ECR & Contribution Challan',
    desc: 'EPFO Electronic Challan cum Return showing employee-wise provident fund remittance and TRRN receipt.',
    priority: 'HIGH' as const,
  },
  {
    title: 'Monthly ESIC Online Contribution Slip & Receipt',
    desc: 'ESIC monthly remittance challan with bank transaction reference confirming active insurance coverage.',
    priority: 'HIGH' as const,
  },
  {
    title: 'Labour Welfare Fund (LWF) Half-Yearly Receipt',
    desc: 'Statutory receipt for employer and employee contribution deposited with State Labour Welfare Board.',
    priority: 'MEDIUM' as const,
  },
  {
    title: 'Migrant Labour License (ISMW Act)',
    desc: 'Inter-State Migrant Workmen registration license for out-of-state workers deployed at client premises.',
    priority: 'HIGH' as const,
  },
  {
    title: 'Workers Compensation / Group Personal Accident Insurance',
    desc: 'Active policy document covering all contract employees against on-site workplace risks and accidents.',
    priority: 'HIGH' as const,
  },
  {
    title: 'Cancelled Bank Cheque / Mandate Verification',
    desc: 'Original cancelled cheque for bank account verification and automated NEFT/RTGS disbursement setup.',
    priority: 'MEDIUM' as const,
  },
  {
    title: 'Annual Form XXV Return Filing Copy',
    desc: 'Annual return filed with the Registering Officer under Contract Labour Rules for the preceding calendar year.',
    priority: 'MEDIUM' as const,
  },
];

export const RequestVendorDocumentModal: React.FC<RequestVendorDocumentModalProps> = ({
  isOpen,
  onClose,
  vendor,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState(DOCUMENT_PRESETS[0].title);
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState(DOCUMENT_PRESETS[0].desc);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL'>('HIGH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectPreset = (title: string) => {
    setSelectedPreset(title);
    const found = DOCUMENT_PRESETS.find((p) => p.title === title);
    if (found) {
      setDescription(found.desc);
      setPriority(found.priority);
    }
  };

  const handleSubmit = () => {
    const docType = selectedPreset === 'CUSTOM' ? customTitle.trim() : selectedPreset;
    if (!docType) {
      showToast('Please specify the document requirement title.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      vendorPortalService.createDocumentRequest({
        vendor_id: vendor.id,
        document_type: docType,
        description: description.trim(),
        due_date: dueDate,
        priority,
        requested_by_name: 'Principal Employer Compliance Team',
      });

      showToast(`Document request for "${docType}" dispatched to ${vendor.name}!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      showToast('Failed to create document requisition', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Request Compliance Document — ${vendor.name}`}
      maxWidth="lg"
    >
      <div className="space-y-5 p-1">
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
              Official Principal Employer Document Requisition
            </h4>
            <p className="text-xs text-indigo-900/80 mt-0.5 leading-relaxed">
              This request will immediately notify <strong>{vendor.contact_person || vendor.name}</strong> on their vendor portal with the specified deadline and compliance instructions.
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">
            Select Document Category / Preset
          </label>
          <select
            value={selectedPreset}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {DOCUMENT_PRESETS.map((p) => (
              <option key={p.title} value={p.title}>
                {p.title} ({p.priority})
              </option>
            ))}
            <option value="CUSTOM">+ Custom Document Type</option>
          </select>
        </div>

        {selectedPreset === 'CUSTOM' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Custom Document Title *
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Factory Premises Fire Safety Certificate"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        )}

        {/* Instructions / Scope */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">
            Audit Instructions & Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specify verification instructions, period, and acceptable format..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {/* Priority & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Submission Due Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Compliance Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="CRITICAL">🔴 Critical (Blocks Invoicing)</option>
              <option value="HIGH">🟠 High Priority (14-Day SLA)</option>
              <option value="MEDIUM">🟡 Medium (Regular Audit)</option>
              <option value="LOW">🔵 Low (Informational)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'Sending Request...' : 'Send Request to Vendor'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
