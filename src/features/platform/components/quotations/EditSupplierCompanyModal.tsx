// src/features/platform/components/quotations/EditSupplierCompanyModal.tsx
// ============================================================================
// Joy PeopleHR — Customize SaaS Brand, Legal Entity, GST, Address & Bank Details
// Authoritative company setup modal affecting all Quotations, Proposals & Invoices
// ============================================================================

import React, { useState } from 'react';
import {
  Building2,
  Receipt,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  UserCheck,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import {
  saasCommercialService,
  SupplierCompanyDetails,
} from '../../../../services/platform/saasCommercialService';

interface EditSupplierCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updated: SupplierCompanyDetails) => void;
}

export const EditSupplierCompanyModal: React.FC<EditSupplierCompanyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const current = saasCommercialService.getSupplierDetails();

  const [form, setForm] = useState<SupplierCompanyDetails>({
    ...current,
    bankDetails: { ...current.bankDetails },
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field: keyof SupplierCompanyDetails, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBankChange = (field: keyof SupplierCompanyDetails['bankDetails'], value: string) => {
    setForm((prev) => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saasCommercialService.updateSupplierDetails(form);
    setSavedSuccess(true);
    if (onSaved) onSaved(updated);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Customize SaaS Company, GST & Contact Details</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Quotation & PDF Header
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                These credentials will appear on all generated Proposal PDFs, Quotations, and Tax Invoices.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-bold">
                Company credentials saved successfully! All generated quotation PDFs and proposals are now updated.
              </span>
            </div>
          )}

          {/* Section 1: Brand & Legal Identity */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              1. Brand & Legal Entity Identity
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  SaaS Brand Name (Appears in Header & Top Badges)
                </label>
                <input
                  type="text"
                  required
                  value={form.tradeName}
                  onChange={(e) => handleChange('tradeName', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                  placeholder="e.g. Joy PeopleHR"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Brand Tagline
                </label>
                <input
                  type="text"
                  value={form.tagline || ''}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                  placeholder="e.g. Enterprise Workforce Cloud"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Company Legal Entity Name ("Belongs To" & Contract Signatory)
                </label>
                <input
                  type="text"
                  required
                  value={form.legalName}
                  onChange={(e) => handleChange('legalName', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-bold"
                  placeholder="e.g. JOY CORPORATE SOLUTIONS PRIVATE LIMITED"
                />
                <span className="text-[10.5px] text-slate-500 mt-1 block">
                  This exact legal name will be printed on Page 1 cover footer, commercial terms, and bilateral signature blocks.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Tax & Statutory Registration */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              2. GSTIN & Tax Identification
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  15-Digit GSTIN Number
                </label>
                <input
                  type="text"
                  required
                  value={form.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono font-bold"
                  placeholder="33AABCJ1928K1Z5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Company PAN Number
                </label>
                <input
                  type="text"
                  required
                  value={form.pan}
                  onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono font-medium"
                  placeholder="AABCJ1928K"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  State & State Code (Place of Supply)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={form.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                    placeholder="Tamil Nadu"
                  />
                  <input
                    type="text"
                    required
                    value={form.stateCode}
                    onChange={(e) => handleChange('stateCode', e.target.value)}
                    className="px-2 py-2 rounded-lg border border-slate-300 text-center font-mono text-slate-900 font-bold"
                    placeholder="33"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Registered Office Address & Contact */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <MapPin className="h-4 w-4 text-red-600" />
              3. Registered Address, Phone & Official Billing Email
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Registered Office Address (Printed on Quotation & Invoice Header)
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                  placeholder="e.g. Level 6, Joy Tech Park, OMR IT Highway, Chennai, Tamil Nadu 600096, India"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Official Billing Email
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                    placeholder="billing@joypeoplehr.com"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Official Contact Phone / Landline
                  </label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                    placeholder="+91 (044) 6912-8800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={form.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                    placeholder="https://joypeoplehr.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Authorized Proposal Signatory */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <UserCheck className="h-4 w-4 text-purple-600" />
              4. Authorized Proposal Signatory
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Signatory Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.signatoryName || ''}
                  onChange={(e) => handleChange('signatoryName', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-bold"
                  placeholder="e.g. Authorized Signatory / Managing Director"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Signatory Corporate Designation
                </label>
                <input
                  type="text"
                  required
                  value={form.signatoryDesignation || ''}
                  onChange={(e) => handleChange('signatoryDesignation', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                  placeholder="e.g. Commercial Lead & Enterprise Solutions"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Official Bank Details (Payment Remittance) */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              5. Bank Remittance Details (Printed on Invoices & Proposal Terms)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Account Beneficiary Name
                </label>
                <input
                  type="text"
                  required
                  value={form.bankDetails.accountName}
                  onChange={(e) => handleBankChange('accountName', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                  placeholder="JOY CORPORATE SOLUTIONS PRIVATE LIMITED"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  value={form.bankDetails.bankName}
                  onChange={(e) => handleBankChange('bankName', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                  placeholder="HDFC Bank Ltd"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  value={form.bankDetails.accountNumber}
                  onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono font-bold"
                  placeholder="50200088921822"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  required
                  value={form.bankDetails.ifsc}
                  onChange={(e) => handleBankChange('ifsc', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono font-bold"
                  placeholder="HDFC0000128"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={form.bankDetails.branch}
                  onChange={(e) => handleBankChange('branch', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                  placeholder="e.g. OMR Sholinganallur Branch, Chennai"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official UPI ID / VPA
                </label>
                <input
                  type="text"
                  value={form.bankDetails.upiId}
                  onChange={(e) => handleBankChange('upiId', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono font-medium"
                  placeholder="joypeoplehr@hdfcbank"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Changes persist instantly across all client quotations and proposal PDFs.
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#047857] hover:bg-[#036246] text-white font-bold text-xs px-5 shadow-sm flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save Company Credentials</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
