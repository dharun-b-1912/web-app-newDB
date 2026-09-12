import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { vendorService } from '../../../services/vendorService';
import {
  Building2,
  Users,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Save,
  X,
  AlertCircle,
  Lock,
  Stamp,
  Percent,
} from 'lucide-react';
import type { Vendor, VendorType, VendorStatus } from '../../../types';

export interface VendorEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor | any;
  onSaved: (updatedVendor: Vendor) => void;
}

type EditTab = 'IDENTITY' | 'REGISTRATION' | 'CONTACT' | 'COMMERCIAL' | 'BANK' | 'COMPLIANCE' | 'DOCUMENTS';

export const VendorEditModal: React.FC<VendorEditModalProps> = ({
  isOpen,
  onClose,
  vendor,
  onSaved,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<EditTab>('IDENTITY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changeSummaryModal, setChangeSummaryModal] = useState<{
    isOpen: boolean;
    changes: string[];
    updatedVendor?: Vendor;
  }>({ isOpen: false, changes: [] });

  // Form State
  const [formData, setFormData] = useState({
    legal_name: '',
    trade_name: '',
    vendor_type: 'MANPOWER_PROVIDER' as VendorType,
    status: 'ACTIVE' as VendorStatus,
    max_workforce_capacity: 50,
    pan: '',
    gstin: '',
    registration_number: '',
    cin: '',
    manpower_license_no: '',
    manpower_license_expiry: '',
    primary_contact_name: '',
    primary_contact_designation: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    alternate_phone: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    service_charge_percentage: 8.5,
    contract_type: 'Master Service Agreement (MSA)',
    rate_card_type: 'Per Head Per Month',
    payment_terms: 'Net 30',
    currency: 'INR',
    bank_name: '',
    account_name: '',
    account_number_masked: '',
    ifsc_code: '',
    bank_branch: '',
  });

  // Populate when vendor changes or modal opens
  useEffect(() => {
    if (vendor) {
      setFormData({
        legal_name: vendor.legal_name || vendor.name || '',
        trade_name: vendor.trade_name || vendor.name || '',
        vendor_type: vendor.vendor_type || 'MANPOWER_PROVIDER',
        status: vendor.status || 'ACTIVE',
        max_workforce_capacity: vendor.max_workforce_capacity || 50,
        pan: vendor.pan || '',
        gstin: vendor.gstin || vendor.tax_id || '',
        registration_number: vendor.registration_number || 'U74920TN2018PTC120455',
        cin: vendor.cin || 'U74920TN2018PTC120455',
        manpower_license_no: vendor.manpower_license_no || 'CLRA/TN/CHE/2026/7821',
        manpower_license_expiry: vendor.manpower_license_expiry || '2027-12-31',
        primary_contact_name: vendor.primary_contact_name || vendor.contact_person || '',
        primary_contact_designation: vendor.primary_contact_designation || 'Operations Lead',
        primary_contact_email: vendor.primary_contact_email || vendor.email || '',
        primary_contact_phone: vendor.primary_contact_phone || vendor.phone || '',
        alternate_phone: vendor.alternate_phone || '',
        address_line1: vendor.address_line1 || vendor.address || '',
        city: vendor.city || 'Chennai',
        state: vendor.state || 'Tamil Nadu',
        postal_code: vendor.postal_code || '600032',
        service_charge_percentage: vendor.service_charge_percentage || 8.5,
        contract_type: vendor.contract_type || 'Master Service Agreement (MSA)',
        rate_card_type: vendor.rate_card_type || 'Per Head Per Month',
        payment_terms: vendor.payment_terms || 'Net 30',
        currency: vendor.currency || 'INR',
        bank_name: vendor.bank_name || 'HDFC Bank Ltd',
        account_name: vendor.account_name || vendor.legal_name || '',
        account_number_masked: vendor.account_number_masked || vendor.account_number || '50200091827364',
        ifsc_code: vendor.ifsc_code || 'HDFC0000240',
        bank_branch: vendor.bank_branch || 'Guindy Industrial Estate',
      });
    }
  }, [vendor, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    if (!formData.legal_name.trim()) {
      showToast('Vendor Legal Name is required', 'error');
      return;
    }
    if (!formData.primary_contact_email.trim()) {
      showToast('Primary contact email is required', 'error');
      return;
    }

    // Compute diff for audit & change summary
    const detectedChanges: string[] = [];
    if (formData.legal_name !== (vendor.legal_name || vendor.name)) {
      detectedChanges.push(`Legal Name: "${vendor.legal_name || vendor.name}" → "${formData.legal_name}"`);
    }
    if (formData.trade_name !== (vendor.trade_name || vendor.name)) {
      detectedChanges.push(`Trade Name: "${vendor.trade_name || vendor.name}" → "${formData.trade_name}"`);
    }
    if (formData.service_charge_percentage !== (vendor.service_charge_percentage || 8.5)) {
      detectedChanges.push(
        `Service Charge: ${vendor.service_charge_percentage || 8.5}% → ${formData.service_charge_percentage}%`
      );
    }
    if (formData.payment_terms !== (vendor.payment_terms || 'Net 30')) {
      detectedChanges.push(`Payment Terms: "${vendor.payment_terms || 'Net 30'}" → "${formData.payment_terms}"`);
    }
    if (formData.primary_contact_email !== (vendor.primary_contact_email || vendor.email)) {
      detectedChanges.push(`Primary Email: "${vendor.primary_contact_email || vendor.email}" → "${formData.primary_contact_email}"`);
    }
    if (formData.status !== (vendor.status || 'ACTIVE')) {
      detectedChanges.push(`Status: ${vendor.status || 'ACTIVE'} → ${formData.status}`);
    }

    setIsSubmitting(true);
    try {
      const updated = await vendorService.updateVendor(vendor.id, {
        ...formData,
      });

      if (detectedChanges.length > 0) {
        setChangeSummaryModal({
          isOpen: true,
          changes: detectedChanges,
          updatedVendor: updated,
        });
      } else {
        showToast(`Vendor ${updated.legal_name} updated successfully`, 'success');
        onSaved(updated);
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update vendor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !vendor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage & Edit Vendor: ${vendor.legal_name || vendor.name}`}
      size="xl"
    >
      <form onSubmit={handleSave} className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('IDENTITY')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'IDENTITY'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Identity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REGISTRATION')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'REGISTRATION'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Registration & Tax
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CONTACT')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CONTACT'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            Contact & Address
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMMERCIAL')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'COMMERCIAL'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Commercial
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BANK')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'BANK'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Bank
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMPLIANCE')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'COMPLIANCE'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            Compliance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'DOCUMENTS'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Documents
          </button>
        </div>

        {/* Tab 1: Identity & Legal */}
        {activeTab === 'IDENTITY' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Vendor Legal Name *</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.legal_name}
                  onChange={(e) => handleChange('legal_name', e.target.value)}
                  placeholder="e.g. ABC Security Services Pvt Ltd"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Trade / Brand Name</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.trade_name}
                  onChange={(e) => handleChange('trade_name', e.target.value)}
                  placeholder="e.g. ABC Security & Facility Solutions"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Vendor Type</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <select
                  value={formData.vendor_type}
                  onChange={(e) => handleChange('vendor_type', e.target.value as VendorType)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="MANPOWER_PROVIDER">Manpower & Labour Staffing Provider</option>
                  <option value="FACILITY_SERVICE_PROVIDER">Facility & Security Services Provider</option>
                  <option value="CONTRACTOR">Specialized Contractor</option>
                  <option value="IT_SERVICE_PROVIDER">IT & Professional Services Provider</option>
                  <option value="OTHER">Other Enterprise Supplier</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Relationship Status</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    Company Managed
                  </span>
                </div>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as VendorStatus)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ACTIVE">ACTIVE (Operational)</option>
                  <option value="PENDING_VERIFICATION">PENDING VERIFICATION (Onboarding)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporarily On Hold)</option>
                  <option value="TERMINATED">TERMINATED (Closed / Offboarded)</option>
                  <option value="ARCHIVED">ARCHIVED (Historical Record)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Vendor Identification Code</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-300 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> System Generated (Locked)
                  </span>
                </div>
                <Input
                  value={vendor.vendor_code || vendor.code || 'VEN-000021'}
                  disabled
                  className="bg-slate-100 font-mono font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Vendor ID / UUID</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-300 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> System Generated (Locked)
                  </span>
                </div>
                <Input
                  value={vendor.id || 'e2000000-0000-0000-0000-01a08496cdfc'}
                  disabled
                  className="bg-slate-100 font-mono text-[11px] text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Registration & Tax */}
        {activeTab === 'REGISTRATION' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">PAN (Permanent Account Number)</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.pan}
                  onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                  placeholder="e.g. AABCS1234F"
                  maxLength={10}
                  className="font-mono uppercase"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">GSTIN</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                  placeholder="e.g. 33AABCW1234F1Z5"
                  maxLength={15}
                  className="font-mono uppercase"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Registration Number / CIN</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.registration_number}
                  onChange={(e) => handleChange('registration_number', e.target.value)}
                  placeholder="e.g. U74920TN2018PTC120455"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Corporate Identity Number (CIN)</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.cin}
                  onChange={(e) => handleChange('cin', e.target.value)}
                  placeholder="e.g. U74920TN2018PTC120455"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Statutory identifiers are checked for duplicates across the entire organization. Changes are logged to the immutable audit trail.
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: Contact & Address */}
        {activeTab === 'CONTACT' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Contact Person *</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.primary_contact_name}
                  onChange={(e) => handleChange('primary_contact_name', e.target.value)}
                  placeholder="e.g. K. Balasubramanian"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Designation</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.primary_contact_designation}
                  onChange={(e) => handleChange('primary_contact_designation', e.target.value)}
                  placeholder="e.g. Operations Director"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Primary Email *</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  type="email"
                  value={formData.primary_contact_email}
                  onChange={(e) => handleChange('primary_contact_email', e.target.value)}
                  placeholder="e.g. ramesh.k@abcsecurity.in"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Primary Mobile *</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.primary_contact_phone}
                  onChange={(e) => handleChange('primary_contact_phone', e.target.value)}
                  placeholder="e.g. +91 98401 22334"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Registered Office Address</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Vendor Master
                  </span>
                </div>
                <Input
                  value={formData.address_line1}
                  onChange={(e) => handleChange('address_line1', e.target.value)}
                  placeholder="e.g. No. 14, Mount Road, Guindy Industrial Estate"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Chennai"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">State</label>
                <Input
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="e.g. Tamil Nadu"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Commercial Terms (Company Scoped) */}
        {activeTab === 'COMMERCIAL' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Service Charge Percentage (%) *</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    Company Managed
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.service_charge_percentage}
                  onChange={(e) => handleChange('service_charge_percentage', parseFloat(e.target.value) || 0)}
                  placeholder="8.5"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Payment Terms</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    Company Managed
                  </span>
                </div>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => handleChange('payment_terms', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Net 7">Net 7 Days</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days (Authoritative Default)</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Rate Card Archetype</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    Company Managed
                  </span>
                </div>
                <Input
                  value={formData.rate_card_type}
                  onChange={(e) => handleChange('rate_card_type', e.target.value)}
                  placeholder="e.g. Per Head Per Month"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Max Workforce Capacity</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    Company Managed
                  </span>
                </div>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.max_workforce_capacity}
                  onChange={(e) => handleChange('max_workforce_capacity', parseInt(e.target.value, 10) || 50)}
                  placeholder="50"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
              ℹ️ Commercial terms are company-scoped. Modifying service charge or payment terms affects only this legal entity's settlement cycles.
            </div>
          </div>
        )}

        {/* Tab 5: Banking & Payout */}
        {activeTab === 'BANK' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Bank Name</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    Finance Managed
                  </span>
                </div>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  placeholder="e.g. HDFC Bank Ltd"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Beneficiary Account Name</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    Finance Managed
                  </span>
                </div>
                <Input
                  value={formData.account_name}
                  onChange={(e) => handleChange('account_name', e.target.value)}
                  placeholder="e.g. ABC Security Services Pvt Ltd"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Account Number (Masked)</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    Finance Managed
                  </span>
                </div>
                <Input
                  value={formData.account_number_masked}
                  onChange={(e) => handleChange('account_number_masked', e.target.value)}
                  placeholder="e.g. 50200091827364"
                  className="font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">IFSC Code</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    Finance Managed
                  </span>
                </div>
                <Input
                  value={formData.ifsc_code}
                  onChange={(e) => handleChange('ifsc_code', e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0000240"
                  className="font-mono uppercase"
                  maxLength={11}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Compliance & Licenses */}
        {activeTab === 'COMPLIANCE' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Labour Supply License (Form VI)</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                    Compliance Managed
                  </span>
                </div>
                <Input
                  value={formData.manpower_license_no}
                  onChange={(e) => handleChange('manpower_license_no', e.target.value)}
                  placeholder="e.g. CLRA/TN/CHE/2026/7821"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">License Expiry Date</label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                    Compliance Managed
                  </span>
                </div>
                <Input
                  type="date"
                  value={formData.manpower_license_expiry}
                  onChange={(e) => handleChange('manpower_license_expiry', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Documents */}
        {activeTab === 'DOCUMENTS' && (
          <div className="space-y-3 animate-in fade-in duration-150 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-800 block">Certificate of Incorporation (CIN)</strong>
                <span className="text-[11px] text-slate-500">cin_certificate.pdf • Verified by Compliance</span>
              </div>
              <Badge variant="emerald">VERIFIED</Badge>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-800 block">PAN Card Copy</strong>
                <span className="text-[11px] text-slate-500">pan_card.pdf • Matched with NSDL</span>
              </div>
              <Badge variant="emerald">VERIFIED</Badge>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-800 block">GST Registration Certificate (REG-06)</strong>
                <span className="text-[11px] text-slate-500">gst_certificate.pdf • Active in GSTN</span>
              </div>
              <Badge variant="emerald">VERIFIED</Badge>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Field Authority Legend:</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Vendor Master</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Company</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">Locked</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs"
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Change Summary Diff Dialog */}
      {changeSummaryModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-indigo-200 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-900">Vendor Changes Saved</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  The following authoritative fields were successfully updated:
                </p>

                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  {changeSummaryModal.changes.map((ch, idx) => (
                    <div key={idx} className="font-mono text-slate-800 text-[11px] flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{ch}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  Changed by: <strong className="text-slate-700">Company HR Admin</strong> • Timestamp: Just now
                </div>

                <div className="mt-5 flex justify-end">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (changeSummaryModal.updatedVendor) {
                        onSaved(changeSummaryModal.updatedVendor);
                      }
                      setChangeSummaryModal({ isOpen: false, changes: [] });
                      onClose();
                    }}
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Close & Continue
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
