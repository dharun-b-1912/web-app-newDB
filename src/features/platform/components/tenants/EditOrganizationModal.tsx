// src/features/platform/components/tenants/EditOrganizationModal.tsx
// ============================================================
// WorkForceOS — Edit Customer Organization Side Panel & Modal
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  Building2,
  X,
  Check,
  Globe,
  MapPin,
  Mail,
  Phone,
  User,
  Shield,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { Button } from '../../../../components/ui/Button';
import { cn } from '../../../../lib/utils';

export interface EditOrganizationModalProps {
  isOpen: boolean;
  organization: OrganizationRecord;
  onClose: () => void;
  onSave: (updates: Partial<OrganizationRecord>, diffSummary: string) => Promise<void>;
}

export const EditOrganizationModal: React.FC<EditOrganizationModalProps> = ({
  isOpen,
  organization: org,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState({
    legal_name: org.legal_name || '',
    display_name: org.display_name || '',
    domain: org.domain || '',
    industry: org.industry || 'Software & IT Services',
    company_type: 'Private Limited',
    city: org.city || 'Chennai',
    state: org.state || 'Tamil Nadu',
    country: org.country || 'India',
    timezone: org.timezone || 'Asia/Kolkata',
    currency: org.currency || 'INR (₹)',
    gstin: org.gstin || '',
    pan: org.pan || '',
    cin: org.cin || '',
    primary_admin_name: org.primary_admin_name || '',
    primary_admin_email: org.primary_admin_email || '',
    primary_admin_phone: org.primary_admin_phone || '',
    account_owner_name: org.account_owner_name || 'Arun Kumar (Super Admin)',
  });

  const [isSaving, setIsSaving] = useState(false);

  // Compute changed fields count & diff summary
  const diffs = useMemo(() => {
    const changes: { field: string; oldVal: string; newVal: string }[] = [];

    if (form.legal_name !== org.legal_name) {
      changes.push({ field: 'Company Legal Name', oldVal: org.legal_name, newVal: form.legal_name });
    }
    if (form.display_name !== (org.display_name || org.legal_name)) {
      changes.push({ field: 'Display Name', oldVal: org.display_name || '', newVal: form.display_name });
    }
    if (form.domain !== org.domain) {
      changes.push({ field: 'Primary Domain', oldVal: org.domain, newVal: form.domain });
    }
    if (form.industry !== org.industry) {
      changes.push({ field: 'Industry', oldVal: org.industry, newVal: form.industry });
    }
    if (form.city !== org.city) {
      changes.push({ field: 'City', oldVal: org.city, newVal: form.city });
    }
    if (form.gstin !== (org.gstin || '')) {
      changes.push({ field: 'GSTIN', oldVal: org.gstin || 'None', newVal: form.gstin || 'None' });
    }
    if (form.pan !== (org.pan || '')) {
      changes.push({ field: 'PAN', oldVal: org.pan || 'None', newVal: form.pan || 'None' });
    }
    if (form.primary_admin_name !== org.primary_admin_name) {
      changes.push({ field: 'Primary Contact Name', oldVal: org.primary_admin_name, newVal: form.primary_admin_name });
    }
    if (form.primary_admin_email !== org.primary_admin_email) {
      changes.push({ field: 'Primary Contact Email', oldVal: org.primary_admin_email, newVal: form.primary_admin_email });
    }

    return changes;
  }, [form, org]);

  const hasChanges = diffs.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    const summary = `Updated ${diffs.length} field(s): ${diffs.map((d) => `${d.field} (${d.oldVal} → ${d.newVal})`).join(', ')}`;
    try {
      await onSave(
        {
          legal_name: form.legal_name,
          display_name: form.display_name,
          domain: form.domain,
          industry: form.industry,
          city: form.city,
          gstin: form.gstin || undefined,
          pan: form.pan || undefined,
          cin: form.cin || undefined,
          primary_admin_name: form.primary_admin_name,
          primary_admin_email: form.primary_admin_email,
          primary_admin_phone: form.primary_admin_phone,
        },
        summary
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Edit Customer Organization</h3>
            <p className="text-xs text-gray-500 mt-0.5">Update business, location, and administrative contact information.</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="edit-org-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 text-xs pr-1">
          {/* SECTION A: Business Information */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">A. Business Information</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={form.legal_name}
                  onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs focus:ring-2 focus:ring-[#047857]"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Display Brand Name</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Primary Domain *</label>
                <input
                  type="text"
                  required
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Industry Vertical</label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION B: Location & Regional Settings */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">B. Location & Regional Settings</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  disabled
                  value={form.country}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-100 text-gray-500 text-xs cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* SECTION C: Primary Contact & Owner */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">C. Administrative Contact</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.primary_admin_name}
                  onChange={(e) => setForm({ ...form, primary_admin_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={form.primary_admin_email}
                  onChange={(e) => setForm({ ...form, primary_admin_email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION D: Tax & Legal Identifiers */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">D. Tax & Legal Identifiers (Optional)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  placeholder="33AAACA0000F1Z0"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">PAN</label>
                <input
                  type="text"
                  placeholder="AAACA0000F"
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer with Diff Summary */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs font-semibold">
            {hasChanges ? (
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                ● You modified {diffs.length} field(s)
              </span>
            ) : (
              <span className="text-gray-400">No modifications made</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="edit-org-form"
              disabled={!hasChanges || isSaving}
              className="bg-[#047857] hover:bg-[#036246] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
