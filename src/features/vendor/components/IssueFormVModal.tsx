import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { FileSpreadsheet, CheckCircle2, ShieldCheck, Building2, Calendar, Stamp } from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';

interface IssueFormVModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorOrganization;
  onSuccess?: () => void;
}

export const IssueFormVModal: React.FC<IssueFormVModalProps> = ({
  isOpen,
  onClose,
  vendor,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [natureOfWork, setNatureOfWork] = useState(
    'Assembly Line Production, Packaging & Quality Inspection'
  );
  const [maxWorkers, setMaxWorkers] = useState(50);
  const [durationFrom, setDurationFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [durationTo, setDurationTo] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
  );
  const [siteLocation, setSiteLocation] = useState(
    'Coimbatore Plant (Unit 1 & 2), SIDCO Industrial Estate'
  );
  const [issuedByName, setIssuedByName] = useState('Senthil Nathan');
  const [issuedByDesig, setIssuedByDesig] = useState('Head of HR & Labour Compliance');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!natureOfWork || maxWorkers <= 0) {
      showToast('Please provide valid nature of work and worker limit.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formV = vendorPortalService.issuePrincipalEmployerFormV({
        vendor_id: vendor.id,
        nature_of_work: natureOfWork,
        max_workers: maxWorkers,
        duration_from: durationFrom,
        duration_to: durationTo,
        site_location: siteLocation,
        issued_by_name: issuedByName,
        issued_by_designation: issuedByDesig,
      });

      showToast(`Form V Certificate #${formV.certificate_number} officially issued to ${vendor.name}!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      showToast('Failed to issue Form V Certificate', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Issue Form V (Principal Employer Certificate) — ${vendor.name}`}
      maxWidth="lg"
    >
      <div className="space-y-5 p-1">
        {/* Statutory Header Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white space-y-2 border border-emerald-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30">
              Form V · Rule 21(2) of CLRA Central Rules
            </span>
            <span className="text-[11px] font-mono text-emerald-200">RC/TN/CBE/CLRA/2022/9918</span>
          </div>

          <h3 className="text-base font-black text-white">
            Form of Certificate by Principal Employer
          </h3>
          <p className="text-xs text-emerald-100/80 leading-relaxed">
            Certifies that <strong>{vendor.name}</strong> is engaged as a licensed contractor to execute specified contract work at client premises with the maximum approved labour strength.
          </p>
        </div>

        {/* Nature of Work */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">
            Nature of Contract Work / Operations *
          </label>
          <input
            type="text"
            value={natureOfWork}
            onChange={(e) => setNatureOfWork(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Max Workers & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Max Contract Labour Strength (Cap) *
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={maxWorkers}
              onChange={(e) => setMaxWorkers(Number(e.target.value))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Client Site / Premises Location *
            </label>
            <input
              type="text"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Contract Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Engagement Valid From *
            </label>
            <input
              type="date"
              value={durationFrom}
              onChange={(e) => setDurationFrom(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Engagement Valid To *
            </label>
            <input
              type="date"
              value={durationTo}
              onChange={(e) => setDurationTo(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Authorized Signatory Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Principal Employer Signatory Name
            </label>
            <input
              type="text"
              value={issuedByName}
              onChange={(e) => setIssuedByName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Designation & Title
            </label>
            <input
              type="text"
              value={issuedByDesig}
              onChange={(e) => setIssuedByDesig(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
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
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-md"
            leftIcon={<Stamp className="w-4 h-4" />}
          >
            {isSubmitting ? 'Issuing Form V...' : 'Sign & Issue Form V Certificate'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
