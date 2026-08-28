// src/features/platform/components/billing/CreateInvoiceMultiStepModal.tsx
// ============================================================
// Joy PeopleHR — Multi-Step Tax Invoice Creation Wizard
// ============================================================

import React, { useState } from 'react';
import {
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Layers,
} from 'lucide-react';
import { platformTenantService, OrganizationRecord } from '../../../../services/platform/platformTenantService';
import { platformBillingService, DetailedInvoice } from '../../../../services/platform/platformBillingService';
import { billingCalculationEngine } from '../../../../services/billing/billingCalculationEngine';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import { cn } from '../../../../lib/utils';

export interface CreateInvoiceMultiStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (invoice: DetailedInvoice) => void;
}

export const CreateInvoiceMultiStepModal: React.FC<CreateInvoiceMultiStepModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Available Organizations
  const organizations = platformTenantService.getOrganizations().items;

  // Selected Customer Form State
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || 'org-joy-corp');
  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) || organizations[0];

  // Invoice Header State
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('Thank you for choosing Joy PeopleHR Enterprise.');

  // Line Items State
  const [lineItems, setLineItems] = useState([
    {
      description: `${selectedOrg?.plan || 'Professional'} Plan Subscription (${selectedOrg?.seat_limit || 100} Seats)`,
      sacHsn: '998313',
      qty: 1,
      unitPrice: selectedOrg?.mrr || 45000,
      discountAmount: 0,
    },
  ]);

  // Tax Settings State (Supplier TN '33')
  const [customerStateCode, setCustomerStateCode] = useState<string>('33');
  const [customerStateName, setCustomerStateName] = useState<string>('Tamil Nadu');

  // Computed Totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice - (item.discountAmount || 0)), 0);
  const taxResult = billingCalculationEngine.calculateTaxes(subtotal, {
    supplierStateCode: '33',
    supplierStateName: 'Tamil Nadu',
    customerStateCode,
    customerStateName,
    gstRatePct: 18,
  });

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: 'Additional SaaS Service / Add-on',
        sacHsn: '998313',
        qty: 1,
        unitPrice: 5000,
        discountAmount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleCreateInvoice = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    try {
      const invoice = await platformBillingService.createInvoice({
        tenantId: selectedOrg.id,
        tenantName: selectedOrg.legal_name,
        planTier: selectedOrg.plan,
        billingAddress: `${selectedOrg.city}, ${selectedOrg.state}, ${selectedOrg.country}`,
        customerGstin: selectedOrg.gstin,
        customerStateCode,
        customerStateName,
        lineItems,
        issueDate,
        dueDate,
        notes,
      });

      showToast(`Tax invoice ${invoice.invoice_number} created successfully!`, 'success');
      onInvoiceCreated(invoice);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Invoice creation failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col text-xs">
        {/* Header & Stepper */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Create Commercial Tax Invoice</h3>
            <p className="text-xs text-gray-500 mt-0.5">Step {currentStep} of 4 • Indian GST Compliant</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* STEP 1: Select Customer & Dates */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Customer Organization *</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-bold text-xs"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.legal_name} ({org.plan} Plan • ₹{org.mrr.toLocaleString('en-IN')}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                <span className="font-bold text-gray-900 block">Customer Commercial Snapshot</span>
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan Tier:</span>
                  <strong className="text-purple-700 font-bold">{selectedOrg?.plan} Plan</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contracted Rate:</span>
                  <strong className="text-gray-900 font-mono">₹{selectedOrg?.mrr.toLocaleString('en-IN')} / month</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Billing Address:</span>
                  <span className="text-gray-700">{selectedOrg?.city}, {selectedOrg?.state}, {selectedOrg?.country}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Line Items */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">Invoice Line Items</span>
                <Button variant="outline" size="sm" onClick={handleAddItem} className="h-7 text-xs font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
                </Button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 relative">
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="absolute right-3 top-3 text-rose-500 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Description *</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[idx].description = e.target.value;
                          setLineItems(updated);
                        }}
                        className="w-full px-3 py-1.5 border rounded-xl bg-white text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">SAC Code</label>
                        <input
                          type="text"
                          value={item.sacHsn}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[idx].sacHsn = e.target.value;
                            setLineItems(updated);
                          }}
                          className="w-full px-3 py-1.5 border rounded-xl bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Unit Price (₹) *</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[idx].unitPrice = Number(e.target.value);
                            setLineItems(updated);
                          }}
                          className="w-full px-3 py-1.5 border rounded-xl bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Discount (₹)</label>
                        <input
                          type="number"
                          value={item.discountAmount}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[idx].discountAmount = Number(e.target.value);
                            setLineItems(updated);
                          }}
                          className="w-full px-3 py-1.5 border rounded-xl bg-white text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Tax & Place of Supply */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Place of Supply (State) *</label>
                  <select
                    value={customerStateCode}
                    onChange={(e) => {
                      setCustomerStateCode(e.target.value);
                      setCustomerStateName(e.target.value === '33' ? 'Tamil Nadu' : e.target.value === '27' ? 'Maharashtra' : 'Karnataka');
                    }}
                    className="w-full px-3 py-2 border rounded-xl bg-gray-50 font-bold text-xs"
                  >
                    <option value="33">Tamil Nadu (33) — Intrastate</option>
                    <option value="27">Maharashtra (27) — Interstate</option>
                    <option value="29">Karnataka (29) — Interstate</option>
                    <option value="07">Delhi (07) — Interstate</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Applicable GST Rate</label>
                  <input
                    type="text"
                    disabled
                    value="18% (Standard SaaS Rate)"
                    className="w-full px-3 py-2 border rounded-xl bg-gray-100 text-gray-600 font-bold text-xs cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Dynamic Tax Breakdown */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <span className="font-bold text-gray-900 block">Dynamic Tax Calculation</span>
                <div className="flex justify-between">
                  <span className="text-gray-500">Taxable Subtotal:</span>
                  <strong className="text-gray-900 font-mono">₹{taxResult.taxableAmount.toLocaleString('en-IN')}</strong>
                </div>

                {taxResult.supplyType === 'INTRASTATE' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">CGST (9%):</span>
                      <strong className="text-gray-900 font-mono">₹{taxResult.cgstAmount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">SGST (9%):</span>
                      <strong className="text-gray-900 font-mono">₹{taxResult.sgstAmount.toLocaleString('en-IN')}</strong>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-500">IGST (18%):</span>
                    <strong className="text-gray-900 font-mono">₹{taxResult.igstAmount.toLocaleString('en-IN')}</strong>
                  </div>
                )}

                <div className="flex justify-between border-t pt-2 text-sm font-bold">
                  <span className="text-gray-900">Grand Total:</span>
                  <span className="text-[#047857] font-mono">₹{taxResult.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Issue */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                <h4 className="font-bold text-emerald-900 text-sm">Invoice Summary Pre-Flight Check</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Customer: <strong>{selectedOrg?.legal_name}</strong></div>
                  <div>Place of Supply: <strong>{customerStateName} ({customerStateCode})</strong></div>
                  <div>Issue Date: <strong>{issueDate}</strong></div>
                  <div>Due Date: <strong>{dueDate}</strong></div>
                  <div>Taxable Subtotal: <strong>₹{taxResult.taxableAmount.toLocaleString('en-IN')}</strong></div>
                  <div>Total Tax (18%): <strong>₹{taxResult.totalTaxAmount.toLocaleString('en-IN')}</strong></div>
                </div>
                <div className="border-t border-emerald-200 pt-2 flex justify-between font-bold text-sm">
                  <span>Grand Total Due:</span>
                  <span className="font-mono text-[#047857]">₹{taxResult.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Invoice Notes / Terms</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-3 border-t">
          {currentStep > 1 ? (
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(currentStep - 1)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentStep(currentStep + 1)}
              className="bg-[#047857] hover:bg-[#036246] text-white font-bold"
            >
              Next Step <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleCreateInvoice}
              className="bg-[#047857] hover:bg-[#036246] text-white font-bold"
            >
              {isSubmitting ? 'Issuing Tax Invoice...' : 'Confirm & Issue Invoice'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
