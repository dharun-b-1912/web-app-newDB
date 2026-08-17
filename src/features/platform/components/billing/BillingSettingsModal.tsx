// src/features/platform/components/billing/BillingSettingsModal.tsx
// ============================================================
// WorkForceOS — Billing Settings & Supplier Tax Profile Modal
// ============================================================

import React, { useState } from 'react';
import {
  Building2,
  X,
  Check,
  Shield,
  CreditCard,
  Percent,
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';

export interface BillingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BillingSettingsModal: React.FC<BillingSettingsModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [supplierGstin, setSupplierGstin] = useState('33AAACW0000A1Z5');
  const [supplierPan, setSupplierPan] = useState('AAACW0000A');
  const [stateCode, setStateCode] = useState('33');
  const [dunningGraceDays, setDunningGraceDays] = useState(7);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Billing & Tax Settings saved successfully.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Billing & Tax Configuration</h3>
            <p className="text-xs text-gray-500">Supplier GST details, invoice rules, and dunning parameters.</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Supplier Tax Profile</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Supplier GSTIN</label>
                <input
                  type="text"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Supplier PAN</label>
                <input
                  type="text"
                  value={supplierPan}
                  onChange={(e) => setSupplierPan(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Supplier State Code (Place of Supply origin)</label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-bold text-xs"
              >
                <option value="33">33 — Tamil Nadu</option>
                <option value="27">27 — Maharashtra</option>
                <option value="29">29 — Karnataka</option>
                <option value="07">07 — Delhi</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Dunning & Recovery Policy</span>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Grace Period (Days before dunning)</label>
              <input
                type="number"
                value={dunningGraceDays}
                onChange={(e) => setDunningGraceDays(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-[#047857] hover:bg-[#036246] text-white font-bold">
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
