import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Building2, ShieldCheck, Mail, MapPin, FileText } from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { useToast } from '../../../components/ui/Toast';

interface ConnectNewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export const ConnectNewClientModal: React.FC<ConnectNewClientModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const { showToast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [sowNumber, setSowNumber] = useState('');
  const [hrContactName, setHrContactName] = useState('');
  const [hrContactEmail, setHrContactEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      showToast('Please enter the client company name', 'error');
      return;
    }

    vendorPortalService.requestCompanyConnection({
      company_name: companyName,
      company_code: companyCode || `CLIENT-${Math.floor(100 + Math.random() * 900)}`,
      site_location: siteLocation || 'Coimbatore Industrial Hub',
      sow_number: sowNumber || `SOW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      primary_hr_contact_name: hrContactName || 'Client HR Head',
      primary_hr_contact_email: hrContactEmail || 'hr@clientcorp.in',
    });

    showToast('Connection request dispatched to Client HR. Awaiting approval.', 'success');
    setCompanyName('');
    setCompanyCode('');
    setSiteLocation('');
    setSowNumber('');
    setHrContactName('');
    setHrContactEmail('');
    onClose();
    if (onConnected) onConnected();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Client Company Connection"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-indigo-950">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Multi-Company Strict Data Isolation
          </div>
          <p className="text-[11px] text-indigo-900/80 leading-relaxed">
            Connecting a new enterprise client creates an isolated workspace security boundary (
            <code className="font-mono font-bold">vendor_company_relationship_id</code>). Client company HR must approve this request before worker deployment and invoicing are enabled.
          </p>
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">Client Company Legal Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Larsen & Turbo Modular Fabrication Ltd"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Company Code / Entity ID</label>
            <input
              type="text"
              placeholder="e.g. LNT-MFG-09"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Site / Factory Premise</label>
            <input
              type="text"
              placeholder="e.g. Coimbatore Yard 2"
              value={siteLocation}
              onChange={(e) => setSiteLocation(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">Master Agreement / SOW Reference No</label>
          <input
            type="text"
            placeholder="e.g. SOW-2026-AUG-8912"
            value={sowNumber}
            onChange={(e) => setSowNumber(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Client HR / Authorizer Name</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Chandra (CHRO)"
              value={hrContactName}
              onChange={(e) => setHrContactName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Client HR Official Email</label>
            <input
              type="email"
              placeholder="e.g. ramesh.chandra@clientcorp.in"
              value={hrContactEmail}
              onChange={(e) => setHrContactEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
            Submit Connection Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
