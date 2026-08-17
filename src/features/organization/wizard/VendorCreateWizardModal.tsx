import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import {
  Vendor,
  VendorType,
  VendorStatus,
  VendorContract,
  VendorDocument,
} from '../../../types';
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
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Save,
  Clock,
  ExternalLink,
} from 'lucide-react';

const DRAFT_STORAGE_KEY = 'workforce_vendor_creation_draft';

export interface VendorCreateWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (vendor: Vendor) => void;
}

const WIZARD_STEPS = [
  { step: 1, title: 'Identity', desc: 'Legal details & type' },
  { step: 2, title: 'Contact', desc: 'Contact person & address' },
  { step: 3, title: 'Compliance', desc: 'Registration & licenses' },
  { step: 4, title: 'Agreement', desc: 'Service contract & terms' },
  { step: 5, title: 'Payment', desc: 'Bank & payout mandate' },
  { step: 6, title: 'Documents', desc: 'Licenses & proofs' },
  { step: 7, title: 'Review', desc: 'Verification & activation' },
];

export const VendorCreateWizardModal: React.FC<VendorCreateWizardModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Identity
    legal_name: '',
    trade_name: '',
    vendor_type: 'MANPOWER_PROVIDER' as VendorType,
    status: 'PENDING_VERIFICATION' as VendorStatus,
    logo_url: '',
    vendor_code_preview: 'VEN-000003',

    // Step 2: Contact & Address
    primary_contact_name: '',
    primary_contact_designation: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    alternate_phone: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    postal_code: '641001',
    country: 'India',

    // Step 3: Legal & Compliance
    registration_number: '',
    tax_id: '',
    pan: '',
    gstin: '',
    manpower_license_no: '',
    manpower_license_expiry: '',
    max_workforce_capacity: 100,
    authorized_workforce_categories: ['Contract Labour', 'Facility Operations', 'Technical Support'],

    // Step 4: Agreement
    contract_number: 'MSA-2026-VND-01',
    contract_type: 'Master Service Agreement (MSA)',
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    renewal_date: '',
    notice_period_days: 30,
    payment_terms: 'Net 30',
    currency: 'INR',

    // Step 5: Payment
    bank_name: 'HDFC Bank Ltd',
    account_name: '',
    account_number: '',
    ifsc_code: 'HDFC0001234',
    swift_code: '',
    bank_branch: 'Main Branch',
    payment_method: 'Bank Transfer',

    // Step 6: Documents
    attached_documents: [
      { type: 'Agreement', name: 'Master_Service_Agreement.pdf', status: 'VERIFIED' },
      { type: 'GST Certificate', name: 'GST_Certificate.pdf', status: 'VERIFIED' },
    ],

    notes: '',
  });

  // Restore Draft on Open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.legal_name) {
          setFormData((prev) => ({ ...prev, ...parsed }));
          showToast('Resumed previously saved vendor draft', 'info');
        }
      }
    } catch (_) {}
  }, [isOpen]);

  const updateFormData = (fields: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      showToast('Vendor draft saved successfully!', 'success');
    } catch (_) {}
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.legal_name.trim()) {
        showToast('Please enter the Vendor Legal Name', 'error');
        return false;
      }
    } else if (step === 2) {
      if (!formData.primary_contact_name.trim()) {
        showToast('Please enter the Primary Contact Person', 'error');
        return false;
      }
      if (!formData.primary_contact_email.trim() || !formData.primary_contact_email.includes('@')) {
        showToast('Please enter a valid primary contact email', 'error');
        return false;
      }
      if (!formData.primary_contact_phone.trim()) {
        showToast('Please enter the primary contact phone number', 'error');
        return false;
      }
    } else if (step === 3) {
      if (formData.vendor_type === 'MANPOWER_PROVIDER' && !formData.manpower_license_no.trim()) {
        showToast('Manpower Providers require a Labour Supply License number', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = async (activateImmediately: boolean) => {
    setIsSubmitting(true);
    try {
      const maskedAcct = formData.account_number
        ? `•••• •••• ${formData.account_number.slice(-4)}`
        : '•••• •••• 1234';

      const payload: Partial<Vendor> = {
        legal_name: formData.legal_name,
        trade_name: formData.trade_name || formData.legal_name,
        vendor_type: formData.vendor_type,
        status: activateImmediately ? 'ACTIVE' : formData.status,
        registration_number: formData.registration_number,
        tax_id: formData.tax_id || formData.gstin || formData.pan,
        pan: formData.pan,
        gstin: formData.gstin,
        primary_contact_name: formData.primary_contact_name,
        primary_contact_designation: formData.primary_contact_designation,
        primary_contact_email: formData.primary_contact_email,
        primary_contact_phone: formData.primary_contact_phone,
        alternate_phone: formData.alternate_phone,
        website: formData.website,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        manpower_license_no: formData.manpower_license_no,
        manpower_license_expiry: formData.manpower_license_expiry,
        max_workforce_capacity: formData.max_workforce_capacity,
        authorized_workforce_categories: formData.authorized_workforce_categories,
        contract_start_date: formData.contract_start_date,
        contract_end_date: formData.contract_end_date,
        payment_terms: formData.payment_terms,
        currency: formData.currency,
        payment_method: formData.payment_method,
        bank_name: formData.bank_name,
        account_name: formData.account_name || formData.legal_name,
        account_number_masked: maskedAcct,
        ifsc_code: formData.ifsc_code,
        swift_code: formData.swift_code,
        bank_branch: formData.bank_branch,
        notes: formData.notes,
      };

      const created = await vendorService.createVendor(payload);

      // Create primary contract
      await vendorService.createContract({
        vendor_id: created.id,
        contract_number: formData.contract_number,
        contract_type: formData.contract_type,
        start_date: formData.contract_start_date,
        end_date: formData.contract_end_date,
        notice_period_days: formData.notice_period_days,
        payment_terms: formData.payment_terms,
        currency: formData.currency,
        status: 'ACTIVE',
      });

      // Clear draft
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      showToast(`Vendor ${created.legal_name} created successfully!`, 'success');
      onCreated(created);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create vendor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isManpower = formData.vendor_type === 'MANPOWER_PROVIDER';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register Vendor / Manpower Provider" size="xl">
      <div className="space-y-6">
        {/* Wizard Progress Bar */}
        <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1">
            {WIZARD_STEPS.map((s) => {
              const isCurrent = s.step === currentStep;
              const isPast = s.step < currentStep;
              return (
                <div
                  key={s.step}
                  onClick={() => s.step < currentStep && setCurrentStep(s.step)}
                  className={`flex items-center gap-2 cursor-pointer shrink-0 ${
                    isCurrent ? 'opacity-100' : isPast ? 'opacity-80 hover:opacity-100' : 'opacity-40'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      isCurrent
                        ? 'bg-[#07563D] text-white shadow-xs'
                        : isPast
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> : s.step}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-gray-900 leading-tight">{s.title}</p>
                    <p className="text-[10px] text-gray-400">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Identity */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">Vendor Identity & Classification</h3>
              <p className="text-xs text-gray-500">Enter the legal trade name, entity type, and operating status.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Legal Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Workforce Solutions Pvt Ltd"
                  value={formData.legal_name}
                  onChange={(e) => updateFormData({ legal_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Trade / DBA Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABC Workforce"
                  value={formData.trade_name}
                  onChange={(e) => updateFormData({ trade_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Vendor Classification Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.vendor_type}
                  onChange={(e) => updateFormData({ vendor_type: e.target.value as VendorType })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold text-emerald-950"
                >
                  <option value="MANPOWER_PROVIDER">Manpower Provider / Labour Supply</option>
                  <option value="RECRUITMENT_AGENCY">Recruitment & Contingent Placement</option>
                  <option value="CONTRACTOR">Independent Contractor / Agency</option>
                  <option value="IT_SERVICE_PROVIDER">IT & Tech Support Vendor</option>
                  <option value="FACILITY_SERVICE_PROVIDER">Facilities & Security Agency</option>
                  <option value="CONSULTING">Professional Consulting Firm</option>
                  <option value="OTHER">Other Supplier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => updateFormData({ status: e.target.value as VendorStatus })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-semibold"
                >
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact & Address */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">Primary Contact & Registered Address</h3>
              <p className="text-xs text-gray-500">Provide official communication coordinates and key liaison.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Primary Contact Person <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandran"
                  value={formData.primary_contact_name}
                  onChange={(e) => updateFormData({ primary_contact_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Contact Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operations Director"
                  value={formData.primary_contact_designation}
                  onChange={(e) => updateFormData({ primary_contact_designation: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Official Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="contracts@vendor.in"
                  value={formData.primary_contact_email}
                  onChange={(e) => updateFormData({ primary_contact_email: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98400 11223"
                  value={formData.primary_contact_phone}
                  onChange={(e) => updateFormData({ primary_contact_phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Alternate Phone / Landline
                </label>
                <input
                  type="text"
                  placeholder="+91 44 2233 4455"
                  value={formData.alternate_phone}
                  onChange={(e) => updateFormData({ alternate_phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Corporate Website
                </label>
                <input
                  type="text"
                  placeholder="https://vendor.in"
                  value={formData.website}
                  onChange={(e) => updateFormData({ website: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>
            </div>

            {/* Address */}
            <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  placeholder="45 Anna Salai, Industrial Estate"
                  value={formData.address_line1}
                  onChange={(e) => updateFormData({ address_line1: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateFormData({ city: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">State / Province</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => updateFormData({ state: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => updateFormData({ postal_code: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => updateFormData({ country: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Legal & Compliance */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">Legal Registration & Statutory Compliance</h3>
              <p className="text-xs text-gray-500">Provide legal entity registration numbers and statutory tax identifiers.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Registration / CIN</label>
                <input
                  type="text"
                  placeholder="U74999TN2020PTC134567"
                  value={formData.registration_number}
                  onChange={(e) => updateFormData({ registration_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  placeholder="33AABCW1234F1Z5"
                  value={formData.gstin}
                  onChange={(e) => updateFormData({ gstin: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  placeholder="AABCW1234F"
                  value={formData.pan}
                  onChange={(e) => updateFormData({ pan: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Manpower Specific Controls */}
            {isManpower && (
              <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-800" />
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                    Manpower Supply License & Capacity
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Labour Supply License No <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ML-TN-CHN-2022-8901"
                      value={formData.manpower_license_no}
                      onChange={(e) => updateFormData({ manpower_license_no: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      License Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.manpower_license_expiry}
                      onChange={(e) => updateFormData({ manpower_license_expiry: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Max Deployed Workforce Capacity
                    </label>
                    <input
                      type="number"
                      value={formData.max_workforce_capacity}
                      onChange={(e) => updateFormData({ max_workforce_capacity: parseInt(e.target.value, 10) || 50 })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Agreement */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">Service Agreement & Contract Terms</h3>
              <p className="text-xs text-gray-500">Define the contractual term, notice period, and billing cadence.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contract / MSA Reference</label>
                <input
                  type="text"
                  value={formData.contract_number}
                  onChange={(e) => updateFormData({ contract_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contract Type</label>
                <select
                  value={formData.contract_type}
                  onChange={(e) => updateFormData({ contract_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
                >
                  <option value="Master Service Agreement (MSA)">Master Service Agreement (MSA)</option>
                  <option value="Contingent Staffing Agreement">Contingent Staffing Agreement</option>
                  <option value="Statement of Work (SOW)">Statement of Work (SOW)</option>
                  <option value="Fixed Retainer Contract">Fixed Retainer Contract</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => updateFormData({ contract_start_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => updateFormData({ contract_end_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Payment Terms</label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => updateFormData({ payment_terms: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                >
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notice Period (Days)</label>
                <input
                  type="number"
                  value={formData.notice_period_days}
                  onChange={(e) => updateFormData({ notice_period_days: parseInt(e.target.value, 10) || 30 })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Payment */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">Bank Disbursement Account</h3>
              <p className="text-xs text-gray-500">Provide official payout bank details. Account numbers will be masked in list views.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="ICICI Bank Ltd"
                  value={formData.bank_name}
                  onChange={(e) => updateFormData({ bank_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  placeholder="ABC Workforce Solutions Pvt Ltd"
                  value={formData.account_name}
                  onChange={(e) => updateFormData({ account_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bank Account Number</label>
                <input
                  type="password"
                  placeholder="Enter full account number"
                  value={formData.account_number}
                  onChange={(e) => updateFormData({ account_number: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="ICIC0001234"
                  value={formData.ifsc_code}
                  onChange={(e) => updateFormData({ ifsc_code: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bank Branch</label>
                <input
                  type="text"
                  placeholder="Guindy Branch, Chennai"
                  value={formData.bank_branch}
                  onChange={(e) => updateFormData({ bank_branch: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Disbursement Currency</label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => updateFormData({ currency: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:border-[#07563D] focus:ring-1 focus:ring-[#07563D] focus:outline-none font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Documents */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">Compliance Documents & Verification</h3>
              <p className="text-xs text-gray-500">Ensure statutory proofs and executed agreements are attached.</p>
            </div>

            <div className="space-y-2">
              {formData.attached_documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#07563D]" />
                    <div>
                      <p className="font-bold text-gray-900">{doc.type}</p>
                      <p className="text-[11px] text-gray-400">{doc.name}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Review & Activate */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900">Review & Confirm Registration</h3>
              <p className="text-xs text-gray-500">Verify all information before officially registering this external vendor.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h4 className="text-base font-black text-gray-900">{formData.legal_name}</h4>
                  <p className="text-gray-500">{formData.vendor_type} · {formData.city}, {formData.state}</p>
                </div>
                <Badge variant="emerald">{formData.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-gray-700">
                <div>
                  <span className="text-gray-400 block text-[11px]">Primary Contact:</span>
                  <span className="font-bold">{formData.primary_contact_name} ({formData.primary_contact_phone})</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Contract Reference:</span>
                  <span className="font-mono font-bold">{formData.contract_number}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Contract Term:</span>
                  <span>{formData.contract_start_date} to {formData.contract_end_date}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Payout Account:</span>
                  <span className="font-bold">{formData.bank_name} · {formData.ifsc_code}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            leftIcon={<Save className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Save Draft
          </Button>

          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Back
              </Button>
            )}

            {currentStep < 7 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit(true)}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                {isSubmitting ? 'Registering...' : 'Register & Activate Vendor'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
